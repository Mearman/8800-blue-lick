import { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

interface ThreeSceneProps {
  onCameraChange?: (position: THREE.Vector3, pitch: number, yaw: number) => void
}

export interface ThreeSceneRef {
  getCamera: () => THREE.PerspectiveCamera | null
  getScene: () => THREE.Scene | null
  setCameraPosition: (position: THREE.Vector3, target: THREE.Vector3) => void
}

/**
 * Main Three.js scene component with camera, renderer, and controls
 * Provides imperative handle for parent components to control camera
 */
export const ThreeScene = forwardRef<ThreeSceneRef, ThreeSceneProps>(
  ({ onCameraChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<THREE.Scene | null>(null)
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
    const controlsRef = useRef<OrbitControls | null>(null)
    const onCameraChangeRef = useRef(onCameraChange)
    const [sceneReady, setSceneReady] = useState(false)

    // Update callback ref when prop changes
    useEffect(() => {
      onCameraChangeRef.current = onCameraChange
    }, [onCameraChange])

    // Expose camera and scene methods via ref
    useImperativeHandle(
      ref,
      () => ({
        getCamera: () => cameraRef.current,
        getScene: () => sceneRef.current,
        setCameraPosition: (position: THREE.Vector3, target: THREE.Vector3) => {
          if (cameraRef.current && controlsRef.current) {
            cameraRef.current.position.copy(position)
            controlsRef.current.target.copy(target)
            controlsRef.current.update()
          }
        },
      }),
      [sceneReady] // Update when scene is ready
    )

    useEffect(() => {
      if (!containerRef.current) return

      // Create scene
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x000000) // Black background for visibility
      sceneRef.current = scene
      setSceneReady(true) // Notify parent that scene is ready

      // Create camera
      const camera = new THREE.PerspectiveCamera(
        75, // FOV
        window.innerWidth / window.innerHeight, // Aspect ratio
        0.01, // Near - reduced to see closer objects
        1000 // Far
      )
      camera.position.set(0, 0, 0) // Start at exact center
      camera.lookAt(0, 0, 1) // Look forward along Z axis
      cameraRef.current = camera

      // Create renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.setPixelRatio(window.devicePixelRatio)

      // Style the canvas element explicitly
      const canvas = renderer.domElement
      canvas.style.display = 'block'
      canvas.style.width = '100%'
      canvas.style.height = '100%'

      containerRef.current.appendChild(canvas)
      rendererRef.current = renderer

      // Create controls
      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true // Smooth motion
      controls.dampingFactor = 0.05
      controls.rotateSpeed = -0.5 // Invert for natural feel
      controls.enableZoom = true
      controls.zoomSpeed = 1.0
      controls.minDistance = 0.1
      controls.maxDistance = 5
      controls.enablePan = false
      controls.target.set(0, 0, 1) // Look at +Z direction
      controlsRef.current = controls

      // Animation loop
      let animationFrameId: number
      function animate() {
        animationFrameId = requestAnimationFrame(animate)

        controls.update()

        // Notify parent of camera changes
        if (onCameraChangeRef.current && cameraRef.current) {
          const position = cameraRef.current.position
          const direction = new THREE.Vector3()
          cameraRef.current.getWorldDirection(direction)

          // Calculate pitch and yaw from direction
          const pitch = Math.asin(direction.y)
          const yaw = Math.atan2(direction.x, direction.z)

          onCameraChangeRef.current(position.clone(), pitch, yaw)
        }

        renderer.render(scene, camera)
      }
      animate()

      // Handle window resize
      function handleResize() {
        if (!cameraRef.current || !rendererRef.current) return

        cameraRef.current.aspect = window.innerWidth / window.innerHeight
        cameraRef.current.updateProjectionMatrix()
        rendererRef.current.setSize(window.innerWidth, window.innerHeight)
      }
      window.addEventListener('resize', handleResize)

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize)
        cancelAnimationFrame(animationFrameId)

        if (rendererRef.current && containerRef.current) {
          containerRef.current.removeChild(rendererRef.current.domElement)
          rendererRef.current.dispose()
        }

        if (controlsRef.current) {
          controlsRef.current.dispose()
        }
      }
    }, [])

    return (
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          zIndex: 0,
        }}
      />
    )
  }
)
