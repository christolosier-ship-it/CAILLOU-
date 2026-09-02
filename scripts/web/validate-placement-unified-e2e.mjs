import { mkdir, writeFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'

const baseUrl = process.env.CAILLOU_E2E_BASE_URL ?? 'http://127.0.0.1:4181'
const chromePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
const outputDir = 'build/placement-unified-validation'
const GROUND_Y = -0.02
await mkdir(outputDir, { recursive: true })

function identityMatrix() {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]
}

function multiplyMatrices(left, right) {
  const output = new Array(16).fill(0)
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      for (let index = 0; index < 4; index += 1) {
        output[column * 4 + row] += left[index * 4 + row] * right[column * 4 + index]
      }
    }
  }
  return output
}

function matrixFromNode(node) {
  if (Array.isArray(node.matrix) && node.matrix.length === 16) return [...node.matrix]

  const [tx, ty, tz] = node.translation ?? [0, 0, 0]
  const [rawX, rawY, rawZ, rawW] = node.rotation ?? [0, 0, 0, 1]
  const [sx, sy, sz] = node.scale ?? [1, 1, 1]
  const length = Math.hypot(rawX, rawY, rawZ, rawW)
  const [x, y, z, w] = length > 0.000001
    ? [rawX / length, rawY / length, rawZ / length, rawW / length]
    : [0, 0, 0, 1]

  return [
    (1 - 2 * (y * y + z * z)) * sx,
    2 * (x * y + z * w) * sx,
    2 * (x * z - y * w) * sx,
    0,
    2 * (x * y - z * w) * sy,
    (1 - 2 * (x * x + z * z)) * sy,
    2 * (y * z + x * w) * sy,
    0,
    2 * (x * z + y * w) * sz,
    2 * (y * z - x * w) * sz,
    (1 - 2 * (x * x + y * y)) * sz,
    0,
    tx,
    ty,
    tz,
    1,
  ]
}

function transformPoint(point, matrix) {
  const [x, y, z] = point
  const transformedW = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15]
  const reciprocalW = transformedW && Math.abs(transformedW - 1) > 0.000001 ? 1 / transformedW : 1
  return [
    (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) * reciprocalW,
    (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) * reciprocalW,
    (matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) * reciprocalW,
  ]
}

async function loadGlbPositionPoints(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`unable to load GLB support geometry: HTTP ${response.status}`)

  const bytes = new Uint8Array(await response.arrayBuffer())
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2) {
    throw new Error('fixture asset is not a supported glTF 2.0 binary')
  }

  let offset = 12
  let document = null
  let binaryOffset = -1
  let binaryLength = 0
  while (offset + 8 <= bytes.byteLength) {
    const chunkLength = view.getUint32(offset, true)
    const chunkType = view.getUint32(offset + 4, true)
    const chunkOffset = offset + 8
    if (chunkType === 0x4e4f534a) {
      const json = new TextDecoder().decode(bytes.subarray(chunkOffset, chunkOffset + chunkLength))
        .replaceAll(String.fromCharCode(0), '')
        .trim()
      document = JSON.parse(json)
    } else if (chunkType === 0x004e4942) {
      binaryOffset = chunkOffset
      binaryLength = chunkLength
    }
    offset = chunkOffset + chunkLength
  }

  if (!document || binaryOffset < 0) throw new Error('fixture GLB is missing JSON or BIN chunks')

  const pointsByMesh = (document.meshes ?? []).map((mesh) => {
    const points = []
    for (const primitive of mesh.primitives ?? []) {
      const accessorIndex = primitive.attributes?.POSITION
      if (accessorIndex === undefined) continue
      const accessor = document.accessors?.[accessorIndex]
      if (!accessor || accessor.componentType !== 5126 || accessor.type !== 'VEC3') {
        throw new Error('fixture POSITION accessor must remain FLOAT VEC3')
      }
      const bufferView = document.bufferViews?.[accessor.bufferView]
      if (!bufferView || (bufferView.buffer ?? 0) !== 0) throw new Error('fixture POSITION must use the embedded GLB buffer')

      const stride = bufferView.byteStride ?? 12
      const firstByte = binaryOffset + (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
      const lastByte = firstByte + Math.max(0, accessor.count - 1) * stride + 12
      if (lastByte > binaryOffset + binaryLength) throw new Error('fixture POSITION accessor exceeds the GLB BIN chunk')

      for (let index = 0; index < accessor.count; index += 1) {
        const pointOffset = firstByte + index * stride
        const point = [
          view.getFloat32(pointOffset, true),
          view.getFloat32(pointOffset + 4, true),
          view.getFloat32(pointOffset + 8, true),
        ]
        if (point.every(Number.isFinite)) points.push(point)
      }
    }
    return points
  })

  const transformedPoints = []
  const nodes = document.nodes ?? []
  const childIndexes = new Set(nodes.flatMap((node) => node.children ?? []))
  const sceneRoots = document.scenes?.[document.scene ?? 0]?.nodes
  const rootIndexes = sceneRoots ?? nodes.map((_, index) => index).filter((index) => !childIndexes.has(index))

  const visit = (nodeIndex, parentMatrix) => {
    const node = nodes[nodeIndex]
    if (!node) return
    const worldMatrix = multiplyMatrices(parentMatrix, matrixFromNode(node))
    if (node.mesh !== undefined) {
      for (const point of pointsByMesh[node.mesh] ?? []) transformedPoints.push(transformPoint(point, worldMatrix))
    }
    for (const childIndex of node.children ?? []) visit(childIndex, worldMatrix)
  }

  for (const rootIndex of rootIndexes) visit(rootIndex, identityMatrix())
  if (transformedPoints.length === 0) {
    for (const meshPoints of pointsByMesh) transformedPoints.push(...meshPoints)
  }
  if (transformedPoints.length === 0) throw new Error('fixture GLB has no usable POSITION vertices')
  return transformedPoints
}

const ROCK_018_SUPPORT_POINTS = await loadGlbPositionPoints(`${baseUrl}/assets/rocks/rock-018/model.glb`)
const MONOCLE_SUPPORT_POINTS = await loadGlbPositionPoints(`${baseUrl}/assets/accessories/monocle/model.glb`)

function minimumWorldY(supportPoints, position, rotation, scale = 1) {
  const length = Math.hypot(...rotation)
  const [x, y, z, w] = length > 0.000001 ? rotation.map((value) => value / length) : [0, 0, 0, 1]
  let minimum = Number.POSITIVE_INFINITY
  for (const [sourceX, sourceY, sourceZ] of supportPoints) {
    const px = sourceX * scale
    const py = sourceY * scale
    const pz = sourceZ * scale
    const rotatedY = 2 * (x * y + z * w) * px
      + (1 - 2 * (x * x + z * z)) * py
      + 2 * (y * z - x * w) * pz
    minimum = Math.min(minimum, position[1] + rotatedY)
  }
  return minimum
}

function assertAboveGround(label, supportPoints, position, rotation, scale = 1) {
  if (!Array.isArray(position) || !Array.isArray(rotation)) throw new Error(`${label}: missing world transform`)
  const minimum = minimumWorldY(supportPoints, position, rotation, scale)
  if (minimum < GROUND_Y - 0.004) {
    throw new Error(`${label}: geometry crossed hard ground boundary (minY=${minimum}, position=${JSON.stringify(position)}, rotation=${JSON.stringify(rotation)}, scale=${scale})`)
  }
}

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--disable-dev-shm-usage',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader-webgl',
  ],
})

const page = await browser.newPage()
const consoleLines = []
page.on('console', (message) => consoleLines.push(`[console:${message.type()}] ${message.text()}`))
page.on('pageerror', (error) => consoleLines.push(`[pageerror] ${error.message}`))
page.on('requestfailed', (request) => consoleLines.push(`[requestfailed] ${request.url()} ${request.failure()?.errorText ?? ''}`))

async function state() {
  return page.$eval('#placement-unified-e2e-state', (element) => ({
    mode: element.getAttribute('data-mode') ?? '',
    permit: element.getAttribute('data-permit') === 'true',
    balance: Number(element.getAttribute('data-balance') ?? 0),
    shopOpen: element.getAttribute('data-shop-open') === 'true',
    rockReady: element.getAttribute('data-rock-ready') === 'true',
    accessoryReadyCount: Number(element.getAttribute('data-accessory-ready-count') ?? 0),
    target: element.getAttribute('data-target') ?? '',
    tool: element.getAttribute('data-tool') ?? '',
    rockPosition: JSON.parse(element.getAttribute('data-rock-position') ?? '[0,0,0]'),
    rockRotation: JSON.parse(element.getAttribute('data-rock-rotation') ?? '[0,0,0,1]'),
    instanceCount: Number(element.getAttribute('data-instance-count') ?? 0),
    selectedWorldPosition: JSON.parse(element.getAttribute('data-selected-world-position') ?? 'null'),
    selectedWorldRotation: JSON.parse(element.getAttribute('data-selected-world-rotation') ?? 'null'),
    selectedScale: Number(element.getAttribute('data-selected-scale') ?? 0),
    individualSettled: Number(element.getAttribute('data-individual-settled') ?? 0),
    globalSettled: element.getAttribute('data-global-settled') === 'true',
    globalRockPosition: JSON.parse(element.getAttribute('data-global-settled-rock-position') ?? 'null'),
    globalRockRotation: JSON.parse(element.getAttribute('data-global-settled-rock-rotation') ?? 'null'),
  }))
}

async function dispatchSinglePointer(dx, dy, xRatio = 0.16, yRatio = 0.18) {
  await page.$eval('.pedestal-stage canvas', (canvas, deltaX, deltaY, relativeX, relativeY) => {
    const rect = canvas.getBoundingClientRect()
    const startX = rect.left + rect.width * relativeX
    const startY = rect.top + rect.height * relativeY
    const init = { pointerId: 175, pointerType: 'touch', bubbles: true, cancelable: true }
    canvas.dispatchEvent(new PointerEvent('pointerdown', { ...init, clientX: startX, clientY: startY, buttons: 1 }))
    canvas.dispatchEvent(new PointerEvent('pointermove', { ...init, clientX: startX + deltaX, clientY: startY + deltaY, buttons: 1 }))
    canvas.dispatchEvent(new PointerEvent('pointerup', { ...init, clientX: startX + deltaX, clientY: startY + deltaY, buttons: 0 }))
  }, dx, dy, xRatio, yRatio)
}

async function dispatchPinch(multiplier = 1.35) {
  await page.$eval('.pedestal-stage canvas', (canvas, ratio) => {
    const rect = canvas.getBoundingClientRect()
    const cx = rect.left + rect.width * 0.22
    const cy = rect.top + rect.height * 0.22
    const initialHalf = 24
    const finalHalf = initialHalf * ratio
    const common = { pointerType: 'touch', bubbles: true, cancelable: true, buttons: 1 }
    canvas.dispatchEvent(new PointerEvent('pointerdown', { ...common, pointerId: 181, clientX: cx - initialHalf, clientY: cy }))
    canvas.dispatchEvent(new PointerEvent('pointerdown', { ...common, pointerId: 182, clientX: cx + initialHalf, clientY: cy }))
    canvas.dispatchEvent(new PointerEvent('pointermove', { ...common, pointerId: 181, clientX: cx - finalHalf, clientY: cy }))
    canvas.dispatchEvent(new PointerEvent('pointermove', { ...common, pointerId: 182, clientX: cx + finalHalf, clientY: cy }))
    canvas.dispatchEvent(new PointerEvent('pointerup', { ...common, pointerId: 181, clientX: cx - finalHalf, clientY: cy, buttons: 0 }))
    canvas.dispatchEvent(new PointerEvent('pointerup', { ...common, pointerId: 182, clientX: cx + finalHalf, clientY: cy, buttons: 0 }))
  }, multiplier)
}

try {
  await page.setCacheEnabled(false)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  const response = await page.goto(`${baseUrl}/scripts/web/placement-unified-e2e-validation.html?run=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 20_000,
  })
  const status = response?.status() ?? 0
  if (!response || status >= 400) throw new Error(`fixture returned HTTP ${status || 'unknown'}`)

  await page.waitForSelector('.pedestal-stage canvas', { timeout: 30_000 })
  await page.waitForFunction(() => {
    const output = document.querySelector('#placement-unified-e2e-state')
    return output?.getAttribute('data-rock-ready') === 'true' && Number(output?.getAttribute('data-accessory-ready-count') ?? 0) >= 1
  }, { timeout: 30_000 })

  const initial = await state()
  if (initial.permit) throw new Error('fixture must start with locked rock movement permit')
  if (initial.balance !== 1500) throw new Error(`unexpected initial balance ${initial.balance}`)

  await page.click('.placement-targets > button:first-child')
  await page.waitForFunction(() => document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-shop-open') === 'true')
  if (await page.$$('button').then(async (buttons) => {
    for (const button of buttons) {
      const text = await button.evaluate((element) => element.textContent ?? '')
      if (text.includes('Placer sur le caillou')) return true
    }
    return false
  })) throw new Error('Boutique still exposes a direct placement action')

  await page.click('.feature-card .accessory-buy')
  await page.waitForFunction(() => document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-permit') === 'true')
  const afterPermit = await state()
  if (afterPermit.balance !== 500) throw new Error(`permit did not debit exactly 1000 Lithons: ${afterPermit.balance}`)
  await page.click('.accessory-shop-close')
  await page.waitForFunction(() => document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-shop-open') === 'false')

  await page.click('.placement-targets > button:first-child')
  await page.waitForFunction(() => document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-target') === 'rock')
  const beforeRockMove = await state()
  await dispatchSinglePointer(62, -38)
  await page.waitForFunction((before) => {
    const value = JSON.parse(document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-rock-position') ?? '[0,0,0]')
    return value.some((entry, index) => Math.abs(entry - before[index]) > 0.005)
  }, {}, beforeRockMove.rockPosition)

  for (let index = 0; index < 5; index += 1) await dispatchSinglePointer(0, 540, 0.13, 0.14)
  const rockFlooredDuringPosition = await state()
  assertAboveGround('during rock position', ROCK_018_SUPPORT_POINTS, rockFlooredDuringPosition.rockPosition, rockFlooredDuringPosition.rockRotation)

  await page.click('.placement-tools button:nth-child(2)')
  await dispatchSinglePointer(54, 34, 0.82, 0.2)
  await page.waitForFunction((before) => {
    const value = JSON.parse(document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-rock-rotation') ?? '[0,0,0,1]')
    return value.some((entry, index) => Math.abs(entry - before[index]) > 0.005)
  }, {}, rockFlooredDuringPosition.rockRotation)
  const rockFlooredDuringOrientation = await state()
  assertAboveGround('during rock orientation', ROCK_018_SUPPORT_POINTS, rockFlooredDuringOrientation.rockPosition, rockFlooredDuringOrientation.rockRotation)

  await page.click('.placement-panel-heading > button')
  await page.waitForFunction(() => document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-mode') === 'orbit', { timeout: 15_000 })
  await page.waitForFunction(() => document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-global-settled') === 'true', { timeout: 15_000 })
  const rockAfterRapier = await state()
  if (!Array.isArray(rockAfterRapier.globalRockPosition) || !Array.isArray(rockAfterRapier.globalRockRotation)) {
    throw new Error('global rock settlement was not reported')
  }
  assertAboveGround('after rock Rapier settlement', ROCK_018_SUPPORT_POINTS, rockAfterRapier.globalRockPosition, rockAfterRapier.globalRockRotation)

  await page.$eval('#reopen-placement', (button) => button.click())
  await page.waitForFunction(() => document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-mode') === 'placement')
  await page.click('.placement-targets > button:nth-child(2)')
  await page.waitForFunction(() => (document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-target') ?? '').includes('000000000001'))
  const beforeAccessory = await state()
  await dispatchSinglePointer(80, 58, 0.08, 0.1)
  await page.waitForFunction((before) => {
    const value = JSON.parse(document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-selected-world-position') ?? 'null')
    return Array.isArray(value) && value.some((entry, index) => Math.abs(entry - before[index]) > 0.005)
  }, {}, beforeAccessory.selectedWorldPosition)

  for (let index = 0; index < 4; index += 1) await dispatchSinglePointer(0, 520, 0.12, 0.12)
  const floored = await state()
  assertAboveGround(
    'during accessory position',
    MONOCLE_SUPPORT_POINTS,
    floored.selectedWorldPosition,
    floored.selectedWorldRotation,
    floored.selectedScale,
  )

  await page.click('.placement-tools button:nth-child(3)')
  const beforeScale = (await state()).selectedScale
  await dispatchPinch(1.45)
  await page.waitForFunction((before) => Number(document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-selected-scale') ?? 0) > before + 0.01, {}, beforeScale)
  const scaled = await state()
  if (scaled.selectedScale > 1.35 + 0.001) throw new Error(`accessory exceeded scaleMax: ${scaled.selectedScale}`)
  assertAboveGround(
    'during accessory scale',
    MONOCLE_SUPPORT_POINTS,
    scaled.selectedWorldPosition,
    scaled.selectedWorldRotation,
    scaled.selectedScale,
  )

  await page.click('.placement-owned summary')
  await page.click('.placement-owned-grid button')
  await page.waitForFunction(() => Number(document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-instance-count') ?? 0) === 2)
  await page.waitForFunction(() => Number(document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-accessory-ready-count') ?? 0) >= 2, { timeout: 30_000 })
  const duplicated = await state()
  if (duplicated.instanceCount !== 2) throw new Error('owned accessory was not instanced a second time')
  if (duplicated.accessoryReadyCount < 2) throw new Error('second accessory GLB was not ready before manipulation')

  await dispatchSinglePointer(42, -20, 0.88, 0.12)
  await page.click('.placement-panel-heading > button')
  await page.waitForFunction(() => document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-mode') === 'orbit')
  await page.waitForFunction(() => Number(document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-individual-settled') ?? 0) >= 1, { timeout: 12_000 })

  const targetSizes = await page.$$eval('.placement-panel button, .accessory-shop button', (buttons) => buttons.every((button) => {
    const rect = button.getBoundingClientRect()
    return rect.width === 0 || rect.height === 0 || rect.height >= 44
  }))
  if (!targetSizes) throw new Error('10.75 has a visible tactile target below 44px')

  await page.screenshot({ path: `${outputDir}/placement-phone.png`, fullPage: true })
  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  await new Promise((resolve) => setTimeout(resolve, 300))
  await page.screenshot({ path: `${outputDir}/placement-tablet.png`, fullPage: true })

  const severeConsole = consoleLines.filter((line) => line.startsWith('[pageerror]') || line.includes('WebGL context lost') || line.includes('Unhandled'))
  if (severeConsole.length > 0) throw new Error(`browser errors observed: ${severeConsole.join(' | ')}`)

  const final = await state()
  const report = {
    status: 'pass',
    phone: true,
    tablet: true,
    unifiedShop: true,
    permitPriceLithons: 1000,
    shopHasNoDirectPlacement: true,
    sharedCanvasPositionGesture: true,
    canvasRockOrientation: true,
    rockHardFloorDuringPlacement: true,
    rockHardFloorAfterRapier: true,
    canvasAccessoryPosition: true,
    accessoryScale: true,
    accessoryHardFloor: true,
    duplicateOwnedInstances: final.instanceCount === 2,
    individualRapierSettlement: final.individualSettled >= 1,
  }
  await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n`, 'utf8')
  console.log('[CAILLOU] 10.75 correction E2E PASS: unified gestures + real-geometry hard floor before/after Rapier')
} catch (error) {
  await page.screenshot({ path: `${outputDir}/failure.png`, fullPage: true }).catch(() => {})
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n${error instanceof Error ? error.stack : String(error)}\n`, 'utf8').catch(() => {})
  throw error
} finally {
  await page.close()
  await browser.close()
}
