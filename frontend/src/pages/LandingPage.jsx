/* ============================================================
   LandingPage.jsx — Lebergott Wissensraum landing
   Minimal hero + background graph animation + single CTA
   ============================================================ */

import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import * as d3 from 'd3'
import { DEMO_GRAPH } from '../utils/api.js'
import { getClusterColor, getNodeRadius, getLinkWidth, getLinkOpacity } from '../utils/graphPhysics.js'

/* ── Background graph animation ──────────────────────────── */

function HeroGraph() {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    const W = svgRef.current.clientWidth || 900
    const H = svgRef.current.clientHeight || 500

    svg.selectAll('*').remove()

    const nodes = DEMO_GRAPH.nodes.slice(0, 20).map(n => ({ ...n }))
    const nodeIds = new Set(nodes.map(n => n.id))
    const links = DEMO_GRAPH.links
      .filter(l => nodeIds.has(l.source) && nodeIds.has(l.target))
      .slice(0, 28)
      .map(l => ({ ...l }))

    const g = svg.append('g')

    const linkSel = g.selectAll('line')
      .data(links).join('line')
      .attr('stroke', d => {
        const src = nodes.find(n => n.id === d.source)
        return getClusterColor(src?.cluster ?? 0, 0.25)
      })
      .attr('stroke-width', d => getLinkWidth(d.strength))
      .attr('stroke-opacity', d => getLinkOpacity(d.strength) * 0.5)

    const nodeSel = g.selectAll('circle')
      .data(nodes).join('circle')
      .attr('r', d => getNodeRadius(d.connections, d.isHub) * 0.7)
      .attr('fill', d => getClusterColor(d.cluster, d.isHub ? 0.45 : 0.25))
      .attr('stroke', d => getClusterColor(d.cluster, d.isHub ? 0.7 : 0.35))
      .attr('stroke-width', 0.8)

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(85).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-100))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide().radius(24))
      .on('tick', () => {
        linkSel
          .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
        nodeSel
          .attr('cx', d => d.x).attr('cy', d => d.y)
      })

    let animId, elapsed = 0
    function drift() {
      elapsed++
      sim.force('center', d3.forceCenter(
        W / 2 + Math.sin(elapsed * 0.003) * 25,
        H / 2 + Math.cos(elapsed * 0.004) * 18,
      ).strength(0.01))
      if (elapsed % 4 === 0) sim.alpha(0.04).restart()
      animId = requestAnimationFrame(drift)
    }
    animId = requestAnimationFrame(drift)

    return () => { sim.stop(); cancelAnimationFrame(animId) }
  }, [])

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        opacity: 0.35, pointerEvents: 'none',
      }}
    />
  )
}

/* ── Landing page ─────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text-primary)' }}>

      {/* Top nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 32px',
        background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 5,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: '#000',
          }}>L</div>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
            Lebergott
          </span>
        </div>
        <Link to="/" style={{
          fontSize: 13, color: 'var(--text-muted)',
          textDecoration: 'none', padding: '6px 14px',
          border: '1px solid var(--border)', borderRadius: 6,
          transition: 'all 0.15s ease',
        }}>
          Einloggen
        </Link>
      </nav>

      {/* Hero */}
      <section style={{
        position: 'relative', height: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', paddingTop: 60,
      }}>
        <HeroGraph />

        {/* Radial fade */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 65% 65% at 50% 50%, transparent 0%, rgba(10,10,10,0.75) 100%)',
        }} />

        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 640, padding: '0 32px' }}>
          <div style={{
            display: 'inline-block', fontSize: 11, color: 'var(--accent)',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            marginBottom: 24, padding: '4px 12px',
            border: '1px solid rgba(0,212,255,0.2)', borderRadius: 99,
          }}>
            Wissens-Plattform · Lebergesundheit
          </div>

          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 300, lineHeight: 1.15,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            marginBottom: 20,
          }}>
            Lebergott{' '}
            <span style={{ color: 'var(--accent)', fontWeight: 400 }}>Wissensraum</span>
          </h1>

          <p style={{
            fontSize: 16, color: 'var(--text-secondary)',
            lineHeight: 1.65, maxWidth: 480, margin: '0 auto 36px',
          }}>
            Ihr persönlicher Zugang zum Wissen rund um Lebergesundheit —
            strukturiert, vernetzt, und jederzeit verfügbar.
          </p>

          <Link to="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 28px', borderRadius: 8,
            background: 'var(--accent)', color: '#000',
            fontWeight: 600, fontSize: 14, textDecoration: 'none',
            transition: 'opacity 0.15s ease',
          }}>
            Zum Wissensraum →
          </Link>
        </div>

        {/* Scroll hint */}
        <div style={{
          position: 'absolute', bottom: 32,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          color: 'var(--text-muted)', fontSize: 10, letterSpacing: '0.12em',
        }}>
          <span>SCROLLEN</span>
          <div style={{ width: 1, height: 24, background: 'linear-gradient(to bottom, var(--border), transparent)' }} />
        </div>
      </section>

      {/* Features strip */}
      <section style={{
        padding: '80px 32px',
        maxWidth: 900, margin: '0 auto',
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20,
      }}>
        {[
          { icon: '⬡', title: 'Wissens-Graph', desc: 'Alle Inhalte vernetzt sichtbar — Zusammenhänge auf einen Blick.' },
          { icon: '◌', title: 'Lücken-Analyse', desc: 'InfraNodus findet blinde Flecken und zeigt wo Wissen fehlt.' },
          { icon: '◎', title: 'Konzeptbrücken', desc: 'Verbindungen zwischen Themen die sonst verborgen bleiben.' },
        ].map(f => (
          <div key={f.title} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '24px 20px',
          }}>
            <div style={{ fontSize: 22, marginBottom: 12, color: 'var(--accent)' }}>{f.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{f.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</div>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '20px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        maxWidth: 900, margin: '0 auto',
      }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Lebergott Akademie für Lebergesundheit
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          © 2024 · Alle Rechte vorbehalten
        </div>
      </footer>
    </div>
  )
}
