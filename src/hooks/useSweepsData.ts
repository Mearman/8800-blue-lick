import { useState, useEffect } from 'react'
import type { Sweep } from '../types/matterport'

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
        const url = `${import.meta.env.BASE_URL}assets/BGMifUnvLxQ/metadata/sweeps.json`
        console.log('useSweepsData: Fetching', url)
        const response = await fetch(url)
        console.log('useSweepsData: Response', { ok: response.ok, status: response.status, statusText: response.statusText })
        if (!response.ok) {
          throw new Error(`Failed to load sweeps.json: ${response.statusText}`)
        }
        const data: Sweep[] = await response.json()
        console.log('useSweepsData: Data loaded', { count: data.length, first: data[0] })
        setSweeps(data)
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
