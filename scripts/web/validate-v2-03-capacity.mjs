import { mkdir, writeFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'

const baseUrl = process.env.CAILLOU_E2E_BASE_URL ?? 'http://127.0.0.1:4188'
const chromePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
const outputDir = 'build/v2-03-capacity-validation'
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
  { label: 'tablet-1-v2', count: 1, width: 1024, height: 768, mobile: false, touch: true },
  { label: 'tablet-4-v2', count: 4, width: 1024, height: 768, mobile: false, touch: true },
  { label: 'tablet-8-v2', count: 8, width: 1024, height: 768, mobile: false, touch: true },
  { label: 'phone-8-v2', count: 8, width: 390, height: 844, mobile: true, touch: true },
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

function ratio(value, baseline) {
  return value / Math.max(0.001, baseline)
}

async function readState(page) {
  return page.$eval('#v2-03-capacity-state', (element) => ({
    ready: element.getAttribute('data-ready') === 'true',
    count: Number(element.getAttribute('data-count') ?? 0),
    readyCount: Number(element.getAttribute('data-ready-count') ?? 0),
    settledCount: Number(element.getAttribute('data-settled-count') ?? 0),
    settling: element.getAttribute('data-settling') === 'true',
    loadAllMs: Number(element.getAttribute('data-load-all-ms') ?? 0),
    loadDurations: JSON.parse(element.getAttribute('data-load-durations') ?? '{}'),
    selectedIds: JSON.parse(element.getAttribute('data-selected-ids') ?? '[]'),
    triangleTotal: Number(element.getAttribute('data-triangle-total') ?? 0),
    modelBytesTotal: Number(element.getAttribute('data-model-bytes-total') ?? 0),
    gpu: JSON.parse(element.getAttribute('data-gpu') ?? '{}'),
    error: element.getAttribute('data-error') ?? '',
  }))
}

async function measureFrames(page, sampleCount = 60) {
  return page.evaluate(async (count) => {
    const durations = []
    let previous = performance.now()
    for (let index = 0; index < count; index += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve))
      const now = performance.now()
      durations.push(now - previous)
      previous = now
    }
    return durations
  }, sampleCount)
}

async function measureSettlement(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const output = document.querySelector('#v2-03-capacity-state')
    const button = document.querySelector('#start-settlement')
    if (!output || !button) {
      reject(new Error('missing capacity settlement controls'))
      return
    }

    const expected = Number(output.getAttribute('data-count') ?? 0)
    const startedAt = performance.now()
    const frames = []
    let previous = startedAt
    let raf = 0
    const timeout = window.setTimeout(() => {
      cancelAnimationFrame(raf)
      reject(new Error(`capacity settlement timeout (${output.getAttribute('data-settled-count')}/${expected})`))
    }, 7_000)

    const tick = (now) => {
      frames.push(now - previous)
      previous = now
      const settled = Number(output.getAttribute('data-settled-count') ?? 0)
      if (settled >= expected) {
        window.clearTimeout(timeout)
        resolve({ durationMs: performance.now() - startedAt, frames })
        return
      }
      raf = requestAnimationFrame(tick)
    }

    button.click()
    raf = requestAnimationFrame(tick)
  }))
}

const report = {
  status: 'pass',
  environment: {
    renderer: 'GitHub Actions headless Chrome / ANGLE SwiftShader',
    assetPolicy: 'cold HTTP cache; real V2 model.glb + collider.glb through AccessoryModel',
    physicalDeviceLimit: 'thermal behavior and tactile quality cannot be certified in CI',
  },
  thresholds: {
    loadAllMs: 45_000,
    settlementMs: 6_500,
    tablet4IdleFrameGrowthRatio: 2.5,
    tablet8IdleFrameGrowthRatio: 3.5,
    tablet8SettlingFrameGrowthRatio: 4.5,
  },
  scenarios: [],
  capacityDecision: {
    finalCap: 8,
    raiseJustified: false,
    rationale: 'CI must validate the current guard with real V2 assets, but cannot provide device thermals or tactile evidence required to raise it.',
  },
}

try {
  for (const scenario of scenarios) {
    const page = await browser.newPage()
    const consoleLines = []
    page.on('console', (message) => consoleLines.push(`[console:${message.type()}] ${message.text()}`))
    page.on('pageerror', (error) => consoleLines.push(`[pageerror] ${error.message}`))
    page.on('requestfailed', (request) => consoleLines.push(`[requestfailed] ${request.url()} ${request.failure()?.errorText ?? ''}`))

    try {
      await page.setCacheEnabled(false)
      await page.setViewport({
        width: scenario.width,
        height: scenario.height,
        deviceScaleFactor: 1,
        isMobile: scenario.mobile,
        hasTouch: scenario.touch,
      })

      const metricsBefore = await page.metrics()
      const response = await page.goto(`${baseUrl}/scripts/web/v2-03-capacity-validation.html?count=${scenario.count}&run=${Date.now()}`, {
        waitUntil: 'domcontentloaded',
        timeout: 20_000,
      })
      if (!response || response.status() >= 400) throw new Error(`${scenario.label}: fixture HTTP ${response?.status() ?? 'unknown'}`)

      await page.waitForFunction(() => {
        const output = document.querySelector('#v2-03-capacity-state')
        return output?.getAttribute('data-ready') === 'true' || Boolean(output?.getAttribute('data-error'))
      }, { timeout: 45_000 })

      await measureFrames(page, 24)
      const ready = await readState(page)
      if (ready.error) throw new Error(`${scenario.label}: ${ready.error}`)
      if (!ready.ready || ready.readyCount !== scenario.count) throw new Error(`${scenario.label}: ready ${ready.readyCount}/${scenario.count}`)
      if (ready.selectedIds.length !== scenario.count) throw new Error(`${scenario.label}: wrong V2 selection ${ready.selectedIds.length}/${scenario.count}`)
      if (!Number.isFinite(ready.loadAllMs) || ready.loadAllMs <= 0 || ready.loadAllMs > report.thresholds.loadAllMs) {
        throw new Error(`${scenario.label}: loadAllMs ${ready.loadAllMs} outside guard`)
      }
      if (!Number.isFinite(ready.gpu.geometries) || !Number.isFinite(ready.gpu.textures)) {
        throw new Error(`${scenario.label}: GPU metrics unavailable`)
      }

      const idleFrames = summarizeFrames(await measureFrames(page, 60))
      const gpuBeforeSettlement = (await readState(page)).gpu
      const settlement = await measureSettlement(page)
      if (settlement.durationMs > report.thresholds.settlementMs) {
        throw new Error(`${scenario.label}: settlement ${settlement.durationMs.toFixed(1)}ms exceeds ${report.thresholds.settlementMs}ms`)
      }
      const settlingFrames = summarizeFrames(settlement.frames)
      await measureFrames(page, 24)
      const settled = await readState(page)
      if (settled.settledCount !== scenario.count) throw new Error(`${scenario.label}: settled ${settled.settledCount}/${scenario.count}`)

      let soak = null
      if (scenario.count === 8) {
        const gpuBefore = settled.gpu
        const frames = summarizeFrames(await measureFrames(page, 120))
        const gpuAfter = (await readState(page)).gpu
        const stable = gpuAfter.geometries <= gpuBefore.geometries + 1 && gpuAfter.textures <= gpuBefore.textures + 1
        if (!stable) throw new Error(`${scenario.label}: active GPU memory grew during soak ${JSON.stringify({ gpuBefore, gpuAfter })}`)
        soak = { frames, gpuBefore, gpuAfter, stable }
        await page.screenshot({ path: `${outputDir}/${scenario.label}.png`, fullPage: false })
      }

      const metricsAfter = await page.metrics()
      const severeConsole = consoleLines.filter((line) => line.startsWith('[pageerror]') || line.includes('WebGL context lost') || line.includes('Unhandled'))
      if (severeConsole.length > 0) throw new Error(`${scenario.label}: browser errors ${severeConsole.join(' | ')}`)

      const metrics = {
        label: scenario.label,
        objectCount: scenario.count,
        viewport: `${scenario.width}x${scenario.height}`,
        selectedIds: ready.selectedIds,
        triangleTotal: ready.triangleTotal,
        modelBytesTotal: ready.modelBytesTotal,
        loadAllMs: ready.loadAllMs,
        individualLoadMs: ready.loadDurations,
        idleFrames,
        settlingFrames,
        rapierSettlementMs: settlement.durationMs,
        gpuReady: gpuBeforeSettlement,
        gpuSettled: settled.gpu,
        soak,
        mainThreadTaskMs: Math.max(0, (metricsAfter.TaskDuration - metricsBefore.TaskDuration) * 1000),
        scriptDurationMs: Math.max(0, (metricsAfter.ScriptDuration - metricsBefore.ScriptDuration) * 1000),
        jsHeapUsedBytes: metricsAfter.JSHeapUsedSize,
      }
      report.scenarios.push(metrics)
      await writeFile(`${outputDir}/${scenario.label}.log`, `${consoleLines.join('\n')}\n`, 'utf8')
      console.log(`[CAILLOU] V2-03 capacity ${scenario.label} PASS: load=${ready.loadAllMs.toFixed(1)}ms idle-p95=${idleFrames.p95Ms.toFixed(1)}ms settling-p95=${settlingFrames.p95Ms.toFixed(1)}ms settlement=${settlement.durationMs.toFixed(1)}ms gpu=${settled.gpu.geometries}g/${settled.gpu.textures}t`)
    } finally {
      await page.close()
    }
  }

  const tablet = Object.fromEntries(report.scenarios.filter((entry) => entry.label.startsWith('tablet-')).map((entry) => [entry.objectCount, entry]))
  const idle4Over1 = ratio(tablet[4].idleFrames.averageMs, tablet[1].idleFrames.averageMs)
  const idle8Over1 = ratio(tablet[8].idleFrames.averageMs, tablet[1].idleFrames.averageMs)
  const settling8Over1 = ratio(tablet[8].settlingFrames.averageMs, tablet[1].settlingFrames.averageMs)
  const load8Over1 = ratio(tablet[8].loadAllMs, tablet[1].loadAllMs)

  report.scaling = {
    idleFrameAverageMs: { 1: tablet[1].idleFrames.averageMs, 4: tablet[4].idleFrames.averageMs, 8: tablet[8].idleFrames.averageMs },
    settlingFrameAverageMs: { 1: tablet[1].settlingFrames.averageMs, 4: tablet[4].settlingFrames.averageMs, 8: tablet[8].settlingFrames.averageMs },
    loadAllMs: { 1: tablet[1].loadAllMs, 4: tablet[4].loadAllMs, 8: tablet[8].loadAllMs },
    relativeGrowth: { idle4Over1, idle8Over1, settling8Over1, load8Over1 },
  }

  if (idle4Over1 > report.thresholds.tablet4IdleFrameGrowthRatio) {
    throw new Error(`V2 tablet 1→4 idle frame growth ${idle4Over1.toFixed(2)}x exceeds ${report.thresholds.tablet4IdleFrameGrowthRatio}x`)
  }
  if (idle8Over1 > report.thresholds.tablet8IdleFrameGrowthRatio) {
    throw new Error(`V2 tablet 1→8 idle frame growth ${idle8Over1.toFixed(2)}x exceeds ${report.thresholds.tablet8IdleFrameGrowthRatio}x`)
  }
  if (settling8Over1 > report.thresholds.tablet8SettlingFrameGrowthRatio) {
    throw new Error(`V2 tablet 1→8 settling frame growth ${settling8Over1.toFixed(2)}x exceeds ${report.thresholds.tablet8SettlingFrameGrowthRatio}x`)
  }

  await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`[CAILLOU] V2-03 Lot F capacity PASS: real V2 1/4/8 + phone-8; final cap remains 8; idle growth 4/1=${idle4Over1.toFixed(2)}x 8/1=${idle8Over1.toFixed(2)}x; settling 8/1=${settling8Over1.toFixed(2)}x; load 8/1=${load8Over1.toFixed(2)}x`)
} catch (error) {
  report.status = 'fail'
  report.error = error instanceof Error ? error.stack : String(error)
  await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8').catch(() => {})
  throw error
} finally {
  await browser.close()
}
