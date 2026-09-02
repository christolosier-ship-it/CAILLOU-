export type PlacementTool = 'position' | 'orientation' | 'size'

export type PlacementTarget =
  | { kind: 'rock'; instanceId?: undefined }
  | { kind: 'accessory'; instanceId: string }

export type PlacementVector3 = [number, number, number]

export interface PlacementBounds {
  min: PlacementVector3
  max: PlacementVector3
}


export type PlacementQuaternion = [number, number, number, number]

export interface PlacementTransform {
  position: PlacementVector3
  rotation: PlacementQuaternion
  scale: number
}
