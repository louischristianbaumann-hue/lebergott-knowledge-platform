/* ============================================================
   SYNODEA — Graph Physics
   InfraNodus aesthetic: cluster-colored nodes, sparse edges, organic spring layout
   ============================================================ */

import * as d3 from 'd3'

// ---- Cluster color palette (InfraNodus-style: vivid, distinct, dark-bg optimized) ----
const CLUSTER_COLORS = [
  '#06b6d4', // 0 — cyan
  '#8b5cf6', // 1 — violet
  '#22c55e', // 2 — green
  '#f97316', // 3 — orange
  '#ec4899', // 4 — pink
  '#3b82f6', // 5 — blue
  '#eab308', // 6 — yellow
  '#14b8a6', // 7 — teal
]

export function getClusterColor(clusterId, alpha = 1) {
  if (clusterId < 0) return alpha === 1 ? '#f97316' : `rgba(249, 115, 22, ${alpha})` // gap — orange
  const hex = CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length]
  if (alpha === 1) return hex
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// ---- Node radius by degree (proxy for betweenness centrality) ----
// Small, clean nodes like InfraNodus — not large glowing blobs
export function getNodeRadius(connections, isHub = false) {
  const base = Math.sqrt(connections + 1) * 3
  return Math.max(5, Math.min(base, isHub ? 22 : 16))
}

// ---- Glow — only for hover/selected, not default ----
export function getNodeGlow(connections, isHub, isGap) {
  // Kept for API compatibility — graph uses CSS classes now
  return 'none'
}

// ---- Create simulation — organic spring layout ----
export function createSimulation(nodes, links, width, height) {
  nodes.forEach((n, i) => {
    n._pulseDelay = (i * 0.37) % 5
    n._pulseSpeed = 3.5 + (i % 3) * 0.8 // staggered, not random for determinism
  })

  return d3
    .forceSimulation(nodes)
    .force(
      'link',
      d3
        .forceLink(links)
        .id((d) => d.id)
        .distance((d) => {
          const base = 90
          return base + (1 - (d.strength || 0.5)) * 100
        })
        .strength((d) => (d.strength || 0.5) * 0.55)
    )
    .force(
      'charge',
      d3
        .forceManyBody()
        .strength((d) => (d.isHub ? -280 : d.isGap ? -70 : -130))
        .distanceMax(450)
        .distanceMin(15)
    )
    .force('center', d3.forceCenter(width / 2, height / 2).strength(0.04))
    .force(
      'collision',
      d3.forceCollide().radius((d) => getNodeRadius(d.connections, d.isHub) + 10)
    )
    .force('x', d3.forceX(width / 2).strength(0.02))
    .force('y', d3.forceY(height / 2).strength(0.02))
    .alphaDecay(0.01)
    .velocityDecay(0.38)
}

// ---- Link stroke width — thin, InfraNodus style ----
export function getLinkWidth(strength) {
  return 0.4 + (strength || 0.5) * 1.2
}

// ---- Link opacity — sparse, elegant ----
export function getLinkOpacity(strength) {
  return 0.12 + (strength || 0.5) * 0.28
}

// ---- Pulse animation keyframe values (sinusoidal 0.97–1.03) ----
export function getPulseScale(elapsed, pulseDelay, pulseSpeed) {
  const t = ((elapsed * 0.001 + pulseDelay) % pulseSpeed) / pulseSpeed
  return 0.97 + Math.sin(t * Math.PI * 2) * 0.03
}
