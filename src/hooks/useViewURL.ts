import { useEffect, useRef, useCallback } from 'react'
import type { ViewURLState } from '../types/matterport'

const DEBOUNCE_MS = 150 // Update URL 150ms after user stops interacting

/**
 * React hook to synchronize view state with URL parameters
 * Enables shareable URLs and browser history navigation
 */
export function useViewURL(onStateFromURL: (state: ViewURLState) => void) {
  const isInitializedRef = useRef(false)
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Parse URL params on mount
  useEffect(() => {
    if (isInitializedRef.current) {
      return
    }
    isInitializedRef.current = true

    const params = new URLSearchParams(window.location.search)

    const sweep = params.get('sweep')
    const x = params.get('x')
    const y = params.get('y')
    const z = params.get('z')
    const pitch = params.get('pitch')
    const yaw = params.get('yaw')
    const fov = params.get('fov')

    // If all required params exist, restore state
    if (sweep && x && y && z && pitch && yaw) {
      onStateFromURL({
        sweep,
        x: parseFloat(x),
        y: parseFloat(y),
        z: parseFloat(z),
        pitch: parseFloat(pitch),
        yaw: parseFloat(yaw),
        ...(fov && { fov: parseFloat(fov) }), // Include fov if present
      })
    }
  }, [onStateFromURL])

  // Update URL when view state changes (debounced)
  const updateURL = useCallback(
    (state: ViewURLState) => {
      // Clear existing timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }

      // Debounce the update - only update after user stops interacting
      updateTimeoutRef.current = setTimeout(() => {
        const params = new URLSearchParams()

        params.set('sweep', state.sweep)
        params.set('x', state.x.toString())
        params.set('y', state.y.toString())
        params.set('z', state.z.toString())
        params.set('pitch', state.pitch.toString())
        params.set('yaw', state.yaw.toString())

        // Include fov in URL if provided
        if (state.fov !== undefined) {
          params.set('fov', state.fov.toString())
        }

        const newURL = `${window.location.pathname}?${params.toString()}`

        // Use replaceState to avoid filling browser history
        window.history.replaceState({}, '', newURL)
      }, DEBOUNCE_MS)
    },
    []
  )

  // Handle browser back/forward buttons
  useEffect(() => {
    function handlePopState() {
      const params = new URLSearchParams(window.location.search)

      const sweep = params.get('sweep')
      const x = params.get('x')
      const y = params.get('y')
      const z = params.get('z')
      const pitch = params.get('pitch')
      const yaw = params.get('yaw')
      const fov = params.get('fov')

      if (sweep && x && y && z && pitch !== null && yaw !== null) {
        onStateFromURL({
          sweep,
          x: parseFloat(x),
          y: parseFloat(y),
          z: parseFloat(z),
          pitch: parseFloat(pitch),
          yaw: parseFloat(yaw),
          ...(fov && { fov: parseFloat(fov) }), // Include fov if present
        })
      }
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [onStateFromURL])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [])

  return { updateURL }
}
