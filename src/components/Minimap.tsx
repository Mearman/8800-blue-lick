import { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { loadModelByFloors, getFloors } from '../utils/modelLoader'
import type { Sweep } from '../types/matterport'
import './Minimap.css'

interface MinimapProps {
  sweeps: Sweep[]
  currentSweep: Sweep | null
  cameraDirection: THREE.Vector3
  onNavigate: (uuid: string) => void
}

export function Minimap({
  sweeps,
  currentSweep,
  cameraDirection,
  onNavigate,
}: MinimapProps) {
  const [viewMode, setViewMode] = useState<'2d' | 'isometric'>('2d')
  const [currentFloor, setCurrentFloor] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [modelReady, setModelReady] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.OrthographicCamera | THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const floorModelsRef = useRef<Map<number, THREE.Group>>(new Map())
  const markerGroupRef = useRef<THREE.Group | null>(null)
  const directionArrowRef = useRef<THREE.ArrowHelper | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const isInitializingRef = useRef(false)
  const modelCenterRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0))
  const modelSizeRef = useRef<number>(50)

  const floors = getFloors(sweeps)
  const totalFloors = floors.length

  // Initialize Three.js scene when DOM element is ready
  const setMinimapRef = useCallback((node: HTMLDivElement | null) => {
    // Only initialize once when we first get a node
    if (node && !sceneRef.current && !isInitializingRef.current) {
      isInitializingRef.current = true
      console.log('Minimap: DOM element ready, initializing scene...')

      // Scene setup
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x1a1a1a) // Dark gray background
      sceneRef.current = scene

      // Renderer setup
      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(300, 300)
      renderer.setPixelRatio(1) // Lower pixel ratio for performance
      node.appendChild(renderer.domElement)
      rendererRef.current = renderer

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
      scene.add(ambientLight)

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4)
      directionalLight.position.set(10, 20, 10)
      scene.add(directionalLight)

      // Load model
      const basePath = import.meta.env.BASE_URL || '/'
      const objPath = `${basePath}assets/BGMifUnvLxQ/model/low-res/geometry.obj`
      const mtlPath = `${basePath}assets/BGMifUnvLxQ/model/low-res/geometry.mtl`

      console.log('Minimap: Starting model load...')
      console.log('Minimap: OBJ path:', objPath)
      console.log('Minimap: MTL path:', mtlPath)
      console.log('Minimap: Sweeps count:', sweeps.length)

      loadModelByFloors(
        objPath,
        mtlPath,
        sweeps
      )
        .then((floorModels) => {
          console.log('Minimap: Model loaded successfully, floor count:', floorModels.size)
          floorModelsRef.current = floorModels

          // Add all floor models to scene
          floorModels.forEach((model, _floorIndex) => {
            model.visible = false // Start hidden

            // Try different rotations to find correct orientation
            // Matterport uses Y as up, but OBJ might use Z as up
            model.rotation.x = -Math.PI / 2 // Rotate 90 degrees around X

            scene.add(model)
          })

          // Calculate model bounding box AFTER rotation to center camera
          const bbox = new THREE.Box3()
          floorModels.forEach((model) => {
            const floorBbox = new THREE.Box3().setFromObject(model)
            bbox.union(floorBbox)
          })

          const center = bbox.getCenter(new THREE.Vector3())
          const size = bbox.getSize(new THREE.Vector3())
          const maxDimension = Math.max(size.x, size.y, size.z)

          modelCenterRef.current = center
          modelSizeRef.current = maxDimension

          console.log('Minimap: Model bounding box (after rotation):', { center, size, maxDimension })

          setIsLoading(false)
          setModelReady(true)
        })
        .catch((error) => {
          console.error('Failed to load minimap model:', error)
          setIsLoading(false)
        })
    }
  }, [sweeps]) // Only recreate if sweeps changes (which should be rare)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (controlsRef.current) {
        controlsRef.current.dispose()
      }
      if (rendererRef.current) {
        // Remove canvas from DOM
        if (rendererRef.current.domElement && rendererRef.current.domElement.parentNode) {
          rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement)
        }
        rendererRef.current.dispose()
      }
      floorModelsRef.current.forEach((model) => {
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose()
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose())
            } else {
              child.material.dispose()
            }
          }
        })
      })
    }
  }, [])

  // Setup camera based on view mode
  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current || !modelReady) return

    // Remove old camera
    if (cameraRef.current) {
      // Note: we don't dispose the camera as it might be reused
    }

    const aspect = 300 / 300
    let camera: THREE.OrthographicCamera | THREE.PerspectiveCamera

    if (viewMode === '2d') {
      // Orthographic camera for 2D top-down view
      const frustumSize = modelSizeRef.current * 1.5
      camera = new THREE.OrthographicCamera(
        frustumSize / -2,
        frustumSize / 2,
        frustumSize / 2,
        frustumSize / -2,
        0.1,
        1000
      )
      // Try different camera positions to find top-down view
      camera.position.set(
        modelCenterRef.current.x,
        modelCenterRef.current.y + 100,
        modelCenterRef.current.z
      )
      camera.lookAt(modelCenterRef.current)

      console.log('2D Camera setup:', {
        position: camera.position,
        lookAt: modelCenterRef.current,
        frustumSize
      })
    } else {
      // Perspective camera for isometric view
      camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000)
      const offset = modelSizeRef.current * 1.5
      camera.position.set(
        modelCenterRef.current.x + offset,
        modelCenterRef.current.y + offset,
        modelCenterRef.current.z + offset
      )
      camera.lookAt(modelCenterRef.current)
    }

    cameraRef.current = camera

    // Setup OrbitControls for isometric mode
    if (controlsRef.current) {
      controlsRef.current.dispose()
    }

    if (viewMode === 'isometric') {
      const controls = new OrbitControls(camera, rendererRef.current!.domElement)
      controls.enableZoom = true // Enable zoom for isometric mode
      controls.enablePan = true
      controls.minPolarAngle = Math.PI / 4
      controls.maxPolarAngle = Math.PI / 2
      controlsRef.current = controls
    }

    // Start animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)

      if (controlsRef.current) {
        controlsRef.current.update()
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }
    }
    animate()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [viewMode, modelReady])

  // Handle resize when expanding/collapsing
  useEffect(() => {
    if (!rendererRef.current || !cameraRef.current) return

    const size = isExpanded ? 800 : 300
    rendererRef.current.setSize(size, size)

    // Update camera based on type
    const camera = cameraRef.current
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = size / size
      camera.updateProjectionMatrix()
    } else if (camera instanceof THREE.OrthographicCamera) {
      const frustumSize = modelSizeRef.current * 1.5
      camera.left = frustumSize / -2
      camera.right = frustumSize / 2
      camera.top = frustumSize / 2
      camera.bottom = frustumSize / -2
      camera.updateProjectionMatrix()
    }
  }, [isExpanded, modelReady])

  // Update floor visibility based on view mode and current floor
  useEffect(() => {
    floorModelsRef.current.forEach((model, floorIndex) => {
      if (viewMode === '2d') {
        model.visible = floorIndex === currentFloor
      } else {
        model.visible = true
      }
    })
  }, [viewMode, currentFloor, modelReady])

  // Create/update position markers
  useEffect(() => {
    if (!sceneRef.current || isLoading) return

    // Remove old markers
    if (markerGroupRef.current) {
      sceneRef.current.remove(markerGroupRef.current)
      markerGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          if (child.material instanceof THREE.Material) {
            child.material.dispose()
          }
        }
      })
    }

    // Create new markers
    const markerGroup = new THREE.Group()

    // Log model bounds for debugging
    console.log('Minimap: Model bounds for checking markers:', {
      center: modelCenterRef.current,
      size: modelSizeRef.current
    })

    const outsideSweeps: Array<{name: string; index: number; position: {x: number; y: number; z: number}; floor: number; room: number}> = []
    const debugSweeps = sweeps.slice(0, 5) // Log first 5 for debugging

    console.log('Minimap: Sample sweep positions (first 5):')
    console.table(debugSweeps.map(s => ({
      index: s.index,
      room_index: s.room_index,
      floor: s.floor_index,
      floor_pos: `x:${s.floor_position.x.toFixed(2)} y:${s.floor_position.y.toFixed(2)} z:${s.floor_position.z.toFixed(2)}`
    })))

    sweeps.forEach((sweep) => {
      const isCurrent = sweep.sweep_uuid === currentSweep?.sweep_uuid
      const isNeighbor = currentSweep?.neighbors.includes(sweep.index)
      const isSameFloor = sweep.floor_index === currentSweep?.floor_index

      // Determine color
      let color: number
      if (isCurrent) {
        color = 0xff6600 // Orange - current position
      } else if (isNeighbor && isSameFloor) {
        color = 0x0066ff // Blue - same floor neighbor
      } else if (isNeighbor && !isSameFloor) {
        color = 0x66ccff // Light blue - different floor neighbor
      } else {
        color = 0x666666 // Gray - other positions
      }

      // Create marker
      const geometry = new THREE.SphereGeometry(0.3, 16, 16)
      const material = new THREE.MeshBasicMaterial({ color })
      const marker = new THREE.Mesh(geometry, material)

      // Apply same -90° X-axis rotation as model: (x, y, z) → (x, z, -y)
      // Use position if floor_position is all zeros (happens for room -1 exterior sweeps)
      const pos = sweep.floor_position.x === 0 && sweep.floor_position.y === 0 && sweep.floor_position.z === 0
        ? sweep.position
        : sweep.floor_position

      const y = pos.y + 0.5
      const rotatedPos = {
        x: pos.x,
        y: pos.z,
        z: -y
      }

      marker.position.set(
        rotatedPos.x,
        rotatedPos.y,
        rotatedPos.z
      )

      // Debug logging for room -1 sweeps
      if (sweep.room_index === -1) {
        console.log('Room -1 sweep:', {
          index: sweep.index,
          floor_position: sweep.floor_position,
          position: sweep.position,
          using_position: pos === sweep.position,
          rotatedPos: rotatedPos,
          finalPosition: marker.position
        })
      }

      // Check if marker is outside model bounds (with some tolerance)
      const tolerance = 5 // Allow 5 units outside bounds
      const halfSize = modelSizeRef.current / 2
      const minX = modelCenterRef.current.x - halfSize - tolerance
      const maxX = modelCenterRef.current.x + halfSize + tolerance
      const minY = modelCenterRef.current.y - halfSize - tolerance
      const maxY = modelCenterRef.current.y + halfSize + tolerance

      const isOutside = (
        rotatedPos.x < minX ||
        rotatedPos.x > maxX ||
        rotatedPos.y < minY ||
        rotatedPos.y > maxY
      )

      if (isOutside) {
        outsideSweeps.push({
          name: sweep.sweep_name,
          index: sweep.index,
          position: sweep.floor_position,
          floor: sweep.floor_index,
          room: sweep.room_index
        })
      }

      // Store sweep data for click handling
      marker.userData = {
        sweepUuid: sweep.sweep_uuid,
        floorIndex: sweep.floor_index,
        sweepName: sweep.sweep_name,
      }

      markerGroup.add(marker)
    })

    // Log sweeps outside the model bounds
    if (outsideSweeps.length > 0) {
      console.warn('Minimap: Sweeps outside model bounds:', outsideSweeps)
      console.table(outsideSweeps)
    } else {
      console.log('Minimap: All sweeps within model bounds')
    }

    markerGroupRef.current = markerGroup
    sceneRef.current.add(markerGroup)
  }, [sweeps, currentSweep, isLoading])

  // Update direction arrow
  useEffect(() => {
    if (!sceneRef.current || !currentSweep) return

    // Remove old arrow
    if (directionArrowRef.current) {
      sceneRef.current.remove(directionArrowRef.current)
      directionArrowRef.current.dispose()
    }

    const dir = cameraDirection.clone().normalize()

    // Debug logging to understand direction arrow rotation
    console.log('Direction arrow debug:', {
      originalDir: { x: dir.x.toFixed(3), y: dir.y.toFixed(3), z: dir.z.toFixed(3) }
    })

    // Don't rotate the direction vector!
    // The model was rotated to match the camera's coordinate system (both Y-up now)
    // So the direction should be used as-is without transformation
    const rotatedDir = dir.clone()

    console.log('Direction arrow (no rotation):', {
      rotatedDir: { x: rotatedDir.x.toFixed(3), y: rotatedDir.y.toFixed(3), z: rotatedDir.z.toFixed(3) }
    })

    const arrowLength = 1.5

    // Use position if floor_position is all zeros (room -1 exterior sweeps)
    const arrowPos = currentSweep.floor_position.x === 0 && currentSweep.floor_position.y === 0 && currentSweep.floor_position.z === 0
      ? currentSweep.position
      : currentSweep.floor_position

    const y = arrowPos.y + 0.5
    const origin = new THREE.Vector3(
      arrowPos.x,
      arrowPos.z,  // z becomes new y
      -y          // -y becomes new z
    )

    const arrow = new THREE.ArrowHelper(rotatedDir, origin, arrowLength, 0xff6600, 0.3, 0.2)
    directionArrowRef.current = arrow
    sceneRef.current.add(arrow)
  }, [currentSweep, cameraDirection])

  // Handle click navigation
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!markerGroupRef.current || !cameraRef.current || !rendererRef.current) return

      const rect = rendererRef.current.domElement.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      )

      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(mouse, cameraRef.current)

      const intersects = raycaster.intersectObjects(markerGroupRef.current.children)

      if (intersects.length > 0) {
        const clickedMarker = intersects[0].object as THREE.Mesh
        const sweepUuid = clickedMarker.userData.sweepUuid as string
        onNavigate(sweepUuid)
      }
    },
    [onNavigate]
  )

  // Floor cycling
  const goToPrevFloor = useCallback(() => {
    setCurrentFloor((f) => Math.max(0, f - 1))
  }, [])

  const goToNextFloor = useCallback(() => {
    setCurrentFloor((f) => Math.min(totalFloors - 1, f + 1))
  }, [totalFloors])

  // Auto-switch floor when navigating in 2D mode
  useEffect(() => {
    if (currentSweep && viewMode === '2d') {
      setCurrentFloor(currentSweep.floor_index)
    }
  }, [currentSweep, viewMode])

  return (
    <div className={`minimap-container${isExpanded ? ' expanded' : ''}`}>
      <div className="minimap-header">
        <div className="minimap-controls-row">
          <span className="minimap-title">Minimap</span>
          <div className="view-toggle">
            <button
              className={viewMode === '2d' ? 'active' : ''}
              onClick={() => setViewMode('2d')}
            >
              2D
            </button>
            <button
              className={viewMode === 'isometric' ? 'active' : ''}
              onClick={() => setViewMode('isometric')}
            >
              3D
            </button>
            <button
              className="expand-button"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? '−' : '+'}
            </button>
          </div>
        </div>

        {viewMode === '2d' && totalFloors > 1 && (
          <div className="floor-controls">
            <button
              onClick={goToPrevFloor}
              disabled={currentFloor === 0}
              title="Previous floor"
            >
              ← Prev
            </button>
            <span>
              Floor {currentFloor + 1} of {totalFloors}
            </span>
            <button
              onClick={goToNextFloor}
              disabled={currentFloor === totalFloors - 1}
              title="Next floor"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      <div className="minimap-canvas" ref={setMinimapRef} onClick={handleClick}>
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '14px',
              background: 'rgba(0, 0, 0, 0.7)',
            }}
          >
            Loading...
          </div>
        )}
      </div>
    </div>
  )
}
