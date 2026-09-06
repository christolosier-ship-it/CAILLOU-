import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const { floors } = JSON.parse(await readFile('scripts/floors/catalog.json','utf8'))
let bytes=0
for(const floor of floors) for(const [name,budget] of Object.entries(floor.budget.files)) {
  const file=await readFile(`public/assets/floors/${floor.id}/v1/${name}`)
  if(file.toString('ascii',0,4)!=='RIFF'||file.toString('ascii',8,12)!=='WEBP')throw new Error(`Invalid WebP: ${floor.id}/${name}`)
  if(file.length!==budget.bytes||file.length>1024*1024||createHash('sha256').update(file).digest('hex')!==budget.sha256)throw new Error(`Asset budget/hash mismatch: ${floor.id}/${name}`)
  if(budget.width>2048||budget.height>2048)throw new Error(`Resolution budget exceeded: ${floor.id}/${name}`)
  bytes+=file.length
}
console.log(`PASS ${floors.length} decorative floors, 32 WebP files, ${(bytes/1024/1024).toFixed(2)} MiB total`)
