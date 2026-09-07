import { mkdir, writeFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'
const base = process.env.CAILLOU_E2E_BASE_URL ?? 'http://127.0.0.1:4192'
const output = 'build/v2-05-paint'
await mkdir(output, { recursive: true })
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', headless: true,
  args: ['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader-webgl'] })
const page = await browser.newPage(); const errors = []; const samples = []
page.on('pageerror', (e) => errors.push(e.message))
const attr = (name) => page.$eval('#paint-state', (e,n) => e.getAttribute(`data-${n}`), name)
const frames = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
const probe = () => page.evaluate(() => window.__paintProbe())
async function ready() { await page.waitForFunction(() => document.querySelector('#paint-state')?.getAttribute('data-load') === 'ready' && document.querySelector('#paint-state')?.getAttribute('data-ready') === 'true' && window.__paintProbe?.().materials.length > 0, { timeout: 30000 }); await frames() }
async function choose(label, color) { await page.click(`button[aria-label="${label}"]`); await page.waitForFunction((c) => document.querySelector('#paint-state')?.getAttribute('data-color') === c, {}, color); await frames() }
async function natural() { await page.click('.paint-natural'); await page.waitForFunction(() => document.querySelector('#paint-state')?.getAttribute('data-mode') === 'natural'); await frames() }
async function apply() { await page.click('.paint-apply'); await page.waitForFunction(() => document.querySelector('#paint-state')?.getAttribute('data-dirty') === 'false' && document.querySelector('#paint-state')?.getAttribute('data-pending') === 'false'); await frames() }
try {
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })
  await page.goto(`${base}/scripts/web/v2-05-paint-validation.html`, { waitUntil: 'domcontentloaded' }); await ready()
  if (await attr('unlocked') !== 'false') throw new Error('Paint unexpectedly unlocked')
  const original = await probe()
  await page.screenshot({ path: `${output}/locked-mobile.png`, fullPage: true })
  await page.click('.paint-locked button')
  await page.click('[data-feature-id="rock_paint"] button')
  await page.waitForFunction(() => document.querySelector('[data-feature-id="rock_paint"] button')?.textContent === 'Acquise pour ce caillou')
  if (await page.evaluate(() => JSON.parse(localStorage.getItem('paint-server')).balance) !== 750) throw new Error('Incorrect purchase debit')
  await page.click('[aria-label="Fermer la Boutique"]'); await page.click('#open-paint')
  await choose('Ocre','#a66f3f')
  if (await attr('canonical') !== 'natural' || await attr('saves') !== '0') throw new Error('Preview persisted without applying')
  await page.click('.paint-panel footer button:first-child')
  await page.waitForFunction(() => document.querySelector('#paint-state')?.getAttribute('data-mode') === 'natural'); await frames()
  if ((await probe()).materials[0].id !== original.materials[0].id) throw new Error('Cancel did not restore original material')
  await page.click('#open-paint'); await choose('Bleu ardoise','#476b86')
  await page.click('.paint-finishes button:nth-child(2)'); await frames()
  await page.screenshot({ path: `${output}/preview-mobile.png`, fullPage: true })
  await apply()
  await page.reload({ waitUntil: 'domcontentloaded' }); await ready()
  if (await attr('color') !== '#476b86' || await attr('finish') !== 'satin') throw new Error('Confirmed appearance lost on reload')
  await page.setOfflineMode(true); await page.waitForFunction(() => document.querySelector('#paint-state')?.getAttribute('data-online') === 'false')
  await choose('Ocre','#a66f3f')
  if (!await page.$eval('.paint-apply', (e) => e.disabled)) throw new Error('Offline save enabled')
  await page.click('.paint-panel footer button:first-child'); await page.click('#open-paint')
  if (await attr('color') !== '#476b86') throw new Error('Offline cancel lost confirmed paint')
  await page.setOfflineMode(false); await ready()
  // A committed save with a lost response is acknowledged once on background reconciliation.
  await choose('Mousse','#66705c')
  const before = Number(await attr('saves'))
  await page.evaluate(() => sessionStorage.setItem('paint-fail-once','1'))
  await page.click('.paint-apply')
  await page.waitForSelector('.paint-error button')
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('caillou:server-reconciled')))
  await page.waitForFunction(() => !document.querySelector('.paint-error') && document.querySelector('#paint-state')?.getAttribute('data-dirty') === 'false')
  if (Number(await attr('saves')) !== before + 1) throw new Error('Reconciliation duplicated save')
  await natural(); await apply()
  await page.reload({ waitUntil: 'domcontentloaded' }); await ready()
  if (await attr('mode') !== 'natural' || !(await probe()).materials[0].map) throw new Error('Natural reset not persisted/restored')
  await page.setViewport({ width: 1024, height: 900, deviceScaleFactor: 1 })
  // Real 20 GLBs: exact original material restoration; stable body/collider; bounded resources.
  for (let i = 1; i <= 20; i++) {
    const id = `rock-${String(i).padStart(3,'0')}`
    await page.select('#specimen', id); await ready(); await natural()
    const baseline = await probe()
    let paintedId
    for (let cycle = 0; cycle < 3; cycle++) {
      await choose('Ocre','#a66f3f')
      const painted = await probe()
      if (painted.object !== baseline.object || painted.collider !== baseline.collider) throw new Error(`Rebuilt rock/collider: ${id}`)
      if (painted.materials[0].map || painted.materials[0].color !== 'a66f3f') throw new Error(`Paint override absent: ${id}`)
      if (paintedId && paintedId !== painted.materials[0].id) throw new Error(`Material churn: ${id}`)
      paintedId = painted.materials[0].id
      if (painted.textures > baseline.textures + 1 || painted.geometries !== baseline.geometries) throw new Error(`Resource growth: ${id}`)
      if (cycle === 2 && [1,8,16,20].includes(i)) await page.screenshot({ path: `${output}/${id}-painted.png` })
      await natural()
      const restored = await probe()
      if (restored.materials[0].id !== baseline.materials[0].id || !restored.materials[0].map || !restored.dust) throw new Error(`Natural/dust not restored: ${id}`)
      samples.push({ id, cycle, textures: restored.textures, geometries: restored.geometries, materials: restored.materials.length, programs: restored.programs })
    }
  }
  if (Math.max(...samples.map((s) => s.textures)) - Math.min(...samples.map((s) => s.textures)) > 2) throw new Error('Cross-rock texture leak')
  await choose('Rose quartz','#bd9190'); await apply()
  await page.click('[aria-label="Fermer la peinture"]')
  await page.click('#drop-rock')
  await page.waitForFunction(() => document.querySelector('#paint-state')?.getAttribute('data-settling') === 'false', { timeout: 15000 })
  const y = Number(await attr('y'))
  if (y < -.1 || y > 1) throw new Error(`Painted rock crossed floor: ${y}`)
  await page.click('#open-paint')
  await page.screenshot({ path: `${output}/confirmed-tablet.png`, fullPage: true })
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error('Horizontal overflow')
  const targets = await page.$$eval('.paint-panel button', (buttons) => buttons.map((b) => ({ label: b.textContent || b.getAttribute('aria-label'), width: b.getBoundingClientRect().width, height: b.getBoundingClientRect().height })))
  if (targets.some((t) => t.width < 43 || t.height < 43)) throw new Error('Touch target too small')
  await page.click('#next-rock'); await ready()
  if (await attr('unlocked') !== 'false' || await attr('mode') !== 'natural') throw new Error('New rock inherited painting')
  if (errors.length) throw new Error(errors.join('\n'))
  await writeFile(`${output}/report.json`, JSON.stringify({ status: 'PASS', scenarios: ['locked-shop-purchase','local-preview-cancel','confirmed-reload','natural-reset','offline-reconnect','background-retry','20-real-rocks-60-cycles','stable-materials-collider','dust-compatible','physical-settlement','new-rock-locked'], samples, targets }, null, 2))
  console.log('PASS V2-05 paint: entitlement, draft, persistence, offline, 20 rocks, 60 material cycles, dust and physics')
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {})
  await writeFile(`${output}/failure.json`, JSON.stringify({ error: String(error), errors, samples }, null, 2)); throw error
} finally { await browser.close() }
