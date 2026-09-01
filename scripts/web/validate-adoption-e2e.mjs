import { mkdir, writeFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'

const baseUrl = process.env.CAILLOU_E2E_BASE_URL ?? 'http://127.0.0.1:4175'
const chromePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
const outputDir = 'build/adoption-validation'
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

try {
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  const response = await page.goto(`${baseUrl}/scripts/web/adoption-e2e-validation.html?run=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 20_000,
  })
  const status = response?.status() ?? 0
  if (!response || (status >= 400 && status !== 304)) throw new Error(`fixture returned HTTP ${status || 'unknown'}`)

  await page.waitForSelector('.showroom-adopt:not([disabled])', { timeout: 30_000 })
  await page.click('.showroom-adopt')
  await page.waitForSelector('.naming-panel', { timeout: 10_000 })

  await page.type('#rock-name', 'Bernard')
  await page.click('.naming-primary')
  await page.waitForFunction(
    () => document.querySelector('.naming-error')?.textContent?.includes('réseau simulée') ?? false,
    { timeout: 10_000 },
  )

  const firstEventKey = await page.$eval('#adoption-e2e-state', (element) => element.getAttribute('data-event-keys') ?? '')
  if (!firstEventKey || firstEventKey.includes(',')) throw new Error('first adoption attempt did not expose exactly one event key')

  await page.click('.naming-primary')
  await page.waitForSelector('.pedestal-shell', { timeout: 20_000 })
  await page.waitForFunction(() => document.querySelector('.pedestal-identity h1')?.textContent?.trim() === 'Bernard')

  const state = await page.$eval('#adoption-e2e-state', (element) => ({
    eventKeys: element.getAttribute('data-event-keys') ?? '',
    serverRock: element.getAttribute('data-server-rock') ?? '',
  }))
  const keys = state.eventKeys.split(',').filter(Boolean)
  if (keys.length !== 2 || keys[0] !== keys[1]) throw new Error('retry did not reuse the same idempotency event key')
  if (state.serverRock !== 'Bernard') throw new Error('server fixture did not retain the adopted rock')

  await page.waitForFunction(() => !document.querySelector('.pedestal-fallback'))

  const pedestal = await page.evaluate(() => {
    const actionButtons = [...document.querySelectorAll('.pedestal-actions button')]
    const caressButton = document.querySelector('button[aria-label="Activer le mode Caresser"]')
    return {
      actionCount: actionButtons.length,
      enabledCount: actionButtons.filter((button) => !button.disabled).length,
      caressEnabled: caressButton ? !caressButton.disabled : false,
      remainingActionsDisabled: actionButtons
        .filter((button) => button !== caressButton)
        .every((button) => button.disabled),
      allTargetsLargeEnough: actionButtons.every((button) => {
        const rect = button.getBoundingClientRect()
        return rect.width >= 44 && rect.height >= 44
      }),
      hasCanvas: Boolean(document.querySelector('.pedestal-stage canvas')),
    }
  })

  if (pedestal.actionCount !== 4) throw new Error(`expected 4 pedestal actions, got ${pedestal.actionCount}`)
  if (pedestal.enabledCount !== 1 || !pedestal.caressEnabled) throw new Error('caress is not the only enabled step-08 action')
  if (!pedestal.remainingActionsDisabled) throw new Error('cleaning, accessory or discard became active too early')
  if (!pedestal.allTargetsLargeEnough) throw new Error('pedestal action targets are below 44px')
  if (!pedestal.hasCanvas) throw new Error('pedestal 3D canvas is missing')

  await page.click('.pedestal-utility')
  await page.waitForSelector('.pedestal-dialog[role="dialog"]')
  const bio = await page.$eval('.pedestal-dialog', (element) => element.textContent ?? '')
  if (!bio.includes('Bernard') || !bio.includes('Spécimen')) throw new Error('Bio / Stats does not identify the active rock')
  await page.click('.pedestal-dialog-heading button')

  await page.screenshot({ path: `${outputDir}/adoption-phone.png`, fullPage: true })
  const report = {
    status: 'pass',
    viewport: '390x844',
    retryReusedEventKey: true,
    activeRockName: 'Bernard',
    pedestal,
    bioStatsOpened: true,
  }
  await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n`, 'utf8')
  console.log('[CAILLOU] adoption E2E PASS: showroom → naming → lost response → idempotent retry → pedestal with caress enabled')
} catch (error) {
  await page.screenshot({ path: `${outputDir}/failure.png`, fullPage: true }).catch(() => {})
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n${error instanceof Error ? error.stack : String(error)}\n`, 'utf8').catch(() => {})
  throw error
} finally {
  await page.close()
  await browser.close()
}
