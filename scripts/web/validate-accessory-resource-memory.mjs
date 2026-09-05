import { mkdir, writeFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'

const baseUrl = process.env.CAILLOU_E2E_BASE_URL ?? 'http://127.0.0.1:4187'
const chromePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
const outputDir = 'build/accessory-resource-validation'
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
    '--window-size=1024,1024',
  ],
})

const page = await browser.newPage()
await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 1 })
const consoleLines = []
page.on('console', (message) => consoleLines.push(`[console:${message.type()}] ${message.text()}`))
page.on('pageerror', (error) => consoleLines.push(`[pageerror] ${error.message}`))
page.on('requestfailed', (request) => consoleLines.push(`[requestfailed] ${request.url()} ${request.failure()?.errorText ?? ''}`))

try {
  const response = await page.goto(`${baseUrl}/scripts/web/accessory-resource-validation.html`, {
    waitUntil: 'domcontentloaded',
    timeout: 20_000,
  })
  if (!response?.ok()) throw new Error(`Accessory resource page returned HTTP ${response?.status() ?? 'unknown'}`)

  await page.waitForFunction(
    () => ['pass', 'fail'].includes(document.documentElement.dataset.status ?? ''),
    { timeout: 180_000 },
  )

  const verdict = await page.evaluate(() => ({
    status: document.documentElement.dataset.status ?? 'loading',
    error: document.documentElement.dataset.error ?? '',
    report: window.__ACCESSORY_RESOURCE_REPORT__ ?? null,
  }))

  await writeFile(`${outputDir}/report.json`, `${JSON.stringify(verdict.report, null, 2)}\n`, 'utf8')
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n`, 'utf8')
  await page.screenshot({ path: `${outputDir}/accessory-resource-validation.png`, type: 'png', fullPage: false })

  if (verdict.status !== 'pass') {
    throw new Error(`Accessory resource validation failed: ${verdict.error || 'unknown error'}`)
  }

  console.log(`[CAILLOU] accessory resources PASS: ${verdict.report.rounds} rounds, ${verdict.report.accessoriesPerRound} accessories/round`)
  console.log(`[CAILLOU] residual memory: geometries=${verdict.report.finalMemory.geometries}, textures=${verdict.report.finalMemory.textures}`)
} catch (error) {
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n${error instanceof Error ? error.stack : String(error)}\n`, 'utf8').catch(() => {})
  throw error
} finally {
  await page.close()
  await browser.close()
}
