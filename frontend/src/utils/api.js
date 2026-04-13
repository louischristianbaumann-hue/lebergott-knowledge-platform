/* ============================================================
   SYNODEA — API Client
   Thin fetch wrapper with error handling + demo data fallback
   ============================================================ */

// Production: set VITE_API_URL in Vercel dashboard → pointing to Railway backend
// Railway URL format: https://[project]-production.up.railway.app
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/v1'

// Retry with exponential backoff — 3 attempts, 400ms/800ms/1600ms delays
async function request(path, options = {}, retries = 3) {
  const url = `${BASE_URL}${path}`
  let lastError

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const signal = options.signal || AbortSignal.timeout(10000)
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
        signal,
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        // Don't retry 4xx errors — they won't change
        if (res.status >= 400 && res.status < 500) {
          throw new Error(`API ${res.status}: ${text || res.statusText}`)
        }
        lastError = new Error(`API ${res.status}: ${text || res.statusText}`)
        if (attempt < retries - 1) {
          await new Promise(r => setTimeout(r, 400 * Math.pow(2, attempt)))
          continue
        }
        throw lastError
      }
      return res.json()
    } catch (err) {
      // Don't retry user-aborted requests
      if (err.name === 'AbortError') throw err
      lastError = err
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, 400 * Math.pow(2, attempt)))
      }
    }
  }
  throw lastError
}

// No-retry variant for one-shot calls (auth, chat)
async function requestOnce(path, options = {}) {
  return request(path, options, 1)
}

export const api = {
  // Graph data for a vault
  getGraph: (vaultId) => request(`/graph/${vaultId}`),

  // Freiheitsprofil radar data
  getFreiheitsprofil: (analysisId) => request(`/freiheitsprofil/${analysisId}`),

  // Knowledge gaps (vault-based)
  getGaps: (vaultId) => request(`/gaps/${vaultId}`),

  // Bridge recommendations
  getBridges: (vaultId) => request(`/bridges/${vaultId}`),

  // Pre-loaded demo (Lebergott)
  getDemo: () => request('/demo/lebergott'),

  // Node file content
  getNode: (vaultId, nodeId) => request(`/node/${vaultId}/${nodeId}`),

  // Health check
  health: () => request('/health', {}, 1),

  // ── InfraNodus Live ──────────────────────────────────────────────────
  // All 6 Lebergott graphs: gaps + bridges + clusters + stats
  getGraphsLive: () => request('/graphs/live'),

  // Single Lebergott InfraNodus graph
  getGraphLive: (graphName) => request(`/graphs/live/${graphName}`),

  // Live gaps from all Lebergott InfraNodus graphs
  getLebergottGaps: () => request('/lebergott/gaps'),

  // Live bridges from all Lebergott InfraNodus graphs
  getLebergottBridges: () => request('/lebergott/bridges'),
}

// ---- Demo data (used when backend is offline) ----

export const DEMO_GRAPH = {
  nodes: [
    // Cluster 0 — Leberregeneration (26% density — biggest cluster)
    { id: 'konzepte-map', label: 'Konzepte-Map', cluster: 0, connections: 84, isHub: true },
    { id: 'leber-heisst-leben', label: 'Leber heißt Leben', cluster: 0, connections: 77, isHub: true },
    { id: 'mariendistel', label: 'Mariendistel', cluster: 0, connections: 12 },
    { id: 'loewenzahn', label: 'Löwenzahn', cluster: 0, connections: 9 },
    { id: 'selbstheilungskraft', label: 'Selbstheilungskraft', cluster: 0, connections: 46, isHub: true },
    { id: 'leberregeneration', label: 'Leberregeneration', cluster: 0, connections: 28 },
    { id: 'gemuese-regeneration', label: 'Gemüse als Regenerator', cluster: 0, connections: 15 },

    // Cluster 1 — Fett & Belastung (37% in Konzepte)
    { id: 'fett-hauptbelastung', label: 'Fett als Hauptbelastung', cluster: 1, connections: 54, isHub: true },
    { id: 'leberkonform', label: 'Leberkonform leben', cluster: 1, connections: 51, isHub: true },
    { id: 'fettleber', label: 'Fettleber', cluster: 1, connections: 22 },
    { id: 'fett-zucker-synergie', label: 'Fett-Zucker-Synergie', cluster: 1, connections: 18 },
    { id: 'cholesterin', label: 'Cholesterin als Symptom', cluster: 1, connections: 14 },
    { id: 'fettreduktion', label: 'Fettreduktion', cluster: 1, connections: 11 },

    // Cluster 2 — Entgiftung & Detox
    { id: 'entgiftung', label: 'Entgiftung', cluster: 2, connections: 32 },
    { id: 'schwermetalle', label: 'Schwermetalle', cluster: 2, connections: 16 },
    { id: 'quecksilber', label: 'Quecksilber', cluster: 2, connections: 10 },
    { id: 'zahnmetalle', label: 'Zahnfüllungen als Quelle', cluster: 2, connections: 8 },
    { id: 'toxine', label: 'Toxische Belastungen', cluster: 2, connections: 19 },

    // Cluster 3 — Nervensystem & Stress
    { id: 'stress', label: 'Stressbewältigung', cluster: 3, connections: 24 },
    { id: 'vagusnerv', label: 'Vagusnerv', cluster: 3, connections: 13 },
    { id: 'adrenalin', label: 'Adrenalinüberschuss', cluster: 3, connections: 15 },
    { id: 'ashwagandha', label: 'Ashwagandha', cluster: 3, connections: 7 },
    { id: 'kaelteexposition', label: 'Kälteexposition', cluster: 3, connections: 9 },

    // Cluster 4 — Verdauung & Darm
    { id: 'verdauung', label: 'Verdauungsoptimierung', cluster: 4, connections: 20 },
    { id: 'darmgesundheit', label: 'Darmgesundheit', cluster: 4, connections: 18 },
    { id: 'mikrobiom', label: 'Mikrobiom', cluster: 4, connections: 12 },
    { id: 'probiotika', label: 'Probiotika', cluster: 4, connections: 8 },
    { id: 'apfelessig', label: 'Apfelessig', cluster: 4, connections: 6 },

    // Cluster 5 — Anatomie & Zelle
    { id: 'leberstoffwechsel', label: 'Leberstoffwechsel', cluster: 5, connections: 27 },
    { id: 'mitochondrien', label: 'Mitochondrien', cluster: 5, connections: 16 },
    { id: 'zellgesundheit', label: 'Zellgesundheit', cluster: 5, connections: 14 },
    { id: 'glukose', label: 'Glukose-Stoffwechsel', cluster: 5, connections: 11 },

    // Cluster 6 — Ganzheit & Ernährung
    { id: 'ganzheit', label: 'Ganzheitlicher Ansatz', cluster: 6, connections: 22 },
    { id: 'schlaf', label: 'Schlafqualität', cluster: 6, connections: 13 },
    { id: 'immunsystem', label: 'Immunstärkung', cluster: 6, connections: 10 },
    { id: 'hormone', label: 'Hormongesundheit', cluster: 6, connections: 8 },
    { id: 'wasser', label: 'Wasserbedarf', cluster: 6, connections: 9 },

    // Gaps (isolated — Session-Transkripte)
    { id: 'gap-session-1', label: 'Session 1 Transkript', cluster: -1, connections: 1, isGap: true },
    { id: 'gap-session-2', label: 'Session 2 Transkript', cluster: -1, connections: 0, isGap: true },
    { id: 'gap-session-3', label: 'Session 3 Transkript', cluster: -1, connections: 1, isGap: true },
    { id: 'gap-session-4', label: 'Session 4 Transkript', cluster: -1, connections: 0, isGap: true },
    { id: 'gap-enzyme', label: 'Enzym-Aktivierung', cluster: -1, connections: 2, isGap: true },
  ],
  links: [
    // Regeneration cluster
    { source: 'konzepte-map', target: 'leber-heisst-leben', strength: 0.95 },
    { source: 'konzepte-map', target: 'selbstheilungskraft', strength: 0.9 },
    { source: 'konzepte-map', target: 'fett-hauptbelastung', strength: 0.85 },
    { source: 'konzepte-map', target: 'leberkonform', strength: 0.88 },
    { source: 'leber-heisst-leben', target: 'leberregeneration', strength: 0.92 },
    { source: 'leber-heisst-leben', target: 'selbstheilungskraft', strength: 0.85 },
    { source: 'leberregeneration', target: 'mariendistel', strength: 0.75 },
    { source: 'leberregeneration', target: 'loewenzahn', strength: 0.7 },
    { source: 'leberregeneration', target: 'gemuese-regeneration', strength: 0.8 },
    { source: 'selbstheilungskraft', target: 'ganzheit', strength: 0.7 },

    // Fett & Belastung
    { source: 'fett-hauptbelastung', target: 'leberkonform', strength: 0.9 },
    { source: 'fett-hauptbelastung', target: 'fettleber', strength: 0.85 },
    { source: 'fett-hauptbelastung', target: 'fett-zucker-synergie', strength: 0.8 },
    { source: 'fettleber', target: 'cholesterin', strength: 0.65 },
    { source: 'fettleber', target: 'fettreduktion', strength: 0.75 },
    { source: 'fett-zucker-synergie', target: 'glukose', strength: 0.6 },
    { source: 'leberkonform', target: 'verdauung', strength: 0.65 },

    // Entgiftung
    { source: 'entgiftung', target: 'schwermetalle', strength: 0.85 },
    { source: 'entgiftung', target: 'toxine', strength: 0.9 },
    { source: 'entgiftung', target: 'leber-heisst-leben', strength: 0.75 },
    { source: 'schwermetalle', target: 'quecksilber', strength: 0.8 },
    { source: 'schwermetalle', target: 'zahnmetalle', strength: 0.7 },
    { source: 'toxine', target: 'fettleber', strength: 0.6 },

    // Nervensystem
    { source: 'stress', target: 'vagusnerv', strength: 0.8 },
    { source: 'stress', target: 'adrenalin', strength: 0.85 },
    { source: 'vagusnerv', target: 'kaelteexposition', strength: 0.7 },
    { source: 'vagusnerv', target: 'darmgesundheit', strength: 0.65 },
    { source: 'adrenalin', target: 'ashwagandha', strength: 0.6 },
    { source: 'stress', target: 'schlaf', strength: 0.55 },

    // Verdauung & Darm
    { source: 'verdauung', target: 'darmgesundheit', strength: 0.85 },
    { source: 'darmgesundheit', target: 'mikrobiom', strength: 0.8 },
    { source: 'mikrobiom', target: 'probiotika', strength: 0.75 },
    { source: 'verdauung', target: 'apfelessig', strength: 0.55 },
    { source: 'darmgesundheit', target: 'immunsystem', strength: 0.6 },

    // Anatomie
    { source: 'leberstoffwechsel', target: 'mitochondrien', strength: 0.8 },
    { source: 'leberstoffwechsel', target: 'zellgesundheit', strength: 0.75 },
    { source: 'leberstoffwechsel', target: 'glukose', strength: 0.85 },
    { source: 'leberstoffwechsel', target: 'leber-heisst-leben', strength: 0.9 },
    { source: 'mitochondrien', target: 'zellgesundheit', strength: 0.7 },

    // Ganzheit
    { source: 'ganzheit', target: 'schlaf', strength: 0.65 },
    { source: 'ganzheit', target: 'immunsystem', strength: 0.6 },
    { source: 'ganzheit', target: 'hormone', strength: 0.55 },
    { source: 'ganzheit', target: 'wasser', strength: 0.5 },

    // Cross-cluster bridges
    { source: 'entgiftung', target: 'leberstoffwechsel', strength: 0.75 },
    { source: 'stress', target: 'fett-hauptbelastung', strength: 0.5 },
    { source: 'kaelteexposition', target: 'immunsystem', strength: 0.55 },
    { source: 'mitochondrien', target: 'stress', strength: 0.45 },
    { source: 'fettreduktion', target: 'verdauung', strength: 0.5 },
    { source: 'toxine', target: 'darmgesundheit', strength: 0.4 },
    { source: 'hormone', target: 'adrenalin', strength: 0.5 },
    { source: 'wasser', target: 'entgiftung', strength: 0.55 },

    // Gap connections (weak)
    { source: 'gap-session-1', target: 'konzepte-map', strength: 0.15 },
    { source: 'gap-session-3', target: 'fett-hauptbelastung', strength: 0.1 },
    { source: 'gap-enzyme', target: 'verdauung', strength: 0.2 },
    { source: 'gap-enzyme', target: 'entgiftung', strength: 0.15 },
  ],
  clusters: [
    { id: 0, label: 'Leberregeneration', color: '#00ff88' },
    { id: 1, label: 'Fett & Belastung', color: '#ff8855' },
    { id: 2, label: 'Entgiftung & Detox', color: '#dd5544' },
    { id: 3, label: 'Nervensystem', color: '#aa88ff' },
    { id: 4, label: 'Verdauung & Darm', color: '#55bbdd' },
    { id: 5, label: 'Anatomie & Zelle', color: '#88ddaa' },
    { id: 6, label: 'Ganzheit', color: '#ddcc44' },
  ],
}

export const DEMO_FREIHEITSPROFIL = {
  analysisId: 'lebergott-demo',
  brand: 'Lebergott',
  archetype: 'Ganzheitlicher Gesundheitslehrer',
  freiheitsindex: 4.1,
  dimensions: [
    { id: 'regeneration', label: 'Regenerationswissen', score: 4.8, description: 'Tiefes Verständnis der Leber-Selbstheilung' },
    { id: 'entgiftung', label: 'Entgiftungskompetenz', score: 4.5, description: 'Schwermetalle, Toxine, Detox-Protokolle' },
    { id: 'ernaehrung', label: 'Ernährungsintelligenz', score: 4.2, description: 'Fett-Zucker-Synergie, leberkonformes Leben' },
    { id: 'nervensystem', label: 'Nervensystem-Verständnis', score: 3.6, description: 'Vagus, Stress, Adaptogene' },
    { id: 'darm', label: 'Darm-Kompetenz', score: 3.4, description: 'Mikrobiom, Verdauung, Probiotika' },
    { id: 'anatomie', label: 'Anatomisches Wissen', score: 4.0, description: 'Zelle, Mitochondrien, Stoffwechsel' },
    { id: 'ganzheit', label: 'Ganzheitliche Vision', score: 3.8, description: 'Schlaf, Hormone, Immunsystem als System' },
  ],
}

export const DEMO_GAPS = [
  {
    id: 'gap-session-1',
    title: 'Session 1 Transkript',
    reason: 'Komplett isoliert — keine [[Wikilinks]] zu Konzept-Notes',
    bridge: 'Verbinde mit Konzepte-Map → extrahiere Schlüsselerkenntnisse als eigene Notes',
    connections: 1,
  },
  {
    id: 'gap-session-2',
    title: 'Session 2 Transkript',
    reason: 'Völlig isoliert — kein einziger Wikilink gesetzt',
    bridge: 'Verknüpfe Fett-Passagen mit "Fett als Hauptbelastung" und Entgiftungs-Themen',
    connections: 0,
  },
  {
    id: 'gap-session-3',
    title: 'Session 3 Transkript',
    reason: 'Nur 1 schwache Verbindung — wichtige Inhalte nicht vernetzt',
    bridge: 'Enthält Stress-Themen → verlinke zu Vagusnerv und Stressbewältigung',
    connections: 1,
  },
  {
    id: 'gap-session-4',
    title: 'Session 4 Transkript',
    reason: 'Komplett isoliert — Darm-Themen ohne Anbindung',
    bridge: 'Verknüpfe mit Darmgesundheit, Mikrobiom und Verdauungsoptimierung',
    connections: 0,
  },
  {
    id: 'gap-enzyme',
    title: 'Enzym-Aktivierung',
    reason: 'Fehlende Brücke zwischen Entgiftung und Verdauung',
    bridge: 'Enzymaktivierung als Verbindungsglied — Phase-spezifische Detox-Protokolle',
    connections: 2,
  },
]

export const DEMO_BRIDGES = [
  {
    id: 'bridge-1',
    title: 'Vagusnerv → Immunsystem',
    connects: 'Nervensystem ↔ Ganzheit',
    why: 'Vagale Immunologie — Kälteexposition aktiviert Vagusnerv → entzündungshemmend → stärkt Immunfunktion',
    strength: 0.85,
  },
  {
    id: 'bridge-2',
    title: 'Entgiftung → Verdauung',
    connects: 'Entgiftung ↔ Verdauung & Darm',
    why: 'Enzymaktivierung als Brücke — Phase-spezifische Detox braucht Verdauungsenzyme',
    strength: 0.78,
  },
  {
    id: 'bridge-3',
    title: 'Mitochondrien → Stress',
    connects: 'Anatomie ↔ Nervensystem',
    why: 'Mitochondriale Resilienz — ATP-Produktion × Cortisol-Regulierung als integriertes System',
    strength: 0.72,
  },
  {
    id: 'bridge-4',
    title: 'Kälteexposition → Darmgesundheit',
    connects: 'Nervensystem ↔ Verdauung',
    why: 'Systemische Resilienz — Kälte aktiviert Vagus → bessere Darmbarriere → stärkeres Mikrobiom',
    strength: 0.65,
  },
]
