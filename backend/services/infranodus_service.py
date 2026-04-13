"""
InfraNodus Live Service
Calls InfraNodus REST API for live Lebergott graph data and content gaps.
Falls back to infranodus_cache.json when API unavailable.

6 Lebergott graphs (confirmed via MCP list_graphs 2026-04-13):
  lebergott-wissen, lebergott-gaps, lebergott-konzepte-2,
  lebergott-konzepte-1, lebergott-belastungen-krankheiten, lebergott-anatomie-leber
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

try:
    import httpx
    _HTTPX_AVAILABLE = True
except ImportError:
    _HTTPX_AVAILABLE = False

CACHE_PATH = Path(__file__).parents[2] / "data" / "infranodus_cache.json"
INFRANODUS_BASE = "https://infranodus.com"
INFRANODUS_USERNAME = "lautloos"

LEBERGOTT_GRAPHS: list[str] = [
    "lebergott-wissen",
    "lebergott-gaps",
    "lebergott-konzepte-2",
    "lebergott-konzepte-1",
    "lebergott-belastungen-krankheiten",
    "lebergott-anatomie-leber",
]

GRAPH_DESCRIPTIONS: dict[str, str] = {
    "lebergott-wissen":                "Hauptwissen — Lebergott Kernkonzepte",
    "lebergott-gaps":                  "Wissenslücken — Identifizierte Gaps",
    "lebergott-konzepte-2":            "Konzepte Teil 2 — Erweiterte Wissensbasis",
    "lebergott-konzepte-1":            "Konzepte Teil 1 — Grundlegende Konzepte",
    "lebergott-belastungen-krankheiten": "Belastungen & Krankheiten",
    "lebergott-anatomie-leber":        "Anatomie & Physiologie der Leber",
}

# Lebergott brand colors for clusters
_CLUSTER_COLORS = ["#1a3a2a", "#c5a55a", "#2d5a3d", "#4a7c59", "#6b9e7a", "#8db89a",
                   "#0f2418", "#9e8648", "#3a6b4a", "#5a8c6a"]


class InfraNodusService:
    """
    Live InfraNodus integration for Lebergott Knowledge Platform.

    Priority:
      1. InfraNodus REST API (if api_key configured)
      2. infranodus_cache.json (always available fallback)
    """

    def __init__(self, api_key: str = "", username: str = INFRANODUS_USERNAME):
        self.api_key = api_key
        self.username = username
        self._cache: dict[str, Any] | None = None

    # ── Cache ─────────────────────────────────────────────────────────────

    def _load_cache(self) -> dict[str, Any]:
        if self._cache is None:
            if CACHE_PATH.exists():
                self._cache = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
            else:
                self._cache = {}
        return self._cache

    def _cache_for(self, graph_name: str) -> dict[str, Any]:
        return self._load_cache().get(graph_name, {})

    # ── REST API ─────────────────────────────────────────────────────────

    def _api_headers(self) -> dict[str, str]:
        if self.api_key:
            return {"X-Api-Key": self.api_key, "Accept": "application/json"}
        return {"Accept": "application/json"}

    def _fetch_graph(self, graph_name: str) -> dict[str, Any] | None:
        """
        Fetch raw graph analysis from InfraNodus REST API v2.
        Returns None if unavailable or no API key.
        """
        if not self.api_key or not _HTTPX_AVAILABLE:
            return None
        try:
            url = f"{INFRANODUS_BASE}/api/v2/user/{self.username}/{graph_name}"
            with httpx.Client(timeout=8.0) as client:
                resp = client.get(
                    url,
                    headers=self._api_headers(),
                    params={"options": "analysis"},
                )
            if resp.status_code == 200:
                data = resp.json()
                # Mark as live source
                data["_source"] = "live"
                return data
        except Exception:
            pass
        return None

    # ── Public API ────────────────────────────────────────────────────────

    def get_graph_analysis(self, graph_name: str) -> dict[str, Any]:
        """
        Get normalized analysis for one graph.
        Returns live data when API available, else cached.
        """
        raw = self._fetch_graph(graph_name)
        if raw:
            return self._normalize_live(raw, graph_name)
        cached = self._cache_for(graph_name)
        if cached:
            cached["source"] = "cached"
        return cached

    def get_gaps(self, graph_name: str) -> list[dict[str, Any]]:
        """Get normalized gap list for a single graph."""
        return self.get_graph_analysis(graph_name).get("gaps", [])

    def get_bridges(self, graph_name: str) -> list[dict[str, Any]]:
        """Get normalized bridge list for a single graph."""
        return self.get_graph_analysis(graph_name).get("bridges", [])

    def get_all_lebergott(self) -> dict[str, Any]:
        """
        Aggregate data from all 6 Lebergott graphs.
        Returns merged gaps (top 10), bridges (top 8), cluster overview, stats.
        """
        all_gaps: list[dict] = []
        all_bridges: list[dict] = []
        all_clusters: list[dict] = []
        total_nodes = 0
        total_edges = 0
        any_live = False

        for graph_name in LEBERGOTT_GRAPHS:
            raw = self._fetch_graph(graph_name)
            if raw:
                data = self._normalize_live(raw, graph_name)
                any_live = True
            else:
                data = self._cache_for(graph_name)
                if data:
                    data["source"] = "cached"

            all_gaps.extend(data.get("gaps", []))
            all_bridges.extend(data.get("bridges", []))
            all_clusters.extend(data.get("clusters", []))
            stats = data.get("stats", {})
            total_nodes += stats.get("total_nodes", 0)
            total_edges += stats.get("total_edges", 0)

        # Sort gaps by bridge_potential descending
        all_gaps.sort(key=lambda g: g.get("bridge_potential", 0), reverse=True)

        return {
            "graphs": LEBERGOTT_GRAPHS,
            "graph_descriptions": GRAPH_DESCRIPTIONS,
            "gaps": all_gaps[:10],
            "bridges": all_bridges[:8],
            "clusters": all_clusters,
            "stats": {
                "total_graphs": len(LEBERGOTT_GRAPHS),
                "total_nodes": total_nodes,
                "total_edges": total_edges,
            },
            "source": "live" if any_live else "cached",
        }

    # ── Normalization ─────────────────────────────────────────────────────

    def _normalize_live(self, raw: dict[str, Any], graph_name: str) -> dict[str, Any]:
        """Normalize InfraNodus REST API response to our unified format."""
        # Some API versions wrap inside 'analysis', others put it at root
        analysis = raw.get("analysis") or raw

        clusters = self._parse_clusters(analysis, graph_name)
        gaps = self._parse_gaps(analysis, graph_name)
        bridges = self._parse_bridges(analysis, graph_name)

        nodes_total = (
            raw.get("nodesTotal")
            or raw.get("numberOfNodes")
            or raw.get("nodes_count")
            or len(raw.get("nodes", []))
            or 0
        )
        edges_total = (
            raw.get("edgesTotal")
            or raw.get("numberOfEdges")
            or raw.get("edges_count")
            or len(raw.get("edges", []))
            or 0
        )

        return {
            "graph_name": graph_name,
            "description": GRAPH_DESCRIPTIONS.get(graph_name, graph_name),
            "clusters": clusters,
            "gaps": gaps,
            "bridges": bridges,
            "stats": {"total_nodes": nodes_total, "total_edges": edges_total},
            "source": "live",
        }

    def _parse_clusters(self, analysis: dict, graph_name: str) -> list[dict]:
        raw = (
            analysis.get("topicalClusters")
            or analysis.get("clusters")
            or analysis.get("mainTopicalClusters")
            or []
        )
        result = []
        for i, c in enumerate(raw[:8]):
            color = _CLUSTER_COLORS[i % len(_CLUSTER_COLORS)]
            if isinstance(c, dict):
                result.append({
                    "id": f"{graph_name}-cluster-{i}",
                    "label": c.get("label") or c.get("name") or f"Cluster {i+1}",
                    "color": color,
                    "weight": c.get("weight", 0.5),
                    "nodes": c.get("nodes") or c.get("concepts") or [],
                    "top_concepts": c.get("topConcepts") or [],
                    "graph": graph_name,
                })
            elif isinstance(c, str):
                # Parse "1. Label: concepts (id | pct | pct)" format
                m = re.match(r'\d+\.\s+([^:(]+)', c)
                label = m.group(1).strip() if m else c[:40]
                result.append({
                    "id": f"{graph_name}-cluster-{i}",
                    "label": label,
                    "color": color,
                    "weight": 0.5,
                    "nodes": [],
                    "top_concepts": [],
                    "graph": graph_name,
                })
        return result

    def _parse_gaps(self, analysis: dict, graph_name: str) -> list[dict]:
        """
        Parse gaps from InfraNodus API response.
        Handles both structured (dict) and string formats.
        """
        raw = (
            analysis.get("topicalGaps")
            or analysis.get("contentGaps")
            or analysis.get("gaps")
            or []
        )
        result = []
        for i, gap in enumerate(raw[:5]):
            if isinstance(gap, str):
                parsed = self._parse_gap_string(gap)
                gap_id = f"{graph_name}-gap-{i+1}"
                result.append({
                    "id": gap_id,
                    "concept": gap_id,
                    "label": parsed["label"],
                    "title": parsed["label"],          # GapPanel uses 'title'
                    "description": parsed["description"],
                    "reason": parsed["description"],   # GapPanel uses 'reason'
                    "bridge": parsed["bridge_hint"],
                    "bridge_potential": round(0.92 - i * 0.05, 2),
                    "connections": 0,
                    "gap_type": "missing_connection",
                    "related_clusters": [parsed["from_cluster"], parsed["to_cluster"]],
                    "graph": graph_name,
                    "source": "live",
                })
            elif isinstance(gap, dict):
                gap_id = gap.get("id") or gap.get("concept") or f"{graph_name}-gap-{i+1}"
                label = gap.get("label") or gap.get("title") or gap_id
                desc = gap.get("description") or gap.get("reason") or ""
                result.append({
                    "id": gap_id,
                    "concept": gap_id,
                    "label": label,
                    "title": label,
                    "description": desc,
                    "reason": desc,
                    "bridge": gap.get("bridge") or "",
                    "bridge_potential": gap.get("bridge_potential", 0.8),
                    "connections": gap.get("connections", 0),
                    "gap_type": gap.get("gap_type", "missing_connection"),
                    "related_clusters": gap.get("related_clusters", []),
                    "graph": graph_name,
                    "source": "cached",
                })
        return result

    def _parse_gap_string(self, gap_str: str) -> dict[str, str]:
        """
        Parse InfraNodus gap string format:
        'Gap N: Cluster A (concepts...) -> Cluster B (concepts...)'
        """
        clean = re.sub(r'^Gap \d+:\s*', '', gap_str).strip()
        parts = clean.split(' -> ')
        if len(parts) == 2:
            from_raw, to_raw = parts[0], parts[1]
            # Extract cluster name (before parenthesis, after optional "N. ")
            def extract_name(s: str) -> str:
                m = re.match(r'(?:\d+\.\s+)?([^(]+)', s)
                return m.group(1).strip() if m else s[:35]
            from_cluster = extract_name(from_raw)
            to_cluster = extract_name(to_raw)
            label = f"{from_cluster} → {to_cluster}"
            description = f"Fehlende Verbindung zwischen {from_cluster} und {to_cluster}"
            bridge_hint = f"{from_cluster} und {to_cluster} durch gemeinsame Konzepte verknüpfen"
            return {
                "label": label,
                "description": description,
                "bridge_hint": bridge_hint,
                "from_cluster": from_cluster,
                "to_cluster": to_cluster,
            }
        return {
            "label": clean[:60],
            "description": clean,
            "bridge_hint": "Verbindungskonzepte identifizieren und verknüpfen",
            "from_cluster": "",
            "to_cluster": "",
        }

    def _parse_bridges(self, analysis: dict, graph_name: str) -> list[dict]:
        """
        Parse bridge/gateway concepts from InfraNodus API.
        Conceptual gateways = nodes with highest betweenness centrality.
        """
        gateways = (
            analysis.get("conceptualGateways")
            or analysis.get("gatewayNodes")
            or analysis.get("bridges")
            or []
        )
        relations = analysis.get("topRelations") or analysis.get("topBigrams") or []
        clusters = (
            analysis.get("topicalClusters")
            or analysis.get("clusters")
            or analysis.get("mainTopicalClusters")
            or []
        )
        top_nodes = analysis.get("topInfluentialNodes") or []

        result = []

        for i, gateway in enumerate(gateways[:4]):
            if isinstance(gateway, str):
                clean = re.sub(r'\[\[|\]\]', '', gateway).replace("_", " ")
                # Find a relation involving this gateway
                insight_rel = ""
                for rel in relations:
                    if isinstance(rel, str) and clean.lower() in rel.lower():
                        insight_rel = re.sub(r'\[\[|\]\]', '', rel)
                        break
                connects = self._gateway_connects(clean, clusters, i)
                bc_score = 0.95 - i * 0.08
                # Try to get actual bc from topInfluentialNodes
                for node in top_nodes:
                    if isinstance(node, dict):
                        node_name = re.sub(r'\[\[|\]\]', '', node.get("node", "")).replace("_", " ")
                        if node_name.lower() == clean.lower():
                            bc_score = min(0.99, node.get("bc", bc_score) * 3)
                            break

                bridge_id = f"{graph_name}-bridge-{i+1}"
                result.append({
                    "id": bridge_id,
                    "concept": bridge_id,
                    "label": clean.title(),
                    "title": clean.title(),            # BridgePanel uses 'title'
                    "connects": connects,
                    "why": (
                        f"{clean.title()} verbindet mehrere Wissenscluster als konzeptuelles "
                        f"Brückenelement — {insight_rel or 'zentraler Knotenpunkt im Wissensnetz'}"
                    ),
                    "insight": insight_rel or f"{clean} als Verbindungskonzept",
                    "strength": round(min(0.99, bc_score), 2),
                    "graph": graph_name,
                    "source": "live",
                })
            elif isinstance(gateway, dict):
                gw_id = gateway.get("id") or gateway.get("concept") or f"{graph_name}-bridge-{i+1}"
                label = gateway.get("label") or gateway.get("title") or gw_id
                result.append({
                    "id": gw_id,
                    "concept": gw_id,
                    "label": label,
                    "title": label,
                    "connects": gateway.get("connects") or "",
                    "why": gateway.get("why") or gateway.get("insight") or "",
                    "insight": gateway.get("insight") or "",
                    "strength": gateway.get("strength", 0.7),
                    "graph": graph_name,
                    "source": "cached",
                })
        return result

    def _gateway_connects(self, gateway: str, clusters: list, idx: int) -> str:
        """Generate a connect string for a gateway concept."""
        def cluster_label(c: Any) -> str:
            if isinstance(c, dict):
                return c.get("label") or c.get("name") or ""
            if isinstance(c, str):
                m = re.match(r'(?:\d+\.\s+)?([^:(]+)', c)
                return m.group(1).strip()[:25] if m else c[:25]
            return ""

        labels = [lbl for c in clusters[:6] if (lbl := cluster_label(c))]
        if len(labels) >= 2:
            a = labels[idx % len(labels)]
            b = labels[(idx + 1) % len(labels)]
            return f"{a} ↔ {b}"
        return f"{gateway} ↔ Verwandte Konzepte"


# ── Module-level helpers ──────────────────────────────────────────────────


def get_infranodus_service(api_key: str = "", username: str = INFRANODUS_USERNAME) -> InfraNodusService:
    """Factory — import and call from routes."""
    return InfraNodusService(api_key=api_key, username=username)
