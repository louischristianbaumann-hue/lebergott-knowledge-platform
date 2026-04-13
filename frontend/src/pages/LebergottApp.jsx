/* ============================================================
   LebergottApp.jsx — Knowledge Network for Lebergott Akademie

   Design: Matches lebergott.com brand identity.
   Warm, organic, editorial. Forest green + gold + cream.
   "Leber heißt Leben. Ohne Leber ist alles nichts."

   Features:
   - Fullscreen MyceliumGraph
   - Bottom nav: Chat / Lücken / Brücken
   - [[Wikilink]] clicks in chat → navigate to graph node
   - Node click → rich NodeDetail panel with "Ask about" CTA
   - Personalized node highlights from onboarding profile
   ============================================================ */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import MyceliumGraph from '../components/MyceliumGraph.jsx'
import ChatPanel from '../components/ChatPanel.jsx'
import GapPanel from '../components/GapPanel.jsx'
import BridgePanel from '../components/BridgePanel.jsx'
import LoadingPulse from '../components/LoadingPulse.jsx'
import { DEMO_GRAPH, DEMO_GAPS, DEMO_BRIDGES } from '../utils/api.js'
import { useAuth } from '../context/AuthContext.jsx'

const BASE_URL    = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
const N8N_WEBHOOK = 'https://n8n-production-6fe9.up.railway.app/webhook/lebergott-bot'
const N8N_AUTH    = '419f12f0bc4c8bc8d6a5625fede2d28b51b618200a199ad28e42fbb4fd3b852a'

const brand = {
  forest:     '#1a3a2a',
  forestDeep: '#0f2418',
  forestLight:'#2a5a3a',
  gold:       '#c5a55a',
  goldDim:    '#9e8648',
  goldGlow:   'rgba(197, 165, 90, 0.15)',
  cream:      '#faf9f5',
  creamDim:   '#e8e6dc',
  warmGray:   '#b0aea5',
  text:       '#2c2c2a',
  textMuted:  '#6a6860',
  leafBg:     'linear-gradient(135deg, #1a3a2a 0%, #0f2418 40%, #1a3028 100%)',
}

const SYMPTOM_NODES = {
  'Müdigkeit':          ['leberstoffwechsel', 'mitochondrien', 'zellgesundheit', 'schlaf'],
  'Verdauungsprobleme': ['verdauung', 'darmgesundheit', 'mikrobiom', 'probiotika'],
  'Hautprobleme':       ['entgiftung', 'toxine', 'leberregeneration'],
  'Übergewicht':        ['fett-hauptbelastung', 'fettleber', 'fettreduktion', 'fett-zucker-synergie'],
  'Stress':             ['stress', 'vagusnerv', 'adrenalin', 'ashwagandha'],
  'Schlechter Schlaf':  ['schlaf', 'stress', 'vagusnerv'],
  'Cholesterin':        ['cholesterin', 'fett-hauptbelastung', 'fettleber'],
  'Entzündungen':       ['immunsystem', 'entgiftung', 'darmgesundheit'],
  'Hormonstörungen':    ['hormone', 'ganzheit', 'stress'],
  'Schmerzen':          ['entgiftung', 'ganzheit', 'immunsystem'],
  'Leber':              ['leber-heisst-leben', 'leberregeneration', 'leberstoffwechsel', 'mariendistel'],
  'Energie':            ['mitochondrien', 'zellgesundheit', 'leberstoffwechsel', 'schlaf'],
  'Schwermetalle':      ['schwermetalle', 'quecksilber', 'zahnmetalle', 'entgiftung'],
  'Detox':              ['entgiftung', 'toxine', 'schwermetalle', 'wasser'],
  'Darm':               ['darmgesundheit', 'mikrobiom', 'probiotika', 'verdauung'],
  'Energiemangel':      ['mitochondrien', 'zellgesundheit', 'leberstoffwechsel'],
}

function resolvePersonalizedNodes(beschwerden = [], hauptziel = '') {
  const allTerms = [...(Array.isArray(beschwerden) ? beschwerden : [beschwerden]), hauptziel].filter(Boolean)
  const nodeSet = new Set()
  allTerms.forEach((term) => {
    const termLower = term.toLowerCase()
    Object.entries(SYMPTOM_NODES).forEach(([key, nodes]) => {
      if (termLower.includes(key.toLowerCase()) || key.toLowerCase().includes(termLower)) {
        nodes.forEach((n) => nodeSet.add(n))
      }
    })
  })
  return [...nodeSet]
}

// ── Stat pill ──────────────────────────────────────────────────────
function StatPill({ value, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: '4px',
      padding: '4px 10px',
      background: 'rgba(197, 165, 90, 0.08)',
      borderRadius: '16px',
      border: '1px solid rgba(197, 165, 90, 0.15)',
    }}>
      <span style={{
        fontSize: '0.95rem', fontWeight: 600, color: brand.gold,
        fontFamily: "'Playfair Display', Georgia, serif",
      }}>{value}</span>
      <span style={{
        fontSize: '0.55rem', color: brand.warmGray,
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: '0.05em', textTransform: 'uppercase',
      }}>{label}</span>
    </div>
  )
}

// ── Floating panel ─────────────────────────────────────────────────
function FloatingPanel({ children, isOpen, onClose, title, position = 'bottom' }) {
  const positions = {
    bottom: { bottom: 0, left: 0, right: 0, maxHeight: isOpen ? '62vh' : '0', borderRadius: '18px 18px 0 0' },
    left:   { top: 60, left: 0, bottom: 56, width: isOpen ? 'min(340px, 88vw)' : '0', borderRadius: '0 14px 14px 0' },
    right:  { top: 60, right: 0, bottom: 56, width: isOpen ? 'min(340px, 88vw)' : '0', borderRadius: '14px 0 0 14px' },
  }
  return (
    <div style={{
      position: 'fixed', zIndex: 50,
      overflow: 'hidden',
      transition: 'all 0.38s cubic-bezier(0.16, 1, 0.3, 1)',
      background: 'rgba(250, 249, 245, 0.97)',
      backdropFilter: 'blur(24px)',
      boxShadow: isOpen ? '0 -4px 40px rgba(0,0,0,0.18)' : 'none',
      borderTop: position === 'bottom' && isOpen ? `2px solid rgba(197,165,90,0.25)` : 'none',
      borderRight: position === 'left' && isOpen ? `1px solid rgba(197,165,90,0.12)` : 'none',
      borderLeft: position === 'right' && isOpen ? `1px solid rgba(197,165,90,0.12)` : 'none',
      ...positions[position],
    }}>
      {position === 'bottom' && (
        <div onClick={onClose} style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px', cursor: 'pointer' }}>
          <div style={{ width: 36, height: 3, borderRadius: 3, background: 'rgba(26,58,42,0.15)' }} />
        </div>
      )}
      {title && isOpen && (
        <div style={{
          padding: '8px 16px 6px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid rgba(26,58,42,0.08)`,
        }}>
          <span style={{
            fontSize: '0.82rem', fontWeight: 700, color: brand.forest,
            fontFamily: "'Playfair Display', Georgia, serif",
          }}>{title}</span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: brand.warmGray,
            fontSize: '1.1rem', cursor: 'pointer', padding: '0 4px', lineHeight: 1,
          }}>×</button>
        </div>
      )}
      <div style={{ overflow: 'auto', height: '100%' }}>
        {isOpen && children}
      </div>
    </div>
  )
}

// ── Welcome banner ─────────────────────────────────────────────────
function WelcomeBanner({ name, recommendationCount, onClose }) {
  return (
    <div style={{
      position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
      zIndex: 30, maxWidth: 'min(420px, 90vw)',
      padding: '14px 18px',
      background: 'rgba(250, 249, 245, 0.97)',
      backdropFilter: 'blur(20px)',
      borderRadius: '14px',
      border: `1px solid rgba(197,165,90,0.35)`,
      boxShadow: `0 4px 28px rgba(0,0,0,0.14)`,
      display: 'flex', flexDirection: 'column', gap: '6px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        <div>
          <div style={{
            fontSize: '0.9rem', fontWeight: 700, color: brand.forest,
            fontFamily: "'Playfair Display', Georgia, serif",
          }}>Willkommen{name ? `, ${name.split(' ')[0]}` : ''} —</div>
          <div style={{ fontSize: '0.75rem', color: brand.textMuted, fontFamily: "'DM Sans', sans-serif", marginTop: '3px', lineHeight: 1.5 }}>
            Basierend auf Ihrem Profil haben wir{' '}
            <span style={{ color: brand.gold, fontWeight: 600 }}>{recommendationCount} Empfehlungen</span>
            {' '}hervorgehoben.
            <br />
            <span style={{ color: brand.goldDim, fontSize: '0.68rem' }}>Goldene Knoten = Ihre persönlichen Themen.</span>
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: brand.warmGray,
          fontSize: '1.1rem', cursor: 'pointer', padding: '0 2px', flexShrink: 0,
        }}>×</button>
      </div>
    </div>
  )
}

// ── Node Detail Panel ──────────────────────────────────────────────
function NodeDetailPanel({ node, isPersonalized, onClose, onAskAbout }) {
  const [btnHover, setBtnHover] = useState(false)
  if (!node) return null

  return (
    <div style={{
      position: 'fixed', top: 58, left: '50%', transform: 'translateX(-50%)',
      zIndex: 25, maxWidth: 'min(380px, 92vw)', width: '100%',
      padding: '14px 18px',
      background: 'rgba(250, 249, 245, 0.97)',
      backdropFilter: 'blur(20px)',
      borderRadius: '16px',
      border: `1px solid ${node.isGap ? 'rgba(180,80,30,0.25)' : 'rgba(197,165,90,0.3)'}`,
      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
    }}>
      {/* Type badge + close */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
          {node.isGap && (
            <span style={{
              fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: '#8b4020', background: 'rgba(180,80,30,0.1)', padding: '2px 7px',
              borderRadius: '99px', border: '1px solid rgba(180,80,30,0.2)',
            }}>Wissens-Lücke</span>
          )}
          {node.isHub && !node.isGap && (
            <span style={{
              fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: brand.goldDim, background: brand.goldGlow, padding: '2px 7px',
              borderRadius: '99px', border: `1px solid rgba(197,165,90,0.3)`,
            }}>Hub</span>
          )}
          {isPersonalized && (
            <span style={{
              fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
              color: brand.forest, background: 'rgba(26,58,42,0.07)', padding: '2px 7px',
              borderRadius: '99px', border: '1px solid rgba(26,58,42,0.15)',
            }}>✦ Ihr Profil</span>
          )}
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: brand.warmGray,
          fontSize: '1rem', cursor: 'pointer', padding: '0 2px',
        }}>×</button>
      </div>

      {/* Label */}
      <div style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: '1.05rem', fontWeight: 700,
        color: brand.forest, lineHeight: 1.25, marginBottom: '4px',
      }}>{node.label}</div>

      {/* Meta */}
      <div style={{
        fontSize: '0.72rem', color: brand.textMuted,
        fontFamily: "'DM Sans', sans-serif", marginBottom: '12px',
      }}>
        {node.connections} Verbindungen
        {node.cluster >= 0 && ` · Cluster ${node.cluster}`}
      </div>

      {/* CTA */}
      <button
        onClick={onAskAbout}
        onMouseEnter={() => setBtnHover(true)}
        onMouseLeave={() => setBtnHover(false)}
        style={{
          width: '100%', padding: '9px 14px', borderRadius: '9px',
          border: `1px solid ${btnHover ? brand.forest : 'rgba(26,58,42,0.2)'}`,
          background: btnHover ? brand.forest : 'rgba(26,58,42,0.04)',
          color: btnHover ? brand.cream : brand.textMuted,
          fontSize: '0.78rem', fontWeight: 500,
          fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
          transition: 'all 180ms ease',
          transform: btnHover ? 'translateY(-1px)' : 'none',
          boxShadow: btnHover ? '0 4px 12px rgba(26,58,42,0.15)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        }}
      >
        <span>💬</span>
        Frage zu „{node.label}" stellen
      </button>
    </div>
  )
}

// ── Nav tab button ─────────────────────────────────────────────────
function NavTab({ tab, isActive, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '9px 16px',
        background: isActive ? brand.forest : hover ? 'rgba(26,58,42,0.06)' : 'transparent',
        border: 'none', borderRadius: '18px',
        cursor: 'pointer',
        transition: 'all 200ms ease',
        color: isActive ? brand.cream : hover ? brand.forest : brand.textMuted,
        transform: hover && !isActive ? 'translateY(-1px)' : 'none',
      }}
    >
      {tab.icon}
      <span style={{ fontSize: '0.7rem', fontWeight: isActive ? 600 : 400, fontFamily: "'DM Sans', sans-serif" }}>
        {tab.label}
      </span>
      {tab.badge > 0 && (
        <span style={{
          position: 'absolute', top: 1, right: 4,
          fontSize: '0.5rem', fontWeight: 700,
          background: tab.badgeColor, color: '#fff',
          borderRadius: '7px', padding: '1px 5px',
          fontFamily: "'DM Sans', sans-serif",
        }}>{tab.badge}</span>
      )}
    </button>
  )
}

// ── Main ───────────────────────────────────────────────────────────
export default function LebergottApp() {
  const { user, token, isClient } = useAuth()

  const [activePanel, setActivePanel]               = useState(null)
  const [graphData, setGraphData]                   = useState(DEMO_GRAPH)
  const [gaps, setGaps]                             = useState(DEMO_GAPS)
  const [bridges, setBridges]                       = useState(DEMO_BRIDGES)
  const [selectedNode, setSelectedNode]             = useState(null)
  const [isLoading, setIsLoading]                   = useState(true)
  const [isDataCached, setIsDataCached]             = useState(false)
  const [onboardingProfile, setOnboardingProfile]   = useState(null)
  const [personalizedNodeIds, setPersonalizedNodeIds] = useState([])
  const [showWelcome, setShowWelcome]               = useState(false)
  const [chatContext, setChatContext]               = useState('')

  // Load graph data with graceful fallback
  useEffect(() => {
    let cancelled = false
    async function loadData() {
      // Attempt 1: Backend API
      try {
        const res = await fetch(`${BASE_URL}/demo/lebergott`, { signal: AbortSignal.timeout(4000) })
        if (!cancelled && res.ok) {
          const data = await res.json()
          if (data.graph)   setGraphData(data.graph)
          if (data.gaps)    setGaps(data.gaps)
          if (data.bridges) setBridges(data.bridges)
          // Check if backend returned cached InfraNodus data
          if (data._cached) setIsDataCached(true)
          setIsLoading(false)
          return
        }
      } catch {}

      if (cancelled) return

      // Attempt 2: n8n webhook
      try {
        const res = await fetch(N8N_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${N8N_AUTH}` },
          body: JSON.stringify({ query: 'system:get-graph-data' }),
          signal: AbortSignal.timeout(5000),
        })
        if (!cancelled && res.ok) {
          const data = await res.json()
          if (data.graph) setGraphData(data.graph)
          if (data.gaps)  setGaps(data.gaps)
        }
      } catch {}

      if (cancelled) return

      // Fallback: use built-in demo data (already set as initial state)
      setIsDataCached(true)
      setIsLoading(false)
    }
    loadData()
    return () => { cancelled = true }
  }, [])

  // Load onboarding profile
  useEffect(() => {
    if (!token || !isClient) return

    async function loadProfile() {
      if (token.startsWith('demo_')) {
        applyProfile({
          answers: { beschwerden: ['Müdigkeit', 'Verdauungsprobleme'], hauptziel: 'Energie', vertrautheit: 2 },
          recommendations: [],
        })
        return
      }
      try {
        const res = await fetch(`${BASE_URL}/onboarding/my-profile`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(4000),
        })
        if (res.ok) applyProfile(await res.json())
      } catch {}
    }

    function applyProfile(profile) {
      if (!profile?.answers) return
      setOnboardingProfile(profile)
      const { beschwerden = [], hauptziel = '' } = profile.answers
      const nodeIds = resolvePersonalizedNodes(beschwerden, hauptziel)
      setPersonalizedNodeIds(nodeIds)
      const symptomsText = Array.isArray(beschwerden) ? beschwerden.join(', ') : beschwerden
      if (symptomsText) setChatContext(`Ich habe Fragen zu: ${symptomsText}. Mein Hauptziel: ${hauptziel}. `)
      const welcomeKey = `lb_welcome_shown_${user?.id || 'demo'}`
      if (!sessionStorage.getItem(welcomeKey)) {
        setShowWelcome(true)
        sessionStorage.setItem(welcomeKey, '1')
      }
    }

    loadProfile()
  }, [token, isClient, user?.id])

  const togglePanel = useCallback((p) => setActivePanel(prev => prev === p ? null : p), [])

  // Find node by label — for wikilink navigation from chat
  const findNodeByLabel = useCallback((label) => {
    if (!graphData?.nodes) return null
    const lower = label.toLowerCase()
    return graphData.nodes.find(n =>
      n.label?.toLowerCase() === lower ||
      n.id?.toLowerCase() === lower ||
      n.id?.toLowerCase() === lower.replace(/\s+/g, '-') ||
      n.label?.toLowerCase().includes(lower) ||
      lower.includes(n.label?.toLowerCase())
    ) || null
  }, [graphData])

  const handleWikiLinkClick = useCallback((label) => {
    const node = findNodeByLabel(label)
    if (node) { setSelectedNode(node); setActivePanel(null) }
  }, [findNodeByLabel])

  const handleAskAboutNode = useCallback(() => {
    if (!selectedNode) return
    setChatContext(`Erkläre mir das Konzept "${selectedNode.label}" und seine Verbindungen im Wissensgraph. `)
    setActivePanel('chat')
  }, [selectedNode])

  const nodeCount  = graphData?.nodes?.length ?? 0
  const linkCount  = graphData?.links?.length ?? 0
  const gapCount   = gaps?.length ?? 0
  const primarySymptom = onboardingProfile?.answers?.beschwerden?.[0] || null
  const gapPanelTitle  = primarySymptom ? `Lücken zu ${primarySymptom}` : `${gapCount} Wissenslücken`
  const recommendationCount = personalizedNodeIds.length

  // Loading screen
  if (isLoading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: brand.forestDeep,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'DM Sans', -apple-system, sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <LoadingPulse text="Wissensnetzwerk laden…" />
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: brand.forestDeep, fontFamily: "'DM Sans', -apple-system, sans-serif", overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600&display=swap');
        .lb-typing-dot { display:inline-block; width:6px; height:6px; border-radius:50%; background:#c5a55a; animation:lb-dot-bounce 1.2s infinite ease-in-out; }
        .lb-typing-dot:nth-child(2) { animation-delay:0.2s; }
        .lb-typing-dot:nth-child(3) { animation-delay:0.4s; }
        @keyframes lb-dot-bounce { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-5px);opacity:1} }
        @keyframes lb-spin { to{transform:rotate(360deg)} }
        @keyframes lb-fade-up { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .lb-scroll::-webkit-scrollbar{width:3px}
        .lb-scroll::-webkit-scrollbar-track{background:transparent}
        .lb-scroll::-webkit-scrollbar-thumb{background:rgba(197,165,90,0.25);border-radius:3px}
        @supports (padding: env(safe-area-inset-bottom)) {
          .lb-bottom-nav { padding-bottom: calc(4px + env(safe-area-inset-bottom)) !important; }
        }
      `}</style>

      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: brand.leafBg }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(42, 90, 58, 0.28) 0%, transparent 70%)' }} />

      {/* Graph */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <MyceliumGraph
          data={graphData}
          onNodeClick={(node) => setSelectedNode(prev => prev?.id === node.id ? null : node)}
          selectedNodeId={selectedNode?.id}
          personalizedNodeIds={personalizedNodeIds}
        />
      </div>

      {/* Header */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px',
        background: 'rgba(15, 36, 24, 0.88)',
        backdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(197, 165, 90, 0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <path d="M16 4C10 4 5 10 5 16c0 4 2 7 4 9 1-3 3-6 7-9 4-3 8-4 11-4-1-4-5-8-11-8z"
              fill={brand.gold} fillOpacity="0.25" stroke={brand.gold} strokeWidth="1.2"/>
            <path d="M16 28V14" stroke={brand.gold} strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
            <path d="M16 18c-3 2-5 4-6 7" stroke={brand.gold} strokeWidth="0.8" strokeLinecap="round" opacity="0.4"/>
          </svg>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: brand.cream, fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: '0.03em' }}>Lebergott</div>
            <div style={{ fontSize: '0.5rem', color: brand.goldDim, fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.12em', textTransform: 'uppercase' }}>Wissensnetzwerk</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <StatPill value={nodeCount} label="Knoten" />
          <StatPill value={linkCount} label="Verbindungen" />
          <StatPill value={gapCount} label="Lücken" />
          {personalizedNodeIds.length > 0 && <StatPill value={personalizedNodeIds.length} label="Profil" />}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isDataCached && (
            <span style={{
              fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: brand.goldDim,
              background: 'rgba(197,165,90,0.1)', borderRadius: 99,
              padding: '2px 7px', border: '1px solid rgba(197,165,90,0.2)',
            }}>Cached</span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.6rem', color: brand.goldDim }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#6a9e6a', boxShadow: '0 0 6px #6a9e6a66' }} />
            Aktiv
          </div>
        </div>
      </header>

      {/* Welcome banner */}
      {showWelcome && recommendationCount > 0 && (
        <WelcomeBanner name={user?.name || user?.email} recommendationCount={recommendationCount} onClose={() => setShowWelcome(false)} />
      )}

      {/* Node detail */}
      {selectedNode && !showWelcome && (
        <NodeDetailPanel
          node={selectedNode}
          isPersonalized={personalizedNodeIds.includes(selectedNode.id)}
          onClose={() => setSelectedNode(null)}
          onAskAbout={handleAskAboutNode}
        />
      )}

      {/* Bottom nav */}
      <nav className="lb-bottom-nav" style={{
        position: 'fixed', bottom: 12,
        left: '50%', transform: 'translateX(-50%)',
        zIndex: 40,
        display: 'flex', gap: '3px',
        padding: '4px',
        background: 'rgba(250, 249, 245, 0.92)',
        backdropFilter: 'blur(22px)',
        borderRadius: '22px',
        border: '1px solid rgba(197, 165, 90, 0.2)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.14)',
      }}>
        {[
          { id: 'chat', label: 'Fragen', icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.5 8.5 0 018 8v.5z"/>
            </svg>
          )},
          { id: 'gaps', label: 'Lücken', badge: gapCount, badgeColor: '#cc7744', icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="9" strokeDasharray="4 3"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <circle cx="12" cy="15" r="0.5" fill="currentColor"/>
            </svg>
          )},
          { id: 'bridges', label: 'Brücken', badge: bridges?.length, badgeColor: '#4a8a7a', icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4"/>
            </svg>
          )},
        ].map((tab) => (
          <NavTab key={tab.id} tab={tab} isActive={activePanel === tab.id} onClick={() => togglePanel(tab.id)} />
        ))}
      </nav>

      {/* Panels */}
      <FloatingPanel position="bottom" isOpen={activePanel === 'chat'} onClose={() => setActivePanel(null)} title="Wissensnetz befragen">
        <ChatPanel
          vaultId="lebergott"
          selectedNode={selectedNode}
          onNodeNavigate={(node) => { setSelectedNode(node); setActivePanel(null) }}
          onWikiLinkClick={handleWikiLinkClick}
          initialContext={chatContext}
        />
      </FloatingPanel>

      <FloatingPanel position="left" isOpen={activePanel === 'gaps'} onClose={() => setActivePanel(null)} title={gapPanelTitle}>
        <div style={{ padding: '12px' }}>
          {primarySymptom && (
            <div style={{
              marginBottom: '10px', padding: '8px 12px',
              background: 'rgba(197,165,90,0.08)', borderRadius: '8px',
              border: '1px solid rgba(197,165,90,0.18)',
              fontSize: '0.7rem', color: brand.goldDim, fontFamily: "'DM Sans', sans-serif",
            }}>
              Basierend auf: <strong style={{ color: brand.gold }}>
                {Array.isArray(onboardingProfile?.answers?.beschwerden)
                  ? onboardingProfile.answers.beschwerden.join(', ')
                  : onboardingProfile?.answers?.beschwerden}
              </strong>
            </div>
          )}
          <GapPanel gaps={gaps} onGapClick={(gap) => {
            const node = graphData.nodes.find(n => n.id === gap.id)
            if (node) { setSelectedNode(node); setActivePanel(null) }
          }} />
        </div>
      </FloatingPanel>

      <FloatingPanel position="right" isOpen={activePanel === 'bridges'} onClose={() => setActivePanel(null)} title={`${bridges?.length ?? 0} Brücken`}>
        <div style={{ padding: '12px' }}>
          <BridgePanel bridges={bridges} />
        </div>
      </FloatingPanel>
    </div>
  )
}
