import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { loadCubemapTextures } from '../utils/textureLoader'
import type { TextureResolution } from '../utils/textureLoader'

interface PanoramaViewerProps {
  sweepUuid: string
  scene: THREE.Scene
  resolution: TextureResolution
}

/**
 * Component to display a 360° panorama using Three.js cubemap
 * Renders a cube with textures on the inside, viewed from the center
 *
 * Progressive loading: Always starts with 512px for instant display,
 * then upgrades to target resolution in background
 */
export function PanoramaViewer({ sweepUuid, scene, resolution }: PanoramaViewerProps) {
  const meshRef = useRef<THREE.Mesh | null>(null)
  const currentSweepRef = useRef<string | undefined>(undefined)
  const currentResolutionRef = useRef<TextureResolution | undefined>(undefined)

  useEffect(() => {
    if (!scene) {
      return
    }

    let geometry: THREE.BoxGeometry | null = null
    let materials: THREE.MeshBasicMaterial[] | null = null

    async function loadPanorama(targetResolution: TextureResolution) {
      try {
        // Remove existing panorama mesh if any
        if (meshRef.current) {
          scene.remove(meshRef.current)
          // Dispose old geometry and materials
          if (meshRef.current.geometry) meshRef.current.geometry.dispose()
          if (Array.isArray(meshRef.current.material)) {
            ;(meshRef.current.material as THREE.MeshBasicMaterial[]).forEach((mat) => {
              if (mat.map) mat.map.dispose()
              mat.dispose()
            })
          }
        }

        // Progressive loading: start with 512px for instant display
        console.log('PanoramaViewer: Loading 512px preview for', sweepUuid)
        const textures = await loadCubemapTextures(sweepUuid, '512')

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

        // Create mesh with low-res textures
        const mesh = new THREE.Mesh(geometry, materials)
        meshRef.current = mesh

        // Add to scene
        scene.add(mesh)
        console.log('PanoramaViewer: Preview mesh added for', sweepUuid)

        // Progressive upgrade to target resolution if needed
        if (targetResolution !== '512') {
          console.log('PanoramaViewer: Upgrading to', targetResolution)
          setTimeout(async () => {
            try {
              const highResTextures = await loadCubemapTextures(sweepUuid, targetResolution)

              // Dispose old materials
              if (meshRef.current && Array.isArray(meshRef.current.material)) {
                ;(meshRef.current.material as THREE.MeshBasicMaterial[]).forEach((mat) => {
                  if (mat.map) mat.map.dispose()
                  mat.dispose()
                })
              }

              // Create new materials with high-res textures
              const newMaterials = highResTextures.map(
                (texture) =>
                  new THREE.MeshBasicMaterial({
                    map: texture,
                    side: THREE.BackSide,
                  })
              )

              if (meshRef.current) {
                meshRef.current.material = newMaterials
                console.log('PanoramaViewer: Upgraded to', targetResolution)
              }
            } catch (error) {
              console.error('PanoramaViewer: Failed to upgrade to', targetResolution, error)
            }
          }, 100) // Small delay to let preview render first
        }
      } catch (error) {
        console.error('Failed to load panorama:', error)
      }
    }

    // Load panorama (sweep or resolution changed)
    if (
      sweepUuid !== currentSweepRef.current ||
      resolution !== currentResolutionRef.current
    ) {
      currentSweepRef.current = sweepUuid
      currentResolutionRef.current = resolution
      loadPanorama(resolution)
    }

    // Cleanup function
    return () => {
      if (meshRef.current) {
        scene.remove(meshRef.current)
        if (meshRef.current.geometry) meshRef.current.geometry.dispose()
        if (Array.isArray(meshRef.current.material)) {
          ;(meshRef.current.material as THREE.MeshBasicMaterial[]).forEach((mat) => {
            if (mat.map) mat.map.dispose()
            mat.dispose()
          })
        }
      }
    }
  }, [scene, sweepUuid, resolution])

  return null // This component only manages Three.js objects, no JSX rendering
}
