import { mkdir, writeFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'

const baseUrl = process.env.CAILLOU_E2E_BASE_URL ?? 'http://127.0.0.1:4178'
const chromePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
const outputDir = 'build/accessory-physics-validation'
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
  return page.$eval('#accessory-physics-e2e-state', (element) => ({
    mode: element.getAttribute('data-mode') ?? '',
    instanceCount: Number(element.getAttribute('data-instance-count') ?? '0'),
    loadedCount: Number(element.getAttribute('data-loaded-count') ?? '0'),
    selectedId: element.getAttribute('data-selected-id') ?? '',
    draftCount: Number(element.getAttribute('data-draft-count') ?? '0'),
    settledCount: Number(element.getAttribute('data-settled-count') ?? '0'),
    collisions: Number(element.getAttribute('data-probe-collisions') ?? '0'),
    settled: element.getAttribute('data-probe-settled') === 'true',
    finalY: Number(element.getAttribute('data-probe-final-y') ?? '1'),
    selectedWorldPosition: JSON.parse(element.getAttribute('data-selected-world-position') ?? 'null'),
    selectedWorldRotation: JSON.parse(element.getAttribute('data-selected-world-rotation') ?? 'null'),
    selectedScale: Number(element.getAttribute('data-selected-scale') ?? '0'),
    lastSettledPosition: JSON.parse(element.getAttribute('data-last-settled-position') ?? 'null'),
    lastSettledRotation: JSON.parse(element.getAttribute('data-last-settled-rotation') ?? 'null'),
  }))
}

async function dispatchSinglePointer(dx, dy, xRatio = 0.18, yRatio = 0.18) {
  await page.$eval('.pedestal-stage canvas', (canvas, deltaX, deltaY, relativeX, relativeY) => {
    const rect = canvas.getBoundingClientRect()
    const startX = rect.left + rect.width * relativeX
    const startY = rect.top + rect.height * relativeY
    const init = { pointerId: 271, pointerType: 'touch', bubbles: true, cancelable: true }
    canvas.dispatchEvent(new PointerEvent('pointerdown', { ...init, clientX: startX, clientY: startY, buttons: 1 }))
    canvas.dispatchEvent(new PointerEvent('pointermove', { ...init, clientX: startX + deltaX, clientY: startY + deltaY, buttons: 1 }))
    canvas.dispatchEvent(new PointerEvent('pointerup', { ...init, clientX: startX + deltaX, clientY: startY + deltaY, buttons: 0 }))
  }, dx, dy, xRatio, yRatio)
}

try {
  await page.setCacheEnabled(false)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  const response = await page.goto(`${baseUrl}/scripts/web/accessory-physics-e2e-validation.html?run=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 20_000,
  })
  const status = response?.status() ?? 0
  if (!response || status >= 400) throw new Error(`fixture returned HTTP ${status || 'unknown'}`)

  await page.waitForSelector('.pedestal-stage canvas', { timeout: 30_000 })
  await page.waitForSelector('.physics-fixture-controls', { timeout: 30_000 })
  await page.waitForFunction(() => Number(document.querySelector('#accessory-physics-e2e-state')?.getAttribute('data-loaded-count') ?? '0') === 2, { timeout: 30_000 })
  await page.waitForFunction(() => document.querySelector('#accessory-physics-e2e-state')?.getAttribute('data-probe-settled') === 'true', { timeout: 20_000 })

  const phone = await state()
  if (phone.instanceCount !== 2 || phone.loadedCount !== 2) throw new Error(`two accessory GLBs were not ready: ${JSON.stringify(phone)}`)
  if (phone.collisions < 1) throw new Error('Rapier gravity probe never collided with the static collider')
  if (phone.finalY < -0.16 || phone.finalY > -0.04) throw new Error(`Rapier body settled outside expected contact band: y=${phone.finalY}`)
  if (!Array.isArray(phone.selectedWorldPosition)) throw new Error('selected accessory world pose was not exposed')

  const phoneDrafts = phone.draftCount
  const phonePosition = [...phone.selectedWorldPosition]
  await dispatchSinglePointer(72, 36)
  await page.waitForFunction((before) => Number(document.querySelector('#accessory-physics-e2e-state')?.getAttribute('data-draft-count') ?? '0') > before, {}, phoneDrafts)
  const afterPhone = await state()
  if (!afterPhone.selectedWorldPosition.some((value, index) => Math.abs(value - phonePosition[index]) > 0.005)) {
    throw new Error('phone canvas position gesture did not move the selected accessory')
  }

  const phoneTargets = await page.$$eval('.physics-fixture-controls button', (targets) => targets.every((target) => {
    const rect = target.getBoundingClientRect()
    return rect.width >= 44 && rect.height >= 44
  }))
  if (!phoneTargets) throw new Error('one or more visible phone physics controls are below 44px')
  await page.screenshot({ path: `${outputDir}/physics-phone.png`, fullPage: true })

  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  await page.click('#physics-select-glasses')
  await page.waitForFunction(() => document.querySelector('#accessory-physics-e2e-state')?.getAttribute('data-selected-id')?.endsWith('0002') ?? false)
  await page.click('#physics-orientation')
  const beforeTablet = await state()
  if (!Array.isArray(beforeTablet.selectedWorldRotation)) throw new Error('tablet selected accessory rotation is missing')
  await dispatchSinglePointer(58, 32, 0.8, 0.2)
  await page.waitForFunction((before) => {
    const value = JSON.parse(document.querySelector('#accessory-physics-e2e-state')?.getAttribute('data-selected-world-rotation') ?? 'null')
    return Array.isArray(value) && value.some((entry, index) => Math.abs(entry - before[index]) > 0.005)
  }, {}, beforeTablet.selectedWorldRotation)

  const beforeSettlement = (await state()).settledCount
  await page.click('#physics-settle')
  await page.waitForFunction((before) => Number(document.querySelector('#accessory-physics-e2e-state')?.getAttribute('data-settled-count') ?? '0') > before, { timeout: 12_000 }, beforeSettlement)
  const tablet = await state()
  if (tablet.mode !== 'orbit' || !Array.isArray(tablet.lastSettledPosition) || !Array.isArray(tablet.lastSettledRotation)) {
    throw new Error('unified accessory PlacementBody did not report its final settled world pose')
  }
  await page.screenshot({ path: `${outputDir}/physics-tablet.png`, fullPage: true })

  const severeConsole = consoleLines.filter((line) => line.startsWith('[pageerror]') || line.includes('WebGL context lost') || line.includes('Unhandled'))
  if (severeConsole.length > 0) throw new Error(`browser errors observed: ${severeConsole.join(' | ')}`)

  const report = {
    status: 'pass',
    rapierGravity: true,
    staticCollision: true,
    settledSleepingBody: true,
    finalProbeY: tablet.finalY,
    simultaneousAccessoryGlbs: tablet.instanceCount,
    phoneUnifiedCanvasPosition: true,
    tabletUnifiedCanvasOrientation: true,
    sharedAccessorySettlement: true,
    settledCount: tablet.settledCount,
  }
  await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n`, 'utf8')
  console.log('[CAILLOU] accessory physics E2E PASS: Rapier probe + 2 GLB + unified canvas gestures + shared settlement')
} catch (error) {
  await page.screenshot({ path: `${outputDir}/failure.png`, fullPage: true }).catch(() => {})
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n${error instanceof Error ? error.stack : String(error)}\n`, 'utf8').catch(() => {})
  throw error
} finally {
  await page.close()
  await browser.close()
}
