import { Canvas, useThree } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { Suspense, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Mesh, MeshStandardMaterial } from 'three'
import { AccessoryShop } from '../../src/features/accessories/AccessoryShop'
import { BASE_FLOOR_MATERIAL, parseFloorMaterial } from '../../src/features/floors/floorRules'
import { FloorError } from '../../src/features/floors/floorApi'
import type { FloorItem, FloorServices, FloorSnapshot } from '../../src/features/floors/floorTypes'
import { useFloors } from '../../src/features/floors/useFloors'
import { PlacementPhysicsWorld } from '../../src/features/placement/PlacementPhysicsWorld'
import catalog from '../floors/catalog.json'
import '../../src/styles/global.css'
import '../../src/styles/accessories.css'

const USER = 'floor-browser-owner'
const BASE: FloorItem = { id:'base', name:'Sol originel',description:'La sobriété minérale des premiers jours.', priceLithons:0,
  previewPath:null,material:BASE_FLOOR_MATERIAL,active:true,acquiredAt:'2026-09-06' }
const items: FloorItem[] = [BASE,...catalog.floors.map((item) => ({ ...item,material:parseFloorMaterial(item.material),acquiredAt:null }))]
interface Server { balance:number; owned:string[]; selected:Record<string,string>; receipts:Record<string,{balance:number}>; purchases:number }
function read():Server { return JSON.parse(localStorage.getItem('floor-test-server') ?? 'null') ?? {balance:5000,owned:['base'],selected:{},receipts:{},purchases:0} }
function write(server:Server) { localStorage.setItem('floor-test-server',JSON.stringify(server)) }
const services:FloorServices = {
  async userId(){return USER},
  async load(userRockId){
    if (!navigator.onLine) throw new Error('Offline')
    const server=read()
    return {userId:USER,userRockId,selectedId:server.selected[userRockId] ?? 'base',items:items.map((item)=>({...item,acquiredAt:server.owned.includes(item.id)?'2026-09-06':null}))} satisfies FloorSnapshot
  },
  async purchase(floorId,eventKey){
    if (!navigator.onLine) throw new FloorError('Offline',false)
    const server=read()
    if(server.receipts[eventKey])return server.receipts[eventKey]!
    if(server.owned.includes(floorId))throw new FloorError('Déjà possédé',false)
    const price=items.find((item)=>item.id===floorId)!.priceLithons
    if(server.balance<price)throw new FloorError('Solde insuffisant',false)
    server.balance-=price;server.owned.push(floorId);server.purchases++
    server.receipts[eventKey]={balance:server.balance};write(server)
    if(sessionStorage.getItem('floor-fail-once')){sessionStorage.removeItem('floor-fail-once');throw new FloorError('Confirmation non reçue.',true)}
    return {balance:server.balance}
  },
  async select(userRockId,floorId){
    if (!navigator.onLine) throw new FloorError('Offline',false)
    const server=read()
    if(!server.owned.includes(floorId))throw new FloorError('Non possédé',false)
    server.selected[userRockId]=floorId;write(server);return {floorId}
  },
}
const loadAccessories=async()=>({items:[]})
function Probe({body}:{body:React.RefObject<RapierRigidBody|null>}) {
  const {gl,scene}=useThree()
  useEffect(()=>{
    window.__floorProbe=()=>{
      const mesh=scene.getObjectByName('CAILLOU_PEDESTAL_FLOOR') as Mesh|undefined
      const material=mesh?.material as MeshStandardMaterial|undefined
      return {textures:gl.info.memory.textures,geometries:gl.info.memory.geometries,mesh:mesh?.uuid,
        geometry:mesh?.geometry.uuid,status:material?.userData.floorStatus,map:material?.map?.image?.src,
        y:body.current?.translation().y,sleeping:body.current?.isSleeping()}
    }
    return()=>{delete window.__floorProbe}
  },[gl,scene,body])
  return null
}
declare global { interface Window { __floorProbe?:()=>Record<string,unknown> } }
function App(){
  const [rock,setRock]=useState(localStorage.getItem('floor-test-rock')??'rock-a')
  const [balance,setBalance]=useState(read().balance)
  const [shop,setShop]=useState(true)
  const [drop,setDrop]=useState(0)
  const floors=useFloors(rock,setBalance,services)
  const body=useRef<RapierRigidBody|null>(null)
  return <>
    <header style={{padding:12,display:'flex',gap:12,flexWrap:'wrap'}}>
      <button id="open-shop" onClick={()=>setShop(true)}>Boutique</button>
      <button id="next-rock" onClick={()=>{localStorage.setItem('floor-test-rock','rock-b');setRock('rock-b')}}>Changer de caillou</button>
      <button id="drop-body" onClick={()=>setDrop((v)=>v+1)}>Chute</button>
      <output id="floor-state" data-selected={floors.snapshot?.selectedId ?? 'base'} data-purchases={read().purchases}
        data-owned={read().owned.length} data-rock={rock} data-pending={!!floors.pending} data-online={floors.online}>
        {floors.snapshot?.selectedId ?? 'base'} · {balance} Lithons
      </output>
    </header>
    <div style={{height:'70vh'}}><Canvas shadows camera={{position:[4,4,5],fov:45}} gl={{preserveDrawingBuffer:true}}>
      <color attach="background" args={['#e5e1d8']}/><ambientLight intensity={1}/><directionalLight position={[3,5,2]} intensity={2} castShadow/>
      <Suspense fallback={null}><PlacementPhysicsWorld paused={false} floorMaterial={floors.material}>
        <RigidBody ref={body} key={drop} position={[0,2,0]} colliders="ball" restitution={0}>
          <mesh castShadow><sphereGeometry args={[0.35,32,24]}/><meshStandardMaterial color="#80756a" roughness={0.9}/></mesh>
        </RigidBody>
        <Probe body={body}/>
      </PlacementPhysicsWorld></Suspense>
    </Canvas></div>
    {shop?<AccessoryShop floors={floors} balance={balance} onBalanceChanged={setBalance} onPurchased={()=>{}} onClose={()=>setShop(false)}
      permit={null} permitLoading={false} permitPending={false} permitError={null} onPermitPurchase={async()=>false} loadShop={loadAccessories}/>:null}
  </>
}
createRoot(document.getElementById('root')!).render(<App/> )
