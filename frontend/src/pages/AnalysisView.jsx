/* ============================================================
   AnalysisView.jsx — Full analysis results page
   ============================================================ */

import React from 'react'
import { useParams } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import FreiheitsprofilRadar from '../components/FreiheitsprofilRadar.jsx'
import DimensionCard from '../components/DimensionCard.jsx'
import GapPanel from '../components/GapPanel.jsx'
import BridgePanel from '../components/BridgePanel.jsx'
import LoadingPulse from '../components/LoadingPulse.jsx'
import { useAnalysis } from '../hooks/useAnalysis.js'
import { DEMO_GAPS, DEMO_BRIDGES } from '../utils/api.js'

export default function AnalysisView() {
  const { id } = useParams()
  const { profil, loading, isDemo } = useAnalysis(id)

  if (loading) {
    return (
      <Layout>
        <LoadingPulse text="Freiheitsprofil laden..." />
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={{
        height: '100%',
        overflowY: 'auto',
        padding: 'var(--space-8)',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 'var(--space-10)', maxWidth: 900, margin: '0 auto var(--space-10)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            {isDemo && <span className="badge badge--amber">Demo</span>}
            <span className="badge badge--green">Freiheitsprofil</span>
          </div>
          <h1 style={{ fontWeight: 300, marginBottom: 'var(--space-3)' }}>
            {profil?.brand || 'Analyse'}
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: 560 }}>
            Steiner's sieben Dimensionen der inneren Freiheit — visualisiert als Wissens-Architektur.
          </p>
        </div>

        {/* Main grid */}
        <div style={{
          maxWidth: 900,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
          gap: 'var(--space-8)',
          alignItems: 'start',
        }}>
          {/* ---- Radar ---- */}
          <div>
            <div className="card" style={{ padding: 'var(--space-6)' }}>
              <h3 style={{ marginBottom: 'var(--space-5)', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 400 }}>
                Freiheitsprofil
              </h3>
              <FreiheitsprofilRadar profil={profil} />
            </div>
          </div>

          {/* ---- Right column ---- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

            {/* Archetype */}
            <div className="card" style={{
              background: 'linear-gradient(135deg, rgba(0,255,136,0.06) 0%, rgba(0,204,170,0.04) 100%)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div className="score-ring">{profil?.freiheitsindex?.toFixed(1)}</div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 400, color: 'var(--text-primary)' }}>
                    {profil?.archetype}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Freiheitsindex aus 5.0
                  </div>
                </div>
              </div>
            </div>

            {/* Dimension cards */}
            <div>
              <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-4)', fontWeight: 400 }}>
                Dimensionen
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                {profil?.dimensions?.map((dim) => (
                  <DimensionCard key={dim.id} dimension={dim} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Gaps + Bridges */}
        <div style={{
          maxWidth: 900,
          margin: 'var(--space-10) auto 0',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--space-8)',
        }}>
          <div className="card">
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-5)', fontWeight: 400 }}>
              Wissens-Lücken
            </h3>
            <GapPanel gaps={DEMO_GAPS} />
          </div>

          <div className="card">
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-5)', fontWeight: 400 }}>
              Brücken-Empfehlungen
            </h3>
            <BridgePanel bridges={DEMO_BRIDGES} />
          </div>
        </div>

        {/* Footer spacer */}
        <div style={{ height: 'var(--space-16)' }} />
      </div>
    </Layout>
  )
}
