import { mkdir, writeFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'

const baseUrl = process.env.CAILLOU_E2E_BASE_URL ?? 'http://127.0.0.1:4178'
const chromePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
const outputDir = 'build/accessory-placement-validation'
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
  return page.$eval('#accessory-placement-e2e-state', (element) => ({
    mode: element.getAttribute('data-mode') ?? '',
    instanceCount: Number(element.getAttribute('data-instance-count') ?? '0'),
    selectedId: element.getAttribute('data-selected-id') ?? '',
    loadedCount: Number(element.getAttribute('data-loaded-count') ?? '0'),
    draftCount: Number(element.getAttribute('data-draft-count') ?? '0'),
    saveCount: Number(element.getAttribute('data-save-count') ?? '0'),
    disposeCount: Number(element.getAttribute('data-dispose-count') ?? '0'),
    disposedGeometries: Number(element.getAttribute('data-disposed-geometries') ?? '0'),
    reloadCount: Number(element.getAttribute('data-reload-count') ?? '0'),
    transforms: JSON.parse(element.getAttribute('data-transforms') ?? '[]'),
    serverTransforms: JSON.parse(element.getAttribute('data-server-transforms') ?? '[]'),
  }))
}

function vectorChanged(left, right, epsilon = 0.001) {
  return Array.isArray(left) && Array.isArray(right)
    && left.length === right.length
    && left.some((value, index) => Math.abs(value - right[index]) > epsilon)
}

async function dispatchSinglePointer(dx, dy, xRatio = 0.22, yRatio = 0.2) {
  await page.$eval('.pedestal-stage canvas', (canvas, deltaX, deltaY, relativeX, relativeY) => {
    const rect = canvas.getBoundingClientRect()
    const startX = rect.left + rect.width * relativeX
    const startY = rect.top + rect.height * relativeY
    const init = { pointerId: 275, pointerType: 'touch', bubbles: true, cancelable: true }
    canvas.dispatchEvent(new PointerEvent('pointerdown', { ...init, clientX: startX, clientY: startY, buttons: 1 }))
    canvas.dispatchEvent(new PointerEvent('pointermove', { ...init, clientX: startX + deltaX, clientY: startY + deltaY, buttons: 1 }))
    canvas.dispatchEvent(new PointerEvent('pointerup', { ...init, clientX: startX + deltaX, clientY: startY + deltaY, buttons: 0 }))
  }, dx, dy, xRatio, yRatio)
}

async function dispatchPinch(multiplier = 1.35) {
  await page.$eval('.pedestal-stage canvas', (canvas, ratio) => {
    const rect = canvas.getBoundingClientRect()
    const cx = rect.left + rect.width * 0.24
    const cy = rect.top + rect.height * 0.22
    const initialHalf = 28
    const finalHalf = initialHalf * ratio
    const common = { pointerType: 'touch', bubbles: true, cancelable: true, buttons: 1 }
    canvas.dispatchEvent(new PointerEvent('pointerdown', { ...common, pointerId: 281, clientX: cx - initialHalf, clientY: cy }))
    canvas.dispatchEvent(new PointerEvent('pointerdown', { ...common, pointerId: 282, clientX: cx + initialHalf, clientY: cy }))
    canvas.dispatchEvent(new PointerEvent('pointermove', { ...common, pointerId: 281, clientX: cx - finalHalf, clientY: cy }))
    canvas.dispatchEvent(new PointerEvent('pointermove', { ...common, pointerId: 282, clientX: cx + finalHalf, clientY: cy }))
    canvas.dispatchEvent(new PointerEvent('pointerup', { ...common, pointerId: 281, clientX: cx - finalHalf, clientY: cy, buttons: 0 }))
    canvas.dispatchEvent(new PointerEvent('pointerup', { ...common, pointerId: 282, clientX: cx + finalHalf, clientY: cy, buttons: 0 }))
  }, multiplier)
}

async function dispatchTwist(radians = 0.55) {
  await page.$eval('.pedestal-stage canvas', (canvas, angle) => {
    const rect = canvas.getBoundingClientRect()
    const cx = rect.left + rect.width * 0.24
    const cy = rect.top + rect.height * 0.22
    const radius = 34
    const common = { pointerType: 'touch', bubbles: true, cancelable: true, buttons: 1 }
    const finalX = Math.cos(angle) * radius
    const finalY = Math.sin(angle) * radius
    canvas.dispatchEvent(new PointerEvent('pointerdown', { ...common, pointerId: 291, clientX: cx - radius, clientY: cy }))
    canvas.dispatchEvent(new PointerEvent('pointerdown', { ...common, pointerId: 292, clientX: cx + radius, clientY: cy }))
    canvas.dispatchEvent(new PointerEvent('pointermove', { ...common, pointerId: 291, clientX: cx - finalX, clientY: cy - finalY }))
    canvas.dispatchEvent(new PointerEvent('pointermove', { ...common, pointerId: 292, clientX: cx + finalX, clientY: cy + finalY }))
    canvas.dispatchEvent(new PointerEvent('pointerup', { ...common, pointerId: 291, clientX: cx - finalX, clientY: cy - finalY, buttons: 0 }))
    canvas.dispatchEvent(new PointerEvent('pointerup', { ...common, pointerId: 292, clientX: cx + finalX, clientY: cy + finalY, buttons: 0 }))
  }, radians)
}

async function settleAfterDraft(previousSaveCount) {
  await page.click('#placement-settle')
  await page.waitForFunction((before) => {
    const output = document.querySelector('#accessory-placement-e2e-state')
    return Number(output?.getAttribute('data-save-count') ?? '0') > before
      && output?.getAttribute('data-mode') === 'orbit'
  }, { timeout: 15_000 }, previousSaveCount)
}

try {
  await page.setCacheEnabled(false)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  const response = await page.goto(`${baseUrl}/scripts/web/accessory-placement-e2e-validation.html?run=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 20_000,
  })
  const status = response?.status() ?? 0
  if (!response || status >= 400) throw new Error(`fixture returned HTTP ${status || 'unknown'}`)

  await page.waitForSelector('.pedestal-stage canvas', { timeout: 30_000 })
  await page.waitForFunction(() => Number(document.querySelector('#accessory-placement-e2e-state')?.getAttribute('data-loaded-count') ?? '0') === 2, { timeout: 30_000 })

  const initial = await state()
  if (initial.instanceCount !== 2 || initial.loadedCount !== 2) {
    throw new Error(`expected two simultaneously loaded accessories, got ${JSON.stringify(initial)}`)
  }

  const initialMonocle = initial.transforms.find((item) => item.id.endsWith('0001'))
  if (!initialMonocle) throw new Error('monocle missing from initial transform set')

  await page.click('#placement-select-monocle')
  const draftsBeforePosition = (await state()).draftCount
  await dispatchSinglePointer(72, -34)
  await page.waitForFunction((before) => Number(document.querySelector('#accessory-placement-e2e-state')?.getAttribute('data-draft-count') ?? '0') > before, {}, draftsBeforePosition)
  await settleAfterDraft(initial.saveCount)
  let current = await state()
  let monocle = current.transforms.find((item) => item.id.endsWith('0001'))
  if (!monocle || !vectorChanged(monocle.position, initialMonocle.position)) {
    throw new Error('canvas position gesture was not persisted after settlement')
  }

  await page.click('#placement-select-monocle')
  await page.click('#placement-orientation')
  const rotationBefore = [...monocle.rotation]
  const draftsBeforeOrientation = current.draftCount
  await dispatchTwist(0.62)
  await page.waitForFunction((before) => Number(document.querySelector('#accessory-placement-e2e-state')?.getAttribute('data-draft-count') ?? '0') > before, {}, draftsBeforeOrientation)
  await settleAfterDraft(current.saveCount)
  current = await state()
  monocle = current.transforms.find((item) => item.id.endsWith('0001'))
  if (!monocle || !vectorChanged(monocle.rotation, rotationBefore)) {
    throw new Error('two-finger twist was not persisted after settlement')
  }

  await page.click('#placement-select-monocle')
  await page.click('#placement-size')
  const scaleBefore = monocle.scale
  const draftsBeforeScale = current.draftCount
  await dispatchPinch(1.3)
  await page.waitForFunction((before) => Number(document.querySelector('#accessory-placement-e2e-state')?.getAttribute('data-draft-count') ?? '0') > before, {}, draftsBeforeScale)
  await settleAfterDraft(current.saveCount)
  current = await state()
  monocle = current.transforms.find((item) => item.id.endsWith('0001'))
  if (!monocle || monocle.scale <= scaleBefore + 0.005 || monocle.scale > 1.351) {
    throw new Error(`pinch scale was not persisted within limits: ${monocle?.scale}`)
  }

  await page.click('#placement-select-glasses')
  const glassesBefore = current.transforms.find((item) => item.id.endsWith('0002'))
  const draftsBeforeGlasses = current.draftCount
  await dispatchSinglePointer(-52, 26, 0.78, 0.2)
  await page.waitForFunction((before) => Number(document.querySelector('#accessory-placement-e2e-state')?.getAttribute('data-draft-count') ?? '0') > before, {}, draftsBeforeGlasses)
  await settleAfterDraft(current.saveCount)
  current = await state()
  const glassesAfterPhone = current.transforms.find((item) => item.id.endsWith('0002'))
  if (!glassesBefore || !glassesAfterPhone || !vectorChanged(glassesAfterPhone.position, glassesBefore.position)) {
    throw new Error('second accessory did not persist independently')
  }
  if (JSON.stringify(current.transforms) !== JSON.stringify(current.serverTransforms)) {
    throw new Error('client and simulated server transforms diverged before reload')
  }

  const phoneTargets = await page.$$eval('.placement-fixture-controls button', (targets) => targets.every((target) => {
    const rect = target.getBoundingClientRect()
    return rect.width >= 44 && rect.height >= 44
  }))
  if (!phoneTargets) throw new Error('one or more visible phone placement targets are below 44px')
  await page.screenshot({ path: `${outputDir}/placement-phone.png`, fullPage: true })

  const disposeBeforeReload = current.disposeCount
  await page.evaluate(() => document.querySelector('#simulate-accessory-reload')?.click())
  await page.waitForFunction(() => Number(document.querySelector('#accessory-placement-e2e-state')?.getAttribute('data-reload-count') ?? '0') === 1)
  await page.waitForFunction(() => Number(document.querySelector('#accessory-placement-e2e-state')?.getAttribute('data-loaded-count') ?? '0') === 2, { timeout: 30_000 })

  const afterReload = await state()
  if (JSON.stringify(afterReload.transforms) !== JSON.stringify(afterReload.serverTransforms)) {
    throw new Error('reload did not restore the canonical local transforms exactly')
  }
  if (afterReload.disposeCount <= disposeBeforeReload || afterReload.disposedGeometries <= 0) {
    throw new Error('accessory rehydration did not dispose previous GPU geometry')
  }

  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  await page.click('#placement-select-glasses')
  await page.click('#placement-position')
  const tabletBefore = await state()
  const tabletGlassesBefore = tabletBefore.transforms.find((item) => item.id.endsWith('0002'))
  await dispatchPinch(1.42)
  await page.waitForFunction((before) => Number(document.querySelector('#accessory-placement-e2e-state')?.getAttribute('data-draft-count') ?? '0') > before, {}, tabletBefore.draftCount)
  await settleAfterDraft(tabletBefore.saveCount)
  const tablet = await state()
  const tabletGlassesAfter = tablet.transforms.find((item) => item.id.endsWith('0002'))
  if (!tabletGlassesBefore || !tabletGlassesAfter || !vectorChanged(tabletGlassesAfter.position, tabletGlassesBefore.position)) {
    throw new Error('tablet two-finger depth gesture did not persist')
  }
  if (tablet.instanceCount !== 2) throw new Error('tablet edit unexpectedly changed instance count')
  await page.screenshot({ path: `${outputDir}/placement-tablet.png`, fullPage: true })

  await page.click('#placement-select-glasses')
  const disposeBeforeRemove = (await state()).disposeCount
  await page.click('#placement-remove')
  await page.waitForFunction(() => Number(document.querySelector('#accessory-placement-e2e-state')?.getAttribute('data-instance-count') ?? '0') === 1)
  await page.waitForFunction((before) => Number(document.querySelector('#accessory-placement-e2e-state')?.getAttribute('data-dispose-count') ?? '0') > before, {}, disposeBeforeRemove)
  const removed = await state()

  const severeConsole = consoleLines.filter((line) => line.startsWith('[pageerror]') || line.includes('WebGL context lost') || line.includes('Unhandled'))
  if (severeConsole.length > 0) throw new Error(`browser errors observed: ${severeConsole.join(' | ')}`)

  const report = {
    status: 'pass',
    simultaneousInstances: initial.instanceCount,
    phoneCanvasPosition: true,
    twoFingerTwist: true,
    twoFingerScale: true,
    persistenceAfterSettlementOnly: true,
    independentSecondInstance: true,
    exactReloadRestore: true,
    tabletDepthTranslation: true,
    instanceRemoval: removed.instanceCount === 1,
    gpuDisposalObserved: removed.disposeCount > disposeBeforeRemove && removed.disposedGeometries > 0,
    saveCount: removed.saveCount,
    disposeCount: removed.disposeCount,
    disposedGeometries: removed.disposedGeometries,
  }

  await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n`, 'utf8')
  console.log('[CAILLOU] multi-accessory E2E PASS: 2 GLB + unified canvas gestures + settled persistence + exact reload + GPU disposal')
} catch (error) {
  await page.screenshot({ path: `${outputDir}/failure.png`, fullPage: true }).catch(() => {})
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n${error instanceof Error ? error.stack : String(error)}\n`, 'utf8').catch(() => {})
  throw error
} finally {
  await page.close()
  await browser.close()
}
