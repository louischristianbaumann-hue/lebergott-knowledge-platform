/* ============================================================
   BridgePanel.jsx — Conceptual Bridges (InfraNodus live + cached)
   Two-column grid layout, dark card style
   ============================================================ */

import React from 'react'

const SOURCE_BADGE = {
  live:   { bg: 'rgba(0, 212, 255, 0.08)',  color: '#00d4ff', dot: '#00d4ff', label: 'Live' },
  cached: { bg: 'rgba(255,255,255, 0.04)',   color: '#888',    dot: '#555',    label: 'Cached' },
  demo:   { bg: 'rgba(255,255,255, 0.03)',   color: '#555',    dot: '#444',    label: 'Demo' },
}

function SourceBadge({ source }) {
  if (!source) return null
  const s = SOURCE_BADGE[source] || SOURCE_BADGE.cached
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '1px 7px',
      background: s.bg,
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 'var(--radius-full)',
      fontSize: '0.65rem',
      color: s.color,
      fontFamily: 'var(--font-mono)',
    }}>
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      {s.label}
    </span>
  )
}

// Split "A → B" or "A ↔ B" into two parts
function parseConnects(connects) {
  if (!connects) return [null, null]
  const sep = connects.includes('↔') ? '↔' : connects.includes('→') ? '→' : null
  if (!sep) return [connects, null]
  const parts = connects.split(sep).map(s => s.trim())
  return [parts[0] || null, parts[1] || null]
}

function strengthColor(s) {
  if (s >= 0.8) return 'var(--accent)'
  if (s >= 0.55) return 'var(--success)'
  return 'var(--text-muted)'
}

export default function BridgePanel({ bridges = [], liveSource }) {
  if (!bridges.length) {
    return (
      <div style={{ padding: 'var(--space-6)', color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center' }}>
        Noch keine Brücken analysiert.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
        <span className="badge badge--cyan">{bridges.length} Brücken</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Konzeptuelle Gateways</span>
        {liveSource && <SourceBadge source={liveSource} />}
      </div>

      {bridges.map((bridge) => {
        const id = bridge.id || bridge.concept || String(Math.random())
        const title = bridge.title || bridge.label || 'Unbekannte Brücke'
        const connects = bridge.connects || ''
        const why = bridge.why || bridge.insight || ''
        const strength = bridge.strength ?? 0.5
        const graphName = bridge.graph || ''
        const source = bridge.source || liveSource || null
        const [nodeA, nodeB] = parseConnects(connects)
        const sColor = strengthColor(strength)

        return (
          <div
            key={id}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
              transition: 'border-color var(--transition-fast)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-focus)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            {/* Title + source */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--accent)', flex: 1, lineHeight: 1.4 }}>
                {title}
              </div>
              {source && <SourceBadge source={source} />}
            </div>

            {/* Two-column: Node A ↔ Node B */}
            {(nodeA || nodeB) && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: nodeB ? '1fr auto 1fr' : '1fr',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8,
                padding: '6px 8px',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-muted)',
              }}>
                {nodeA && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text)', textAlign: 'left', lineHeight: 1.3 }}>
                    {nodeA}
                  </div>
                )}
                {nodeB && (
                  <>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', flexShrink: 0 }}>
                      ↔
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text)', textAlign: 'right', lineHeight: 1.3 }}>
                      {nodeB}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Why / Insight */}
            {why && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 8 }}>
                {why}
              </div>
            )}

            {/* Strength bar + graph label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                flex: 1, height: 2,
                background: 'var(--border-muted)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${strength * 100}%`,
                  height: '100%',
                  background: sColor,
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <span style={{ fontSize: '0.65rem', color: sColor, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                {Math.round(strength * 100)}%
              </span>
              {graphName && (
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', opacity: 0.65 }}>
                  {graphName.replace('lebergott-', '')}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
