import { mkdir, writeFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'

const baseUrl = process.env.CAILLOU_VALIDATION_BASE_URL ?? 'http://127.0.0.1:4173'
const chromePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
const accessoryIds = process.argv.slice(2)

if (accessoryIds.length === 0) {
  throw new Error('Pass at least one accessory id, e.g. monocle')
}

await mkdir('build/accessory-production/web-validation', { recursive: true })

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

try {
  for (const accessoryId of accessoryIds) {
    const page = await browser.newPage()
    await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 1 })
    const diagnostics = []
    page.on('console', (message) => diagnostics.push(`[console:${message.type()}] ${message.text()}`))
    page.on('pageerror', (error) => diagnostics.push(`[pageerror] ${error.message}`))
    page.on('requestfailed', (request) => {
      diagnostics.push(`[requestfailed] ${request.url()} ${request.failure()?.errorText ?? ''}`)
    })

    const model = `/public/assets/accessories/${accessoryId}/model.glb`
    const url = `${baseUrl}/scripts/web/rock-render-validation.html?model=${encodeURIComponent(model)}`
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 })
      if (!response?.ok()) throw new Error(`Validation page returned HTTP ${response?.status()}`)
      await page.waitForFunction(
        () => ['pass', 'fail'].includes(document.documentElement.dataset.status ?? ''),
        { timeout: 20_000 },
      )
      const verdict = await page.evaluate(() => ({
        status: document.documentElement.dataset.status ?? 'loading',
        error: document.documentElement.dataset.error ?? '',
      }))
      await writeFile(
        `build/accessory-production/web-validation/${accessoryId}.log`,
        `${diagnostics.join('\n')}\n`,
        'utf8',
      )
      await page.screenshot({
        path: `build/accessory-production/web-validation/${accessoryId}.png`,
        type: 'png',
      })
      if (verdict.status !== 'pass') {
        throw new Error(`${accessoryId}: renderer FAIL: ${verdict.error}`)
      }
      console.log(`[CAILLOU] ${accessoryId}: real Three.js/WebGL renderer PASS`)
    } finally {
      await page.close()
    }
  }
} finally {
  await browser.close()
}
