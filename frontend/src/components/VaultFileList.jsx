/* ============================================================
   VaultFileList.jsx — Sidebar list of vault files / nodes
   ============================================================ */

import React, { useState, useMemo } from 'react'
import { getClusterColor } from '../utils/graphPhysics.js'

export default function VaultFileList({ nodes = [], onNodeSelect, selectedId }) {
  const [search, setSearch] = useState('')
  const [filterCluster, setFilterCluster] = useState('all')
  const [showGapsOnly, setShowGapsOnly] = useState(false)

  const clusters = useMemo(() => {
    const seen = new Set()
    const result = []
    nodes.forEach((n) => {
      if (n.cluster >= 0 && !seen.has(n.cluster)) {
        seen.add(n.cluster)
        result.push(n.cluster)
      }
    })
    return result.sort((a, b) => a - b)
  }, [nodes])

  const filtered = useMemo(() => {
    return nodes.filter((n) => {
      if (search && !n.label.toLowerCase().includes(search.toLowerCase())) return false
      if (filterCluster !== 'all' && String(n.cluster) !== filterCluster) return false
      if (showGapsOnly && !n.isGap) return false
      return true
    })
  }, [nodes, search, filterCluster, showGapsOnly])

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => b.connections - a.connections),
    [filtered]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search */}
      <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border-subtle)' }}>
        <input
          type="text"
          placeholder="Suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-2) var(--space-3)',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-sans)',
            outline: 'none',
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--border-medium)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
        />
      </div>

      {/* Filters */}
      <div style={{
        padding: 'var(--space-2) var(--space-4)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        gap: 'var(--space-2)',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <button
          onClick={() => setShowGapsOnly(!showGapsOnly)}
          style={{
            background: showGapsOnly ? 'rgba(255,153,68,0.12)' : 'transparent',
            border: `1px solid ${showGapsOnly ? 'rgba(255,153,68,0.4)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-sm)',
            padding: '2px var(--space-2)',
            fontSize: '0.7rem',
            color: showGapsOnly ? 'var(--gap-amber)' : 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          Nur Lücken
        </button>

        <select
          value={filterCluster}
          onChange={(e) => setFilterCluster(e.target.value)}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px var(--space-2)',
            fontSize: '0.7rem',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <option value="all">Alle Cluster</option>
          {clusters.map((c) => (
            <option key={c} value={String(c)}>Cluster {c}</option>
          ))}
        </select>

        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {sorted.length} / {nodes.length}
        </span>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sorted.map((n) => {
          const nodeColor = n.isGap ? 'var(--gap-amber)' : getClusterColor(n.cluster)
          const isSelected = n.id === selectedId

          return (
            <div
              key={n.id}
              onClick={() => onNodeSelect?.(n)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-2) var(--space-4)',
                cursor: 'pointer',
                background: isSelected ? 'var(--bg-card-hover)' : 'transparent',
                borderLeft: isSelected ? `2px solid ${nodeColor}` : '2px solid transparent',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.background = 'var(--bg-card)'
              }}
              onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.background = 'transparent'
              }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: nodeColor,
                boxShadow: `0 0 4px ${nodeColor}`,
                flexShrink: 0,
              }} />

              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{
                  fontSize: '0.78rem',
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: n.isHub ? 500 : 400,
                }}>
                  {n.label}
                </div>
              </div>

              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                {n.connections}
              </div>
            </div>
          )
        })}

        {sorted.length === 0 && (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Keine Ergebnisse
          </div>
        )}
      </div>
    </div>
  )
}
