/* ============================================================
   GapPanel.jsx — Knowledge Gaps (InfraNodus live + cached)
   Dark card style, data-focused, Explore button per gap
   ============================================================ */

import React from 'react'

const SOURCE_BADGE = {
  live:   { bg: 'rgba(0, 212, 255, 0.08)',   color: '#00d4ff', dot: '#00d4ff', label: 'Live' },
  cached: { bg: 'rgba(255,255,255, 0.04)',    color: '#888',    dot: '#555',    label: 'Cached' },
  demo:   { bg: 'rgba(255,255,255, 0.03)',    color: '#555',    dot: '#444',    label: 'Demo' },
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
      letterSpacing: '0.05em',
    }}>
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      {s.label}
    </span>
  )
}

function BridgePotentialBar({ value }) {
  if (value == null) return null
  const pct = Math.round(value * 100)
  const color = pct >= 75 ? 'var(--accent)' : pct >= 50 ? 'var(--success)' : 'var(--text-dim)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
      <div style={{
        flex: 1, height: 2,
        background: 'var(--border-muted)',
        borderRadius: 2, overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: color,
          borderRadius: 2,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{ fontSize: '0.65rem', color, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
        {pct}%
      </span>
    </div>
  )
}

export default function GapPanel({ gaps = [], onGapClick, liveSource }) {
  if (!gaps.length) {
    return (
      <div style={{ padding: 'var(--space-6)', color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center' }}>
        Keine Lücken gefunden — gut vernetztes Wissen.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
        <span className="badge badge--amber">{gaps.length} Lücken</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>InfraNodus</span>
        {liveSource && <SourceBadge source={liveSource} />}
      </div>

      {gaps.map((gap) => {
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
            {/* Title row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: reason ? 6 : 0 }}>
              <div style={{
                fontSize: '0.82rem', fontWeight: 500,
                color: 'var(--warning)',
                lineHeight: 1.4,
                flex: 1,
              }}>
                {title}
              </div>
              {source && <SourceBadge source={source} />}
            </div>

            {/* Reason */}
            {reason && (
              <div style={{
                fontSize: '0.75rem', color: 'var(--text-muted)',
                lineHeight: 1.5, marginBottom: bridge ? 6 : 0,
              }}>
                {reason}
              </div>
            )}

            {/* Bridge suggestion */}
            {bridge && (
              <div style={{
                fontSize: '0.72rem',
                color: 'var(--accent)',
                padding: '4px 8px',
                background: 'var(--accent-glow)',
                border: '1px solid rgba(0,212,255,0.12)',
                borderRadius: 'var(--radius-sm)',
                marginTop: 6,
                marginBottom: 4,
              }}>
                → {bridge}
              </div>
            )}

            {/* Bridge potential bar */}
            {bridgePotential != null && <BridgePotentialBar value={bridgePotential} />}

            {/* Footer */}
            <div style={{
              marginTop: 10,
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: 8,
            }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {connections} Verbindung{connections !== 1 ? 'en' : ''}
                {graphName && ` · ${graphName.replace('lebergott-', '')}`}
              </span>
              {onGapClick && (
                <button
                  onClick={() => onGapClick(gap)}
                  style={{
                    padding: '3px 10px',
                    background: 'transparent',
                    border: '1px solid var(--border-focus)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.68rem',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    transition: 'all var(--transition-fast)',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                    e.currentTarget.style.color = 'var(--accent)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-focus)'
                    e.currentTarget.style.color = 'var(--text-muted)'
                  }}
                >
                  Explore
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
