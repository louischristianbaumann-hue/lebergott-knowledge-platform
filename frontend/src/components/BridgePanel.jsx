/* ============================================================
   BridgePanel.jsx — Conceptual Bridges (InfraNodus live + cached)

   Supports two data formats:
     1. InfraNodus live/cached: { id, title, connects, why, strength, graph, source }
     2. Demo fallback:          { id, title, connects, why, strength }
   ============================================================ */

import React from 'react'

// Source badge
const SOURCE_BADGE = {
  live:   { bg: 'rgba(26, 58, 42, 0.12)', color: '#1a3a2a', dot: '#2d5a3d', label: 'Live' },
  cached: { bg: 'rgba(197, 165, 90, 0.10)', color: '#9e8648', dot: '#c5a55a', label: 'Cached' },
  demo:   { bg: 'rgba(100, 100, 100, 0.08)', color: '#888', dot: '#aaa', label: 'Demo' },
}

function SourceBadge({ source }) {
  if (!source) return null
  const s = SOURCE_BADGE[source] || SOURCE_BADGE.cached
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '1px 6px',
      background: s.bg,
      borderRadius: 8,
      fontSize: '0.65rem',
      color: s.color,
      fontFamily: "'DM Sans', sans-serif",
      letterSpacing: '0.04em',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      {s.label}
    </span>
  )
}

function strengthLabel(s) {
  if (s >= 0.85) return { text: 'Stark', color: 'var(--accent-green)' }
  if (s >= 0.65) return { text: 'Mittel', color: 'var(--accent-teal)' }
  return { text: 'Schwach', color: 'var(--text-muted)' }
}

export default function BridgePanel({ bridges = [], liveSource }) {
  if (!bridges.length) {
    return (
      <div style={{ padding: 'var(--space-6)', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
        Noch keine Brücken analysiert.
      </div>
    )
  }

  return (
    <div className="panel-enter" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
        <span className="badge badge--cyan">{bridges.length} Brücken</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Konzeptuelle Gateways
        </span>
        {liveSource && <SourceBadge source={liveSource} />}
      </div>

      {bridges.map((bridge) => {
        // Normalize field names (live InfraNodus vs demo format)
        const id = bridge.id || bridge.concept || String(Math.random())
        const title = bridge.title || bridge.label || 'Unbekannte Brücke'
        const connects = bridge.connects || ''
        const why = bridge.why || bridge.insight || ''
        const strength = bridge.strength ?? 0.5
        const graphName = bridge.graph || ''
        const source = bridge.source || liveSource || null
        const sl = strengthLabel(strength)

        return (
          <div key={id} className="bridge-item">
            {/* Title row */}
            <div className="bridge-item__title" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
              <span>
                <span style={{ marginRight: 'var(--space-2)' }}>⟷</span>
                {title}
              </span>
              {source && <SourceBadge source={source} />}
            </div>

            {/* Connects */}
            {connects && <div className="bridge-item__connects">{connects}</div>}

            {/* Why / Insight */}
            {why && <div className="bridge-item__why">{why}</div>}

            {/* Strength bar + graph label */}
            <div style={{
              marginTop: 'var(--space-2)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
            }}>
              <div style={{
                flex: 1, height: 2,
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${strength * 100}%`,
                  height: '100%',
                  background: sl.color,
                  borderRadius: 'var(--radius-full)',
                  boxShadow: `0 0 4px ${sl.color}`,
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <span style={{
                fontSize: '0.7rem', color: sl.color,
                fontFamily: 'var(--font-mono)', flexShrink: 0,
              }}>
                {sl.text}
              </span>
            </div>

            {/* Graph name tag */}
            {graphName && (
              <div style={{
                marginTop: 4,
                fontSize: '0.62rem',
                color: 'var(--text-muted)',
                fontFamily: "'DM Sans', sans-serif",
                opacity: 0.65,
              }}>
                {graphName.replace('lebergott-', '')}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
