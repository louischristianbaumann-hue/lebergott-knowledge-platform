/* ============================================================
   Dashboard.jsx — Graph + stat bar + sidebar panels
   Layout: left nav (240px) + stat bar + graph + right panel
   ============================================================ */

import React, { useState } from 'react'
import Layout from '../components/Layout.jsx'
import MyceliumGraph from '../components/MyceliumGraph.jsx'
import GapPanel from '../components/GapPanel.jsx'
import BridgePanel from '../components/BridgePanel.jsx'
import ChatPanel from '../components/ChatPanel.jsx'
import NodeDetail from '../components/NodeDetail.jsx'
import LoadingPulse from '../components/LoadingPulse.jsx'
import { useGraphData } from '../hooks/useGraphData.js'

/* ── Stat card ─────────────────────────────────────────────── */

function StatCard({ label, value, accent }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 7, padding: '10px 16px',
    }}>
      <div style={{
        fontSize: 22, fontWeight: 300, lineHeight: 1, marginBottom: 3,
        color: accent || 'var(--text-primary)',
      }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  )
}

/* ── Panel header ──────────────────────────────────────────── */

function PanelHeader({ title }) {
  return (
    <div style={{
      padding: '10px 14px',
      borderBottom: '1px solid var(--border)',
      fontSize: 10, color: 'var(--text-muted)',
      letterSpacing: '0.08em', textTransform: 'uppercase',
      flexShrink: 0,
    }}>
      {title}
    </div>
  )
}

/* ── Dashboard ─────────────────────────────────────────────── */

export default function Dashboard() {
  const { data, gaps, bridges, loading, isDemo } = useGraphData('lebergott')
  const [selectedNode, setSelectedNode] = useState(null)
  const [activeTab, setActiveTab]       = useState('chat')

  const handleNodeClick    = (node) => setSelectedNode(prev => prev?.id === node.id ? null : node)
  const handleNodeNavigate = (node) => setSelectedNode(node)

  const nodeCount   = data?.nodes?.length   ?? '—'
  const linkCount   = data?.links?.length   ?? '—'
  const gapCount    = gaps?.length           ?? '—'
  const bridgeCount = bridges?.length        ?? '—'

  const panelTitle = activeTab === 'chat' ? 'Agent' : activeTab === 'gaps' ? 'Lücken' : 'Brücken'

  return (
    <Layout tabs={{ activeTab, setActiveTab }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* ── Stats bar ── */}
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', gap: 8, alignItems: 'center',
          background: 'var(--bg-panel)', flexShrink: 0, flexWrap: 'wrap',
        }}>
          <StatCard label="Knoten"       value={nodeCount}   accent="var(--accent)"  />
          <StatCard label="Verbindungen" value={linkCount}                           />
          <StatCard label="Lücken"       value={gapCount}    accent="var(--warning)" />
          <StatCard label="Brücken"      value={bridgeCount} accent="var(--success)" />

          {isDemo && (
            <span style={{
              marginLeft: 'auto', fontSize: 10, padding: '3px 10px',
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 99, color: 'var(--warning)',
              letterSpacing: '0.06em',
            }}>
              DEMO
            </span>
          )}
        </div>

        {/* ── Content row ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Graph */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {loading
              ? <LoadingPulse text="Graph laden..." />
              : (
                <MyceliumGraph
                  data={data}
                  onNodeClick={handleNodeClick}
                  selectedNodeId={selectedNode?.id}
                />
              )
            }
          </div>

          {/* Right panel */}
          <aside style={{
            width: 300, flexShrink: 0,
            background: 'var(--bg-panel)',
            borderLeft: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <PanelHeader title={panelTitle} />

            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {loading ? (
                <div style={{ padding: 16 }}>
                  <LoadingPulse text="Laden..." />
                </div>
              ) : activeTab === 'chat' ? (
                <ChatPanel
                  vaultId="lebergott"
                  selectedNode={selectedNode}
                  onNodeNavigate={handleNodeNavigate}
                />
              ) : activeTab === 'gaps' ? (
                <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                  <GapPanel
                    gaps={gaps}
                    onGapClick={gap => {
                      const node = data?.nodes?.find(n => n.id === gap.id)
                      if (node) handleNodeClick(node)
                    }}
                  />
                </div>
              ) : (
                <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                  <BridgePanel bridges={bridges} />
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Node detail overlay */}
      {selectedNode && (
        <NodeDetail
          node={selectedNode}
          graphData={data}
          onClose={() => setSelectedNode(null)}
          onNodeNavigate={handleNodeNavigate}
          vaultId="lebergott"
        />
      )}
    </Layout>
  )
}
