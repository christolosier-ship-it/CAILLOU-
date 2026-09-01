import { mkdir, writeFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'

const baseUrl = process.env.CAILLOU_E2E_BASE_URL ?? 'http://127.0.0.1:4176'
const chromePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
const outputDir = 'build/caress-validation'
await mkdir(outputDir, { recursive: true })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

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

async function strokeCanvas(rect) {
  const startX = rect.x + rect.width / 2 - 38
  const endX = rect.x + rect.width / 2 + 38
  const y = rect.y + rect.height / 2

  await page.mouse.move(startX, y)
  await page.mouse.down()
  for (let step = 1; step <= 8; step += 1) {
    const x = startX + ((endX - startX) * step) / 8
    await page.mouse.move(x, y)
    await sleep(38)
  }
  await page.mouse.up()
}

try {
  await page.setCacheEnabled(false)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  const response = await page.goto(`${baseUrl}/scripts/web/caress-e2e-validation.html?run=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 20_000,
  })
  const status = response?.status() ?? 0
  if (!response || status >= 400) throw new Error(`fixture returned HTTP ${status || 'unknown'}`)

  await page.waitForSelector('.pedestal-stage canvas', { timeout: 30_000 })
  await page.waitForFunction(() => !document.querySelector('.pedestal-fallback'), { timeout: 30_000 })

  const caressButton = 'button[aria-label="Activer le mode Caresser"]'
  await page.click(caressButton)
  await page.waitForSelector('button[aria-label="Quitter le mode Caresser"][aria-pressed="true"]')

  const canvasRect = await page.$eval('.pedestal-stage canvas', (canvas) => {
    const rect = canvas.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  })

  await page.mouse.click(canvasRect.x + canvasRect.width / 2, canvasRect.y + canvasRect.height / 2)
  await sleep(320)
  const afterTap = await page.$eval('#caress-e2e-state', (element) => element.getAttribute('data-event-keys') ?? '')
  if (afterTap !== '') throw new Error('simple tap unexpectedly generated a Lithon mutation')

  await strokeCanvas(canvasRect)
  await page.waitForSelector('.pedestal-caress-error', { timeout: 10_000 })

  const firstAttempt = await page.$eval('#caress-e2e-state', (element) => ({
    eventKeys: element.getAttribute('data-event-keys') ?? '',
    serverBalance: element.getAttribute('data-server-balance') ?? '',
  }))
  const firstKeys = firstAttempt.eventKeys.split(',').filter(Boolean)
  if (firstKeys.length !== 1) throw new Error(`expected one caress attempt, got ${firstKeys.length}`)
  if (firstAttempt.serverBalance !== '1') throw new Error('server fixture did not credit exactly one Lithon')

  const visibleBeforeRetry = await page.$eval('.pedestal-balance span', (element) => element.textContent?.trim() ?? '')
  if (visibleBeforeRetry !== '0') throw new Error('client displayed an unconfirmed optimistic Lithon balance')

  await page.click('.pedestal-caress-error button')
  await page.waitForFunction(() => document.querySelector('.pedestal-balance span')?.textContent?.trim() === '1')
  await page.waitForFunction(() => document.querySelector('.pedestal-caress-feedback')?.textContent?.includes('+1 Lithon') ?? false)

  const replay = await page.$eval('#caress-e2e-state', (element) => ({
    eventKeys: element.getAttribute('data-event-keys') ?? '',
    serverBalance: element.getAttribute('data-server-balance') ?? '',
  }))
  const replayKeys = replay.eventKeys.split(',').filter(Boolean)
  if (replayKeys.length !== 2 || replayKeys[0] !== replayKeys[1]) {
    throw new Error('network retry did not reuse the original caress event key')
  }
  if (replay.serverBalance !== '1') throw new Error('idempotent retry double-credited the server fixture')

  const phoneUi = await page.evaluate(() => {
    const actionButtons = [...document.querySelectorAll('.pedestal-actions button')]
    const accessoryButton = document.querySelector('button[aria-label="Ouvrir la boutique d’accessoires"]')
    return {
      actionCount: actionButtons.length,
      enabledCount: actionButtons.filter((button) => !button.disabled).length,
      accessoryEnabled: accessoryButton ? !accessoryButton.disabled : false,
      allTargetsLargeEnough: actionButtons.every((button) => {
        const rect = button.getBoundingClientRect()
        return rect.width >= 44 && rect.height >= 44
      }),
      caressPressed: document.querySelector('button[aria-label="Quitter le mode Caresser"]')?.getAttribute('aria-pressed'),
      balanceLabel: document.querySelector('.pedestal-balance')?.getAttribute('aria-label') ?? '',
    }
  })

  if (phoneUi.actionCount !== 4 || phoneUi.enabledCount !== 2 || !phoneUi.accessoryEnabled) {
    throw new Error('Socle action availability is inconsistent with step 10B')
  }
  if (!phoneUi.allTargetsLargeEnough) throw new Error('phone action targets are below 44px')
  if (phoneUi.caressPressed !== 'true') throw new Error('caress mode is not exposed through aria-pressed')
  if (!phoneUi.balanceLabel.includes('1 Lithon')) throw new Error('authoritative balance is not exposed accessibly')

  await page.screenshot({ path: `${outputDir}/caress-phone.png`, fullPage: true })

  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 })
  await sleep(250)
  const tabletUi = await page.evaluate(() => {
    const nav = document.querySelector('.pedestal-actions')
    const buttons = [...document.querySelectorAll('.pedestal-actions button')]
    return {
      columns: nav ? getComputedStyle(nav).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
      allTargetsLargeEnough: buttons.every((button) => {
        const rect = button.getBoundingClientRect()
        return rect.width >= 44 && rect.height >= 44
      }),
    }
  })
  if (tabletUi.columns !== 4) throw new Error(`tablet expected four action columns, got ${tabletUi.columns}`)
  if (!tabletUi.allTargetsLargeEnough) throw new Error('tablet action targets are below 44px')
  await page.screenshot({ path: `${outputDir}/caress-tablet.png`, fullPage: true })

  const report = {
    status: 'pass',
    tapRejected: true,
    gestureAccepted: true,
    retryReusedEventKey: true,
    confirmedBalance: 1,
    phoneUi,
    tabletUi,
  }
  await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n`, 'utf8')
  console.log('[CAILLOU] caress E2E PASS: tap rejected → real surface stroke → lost response → idempotent retry → +1 Lithon → accessory remains available')
} catch (error) {
  await page.screenshot({ path: `${outputDir}/failure.png`, fullPage: true }).catch(() => {})
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n${error instanceof Error ? error.stack : String(error)}\n`, 'utf8').catch(() => {})
  throw error
} finally {
  await page.close()
  await browser.close()
}
