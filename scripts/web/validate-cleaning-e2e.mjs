import { mkdir, writeFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'

const baseUrl = process.env.CAILLOU_E2E_BASE_URL ?? 'http://127.0.0.1:4177'
const chromePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
const outputDir = 'build/cleaning-validation'
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

async function scrubCanvas(rect) {
  const startX = rect.x + rect.width / 2 - 42
  const endX = rect.x + rect.width / 2 + 42
  const y = rect.y + rect.height / 2

  await page.mouse.move(startX, y)
  await page.mouse.down()
  for (let step = 1; step <= 10; step += 1) {
    const x = startX + ((endX - startX) * step) / 10
    await page.mouse.move(x, y)
    await sleep(42)
  }
  await page.mouse.up()
}

async function readBioRows() {
  return page.$$eval('.pedestal-dialog dl > div', (rows) => Object.fromEntries(rows.map((row) => {
    const key = row.querySelector('dt')?.textContent?.trim() ?? ''
    const value = row.querySelector('dd')?.textContent?.trim() ?? ''
    return [key, value]
  })))
}

try {
  await page.setCacheEnabled(false)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  const response = await page.goto(`${baseUrl}/scripts/web/cleaning-e2e-validation.html?run=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 20_000,
  })
  const status = response?.status() ?? 0
  if (!response || status >= 400) throw new Error(`fixture returned HTTP ${status || 'unknown'}`)

  await page.waitForSelector('.pedestal-stage canvas', { timeout: 30_000 })
  await page.waitForFunction(() => !document.querySelector('.pedestal-fallback'), { timeout: 30_000 })

  const initialDust = Number(await page.$eval('.pedestal-stage', (element) => element.getAttribute('data-dust-amount') ?? '0'))
  if (initialDust < 0.95) throw new Error(`expected a visibly dusty fixture, got ${initialDust}`)

  const cleaningButton = 'button[aria-label="Activer le mode Nettoyer"]'
  await page.waitForSelector(`${cleaningButton}:not([disabled])`)
  await page.click(cleaningButton)
  await page.waitForSelector('button[aria-label="Quitter le mode Nettoyer"][aria-pressed="true"]')

  const canvasRect = await page.$eval('.pedestal-stage canvas', (canvas) => {
    const rect = canvas.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  })

  await page.mouse.click(canvasRect.x + canvasRect.width / 2, canvasRect.y + canvasRect.height / 2)
  await sleep(350)
  const afterTap = await page.$eval('#cleaning-e2e-state', (element) => element.getAttribute('data-event-keys') ?? '')
  if (afterTap !== '') throw new Error('simple tap unexpectedly generated a cleaning mutation')

  await scrubCanvas(canvasRect)
  await page.waitForSelector('.pedestal-cleaning-error', { timeout: 10_000 })

  const firstAttempt = await page.$eval('#cleaning-e2e-state', (element) => ({
    eventKeys: element.getAttribute('data-event-keys') ?? '',
    serverCleaningCount: element.getAttribute('data-server-cleaning-count') ?? '',
    serverBalance: element.getAttribute('data-server-balance') ?? '',
  }))
  const firstKeys = firstAttempt.eventKeys.split(',').filter(Boolean)
  if (firstKeys.length !== 1) throw new Error(`expected one cleaning attempt, got ${firstKeys.length}`)
  if (firstAttempt.serverCleaningCount !== '3') throw new Error('server fixture did not register exactly one cleaning')
  if (firstAttempt.serverBalance !== '7') throw new Error('cleaning unexpectedly changed the server Lithon balance')

  const visibleBalanceBeforeRetry = await page.$eval('.pedestal-balance span', (element) => element.textContent?.trim() ?? '')
  if (visibleBalanceBeforeRetry !== '7') throw new Error('cleaning altered the visible Lithon balance before confirmation')

  await page.click('.pedestal-cleaning-error button')
  await page.waitForFunction(() => document.querySelector('.pedestal-cleaning-feedback')?.textContent?.includes('état réglementaire') ?? false)
  await page.waitForFunction(() => document.querySelector('.pedestal-stage')?.getAttribute('data-dust-amount') === '0.000')
  await page.waitForSelector('button[aria-label="Nettoyer — surface déjà conforme"][disabled]')

  const replay = await page.$eval('#cleaning-e2e-state', (element) => ({
    eventKeys: element.getAttribute('data-event-keys') ?? '',
    serverCleaningCount: element.getAttribute('data-server-cleaning-count') ?? '',
    serverBalance: element.getAttribute('data-server-balance') ?? '',
  }))
  const replayKeys = replay.eventKeys.split(',').filter(Boolean)
  if (replayKeys.length !== 2 || replayKeys[0] !== replayKeys[1]) {
    throw new Error('network retry did not reuse the original cleaning event key')
  }
  if (replay.serverCleaningCount !== '3') throw new Error('idempotent retry incremented cleaning_count twice')
  if (replay.serverBalance !== '7') throw new Error('idempotent cleaning retry touched the Lithon balance')

  await page.click('.pedestal-utility')
  await page.waitForSelector('.pedestal-dialog[role="dialog"]')
  const bioBeforeReload = await readBioRows()
  if (bioBeforeReload.Nettoyages !== '3') throw new Error(`Bio / Stats expected 3 cleanings, got ${bioBeforeReload.Nettoyages}`)
  if (bioBeforeReload['Solde actuel'] !== '7 Lithons') throw new Error('Bio / Stats balance changed after cleaning')
  await page.click('.pedestal-dialog-heading button')

  await page.evaluate(() => document.querySelector('#simulate-cleaning-reload')?.click())
  await page.waitForSelector('.pedestal-stage canvas', { timeout: 30_000 })
  await page.waitForFunction(() => !document.querySelector('.pedestal-fallback'), { timeout: 30_000 })
  await page.waitForFunction(() => document.querySelector('.pedestal-stage')?.getAttribute('data-dust-amount') === '0.000')

  await page.click('.pedestal-utility')
  await page.waitForSelector('.pedestal-dialog[role="dialog"]')
  const bioAfterReload = await readBioRows()
  if (bioAfterReload.Nettoyages !== '3') throw new Error('canonical reload did not retain cleaning_count')
  if (!bioAfterReload['Dernier nettoyage'] || bioAfterReload['Dernier nettoyage'] === 'Non requis à ce jour') {
    throw new Error('canonical reload did not retain last_cleaned_at')
  }
  await page.click('.pedestal-dialog-heading button')

  const phoneUi = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('.pedestal-actions button')]
    const accessoryButton = document.querySelector('button[aria-label="Ouvrir la boutique d’accessoires"]')
    return {
      actionCount: buttons.length,
      enabledCount: buttons.filter((button) => !button.disabled).length,
      accessoryEnabled: accessoryButton ? !accessoryButton.disabled : false,
      allTargetsLargeEnough: buttons.every((button) => {
        const rect = button.getBoundingClientRect()
        return rect.width >= 44 && rect.height >= 44
      }),
      balance: document.querySelector('.pedestal-balance span')?.textContent?.trim() ?? '',
      dust: document.querySelector('.pedestal-stage')?.getAttribute('data-dust-amount') ?? '',
    }
  })
  if (phoneUi.actionCount !== 4 || phoneUi.enabledCount !== 2 || !phoneUi.accessoryEnabled) {
    throw new Error('post-clean action availability is inconsistent with step 10B')
  }
  if (!phoneUi.allTargetsLargeEnough) throw new Error('phone action targets are below 44px')
  if (phoneUi.balance !== '7' || phoneUi.dust !== '0.000') throw new Error('post-clean phone state is inconsistent')
  await page.screenshot({ path: `${outputDir}/cleaning-phone.png`, fullPage: true })

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
  await page.screenshot({ path: `${outputDir}/cleaning-tablet.png`, fullPage: true })

  const report = {
    status: 'pass',
    initialDust,
    tapRejected: true,
    scrubAccepted: true,
    retryReusedEventKey: true,
    cleaningCount: 3,
    lithonBalanceUnchanged: 7,
    canonicalReloadRetainedCleaning: true,
    phoneUi,
    tabletUi,
  }
  await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n`, 'utf8')
  console.log('[CAILLOU] cleaning E2E PASS: dust → tap rejected → UV scrub → lost response → idempotent retry → reload → accessory available → 0 Lithon')
} catch (error) {
  await page.screenshot({ path: `${outputDir}/failure.png`, fullPage: true }).catch(() => {})
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n${error instanceof Error ? error.stack : String(error)}\n`, 'utf8').catch(() => {})
  throw error
} finally {
  await page.close()
  await browser.close()
}
