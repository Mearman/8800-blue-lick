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
  const upgradeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
        // Larger cube (50 vs 10) reduces vertex distortion at wide FOV by moving faces further away
        geometry = new THREE.BoxGeometry(50, 50, 50)

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
          upgradeTimeoutRef.current = setTimeout(async () => {
            try {
              // Check if this upgrade is still valid (sweep/resolution hasn't changed)
              if (currentSweepRef.current !== sweepUuid || currentResolutionRef.current !== targetResolution) {
                console.log('PanoramaViewer: Upgrade cancelled, sweep/resolution changed')
                return
              }

              // Load high-res textures first
              const highResTextures = await loadCubemapTextures(sweepUuid, targetResolution)

              // Check again after async load
              if (currentSweepRef.current !== sweepUuid || currentResolutionRef.current !== targetResolution) {
                console.log('PanoramaViewer: Upgrade cancelled after texture load')
                return
              }

              // Create new materials with high-res textures BEFORE disposing old ones
              // This prevents black flash during transition
              const newMaterials = highResTextures.map(
                (texture) =>
                  new THREE.MeshBasicMaterial({
                    map: texture,
                    side: THREE.BackSide,
                  })
              )

              if (meshRef.current) {
                // Dispose old materials after new ones are ready
                if (Array.isArray(meshRef.current.material)) {
                  ;(meshRef.current.material as THREE.MeshBasicMaterial[]).forEach((mat) => {
                    if (mat.map) mat.map.dispose()
                    mat.dispose()
                  })
                }

                // Now assign new materials (no black flash)
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
      // Cancel any pending upgrade
      if (upgradeTimeoutRef.current) {
        clearTimeout(upgradeTimeoutRef.current)
      }

      // Dispose mesh
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
