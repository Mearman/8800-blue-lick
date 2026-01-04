import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import type { Sweep } from '../types/matterport'

/**
 * Load OBJ model with MTL materials
 */
export async function loadModel(
  modelPath: string,
  materialsPath: string
): Promise<THREE.Group> {
  // Load materials first
  const mtlLoader = new MTLLoader()
  const materials = await new Promise<MTLLoader.MaterialCreator>((resolve, reject) => {
    mtlLoader.load(
      materialsPath,
      (mtl) => {
        mtl.preload()
        resolve(mtl)
      },
      undefined,
      reject
    )
  })

  // Load OBJ with materials
  const objLoader = new OBJLoader()
  objLoader.setMaterials(materials)

  const model = await new Promise<THREE.Group>((resolve, reject) => {
    objLoader.load(
      modelPath,
      (obj) => resolve(obj),
      undefined,
      reject
    )
  })

  return model
}

/**
 * Get all unique floor indices from sweeps
 */
export function getFloors(sweeps: Sweep[]): number[] {
  const floors = new Set(sweeps.map((s) => s.floor_index))
  return Array.from(floors).sort((a, b) => a - b)
}

/**
 * Separate model geometry by floor using sweep Y-positions
 */
export async function loadModelByFloors(
  modelPath: string,
  materialsPath: string,
  sweeps: Sweep[]
): Promise<Map<number, THREE.Group>> {
  // Load full model
  const fullModel = await loadModel(modelPath, materialsPath)

  const floors = getFloors(sweeps)
  const floorModels = new Map<number, THREE.Group>()

  // For each floor, create a filtered group
  floors.forEach((_floorIndex) => {
    const floorGroup = new THREE.Group()
    const floorSweeps = sweeps.filter((s) => s.floor_index === _floorIndex)

    // Get Y-position range for this floor from sweep positions
    const yPositions = floorSweeps.map((s) => s.position.y)
    const minY = Math.min(...yPositions) - 2
    const maxY = Math.max(...yPositions) + 2

    // Clone and filter model geometry by Y-position
    fullModel.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const bbox = new THREE.Box3().setFromObject(child)
        if (bbox.min.y >= minY && bbox.max.y <= maxY) {
          const cloned = child.clone()
          floorGroup.add(cloned)
        }
      }
    })

    floorModels.set(_floorIndex, floorGroup)
  })

  return floorModels
}
