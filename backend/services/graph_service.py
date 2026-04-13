"""
SYNODEA NEXT — Graph Service
Transforms vault markdown files into D3.js-compatible graph data.

Graph format:
  nodes: [{id, label, group, cluster, size, is_hub, is_gap, word_count, tags, path}]
  links: [{source, target, strength}]
  clusters: [{id, label, node_ids, color}]
  gaps:   [{node_id, label, reason, connection_count}]

Hub = 5+ inbound connections
Gap (dark zone) = 0-1 inbound connections
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Union

from .vault_loader import VaultFile, VaultLoader


# ── Cluster Colors (matches Frequency Color System) ──────────────────────

FOLDER_COLORS: dict[str, str] = {
    "Atlas": "#8B5CF6",      # Purple — deep knowledge
    "Kapitel": "#3B82F6",    # Blue — structured chapters
    "Transkripte": "#10B981", # Green — live sessions
    "Gaps": "#EF4444",       # Red — structural holes
    "Workbook": "#F59E0B",   # Amber — active work
    "root": "#6B7280",       # Grey — root/home files
    "unknown": "#9CA3AF",    # Light grey
}

HUB_THRESHOLD = 5     # inbound links ≥ this → hub
GAP_THRESHOLD = 1     # inbound links ≤ this → gap/dark zone


# ── Graph Builder ────────────────────────────────────────────────────────


class GraphService:
    """
    Builds D3.js graph data from a vault directory.

    Args:
        vault_path: Absolute path to the markdown vault.
    """

    def __init__(self, vault_path: Union[str, Path]) -> None:
        self.loader = VaultLoader(vault_path)

    def build_graph(self) -> dict[str, Any]:
        """
        Main entry point. Loads vault and returns D3-compatible graph dict.

        Returns:
            {nodes, links, clusters, gaps, stats}
        """
        files = self.loader.load_all()
        if not files:
            return {"nodes": [], "links": [], "clusters": [], "gaps": [], "stats": {}}

        title_index = self.loader.build_title_index()
        inbound_counts = self.loader.build_connection_count()

        nodes = self._build_nodes(files, inbound_counts)
        links = self._build_links(files, title_index)
        clusters = self._build_clusters(nodes)
        gaps = self._build_gaps(nodes)
        stats = self._build_stats(nodes, links, gaps)

        return {
            "nodes": [n.__dict__ for n in nodes],
            "links": [l.__dict__ for l in links],
            "clusters": [c.__dict__ for c in clusters],
            "gaps": [g.__dict__ for g in gaps],
            "stats": stats,
        }

    # ── Node Building ────────────────────────────────────────────────────

    def _build_nodes(
        self, files: list[VaultFile], inbound_counts: dict[str, int]
    ) -> list["_Node"]:
        nodes: list[_Node] = []
        for f in files:
            inbound = inbound_counts.get(f.title, 0)
            outbound = len(f.wikilinks)
            total_connections = inbound + outbound

            # Size: sqrt-scaled for visual clarity (1-20 range)
            size = max(1, min(20, 1 + int((total_connections ** 0.5) * 3)))

            node = _Node(
                id=f.title,
                label=f.title,
                group=f.folder,
                cluster=f.folder,
                size=size,
                is_hub=(inbound >= HUB_THRESHOLD),
                is_gap=(inbound <= GAP_THRESHOLD and outbound <= GAP_THRESHOLD),
                word_count=f.word_count,
                tags=f.tags,
                path=str(f.path.relative_to(self.loader.vault_root)),
            )
            nodes.append(node)
        return nodes

    # ── Link Building ────────────────────────────────────────────────────

    def _build_links(
        self,
        files: list[VaultFile],
        title_index: dict[str, VaultFile],
    ) -> list["_Link"]:
        """Build directional links from wikilinks. Deduplicated by (source, target) pair."""
        seen_pairs: set[tuple[str, str]] = set()
        links: list[_Link] = []
        all_titles = {f.title for f in files}

        for f in files:
            for raw_link in f.wikilinks:
                # Resolve the wikilink target title
                resolved = title_index.get(raw_link.lower())
                if resolved is None:
                    continue
                target_title = resolved.title
                if target_title not in all_titles:
                    continue
                if f.title == target_title:
                    continue  # skip self-links

                pair = (f.title, target_title)
                reverse_pair = (target_title, f.title)

                if pair in seen_pairs:
                    continue

                # Check if reverse link exists (bidirectional)
                if reverse_pair in seen_pairs:
                    # Upgrade existing link strength
                    for lnk in links:
                        if lnk.source == target_title and lnk.target == f.title:
                            lnk.strength = min(1.0, lnk.strength + 0.3)
                            break
                    seen_pairs.add(pair)
                    continue

                seen_pairs.add(pair)
                links.append(_Link(source=f.title, target=target_title, strength=0.7))

        return links

    # ── Cluster Building ─────────────────────────────────────────────────

    def _build_clusters(self, nodes: list["_Node"]) -> list["_Cluster"]:
        """Group nodes by their folder into named clusters."""
        folder_to_nodes: dict[str, list[str]] = {}
        for node in nodes:
            folder_to_nodes.setdefault(node.group, []).append(node.id)

        clusters: list[_Cluster] = []
        for folder, node_ids in folder_to_nodes.items():
            color = FOLDER_COLORS.get(folder, FOLDER_COLORS["unknown"])
            clusters.append(_Cluster(
                id=folder.lower().replace(" ", "_"),
                label=folder,
                node_ids=node_ids,
                color=color,
            ))
        return clusters

    # ── Gap Detection ────────────────────────────────────────────────────

    def _build_gaps(self, nodes: list["_Node"]) -> list["_Gap"]:
        """
        Identify gap nodes — files with very few connections.
        Provides actionable reason string for each gap.
        """
        gaps: list[_Gap] = []
        for node in nodes:
            if not node.is_gap:
                continue
            conn = node.size  # size reflects total connections
            if conn <= 1:
                reason = "Dark zone — no inbound or outbound wikilinks"
            else:
                reason = "Low connectivity — only 1 connection"
            gaps.append(_Gap(
                node_id=node.id,
                label=node.label,
                reason=reason,
                connection_count=conn,
            ))
        return gaps

    # ── Stats ────────────────────────────────────────────────────────────

    def _build_stats(
        self,
        nodes: list["_Node"],
        links: list["_Link"],
        gaps: list["_Gap"],
    ) -> dict[str, Any]:
        total = len(nodes)
        hub_count = sum(1 for n in nodes if n.is_hub)
        gap_count = len(gaps)
        connected = total - gap_count
        coverage = round((connected / total * 100), 1) if total > 0 else 0.0

        avg_connections = (
            round(sum(n.size for n in nodes) / total, 2) if total > 0 else 0.0
        )

        clusters = {}
        for n in nodes:
            clusters[n.group] = clusters.get(n.group, 0) + 1

        return {
            "total_files": total,
            "total_links": len(links),
            "hub_count": hub_count,
            "gap_count": gap_count,
            "connected_count": connected,
            "coverage_percent": coverage,
            "avg_connections": avg_connections,
            "cluster_distribution": clusters,
        }


# ── Simple Data Classes (lighter than Pydantic for internal use) ─────────


class _Node:
    __slots__ = ("id", "label", "group", "cluster", "size", "is_hub", "is_gap",
                 "word_count", "tags", "path")

    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

    @property
    def __dict__(self):
        return {s: getattr(self, s) for s in self.__slots__}


class _Link:
    __slots__ = ("source", "target", "strength")

    def __init__(self, source: str, target: str, strength: float = 1.0):
        self.source = source
        self.target = target
        self.strength = strength

    @property
    def __dict__(self):
        return {"source": self.source, "target": self.target, "strength": self.strength}


class _Cluster:
    __slots__ = ("id", "label", "node_ids", "color")

    def __init__(self, id: str, label: str, node_ids: list[str], color: str):
        self.id = id
        self.label = label
        self.node_ids = node_ids
        self.color = color

    @property
    def __dict__(self):
        return {s: getattr(self, s) for s in self.__slots__}


class _Gap:
    __slots__ = ("node_id", "label", "reason", "connection_count")

    def __init__(self, node_id: str, label: str, reason: str, connection_count: int):
        self.node_id = node_id
        self.label = label
        self.reason = reason
        self.connection_count = connection_count

    @property
    def __dict__(self):
        return {s: getattr(self, s) for s in self.__slots__}
