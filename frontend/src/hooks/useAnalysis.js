import { useState, useEffect } from 'react'
import { api, DEMO_FREIHEITSPROFIL } from '../utils/api.js'

export function useAnalysis(analysisId = 'demo') {
  const [profil, setProfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        if (analysisId === 'demo') throw new Error('use demo')
        const data = await api.getFreiheitsprofil(analysisId)
        if (!cancelled) {
          setProfil(data)
          setIsDemo(false)
        }
      } catch {
        if (!cancelled) {
          setProfil(DEMO_FREIHEITSPROFIL)
          setIsDemo(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [analysisId])

  return { profil, loading, error, isDemo }
}
