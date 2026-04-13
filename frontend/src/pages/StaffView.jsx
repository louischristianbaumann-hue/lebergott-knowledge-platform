/* ============================================================
   Lebergott Akademie — Staff View (Mitarbeiter)
   Client list · Onboarding profiles · Knowledge graph · Gaps · Chat
   Design polish: hover states, tab transitions, card animations
   ============================================================ */

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import MyceliumGraph from '../components/MyceliumGraph.jsx'
import GapPanel from '../components/GapPanel.jsx'
import ChatPanel from '../components/ChatPanel.jsx'
import { DEMO_GRAPH, DEMO_GAPS } from '../utils/api.js'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const BRAND = {
  forest:     '#1a3a2a',
  forestDark: '#0f2418',
  forestMid:  '#2a5040',
  gold:       '#c5a55a',
  goldLight:  'rgba(197,165,90,0.12)',
  goldBorder: 'rgba(197,165,90,0.28)',
  cream:      '#faf9f5',
  creamDim:   '#f0ede4',
  text:       '#2d3a2d',
  textMid:    '#4a6a4a',
  textLight:  '#7a9a7a',
  border:     'rgba(26,58,42,0.08)',
  borderMid:  'rgba(26,58,42,0.14)',
}

const DEMO_CLIENTS = [
  { id: 10, email: 'anna@beispiel.de',   role: 'client', created_at: '2026-04-01T09:00:00', onboarding_data: { beschwerden: ['Müdigkeit', 'Übergewicht'], dauer: '6-12 Monate', massnahmen: 'Ernährung etwas umgestellt', hauptziel: 'Entgiftung', vertrautheit: 2 } },
  { id: 11, email: 'thomas@beispiel.de', role: 'client', created_at: '2026-04-05T14:30:00', onboarding_data: { beschwerden: ['Verdauungsprobleme', 'Hautprobleme'], dauer: '> 1 Jahr', massnahmen: '', hauptziel: 'Allgemein', vertrautheit: 1 } },
  { id: 12, email: 'sara@beispiel.de',   role: 'client', created_at: '2026-04-10T11:15:00', onboarding_data: { beschwerden: ['Energiemangel'], dauer: '1-3 Monate', massnahmen: 'Supplements ausprobiert', hauptziel: 'Energie', vertrautheit: 3 } },
  { id: 13, email: 'martin@beispiel.de', role: 'client', created_at: '2026-04-12T08:00:00', onboarding_data: {} },
]

const DEMO_STAFF_GAPS = [
  { id: 'g1', title: 'Enzym-Aktivierung bei Entgiftung',   reason: 'Häufig angefragt — 3 Klienten mit Entgiftungsziel haben dazu keine Antwort erhalten', bridge: 'Phase-spezifische Detox-Protokolle ergänzen', connections: 2 },
  { id: 'g2', title: 'Vagusnerv & Verdauung',              reason: 'Verbindung zwischen Stress und Darmgesundheit fehlt im Wissensraum', bridge: 'Vagale Immunologie als neues Konzept aufnehmen', connections: 1 },
  { id: 'g3', title: 'Mariendistel Dosierung (Praxis)',    reason: 'Theoretisches Wissen vorhanden — konkrete Dosierungsempfehlungen fehlen', bridge: 'Praktische Protokoll-Note erstellen', connections: 3 },
]

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function getInitials(email) { return email ? email.slice(0, 2).toUpperCase() : '??' }
function onboardingComplete(client) { const d = client.onboarding_data; return d && Object.keys(d).length > 0 }
function getTopTopics(clients) {
  const counts = {}
  clients.forEach(c => {
    const d = c.onboarding_data || {}
    ;(d.beschwerden || []).forEach(b => { counts[b] = (counts[b] || 0) + 1 })
    if (d.hauptziel) counts[d.hauptziel] = (counts[d.hauptziel] || 0) + 1
  })
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, count]) => ({ label, count }))
}

// ── Client card ────────────────────────────────────────────────────
function ClientCard({ client, selected, onClick }) {
  const done = onboardingComplete(client)
  const [hover, setHover] = useState(false)
  return (
    <button
      style={{
        ...styles.clientCard,
        ...(selected ? styles.clientCardSelected : {}),
        background: selected ? 'rgba(197,165,90,0.1)' : hover ? 'rgba(26,58,42,0.03)' : BRAND.creamDim,
        borderColor: selected ? 'rgba(197,165,90,0.4)' : hover ? BRAND.borderMid : BRAND.border,
        transform: hover && !selected ? 'translateX(2px)' : 'none',
        boxShadow: selected ? '0 2px 12px rgba(197,165,90,0.12)' : 'none',
      }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={styles.clientAvatar}>{getInitials(client.email)}</div>
      <div style={styles.clientInfo}>
        <div style={styles.clientEmail}>{client.email}</div>
        <div style={styles.clientMeta}>
          Klient seit {formatDate(client.created_at)}
          {' · '}
          <span style={{ color: done ? BRAND.gold : BRAND.textLight, fontWeight: done ? 600 : 400 }}>
            {done ? 'Onboarding ✓' : 'Noch kein Onboarding'}
          </span>
        </div>
      </div>
      <div style={{ ...styles.clientArrow, color: selected ? BRAND.gold : BRAND.textLight }}>
        {selected ? '▾' : '›'}
      </div>
    </button>
  )
}

// ── Client profile ─────────────────────────────────────────────────
function ClientProfile({ client, onClose }) {
  const d = client.onboarding_data || {}
  const hasData = Object.keys(d).length > 0

  return (
    <div style={styles.profilePanel}>
      <div style={styles.profileHeader}>
        <div>
          <div style={styles.profileTitle}>{client.email}</div>
          <div style={styles.profileSub}>Klient · Mitglied seit {formatDate(client.created_at)}</div>
        </div>
        <button style={styles.closeBtn} onClick={onClose}
          onMouseEnter={e => e.target.style.color = BRAND.forest}
          onMouseLeave={e => e.target.style.color = BRAND.textLight}
        >✕</button>
      </div>

      {!hasData ? (
        <div style={styles.profileEmpty}>
          <div style={{ fontSize: '28px', marginBottom: '12px', opacity: 0.4 }}>○</div>
          <div style={{ fontSize: '14px', color: BRAND.textMid }}>Kein Onboarding ausgefüllt</div>
          <div style={{ fontSize: '12px', color: BRAND.textLight, marginTop: '4px' }}>Klient hat sich noch nicht eingerichtet.</div>
        </div>
      ) : (
        <>
          <ProfileSection label="Beschwerden">
            <div style={styles.tagRow}>
              {(d.beschwerden || []).map(b => <span key={b} style={styles.tag}>{b}</span>)}
            </div>
          </ProfileSection>

          <ProfileSection label="Dauer">
            <div style={styles.sectionValue}>{d.dauer || '—'}</div>
          </ProfileSection>

          {d.massnahmen && (
            <ProfileSection label="Bisherige Maßnahmen">
              <div style={styles.sectionValue}>{d.massnahmen}</div>
            </ProfileSection>
          )}

          <ProfileSection label="Hauptziel">
            <div style={{ ...styles.sectionValue, color: BRAND.gold, fontWeight: 600 }}>{d.hauptziel || '—'}</div>
          </ProfileSection>

          <ProfileSection label="Vertrautheit mit Lebergesundheit">
            <div style={styles.vertrautRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} style={{ ...styles.vertrautDot, background: n <= (d.vertrautheit || 0) ? BRAND.gold : BRAND.border }} />
              ))}
              <span style={styles.vertrautLabel}>
                {['', 'Neueinsteiger', 'Grundkenntnisse', 'Einiges bekannt', 'Gut informiert', 'Experte'][d.vertrautheit] || '—'}
              </span>
            </div>
          </ProfileSection>

          <ProfileSection label="Empfohlene Wissensgebiete">
            <div style={styles.recList}>
              {getGapRecs(d).map((r, i) => (
                <div key={i} style={styles.recItem}>
                  <div style={styles.recDot} />
                  <div>
                    <div style={styles.recTitle}>{r.topic}</div>
                    <div style={styles.recReason}>{r.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          </ProfileSection>
        </>
      )}
    </div>
  )
}

function ProfileSection({ label, children }) {
  return (
    <div style={styles.profileSection}>
      <div style={styles.sectionLabel}>{label}</div>
      {children}
    </div>
  )
}

function getGapRecs(answers) {
  const recs = []
  const goals = {
    Entgiftung: { topic: 'Entgiftung & Schwermetalle',   reason: 'Passend zu Ihrem Entgiftungsziel' },
    Energie:    { topic: 'Mitochondrien & Zellenergie',  reason: 'Energieoptimierung auf zellulärer Ebene' },
    Gewicht:    { topic: 'Fett & Belastung',             reason: 'Leberkonformes Gewichtsmanagement' },
    Haut:       { topic: 'Entgiftung & Darmgesundheit',  reason: 'Haut als Spiegel der Leber' },
    Allgemein:  { topic: 'Leberregeneration Grundlagen', reason: 'Ganzheitlicher Einstieg' },
  }
  const symptoms = {
    Müdigkeit:          { topic: 'Mitochondrien & Energie', reason: 'Müdigkeit oft Energieproduktions-Problem' },
    Verdauungsprobleme: { topic: 'Darm & Mikrobiom',        reason: 'Darmachse für Verdauung' },
    Hautprobleme:       { topic: 'Entgiftungs-Protokolle',  reason: 'Haut als Ausleitorgan' },
    Übergewicht:        { topic: 'Fett-Zucker-Synergie',    reason: 'Stoffwechsel-Mechanismen' },
    Energiemangel:      { topic: 'Adrenal & Vagusnerv',     reason: 'Stressachse regulieren' },
  }
  if (answers.hauptziel && goals[answers.hauptziel]) recs.push(goals[answers.hauptziel])
  ;(answers.beschwerden || []).forEach(b => { if (symptoms[b] && recs.length < 4) recs.push(symptoms[b]) })
  if (recs.length === 0) recs.push({ topic: 'Leberregeneration Grundlagen', reason: 'Empfohlener Einstieg' })
  return recs.slice(0, 3)
}

// ── Tab button ─────────────────────────────────────────────────────
function TabBtn({ id, label, active, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={() => onClick(id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '9px 20px',
        borderRadius: '9px',
        border: 'none',
        background: active ? BRAND.forest : hover ? 'rgba(26,58,42,0.07)' : 'transparent',
        color: active ? BRAND.cream : hover ? BRAND.forest : BRAND.textMid,
        fontSize: '14px',
        cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: active ? 600 : 400,
        transition: 'all 180ms ease',
        transform: hover && !active ? 'translateY(-1px)' : 'none',
        boxShadow: active ? '0 2px 10px rgba(26,58,42,0.2)' : 'none',
      }}
    >
      {label}
    </button>
  )
}

// ── Main ───────────────────────────────────────────────────────────
export default function StaffView() {
  const { user, token, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('clients')
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [loadingClients, setLoadingClients] = useState(true)
  const [graphData, setGraphData] = useState(null)
  const [gaps, setGaps] = useState([])
  const [topTopics, setTopTopics] = useState([])

  useEffect(() => {
    async function fetchClients() {
      setLoadingClients(true)
      if (token?.startsWith('demo_')) {
        setClients(DEMO_CLIENTS)
        setTopTopics(getTopTopics(DEMO_CLIENTS))
        setLoadingClients(false)
        return
      }
      try {
        const res = await fetch(`${BASE_URL}/auth/users?role=client`, { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const data = await res.json()
          setClients(data)
          setTopTopics(getTopTopics(data))
        } else {
          setClients(DEMO_CLIENTS)
          setTopTopics(getTopTopics(DEMO_CLIENTS))
        }
      } catch {
        setClients(DEMO_CLIENTS)
        setTopTopics(getTopTopics(DEMO_CLIENTS))
      } finally {
        setLoadingClients(false)
      }
    }
    fetchClients()
  }, [token])

  useEffect(() => {
    if (tab !== 'wissensgraph' || graphData) return
    async function fetchGraph() {
      try {
        const res = await fetch(`${BASE_URL}/graph/lebergott`, {
          headers: token && !token.startsWith('demo_') ? { Authorization: `Bearer ${token}` } : {},
        })
        setGraphData(res.ok ? await res.json() : DEMO_GRAPH)
      } catch { setGraphData(DEMO_GRAPH) }
    }
    fetchGraph()
  }, [tab, graphData, token])

  useEffect(() => {
    if (tab !== 'luecken' || gaps.length) return
    async function fetchGaps() {
      try {
        const res = await fetch(`${BASE_URL}/infranodus/gaps`, {
          headers: token && !token.startsWith('demo_') ? { Authorization: `Bearer ${token}` } : {},
        })
        setGaps(res.ok ? (await res.json()).gaps || DEMO_STAFF_GAPS : DEMO_STAFF_GAPS)
      } catch { setGaps(DEMO_STAFF_GAPS) }
    }
    fetchGaps()
  }, [tab, gaps, token])

  const TABS = [
    { id: 'clients',      label: 'Klienten' },
    { id: 'wissensgraph', label: 'Wissensgraph' },
    { id: 'luecken',      label: 'Lücken' },
    { id: 'chat',         label: 'Chat testen' },
  ]

  const completedCount = clients.filter(onboardingComplete).length

  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes lb-spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoMark}>L</div>
          <div>
            <div style={styles.headerTitle}>Lebergott Akademie</div>
            <div style={styles.headerRole}>{isAdmin ? 'Admin' : 'Mitarbeiter'} · {user?.name || user?.email}</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          {isAdmin && <HeaderBtn onClick={() => navigate('/admin')}>Admin</HeaderBtn>}
          <HeaderBtn onClick={() => navigate('/lebergott')}>Wissensraum</HeaderBtn>
          <HeaderBtn onClick={logout} accent>Logout</HeaderBtn>
        </div>
      </header>

      <div style={styles.content}>
        {/* Title + stats */}
        <div style={styles.topRow}>
          <div>
            <h1 style={styles.pageTitle}>Team Dashboard</h1>
            <p style={styles.pageSub}>Klienten-Übersicht, Wissensgraph und Chat-Bot für das Lebergott-Team.</p>
          </div>
          <div style={styles.statsRow}>
            {[
              { num: clients.length, label: 'Klienten' },
              { num: completedCount, label: 'Onboarding ✓' },
              { num: clients.length - completedCount, label: 'Ausstehend' },
            ].map(({ num, label }) => (
              <StatBox key={label} num={num} label={label} />
            ))}
          </div>
        </div>

        {/* Top topics */}
        {topTopics.length > 0 && (
          <div style={styles.topicsBar}>
            <span style={styles.topicsLabel}>Meistgefragte Themen:</span>
            {topTopics.map(({ label, count }) => (
              <TopicChip key={label} label={label} count={count} />
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={styles.tabs}>
          {TABS.map(t => (
            <TabBtn key={t.id} id={t.id} label={t.label} active={tab === t.id} onClick={setTab} />
          ))}
        </div>

        {/* Klienten */}
        {tab === 'clients' && (
          <div style={styles.clientsLayout}>
            <div style={styles.clientList}>
              <div style={styles.panel}>
                <h2 style={styles.panelTitle}>Klienten ({clients.length})</h2>
                <p style={styles.panelDesc}>Klicke auf einen Klienten um sein Onboarding-Profil zu sehen.</p>
                {loadingClients ? (
                  <div style={styles.loading}>
                    <div style={{ width: 28, height: 28, border: `2.5px solid rgba(197,165,90,0.2)`, borderTopColor: BRAND.gold, borderRadius: '50%', animation: 'lb-spin 0.7s linear infinite', margin: '0 auto 10px' }} />
                    Lade Klienten…
                  </div>
                ) : clients.length === 0 ? (
                  <div style={styles.empty}>Noch keine Klienten registriert.</div>
                ) : (
                  <div style={styles.clientStack}>
                    {clients.map(c => (
                      <ClientCard
                        key={c.id}
                        client={c}
                        selected={selectedClient?.id === c.id}
                        onClick={() => setSelectedClient(selectedClient?.id === c.id ? null : c)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            {selectedClient && (
              <div style={styles.profileCol}>
                <ClientProfile client={selectedClient} onClose={() => setSelectedClient(null)} />
              </div>
            )}
          </div>
        )}

        {/* Wissensgraph */}
        {tab === 'wissensgraph' && (
          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>Lebergott Wissensgraph</h2>
            <p style={styles.panelDesc}>Interaktiver Wissens-Graph — 7 Cluster, 37 Nodes. Klicke auf Nodes für Details.</p>
            <div style={styles.graphWrap}>
              {graphData ? (
                <MyceliumGraph data={graphData || DEMO_GRAPH} width={860} height={520} />
              ) : (
                <div style={{ ...styles.loading, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 32, height: 32, border: `2.5px solid rgba(197,165,90,0.2)`, borderTopColor: BRAND.gold, borderRadius: '50%', animation: 'lb-spin 0.7s linear infinite' }} />
                  Graph wird geladen…
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lücken */}
        {tab === 'luecken' && (
          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>Wissens-Lücken</h2>
            <p style={styles.panelDesc}>Themen die Klienten beschäftigen aber noch nicht gut im Wissensraum verankert sind.</p>
            {topTopics.length > 0 && (
              <div style={styles.clientTopicsSection}>
                <div style={styles.sectionLabel}>Klienten-Themen nach Häufigkeit</div>
                <div style={styles.topicBars}>
                  {topTopics.map(({ label, count }) => (
                    <div key={label} style={styles.topicBarRow}>
                      <div style={styles.topicBarLabel}>{label}</div>
                      <div style={styles.topicBarTrack}>
                        <div style={{ ...styles.topicBarFill, width: `${Math.round((count / (topTopics[0]?.count || 1)) * 100)}%` }} />
                      </div>
                      <div style={styles.topicBarCount}>{count}×</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginTop: '24px' }}>
              <div style={styles.sectionLabel}>Offene Lücken im Wissensraum</div>
              <GapPanel gaps={(gaps.length ? gaps : DEMO_STAFF_GAPS).map(g => ({
                id: g.id, title: g.title, reason: g.reason, bridge: g.bridge, connections: g.connection_count ?? g.connections,
              }))} />
            </div>
          </div>
        )}

        {/* Chat */}
        {tab === 'chat' && (
          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>Chat Bot testen</h2>
            <p style={styles.panelDesc}>Teste den Lebergott-Bot direkt. Stelle Fragen wie ein Klient — prüfe Antwortqualität.</p>
            <div style={styles.chatWrap}>
              <ChatPanel vaultId="lebergott" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Small components ───────────────────────────────────────────────
function StatBox({ num, label }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: BRAND.cream, borderRadius: '13px', padding: '16px 20px',
        border: `1px solid ${hover ? 'rgba(197,165,90,0.3)' : BRAND.border}`,
        textAlign: 'center', minWidth: '80px',
        boxShadow: hover ? '0 4px 14px rgba(26,58,42,0.1)' : 'none',
        transition: 'all 200ms ease',
        transform: hover ? 'translateY(-2px)' : 'none',
      }}
    >
      <div style={{ fontSize: '26px', fontWeight: 700, color: BRAND.forest, lineHeight: 1, fontFamily: "'Playfair Display', Georgia, serif" }}>{num}</div>
      <div style={{ fontSize: '11px', color: BRAND.textMid, marginTop: '4px', fontFamily: "'DM Sans', sans-serif" }}>{label}</div>
    </div>
  )
}

function TopicChip({ label, count }) {
  const [hover, setHover] = useState(false)
  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '4px 10px', borderRadius: '20px',
        background: hover ? 'rgba(197,165,90,0.18)' : BRAND.goldLight,
        border: `1px solid ${hover ? 'rgba(197,165,90,0.4)' : 'rgba(197,165,90,0.28)'}`,
        fontSize: '12px', color: BRAND.forest, fontWeight: 500,
        transition: 'all 150ms ease', cursor: 'default',
      }}
    >
      {label}
      <span style={{ background: BRAND.gold, color: BRAND.forest, borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{count}</span>
    </span>
  )
}

function HeaderBtn({ children, onClick, accent }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '7px 14px', borderRadius: '7px',
        border: `1px solid ${accent ? 'rgba(197,165,90,0.25)' : 'rgba(250,249,245,0.15)'}`,
        background: hover ? (accent ? 'rgba(197,165,90,0.1)' : 'rgba(250,249,245,0.08)') : 'transparent',
        color: accent ? 'rgba(197,165,90,0.9)' : (hover ? '#fff' : 'rgba(250,249,245,0.8)'),
        fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
        transition: 'all 150ms ease',
        transform: hover ? 'translateY(-1px)' : 'none',
      }}
    >
      {children}
    </button>
  )
}

// ── Styles ─────────────────────────────────────────────────────────
const styles = {
  root: { minHeight: '100vh', background: BRAND.creamDim, fontFamily: "'DM Sans', -apple-system, sans-serif" },
  header: {
    background: BRAND.forest, padding: '0 32px', height: '64px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    boxShadow: '0 2px 14px rgba(10,20,12,0.22)',
    position: 'sticky', top: 0, zIndex: 10,
  },
  headerLeft:  { display: 'flex', alignItems: 'center', gap: '12px' },
  logoMark: {
    width: '38px', height: '38px', borderRadius: '10px',
    background: BRAND.gold, color: BRAND.forest,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '18px', fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  headerTitle: { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '16px', fontWeight: 700, color: BRAND.cream },
  headerRole:  { fontSize: '11px', color: 'rgba(197,165,90,0.8)', marginTop: '1px' },
  headerRight: { display: 'flex', gap: '8px', alignItems: 'center' },

  content:  { maxWidth: '1060px', margin: '0 auto', padding: '40px 24px' },
  topRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', gap: '24px', flexWrap: 'wrap' },
  pageTitle: { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '32px', fontWeight: 700, color: BRAND.forest, margin: '0 0 6px 0' },
  pageSub:  { fontSize: '15px', color: BRAND.textMid, margin: 0 },

  statsRow: { display: 'flex', gap: '12px', flexShrink: 0 },

  topicsBar: {
    display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
    marginBottom: '24px', padding: '12px 16px',
    background: BRAND.cream, borderRadius: '12px', border: `1px solid ${BRAND.border}`,
    boxShadow: '0 1px 4px rgba(26,58,42,0.05)',
  },
  topicsLabel: { fontSize: '12px', color: BRAND.textMid, fontWeight: 700 },

  tabs:      { display: 'flex', gap: '4px', marginBottom: '20px' },

  panel: {
    background: BRAND.cream, borderRadius: '18px', padding: '32px',
    boxShadow: '0 2px 10px rgba(26,58,42,0.07)', border: `1px solid ${BRAND.border}`,
  },
  panelTitle: { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '22px', fontWeight: 700, color: BRAND.forest, margin: '0 0 8px 0' },
  panelDesc: { fontSize: '14px', color: BRAND.textMid, margin: '0 0 24px 0', lineHeight: 1.5 },

  clientsLayout: { display: 'grid', gridTemplateColumns: '1fr', gap: '20px' },
  clientList:    { minWidth: 0 },
  profileCol:    { minWidth: 0 },
  clientStack:   { display: 'flex', flexDirection: 'column', gap: '6px' },
  clientCard: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '13px 14px', borderRadius: '11px',
    border: `1px solid ${BRAND.border}`,
    cursor: 'pointer', width: '100%', textAlign: 'left',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'all 180ms ease',
  },
  clientCardSelected: {},
  clientAvatar: {
    width: '36px', height: '36px', borderRadius: '50%',
    background: BRAND.forest, color: BRAND.gold,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: 700, flexShrink: 0,
  },
  clientInfo:  { flex: 1, minWidth: 0 },
  clientEmail: { fontSize: '14px', fontWeight: 500, color: BRAND.forest, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  clientMeta:  { fontSize: '12px', color: BRAND.textMid, marginTop: '2px' },
  clientArrow: { fontSize: '16px', flexShrink: 0, transition: 'color 150ms ease' },

  profilePanel: {
    background: BRAND.cream, borderRadius: '16px', padding: '28px',
    boxShadow: '0 2px 10px rgba(26,58,42,0.07)', border: `1px solid ${BRAND.border}`,
    marginTop: '20px',
  },
  profileHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', paddingBottom: '20px', borderBottom: `1px solid ${BRAND.border}` },
  profileTitle: { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', fontWeight: 700, color: BRAND.forest },
  profileSub:  { fontSize: '12px', color: BRAND.textMid, marginTop: '3px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: BRAND.textLight, fontSize: '16px', padding: '4px', transition: 'color 150ms ease' },
  profileEmpty: { textAlign: 'center', padding: '40px 24px', color: BRAND.textMid },
  profileSection: { marginBottom: '20px' },
  sectionLabel: { fontSize: '11px', fontWeight: 700, color: BRAND.textLight, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' },
  sectionValue: { fontSize: '14px', color: BRAND.text },
  tagRow:  { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  tag: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', background: 'rgba(197,165,90,0.1)', border: `1px solid rgba(197,165,90,0.28)`, color: BRAND.forest, fontWeight: 500 },
  vertrautRow:  { display: 'flex', alignItems: 'center', gap: '8px' },
  vertrautDot:  { width: '12px', height: '12px', borderRadius: '50%', transition: 'background 200ms ease' },
  vertrautLabel: { fontSize: '13px', color: BRAND.textMid },
  recList:  { display: 'flex', flexDirection: 'column', gap: '10px' },
  recItem:  { display: 'flex', gap: '10px', alignItems: 'flex-start' },
  recDot:   { width: '6px', height: '6px', borderRadius: '50%', background: BRAND.gold, marginTop: '6px', flexShrink: 0 },
  recTitle: { fontSize: '13px', fontWeight: 600, color: BRAND.forest },
  recReason:{ fontSize: '12px', color: BRAND.textMid, marginTop: '1px' },

  graphWrap: { background: BRAND.forestDark, borderRadius: '14px', overflow: 'hidden', minHeight: '520px', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  clientTopicsSection: { marginBottom: '24px' },
  topicBars:    { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' },
  topicBarRow:  { display: 'flex', alignItems: 'center', gap: '10px' },
  topicBarLabel:{ fontSize: '13px', color: BRAND.text, width: '160px', flexShrink: 0 },
  topicBarTrack:{ flex: 1, height: '6px', background: BRAND.creamDim, borderRadius: '3px', overflow: 'hidden' },
  topicBarFill: { height: '100%', background: BRAND.gold, borderRadius: '3px', transition: 'width 0.6s ease' },
  topicBarCount:{ fontSize: '12px', color: BRAND.textMid, width: '24px', textAlign: 'right' },

  chatWrap: { minHeight: '480px', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${BRAND.border}` },
  loading: { padding: '40px', textAlign: 'center', color: BRAND.textMid, fontSize: '14px' },
  empty:   { padding: '40px', textAlign: 'center', color: BRAND.textLight, fontSize: '14px' },
}
