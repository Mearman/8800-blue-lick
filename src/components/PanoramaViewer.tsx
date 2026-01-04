import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { loadCubemapTextures } from '../utils/textureLoader'

interface PanoramaViewerProps {
  sweepUuid: string
  scene: THREE.Scene
}

/**
 * Component to display a 360° panorama using Three.js cubemap
 * Renders a cube with textures on the inside, viewed from the center
 */
export function PanoramaViewer({ sweepUuid, scene }: PanoramaViewerProps) {
  const meshRef = useRef<THREE.Mesh | null>(null)

  useEffect(() => {
    if (!scene) {
      return
    }

    let geometry: THREE.BoxGeometry | null = null
    let materials: THREE.MeshBasicMaterial[] | null = null

    async function loadPanorama() {
      try {
        console.log('PanoramaViewer: Starting load for', sweepUuid)
        // Remove existing panorama mesh if any
        if (meshRef.current) {
          scene.remove(meshRef.current)
          // Dispose old geometry and materials
          if (meshRef.current.geometry) meshRef.current.geometry.dispose()
          if (Array.isArray(meshRef.current.material)) {
            meshRef.current.material.forEach((mat) => mat.dispose())
          }
        }

        // Load cubemap textures for all 6 faces
        const textures = await loadCubemapTextures(sweepUuid, '1k')
        console.log('PanoramaViewer: Loaded', textures.length, 'textures')

        // Create cube geometry (inside-out for viewing from center)
        geometry = new THREE.BoxGeometry(10, 10, 10)

        // Create materials for each face
        materials = textures.map(
          (texture) =>
            new THREE.MeshBasicMaterial({
              map: texture,
              side: THREE.BackSide, // Render on inside of cube
            })
        )

        // Create mesh
        const mesh = new THREE.Mesh(geometry, materials)
        meshRef.current = mesh

        // Add to scene
        scene.add(mesh)
        console.log('PanoramaViewer: Mesh added to scene, total children:', scene.children.length)
      } catch (error) {
        console.error('Failed to load panorama:', error)
      }
    }

    loadPanorama()

    // Cleanup function
    return () => {
      if (meshRef.current) {
        scene.remove(meshRef.current)
        if (meshRef.current.geometry) meshRef.current.geometry.dispose()
        if (Array.isArray(meshRef.current.material)) {
          meshRef.current.material.forEach((mat) => mat.dispose())
        }
      }
    }
  }, [scene, sweepUuid])

  return null // This component only manages Three.js objects, no JSX rendering
}
