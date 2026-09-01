import { mkdir, writeFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'

const baseUrl = process.env.CAILLOU_UI_BASE_URL ?? 'http://127.0.0.1:4174'
const chromePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
const outputDir = 'build/showroom-validation'
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

async function waitForRock(page, expectedIndex) {
  await page.waitForFunction(
    (index) => {
      const counter = document.querySelector('.showroom-counter span:first-child')?.textContent?.trim()
      const fallback = document.querySelector('.showroom-fallback')
      return counter === index && !fallback
    },
    { timeout: 30_000 },
    expectedIndex,
  )
}

async function validateViewport(name, viewport, reducedMotion = false) {
  const page = await browser.newPage()
  const consoleLines = []
  page.on('console', (message) => consoleLines.push(`[console:${message.type()}] ${message.text()}`))
  page.on('pageerror', (error) => consoleLines.push(`[pageerror] ${error.message}`))
  page.on('requestfailed', (request) => consoleLines.push(`[requestfailed] ${request.url()} ${request.failure()?.errorText ?? ''}`))

  try {
    await page.setViewport({ ...viewport, deviceScaleFactor: 1, isMobile: name === 'phone', hasTouch: name === 'phone' })
    if (reducedMotion) {
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    }

    const response = await page.goto(`${baseUrl}/scripts/web/showroom-ui-validation.html`, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    })
    if (!response?.ok()) throw new Error(`${name}: fixture returned HTTP ${response?.status() ?? 'unknown'}`)

    await waitForRock(page, '01')

    const initial = await page.evaluate(() => {
      const previous = document.querySelector('.showroom-nav-previous')?.getBoundingClientRect()
      const next = document.querySelector('.showroom-nav-next')?.getBoundingClientRect()
      const stage = document.querySelector('.showroom-stage')?.getBoundingClientRect()
      const details = document.querySelector('.showroom-details')?.getBoundingClientRect()
      const canvas = document.querySelector('.showroom-canvas canvas')
      const description = document.querySelector('.showroom-description')?.textContent?.trim() ?? ''
      return {
        previous: previous ? { width: previous.width, height: previous.height } : null,
        next: next ? { width: next.width, height: next.height } : null,
        stage: stage ? { x: stage.x, y: stage.y, width: stage.width, height: stage.height } : null,
        details: details ? { x: details.x, y: details.y, width: details.width, height: details.height } : null,
        hasCanvas: Boolean(canvas),
        descriptionLength: description.length,
      }
    })

    if (!initial.hasCanvas) throw new Error(`${name}: 3D canvas is missing`)
    if (!initial.previous || initial.previous.width < 44 || initial.previous.height < 44) throw new Error(`${name}: previous touch target is below 44px`)
    if (!initial.next || initial.next.width < 44 || initial.next.height < 44) throw new Error(`${name}: next touch target is below 44px`)
    if (initial.descriptionLength < 100) throw new Error(`${name}: serious specimen description is missing`)

    await page.keyboard.press('ArrowRight')
    await waitForRock(page, '02')

    const stageBox = await page.$eval('.showroom-canvas', (element) => {
      const rect = element.getBoundingClientRect()
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    })
    const centerX = stageBox.x + stageBox.width / 2
    const centerY = stageBox.y + stageBox.height / 2
    await page.mouse.move(centerX, centerY)
    await page.mouse.down()
    await page.mouse.move(centerX + Math.min(90, stageBox.width / 5), centerY + 12, { steps: 8 })
    await page.mouse.up()

    const afterDrag = await page.$eval('.showroom-counter span:first-child', (element) => element.textContent?.trim())
    if (afterDrag !== '02') throw new Error(`${name}: rotating the rock changed specimen navigation`)

    await page.keyboard.press('ArrowLeft')
    await waitForRock(page, '01')

    if (viewport.width >= 760 && initial.stage && initial.details && initial.details.x <= initial.stage.x) {
      throw new Error(`${name}: tablet/desktop layout did not switch to the two-column showroom composition`)
    }

    await page.screenshot({ path: `${outputDir}/${name}.png`, type: 'png', fullPage: true })
    await writeFile(`${outputDir}/${name}.log`, `${consoleLines.join('\n')}\n`, 'utf8')

    return {
      name,
      viewport,
      reducedMotion,
      initial,
      keyboardRoundTrip: true,
      dragPreservedSpecimen: true,
    }
  } finally {
    await page.close()
  }
}

try {
  const phone = await validateViewport('phone', { width: 390, height: 844 }, true)
  const tablet = await validateViewport('tablet', { width: 1024, height: 768 })
  const report = { status: 'pass', phone, tablet }
  await writeFile(`${outputDir}/ui-report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log('[CAILLOU] showroom UI PASS: phone 390x844 + tablet 1024x768')
  console.log('[CAILLOU] keyboard round-trip and drag/navigation isolation PASS')
} finally {
  await browser.close()
}
