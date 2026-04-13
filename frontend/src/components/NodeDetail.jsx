/* ============================================================
   NodeDetail.jsx — Click a node → see REAL content + connections
   Loads markdown content from API, makes connections clickable
   ============================================================ */

import React, { useState, useEffect } from 'react'
import { api } from '../utils/api.js'
import { getClusterColor } from '../utils/graphPhysics.js'

export default function NodeDetail({ node, graphData, onClose, onNodeNavigate, vaultId = 'lebergott' }) {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('content')

  // Load real content when node changes
  useEffect(() => {
    if (!node) return
    setLoading(true)
    setActiveTab('content')

    fetch(`${api.baseUrl}/node/${vaultId}/${node.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setContent(data)
        else setContent(null)
      })
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
    ? 'var(--gap-amber)'
    : getClusterColor(node.cluster)

  // Render wikilinks in content as clickable
  const renderContent = (text) => {
    if (!text) return null
    // Strip YAML frontmatter
    let clean = text
    if (clean.startsWith('---')) {
      const end = clean.indexOf('---', 3)
      if (end > 0) clean = clean.slice(end + 3).trim()
    }

    // Split by wikilinks and make them clickable
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
              background: 'rgba(0, 255, 136, 0.08)',
              border: '1px solid rgba(0, 255, 136, 0.2)',
              borderRadius: '3px',
              padding: '0 4px',
              color: targetNode ? 'var(--accent-green)' : 'var(--text-muted)',
              cursor: targetNode ? 'pointer' : 'default',
              fontSize: 'inherit',
              fontFamily: 'inherit',
              textDecoration: targetNode ? 'none' : 'line-through',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (targetNode) e.target.style.background = 'rgba(0, 255, 136, 0.15)'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(0, 255, 136, 0.08)'
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
  if (content?.tags?.length) {
    tabs.push({ id: 'meta', label: 'Meta' })
  }

  return (
    <div className="node-detail" style={{ width: 380 }}>
      {/* Header */}
      <div className="node-detail__header">
        <button className="node-detail__close" onClick={onClose} aria-label="Schließen">
          ✕
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
          <div style={{
            width: 16, height: 16, borderRadius: '50%',
            background: nodeColor,
            boxShadow: `0 0 8px ${nodeColor}`,
            flexShrink: 0,
          }} />
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {node.isHub ? 'HUB' : node.isGap ? 'LÜCKE' : 'KNOTEN'}
          </div>
        </div>

        <h4 style={{ fontSize: '0.95rem', fontWeight: 500, marginBottom: 'var(--space-1)' }}>
          {node.label}
        </h4>

        {/* Stats row */}
        <div style={{
          display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-2)',
          fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
        }}>
          <span>{node.connections} Verbindungen</span>
          {content?.word_count > 0 && <span>{content.word_count} Wörter</span>}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--border-subtle)',
        padding: '0 var(--space-4)',
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
                ? '2px solid var(--accent-green)' : '2px solid transparent',
              fontSize: '0.75rem',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'all var(--transition-fast)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4) var(--space-5)' }}>
        {loading ? (
          <div style={{
            textAlign: 'center', padding: 'var(--space-6)',
            color: 'var(--accent-green)', fontSize: '0.78rem',
            fontFamily: 'var(--font-mono)',
          }}>
            Lade Inhalt...
          </div>
        ) : activeTab === 'content' ? (
          /* ---- Content tab ---- */
          <div style={{
            fontSize: '0.8rem', lineHeight: 1.7, color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {content?.content ? (
              renderContent(content.content)
            ) : (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Kein Inhalt verfügbar. Starte das Backend:
                <code style={{
                  display: 'block', marginTop: 'var(--space-2)',
                  padding: 'var(--space-2)', background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-sm)', fontSize: '0.72rem',
                }}>
                  uvicorn backend.main:app --reload
                </code>
              </div>
            )}
          </div>
        ) : activeTab === 'connections' ? (
          /* ---- Connections tab ---- */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {connectedNodes.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
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
                const cnColor = cn.isGap ? 'var(--gap-amber)' : getClusterColor(cn.cluster)

                return (
                  <button
                    key={cn.id}
                    onClick={() => onNodeNavigate?.(cn)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                      padding: 'var(--space-2) var(--space-3)',
                      background: 'var(--bg-surface)',
                      border: '1px solid transparent',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      width: '100%',
                      textAlign: 'left',
                      fontFamily: 'var(--font-sans)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = cnColor
                      e.currentTarget.style.background = 'var(--bg-card)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'transparent'
                      e.currentTarget.style.background = 'var(--bg-surface)'
                    }}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: cnColor, flexShrink: 0,
                      boxShadow: `0 0 4px ${cnColor}`,
                    }} />
                    <div style={{
                      flex: 1, fontSize: '0.78rem', color: 'var(--text-secondary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {cn.label}
                    </div>
                    <div style={{
                      width: 36, height: 3, background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-full)', overflow: 'hidden', flexShrink: 0,
                    }}>
                      <div style={{
                        width: `${strength * 100}%`, height: '100%',
                        background: cnColor, borderRadius: 'var(--radius-full)',
                      }} />
                    </div>
                  </button>
                )
              })
            )}
          </div>
        ) : (
          /* ---- Meta tab ---- */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {content?.tags?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Tags
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                  {content.tags.map((tag) => (
                    <span key={tag} style={{
                      padding: '2px 8px', background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.68rem', color: 'var(--text-muted)',
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
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Wikilinks ({content.wikilinks.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                  {content.wikilinks.map((link, i) => (
                    <span key={i} style={{
                      padding: '2px 6px',
                      background: 'rgba(0, 255, 136, 0.06)',
                      border: '1px solid rgba(0, 255, 136, 0.15)',
                      borderRadius: '3px',
                      fontSize: '0.68rem', color: 'var(--accent-green)',
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
            background: 'rgba(255, 153, 68, 0.06)',
            border: '1px solid rgba(255, 153, 68, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--gap-amber)', fontWeight: 500, marginBottom: 'var(--space-2)' }}>
              Empfehlung
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Dieser Knoten ist isoliert. Füge [[Wikilinks]] zu verwandten Konzepten hinzu um die Wissenslücke zu schließen.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
