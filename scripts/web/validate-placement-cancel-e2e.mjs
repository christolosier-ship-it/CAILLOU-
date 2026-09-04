import { mkdir, writeFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'

const baseUrl = process.env.CAILLOU_E2E_BASE_URL ?? 'http://127.0.0.1:4184'
const chromePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
const outputDir = 'build/placement-cancel-validation'
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
    instanceCount: Number(element.getAttribute('data-instance-count') ?? 0),
    cancelCount: Number(element.getAttribute('data-cancel-count') ?? 0),
    target: element.getAttribute('data-target') ?? '',
    rockPosition: JSON.parse(element.getAttribute('data-rock-position') ?? 'null'),
    rockRotation: JSON.parse(element.getAttribute('data-rock-rotation') ?? 'null'),
    sessionAccessories: JSON.parse(element.getAttribute('data-session-accessories') ?? '{}'),
    selectedWorldPosition: JSON.parse(element.getAttribute('data-selected-world-position') ?? 'null'),
    selectedWorldRotation: JSON.parse(element.getAttribute('data-selected-world-rotation') ?? 'null'),
    selectedScale: Number(element.getAttribute('data-selected-scale') ?? 0),
  }))
}

function assertVectorClose(label, actual, expected, epsilon = 0.008) {
  if (!Array.isArray(actual) || !Array.isArray(expected) || actual.length !== expected.length) {
    throw new Error(`${label}: missing comparable vectors`)
  }
  if (actual.some((value, index) => Math.abs(value - expected[index]) > epsilon)) {
    throw new Error(`${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`)
  }
}

async function dispatchSinglePointer(dx, dy) {
  await page.$eval('.pedestal-stage canvas', (canvas, deltaX, deltaY) => {
    const rect = canvas.getBoundingClientRect()
    const startX = rect.left + rect.width * 0.14
    const startY = rect.top + rect.height * 0.16
    const init = { pointerId: 501, pointerType: 'touch', bubbles: true, cancelable: true }
    canvas.dispatchEvent(new PointerEvent('pointerdown', { ...init, clientX: startX, clientY: startY, buttons: 1 }))
    canvas.dispatchEvent(new PointerEvent('pointermove', { ...init, clientX: startX + deltaX, clientY: startY + deltaY, buttons: 1 }))
    canvas.dispatchEvent(new PointerEvent('pointerup', { ...init, clientX: startX + deltaX, clientY: startY + deltaY, buttons: 0 }))
  }, dx, dy)
}

try {
  await page.setCacheEnabled(false)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  const response = await page.goto(`${baseUrl}/scripts/web/placement-unified-e2e-validation.html?cancel=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 20_000,
  })
  if (!response || response.status() >= 400) throw new Error(`fixture returned HTTP ${response?.status() ?? 'unknown'}`)

  await page.waitForSelector('.pedestal-stage canvas', { timeout: 30_000 })
  await page.waitForFunction(() => {
    const output = document.querySelector('#placement-unified-e2e-state')
    return output?.getAttribute('data-rock-ready') === 'true'
      && Number(output?.getAttribute('data-accessory-ready-count') ?? 0) >= 1
  }, { timeout: 30_000 })

  const initial = await state()
  const initialId = Object.keys(initial.sessionAccessories)[0]
  if (!initialId || initial.instanceCount !== 1) throw new Error(`unexpected initial snapshot: ${JSON.stringify(initial)}`)
  const initialAccessory = initial.sessionAccessories[initialId]

  await page.click('.placement-targets > button:nth-child(2)')
  await dispatchSinglePointer(72, -28)
  await page.waitForFunction((before) => {
    const value = JSON.parse(document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-selected-world-position') ?? 'null')
    return Array.isArray(value) && value.some((entry, index) => Math.abs(entry - before[index]) > 0.005)
  }, {}, initialAccessory.position)

  await page.click('.placement-owned summary')
  await page.waitForSelector('.placement-owned-grid button', { timeout: 10_000 })
  await page.click('.placement-owned-grid button')
  await page.waitForFunction(() => Number(document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-instance-count') ?? 0) === 2)

  const dirty = await state()
  if (dirty.instanceCount !== 2) throw new Error('draft accessory was not added before cancellation')
  assertVectorClose('dirty accessory actually moved', dirty.sessionAccessories[initialId].position, dirty.selectedWorldPosition)

  await page.click('.placement-panel-heading > .placement-cancel')
  await page.waitForFunction(() => {
    const output = document.querySelector('#placement-unified-e2e-state')
    return output?.getAttribute('data-mode') === 'orbit'
      && Number(output?.getAttribute('data-cancel-count') ?? 0) === 1
  })

  const cancelled = await state()
  if (cancelled.instanceCount !== 1) throw new Error(`Annuler did not restore initial membership: ${cancelled.instanceCount}`)
  assertVectorClose('cancelled rock position', cancelled.rockPosition, initial.rockPosition)
  assertVectorClose('cancelled rock rotation', cancelled.rockRotation, initial.rockRotation)

  await page.click('#reopen-placement')
  await page.waitForFunction(() => document.querySelector('#placement-unified-e2e-state')?.getAttribute('data-mode') === 'placement')
  await page.click('.placement-targets > button:nth-child(2)')
  const reopened = await state()
  if (Object.keys(reopened.sessionAccessories).length !== 1 || !reopened.sessionAccessories[initialId]) {
    throw new Error(`reopened session did not restore initial accessory set: ${JSON.stringify(reopened.sessionAccessories)}`)
  }
  assertVectorClose('reopened accessory position', reopened.selectedWorldPosition, initialAccessory.position)
  assertVectorClose('reopened accessory rotation', reopened.selectedWorldRotation, initialAccessory.rotation)
  if (Math.abs(reopened.selectedScale - initialAccessory.scale) > 0.008) {
    throw new Error(`reopened accessory scale drift: ${reopened.selectedScale} != ${initialAccessory.scale}`)
  }

  await page.screenshot({ path: `${outputDir}/placement-cancel-phone.png`, fullPage: true })
  const severeConsole = consoleLines.filter((line) => line.startsWith('[pageerror]') || line.includes('WebGL context lost') || line.includes('Unhandled'))
  if (severeConsole.length > 0) throw new Error(`browser errors observed: ${severeConsole.join(' | ')}`)

  const report = {
    status: 'pass',
    draftTransformChangedBeforeCancel: true,
    draftMembershipChangedBeforeCancel: true,
    cancelRestoredRockSnapshot: true,
    cancelRestoredAccessoryMembership: true,
    reopenRestoredAccessoryTransform: true,
  }
  await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n`, 'utf8')
  console.log('[CAILLOU] Placement cancel E2E PASS: multi-change draft restored to exact session snapshot')
} catch (error) {
  await page.screenshot({ path: `${outputDir}/failure.png`, fullPage: true }).catch(() => {})
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n${error instanceof Error ? error.stack : String(error)}\n`, 'utf8').catch(() => {})
  throw error
} finally {
  await page.close()
  await browser.close()
}
