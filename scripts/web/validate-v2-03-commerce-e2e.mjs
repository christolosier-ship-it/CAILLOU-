import { mkdir, writeFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'

const baseUrl = process.env.CAILLOU_E2E_BASE_URL ?? 'http://127.0.0.1:4189'
const chromePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
const outputDir = 'build/v2-03-commerce-validation'
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
  return page.$eval('#v2-03-commerce-state', (element) => ({
    view: element.getAttribute('data-view') ?? '',
    purchaseCount: Number(element.getAttribute('data-purchase-count') ?? 0),
    ownedCount: Number(element.getAttribute('data-owned-count') ?? 0),
    instanceCount: Number(element.getAttribute('data-instance-count') ?? 0),
    selectedId: element.getAttribute('data-selected-id') ?? '',
    tapReady: element.getAttribute('data-tap-ready') === 'true',
    tapCount: Number(element.getAttribute('data-tap-count') ?? 0),
    balance: Number(element.getAttribute('data-balance') ?? 0),
  }))
}

async function text(selector) {
  return page.$eval(selector, (element) => element.textContent?.replace(/\s+/g, ' ').trim() ?? '')
}

try {
  await page.setCacheEnabled(false)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  const response = await page.goto(`${baseUrl}/scripts/web/v2-03-commerce-validation.html?run=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 20_000,
  })
  if (!response || response.status() >= 400) throw new Error(`fixture returned HTTP ${response?.status() ?? 'unknown'}`)

  await page.waitForSelector('.accessory-shop', { timeout: 15_000 })
  await page.waitForFunction(() => document.querySelectorAll('.accessory-card').length === 11, { timeout: 15_000 })

  const cards = await page.$$eval('.accessory-card', (nodes) => nodes.map((node) => node.textContent?.replace(/\s+/g, ' ').trim() ?? ''))
  if (cards.length !== 11) throw new Error(`expected 11 V2 cards, got ${cards.length}`)
  if (!cards[0]?.includes('Masque patiné')) throw new Error(`first V2 card is not mask-scan: ${cards[0] ?? 'missing'}`)
  const shopCopy = await text('.accessory-shop')
  if (shopCopy.includes('Licence vérifiée')) {
    throw new Error('Boutique invents a licence label for V2 entries without provenance')
  }

  const firstBuy = '.accessory-card:first-of-type .accessory-buy'
  await page.click(firstBuy)
  await page.waitForFunction(() => {
    const output = document.querySelector('#v2-03-commerce-state')
    return output?.getAttribute('data-purchase-count') === '1'
      && output?.getAttribute('data-owned-count') === '1'
      && output?.getAttribute('data-balance') === '2880'
  }, { timeout: 10_000 })

  if (!(await text(firstBuy)).includes('Possédé')) throw new Error('purchased V2 accessory is not presented as Possédé')
  const disabledAfterPurchase = await page.$eval(firstBuy, (button) => button.disabled)
  if (!disabledAfterPurchase) throw new Error('owned V2 accessory can still be purchased')
  await page.click(firstBuy).catch(() => {})
  await new Promise((resolve) => setTimeout(resolve, 150))
  if ((await state()).purchaseCount !== 1) throw new Error('owned V2 accessory triggered a duplicate purchase')

  await page.click('.accessory-shop-close')
  await page.waitForSelector('.placement-panel', { timeout: 10_000 })
  await page.click('.placement-owned summary')
  await page.waitForSelector('.placement-owned-grid button', { timeout: 10_000 })
  const ownedButtonCopy = await text('.placement-owned-grid button')
  if (!ownedButtonCopy.includes('Masque patiné') || !ownedButtonCopy.includes('Disponible')) {
    throw new Error(`owned V2 accessory is not reusable from Placement: ${ownedButtonCopy}`)
  }

  await page.click('.placement-owned-grid button')
  await page.waitForFunction(() => document.querySelector('#v2-03-commerce-state')?.getAttribute('data-instance-count') === '1')
  const placedState = await state()
  if (!placedState.selectedId) throw new Error('new V2 placement was not selected')
  const placedCopy = await text('.placement-owned')
  if (!placedCopy.includes('Tous les accessoires possédés sont déjà placés.')) {
    throw new Error(`already placed V2 accessory still looks addable: ${placedCopy}`)
  }

  const targetButtons = await page.$$('.placement-targets button')
  if (targetButtons.length < 2) throw new Error('placed V2 target missing from Placement target list')
  await targetButtons[1].click()
  await page.waitForSelector('.placement-remove', { timeout: 5_000 })
  if (!(await text('.placement-remove')).includes('Masque patiné')) throw new Error('selected V2 target is not removable')
  await page.click('.placement-remove')
  await page.waitForFunction(() => document.querySelector('#v2-03-commerce-state')?.getAttribute('data-instance-count') === '0')
  await page.waitForSelector('.placement-owned-grid button', { timeout: 5_000 })
  if (!(await text('.placement-owned-grid button')).includes('Masque patiné')) {
    throw new Error('removed V2 accessory did not become reusable')
  }

  await page.waitForFunction(() => document.querySelector('#v2-03-commerce-state')?.getAttribute('data-tap-ready') === 'true', { timeout: 30_000 })
  const canvas = await page.$('#v2-tap-probe canvas')
  const box = await canvas?.boundingBox()
  if (!box) throw new Error('V2 tap probe canvas is missing')
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForFunction(() => document.querySelector('#v2-03-commerce-state')?.getAttribute('data-tap-count') === '1', { timeout: 5_000 })

  await page.screenshot({ path: `${outputDir}/commerce-phone.png`, fullPage: true })
  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  await new Promise((resolve) => setTimeout(resolve, 250))
  await page.screenshot({ path: `${outputDir}/commerce-tablet.png`, fullPage: true })

  const severeConsole = consoleLines.filter((line) => line.startsWith('[pageerror]') || line.includes('WebGL context lost') || line.includes('Unhandled'))
  if (severeConsole.length > 0) throw new Error(`browser errors observed: ${severeConsole.join(' | ')}`)

  const report = {
    status: 'pass',
    v2CatalogueCards: cards.length,
    purchaseUnique: true,
    ownedState: true,
    alreadyPlacedNotAddable: true,
    removedBecomesReusable: true,
    v2TapSelection: true,
    phone: true,
    tablet: true,
  }
  await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n`, 'utf8')
  console.log('[CAILLOU] V2-03 Lot G commerce PASS: 11 V2 + achat unique + Possédé + placé indisponible + retrait réutilisable + tap V2')
} catch (error) {
  await page.screenshot({ path: `${outputDir}/failure.png`, fullPage: true }).catch(() => {})
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n${error instanceof Error ? error.stack : String(error)}\n`, 'utf8').catch(() => {})
  throw error
} finally {
  await page.close()
  await browser.close()
}
