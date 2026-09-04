import { describe, expect, it } from 'vitest'

import {
  interpolatePlacementCollisionTransform,
  maximalValidPlacementFraction,
} from './placementCollisionSolver'
import type { PlacementTransform } from './placementTypes'

const INITIAL: PlacementTransform = {
  position: [0, 1, 0],
  rotation: [0, 0, 0, 1],
  scale: 1,
}

describe('placement collision solver', () => {
  it('interpole uniquement la translation pour un sweep lineaire', () => {
    const result = interpolatePlacementCollisionTransform(INITIAL, {
      position: [4, 3, -2],
      rotation: [0.2, 0.3, 0.4, 0.8],
      scale: 1.5,
    }, 'translation', 0.25)

    expect(result.position).toEqual([1, 1.5, -0.5])
    expect(result.rotation).toEqual(INITIAL.rotation)
    expect(result.scale).toBe(1)
  })

  it('trouve la plus grande rotation valide avec raffinement borne', () => {
    const fraction = maximalValidPlacementFraction((candidate) => candidate <= 0.63, 12, 10)

    expect(fraction).toBeGreaterThan(0.628)
    expect(fraction).toBeLessThanOrEqual(0.63)
  })

  it('retourne le transform complet lorsque tout le chemin reste valide', () => {
    expect(maximalValidPlacementFraction(() => true, 16, 8)).toBe(1)
  })

  it('borne un agrandissement avant la premiere penetration', () => {
    const fraction = maximalValidPlacementFraction((candidate) => candidate < 0.4, 20, 10)

    expect(fraction).toBeGreaterThan(0.398)
    expect(fraction).toBeLessThan(0.4)
  })
})
