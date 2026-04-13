import { useState, useEffect } from 'react'
import { api, DEMO_GRAPH, DEMO_GAPS, DEMO_BRIDGES } from '../utils/api.js'

/**
 * useGraphData — loads knowledge graph data for a given vault.
 *
 * For 'lebergott' vault:
 *   - Fetches vault graph from /graph/lebergott (demo)
 *   - Also fetches live InfraNodus gaps + bridges from /graphs/live
 *
 * Falls back to DEMO_* constants when backend is unreachable.
 */
export function useGraphData(vaultId = 'demo') {
  const [data, setData] = useState(null)
  const [gaps, setGaps] = useState([])
  const [bridges, setBridges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isDemo, setIsDemo] = useState(false)
  const [liveSource, setLiveSource] = useState(null) // 'live' | 'cached' | null

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        if (vaultId === 'demo') throw new Error('use demo')

        // Fetch vault graph + live InfraNodus data in parallel
        const isLebergott = vaultId === 'lebergott'
        const requests = [
          api.getGraph(vaultId),
          isLebergott ? api.getGraphsLive() : api.getGaps(vaultId),
        ]

        const [graphData, liveOrGapsData] = await Promise.all(requests)

        if (!cancelled) {
          setData(graphData)

          if (isLebergott && liveOrGapsData) {
            // Live InfraNodus data: {gaps, bridges, source, ...}
            setGaps(liveOrGapsData.gaps || [])
            setBridges(liveOrGapsData.bridges || [])
            setLiveSource(liveOrGapsData.source || 'cached')
          } else {
            // Standard vault gap data: {gaps: [...]}
            setGaps(liveOrGapsData?.gaps || [])
            setBridges([])
            setLiveSource(null)
          }

          setIsDemo(false)
        }
      } catch {
        // Backend offline or demo mode → use hardcoded demo data
        if (!cancelled) {
          setData(DEMO_GRAPH)
          setGaps(DEMO_GAPS)
          setBridges(DEMO_BRIDGES)
          setIsDemo(true)
          setLiveSource('demo')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [vaultId])

  return { data, gaps, bridges, loading, error, isDemo, liveSource }
}
