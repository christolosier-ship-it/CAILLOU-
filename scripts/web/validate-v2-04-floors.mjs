import { mkdir, writeFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'
const base=process.env.CAILLOU_E2E_BASE_URL??'http://127.0.0.1:4190'
const output='build/v2-04-floors'
await mkdir(output,{recursive:true})
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH??'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader-webgl']})
const page=await browser.newPage();const errors=[];const samples=[]
page.on('pageerror',(error)=>errors.push(error.message))
const ids=['moquette','parquet-chene','beton-cire','terre','carrelage','herbe','marbre','neige']
const button=(id)=>`.floor-card[data-floor-id="${id}"] button`
async function ready(){await page.waitForFunction(()=>document.querySelectorAll('.floor-card').length===9 && !document.querySelector('.floor-card[data-floor-id="moquette"] button')?.textContent.includes('Confirmation'),{timeout:20000})}
async function select(id){
  await page.waitForFunction((s)=>!document.querySelector(s)?.disabled,{timeout:15000},button(id))
  await page.click(button(id))
  await page.waitForFunction((id)=>document.querySelector('#floor-state')?.getAttribute('data-selected')===id && document.querySelector('#floor-state')?.getAttribute('data-pending')==='false',{},id)
  await page.waitForFunction(()=>window.__floorProbe?.().status==='ready',{timeout:15000})
}
try{
  await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1})
  await page.goto(`${base}/scripts/web/v2-04-floors-validation.html`,{waitUntil:'networkidle0'})
  await ready()
  await page.screenshot({path:`${output}/boutique-mobile.png`,fullPage:true})
  // Lost purchase confirmation: retry the identical operation and debit once.
  await page.evaluate(()=>sessionStorage.setItem('floor-fail-once','1'))
  await page.click(button('moquette'))
  await page.waitForFunction(()=>document.body.textContent.includes('Réessayer la même opération'))
  await page.click('.floor-notice button')
  await page.waitForFunction(()=>document.querySelector('.floor-card[data-floor-id="moquette"] button')?.textContent==='Sélectionner')
  if(await page.$eval('#floor-state',e=>e.getAttribute('data-purchases'))!=='1')throw new Error('Duplicate debit after retry')
  await select('moquette')
  await page.reload({waitUntil:'networkidle0'});await ready()
  if(await page.$eval('#floor-state',e=>e.getAttribute('data-selected'))!=='moquette')throw new Error('Selection lost on reload')
  await page.setOfflineMode(true)
  await page.waitForFunction(()=>document.querySelector('#floor-state')?.getAttribute('data-online')==='false')
  if(await page.$eval(button('parquet-chene'),e=>e.disabled)!==true)throw new Error('Offline purchase enabled')
  if(await page.$eval('#floor-state',e=>e.getAttribute('data-selected'))!=='moquette')throw new Error('Offline selection lost')
  await page.setOfflineMode(false)
  await page.waitForFunction((s)=>!document.querySelector(s)?.disabled,{},button('parquet-chene'))
  for(const id of ids.slice(1)){
    await page.click(button(id))
    await page.waitForFunction((s)=>document.querySelector(s)?.textContent==='Sélectionner' && !document.querySelector(s)?.disabled,{},button(id))
  }
  const baseline=await page.evaluate(()=>window.__floorProbe())
  for(let cycle=0;cycle<3;cycle++)for(const id of ids){
    if(await page.$eval('#floor-state',e=>e.getAttribute('data-selected'))!==id)await select(id)
    const sample=await page.evaluate(()=>window.__floorProbe());samples.push({cycle,id,...sample})
    if(sample.mesh!==baseline.mesh || sample.geometry!==baseline.geometry)throw new Error('Floor body geometry remounted')
    if(sample.textures>baseline.textures+2)throw new Error(`Texture leak: ${JSON.stringify(sample)}`)
  }
  await page.click('[aria-label="Fermer la Boutique"]')
  for(const id of ['neige','parquet-chene','marbre','herbe']){
    await page.click('#open-shop');if(await page.$eval('#floor-state',e=>e.getAttribute('data-selected'))!==id)await select(id)
    await page.click('[aria-label="Fermer la Boutique"]')
    await page.click('#drop-body')
    await page.waitForFunction(()=>window.__floorProbe?.().sleeping===true,{timeout:15000})
    const y=await page.evaluate(()=>window.__floorProbe().y)
    if(y<0.30 || y>0.38)throw new Error(`Body crossed/departed floor on ${id}: ${y}`)
    await page.screenshot({path:`${output}/scene-${id}.png`})
  }
  await page.click('#next-rock');await page.click('#open-shop');await ready()
  await page.waitForFunction(()=>document.querySelector('#floor-state')?.getAttribute('data-selected')==='base')
  if(await page.$eval(button('parquet-chene'),e=>e.textContent)!=='Sélectionner')throw new Error('Account floor not retained after rock change')
  await select('parquet-chene')
  await page.setViewport({width:1024,height:768,deviceScaleFactor:1})
  await page.screenshot({path:`${output}/boutique-tablet.png`,fullPage:true})
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw new Error('Horizontal overflow')
  if(errors.length)throw new Error(errors.join('\n'))
  await writeFile(`${output}/report.json`,JSON.stringify({status:'PASS',scenarios:['nine-floor-catalog','purchase-confirmation-retry','selection-reload','offline','account-reuse','24-material-switches','stable-mesh','bounded-gpu','physical-floor'],samples},null,2))
  console.log('PASS V2-04 floors: commerce, retry, persistence, offline, ownership, physics and GPU memory')
}catch(error){await page.screenshot({path:`${output}/failure.png`,fullPage:true}).catch(()=>{});await writeFile(`${output}/failure.json`,JSON.stringify({error:String(error),errors,samples},null,2));throw error}
finally{await browser.close()}
