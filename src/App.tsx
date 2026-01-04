import { useState, useEffect, useRef } from 'react'
import { ThreeScene, type ThreeSceneRef } from './components/ThreeScene'
import { PanoramaViewer } from './components/PanoramaViewer'
import { NavigationControls } from './components/NavigationControls'
import { useSweepsData } from './hooks/useSweepsData'
import { useViewURL } from './hooks/useViewURL'
import type { Sweep, ViewURLState } from './types/matterport'
import * as THREE from 'three'

function App() {
  const { sweeps, loading, error } = useSweepsData()
  const [currentSweep, setCurrentSweep] = useState<Sweep | null>(null)
  const [scene, setScene] = useState<THREE.Scene | null>(null)
  const threeSceneRef = useRef<ThreeSceneRef>(null)
  const lastCameraUpdateRef = useRef<number>(0)
  const pendingURLStateRef = useRef<ViewURLState | null>(null)

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

      // Restore camera position after scene is ready
      setTimeout(() => {
        if (threeSceneRef.current) {
          const position = new THREE.Vector3(state.x, state.y, state.z)
          const target = new THREE.Vector3(0, 0, 0) // Look at center
          threeSceneRef.current.setCameraPosition(position, target)
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

    // Throttle updates to avoid excessive URL changes
    const now = Date.now()
    if (now - lastCameraUpdateRef.current < DEBOUNCE_MS) return
    lastCameraUpdateRef.current = now

    updateURL({
      sweep: currentSweep.sweep_uuid,
      x: position.x,
      y: position.y,
      z: position.z,
      pitch,
      yaw,
    })
  }

  // Handle navigation to a different sweep
  const handleNavigate = (sweepUuid: string) => {
    const sweep = sweeps.find((s) => s.sweep_uuid === sweepUuid)
    if (sweep) {
      setCurrentSweep(sweep)
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
  // Only render PanoramaViewer and NavigationControls when we have both scene and currentSweep
  return (
    <>
      <ThreeScene ref={setThreeSceneRef} onCameraChange={handleCameraChange} />
      {scene && currentSweep && (
        <>
          <PanoramaViewer sweepUuid={currentSweep.sweep_uuid} scene={scene} />
          <NavigationControls sweeps={sweeps} currentSweep={currentSweep} onNavigate={handleNavigate} />
        </>
      )}
    </>
  )
}

const DEBOUNCE_MS = 500

export default App
