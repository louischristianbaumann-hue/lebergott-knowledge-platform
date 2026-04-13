/* ============================================================
   Dashboard.jsx — Main dashboard: Graph + Panels + Chat
   ============================================================ */

import React, { useState } from 'react'
import Layout from '../components/Layout.jsx'
import MyceliumGraph from '../components/MyceliumGraph.jsx'
import GapPanel from '../components/GapPanel.jsx'
import BridgePanel from '../components/BridgePanel.jsx'
import ChatPanel from '../components/ChatPanel.jsx'
import NodeDetail from '../components/NodeDetail.jsx'
import VaultFileList from '../components/VaultFileList.jsx'
import LoadingPulse from '../components/LoadingPulse.jsx'
import { useGraphData } from '../hooks/useGraphData.js'

const TABS = [
  { id: 'chat', label: 'Agent' },
  { id: 'gaps', label: 'Lücken' },
  { id: 'bridges', label: 'Brücken' },
]

export default function Dashboard() {
  const { data, gaps, bridges, loading, isDemo } = useGraphData('demo')
  const [selectedNode, setSelectedNode] = useState(null)
  const [activeTab, setActiveTab] = useState('chat')

  const handleNodeClick = (node) => {
    setSelectedNode((prev) => (prev?.id === node.id ? null : node))
  }

  const handleNodeNavigate = (node) => {
    setSelectedNode(node)
  }

  const sidebar = data ? (
    <VaultFileList
      nodes={data.nodes}
      onNodeSelect={handleNodeClick}
      selectedId={selectedNode?.id}
    />
  ) : null

  return (
    <Layout sidebar={sidebar}>
      <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
        {/* ---- Graph ---- */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {loading ? (
            <LoadingPulse text="Myzelium laden..." />
          ) : (
            <MyceliumGraph
              data={data}
              onNodeClick={handleNodeClick}
              selectedNodeId={selectedNode?.id}
            />
          )}

          {isDemo && !loading && (
            <div style={{
              position: 'absolute', bottom: 'var(--space-4)', right: 'var(--space-4)', zIndex: 20,
            }}>
              <span className="badge badge--amber">Demo-Daten</span>
            </div>
          )}
        </div>

        {/* ---- Right panel ---- */}
        <aside style={{
          width: 320,
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {/* Tab header */}
          <div style={{
            padding: 'var(--space-3) var(--space-4)',
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: 'var(--space-2)',
                    background: activeTab === tab.id ? 'var(--bg-surface)' : 'transparent',
                    border: activeTab === tab.id
                      ? '1px solid var(--border-medium)'
                      : '1px solid transparent',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    color: activeTab === tab.id
                      ? (tab.id === 'chat' ? 'var(--accent-green)' : 'var(--text-primary)')
                      : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ padding: 'var(--space-4)' }}>
                <LoadingPulse text="Analysieren..." />
              </div>
            ) : activeTab === 'chat' ? (
              <ChatPanel
                vaultId="lebergott"
                selectedNode={selectedNode}
                onNodeNavigate={handleNodeNavigate}
              />
            ) : activeTab === 'gaps' ? (
              <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)' }}>
                <GapPanel
                  gaps={gaps}
                  onGapClick={(gap) => {
                    const node = data?.nodes?.find((n) => n.id === gap.id)
                    if (node) handleNodeClick(node)
                  }}
                />
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)' }}>
                <BridgePanel bridges={bridges} />
              </div>
            )}
          </div>
        </aside>

        {/* ---- Node detail overlay ---- */}
        {selectedNode && (
          <NodeDetail
            node={selectedNode}
            graphData={data}
            onClose={() => setSelectedNode(null)}
            onNodeNavigate={handleNodeNavigate}
            vaultId="lebergott"
          />
        )}
      </div>
    </Layout>
  )
}
