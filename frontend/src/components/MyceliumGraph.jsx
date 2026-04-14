/* ============================================================
   MyceliumGraph.jsx — InfraNodus aesthetic
   Dark canvas, cluster-colored nodes, thin edges, subtle breathing
   ============================================================ */

import React, { useRef, useEffect, useCallback, useState } from 'react'
import * as d3 from 'd3'
import {
  createSimulation,
  getClusterColor,
  getNodeRadius,
  getLinkWidth,
  getLinkOpacity,
} from '../utils/graphPhysics.js'

// ---- Cluster legend ----
function ClusterLegend({ clusters }) {
  return (
    <div className="cluster-legend">
      {clusters.map((c) => (
        <div key={c.id} className="cluster-legend__item">
          <div className="cluster-legend__dot" style={{ background: c.color }} />
          {c.label}
        </div>
      ))}
    </div>
  )
}

// ---- Zoom controls ----
function GraphControls({ onZoomIn, onZoomOut, onReset }) {
  return (
    <div className="graph-controls">
      <button className="graph-controls__btn" onClick={onZoomIn} title="Zoom in">+</button>
      <button className="graph-controls__btn" onClick={onZoomOut} title="Zoom out">−</button>
      <button className="graph-controls__btn" onClick={onReset} title="Reset" style={{ fontSize: '0.75rem' }}>⌂</button>
    </div>
  )
}

// ---- Tooltip ----
function Tooltip({ node, x, y }) {
  if (!node) return null
  return (
    <div
      className="mycelium-tooltip"
      style={{ left: x + 14, top: y - 10, pointerEvents: 'none' }}
    >
      <div className="mycelium-tooltip__title">{node.label}</div>
      <div className="mycelium-tooltip__meta">
        {node.connections} connections
        {node.cluster >= 0 ? ` · cluster ${node.cluster}` : ''}
        {node.isGap ? ' · gap' : ''}
      </div>
    </div>
  )
}

// ============================================================
export default function MyceliumGraph({ data, onNodeClick, selectedNodeId, personalizedNodeIds = [] }) {
  const svgRef = useRef(null)
  const wrapperRef = useRef(null)
  const simulationRef = useRef(null)
  const zoomRef = useRef(null)

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

    const nodes = data.nodes.map((n) => ({ ...n }))
    const links = data.links.map((l) => ({ ...l }))

    // ---- SVG defs: single hover glow filter ----
    const defs = svg.append('defs')
    const hoverGlow = defs.append('filter')
      .attr('id', 'hover-glow')
      .attr('x', '-60%').attr('y', '-60%')
      .attr('width', '220%').attr('height', '220%')
    hoverGlow.append('feGaussianBlur')
      .attr('in', 'SourceGraphic').attr('stdDeviation', '3').attr('result', 'blur')
    const feMerge = hoverGlow.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'blur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // ---- Zoom ----
    const zoomBehaviour = d3
      .zoom()
      .scaleExtent([0.15, 4])
      .on('zoom', (event) => container.attr('transform', event.transform))

    svg.call(zoomBehaviour)
    zoomRef.current = zoomBehaviour

    const container = svg.append('g').attr('class', 'mycelium-root')

    // ---- Links — thin, light gray, gentle curves ----
    const linkGroup = container.append('g').attr('class', 'links-layer')
    const linkSelection = linkGroup
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('class', 'mycelium-link')
      .attr('stroke', '#333')
      .attr('stroke-width', (d) => getLinkWidth(d.strength))
      .attr('stroke-opacity', (d) => getLinkOpacity(d.strength))
      .attr('fill', 'none')

    // ---- Nodes ----
    const nodeGroup = container.append('g').attr('class', 'nodes-layer')
    const nodeSelection = nodeGroup
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'mycelium-node')
      .style('cursor', 'pointer')
      .call(
        d3.drag()
          .on('start', (event, d) => {
            if (!event.active) simulationRef.current.alphaTarget(0.3).restart()
            d.fx = d.x; d.fy = d.y
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
          .on('end', (event, d) => {
            if (!event.active) simulationRef.current.alphaTarget(0)
            d.fx = null; d.fy = null
          })
      )

    // ---- Node circles ----
    nodeSelection
      .append('circle')
      .attr('r', (d) => getNodeRadius(d.connections, d.isHub))
      .attr('fill', (d) => {
        if (d.isGap) return getClusterColor(-1, 0.7)
        return getClusterColor(d.cluster, d.isHub ? 0.9 : 0.75)
      })
      .attr('stroke', (d) => {
        if (d.isGap) return '#f97316'
        return getClusterColor(d.cluster, d.isHub ? 1 : 0.6)
      })
      .attr('stroke-width', (d) => d.id === selectedNodeId ? 2 : d.isHub ? 1 : 0.5)
      // No filter by default — only on hover/selected (see interaction below)

    // ---- Node labels — hub + high-degree nodes always visible ----
    nodeSelection
      .append('text')
      .attr('class', 'mycelium-label')
      .attr('dy', (d) => getNodeRadius(d.connections, d.isHub) + 11)
      .attr('text-anchor', 'middle')
      .text((d) => {
        if (d.isHub || d.connections >= 5 || d.isGap) return d.label
        return ''
      })

    // ---- Interaction ----
    nodeSelection
      .on('mouseenter', (event, d) => {
        // Dim unrelated links
        linkSelection
          .attr('stroke-opacity', (l) => {
            const srcId = l.source?.id || l.source
            const tgtId = l.target?.id || l.target
            return srcId === d.id || tgtId === d.id ? 0.7 : 0.04
          })
          .attr('stroke', (l) => {
            const srcId = l.source?.id || l.source
            const tgtId = l.target?.id || l.target
            if (srcId === d.id || tgtId === d.id) return getClusterColor(d.cluster, 0.8)
            return '#333'
          })
          .attr('stroke-width', (l) => {
            const srcId = l.source?.id || l.source
            const tgtId = l.target?.id || l.target
            return srcId === d.id || tgtId === d.id
              ? getLinkWidth(l.strength) + 0.5
              : getLinkWidth(l.strength)
          })

        // Reveal labels for connected neighbors
        nodeSelection.select('text').text((n) => {
          if (n.id === d.id) return n.label
          const connected = links.some((l) => {
            const srcId = l.source?.id || l.source
            const tgtId = l.target?.id || l.target
            return (srcId === d.id && tgtId === n.id) || (tgtId === d.id && srcId === n.id)
          })
          if (connected) return n.label
          return n.isHub || n.connections >= 5 || n.isGap ? n.label : ''
        })

        // Glow on hovered node
        nodeSelection.select('circle')
          .attr('filter', (n) => n.id === d.id ? 'url(#hover-glow)' : null)

        const rect = wrapperRef.current.getBoundingClientRect()
        setTooltip({ node: d, x: event.clientX - rect.left, y: event.clientY - rect.top })
      })
      .on('mousemove', (event) => {
        const rect = wrapperRef.current.getBoundingClientRect()
        setTooltip((prev) => ({ ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top }))
      })
      .on('mouseleave', () => {
        linkSelection
          .attr('stroke-opacity', (d) => getLinkOpacity(d.strength))
          .attr('stroke', '#333')
          .attr('stroke-width', (d) => getLinkWidth(d.strength))

        nodeSelection.select('text').text((n) =>
          n.isHub || n.connections >= 5 || n.isGap ? n.label : ''
        )

        nodeSelection.select('circle').attr('filter', null)

        setTooltip({ node: null, x: 0, y: 0 })
      })
      .on('click', (event, d) => {
        event.stopPropagation()
        if (onNodeClick) onNodeClick(d)
      })

    // ---- Selected node highlight ----
    if (selectedNodeId) {
      nodeSelection.select('circle')
        .attr('stroke-width', (d) => d.id === selectedNodeId ? 2 : d.isHub ? 1 : 0.5)
        .attr('filter', (d) => d.id === selectedNodeId ? 'url(#hover-glow)' : null)
    }

    // ---- Simulation ----
    const simulation = createSimulation(nodes, links, width, height)
    simulationRef.current = simulation

    simulation.on('tick', () => {
      linkSelection.attr('d', (d) => {
        const sx = d.source.x, sy = d.source.y
        const tx = d.target.x, ty = d.target.y
        const ddx = tx - sx, ddy = ty - sy
        const len = Math.sqrt(ddx * ddx + ddy * ddy) || 1
        // Very gentle quadratic curve (6% perpendicular offset)
        const cpx = (sx + tx) / 2 + (-ddy / len) * (len * 0.06)
        const cpy = (sy + ty) / 2 + (ddx / len) * (len * 0.06)
        return `M ${sx} ${sy} Q ${cpx} ${cpy} ${tx} ${ty}`
      })
      nodeSelection.attr('transform', (d) => `translate(${d.x},${d.y})`)
    })

    // ---- Initial zoom to fit ----
    svg.call(zoomBehaviour.transform, d3.zoomIdentity.translate(width * 0.1, height * 0.1).scale(0.85))

    return () => simulation.stop()
  }, [data, dimensions, selectedNodeId, personalizedNodeIds])

  // ---- Zoom controls ----
  const handleZoom = useCallback((factor) => {
    if (!svgRef.current || !zoomRef.current) return
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, factor)
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

      <div style={{ position: 'absolute', top: 'var(--space-4)', left: 'var(--space-4)', zIndex: 10 }}>
        <span className="spore-count">
          <span className="spore-count__dot" />
          {data?.nodes?.length ?? 0} nodes · {data?.links?.length ?? 0} edges
        </span>
      </div>
    </div>
  )
}
