import { mkdir, writeFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'

const baseUrl = process.env.CAILLOU_E2E_BASE_URL ?? 'http://127.0.0.1:4185'
const chromePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
const outputDir = 'build/placement-performance-validation'
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

const scenarios = [
  { label: 'tablet-1', count: 1, width: 1024, height: 768, mobile: false, touch: true },
  { label: 'tablet-4', count: 4, width: 1024, height: 768, mobile: false, touch: true },
  { label: 'tablet-8', count: 8, width: 1024, height: 768, mobile: false, touch: true },
  { label: 'phone-8', count: 8, width: 390, height: 844, mobile: true, touch: true },
  { label: 'desktop-8', count: 8, width: 1440, height: 900, mobile: false, touch: false },
]

function percentile(values, ratio) {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.max(0, Math.ceil(sorted.length * ratio) - 1)] ?? 0
}

function summarizeFrames(values) {
  return {
    samples: values.length,
    averageMs: values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length),
    p95Ms: percentile(values, 0.95),
    maxMs: Math.max(0, ...values),
    over33ms: values.filter((value) => value > 33.34).length,
    over50ms: values.filter((value) => value > 50).length,
  }
}

function assertFinite(label, value) {
  if (!Number.isFinite(value)) throw new Error(`${label}: non-finite metric ${value}`)
}

async function readState(page) {
  return page.$eval('#placement-performance-e2e-state', (element) => ({
    ready: element.getAttribute('data-ready') === 'true',
    count: Number(element.getAttribute('data-count') ?? 0),
    mode: element.getAttribute('data-mode') ?? '',
    target: element.getAttribute('data-target') ?? '',
    settled: element.getAttribute('data-settled') === 'true',
    readyAccessories: Number(element.getAttribute('data-ready-accessories') ?? 0),
    rockPosition: JSON.parse(element.getAttribute('data-rock-position') ?? 'null'),
    sessionRockPosition: JSON.parse(element.getAttribute('data-session-rock-position') ?? 'null'),
    selectedWorldPosition: JSON.parse(element.getAttribute('data-selected-world-position') ?? 'null'),
    collisionBenchmark: JSON.parse(element.getAttribute('data-collision-benchmark') ?? 'null'),
    error: element.getAttribute('data-error') ?? '',
  }))
}

async function canvasRect(page) {
  return page.$eval('.showroom-canvas canvas', (canvas) => {
    const rect = canvas.getBoundingClientRect()
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
  })
}

async function measureDirectSelection(page) {
  const rect = await canvasRect(page)
  const candidates = [
    [0.5, 0.5],
    [0.5, 0.44],
    [0.44, 0.5],
    [0.56, 0.5],
    [0.5, 0.56],
  ]

  for (const [rx, ry] of candidates) {
    await page.evaluate(() => {
      const output = document.querySelector('#placement-performance-e2e-state')
      const canvas = document.querySelector('.showroom-canvas canvas')
      window.__CAILLOU_SELECTION_METRIC__ = { startedAt: null, durationMs: null }
      if (!output || !canvas) return
      const metric = window.__CAILLOU_SELECTION_METRIC__
      canvas.addEventListener('pointerdown', () => {
        metric.startedAt = performance.now()
      }, { capture: true, once: true })
      const observer = new MutationObserver(() => {
        const target = output.getAttribute('data-target') ?? ''
        if (target && metric.startedAt !== null && metric.durationMs === null) {
          metric.durationMs = performance.now() - metric.startedAt
          observer.disconnect()
        }
      })
      observer.observe(output, { attributes: true, attributeFilter: ['data-target'] })
    })

    await page.mouse.click(rect.left + rect.width * rx, rect.top + rect.height * ry)
    const selected = await page.waitForFunction(
      () => window.__CAILLOU_SELECTION_METRIC__?.durationMs != null,
      { timeout: 1_800 },
    ).then(() => true).catch(() => false)
    if (selected) {
      return page.evaluate(() => window.__CAILLOU_SELECTION_METRIC__.durationMs)
    }
  }

  throw new Error('direct raycast selection did not resolve on the visible rock/accessory region')
}

async function measureGestureLatency(page) {
  await page.$eval('#select-first-accessory', (button) => button.click())
  await page.waitForFunction(() => {
    const output = document.querySelector('#placement-performance-e2e-state')
    const target = output?.getAttribute('data-target') ?? ''
    return target.startsWith('10f10000-')
  }, { timeout: 5_000 })

  const before = await page.$eval('#placement-performance-e2e-state', (element) => element.getAttribute('data-selected-world-position'))
  const rect = await canvasRect(page)
  const startX = rect.left + rect.width * 0.16
  const startY = rect.top + rect.height * 0.18

  // Move the automation pointer into place before arming the metric. Otherwise
  // Puppeteer's positioning move is incorrectly counted as gesture latency.
  await page.mouse.move(startX, startY)

  await page.evaluate((baseline) => {
    const output = document.querySelector('#placement-performance-e2e-state')
    const canvas = document.querySelector('.showroom-canvas canvas')
    window.__CAILLOU_GESTURE_METRIC__ = { startedAt: null, durationMs: null, baseline }
    if (!output || !canvas) return
    const metric = window.__CAILLOU_GESTURE_METRIC__
    canvas.addEventListener('pointermove', () => {
      if (metric.startedAt === null) metric.startedAt = performance.now()
    }, { capture: true })
    const observer = new MutationObserver(() => {
      const value = output.getAttribute('data-selected-world-position')
      if (value !== metric.baseline && metric.startedAt !== null && metric.durationMs === null) {
        metric.durationMs = performance.now() - metric.startedAt
        observer.disconnect()
      }
    })
    observer.observe(output, { attributes: true, attributeFilter: ['data-selected-world-position'] })
  }, before)

  await page.mouse.down()
  await page.mouse.move(startX + 24, startY - 12)
  await page.mouse.up()
  await page.waitForFunction(() => window.__CAILLOU_GESTURE_METRIC__?.durationMs != null, { timeout: 5_000 })
  return page.evaluate(() => window.__CAILLOU_GESTURE_METRIC__.durationMs)
}

async function measureInteractiveFrames(page) {
  return page.evaluate(async () => {
    const canvas = document.querySelector('.showroom-canvas canvas')
    if (!canvas) throw new Error('missing performance canvas')
    const rect = canvas.getBoundingClientRect()
    const pointerId = 881
    const startX = rect.left + rect.width * 0.16
    const startY = rect.top + rect.height * 0.18
    const init = { pointerId, pointerType: 'touch', bubbles: true, cancelable: true }
    const dispatch = (type, x, y, buttons) => {
      canvas.dispatchEvent(new PointerEvent(type, { ...init, clientX: x, clientY: y, buttons }))
    }

    dispatch('pointerdown', startX, startY, 1)
    const frameDurations = []
    let previous = performance.now()
    for (let step = 0; step < 90; step += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve))
      const now = performance.now()
      frameDurations.push(now - previous)
      previous = now
      const x = startX + Math.sin(step / 6) * 3
      const y = startY + Math.cos(step / 7) * 2
      dispatch('pointermove', x, y, 1)
    }
    dispatch('pointerup', startX, startY, 0)
    return frameDurations
  })
}

async function measureSettlement(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const output = document.querySelector('#placement-performance-e2e-state')
    const button = document.querySelector('#finish-placement')
    if (!output || !button) {
      reject(new Error('missing settlement controls'))
      return
    }
    const startedAt = performance.now()
    const timeout = window.setTimeout(() => {
      observer.disconnect()
      reject(new Error('settlement timeout'))
    }, 7_000)
    const observer = new MutationObserver(() => {
      if (output.getAttribute('data-mode') === 'orbit' && output.getAttribute('data-settled') === 'true') {
        window.clearTimeout(timeout)
        observer.disconnect()
        resolve(performance.now() - startedAt)
      }
    })
    observer.observe(output, { attributes: true, attributeFilter: ['data-mode', 'data-settled'] })
    button.click()
  }))
}

const report = {
  status: 'pass',
  thresholds: {
    collisionP95Ms: 25,
    selectionMs: 500,
    gestureMs: 300,
    frameAverageMs: 60,
    frameP95Ms: 120,
    settlementMs: 6_000,
  },
  scenarios: [],
}

try {
  for (const scenario of scenarios) {
    const page = await browser.newPage()
    const consoleLines = []
    page.on('console', (message) => consoleLines.push(`[console:${message.type()}] ${message.text()}`))
    page.on('pageerror', (error) => consoleLines.push(`[pageerror] ${error.message}`))
    page.on('requestfailed', (request) => consoleLines.push(`[requestfailed] ${request.url()} ${request.failure()?.errorText ?? ''}`))

    try {
      await page.setViewport({
        width: scenario.width,
        height: scenario.height,
        deviceScaleFactor: 1,
        isMobile: scenario.mobile,
        hasTouch: scenario.touch,
      })
      const response = await page.goto(`${baseUrl}/scripts/web/placement-performance-e2e-validation.html?count=${scenario.count}&run=${Date.now()}`, {
        waitUntil: 'domcontentloaded',
        timeout: 20_000,
      })
      if (!response || response.status() >= 400) throw new Error(`${scenario.label}: fixture HTTP ${response?.status() ?? 'unknown'}`)

      await page.waitForFunction(() => {
        const output = document.querySelector('#placement-performance-e2e-state')
        return output?.getAttribute('data-ready') === 'true'
      }, { timeout: 45_000 })

      const initial = await readState(page)
      if (initial.error) throw new Error(`${scenario.label}: ${initial.error}`)
      if (initial.readyAccessories !== scenario.count) {
        throw new Error(`${scenario.label}: loaded ${initial.readyAccessories}/${scenario.count} accessories`)
      }

      const browserBefore = await page.metrics()
      const selectionMs = await measureDirectSelection(page)
      const gestureMs = await measureGestureLatency(page)
      const frameDurations = await measureInteractiveFrames(page)
      const frame = summarizeFrames(frameDurations)

      if (scenario.count === 8) {
        await page.screenshot({ path: `${outputDir}/${scenario.label}.png`, fullPage: false })
      }

      const settlementMs = await measureSettlement(page)
      const finalState = await readState(page)
      const browserAfter = await page.metrics()
      const severeConsole = consoleLines.filter((line) => line.startsWith('[pageerror]') || line.includes('WebGL context lost') || line.includes('Unhandled'))
      if (severeConsole.length > 0) throw new Error(`${scenario.label}: browser errors ${severeConsole.join(' | ')}`)
      if (!finalState.settled || finalState.mode !== 'orbit') throw new Error(`${scenario.label}: Rapier settlement did not complete`)

      const collision = initial.collisionBenchmark
      if (!collision) throw new Error(`${scenario.label}: collision benchmark missing`)
      for (const motion of ['translation', 'rotation', 'scale']) {
        assertFinite(`${scenario.label} ${motion} p95`, collision[motion].p95Ms)
        if (collision[motion].p95Ms > report.thresholds.collisionP95Ms) {
          throw new Error(`${scenario.label}: ${motion} collision p95 ${collision[motion].p95Ms.toFixed(3)}ms exceeds ${report.thresholds.collisionP95Ms}ms`)
        }
      }
      assertFinite(`${scenario.label} selection`, selectionMs)
      assertFinite(`${scenario.label} gesture`, gestureMs)
      assertFinite(`${scenario.label} settlement`, settlementMs)
      if (selectionMs > report.thresholds.selectionMs) throw new Error(`${scenario.label}: raycast selection ${selectionMs.toFixed(1)}ms too slow`)
      if (gestureMs > report.thresholds.gestureMs) throw new Error(`${scenario.label}: gesture publish ${gestureMs.toFixed(1)}ms too slow`)
      if (frame.averageMs > report.thresholds.frameAverageMs || frame.p95Ms > report.thresholds.frameP95Ms) {
        throw new Error(`${scenario.label}: frame budget avg=${frame.averageMs.toFixed(1)}ms p95=${frame.p95Ms.toFixed(1)}ms`)
      }
      if (settlementMs > report.thresholds.settlementMs) throw new Error(`${scenario.label}: settlement ${settlementMs.toFixed(1)}ms too slow`)

      const metrics = {
        label: scenario.label,
        objectCount: scenario.count,
        viewport: `${scenario.width}x${scenario.height}`,
        selectionRaycastMs: selectionMs,
        gesturePublishMs: gestureMs,
        interactiveFrames: frame,
        collisionQueries: collision,
        rapierSettlementMs: settlementMs,
        mainThreadTaskMs: Math.max(0, (browserAfter.TaskDuration - browserBefore.TaskDuration) * 1000),
        scriptDurationMs: Math.max(0, (browserAfter.ScriptDuration - browserBefore.ScriptDuration) * 1000),
        jsHeapUsedBeforeBytes: browserBefore.JSHeapUsedSize,
        jsHeapUsedAfterBytes: browserAfter.JSHeapUsedSize,
        jsHeapDeltaBytes: browserAfter.JSHeapUsedSize - browserBefore.JSHeapUsedSize,
      }
      report.scenarios.push(metrics)
      await writeFile(`${outputDir}/${scenario.label}.log`, `${consoleLines.join('\n')}\n`, 'utf8')
      console.log(`[CAILLOU] Lot F ${scenario.label} PASS: raycast=${selectionMs.toFixed(1)}ms gesture=${gestureMs.toFixed(1)}ms frame-p95=${frame.p95Ms.toFixed(1)}ms settlement=${settlementMs.toFixed(1)}ms`)
    } finally {
      await page.close()
    }
  }

  const tablet = Object.fromEntries(report.scenarios.filter((entry) => entry.label.startsWith('tablet-')).map((entry) => [entry.objectCount, entry]))
  report.scaling = {
    collisionTranslationAverageMs: {
      1: tablet[1].collisionQueries.translation.averageMs,
      4: tablet[4].collisionQueries.translation.averageMs,
      8: tablet[8].collisionQueries.translation.averageMs,
    },
    frameAverageMs: {
      1: tablet[1].interactiveFrames.averageMs,
      4: tablet[4].interactiveFrames.averageMs,
      8: tablet[8].interactiveFrames.averageMs,
    },
    gesturePublishMs: {
      1: tablet[1].gesturePublishMs,
      4: tablet[4].gesturePublishMs,
      8: tablet[8].gesturePublishMs,
    },
  }

  await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log('[CAILLOU] Placement Lot F performance PASS: 1 / 4 / 8 objects + phone/tablet/desktop')
} catch (error) {
  report.status = 'fail'
  report.error = error instanceof Error ? error.stack : String(error)
  await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8').catch(() => {})
  throw error
} finally {
  await browser.close()
}
