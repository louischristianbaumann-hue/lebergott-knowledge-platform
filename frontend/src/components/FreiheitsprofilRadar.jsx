/* ============================================================
   FreiheitsprofilRadar.jsx
   7-axis radar chart — Steiner Freiheitsprofil
   Dark bg, accent fills, clean axis labels
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

// Accent colors for the data polygon fill
const POLY_FILL   = 'rgba(0, 212, 255, 0.10)'
const POLY_STROKE = 'rgba(0, 212, 255, 0.60)'
const DOT_COLOR   = '#00d4ff'
const RING_STROKE = 'rgba(255,255,255,0.06)'
const AXIS_STROKE = 'rgba(255,255,255,0.08)'

const scoreColor = (score) => {
  if (score >= 4) return 'var(--success)'
  if (score >= 3) return 'var(--accent)'
  return 'var(--warning)'
}

export default function FreiheitsprofilRadar({ profil }) {
  const dims = profil?.dimensions ?? []
  const n = dims.length
  const angleStep = (2 * Math.PI) / n

  const rings = useMemo(() => {
    return Array.from({ length: LEVELS }, (_, i) => {
      const r = (MAX_RADIUS / LEVELS) * (i + 1)
      const points = Array.from({ length: n }, (_, j) => polarToXY(j * angleStep, r))
      return { r, points }
    })
  }, [n, angleStep])

  const axes = useMemo(() =>
    dims.map((d, i) => {
      const angle = i * angleStep
      return { ...d, angle, end: polarToXY(angle, MAX_RADIUS), labelPos: polarToXY(angle, MAX_RADIUS + 26) }
    }),
    [dims, angleStep]
  )

  const dataPoints = useMemo(() =>
    dims.map((d, i) => polarToXY(i * angleStep, (d.score / 5) * MAX_RADIUS)),
    [dims, angleStep]
  )

  if (!profil || !dims.length) return null

  return (
    <div style={{ textAlign: 'center' }}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        style={{ overflow: 'visible', display: 'block', margin: '0 auto' }}
      >
        {/* Grid rings */}
        {rings.map((ring, ri) => (
          <polygon
            key={ri}
            points={formatPolygonPoints(ring.points)}
            fill="none"
            stroke={RING_STROKE}
            strokeWidth={1}
          />
        ))}

        {/* Axes */}
        {axes.map((axis, i) => (
          <line
            key={i}
            x1={CENTER} y1={CENTER}
            x2={axis.end.x} y2={axis.end.y}
            stroke={AXIS_STROKE}
            strokeWidth={1}
          />
        ))}

        {/* Data polygon */}
        <polygon
          points={formatPolygonPoints(dataPoints)}
          fill={POLY_FILL}
          stroke={POLY_STROKE}
          strokeWidth={1.5}
        />

        {/* Dots */}
        {dataPoints.map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r={3.5} fill={DOT_COLOR} />
        ))}

        {/* Axis labels */}
        {axes.map((axis, i) => (
          <text
            key={i}
            x={axis.labelPos.x}
            y={axis.labelPos.y}
            textAnchor="middle"
            dominantBaseline="central"
            style={{ fontSize: '9px', fill: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-sans)' }}
          >
            {axis.label.split(' ').map((word, wi) => (
              <tspan key={wi} x={axis.labelPos.x} dy={wi === 0 ? 0 : 11}>{word}</tspan>
            ))}
          </text>
        ))}

        {/* Level labels */}
        {Array.from({ length: LEVELS }, (_, i) => (
          <text
            key={i}
            x={CENTER + 4}
            y={CENTER - (MAX_RADIUS / LEVELS) * (i + 1) + 3}
            style={{ fontSize: '7px', fill: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono)' }}
          >
            {i + 1}
          </text>
        ))}
      </svg>

      {/* Center score */}
      <div style={{ marginTop: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 52, height: 52,
          border: '1px solid rgba(0,212,255,0.25)',
          borderRadius: '50%',
          background: 'rgba(0,212,255,0.06)',
          fontSize: '1.1rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--accent)',
          fontWeight: 500,
        }}>
          {profil.freiheitsindex?.toFixed(1)}
        </div>
      </div>

      <div style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 500 }}>
        {profil.archetype}
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
        Freiheitsindex
      </div>

      {/* Dimension breakdown */}
      <div style={{ marginTop: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {dims.map((d) => {
          const color = scoreColor(d.score)
          return (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{
                width: 88,
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                textAlign: 'right',
                flexShrink: 0,
                lineHeight: 1.3,
              }}>
                {d.label}
              </div>
              <div style={{
                flex: 1,
                height: 3,
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${(d.score / 5) * 100}%`,
                  height: '100%',
                  background: color,
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 0.8s ease',
                }} />
              </div>
              <div style={{
                width: 26,
                fontSize: '0.7rem',
                color,
                fontFamily: 'var(--font-mono)',
                textAlign: 'right',
                flexShrink: 0,
              }}>
                {d.score.toFixed(1)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
