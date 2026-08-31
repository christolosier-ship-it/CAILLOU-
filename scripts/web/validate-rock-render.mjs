import { writeFile } from 'node:fs/promises'
import { mkdir } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'

const baseUrl = process.env.CAILLOU_VALIDATION_BASE_URL ?? 'http://127.0.0.1:4173'
const chromePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
const rockIds = process.argv.slice(2)

if (rockIds.length === 0) {
  throw new Error('Pass at least one rock id, e.g. rock-001')
}

await mkdir('build/rock-production/web-validation', { recursive: true })

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
  for (const rockId of rockIds) {
    const page = await browser.newPage()
    await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 1 })

    const consoleLines = []
    page.on('console', (message) => consoleLines.push(`[console:${message.type()}] ${message.text()}`))
    page.on('pageerror', (error) => consoleLines.push(`[pageerror] ${error.message}`))
    page.on('requestfailed', (request) => {
      consoleLines.push(`[requestfailed] ${request.url()} ${request.failure()?.errorText ?? ''}`)
    })

    const modelPath = `/public/assets/rocks/${rockId}/model.glb`
    const url = `${baseUrl}/scripts/web/rock-render-validation.html?model=${encodeURIComponent(modelPath)}`

    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 })
      if (!response?.ok()) {
        throw new Error(`${rockId}: validation page returned HTTP ${response?.status() ?? 'unknown'}`)
      }

      await page.waitForFunction(
        () => ['pass', 'fail'].includes(document.documentElement.dataset.status ?? ''),
        { timeout: 20_000 },
      )

      const verdict = await page.evaluate(() => ({
        status: document.documentElement.dataset.status ?? 'loading',
        error: document.documentElement.dataset.error ?? '',
        title: document.title,
      }))

      const html = await page.content()
      await writeFile(`build/rock-production/web-validation/${rockId}.html`, html, 'utf8')
      await writeFile(
        `build/rock-production/web-validation/${rockId}.log`,
        `${consoleLines.join('\n')}\n`,
        'utf8',
      )
      await page.screenshot({
        path: `build/rock-production/web-validation/${rockId}.png`,
        type: 'png',
        fullPage: false,
      })

      if (verdict.status !== 'pass') {
        throw new Error(`${rockId}: renderer verdict FAIL: ${verdict.error || verdict.title}`)
      }

      console.log(`[CAILLOU] ${rockId}: real Three.js/WebGL renderer PASS`)
    } catch (error) {
      const html = await page.content().catch(() => '')
      await writeFile(`build/rock-production/web-validation/${rockId}.html`, html, 'utf8').catch(() => {})
      await writeFile(
        `build/rock-production/web-validation/${rockId}.log`,
        `${consoleLines.join('\n')}\n${error instanceof Error ? error.stack : String(error)}\n`,
        'utf8',
      ).catch(() => {})
      throw error
    } finally {
      await page.close()
    }
  }
} finally {
  await browser.close()
}
