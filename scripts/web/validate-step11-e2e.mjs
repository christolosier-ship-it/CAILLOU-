import fs from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const outDir = path.join(process.cwd(), 'build', 'step11-validation')
await fs.mkdir(outDir, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader'],
})

async function runViewport(width, height, label) {
  const page = await browser.newPage()
  await page.setViewport({ width, height, deviceScaleFactor: 1 })

  try {
    await page.goto('http://127.0.0.1:4175/scripts/web/step11-e2e-validation.html', { waitUntil: 'networkidle0' })

    await page.waitForFunction(() => {
      const button = document.querySelector('.pedestal-actions button[title="Jeter"]')
      return button instanceof HTMLButtonElement && !button.disabled
    })

    await page.click('.pedestal-utility[aria-label="Bio et statistiques"]')
    await page.waitForSelector('.bio-dialog')

    const nativeBioFired = await page.$eval('#native-bio-state', (node) => node.getAttribute('data-fired'))
    if (nativeBioFired !== 'false') throw new Error(`${label}: legacy Bio handler was not intercepted`)

    const bioText = await page.$eval('.bio-dialog', (node) => node.textContent ?? '')
    for (const expected of [
      'Types d’accessoires possédés',
      'Instances actuellement placées',
      'Déblocages permanents',
      'Lithons gagnés',
      'Lithons dépensés',
      'Non scientifiques',
    ]) {
      if (!bioText.includes(expected)) throw new Error(`${label}: Bio missing ${expected}`)
    }
    if (bioText.toLowerCase().includes('temps d’observation')) {
      throw new Error(`${label}: unreliable observation time is displayed`)
    }

    await page.click('.bio-dialog button[aria-label="Fermer Bio / Stats"]')
    await page.waitForSelector('.bio-dialog', { hidden: true })

    await page.click('#fixture-mode')
    await page.waitForFunction(() => document.querySelector('.step11-pedestal-host')?.getAttribute('data-step11-blocked') === 'true')
    const blocked = await page.evaluate(() => ({
      bio: (document.querySelector('.pedestal-utility[aria-label="Bio et statistiques"]'))?.disabled,
      discard: (document.querySelector('.pedestal-actions button[title="Jeter"]'))?.disabled,
    }))
    if (!blocked.bio || !blocked.discard) throw new Error(`${label}: Step 11 controls remain active during Placement`)

    await page.click('#fixture-mode')
    await page.waitForFunction(() => {
      const host = document.querySelector('.step11-pedestal-host')
      const discard = document.querySelector('.pedestal-actions button[title="Jeter"]')
      return host?.getAttribute('data-step11-blocked') === 'false'
        && discard instanceof HTMLButtonElement
        && !discard.disabled
    })

    await page.click('.pedestal-actions button[title="Jeter"]')
    await page.waitForSelector('.discard-dialog')
    const discardText = await page.$eval('.discard-dialog', (node) => node.textContent ?? '')
    if (!discardText.includes('seront déséquipés')) throw new Error(`${label}: discard rule is not explicit`)
    if (!discardText.includes('Lithons') || !discardText.includes('autorisations permanentes')) {
      throw new Error(`${label}: account preservation is not explicit`)
    }

    await page.click('.discard-confirm')
    await page.waitForSelector('.empty-rock-shell')
    if (await page.$('.pedestal-stage')) throw new Error(`${label}: rock stage remained visible after confirmation`)

    await page.waitForFunction(() => (document.querySelector('.empty-rock-shell')?.textContent ?? '').includes('Réessayer la confirmation'))
    await page.click('.empty-rock-error button')
    await page.waitForFunction(() => (document.querySelector('.empty-rock-shell')?.textContent ?? '').includes('Adopter un nouveau caillou'))

    const state = await page.$eval('#step11-e2e-state', (node) => ({
      active: node.getAttribute('data-active'),
      serverActive: node.getAttribute('data-server-active'),
      eventKeys: (node.getAttribute('data-event-keys') ?? '').split(',').filter(Boolean),
    }))

    if (state.active !== 'false') throw new Error(`${label}: active rock resurrected after discard`)
    if (state.serverActive !== 'false') throw new Error(`${label}: server fixture still has an active rock`)
    if (state.eventKeys.length !== 2 || state.eventKeys[0] !== state.eventKeys[1]) {
      throw new Error(`${label}: discard retry did not reuse the same event key`)
    }

    await page.click('.empty-rock-primary')
    await page.waitForFunction(() => document.querySelector('#step11-e2e-state')?.getAttribute('data-adopt-requested') === 'true')
    await page.screenshot({ path: path.join(outDir, `${label}.png`), fullPage: true })

    return {
      label,
      ok: true,
      legacyBioIntercepted: true,
      modeExclusivity: true,
      eventKeyReused: true,
      adoptionCta: true,
    }
  } finally {
    await page.close()
  }
}

try {
  const phone = await runViewport(390, 844, 'phone')
  const tablet = await runViewport(1024, 768, 'tablet')
  const report = {
    bioReliableSources: true,
    ownedVsEquippedDistinct: true,
    editorialStatsLabelled: true,
    unreliableObservationOmitted: true,
    discardImmediate: true,
    discardRetryIdempotent: true,
    emptyStateAfterDiscard: true,
    phone,
    tablet,
  }
  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally {
  await browser.close()
}
