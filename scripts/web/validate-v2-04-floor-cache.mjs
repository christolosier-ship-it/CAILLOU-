import { mkdir,readFile,writeFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'
const base=process.env.CAILLOU_E2E_BASE_URL??'http://127.0.0.1:4191'
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH??'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']})
const {floors}=JSON.parse(await readFile('scripts/floors/catalog.json','utf8'))
const urls=floors.flatMap(f=>[f.material.colorMap,f.material.normalMap,f.material.roughnessMap])
const page=await browser.newPage()
try{
 await page.goto(base,{waitUntil:'networkidle0'})
 await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready})
 await page.reload({waitUntil:'networkidle0'})
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller)
 const precache=await page.evaluate(async()=>{const name=(await caches.keys()).find(n=>n.includes('precache'));return (await (await caches.open(name)).keys()).map(r=>new URL(r.url).pathname)})
 if(precache.some(p=>p.includes('/floors/')))throw new Error('Floors entered initial precache')
 for(const url of urls){
  const status=await page.evaluate(async(path)=>(await fetch(path)).status,url)
  if(status!==200)throw new Error(`Texture HTTP ${status}: ${url}`)
 }
 await page.waitForFunction(async()=>{const cache=await caches.open('caillou-floors-step12-v1');const count=(await cache.keys()).length;return count>0&&count<=12},{timeout:15000})
 const count=await page.evaluate(async()=>(await(await caches.open('caillou-floors-step12-v1')).keys()).length)
 await page.setOfflineMode(true)
 for(const url of urls.slice(-3)) {
  const status=await page.evaluate(async(path)=>(await fetch(path)).status,url)
  if(status!==200)throw new Error('Last floor texture missing offline')
 }
 await page.reload({waitUntil:'domcontentloaded'})
 if(!(await page.$('body')))throw new Error('Offline shell missing')
 await mkdir('build/v2-04-floors',{recursive:true})
 await writeFile('build/v2-04-floors/cache.json',JSON.stringify({status:'PASS',precache,floorCacheEntries:count,lastFloorOffline:true},null,2))
 console.log(`PASS floor PWA cache: ${count}/12 entries, no floor precache, last material and shell available offline`)
}finally{await browser.close()}
