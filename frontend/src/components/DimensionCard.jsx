/* ============================================================
   DimensionCard.jsx — Single Steiner dimension score
   Dark card style, clean data display
   ============================================================ */

import React from 'react'

const scoreColor = (score) => {
  if (score >= 4) return 'var(--success)'
  if (score >= 3) return 'var(--accent)'
  if (score >= 2) return 'var(--warning)'
  return 'var(--danger)'
}

const scoreLabel = (score) => {
  if (score >= 4.5) return 'Exzellent'
  if (score >= 4.0) return 'Stark'
  if (score >= 3.0) return 'Mittel'
  if (score >= 2.0) return 'Schwach'
  return 'Kritisch'
}

export default function DimensionCard({ dimension }) {
  if (!dimension) return null

  const { label, score, description } = dimension
  const color = scoreColor(score)
  const pct = (score / 5) * 100

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-4)',
      transition: 'border-color var(--transition-fast)',
    }}
    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-focus)'}
    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
        <div style={{ flex: 1, paddingRight: 'var(--space-3)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>
            {label}
          </div>
          {description && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {description}
            </div>
          )}
        </div>
        <div style={{
          fontSize: '1.05rem',
          fontFamily: 'var(--font-mono)',
          color,
          fontWeight: 500,
          flexShrink: 0,
        }}>
          {score.toFixed(1)}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 3,
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: 'var(--radius-full)',
          transition: 'width 0.8s ease',
        }} />
      </div>

      <div style={{
        marginTop: 'var(--space-2)',
        fontSize: '0.68rem',
        color,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.04em',
      }}>
        {scoreLabel(score)}
      </div>
    </div>
  )
}
