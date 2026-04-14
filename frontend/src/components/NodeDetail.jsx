/* ============================================================
   NodeDetail.jsx — Click a node → slide-in panel from right
   Shows node name, connections list, related content
   ============================================================ */

import React, { useState, useEffect } from 'react'
import { api } from '../utils/api.js'
import { getClusterColor } from '../utils/graphPhysics.js'

export default function NodeDetail({ node, graphData, onClose, onNodeNavigate, vaultId = 'lebergott' }) {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('content')
  const [visible, setVisible] = useState(false)

  // Trigger slide-in animation on mount
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  // Load content when node changes
  useEffect(() => {
    if (!node) return
    setLoading(true)
    setActiveTab('content')

    fetch(`${api.baseUrl}/node/${vaultId}/${node.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setContent(data || null))
      .catch(() => setContent(null))
      .finally(() => setLoading(false))
  }, [node?.id, vaultId])

  if (!node) return null

  const relatedLinks = graphData?.links?.filter((l) => {
    const src = l.source?.id || l.source
    const tgt = l.target?.id || l.target
    return src === node.id || tgt === node.id
  }) ?? []

  const connectedNodeIds = relatedLinks.map((l) => {
    const src = l.source?.id || l.source
    const tgt = l.target?.id || l.target
    return src === node.id ? tgt : src
  })

  const connectedNodes = graphData?.nodes?.filter((n) =>
    connectedNodeIds.includes(n.id)
  ) ?? []

  const nodeColor = node.isGap
    ? 'var(--warning)'
    : getClusterColor(node.cluster)

  const renderContent = (text) => {
    if (!text) return null
    let clean = text
    if (clean.startsWith('---')) {
      const end = clean.indexOf('---', 3)
      if (end > 0) clean = clean.slice(end + 3).trim()
    }
    const parts = clean.split(/(\[\[.+?\]\])/)
    return parts.map((part, i) => {
      const match = part.match(/^\[\[(.+?)\]\]$/)
      if (match) {
        const linkText = match[1]
        const targetNode = graphData?.nodes?.find(
          (n) => n.label.toLowerCase() === linkText.toLowerCase() ||
                 n.id.toLowerCase() === linkText.toLowerCase().replace(/\s+/g, '-')
        )
        return (
          <button
            key={i}
            onClick={() => targetNode && onNodeNavigate?.(targetNode)}
            style={{
              background: 'rgba(0, 212, 255, 0.07)',
              border: '1px solid rgba(0, 212, 255, 0.18)',
              borderRadius: '3px',
              padding: '0 4px',
              color: targetNode ? 'var(--accent)' : 'var(--text-muted)',
              cursor: targetNode ? 'pointer' : 'default',
              fontSize: 'inherit',
              fontFamily: 'inherit',
              textDecoration: targetNode ? 'none' : 'line-through',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (targetNode) e.target.style.background = 'rgba(0, 212, 255, 0.14)'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(0, 212, 255, 0.07)'
            }}
            title={targetNode ? `Navigiere zu ${linkText}` : `${linkText} — nicht im Graph`}
          >
            {linkText}
          </button>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  const tabs = [
    { id: 'content', label: 'Inhalt' },
    { id: 'connections', label: `Links (${connectedNodes.length})` },
  ]
  if (content?.tags?.length) tabs.push({ id: 'meta', label: 'Meta' })

  const nodeTypeLabel = node.isHub ? 'HUB' : node.isGap ? 'LÜCKE' : 'KNOTEN'

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 360,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border)',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 220ms ease, opacity 220ms ease',
        overflow: 'hidden',
        zIndex: 10,
        boxShadow: '-4px 0 24px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header */}
      <div style={{
        padding: 'var(--space-4) var(--space-5)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: nodeColor,
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: '0.65rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.08em',
            }}>
              {nodeTypeLabel}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Schließen"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            ✕
          </button>
        </div>

        <h4 style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--text)', marginBottom: 'var(--space-2)', lineHeight: 1.3 }}>
          {node.label}
        </h4>

        <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          <span>{node.connections} Verbindungen</span>
          {content?.word_count > 0 && <span>{content.word_count} Wörter</span>}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        padding: '0 var(--space-4)',
        flexShrink: 0,
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id
                ? '2px solid var(--accent)' : '2px solid transparent',
              fontSize: '0.72rem',
              color: activeTab === tab.id ? 'var(--text)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'color var(--transition-fast)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4) var(--space-5)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--accent)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            Lade Inhalt…
          </div>
        ) : activeTab === 'content' ? (
          <div style={{ fontSize: '0.78rem', lineHeight: 1.7, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {content?.content ? (
              renderContent(content.content)
            ) : (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Kein Inhalt verfügbar.
                <code style={{
                  display: 'block', marginTop: 'var(--space-2)',
                  padding: 'var(--space-2)', background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-sm)', fontSize: '0.7rem',
                }}>
                  uvicorn backend.main:app --reload
                </code>
              </div>
            )}
          </div>
        ) : activeTab === 'connections' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {connectedNodes.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Keine Verbindungen — isolierter Knoten
              </div>
            ) : (
              connectedNodes.map((cn) => {
                const link = relatedLinks.find((l) => {
                  const src = l.source?.id || l.source
                  const tgt = l.target?.id || l.target
                  return (src === node.id && tgt === cn.id) || (tgt === node.id && src === cn.id)
                })
                const strength = link?.strength ?? 0.5
                const cnColor = cn.isGap ? 'var(--warning)' : getClusterColor(cn.cluster)

                return (
                  <button
                    key={cn.id}
                    onClick={() => onNodeNavigate?.(cn)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                      padding: 'var(--space-2) var(--space-3)',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      transition: 'border-color var(--transition-fast)',
                      width: '100%',
                      textAlign: 'left',
                      fontFamily: 'var(--font-sans)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = cnColor}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: cnColor, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cn.label}
                    </div>
                    <div style={{ width: 32, height: 2, background: 'var(--bg-surface)', borderRadius: 'var(--radius-full)', overflow: 'hidden', flexShrink: 0 }}>
                      <div style={{ width: `${strength * 100}%`, height: '100%', background: cnColor, borderRadius: 'var(--radius-full)' }} />
                    </div>
                  </button>
                )
              })
            )}
          </div>
        ) : (
          /* Meta tab */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {content?.tags?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Tags
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                  {content.tags.map((tag) => (
                    <span key={tag} style={{
                      padding: '2px 8px', background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.67rem', color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {content?.wikilinks?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Wikilinks ({content.wikilinks.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                  {content.wikilinks.map((link, i) => (
                    <span key={i} style={{
                      padding: '2px 6px',
                      background: 'rgba(0, 212, 255, 0.05)',
                      border: '1px solid rgba(0, 212, 255, 0.14)',
                      borderRadius: '3px',
                      fontSize: '0.67rem', color: 'var(--accent)',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      [[{link}]]
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gap advice */}
        {node.isGap && (
          <div style={{
            marginTop: 'var(--space-4)',
            background: 'rgba(245, 158, 11, 0.05)',
            border: '1px solid rgba(245, 158, 11, 0.18)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3) var(--space-4)',
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--warning)', fontWeight: 500, marginBottom: 'var(--space-1)' }}>
              Empfehlung
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Isolierter Knoten — füge [[Wikilinks]] zu verwandten Konzepten hinzu.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
