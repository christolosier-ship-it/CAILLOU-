import { mkdir, writeFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'

const baseUrl = process.env.CAILLOU_E2E_BASE_URL ?? 'http://127.0.0.1:4178'
const chromePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
const outputDir = 'build/accessory-placement-validation'
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
  return page.$eval('#accessory-placement-e2e-state', (element) => ({
    instanceCount: Number(element.getAttribute('data-instance-count') ?? '0'),
    selectedId: element.getAttribute('data-selected-id') ?? '',
    loadedCount: Number(element.getAttribute('data-loaded-count') ?? '0'),
    saveCount: Number(element.getAttribute('data-save-count') ?? '0'),
    disposeCount: Number(element.getAttribute('data-dispose-count') ?? '0'),
    disposedGeometries: Number(element.getAttribute('data-disposed-geometries') ?? '0'),
    reloadCount: Number(element.getAttribute('data-reload-count') ?? '0'),
    transforms: JSON.parse(element.getAttribute('data-transforms') ?? '[]'),
    serverTransforms: JSON.parse(element.getAttribute('data-server-transforms') ?? '[]'),
  }))
}

async function touch(selector) {
  const rect = await page.$eval(selector, (element) => {
    element.scrollIntoView({ block: 'center', inline: 'center' })
    const box = element.getBoundingClientRect()
    return { x: box.x, y: box.y, width: box.width, height: box.height }
  })
  await new Promise((resolve) => setTimeout(resolve, 80))
  const visibleRect = await page.$eval(selector, (element) => {
    const box = element.getBoundingClientRect()
    return { x: box.x, y: box.y, width: box.width, height: box.height }
  })
  const target = visibleRect.width > 0 && visibleRect.height > 0 ? visibleRect : rect
  await page.touchscreen.tap(target.x + target.width / 2, target.y + target.height / 2)
}

try {
  await page.setCacheEnabled(false)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  const response = await page.goto(`${baseUrl}/scripts/web/accessory-placement-e2e-validation.html?run=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 20_000,
  })
  const status = response?.status() ?? 0
  if (!response || status >= 400) throw new Error(`fixture returned HTTP ${status || 'unknown'}`)

  await page.waitForSelector('.pedestal-stage canvas', { timeout: 30_000 })
  await page.waitForSelector('.accessory-editor', { timeout: 30_000 })
  await page.waitForFunction(() => Number(document.querySelector('#accessory-placement-e2e-state')?.getAttribute('data-loaded-count') ?? '0') === 2, { timeout: 30_000 })

  const initial = await state()
  if (initial.instanceCount !== 2 || initial.loadedCount !== 2) {
    throw new Error(`expected two simultaneously loaded accessories, got ${JSON.stringify(initial)}`)
  }

  const first = initial.transforms.find((item) => item.id === initial.selectedId)
  if (!first) throw new Error('selected accessory missing from initial transform set')

  await touch('button[aria-label="Déplacer X positif"]')
  await page.waitForFunction(() => Number(document.querySelector('#accessory-placement-e2e-state')?.getAttribute('data-save-count') ?? '0') >= 1)
  let current = await state()
  let selected = current.transforms.find((item) => item.id === current.selectedId)
  if (!selected || Math.abs(selected.position[0] - (first.position[0] + 0.05)) > 0.0001) {
    throw new Error('touch X translation did not persist the expected local position')
  }

  await touch('button[aria-label="Tourner Z positif"]')
  await page.waitForFunction(() => Number(document.querySelector('#accessory-placement-e2e-state')?.getAttribute('data-save-count') ?? '0') >= 2)
  current = await state()
  selected = current.transforms.find((item) => item.id === current.selectedId)
  if (!selected || selected.rotation[2] === 0) throw new Error('touch Z rotation did not modify the quaternion')

  await touch('button[aria-label="Agrandir l’accessoire"]')
  await page.waitForFunction(() => Number(document.querySelector('#accessory-placement-e2e-state')?.getAttribute('data-save-count') ?? '0') >= 3)
  current = await state()
  selected = current.transforms.find((item) => item.id === current.selectedId)
  if (!selected || Math.abs(selected.scale - 1.05) > 0.001) throw new Error('touch scale control did not persist 1.05x')

  await touch('button[aria-label="Sélectionner Lunettes rondes 2"]')
  await page.waitForFunction(() => document.querySelector('.accessory-editor')?.getAttribute('data-selected-accessory')?.endsWith('0002') ?? false)
  await touch('button[aria-label="Déplacer Y négatif"]')
  await page.waitForFunction(() => Number(document.querySelector('#accessory-placement-e2e-state')?.getAttribute('data-save-count') ?? '0') >= 4)

  current = await state()
  if (JSON.stringify(current.transforms) !== JSON.stringify(current.serverTransforms)) {
    throw new Error('client and simulated server transforms diverged before reload')
  }

  const phoneTargets = await page.$$eval('.accessory-editor button', (buttons) => buttons.every((button) => {
    const rect = button.getBoundingClientRect()
    return rect.width >= 44 && rect.height >= 44
  }))
  if (!phoneTargets) throw new Error('one or more phone placement targets are below 44px')
  await page.screenshot({ path: `${outputDir}/placement-phone.png`, fullPage: true })

  const disposeBeforeReload = current.disposeCount
  await page.evaluate(() => document.querySelector('#simulate-accessory-reload')?.click())
  await page.waitForFunction(() => Number(document.querySelector('#accessory-placement-e2e-state')?.getAttribute('data-reload-count') ?? '0') === 1)
  await page.waitForFunction(() => Number(document.querySelector('#accessory-placement-e2e-state')?.getAttribute('data-loaded-count') ?? '0') === 2, { timeout: 30_000 })

  const afterReload = await state()
  if (JSON.stringify(afterReload.transforms) !== JSON.stringify(afterReload.serverTransforms)) {
    throw new Error('reload did not restore the canonical local transforms exactly')
  }
  if (afterReload.disposeCount <= disposeBeforeReload || afterReload.disposedGeometries <= 0) {
    throw new Error('accessory rehydration did not dispose previous GPU geometry')
  }

  // Keep touch/mobile emulation enabled while widening to tablet. Toggling isMobile/hasTouch
  // makes Puppeteer reload the page and would invalidate the persistence counters we are testing.
  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  const savesBeforeTablet = afterReload.saveCount
  await touch('button[aria-label="Déplacer Z positif"]')
  await page.waitForFunction((expected) => Number(document.querySelector('#accessory-placement-e2e-state')?.getAttribute('data-save-count') ?? '0') > expected, {}, savesBeforeTablet)
  const tablet = await state()
  if (tablet.instanceCount !== 2) throw new Error('tablet precision edit unexpectedly changed instance count')
  await page.screenshot({ path: `${outputDir}/placement-tablet.png`, fullPage: true })

  const disposeBeforeRemove = tablet.disposeCount
  const selectedName = await page.$eval('.accessory-editor-heading h2', (element) => element.textContent?.trim() ?? '')
  await touch(`button[aria-label="Retirer ${selectedName} du caillou"]`)
  await page.waitForFunction(() => Number(document.querySelector('#accessory-placement-e2e-state')?.getAttribute('data-instance-count') ?? '0') === 1)
  await page.waitForFunction((before) => Number(document.querySelector('#accessory-placement-e2e-state')?.getAttribute('data-dispose-count') ?? '0') > before, {}, disposeBeforeRemove)
  const removed = await state()

  const report = {
    status: 'pass',
    simultaneousInstances: initial.instanceCount,
    phoneTouchTranslation: true,
    phoneTouchRotation: true,
    phoneTouchScale: true,
    exactReloadRestore: true,
    tabletDepthTranslation: true,
    instanceRemoval: removed.instanceCount === 1,
    gpuDisposalObserved: removed.disposeCount > disposeBeforeRemove && removed.disposedGeometries > 0,
    saveCount: removed.saveCount,
    disposeCount: removed.disposeCount,
    disposedGeometries: removed.disposedGeometries,
  }

  await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n`, 'utf8')
  console.log('[CAILLOU] accessory placement E2E PASS: 2 GLB → phone touch XYZ/rotation/scale → exact reload → tablet depth → remove → GPU dispose')
} catch (error) {
  await page.screenshot({ path: `${outputDir}/failure.png`, fullPage: true }).catch(() => {})
  await writeFile(`${outputDir}/browser.log`, `${consoleLines.join('\n')}\n${error instanceof Error ? error.stack : String(error)}\n`, 'utf8').catch(() => {})
  throw error
} finally {
  await page.close()
  await browser.close()
}
