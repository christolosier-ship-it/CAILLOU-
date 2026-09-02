import { mkdir, writeFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'

const baseUrl = process.env.CAILLOU_E2E_BASE_URL ?? 'http://127.0.0.1:4181'
const chromePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
const outputDir = 'build/placement-unified-validation'
await mkdir(outputDir, { recursive: true })

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
    selectedScale: Number(element.getAttribute('data-selected-scale') ?? 0),
    individualSettled: Number(element.getAttribute('data-individual-settled') ?? 0),
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

  await page.click('.placement-tools button:nth-child(2)')
  await dispatchSinglePointer(54, 34, 0.82, 0.2)
  await page.waitForFunction((before) => {
    const value = JSON.parse(document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-rock-rotation') ?? '[0,0,0,1]')
    return value.some((entry, index) => Math.abs(entry - before[index]) > 0.005)
  }, {}, beforeRockMove.rockRotation)

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
  if (!Array.isArray(floored.selectedWorldPosition) || floored.selectedWorldPosition[1] < 0.285) {
    throw new Error(`accessory crossed the hard ground boundary: ${JSON.stringify(floored.selectedWorldPosition)}`)
  }

  await page.click('.placement-tools button:nth-child(3)')
  const beforeScale = (await state()).selectedScale
  await dispatchPinch(1.45)
  await page.waitForFunction((before) => Number(document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-selected-scale') ?? 0) > before + 0.01, {}, beforeScale)
  const scaled = await state()
  if (scaled.selectedScale > 1.35 + 0.001) throw new Error(`accessory exceeded scaleMax: ${scaled.selectedScale}`)
  if (scaled.selectedWorldPosition[1] < 0.285) throw new Error('scale change pushed accessory through the ground')

  await page.click('.placement-owned summary')
  await page.click('.placement-owned-grid button')
  await page.waitForFunction(() => Number(document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-instance-count') ?? 0) === 2)
  const duplicated = await state()
  if (duplicated.instanceCount !== 2) throw new Error('owned accessory was not instanced a second time')

  await dispatchSinglePointer(42, -20, 0.88, 0.12)
  await page.click('.placement-panel-heading > button')
  await page.waitForFunction(() => document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-mode') === 'orbit')
  await page.waitForFunction(() => Number(document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-individual-settled') ?? 0) >= 1, { timeout: 10_000 })

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
    canvasRockPosition: true,
    canvasRockOrientation: true,
    canvasAccessoryPosition: true,
    accessoryScale: true,
    hardGroundBoundary: true,
    duplicateOwnedInstances: final.instanceCount === 2,
    individualRapierSettlement: final.individualSettled >= 1,
  }
  await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n`, 'utf8')
  console.log('[CAILLOU] 10.75 E2E PASS: unified shop + universal placement + hard ground + phone/tablet')
} catch (error) {
  await page.screenshot({ path: `${outputDir}/failure.png`, fullPage: true }).catch(() => {})
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n${error instanceof Error ? error.stack : String(error)}\n`, 'utf8').catch(() => {})
  throw error
} finally {
  await page.close()
  await browser.close()
}
