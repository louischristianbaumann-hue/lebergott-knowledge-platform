/* ============================================================
   LandingPage.jsx — Product landing page
   Animated mycelium hero × Steiner philosophy × clean CTA
   ============================================================ */

import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import * as d3 from 'd3'
import { DEMO_GRAPH } from '../utils/api.js'
import { getClusterColor, getNodeRadius, getLinkWidth, getLinkOpacity } from '../utils/graphPhysics.js'

// ---- Simplified background graph animation ----
function HeroGraph() {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    const W = svgRef.current.clientWidth || 900
    const H = svgRef.current.clientHeight || 500

    svg.selectAll('*').remove()

    // Use a subset of demo nodes for a lighter hero
    const nodes = DEMO_GRAPH.nodes.slice(0, 16).map((n) => ({ ...n }))
    const nodeIds = new Set(nodes.map((n) => n.id))
    const links = DEMO_GRAPH.links
      .filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target))
      .slice(0, 24)
      .map((l) => ({ ...l }))

    const defs = svg.append('defs')
    const glowFilter = defs.append('filter').attr('id', 'hero-glow')
    glowFilter.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', '6').attr('result', 'blur')
    const fm = glowFilter.append('feMerge')
    fm.append('feMergeNode').attr('in', 'blur')
    fm.append('feMergeNode').attr('in', 'SourceGraphic')

    const g = svg.append('g')

    const linkSel = g.selectAll('line')
      .data(links).join('line')
      .attr('stroke', (d) => {
        const src = nodes.find((n) => n.id === d.source)
        return getClusterColor(src?.cluster ?? 0, 0.35)
      })
      .attr('stroke-width', (d) => getLinkWidth(d.strength))
      .attr('stroke-opacity', (d) => getLinkOpacity(d.strength) * 0.6)

    const nodeSel = g.selectAll('circle')
      .data(nodes).join('circle')
      .attr('r', (d) => getNodeRadius(d.connections, d.isHub) * 0.75)
      .attr('fill', (d) => getClusterColor(d.cluster, d.isHub ? 0.55 : 0.35))
      .attr('stroke', (d) => getClusterColor(d.cluster, d.isHub ? 0.8 : 0.4))
      .attr('stroke-width', 0.8)
      .attr('filter', (d) => d.isHub ? 'url(#hero-glow)' : '')

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.id).distance(90).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide().radius(28))
      .on('tick', () => {
        linkSel
          .attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
          .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y)
        nodeSel
          .attr('cx', (d) => d.x).attr('cy', (d) => d.y)
      })

    // Slow drift animation after simulation settles
    let animId
    let elapsed = 0
    function drift(ts) {
      elapsed += 1
      // Gently nudge center
      sim.force('center', d3.forceCenter(
        W / 2 + Math.sin(elapsed * 0.003) * 30,
        H / 2 + Math.cos(elapsed * 0.004) * 20
      ).strength(0.01))
      if (elapsed % 3 === 0) sim.alpha(0.05).restart()
      animId = requestAnimationFrame(drift)
    }
    animId = requestAnimationFrame(drift)

    return () => {
      sim.stop()
      cancelAnimationFrame(animId)
    }
  }, [])

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        opacity: 0.45,
        pointerEvents: 'none',
      }}
    />
  )
}

// ---- Feature card ----
function FeatureCard({ icon, title, description, accent }) {
  return (
    <div className="card" style={{
      borderColor: `rgba(${accent}, 0.15)`,
      transition: 'border-color 0.25s ease, transform 0.25s ease',
    }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `rgba(${accent}, 0.4)`
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `rgba(${accent}, 0.15)`
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div style={{
        fontSize: '1.6rem', marginBottom: 'var(--space-4)',
        filter: `drop-shadow(0 0 6px rgba(${accent}, 0.6))`,
      }}>
        {icon}
      </div>
      <h3 style={{ fontSize: '1rem', fontWeight: 400, marginBottom: 'var(--space-2)' }}>{title}</h3>
      <p style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>{description}</p>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>

      {/* ---- Nav ---- */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-4) var(--space-8)',
        background: 'rgba(10, 15, 10, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,255,136,0.9) 0%, rgba(0,255,136,0.1) 100%)',
            boxShadow: '0 0 10px rgba(0,255,136,0.5)',
          }} />
          <span style={{ fontSize: '0.95rem', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
            SYNODEA
          </span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
          <Link to="/dashboard" className="btn btn--ghost" style={{ padding: 'var(--space-2) var(--space-4)', fontSize: '0.85rem' }}>
            Demo öffnen
          </Link>
          <Link to="/analysis/demo" className="btn btn--primary" style={{ padding: 'var(--space-2) var(--space-4)', fontSize: '0.85rem' }}>
            Analyse starten
          </Link>
        </div>
      </nav>

      {/* ---- Hero ---- */}
      <section style={{
        position: 'relative',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        paddingTop: 60,
      }}>
        <HeroGraph />

        {/* Vignette */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 60% 60% at 50% 50%, transparent 0%, rgba(10,15,10,0.7) 100%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 700, padding: '0 var(--space-8)' }}>
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <span className="badge badge--green" style={{ fontSize: '0.75rem' }}>
              Rudolf Steiner × Wissens-Architektur
            </span>
          </div>

          <h1 style={{ fontWeight: 200, marginBottom: 'var(--space-6)', letterSpacing: '-0.03em' }}>
            Sehen Sie die{' '}
            <span className="glow-text">unsichtbare Architektur</span>
            {' '}Ihres Wissens
          </h1>

          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-8)', maxWidth: 520, margin: '0 auto var(--space-8)' }}>
            Synodea macht Wissens-Lücken sichtbar, findet konzeptuelle Brücken und
            misst Ihre innere Freiheit nach Steiner's sieben Dimensionen.
          </p>

          <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/dashboard" className="btn btn--primary" style={{ padding: 'var(--space-3) var(--space-8)' }}>
              Analyse beginnen
            </Link>
            <Link to="/analysis/demo" className="btn btn--ghost" style={{ padding: 'var(--space-3) var(--space-8)' }}>
              Demo ansehen
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute', bottom: 'var(--space-8)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)',
          color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.1em',
        }}>
          <span>SCROLLEN</span>
          <div style={{
            width: 1, height: 30,
            background: 'linear-gradient(to bottom, var(--accent-green), transparent)',
          }} />
        </div>
      </section>

      {/* ---- Features ---- */}
      <section style={{
        padding: 'var(--space-16) var(--space-8)',
        maxWidth: 960,
        margin: '0 auto',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
          <h2 style={{ fontWeight: 200, marginBottom: 'var(--space-4)' }}>
            Was Synodea sieht
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto' }}>
            Drei Linsen auf Ihr Wissen — strukturell, konzeptuell und philosophisch.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-6)' }}>
          <FeatureCard
            icon="⬡"
            title="Wissens-Lücken"
            description="Isolierte Konzepte und blinde Flecken werden als 'dunkle Zonen' sichtbar — mit konkreten Verbindungsvorschlägen."
            accent="255, 153, 68"
          />
          <FeatureCard
            icon="⟷"
            title="Konzeptuelle Brücken"
            description="InfraNodus findet die nicht-offensichtlichen Verbindungen zwischen Wissens-Clustern — die Stellen wo Durchbrüche entstehen."
            accent="0, 221, 255"
          />
          <FeatureCard
            icon="◈"
            title="Freiheitsprofil"
            description="Steiner's sieben Dimensionen der inneren Freiheit — gemessen, visualisiert, und als strategische Intelligenz nutzbar."
            accent="0, 255, 136"
          />
        </div>
      </section>

      {/* ---- Testimonial / Philosophy ---- */}
      <section style={{
        padding: 'var(--space-16) var(--space-8)',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <blockquote style={{
            fontSize: '1.2rem',
            fontWeight: 200,
            lineHeight: 1.7,
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-6)',
            fontStyle: 'italic',
          }}>
            "Freiheit ist nicht das Fehlen von Bindungen — sie ist das Handeln aus dem tiefsten
            Verständnis der eigenen Natur."
          </blockquote>
          <div style={{ fontSize: '0.8rem', color: 'var(--accent-green)' }}>
            Rudolf Steiner · Philosophie der Freiheit, 1894
          </div>
        </div>
      </section>

      {/* ---- Demo CTA ---- */}
      <section style={{
        padding: 'var(--space-16) var(--space-8)',
        maxWidth: 960, margin: '0 auto',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="card" style={{
            maxWidth: 600, margin: '0 auto',
            background: 'linear-gradient(135deg, rgba(0,255,136,0.06) 0%, rgba(0,204,170,0.03) 100%)',
            padding: 'var(--space-10)',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-5)' }}>⬡</div>
            <h2 style={{ fontWeight: 200, marginBottom: 'var(--space-4)', fontSize: '1.6rem' }}>
              Lebergott Demo
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-8)' }}>
              Sehen Sie wie Synodea ein vollständiges Freiheitsprofil für eine echte Brand erstellt —
              mit Steiner-Analyse, Gap-Karte und Brücken-Empfehlungen.
            </p>
            <Link to="/analysis/demo" className="btn btn--primary" style={{ padding: 'var(--space-3) var(--space-10)' }}>
              Demo öffnen
            </Link>
          </div>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer style={{
        padding: 'var(--space-8)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: 960, margin: '0 auto',
      }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          SYNODEA — Knowledge Intelligence Platform
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Gebaut mit Rudolf Steiner's Philosophie der Freiheit
        </div>
      </footer>
    </div>
  )
}
