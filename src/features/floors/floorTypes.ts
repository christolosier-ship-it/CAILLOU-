export interface FloorMaterial {
  version: 1
  color: string
  roughness: number
  metalness: number
  repeat: [number, number]
  normalScale: number
  colorMap?: string
  normalMap?: string
  roughnessMap?: string
}
export interface FloorItem {
  id: string
  name: string
  description: string
  priceLithons: number
  previewPath: string | null
  material: FloorMaterial
  active: boolean
  acquiredAt: string | null
}
export interface FloorSnapshot {
  userId: string
  userRockId: string
  selectedId: string
  items: FloorItem[]
}
export interface FloorOperation {
  kind: 'purchase' | 'select'
  floorId: string
  eventKey: string
}
export interface FloorServices {
  userId: () => Promise<string | null>
  load: (userRockId: string) => Promise<FloorSnapshot>
  purchase: (floorId: string, eventKey: string) => Promise<{ balance: number }>
  select: (userRockId: string, floorId: string, eventKey: string) => Promise<{ floorId: string }>
}
