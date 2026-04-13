/* ============================================================
   DimensionCard.jsx — Single Steiner dimension score
   ============================================================ */

import React from 'react'

const scoreColor = (score) => {
  if (score >= 4) return 'var(--accent-green)'
  if (score >= 3) return 'var(--accent-teal)'
  if (score >= 2) return 'var(--gap-amber)'
  return 'var(--gap-amber-dim)'
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
    <div className="card" style={{ padding: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
            {label}
          </div>
          {description && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {description}
            </div>
          )}
        </div>
        <div style={{
          fontSize: '1.1rem',
          fontFamily: 'var(--font-mono)',
          color,
          fontWeight: 500,
          flexShrink: 0,
          marginLeft: 'var(--space-3)',
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
          boxShadow: `0 0 6px ${color}`,
          transition: 'width 0.8s ease',
        }} />
      </div>

      <div style={{
        marginTop: 'var(--space-2)',
        fontSize: '0.7rem',
        color,
        fontFamily: 'var(--font-mono)',
      }}>
        {scoreLabel(score)}
      </div>
    </div>
  )
}
