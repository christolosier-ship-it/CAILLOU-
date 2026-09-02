import { mkdir, writeFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'

const baseUrl = process.env.CAILLOU_E2E_BASE_URL ?? 'http://127.0.0.1:4178'
const chromePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
const outputDir = 'build/accessory-physics-validation'
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
  return page.$eval('#accessory-physics-e2e-state', (element) => ({
    instanceCount: Number(element.getAttribute('data-instance-count') ?? '0'),
    loadedCount: Number(element.getAttribute('data-loaded-count') ?? '0'),
    selectedId: element.getAttribute('data-selected-id') ?? '',
    saveCount: Number(element.getAttribute('data-save-count') ?? '0'),
    collisions: Number(element.getAttribute('data-probe-collisions') ?? '0'),
    settled: element.getAttribute('data-probe-settled') === 'true',
    finalY: Number(element.getAttribute('data-probe-final-y') ?? '1'),
    transforms: JSON.parse(element.getAttribute('data-transforms') ?? '[]'),
  }))
}

async function touch(selector) {
  await page.$eval(selector, (element) => element.scrollIntoView({ block: 'center', inline: 'center' }))
  await new Promise((resolve) => setTimeout(resolve, 80))
  const rect = await page.$eval(selector, (element) => {
    const box = element.getBoundingClientRect()
    return { x: box.x, y: box.y, width: box.width, height: box.height }
  })
  await page.touchscreen.tap(rect.x + rect.width / 2, rect.y + rect.height / 2)
}

try {
  await page.setCacheEnabled(false)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  const response = await page.goto(`${baseUrl}/scripts/web/accessory-physics-e2e-validation.html?run=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 20_000,
  })
  const status = response?.status() ?? 0
  if (!response || status >= 400) throw new Error(`fixture returned HTTP ${status || 'unknown'}`)

  await page.waitForSelector('.pedestal-stage canvas', { timeout: 30_000 })
  await page.waitForSelector('.accessory-editor', { timeout: 30_000 })
  await page.waitForFunction(() => Number(document.querySelector('#accessory-physics-e2e-state')?.getAttribute('data-loaded-count') ?? '0') === 2, { timeout: 30_000 })
  await page.waitForFunction(() => document.querySelector('#accessory-physics-e2e-state')?.getAttribute('data-probe-settled') === 'true', { timeout: 20_000 })

  const phone = await state()
  if (phone.instanceCount !== 2 || phone.loadedCount !== 2) {
    throw new Error(`two accessory GLBs were not ready: ${JSON.stringify(phone)}`)
  }
  if (phone.collisions < 1) throw new Error('Rapier gravity probe never collided with the static collider')
  if (phone.finalY < -0.16 || phone.finalY > -0.04) {
    throw new Error(`Rapier body settled outside expected contact band: y=${phone.finalY}`)
  }

  const initialFirst = phone.transforms.find((item) => item.id === phone.selectedId)
  if (!initialFirst) throw new Error('selected accessory missing from physics fixture')
  await touch('.accessory-editor-fine summary')
  await touch('button[aria-label="Déplacer X positif"]')
  await page.waitForFunction(() => Number(document.querySelector('#accessory-physics-e2e-state')?.getAttribute('data-save-count') ?? '0') >= 1)
  const afterTouch = await state()
  const movedFirst = afterTouch.transforms.find((item) => item.id === afterTouch.selectedId)
  if (!movedFirst || Math.abs(movedFirst.position[0] - (initialFirst.position[0] + 0.05)) > 0.0001) {
    throw new Error('phone tactile precision edit did not survive physics integration')
  }

  const phoneTargets = await page.$$eval('.accessory-editor button, .accessory-editor summary', (targets) => targets
    .filter((target) => {
      const rect = target.getBoundingClientRect()
      const style = getComputedStyle(target)
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
    })
    .every((target) => {
      const rect = target.getBoundingClientRect()
      return rect.width >= 44 && rect.height >= 44
    }))
  if (!phoneTargets) throw new Error('one or more visible phone physics editor targets are below 44px')
  await page.screenshot({ path: `${outputDir}/physics-phone.png`, fullPage: true })

  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  await touch('button[aria-label="Sélectionner Lunettes rondes 2"]')
  await page.waitForFunction(() => document.querySelector('.accessory-editor')?.getAttribute('data-selected-accessory')?.endsWith('0002') ?? false)
  const savesBeforeTablet = (await state()).saveCount
  await touch('button[aria-label="Tourner Z positif"]')
  await page.waitForFunction((expected) => Number(document.querySelector('#accessory-physics-e2e-state')?.getAttribute('data-save-count') ?? '0') > expected, {}, savesBeforeTablet)
  const tablet = await state()
  if (tablet.instanceCount !== 2 || !tablet.settled) throw new Error('tablet resize destabilized physics or accessory instances')
  await page.screenshot({ path: `${outputDir}/physics-tablet.png`, fullPage: true })

  const severeConsole = consoleLines.filter((line) => line.startsWith('[pageerror]') || line.includes('WebGL context lost') || line.includes('Unhandled'))
  if (severeConsole.length > 0) throw new Error(`browser errors observed: ${severeConsole.join(' | ')}`)

  const report = {
    status: 'pass',
    rapierGravity: true,
    staticCollision: true,
    settledSleepingBody: true,
    finalProbeY: tablet.finalY,
    simultaneousAccessoryGlbs: tablet.instanceCount,
    phoneTouchEdit: true,
    tabletTouchEdit: true,
    saveCount: tablet.saveCount,
  }
  await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n`, 'utf8')
  console.log('[CAILLOU] accessory physics E2E PASS: Rapier gravity/collision/sleep + 2 GLB + phone/tablet touch')
} catch (error) {
  await page.screenshot({ path: `${outputDir}/failure.png`, fullPage: true }).catch(() => {})
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n${error instanceof Error ? error.stack : String(error)}\n`, 'utf8').catch(() => {})
  throw error
} finally {
  await page.close()
  await browser.close()
}