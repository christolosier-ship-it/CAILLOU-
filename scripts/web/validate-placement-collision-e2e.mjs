import { mkdir, writeFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'

const baseUrl = process.env.CAILLOU_E2E_BASE_URL ?? 'http://127.0.0.1:4182'
const chromePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
const outputDir = 'build/placement-collision-validation'
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
  const response = await page.goto(`${baseUrl}/scripts/web/placement-collision-e2e-validation.html?run=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 20_000,
  })
  const status = response?.status() ?? 0
  if (!response || status >= 400) throw new Error(`fixture returned HTTP ${status || 'unknown'}`)

  await page.waitForSelector('#placement-collision-e2e-state', { timeout: 20_000 })
  await page.waitForFunction(() => document.querySelector('#placement-collision-e2e-state')?.getAttribute('data-ready') === 'true', {
    timeout: 20_000,
  })

  const state = await page.$eval('#placement-collision-e2e-state', (element) => ({
    translationX: Number(element.getAttribute('data-translation-x')),
    rotationFraction: Number(element.getAttribute('data-rotation-fraction')),
    scale: Number(element.getAttribute('data-scale')),
  }))

  if (!Number.isFinite(state.translationX) || state.translationX < -1.05 || state.translationX > -0.84) {
    throw new Error(`fast translation was not stopped at the obstacle: x=${state.translationX}`)
  }
  if (!Number.isFinite(state.rotationFraction) || state.rotationFraction <= 0.05 || state.rotationFraction >= 0.95) {
    throw new Error(`rotation was not bounded before penetration: fraction=${state.rotationFraction}`)
  }
  if (!Number.isFinite(state.scale) || state.scale < 1.8 || state.scale > 2.05) {
    throw new Error(`scale was not bounded at contact: scale=${state.scale}`)
  }

  const severeConsole = consoleLines.filter((line) => line.startsWith('[pageerror]') || line.includes('WebGL context lost') || line.includes('Unhandled'))
  if (severeConsole.length > 0) throw new Error(`browser errors observed: ${severeConsole.join(' | ')}`)

  await page.screenshot({ path: `${outputDir}/collision-bench.png`, fullPage: true })
  const report = {
    status: 'pass',
    fastTranslationNoTunneling: true,
    rotationBoundedBeforePenetration: true,
    scaleBoundedBeforePenetration: true,
    translationX: state.translationX,
    rotationFraction: state.rotationFraction,
    scale: state.scale,
  }
  await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n`, 'utf8')
  console.log('[CAILLOU] Placement collision E2E PASS: sweep + bounded rotation + bounded scale')
} catch (error) {
  await page.screenshot({ path: `${outputDir}/failure.png`, fullPage: true }).catch(() => {})
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n${error instanceof Error ? error.stack : String(error)}\n`, 'utf8').catch(() => {})
  throw error
} finally {
  await page.close()
  await browser.close()
}
