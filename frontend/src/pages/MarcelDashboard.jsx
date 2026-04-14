/* ============================================================
   MarcelDashboard.jsx — Full Admin View for Marcel
   Layout: header → stats → [clients | graph | gaps] → activity log
   Data: GET /auth/users · /infranodus/gaps · /demo/lebergott
   Design: Lebergott brand — cream bg, forest/gold accents, Playfair
   ============================================================ */

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import MyceliumGraph from '../components/MyceliumGraph.jsx'
import { DEMO_GRAPH } from '../utils/api.js'

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/v1'

const B = {
  forest:     '#1a3a2a',
  forestDeep: '#0f2418',
  forestLight:'#2a5a3a',
  gold:       '#c5a55a',
  goldDim:    '#9e8648',
  goldGlow:   'rgba(197,165,90,0.12)',
  goldBorder: 'rgba(197,165,90,0.25)',
  cream:      '#faf9f5',
  creamDim:   '#f0ede4',
  creamBorder:'rgba(26,58,42,0.09)',
  text:       '#2c2c2a',
  textMid:    '#4a6a4a',
  textMuted:  '#6a6860',
  warmGray:   '#b0aea5',
  green:      '#2e7d52',
  red:        '#b53a2a',
}

const DEMO_USERS_FALLBACK = [
  { id: 1, email: 'marcel@lebergott.de',    role: 'admin',  onboarding_data: {}, created_at: '2024-01-15T09:00:00Z' },
  { id: 2, email: 'lisa@lebergott.de',      role: 'staff',  onboarding_data: { beschwerden: 'Support' }, created_at: '2024-02-01T10:30:00Z' },
  { id: 3, email: 'anna.mueller@gmail.com', role: 'client', onboarding_data: { beschwerden: 'Leberprobleme', hauptziel: 'Regeneration', vertrautheit: 'Anfänger' }, created_at: '2024-03-10T14:20:00Z' },
  { id: 4, email: 'thomas.k@web.de',        role: 'client', onboarding_data: { hauptziel: 'Entgiftung' }, created_at: '2024-03-22T08:15:00Z' },
  { id: 5, email: 'sabine.w@gmail.com',     role: 'client', onboarding_data: {}, created_at: '2024-04-05T16:45:00Z' },
  { id: 6, email: 'peter.lang@gmx.de',      role: 'client', onboarding_data: { hauptziel: 'Ernährung', vertrautheit: 'Anfänger' }, created_at: '2024-04-11T11:00:00Z' },
]

const CONTENT_IDEAS_BY_CONCEPT = {
  'epigenetik-leber':     'Blog: Wie deine Lebensweise Lebergene aktiviert',
  'mikrobiom-leber-achse':'Video: Das Mikrobiom als Schlüssel zur Lebergesundheit',
  'chronobiologie-detox': 'Guide: Wann entgiftet die Leber am stärksten?',
  'fastenprotokoll-leber':'Kurs-Modul: Intervallfasten als Lebertherapie',
  'hormon-leber-stress':  'Artikel: Warum Stress die Leber belastet',
}

const FALLBACK_GAPS_ADMIN = [
  { concept: 'epigenetik-leber',      label: 'Epigenetik & Lebergesundheit', bridge_potential: 0.89, description: 'Epigenetische Faktoren und Leberregeneration fehlen im Wissensgraph' },
  { concept: 'mikrobiom-leber-achse', label: 'Darm-Leber-Achse',             bridge_potential: 0.84, description: 'Mikrobiom-Einfluss auf Leberfunktion ist unterrepräsentiert' },
  { concept: 'chronobiologie-detox',  label: 'Chronobiologie der Entgiftung',bridge_potential: 0.76, description: 'Tagesrhythmus und optimale Entgiftungsfenster fehlen' },
  { concept: 'fastenprotokoll-leber', label: 'Fastenprotokolle & Leber',     bridge_potential: 0.71, description: 'Intervallfasten × Leberregeneration — fehlende Verbindung' },
  { concept: 'hormon-leber-stress',   label: 'Hormonsystem × Leberstress',   bridge_potential: 0.65, description: 'Cortisol-Einfluss auf Leberfunktion fehlt als Konzept' },
]

const DEMO_ACTIVITY_LOG = [
  { id: 1, email: 'anna.mueller@gmail.com', action: 'Chat-Frage gestellt',      topic: 'Leberregeneration', time: '14:32' },
  { id: 2, email: 'thomas.k@web.de',        action: 'Onboarding abgeschlossen', topic: 'Entgiftung',        time: '13:15' },
  { id: 3, email: 'sabine.w@gmail.com',     action: 'Chat-Frage gestellt',      topic: 'Ernährung & Fett',  time: '12:08' },
  { id: 4, email: 'peter.lang@gmx.de',      action: 'Registriert',              topic: null,                time: '11:00' },
  { id: 5, email: 'anna.mueller@gmail.com', action: 'Chat-Frage gestellt',      topic: 'Mikrobiom & Darm',  time: '09:44' },
  { id: 6, email: 'sabine.w@gmail.com',     action: 'Onboarding gestartet',     topic: null,                time: '09:12' },
]

function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) }
  catch { return '—' }
}

function obStatus(data) {
  const n = Object.keys(data || {}).length
  if (n === 0) return { label: 'Offen',     color: B.warmGray }
  if (n >= 3)  return { label: 'Fertig',    color: B.green }
  return         { label: 'Teilweise', color: B.gold }
}

function enrichGaps(rawGaps) {
  return rawGaps.slice(0, 5).map((g, i) => ({
    ...g,
    content_idea: CONTENT_IDEAS_BY_CONCEPT[g.concept] || FALLBACK_GAPS_ADMIN[i]?.content_idea || 'Content-Idee aus Lücke generieren',
  }))
}

async function fetchJSON(url, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(res.status)
  return res.json()
}

// ── Stat card ─────────────────────────────────────────────────────
function StatCard({ value, label, sub }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: 1, background: B.cream, borderRadius: 16, padding: '22px 24px',
        border: `1px solid ${hover ? 'rgba(197,165,90,0.3)' : B.creamBorder}`,
        boxShadow: hover ? '0 4px 18px rgba(26,58,42,0.1)' : '0 1px 6px rgba(26,58,42,0.06)',
        transition: 'all 200ms ease',
        transform: hover ? 'translateY(-2px)' : 'none',
      }}
    >
      <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '2.4rem', fontWeight: 700, color: B.forest, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', fontWeight: 700, color: B.textMid, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 8 }}>{label}</div>
      {sub && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.68rem', color: B.warmGray, marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function RoleBadge({ role }) {
  const configs = { admin: [B.forest, B.cream], staff: [B.gold, B.forest], client: [B.creamDim, B.text] }
  const [bg, fg] = configs[role] || configs.client
  return (
    <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: bg, color: fg, borderRadius: 99, padding: '2px 8px', flexShrink: 0 }}>
      {role}
    </span>
  )
}

function ClientRow({ user: u }) {
  const ob = obStatus(u.onboarding_data)
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 6px',
        borderBottom: `1px solid ${B.creamBorder}`,
        background: hover ? 'rgba(197,165,90,0.04)' : 'transparent',
        borderRadius: 6, transition: 'background 150ms ease',
        cursor: 'default',
      }}
    >
      <div style={{ width: 30, height: 30, borderRadius: '50%', background: B.forestLight, color: B.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
        {u.email[0].toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.76rem', fontWeight: 600, color: B.text, fontFamily: "'DM Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {u.email}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
          <RoleBadge role={u.role} />
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: ob.color, fontFamily: "'DM Sans', sans-serif" }}>{ob.label}</div>
        <div style={{ fontSize: '0.6rem', color: B.warmGray, marginTop: 1 }}>{fmtDate(u.created_at)}</div>
      </div>
    </div>
  )
}

function BridgeDots({ value }) {
  const filled = Math.round(value * 5)
  return (
    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: i < filled ? B.gold : B.creamDim, display: 'inline-block', transition: 'background 200ms ease' }} />
      ))}
    </span>
  )
}

function GapRow({ gap, rank }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '14px 6px', borderBottom: `1px solid ${B.creamBorder}`,
        background: hover ? 'rgba(197,165,90,0.03)' : 'transparent',
        borderRadius: 6, transition: 'background 150ms ease',
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: B.goldDim, minWidth: 18, fontFamily: "'DM Sans', sans-serif", marginTop: 3, flexShrink: 0 }}>#{rank}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '0.85rem', fontWeight: 700, color: B.forest, lineHeight: 1.3 }}>{gap.label}</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.68rem', color: B.textMuted, marginTop: 4, lineHeight: 1.45 }}>{gap.description}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <BridgeDots value={gap.bridge_potential} />
            <span style={{ fontSize: '0.62rem', color: B.warmGray, fontFamily: "'DM Sans', sans-serif" }}>
              {Math.round(gap.bridge_potential * 100)}% Potenzial
            </span>
          </div>
          <div style={{ marginTop: 10, padding: '7px 12px', background: hover ? 'rgba(197,165,90,0.15)' : B.goldGlow, borderRadius: 8, borderLeft: `3px solid ${B.gold}`, transition: 'background 150ms ease' }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.62rem', fontWeight: 700, color: B.goldDim, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Idee </span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: B.text }}>{gap.content_idea}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActivityRow({ entry }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '8px 6px',
        borderBottom: `1px solid ${B.creamBorder}`,
        background: hover ? 'rgba(26,58,42,0.025)' : 'transparent',
        borderRadius: 5, transition: 'background 150ms ease',
      }}
    >
      <span style={{ fontSize: '0.65rem', color: B.warmGray, fontFamily: 'monospace', minWidth: 40, flexShrink: 0 }}>{entry.time}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.74rem', color: B.text }}>
          <strong style={{ color: B.forest }}>{entry.email.split('@')[0]}</strong>
          <span style={{ color: B.textMuted }}> · {entry.action}</span>
        </span>
        {entry.topic && (
          <span style={{ fontSize: '0.62rem', color: B.goldDim, marginLeft: 8, background: hover ? 'rgba(197,165,90,0.18)' : B.goldGlow, borderRadius: 99, padding: '1px 8px', border: `1px solid ${B.goldBorder}`, transition: 'background 150ms ease' }}>
            {entry.topic}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────
export default function MarcelDashboard() {
  const { token, user, logout } = useAuth()
  const navigate = useNavigate()

  const [users,        setUsers]        = useState(DEMO_USERS_FALLBACK)
  const [gaps,         setGaps]         = useState(enrichGaps(FALLBACK_GAPS_ADMIN))
  const [graphData,    setGraphData]    = useState(DEMO_GRAPH)
  const [activity]                      = useState(DEMO_ACTIVITY_LOG)
  const [selectedNode, setSelectedNode] = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [loadError,    setLoadError]    = useState(null)
  const [isDemo,       setIsDemo]       = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const results = await Promise.allSettled([
        fetchJSON(`${BASE_URL}/auth/users`, token),
        fetchJSON(`${BASE_URL}/infranodus/gaps?min_bridge_potential=0.5`, null),
        fetchJSON(`${BASE_URL}/demo/lebergott`, null),
      ])
      let anyReal = false
      if (results[0].status === 'fulfilled' && Array.isArray(results[0].value)) { setUsers(results[0].value); anyReal = true }
      if (results[1].status === 'fulfilled' && results[1].value?.gaps?.length) { setGaps(enrichGaps(results[1].value.gaps)); anyReal = true }
      if (results[2].status === 'fulfilled' && results[2].value?.graph?.nodes?.length) {
        const g = results[2].value.graph
        setGraphData({ nodes: g.nodes, links: g.links || [], clusters: g.clusters || [] })
        anyReal = true
      }
      if (anyReal) setIsDemo(false)
    } catch (err) {
      setLoadError('Daten konnten nicht geladen werden. Demo-Daten werden angezeigt.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const totalClients = users.filter(u => u.role === 'client').length
  const totalStaff   = users.filter(u => u.role === 'staff').length
  const obDone       = users.filter(u => Object.keys(u.onboarding_data || {}).length >= 3).length
  const topGapLabel  = gaps[0]?.label || '—'

  const page = {
    minHeight: '100vh',
    background: '#f0ede4',
    fontFamily: "'DM Sans', sans-serif",
    color: B.text,
  }

  if (loading) {
    return (
      <div style={{ ...page }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
          @keyframes lb-spin{to{transform:rotate(360deg)}}
          @keyframes lb-shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
          .skel{background:linear-gradient(90deg,rgba(197,165,90,0.06) 0%,rgba(197,165,90,0.12) 50%,rgba(197,165,90,0.06) 100%);background-size:800px 100%;animation:lb-shimmer 1.6s infinite linear;border-radius:8px}
        `}</style>
        {/* Skeleton header */}
        <div style={{ background: B.forest, padding: '0 36px', height: 64, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="skel" style={{ width: 36, height: 36, borderRadius: 9 }} />
          <div className="skel" style={{ width: 160, height: 16 }} />
        </div>
        <div style={{ padding: '32px 36px', maxWidth: 1200, margin: '0 auto' }}>
          {/* Skeleton stat cards */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
            {[1,2,3,4].map(i => <div key={i} className="skel" style={{ flex: 1, height: 88, borderRadius: 16 }} />)}
          </div>
          {/* Skeleton content rows */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="skel" style={{ height: 320, borderRadius: 16 }} />
            <div className="skel" style={{ height: 320, borderRadius: 16 }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes lb-spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <header style={{
        background: B.forest, padding: '0 36px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 16px rgba(10,20,12,0.22)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9, background: B.gold, color: B.forest,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 700,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}>L</div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16, fontWeight: 700, color: B.cream }}>Lebergott Akademie</div>
            <div style={{ fontSize: 11, color: 'rgba(197,165,90,0.8)', marginTop: 1 }}>Admin · {user?.email || 'Marcel'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isDemo && (
            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: B.goldDim, background: 'rgba(197,165,90,0.12)', borderRadius: 99, padding: '2px 10px', border: `1px solid ${B.goldBorder}` }}>DEMO</span>
          )}
          <NavBtn onClick={() => navigate('/lebergott')}>Wissensraum</NavBtn>
          <NavBtn onClick={() => navigate('/staff')}>Team-View</NavBtn>
          <NavBtn onClick={logout} accent>Logout</NavBtn>
        </div>
      </header>

      {/* Error banner */}
      {loadError && (
        <div style={{
          background: 'rgba(180,60,40,0.08)', borderBottom: '1px solid rgba(180,60,40,0.2)',
          padding: '10px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12,
        }}>
          <span style={{ fontSize: '0.76rem', color: '#b53a2a', fontFamily: "'DM Sans', sans-serif" }}>
            ⚠ {loadError}
          </span>
          <button
            onClick={load}
            style={{ fontSize: '0.7rem', fontWeight: 600, color: B.forest, background: 'rgba(26,58,42,0.08)', border: '1px solid rgba(26,58,42,0.18)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '36px 40px', maxWidth: 1380, margin: '0 auto' }}>

        {/* Welcome */}
        <div style={{ marginBottom: 30 }}>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '2rem', fontWeight: 700, color: B.forest, margin: '0 0 4px' }}>
            Guten Tag, Marcel.
          </h1>
          <p style={{ fontSize: '0.82rem', color: B.textMid, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
            Hier ist der Überblick über Ihre Plattform.
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
          <StatCard value={users.length}    label="Nutzer gesamt"     sub={`${totalStaff} Mitarbeiter`} />
          <StatCard value={totalClients}    label="Klienten"          sub={`${obDone} Onboarding fertig`} />
          <StatCard value={gaps.length}     label="Wissenslücken"     sub={`Top: ${topGapLabel}`} />
          <StatCard value={activity.length} label="Aktivitäten heute" sub="Chat + Onboarding" />
        </div>

        {/* 3-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr 310px', gap: 20, marginBottom: 20 }}>

          {/* Left — Clients */}
          <div style={{ ...card(), padding: 24 }}>
            <SectionTitle>Klienten & Mitarbeiter</SectionTitle>
            <div style={{ overflowY: 'auto', maxHeight: 460 }}>
              {users.map(u => <ClientRow key={u.id} user={u} />)}
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${B.creamBorder}` }}>
              <span style={{ fontSize: '0.66rem', color: B.warmGray, fontFamily: "'DM Sans', sans-serif" }}>{users.length} Nutzer registriert</span>
            </div>
          </div>

          {/* Center — Graph */}
          <div style={{ ...card(), padding: 24 }}>
            <SectionTitle>Wissens-Netzwerk</SectionTitle>
            <div style={{ height: 430, borderRadius: 12, overflow: 'hidden', background: '#0a0f0a', position: 'relative' }}>
              {graphData?.nodes?.length ? (
                <MyceliumGraph
                  data={graphData}
                  onNodeClick={node => setSelectedNode(prev => prev?.id === node.id ? null : node)}
                  selectedNodeId={selectedNode?.id}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#4a6a4a', fontSize: '0.8rem' }}>
                  Kein Graph verfügbar
                </div>
              )}
              {isDemo && (
                <div style={{ position: 'absolute', bottom: 8, right: 8, fontSize: '0.58rem', color: '#4a6a4a', background: 'rgba(10,15,10,0.85)', borderRadius: 4, padding: '2px 7px' }}>Demo</div>
              )}
            </div>
            {selectedNode && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: B.goldGlow, borderRadius: 10, border: `1px solid ${B.goldBorder}`, animation: 'none' }}>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '0.85rem', fontWeight: 700, color: B.forest }}>{selectedNode.label}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.65rem', color: B.textMuted, marginTop: 3 }}>
                  {selectedNode.connections} Verbindungen · Cluster {selectedNode.cluster ?? '—'}
                </div>
                <button onClick={() => setSelectedNode(null)} style={{ marginTop: 6, fontSize: '0.6rem', color: B.warmGray, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕ schließen</button>
              </div>
            )}
          </div>

          {/* Right — Gaps */}
          <div style={{ ...card(), padding: 24 }}>
            <SectionTitle>Wissenslücken & Ideen</SectionTitle>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: B.textMuted, marginBottom: 14, lineHeight: 1.5 }}>
              Top 5 aus allen Lebergott-Graphen. Jede Lücke ist eine Content-Chance.
            </p>
            <div style={{ overflowY: 'auto', maxHeight: 430 }}>
              {gaps.map((g, i) => <GapRow key={g.concept} gap={g} rank={i + 1} />)}
            </div>
          </div>
        </div>

        {/* Activity log */}
        <div style={{ ...card(), padding: '22px 28px' }}>
          <SectionTitle>Heutige Aktivitäten</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '0 48px' }}>
            {activity.map(a => <ActivityRow key={a.id} entry={a} />)}
          </div>
        </div>

        <div style={{ height: 48 }} />
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────
function card(extra = {}) {
  return {
    background: '#faf9f5',
    border: `1px solid rgba(26,58,42,0.09)`,
    borderRadius: 16,
    boxShadow: '0 1px 8px rgba(26,58,42,0.07)',
    ...extra,
  }
}

function SectionTitle({ children }) {
  return (
    <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1rem', fontWeight: 700, color: B.forest, margin: '0 0 16px', letterSpacing: '-0.01em' }}>
      {children}
    </h2>
  )
}

function NavBtn({ children, onClick, accent }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '7px 14px', borderRadius: 8,
        border: `1px solid ${accent ? 'rgba(197,165,90,0.3)' : 'rgba(250,249,245,0.15)'}`,
        background: hover ? (accent ? 'rgba(197,165,90,0.12)' : 'rgba(250,249,245,0.1)') : 'transparent',
        color: accent ? (hover ? B.gold : 'rgba(197,165,90,0.85)') : (hover ? '#fff' : 'rgba(250,249,245,0.82)'),
        fontSize: '0.78rem', cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
        transition: 'all 150ms ease',
        transform: hover ? 'translateY(-1px)' : 'none',
      }}
    >
      {children}
    </button>
  )
}
