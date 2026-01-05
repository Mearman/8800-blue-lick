import { useState, useEffect } from 'react'
import { getAssetsBaseUrl } from '../utils/assetUrl'
import type { Sweep } from '../types/matterport'

/**
 * Normalize sweep data to handle edge cases
 * - Forces all room -1 (exterior) sweeps to floor 0
 */
function normalizeSweeps(sweeps: Sweep[]): Sweep[] {
  return sweeps.map((sweep) => ({
    ...sweep,
    // Force room -1 exterior sweeps to floor 0 for consistency
    floor_index: sweep.room_index === -1 ? 0 : sweep.floor_index,
  }))
}

/**
 * React hook to load and parse Matterport sweeps metadata
 * @returns Object containing sweeps array, loading state, and error
 */
export function useSweepsData() {
  const [sweeps, setSweeps] = useState<Sweep[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadSweeps() {
      console.log('useSweepsData: Starting load...')
      try {
        const url = `${getAssetsBaseUrl()}BGMifUnvLxQ/metadata/sweeps.json`
        console.log('useSweepsData: Fetching', url)
        const response = await fetch(url)
        console.log('useSweepsData: Response', { ok: response.ok, status: response.status, statusText: response.statusText })
        if (!response.ok) {
          throw new Error(`Failed to load sweeps.json: ${response.statusText}`)
        }
        const data: Sweep[] = await response.json()
        console.log('useSweepsData: Data loaded', { count: data.length, first: data[0] })

        // Normalize data to handle edge cases
        const normalized = normalizeSweeps(data)
        const roomMinusOneCount = data.filter((s) => s.room_index === -1).length
        console.log('useSweepsData: Normalized data', { roomMinusOneForcedToFloor0: roomMinusOneCount })

        setSweeps(normalized)
        setLoading(false)
        console.log('useSweepsData: State updated')
      } catch (err) {
        console.error('useSweepsData: Error', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    loadSweeps()
  }, [])

  return { sweeps, loading, error }
}
