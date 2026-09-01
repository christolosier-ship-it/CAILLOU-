import { mkdir, writeFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'

const baseUrl = process.env.CAILLOU_E2E_BASE_URL ?? 'http://127.0.0.1:4179'
const chromePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
const outputDir = 'build/rock-movement-validation'
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
  return page.$eval('#rock-movement-e2e-state', (element) => ({
    mode: element.getAttribute('data-mode') ?? '',
    rockReady: element.getAttribute('data-rock-ready') === 'true',
    accessoryReady: element.getAttribute('data-accessory-ready') === 'true',
    settled: element.getAttribute('data-settled') === 'true',
    position: JSON.parse(element.getAttribute('data-rock-position') ?? '[0,0,0]'),
    rotation: JSON.parse(element.getAttribute('data-rock-rotation') ?? '[0,0,0,1]'),
    accessories: JSON.parse(element.getAttribute('data-accessories') ?? '[]'),
  }))
}

async function dispatchSinglePointer(dx, dy) {
  await page.$eval('.pedestal-stage canvas', (canvas, deltaX, deltaY) => {
    const rect = canvas.getBoundingClientRect()
    const startX = rect.left + rect.width * 0.55
    const startY = rect.top + rect.height * 0.48
    const init = { pointerId: 71, pointerType: 'touch', bubbles: true, cancelable: true }
    canvas.dispatchEvent(new PointerEvent('pointerdown', { ...init, clientX: startX, clientY: startY, buttons: 1 }))
    canvas.dispatchEvent(new PointerEvent('pointermove', { ...init, clientX: startX + deltaX, clientY: startY + deltaY, buttons: 1 }))
    canvas.dispatchEvent(new PointerEvent('pointerup', { ...init, clientX: startX + deltaX, clientY: startY + deltaY, buttons: 0 }))
  }, dx, dy)
}

try {
  await page.setCacheEnabled(false)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  const response = await page.goto(`${baseUrl}/scripts/web/rock-movement-e2e-validation.html?run=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 20_000,
  })
  const status = response?.status() ?? 0
  if (!response || status >= 400) throw new Error(`fixture returned HTTP ${status || 'unknown'}`)

  await page.waitForSelector('.pedestal-stage canvas', { timeout: 30_000 })
  await page.waitForFunction(() => {
    const output = document.querySelector('#rock-movement-e2e-state')
    return output?.getAttribute('data-rock-ready') === 'true' && output?.getAttribute('data-accessory-ready') === 'true'
  }, { timeout: 30_000 })

  const initial = await state()
  await dispatchSinglePointer(58, -42)
  await page.waitForFunction((before) => {
    const value = JSON.parse(document.querySelector('#rock-movement-e2e-state')?.getAttribute('data-rock-position') ?? '[0,0,0]')
    return value.some((entry, index) => Math.abs(entry - before[index]) > 0.005)
  }, {}, initial.position)
  const afterPosition = await state()

  await page.click('button:nth-of-type(2)')
  await page.waitForFunction(() => document.querySelector('#rock-movement-e2e-state')?.getAttribute('data-mode') === 'rock-orientation')
  await dispatchSinglePointer(64, 34)
  await page.waitForFunction((before) => {
    const value = JSON.parse(document.querySelector('#rock-movement-e2e-state')?.getAttribute('data-rock-rotation') ?? '[0,0,0,1]')
    return value.some((entry, index) => Math.abs(entry - before[index]) > 0.005)
  }, {}, initial.rotation)

  const beforeRelease = await state()
  if (Math.abs(beforeRelease.position[0] - initial.position[0]) < 0.005 && Math.abs(beforeRelease.position[1] - initial.position[1]) < 0.005) {
    throw new Error('6D position gesture did not move the rock')
  }
  if (beforeRelease.rotation.every((entry, index) => Math.abs(entry - initial.rotation[index]) < 0.005)) {
    throw new Error('orientation gesture did not rotate the rock')
  }

  await page.click('button:nth-of-type(3)')
  await page.waitForFunction(() => document.querySelector('#rock-movement-e2e-state')?.getAttribute('data-settled') === 'true', { timeout: 12_000 })
  const settled = await state()

  if (settled.mode !== 'orbit') throw new Error(`fixture did not return to orbit after settlement: ${settled.mode}`)
  if (!settled.position.every(Number.isFinite)) throw new Error('final rock position contains non-finite values')
  if (Math.abs(settled.position[0]) > 2.4 || Math.abs(settled.position[2]) > 2.4 || settled.position[1] < -0.25) {
    throw new Error(`rock settled outside homologated envelope: ${JSON.stringify(settled.position)}`)
  }
  if (settled.accessories.length !== 1) throw new Error('global settlement did not return the accessory transform')
  const accessory = settled.accessories[0]
  if (!accessory.localPosition?.every(Number.isFinite) || accessory.localPosition.some((value) => Math.abs(value) > 4)) {
    throw new Error(`accessory local transform is incoherent after global gravity: ${JSON.stringify(accessory)}`)
  }

  const phoneTargets = await page.$$eval('.rock-e2e-controls button', (buttons) => buttons.every((button) => {
    const rect = button.getBoundingClientRect()
    return rect.width >= 44 && rect.height >= 44
  }))
  if (!phoneTargets) throw new Error('rock manipulation fixture has a target below 44px')
  await page.screenshot({ path: `${outputDir}/rock-phone.png`, fullPage: true })

  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  await new Promise((resolve) => setTimeout(resolve, 300))
  await page.screenshot({ path: `${outputDir}/rock-tablet.png`, fullPage: true })

  const severeConsole = consoleLines.filter((line) => line.startsWith('[pageerror]') || line.includes('WebGL context lost') || line.includes('Unhandled'))
  if (severeConsole.length > 0) throw new Error(`browser errors observed: ${severeConsole.join(' | ')}`)

  const report = {
    status: 'pass',
    phone: true,
    tablet: true,
    positionGesture: true,
    orientationGesture: true,
    dynamicRockHull: true,
    physicalGround: true,
    globalRockAndAccessoryGravity: true,
    finalRockPosition: settled.position,
    finalAccessoryLocalPosition: accessory.localPosition,
  }
  await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n`, 'utf8')
  console.log('[CAILLOU] rock movement E2E PASS: 6D gestures + global Rapier settlement + phone/tablet')
} catch (error) {
  await page.screenshot({ path: `${outputDir}/failure.png`, fullPage: true }).catch(() => {})
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n${error instanceof Error ? error.stack : String(error)}\n`, 'utf8').catch(() => {})
  throw error
} finally {
  await page.close()
  await browser.close()
}