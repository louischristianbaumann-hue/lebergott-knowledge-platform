/* ============================================================
   MyceliumGraph.jsx — THE HERO COMPONENT
   D3 force-directed knowledge graph with bioluminescent mycelium physics
   ============================================================ */

import React, { useRef, useEffect, useCallback, useState } from 'react'
import * as d3 from 'd3'
import {
  createSimulation,
  getClusterColor,
  getNodeRadius,
  getNodeGlow,
  getLinkWidth,
  getLinkOpacity,
  getPulseScale,
} from '../utils/graphPhysics.js'

// ---- Cluster legend items ----
function ClusterLegend({ clusters }) {
  return (
    <div className="cluster-legend">
      {clusters.map((c) => (
        <div key={c.id} className="cluster-legend__item">
          <div
            className="cluster-legend__dot"
            style={{ background: c.color, boxShadow: `0 0 4px ${c.color}` }}
          />
          {c.label}
        </div>
      ))}
      <div className="cluster-legend__item">
        <div
          className="cluster-legend__dot"
          style={{ background: '#ff9944', boxShadow: '0 0 4px #ff9944' }}
        />
        Wissens-Lücke
      </div>
    </div>
  )
}

// ---- Zoom controls ----
function GraphControls({ onZoomIn, onZoomOut, onReset }) {
  return (
    <div className="graph-controls">
      <button className="graph-controls__btn" onClick={onZoomIn} title="Hineinzoomen">+</button>
      <button className="graph-controls__btn" onClick={onZoomOut} title="Herauszoomen">−</button>
      <button className="graph-controls__btn" onClick={onReset} title="Zurücksetzen" style={{ fontSize: '0.75rem' }}>⌂</button>
    </div>
  )
}

// ---- Tooltip ----
function Tooltip({ node, x, y }) {
  if (!node) return null
  return (
    <div
      className="mycelium-tooltip"
      style={{
        left: x + 14,
        top: y - 10,
        opacity: node ? 1 : 0,
        pointerEvents: 'none',
      }}
    >
      <div className="mycelium-tooltip__title">{node.label}</div>
      <div className="mycelium-tooltip__meta">
        {node.connections} Verbindungen · Cluster {node.cluster >= 0 ? node.cluster : '—'}
      </div>
      {node.isGap && (
        <div className="mycelium-tooltip__gap-label">⬡ Wissens-Lücke</div>
      )}
      {node.isHub && (
        <div style={{ fontSize: '0.7rem', color: 'var(--accent-green)', marginTop: '2px' }}>
          ✦ Hub-Knoten
        </div>
      )}
    </div>
  )
}

// ============================================================
export default function MyceliumGraph({ data, onNodeClick, selectedNodeId, personalizedNodeIds = [] }) {
  const svgRef = useRef(null)
  const wrapperRef = useRef(null)
  const simulationRef = useRef(null)
  const zoomRef = useRef(null)
  const animFrameRef = useRef(null)
  const startTimeRef = useRef(performance.now())

  const [tooltip, setTooltip] = useState({ node: null, x: 0, y: 0 })
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  // ---- Resize observer ----
  useEffect(() => {
    if (!wrapperRef.current) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setDimensions({ width, height })
    })
    ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [])

  // ---- Main D3 setup ----
  useEffect(() => {
    if (!data || !svgRef.current) return

    const { width, height } = dimensions
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Deep clone nodes and links so D3 can mutate them
    const nodes = data.nodes.map((n) => ({ ...n }))
    const links = data.links.map((l) => ({ ...l }))

    // ---- Zoom behaviour ----
    const zoomBehaviour = d3
      .zoom()
      .scaleExtent([0.15, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform)
      })

    svg.call(zoomBehaviour)
    zoomRef.current = zoomBehaviour

    // ---- Root container ----
    const container = svg.append('g').attr('class', 'mycelium-root')

    // ---- Defs: glow filters per cluster ----
    const defs = svg.append('defs')

    // Generic node glow filter
    const glowFilter = defs.append('filter')
      .attr('id', 'node-glow')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%')
    glowFilter.append('feGaussianBlur')
      .attr('in', 'SourceGraphic').attr('stdDeviation', '4').attr('result', 'blur')
    const feMerge = glowFilter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'blur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Hub glow (stronger)
    const hubGlowFilter = defs.append('filter')
      .attr('id', 'hub-glow')
      .attr('x', '-80%').attr('y', '-80%')
      .attr('width', '260%').attr('height', '260%')
    hubGlowFilter.append('feGaussianBlur')
      .attr('in', 'SourceGraphic').attr('stdDeviation', '8').attr('result', 'blur')
    const feMergeHub = hubGlowFilter.append('feMerge')
    feMergeHub.append('feMergeNode').attr('in', 'blur')
    feMergeHub.append('feMergeNode').attr('in', 'SourceGraphic')

    // Gap glow (amber)
    const gapGlowFilter = defs.append('filter')
      .attr('id', 'gap-glow')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%')
    gapGlowFilter.append('feGaussianBlur')
      .attr('in', 'SourceGraphic').attr('stdDeviation', '5').attr('result', 'blur')
    const feMergeGap = gapGlowFilter.append('feMerge')
    feMergeGap.append('feMergeNode').attr('in', 'blur')
    feMergeGap.append('feMergeNode').attr('in', 'SourceGraphic')

    // Personalized glow (gold — warm, editorial)
    const personalizedGlowFilter = defs.append('filter')
      .attr('id', 'personalized-glow')
      .attr('x', '-80%').attr('y', '-80%')
      .attr('width', '260%').attr('height', '260%')
    personalizedGlowFilter.append('feGaussianBlur')
      .attr('in', 'SourceGraphic').attr('stdDeviation', '7').attr('result', 'blur')
    const feMergePersonalized = personalizedGlowFilter.append('feMerge')
    feMergePersonalized.append('feMergeNode').attr('in', 'blur')
    feMergePersonalized.append('feMergeNode').attr('in', 'SourceGraphic')

    // Nutrient flow gradient for links
    const linkGradient = defs.append('linearGradient')
      .attr('id', 'link-flow')
      .attr('gradientUnits', 'userSpaceOnUse')
    linkGradient.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(0,255,136,0)  ')
    linkGradient.append('stop').attr('offset', '50%').attr('stop-color', 'rgba(0,255,136,0.6)')
    linkGradient.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(0,255,136,0)')

    // ---- Links layer ----
    const linkGroup = container.append('g').attr('class', 'links-layer')
    const linkSelection = linkGroup
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('class', 'mycelium-link')
      .attr('stroke-width', (d) => getLinkWidth(d.strength))
      .attr('stroke-opacity', (d) => getLinkOpacity(d.strength))
      .attr('stroke', (d) => {
        // Color links by source cluster
        const srcNode = nodes.find((n) => n.id === (d.source?.id || d.source))
        if (srcNode?.isGap) return '#cc6622'
        return getClusterColor(srcNode?.cluster ?? 0, 0.5)
      })

    // ---- Nodes layer ----
    const nodeGroup = container.append('g').attr('class', 'nodes-layer')

    const nodeSelection = nodeGroup
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', (d) => {
        let cls = 'mycelium-node'
        if (d.isHub) cls += ' mycelium-node--hub'
        if (d.isGap) cls += ' mycelium-node--gap'
        return cls
      })
      .style('cursor', 'pointer')
      .call(
        d3.drag()
          .on('start', (event, d) => {
            if (!event.active) simulationRef.current.alphaTarget(0.3).restart()
            d.fx = d.x; d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x; d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulationRef.current.alphaTarget(0)
            d.fx = null; d.fy = null
          })
      )

    // Node circle
    const personalizedSet = new Set(personalizedNodeIds)
    nodeSelection
      .append('circle')
      .attr('r', (d) => getNodeRadius(d.connections, d.isHub))
      .attr('fill', (d) => {
        if (personalizedSet.has(d.id)) return 'rgba(197, 165, 90, 0.55)'
        if (d.isGap) return getClusterColor(-1, 0.6)
        return getClusterColor(d.cluster, d.isHub ? 0.85 : 0.65)
      })
      .attr('stroke', (d) => {
        if (personalizedSet.has(d.id)) return '#c5a55a'
        if (d.isGap) return '#ff9944'
        return getClusterColor(d.cluster, d.isHub ? 1 : 0.7)
      })
      .attr('stroke-width', (d) => (personalizedSet.has(d.id) ? 2 : d.isHub ? 1.5 : 0.8))
      .attr('filter', (d) => {
        if (personalizedSet.has(d.id)) return 'url(#personalized-glow)'
        if (d.isGap) return 'url(#gap-glow)'
        if (d.isHub) return 'url(#hub-glow)'
        return 'url(#node-glow)'
      })

    // Node label (visible for hubs and moderately connected nodes)
    nodeSelection
      .append('text')
      .attr('class', (d) => {
        let cls = 'mycelium-label'
        if (d.isHub) cls += ' mycelium-label--hub'
        if (d.isGap) cls += ' mycelium-label--gap'
        return cls
      })
      .attr('dy', (d) => getNodeRadius(d.connections, d.isHub) + 12)
      .attr('text-anchor', 'middle')
      .text((d) => {
        if (personalizedSet.has(d.id)) return d.label
        if (d.isHub || d.connections >= 6) return d.label
        if (d.isGap) return d.label
        return '' // hide labels for low-connection nodes (declutter)
      })

    // ---- Interaction ----
    nodeSelection
      .on('mouseenter', (event, d) => {
        // Highlight connected links
        linkSelection
          .attr('stroke-opacity', (l) => {
            const srcId = l.source?.id || l.source
            const tgtId = l.target?.id || l.target
            return srcId === d.id || tgtId === d.id ? 0.9 : 0.05
          })
          .attr('stroke-width', (l) => {
            const srcId = l.source?.id || l.source
            const tgtId = l.target?.id || l.target
            return srcId === d.id || tgtId === d.id
              ? getLinkWidth(l.strength) + 1
              : getLinkWidth(l.strength)
          })

        // Show all labels for connected nodes
        nodeSelection.select('text').text((n) => {
          const isConnected = links.some((l) => {
            const srcId = l.source?.id || l.source
            const tgtId = l.target?.id || l.target
            return (srcId === d.id && tgtId === n.id) || (tgtId === d.id && srcId === n.id)
          })
          return isConnected || n.id === d.id ? n.label : (n.isHub || n.connections >= 6 ? n.label : '')
        })

        // Tooltip
        const rect = wrapperRef.current.getBoundingClientRect()
        setTooltip({
          node: d,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        })
      })
      .on('mousemove', (event) => {
        const rect = wrapperRef.current.getBoundingClientRect()
        setTooltip((prev) => ({
          ...prev,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        }))
      })
      .on('mouseleave', () => {
        linkSelection
          .attr('stroke-opacity', (d) => getLinkOpacity(d.strength))
          .attr('stroke-width', (d) => getLinkWidth(d.strength))

        nodeSelection.select('text').text((n) =>
          personalizedSet.has(n.id) || n.isHub || n.connections >= 6 || n.isGap ? n.label : ''
        )

        setTooltip({ node: null, x: 0, y: 0 })
      })
      .on('click', (event, d) => {
        event.stopPropagation()
        if (onNodeClick) onNodeClick(d)
      })

    // ---- Highlight selected node ----
    if (selectedNodeId) {
      nodeSelection.select('circle').attr('stroke-width', (d) =>
        d.id === selectedNodeId ? 3 : (d.isHub ? 1.5 : 0.8)
      )
    }

    // ---- Simulation ----
    const simulation = createSimulation(nodes, links, width, height)
    simulationRef.current = simulation

    simulation.on('tick', () => {
      linkSelection
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y)

      nodeSelection.attr('transform', (d) => `translate(${d.x},${d.y})`)
    })

    // ---- Breathing animation (requestAnimationFrame loop) ----
    let lastFrame = 0
    function animate(ts) {
      if (ts - lastFrame > 100) { // throttle to ~10fps for the pulse
        lastFrame = ts
        const elapsed = ts - startTimeRef.current

        nodeSelection.select('circle').attr('r', (d) => {
          const base = getNodeRadius(d.connections, d.isHub)
          const scale = getPulseScale(elapsed, d._pulseDelay || 0, d._pulseSpeed || 4)
          return base * scale
        })
      }
      animFrameRef.current = requestAnimationFrame(animate)
    }
    animFrameRef.current = requestAnimationFrame(animate)

    // ---- Initial zoom to fit ----
    const initialTransform = d3.zoomIdentity.translate(width * 0.1, height * 0.1).scale(0.85)
    svg.call(zoomBehaviour.transform, initialTransform)

    return () => {
      simulation.stop()
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [data, dimensions, selectedNodeId, personalizedNodeIds])

  // ---- Zoom controls ----
  const handleZoom = useCallback((factor) => {
    if (!svgRef.current || !zoomRef.current) return
    d3.select(svgRef.current).transition().duration(300).call(
      zoomRef.current.scaleBy, factor
    )
  }, [])

  const handleReset = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return
    const { width, height } = dimensions
    d3.select(svgRef.current).transition().duration(400).call(
      zoomRef.current.transform,
      d3.zoomIdentity.translate(width * 0.1, height * 0.1).scale(0.85)
    )
  }, [dimensions])

  return (
    <div ref={wrapperRef} className="mycelium-wrapper">
      <svg ref={svgRef} className="mycelium-svg" />

      <Tooltip node={tooltip.node} x={tooltip.x} y={tooltip.y} />

      {data?.clusters && <ClusterLegend clusters={data.clusters} />}

      <GraphControls
        onZoomIn={() => handleZoom(1.3)}
        onZoomOut={() => handleZoom(0.75)}
        onReset={handleReset}
      />

      {/* Node count indicator */}
      <div
        style={{
          position: 'absolute',
          top: 'var(--space-4)',
          left: 'var(--space-4)',
          zIndex: 10,
        }}
      >
        <span className="spore-count">
          <span className="spore-count__dot" />
          {data?.nodes?.length ?? 0} Knoten · {data?.links?.length ?? 0} Verbindungen
        </span>
      </div>
    </div>
  )
}
