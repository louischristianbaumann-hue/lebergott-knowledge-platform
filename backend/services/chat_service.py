"""
SYNODEA NEXT — Chat Service
Graph-aware question answering against vault knowledge.
Tries n8n Lebergott bot first; falls back to local graph analysis.
"""
import json
import re
import urllib.request
import urllib.error
from typing import Optional

from ..core.config import get_settings
from .vault_loader import VaultLoader
from .graph_service import GraphService

_settings = get_settings()
# Read from env: N8N_WEBHOOK_URL / N8N_AUTH_TOKEN
N8N_WEBHOOK = _settings.n8n_webhook_url or 'https://n8n-production-6fe9.up.railway.app/webhook/lebergott-bot'
N8N_AUTH = _settings.n8n_auth_token


class ChatService:
    """Answer questions using n8n bot + knowledge graph + vault content."""

    def __init__(self, vault_path: str):
        self.vault_path = vault_path
        self.loader = VaultLoader(vault_path)
        self.graph_svc = GraphService(vault_path)
        self._graph_cache = None

    @property
    def graph(self) -> dict:
        if self._graph_cache is None:
            self._graph_cache = self.graph_svc.build_graph()
        return self._graph_cache

    def answer_with_n8n(
        self,
        question: str,
        role: str = 'client',
        history: Optional[list] = None,
        selected_node_id: Optional[str] = None,
        max_results: int = 5,
    ) -> dict:
        """
        Primary entry point: n8n bot first, then local graph, then demo.

        Args:
            question: User's question
            role: User role (admin/staff/client)
            history: Last N message dicts [{role, text}]
            selected_node_id: Currently selected graph node ID
            max_results: Max nodes to return in enriched response
        """
        history = (history or [])[-10:]

        payload = {
            'query': question,
            'role': role,
            'selectedNode': selected_node_id,
            'history': history,
        }

        # ── 1 attempt: n8n Lebergott Bot (15s timeout, within 30s backend limit) ──
        # n8n bot takes ~10-12s — 1 attempt keeps total under 30s with fallback room
        for attempt in range(1):
            try:
                encoded = json.dumps(payload).encode('utf-8')
                req = urllib.request.Request(
                    N8N_WEBHOOK,
                    data=encoded,
                    headers={
                        'Content-Type': 'application/json',
                        'Authorization': f'Bearer {N8N_AUTH}',
                    },
                    method='POST',
                )
                with urllib.request.urlopen(req, timeout=15) as resp:
                    raw = json.loads(resp.read().decode('utf-8'))

                # Handle various n8n response shapes
                if isinstance(raw, str):
                    answer_text = raw
                elif isinstance(raw, list) and raw:
                    first = raw[0]
                    answer_text = (
                        first.get('output') or first.get('answer') or
                        first.get('knowledge') or first.get('text') or str(first)
                    )
                    raw = first  # use first item for additional fields
                else:
                    # n8n Lebergott bot returns {status, query, knowledge, sources, disclaimer}
                    answer_text = (
                        raw.get('output') or raw.get('answer') or
                        raw.get('knowledge') or raw.get('text')
                    )

                if answer_text:
                    # Enrich with local graph data for nodes/gaps/bridges
                    try:
                        local = self.answer(question, selected_node_id, max_results)
                    except Exception:
                        local = {
                            'relevant_nodes': [], 'gaps': [], 'bridges': [],
                            'follow_up_questions': [], 'context': {},
                        }

                    raw_dict = raw if isinstance(raw, dict) else {}
                    # n8n Lebergott bot provides sources and disclaimer
                    sources = raw_dict.get('sources', [])
                    disclaimer = raw_dict.get('disclaimer', '')

                    # Build follow-ups from local graph (n8n bot doesn't generate them)
                    follow_ups = local.get('follow_up_questions', [])
                    if sources:
                        follow_ups = follow_ups[:3]  # make room for sources hint

                    return {
                        'answer': answer_text,
                        'relevant_nodes': raw_dict.get('relevant_nodes') or local.get('relevant_nodes', []),
                        'gaps': raw_dict.get('gaps') or local.get('gaps', []),
                        'bridges': raw_dict.get('bridges') or local.get('bridges', []),
                        'follow_up_questions': follow_ups,
                        'sources': sources,
                        'disclaimer': disclaimer,
                        'context': {**(local.get('context') or {}), 'source': 'n8n'},
                    }

            except urllib.error.URLError:
                pass  # Network error — n8n unreachable
            except Exception:
                pass  # Parse error — fall through to local graph

        # ── Fallback 1: local graph analysis ────────────────────────────
        try:
            result = self.answer(question, selected_node_id, max_results)
            result.setdefault('context', {})['source'] = 'local'
            return result
        except Exception:
            pass

        # ── Fallback 2: static demo response ────────────────────────────
        return _demo_response(question, role)

    def answer(
        self,
        question: str,
        selected_node_id: Optional[str] = None,
        max_results: int = 5,
    ) -> dict:
        """
        Answer a question using graph structure + vault content (local only).

        Returns:
        - answer: synthesized text answer
        - relevant_nodes: nodes that match the question
        - gaps: related knowledge gaps
        - bridges: suggested cross-cluster connections
        - follow_up_questions: suggested next questions
        """
        graph = self.graph
        nodes = graph["nodes"]
        links = graph["links"]
        gaps = graph["gaps"]

        keywords = self._extract_keywords(question)

        scored_nodes = []
        for node in nodes:
            score = self._relevance_score(node, keywords, selected_node_id)
            if score > 0:
                scored_nodes.append({**node, "_score": score})

        scored_nodes.sort(key=lambda n: n["_score"], reverse=True)
        top_nodes = scored_nodes[:max_results]

        enriched_nodes = []
        for node in top_nodes:
            content_preview = self._load_preview(node.get("path", ""))
            enriched_nodes.append({
                "id": node["id"],
                "label": node["label"],
                "cluster": node.get("cluster", ""),
                "connections": node.get("connections", 0),
                "is_hub": node.get("is_hub", False),
                "is_gap": node.get("is_gap", False),
                "relevance_score": round(node["_score"], 2),
                "content_preview": content_preview,
                "path": node.get("path", ""),
            })

        related_gaps = self._find_related_gaps(keywords, gaps, nodes)
        bridges = self._find_bridges(top_nodes, links, nodes)
        answer = self._synthesize_answer(question, enriched_nodes, related_gaps, bridges)
        follow_ups = self._generate_follow_ups(question, enriched_nodes, related_gaps)

        return {
            "answer": answer,
            "relevant_nodes": enriched_nodes,
            "gaps": related_gaps,
            "bridges": bridges,
            "follow_up_questions": follow_ups,
            "context": {
                "keywords_extracted": keywords,
                "nodes_searched": len(nodes),
                "nodes_matched": len(scored_nodes),
            },
        }

    def _extract_keywords(self, question: str) -> list[str]:
        """Extract meaningful keywords from question."""
        stop_words = {
            "was", "wie", "wo", "wer", "wann", "warum", "ist", "sind", "hat",
            "haben", "der", "die", "das", "ein", "eine", "und", "oder", "aber",
            "mit", "von", "zu", "in", "an", "auf", "für", "über", "nach",
            "nicht", "auch", "noch", "schon", "nur", "kann", "muss", "soll",
            "wird", "werden", "wurde", "mein", "meine", "dein", "sein", "ihr",
            "what", "how", "where", "who", "when", "why", "is", "are", "the",
            "a", "an", "and", "or", "but", "with", "from", "to", "in", "on",
            "for", "about", "my", "your", "this", "that", "do", "does",
        }
        words = re.findall(r'\b\w+\b', question.lower())
        return [w for w in words if w not in stop_words and len(w) > 2]

    def _relevance_score(
        self, node: dict, keywords: list[str], selected_node_id: Optional[str]
    ) -> float:
        """Score a node's relevance to the question keywords."""
        score = 0.0
        label = node.get("label", "").lower()
        node_id = node.get("id", "").lower()
        tags = [t.lower() for t in node.get("tags", [])]
        excerpt = node.get("excerpt", "").lower()

        for kw in keywords:
            if kw in label:
                score += 3.0
            if kw in node_id:
                score += 2.0
            if any(kw in tag for tag in tags):
                score += 1.5
            if kw in excerpt:
                score += 1.0

        if node.get("is_hub"):
            score *= 1.2

        if selected_node_id and node["id"] == selected_node_id:
            score += 5.0

        return score

    def _load_preview(self, rel_path: str, max_chars: int = 500) -> str:
        """Load content preview for a node."""
        if not rel_path:
            return ""
        try:
            vault_file = self.loader.load_file(rel_path)
            if vault_file and vault_file.content:
                content = vault_file.content
                if content.startswith("---"):
                    end = content.find("---", 3)
                    if end > 0:
                        content = content[end + 3:].strip()
                return content[:max_chars]
        except Exception:
            pass
        return ""

    def _find_related_gaps(
        self, keywords: list[str], gaps: list[dict], nodes: list[dict]
    ) -> list[dict]:
        """Find gaps related to the question."""
        related = []
        for gap in gaps:
            label = gap.get("label", "").lower()
            if any(kw in label for kw in keywords):
                related.append({
                    "node_id": gap.get("node_id", ""),
                    "label": gap.get("label", ""),
                    "reason": gap.get("reason", "Isolierter Knoten"),
                    "connection_count": gap.get("connection_count", 0),
                })
        return related

    def _find_bridges(
        self, top_nodes: list[dict], links: list[dict], all_nodes: list[dict]
    ) -> list[dict]:
        """Find bridge opportunities between clusters of matched nodes."""
        if len(top_nodes) < 2:
            return []

        clusters = set()
        for node in top_nodes:
            c = node.get("cluster")
            if c is not None:
                clusters.add(c)

        if len(clusters) < 2:
            return []

        bridges = []
        node_map = {n["id"]: n for n in all_nodes}
        for link in links:
            src_id = link.get("source", "")
            tgt_id = link.get("target", "")
            src_node = node_map.get(src_id, {})
            tgt_node = node_map.get(tgt_id, {})
            src_cluster = src_node.get("cluster")
            tgt_cluster = tgt_node.get("cluster")

            if (
                src_cluster != tgt_cluster
                and src_cluster in clusters
                and tgt_cluster in clusters
            ):
                bridges.append({
                    "from_node": src_node.get("label", src_id),
                    "to_node": tgt_node.get("label", tgt_id),
                    "from_cluster": src_cluster,
                    "to_cluster": tgt_cluster,
                    "strength": link.get("strength", 0.5),
                })

        seen = set()
        unique = []
        for b in bridges:
            key = f"{b['from_node']}-{b['to_node']}"
            if key not in seen:
                seen.add(key)
                unique.append(b)
        return unique[:5]

    def _synthesize_answer(
        self, question: str, nodes: list, gaps: list, bridges: list
    ) -> str:
        """Build a text answer from graph analysis."""
        if not nodes:
            return (
                "Zu dieser Frage konnte ich keine direkt passenden Knoten im Wissensnetz finden. "
                "Versuche es mit anderen Begriffen oder klicke auf einen Knoten im Graph um dort zu starten."
            )

        parts = []

        top = nodes[0]
        parts.append(
            f"**{top['label']}** ist der relevanteste Knoten "
            f"({top['connections']} Verbindungen"
            f"{', Hub-Knoten' if top['is_hub'] else ''})."
        )

        if top["content_preview"]:
            parts.append(f"\n> {top['content_preview'][:200]}...")

        if len(nodes) > 1:
            others = ", ".join(f"**{n['label']}**" for n in nodes[1:4])
            parts.append(f"\nVerwandte Knoten: {others}")

        if gaps:
            gap_names = ", ".join(f"**{g['label']}**" for g in gaps[:3])
            parts.append(
                f"\n⚠️ **Wissenslücken** in diesem Bereich: {gap_names} — "
                "diese Konzepte sind isoliert und brauchen Verbindungen."
            )

        if bridges:
            b = bridges[0]
            parts.append(
                f"\n🌿 **Brücke entdeckt:** {b['from_node']} ↔ {b['to_node']} "
                f"verbindet Cluster {b['from_cluster']} mit {b['to_cluster']}."
            )

        return "\n".join(parts)

    def _generate_follow_ups(
        self, question: str, nodes: list, gaps: list
    ) -> list[str]:
        """Generate follow-up questions."""
        follow_ups = []

        if nodes:
            top = nodes[0]
            follow_ups.append(f"Welche Verbindungen hat {top['label']} zu anderen Clustern?")

            if len(nodes) > 1:
                follow_ups.append(
                    f"Was verbindet {nodes[0]['label']} und {nodes[1]['label']}?"
                )

        if gaps:
            follow_ups.append(
                f"Wie kann die Lücke bei {gaps[0]['label']} geschlossen werden?"
            )

        follow_ups.append("Wo sind die größten blinden Flecken im Wissensnetz?")

        return follow_ups[:4]


# ── Module-level demo fallback ────────────────────────────────────────────────

def _demo_response(question: str, role: str = 'client') -> dict:
    """Last-resort static response when n8n and local graph are both offline."""
    q = question.lower()
    role_prefix = {
        'admin': 'Als Administrator: ',
        'staff': 'Als Therapeut: ',
    }.get(role, '')

    if any(kw in q for kw in ['lücke', 'gap', 'fehlt', 'isoliert']):
        answer = (
            f'{role_prefix}**4 Wissenslücken** erkannt:\n\n'
            '1. [[Session 1 Transkript]] — komplett isoliert\n'
            '2. [[Session 2 Transkript]] — keine Wikilinks\n'
            '3. [[Session 3 Transkript]] — nicht vernetzt\n'
            '4. [[Session 4 Transkript]] — braucht Verbindungen\n\n'
            '⚠️ Transkripte brauchen [[Wikilinks]] zu Konzept-Notes.'
        )
    elif any(kw in q for kw in ['hub', 'zentral', 'vernetzt', 'verbindung']):
        answer = (
            f'{role_prefix}**Top Hub-Knoten** (am stärksten vernetzt):\n\n'
            '1. [[Konzepte-Map]] — 84 Verbindungen\n'
            '2. [[Leber heißt Leben]] — 77 Verbindungen\n'
            '3. [[Fett als Hauptbelastung]] — 54 Verbindungen\n'
            '4. [[Leberkonform leben]] — 51 Verbindungen\n'
            '5. [[Selbstheilungskraft]] — 46 Verbindungen'
        )
    else:
        answer = (
            f'{role_prefix}Demo-Modus (offline). Das Wissensnetz enthält:\n\n'
            '- [[Leberregeneration]] — Selbstheilung, Kräuter, Regeneration\n'
            '- [[Entgiftung]] — Schwermetalle, Toxine, Detox-Protokolle\n'
            '- [[Ernährung]] — Fett-Zucker-Synergie, leberkonformes Leben\n\n'
            '🌿 Starte das Backend für volle Graph-Analyse.'
        )

    return {
        'answer': answer,
        'relevant_nodes': [],
        'gaps': [],
        'bridges': [],
        'follow_up_questions': [
            'Welche Cluster gibt es im Wissensnetz?',
            'Wo sind die größten Wissenslücken?',
            'Was verbindet Ernährung und Entgiftung?',
        ],
        'context': {
            'source': 'demo',
            'keywords_extracted': [],
            'nodes_searched': 0,
            'nodes_matched': 0,
        },
    }
