import { useState, useEffect, useRef } from 'react'
import { ThreeScene, type ThreeSceneRef } from './components/ThreeScene'
import { PanoramaViewer } from './components/PanoramaViewer'
import { NavigationControls } from './components/NavigationControls'
import { Minimap } from './components/Minimap'
import { useSweepsData } from './hooks/useSweepsData'
import { useViewURL } from './hooks/useViewURL'
import { calculateRequiredResolution } from './utils/lod'
import type { Sweep, ViewURLState } from './types/matterport'
import type { TextureResolution } from './utils/textureLoader'
import * as THREE from 'three'

function App() {
  const { sweeps, loading, error } = useSweepsData()
  const [currentSweep, setCurrentSweep] = useState<Sweep | null>(null)
  const [scene, setScene] = useState<THREE.Scene | null>(null)
  const threeSceneRef = useRef<ThreeSceneRef>(null)
  const pendingURLStateRef = useRef<ViewURLState | null>(null)

  // Resolution management
  const [currentResolution, setCurrentResolution] = useState<TextureResolution>('512')
  const [resolutionMode, setResolutionMode] = useState<'auto' | TextureResolution>('auto')
  const [cameraDirection, setCameraDirection] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 1))
  const isLoadingTexturesRef = useRef(false)
  const pendingResolutionRef = useRef<TextureResolution | null>(null)
  const fovChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset resolution to 512 when navigating
  const prevSweepRef = useRef<Sweep | null>(null)
  useEffect(() => {
    if (currentSweep && currentSweep !== prevSweepRef.current) {
      setCurrentResolution('512')
      prevSweepRef.current = currentSweep
    }
  }, [currentSweep])

  // Use a callback ref to get notified when the ref changes
  const setThreeSceneRef = (ref: ThreeSceneRef | null) => {
    threeSceneRef.current = ref
    if (ref) {
      const scene = ref.getScene()
      if (scene) {
        setScene(scene)
      }
    }
  }

  // Apply URL state to set current sweep and camera position
  const applyURLState = (state: ViewURLState) => {
    // Find sweep by UUID
    const sweep = sweeps.find((s) => s.sweep_uuid === state.sweep)
    if (sweep) {
      setCurrentSweep(sweep)

      // Restore camera position, orientation, and FOV after scene is ready
      setTimeout(() => {
        if (threeSceneRef.current) {
          const position = new THREE.Vector3(state.x, state.y, state.z)

          // Restore orientation using pitch and yaw
          threeSceneRef.current.setCameraOrientation(position, state.pitch, state.yaw)

          // Restore FOV if provided
          if (state.fov !== undefined) {
            threeSceneRef.current.setFov(state.fov)
          }
        }
      }, 100)
    }
  }

  // Handle URL state restoration
  const handleStateFromURL = (state: ViewURLState) => {
    // Store the URL state for later application
    pendingURLStateRef.current = state

    if (!sweeps.length) {
      return
    }

    applyURLState(state)
  }

  // Set initial sweep - either from URL (pending) or default to first sweep
  // Only run when BOTH sweeps are loaded AND scene is ready
  useEffect(() => {
    if (sweeps.length > 0 && scene && !currentSweep) {
      // If we have pending URL state, apply it
      if (pendingURLStateRef.current) {
        applyURLState(pendingURLStateRef.current)
        pendingURLStateRef.current = null
        return
      }

      // Otherwise, check if URL has sweep parameter
      const params = new URLSearchParams(window.location.search)
      const urlSweep = params.get('sweep')

      if (urlSweep) {
        // URL exists but useViewURL hasn't called handleStateFromURL yet
        // This shouldn't happen, but handle it gracefully
        const sweep = sweeps.find((s) => s.sweep_uuid === urlSweep)
        if (sweep) {
          setCurrentSweep(sweep)
        } else {
          setCurrentSweep(sweeps[0])
        }
      } else {
        // No URL state, use first sweep
        const sweep = sweeps[0]
        setCurrentSweep(sweep)
      }
    }
  }, [sweeps, scene, currentSweep])

  const { updateURL } = useViewURL(handleStateFromURL)

  // Handle camera changes and update URL
  const handleCameraChange = (position: THREE.Vector3, pitch: number, yaw: number) => {
    if (!currentSweep) return

    // Get current FOV
    const currentFov = threeSceneRef.current?.getFov() || 75

    updateURL({
      sweep: currentSweep.sweep_uuid,
      x: position.x,
      y: position.y,
      z: position.z,
      pitch,
      yaw,
      fov: currentFov,
    })
  }

  // Handle navigation to a different sweep
  const handleNavigate = (sweepUuid: string) => {
    const sweep = sweeps.find((s) => s.sweep_uuid === sweepUuid)
    if (sweep) {
      setCurrentSweep(sweep)
      // Reset to low resolution on navigation for instant display
      setCurrentResolution('512')
    }
  }

  // Handle FOV changes with debounced texture updates
  const handleFovChange = (fov: number) => {
    // Skip if in manual resolution mode
    if (resolutionMode !== 'auto') return

    // Clear existing timeout
    if (fovChangeTimeoutRef.current) {
      clearTimeout(fovChangeTimeoutRef.current)
    }

    // Calculate required resolution based on new FOV
    const requiredResolution = calculateRequiredResolution(fov)

    // Debounce to prevent excessive loading during scroll
    fovChangeTimeoutRef.current = setTimeout(() => {
      // Only update if resolution actually changed
      if (requiredResolution !== currentResolution && !isLoadingTexturesRef.current) {
        pendingResolutionRef.current = requiredResolution
        isLoadingTexturesRef.current = true

        // Update resolution state
        setCurrentResolution(requiredResolution)
        pendingResolutionRef.current = null
        isLoadingTexturesRef.current = false
      }
    }, 300) // 300ms delay
  }

  // Handle resolution mode changes
  const handleResolutionModeChange = (newMode: 'auto' | TextureResolution) => {
    setResolutionMode(newMode)

    if (newMode === 'auto') {
      // Trigger FOV-based resolution calculation
      if (threeSceneRef.current) {
        const currentFov = threeSceneRef.current.getFov()
        const requiredResolution = calculateRequiredResolution(currentFov)
        setCurrentResolution(requiredResolution)
      }
    } else {
      // Manual mode: use selected resolution
      setCurrentResolution(newMode)
    }
  }

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!currentSweep || !threeSceneRef.current) return

      const camera = threeSceneRef.current.getCamera()
      if (!camera) return

      const moveSpeed = 0.1
      const newPosition = camera.position.clone()

      switch (event.key) {
        case 'ArrowUp':
        case 'w':
          newPosition.y += moveSpeed
          break
        case 'ArrowDown':
        case 's':
          newPosition.y -= moveSpeed
          break
        case 'ArrowLeft':
        case 'a':
          // Move left relative to camera direction
          const left = new THREE.Vector3(-1, 0, 0).applyQuaternion(camera.quaternion)
          newPosition.add(left.multiplyScalar(moveSpeed))
          break
        case 'ArrowRight':
        case 'd':
          // Move right relative to camera direction
          const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
          newPosition.add(right.multiplyScalar(moveSpeed))
          break
        default:
          return
      }

      event.preventDefault()
      camera.position.copy(newPosition)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentSweep])

  // Update camera direction for minimap
  useEffect(() => {
    const updateDirection = () => {
      if (threeSceneRef.current) {
        const direction = threeSceneRef.current.getCameraDirection()
        if (direction) {
          setCameraDirection(direction.clone())
        }
      }
    }

    // Update direction every frame
    let animationId: number
    function animate() {
      updateDirection()
      animationId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [])

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '18px',
        }}
      >
        Loading Matterport tour...
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '18px',
          color: 'red',
        }}
      >
        Error: {error}
      </div>
    )
  }

  // Always render ThreeScene so it can initialize
  // Only render PanoramaViewer, NavigationControls, and Minimap when we have both scene and currentSweep
  return (
    <>
      <ThreeScene
        ref={setThreeSceneRef}
        onCameraChange={handleCameraChange}
        onFovChange={handleFovChange}
      />
      {scene && currentSweep && (
        <>
          <PanoramaViewer
            sweepUuid={currentSweep.sweep_uuid}
            scene={scene}
            resolution={currentResolution}
          />
          <NavigationControls
            sweeps={sweeps}
            currentSweep={currentSweep}
            onNavigate={handleNavigate}
            resolution={currentResolution}
            resolutionMode={resolutionMode}
            onResolutionModeChange={handleResolutionModeChange}
          />
          <Minimap
            sweeps={sweeps}
            currentSweep={currentSweep}
            cameraDirection={cameraDirection}
            onNavigate={handleNavigate}
          />
        </>
      )}
    </>
  )
}

export default App
