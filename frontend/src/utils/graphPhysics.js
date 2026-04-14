/* ============================================================
   SYNODEA — Graph Physics
   Custom D3 force simulation parameters for organic mycelium feel
   ============================================================ */

import * as d3 from 'd3'

// ---- Cluster color palette (organic, bioluminescent) ----
const CLUSTER_COLORS = [
  '#00ff88', // 0 — bright green (main)
  '#55eebb', // 1 — cool mint
  '#00ccaa', // 2 — teal
  '#44aaff', // 3 — blue-teal
  '#aa88ff', // 4 — violet
  '#ffcc44', // 5 — warm gold
  '#ff8888', // 6 — soft red
  '#88ffaa', // 7 — light green
]

export function getClusterColor(clusterId, alpha = 1) {
  if (clusterId < 0) return `rgba(255, 153, 68, ${alpha})` // gap — amber
  const hex = CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length]
  if (alpha === 1) return hex
  // Convert hex to rgba
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// ---- Node size based on connection count ----
export function getNodeRadius(connections, isHub = false) {
  const base = Math.sqrt(connections + 1) * 4
  const r = Math.max(7, Math.min(base, isHub ? 36 : 28))
  return r
}

// ---- Glow intensity based on hub status ----
export function getNodeGlow(connections, isHub, isGap) {
  if (isGap) return 'drop-shadow(0 0 5px rgba(255, 153, 68, 0.5))'
  if (isHub || connections >= 10) return 'drop-shadow(0 0 14px rgba(0, 255, 136, 0.7))'
  if (connections >= 5) return 'drop-shadow(0 0 8px rgba(0, 255, 136, 0.5))'
  return 'drop-shadow(0 0 4px rgba(0, 255, 136, 0.3))'
}

// ---- Create simulation ----
export function createSimulation(nodes, links, width, height) {
  // Assign randomized pulse delay to each node for organic feel
  nodes.forEach((n, i) => {
    n._pulseDelay = (i * 0.37) % 5 // staggered pulse
    n._pulseSpeed = 3 + Math.random() * 2.5
  })

  const simulation = d3
    .forceSimulation(nodes)
    .force(
      'link',
      d3
        .forceLink(links)
        .id((d) => d.id)
        .distance((d) => {
          // Stronger connections = closer nodes
          const base = 80
          return base + (1 - (d.strength || 0.5)) * 120
        })
        .strength((d) => (d.strength || 0.5) * 0.6)
    )
    .force(
      'charge',
      d3
        .forceManyBody()
        .strength((d) => {
          // Hubs repel more, gaps less
          if (d.isHub) return -300
          if (d.isGap) return -80
          return -150
        })
        .distanceMax(400)
        .distanceMin(20)
    )
    .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
    .force(
      'collision',
      d3.forceCollide().radius((d) => getNodeRadius(d.connections, d.isHub) + 12)
    )
    .force(
      // Gentle x/y attraction to keep graph centered without rigidity
      'x',
      d3.forceX(width / 2).strength(0.02)
    )
    .force('y', d3.forceY(height / 2).strength(0.02))
    .alphaDecay(0.008) // very slow decay = organic, living movement
    .velocityDecay(0.35)

  return simulation
}

// ---- Link stroke width from strength ----
export function getLinkWidth(strength) {
  return 0.5 + (strength || 0.5) * 2.5
}

// ---- Link opacity from strength ----
export function getLinkOpacity(strength) {
  return 0.08 + (strength || 0.5) * 0.45
}

// ---- Pulse animation keyframe values (for JS-driven animation) ----
export function getPulseScale(elapsed, pulseDelay, pulseSpeed) {
  const t = ((elapsed * 0.001 + pulseDelay) % pulseSpeed) / pulseSpeed
  // Sine wave: oscillates between 0.95 and 1.05
  return 0.97 + Math.sin(t * Math.PI * 2) * 0.03
}
