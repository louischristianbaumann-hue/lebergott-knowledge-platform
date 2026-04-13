/* ============================================================
   GapPanel.jsx — Knowledge Gaps (InfraNodus live + cached)

   Supports two data formats:
     1. InfraNodus live/cached: { id, title, reason, bridge, bridge_potential, graph, source }
     2. Demo fallback:          { id, title, reason, bridge, connections }
   ============================================================ */

import React from 'react'

// Source badge colors
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

function BridgePotentialBar({ value }) {
  if (value == null) return null
  const pct = Math.round(value * 100)
  const color = pct >= 80 ? '#c5a55a' : pct >= 60 ? '#4a7c59' : '#888'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
      <div style={{
        flex: 1, height: 2,
        background: 'rgba(0,0,0,0.06)',
        borderRadius: 2, overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: color,
          borderRadius: 2,
          boxShadow: `0 0 4px ${color}66`,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{ fontSize: '0.65rem', color, fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
        {pct}% Brückenpotenzial
      </span>
    </div>
  )
}

export default function GapPanel({ gaps = [], onGapClick, liveSource }) {
  if (!gaps.length) {
    return (
      <div style={{ padding: 'var(--space-6)', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
        Keine Lücken gefunden. Gut vernetztes Wissen!
      </div>
    )
  }

  return (
    <div className="panel-enter" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
        <span className="badge badge--amber">{gaps.length} Lücken</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          InfraNodus Wissensgraphen
        </span>
        {liveSource && <SourceBadge source={liveSource} />}
      </div>

      {gaps.map((gap) => {
        // Normalize field names (live InfraNodus vs demo format)
        const id = gap.id || gap.concept || String(Math.random())
        const title = gap.title || gap.label || 'Unbekannte Lücke'
        const reason = gap.reason || gap.description || ''
        const bridge = gap.bridge || ''
        const connections = gap.connections ?? 0
        const bridgePotential = gap.bridge_potential ?? null
        const graphName = gap.graph || ''
        const source = gap.source || liveSource || null

        return (
          <div
            key={id}
            className="gap-item"
            onClick={() => onGapClick?.(gap)}
            style={{ cursor: onGapClick ? 'pointer' : 'default' }}
          >
            {/* Title row */}
            <div className="gap-item__title" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
              <span>
                <span style={{ marginRight: 'var(--space-2)' }}>⬡</span>
                {title}
              </span>
              {source && <SourceBadge source={source} />}
            </div>

            {/* Reason */}
            {reason && <div className="gap-item__reason">{reason}</div>}

            {/* Bridge suggestion */}
            {bridge && (
              <div className="gap-item__bridge">
                → {bridge}
              </div>
            )}

            {/* Bridge potential bar (InfraNodus live) */}
            {bridgePotential != null && <BridgePotentialBar value={bridgePotential} />}

            {/* Footer: connections + graph name */}
            <div style={{
              marginTop: 'var(--space-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-2)',
            }}>
              <span className="spore-count" style={{ color: 'var(--gap-amber-dim)' }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: 'var(--gap-amber)', display: 'inline-block',
                }} />
                {connections} Verbindung{connections !== 1 ? 'en' : ''}
              </span>
              {graphName && (
                <span style={{
                  fontSize: '0.62rem',
                  color: 'var(--text-muted)',
                  fontFamily: "'DM Sans', sans-serif",
                  opacity: 0.7,
                }}>
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
