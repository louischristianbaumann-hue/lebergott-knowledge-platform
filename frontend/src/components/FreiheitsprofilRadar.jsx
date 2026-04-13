/* ============================================================
   FreiheitsprofilRadar.jsx
   7-axis radar chart — Steiner Freiheitsprofil
   ============================================================ */

import React, { useMemo } from 'react'

const SIZE = 280
const CENTER = SIZE / 2
const MAX_RADIUS = 100
const LEVELS = 5

function polarToXY(angle, radius) {
  return {
    x: CENTER + radius * Math.cos(angle - Math.PI / 2),
    y: CENTER + radius * Math.sin(angle - Math.PI / 2),
  }
}

function formatPolygonPoints(points) {
  return points.map((p) => `${p.x},${p.y}`).join(' ')
}

export default function FreiheitsprofilRadar({ profil }) {
  const dims = profil?.dimensions ?? []
  const n = dims.length
  const angleStep = (2 * Math.PI) / n

  // ---- Grid rings ----
  const rings = useMemo(() => {
    return Array.from({ length: LEVELS }, (_, i) => {
      const r = (MAX_RADIUS / LEVELS) * (i + 1)
      const points = Array.from({ length: n }, (_, j) => {
        const angle = j * angleStep
        return polarToXY(angle, r)
      })
      return { r, points }
    })
  }, [n, angleStep])

  // ---- Axis endpoints ----
  const axes = useMemo(() =>
    dims.map((d, i) => {
      const angle = i * angleStep
      const end = polarToXY(angle, MAX_RADIUS)
      const labelPos = polarToXY(angle, MAX_RADIUS + 26)
      return { ...d, angle, end, labelPos }
    }),
    [dims, angleStep]
  )

  // ---- Data polygon ----
  const dataPoints = useMemo(() =>
    dims.map((d, i) => {
      const angle = i * angleStep
      const r = (d.score / 5) * MAX_RADIUS
      return polarToXY(angle, r)
    }),
    [dims, angleStep]
  )

  if (!profil || !dims.length) return null

  const scoreColor = (score) => {
    if (score >= 4) return 'var(--accent-green)'
    if (score >= 3) return 'var(--accent-teal)'
    return 'var(--gap-amber)'
  }

  return (
    <div className="radar-container" style={{ textAlign: 'center' }}>
      <svg
        className="radar-svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        style={{ overflow: 'visible' }}
      >
        {/* ---- Grid rings ---- */}
        {rings.map((ring, ri) => (
          <polygon
            key={ri}
            className="radar-ring"
            points={formatPolygonPoints(ring.points)}
          />
        ))}

        {/* ---- Axes ---- */}
        {axes.map((axis, i) => (
          <line
            key={i}
            className="radar-axis"
            x1={CENTER}
            y1={CENTER}
            x2={axis.end.x}
            y2={axis.end.y}
          />
        ))}

        {/* ---- Data polygon ---- */}
        <polygon
          className="radar-polygon"
          points={formatPolygonPoints(dataPoints)}
        />

        {/* ---- Dots at each dimension ---- */}
        {dataPoints.map((pt, i) => (
          <circle
            key={i}
            className="radar-dot"
            cx={pt.x}
            cy={pt.y}
            r={4}
          />
        ))}

        {/* ---- Axis labels ---- */}
        {axes.map((axis, i) => (
          <text
            key={i}
            x={axis.labelPos.x}
            y={axis.labelPos.y}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fontSize: '10px',
              fill: 'var(--text-secondary)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {axis.label.split(' ').map((word, wi) => (
              <tspan key={wi} x={axis.labelPos.x} dy={wi === 0 ? 0 : 12}>
                {word}
              </tspan>
            ))}
          </text>
        ))}

        {/* ---- Level labels (1–5) ---- */}
        {Array.from({ length: LEVELS }, (_, i) => (
          <text
            key={i}
            x={CENTER + 3}
            y={CENTER - (MAX_RADIUS / LEVELS) * (i + 1) + 3}
            style={{
              fontSize: '8px',
              fill: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {i + 1}
          </text>
        ))}
      </svg>

      {/* ---- Score ring in center ---- */}
      <div style={{ marginTop: '-20px', marginBottom: 'var(--space-3)' }}>
        <div className="score-ring" style={{ margin: '0 auto' }}>
          {profil.freiheitsindex?.toFixed(1)}
        </div>
      </div>

      <div style={{ fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: 500 }}>
        {profil.archetype}
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
        Freiheitsindex
      </div>

      {/* ---- Dimension breakdown ---- */}
      <div style={{ marginTop: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {dims.map((d) => (
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{
              width: 90,
              fontSize: '0.72rem',
              color: 'var(--text-secondary)',
              textAlign: 'right',
              flexShrink: 0,
            }}>
              {d.label}
            </div>
            <div style={{
              flex: 1,
              height: 4,
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${(d.score / 5) * 100}%`,
                height: '100%',
                background: scoreColor(d.score),
                borderRadius: 'var(--radius-full)',
                boxShadow: `0 0 6px ${scoreColor(d.score)}`,
                transition: 'width 0.8s ease',
              }} />
            </div>
            <div style={{
              width: 28,
              fontSize: '0.72rem',
              color: scoreColor(d.score),
              fontFamily: 'var(--font-mono)',
              textAlign: 'right',
              flexShrink: 0,
            }}>
              {d.score.toFixed(1)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
