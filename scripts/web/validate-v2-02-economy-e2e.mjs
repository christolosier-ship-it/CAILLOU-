import { mkdir, writeFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'

const baseUrl = process.env.CAILLOU_E2E_BASE_URL ?? 'http://127.0.0.1:4186'
const chromePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
const outputDir = 'build/v2-02-economy-validation'
await mkdir(outputDir, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
  ],
})

const page = await browser.newPage()
const consoleLines = []
page.on('console', (message) => consoleLines.push(`[console:${message.type()}] ${message.text()}`))
page.on('pageerror', (error) => consoleLines.push(`[pageerror] ${error.message}`))
page.on('requestfailed', (request) => consoleLines.push(`[requestfailed] ${request.url()} ${request.failure()?.errorText ?? ''}`))

async function state() {
  return page.$eval('#v2-02-economy-state', (element) => ({
    activeRockId: element.getAttribute('data-active-rock-id') ?? '',
    accessoryOwned: element.getAttribute('data-accessory-owned') === 'true',
    accessoryPurchaseCount: Number(element.getAttribute('data-accessory-purchase-count') ?? 0),
    permitOwned: element.getAttribute('data-permit-owned') === 'true',
    permitPurchaseCount: Number(element.getAttribute('data-permit-purchase-count') ?? 0),
    balance: Number(element.getAttribute('data-balance') ?? 0),
    mountRevision: Number(element.getAttribute('data-mount-revision') ?? 0),
  }))
}

async function text(selector) {
  return page.$eval(selector, (element) => element.textContent?.replace(/\s+/g, ' ').trim() ?? '')
}

try {
  await page.setCacheEnabled(false)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  const response = await page.goto(`${baseUrl}/scripts/web/v2-02-economy-e2e-validation.html?run=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 20_000,
  })
  if (!response || response.status() >= 400) throw new Error(`fixture returned HTTP ${response?.status() ?? 'unknown'}`)
  await page.waitForSelector('.accessory-shop', { timeout: 15_000 })
  await page.waitForSelector('.accessory-card .accessory-buy', { timeout: 15_000 })

  const initial = await state()
  if (initial.balance !== 1500 || initial.accessoryOwned || !initial.permitOwned) {
    throw new Error(`unexpected initial V2-02 state: ${JSON.stringify(initial)}`)
  }
  const initialCopy = await page.$eval('.accessory-shop', (element) => element.textContent ?? '')
  if (initialCopy.includes('Permanente au compte') || initialCopy.includes('Fonctionnalités permanentes')) {
    throw new Error('Boutique still presents rock features as permanent to the account')
  }
  if (!initialCopy.includes('Ce caillou uniquement')) {
    throw new Error('Boutique does not expose the rock-scoped Permit contract')
  }

  await page.click('.accessory-card .accessory-buy')
  await page.waitForFunction(() => {
    const output = document.querySelector('#v2-02-economy-state')
    return output?.getAttribute('data-accessory-owned') === 'true'
      && output?.getAttribute('data-accessory-purchase-count') === '1'
      && output?.getAttribute('data-balance') === '1410'
  })
  if (!(await text('.accessory-card .accessory-buy')).includes('Possédé')) {
    throw new Error('purchased accessory is not presented as Possédé')
  }
  const ownedButtonDisabled = await page.$eval('.accessory-card .accessory-buy', (button) => button.disabled)
  if (!ownedButtonDisabled) throw new Error('owned accessory can still be purchased from the Boutique')
  await page.click('.accessory-card .accessory-buy')
  await new Promise((resolve) => setTimeout(resolve, 150))
  if ((await state()).accessoryPurchaseCount !== 1) throw new Error('disabled owned accessory triggered a second purchase')

  // Fixture-only controls are behind the modal backdrop, so invoke their React handlers through the DOM.
  await page.$eval('#switch-rock', (button) => button.click())
  await page.waitForFunction(() => {
    const output = document.querySelector('#v2-02-economy-state')
    return output?.getAttribute('data-active-rock-id')?.endsWith('000000000002')
      && output?.getAttribute('data-permit-owned') === 'false'
  })
  await page.waitForSelector('.accessory-card-owned', { timeout: 10_000 })

  const afterRockChange = await state()
  if (!afterRockChange.accessoryOwned || afterRockChange.balance !== 1410) {
    throw new Error(`account-owned accessory or wallet was lost on rock change: ${JSON.stringify(afterRockChange)}`)
  }
  if (afterRockChange.permitOwned) throw new Error('Permit leaked from the previous rock to the new rock')
  if (!(await text('.accessory-card .accessory-buy')).includes('Possédé')) {
    throw new Error('account-owned accessory is not preserved visually on the new rock')
  }
  if (!(await text('.feature-card .accessory-buy')).includes('Acquérir pour ce caillou')) {
    throw new Error('new rock does not offer its own Permit purchase')
  }

  await page.click('.feature-card .accessory-buy')
  await page.waitForFunction(() => {
    const output = document.querySelector('#v2-02-economy-state')
    return output?.getAttribute('data-permit-owned') === 'true'
      && output?.getAttribute('data-permit-purchase-count') === '1'
      && output?.getAttribute('data-balance') === '410'
  })
  if (!(await text('.feature-card .accessory-buy')).includes('Acquis pour ce caillou')) {
    throw new Error('Permit purchase is not presented as scoped to the current rock')
  }

  await page.$eval('#simulate-reconnect', (button) => button.click())
  await page.waitForFunction(() => document.querySelector('#v2-02-economy-state')?.getAttribute('data-mount-revision') === '1')
  await page.waitForSelector('.accessory-card-owned', { timeout: 10_000 })
  const afterReconnect = await state()
  if (!afterReconnect.accessoryOwned || !afterReconnect.permitOwned || afterReconnect.balance !== 410) {
    throw new Error(`canonical UI state was not retained across remount/reconnection: ${JSON.stringify(afterReconnect)}`)
  }

  await page.screenshot({ path: `${outputDir}/economy-phone.png`, fullPage: true })
  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  await new Promise((resolve) => setTimeout(resolve, 250))
  await page.screenshot({ path: `${outputDir}/economy-tablet.png`, fullPage: true })

  const severeConsole = consoleLines.filter((line) => line.startsWith('[pageerror]') || line.includes('Unhandled'))
  if (severeConsole.length > 0) throw new Error(`browser errors observed: ${severeConsole.join(' | ')}`)

  const report = {
    status: 'pass',
    accessoryPurchaseSingle: true,
    ownedAccessoryAccountScoped: true,
    ownedAccessorySurvivesRockChange: true,
    oldRockPermitNotInherited: true,
    newRockPermitPurchasable: true,
    permitCopyRockScoped: true,
    remountReconnectionRetainsCanonicalState: true,
    phone: true,
    tablet: true,
  }
  await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n`, 'utf8')
  console.log('[CAILLOU] V2-02 economy E2E PASS: account goods + rock-scoped Permit + rock change + reconnect')
} catch (error) {
  await page.screenshot({ path: `${outputDir}/failure.png`, fullPage: true }).catch(() => {})
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n${error instanceof Error ? error.stack : String(error)}\n`, 'utf8').catch(() => {})
  throw error
} finally {
  await page.close()
  await browser.close()
}
