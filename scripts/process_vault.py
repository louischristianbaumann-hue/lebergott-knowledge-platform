#!/usr/bin/env python3
"""
SYNODEA NEXT — Vault Processor
Converts an Obsidian vault folder into a D3.js-compatible graph JSON.

Usage:
    python3 process_vault.py <vault_path> [output_path]

Example:
    python3 process_vault.py "~/Obsidian/go to/local/Efforts/Ongoing ♻️/lebergott/analyse 1.0 workbook" \
        "../data/lebergott_graph.json"
"""

import os
import re
import json
import sys
from pathlib import Path
from datetime import datetime


# ─── CLUSTER CONFIG ──────────────────────────────────────────────────────────
CLUSTER_COLORS = {
    "Anatomie":    "#00ff88",
    "Ernährung":   "#ffaa00",
    "Entgiftung":  "#ff6644",
    "Mythen":      "#aa88ff",
    "Krankheiten": "#ff3366",
    "Ganzheit":    "#44ddff",
    "Transkripte": "#aaaaaa",
    "Maps":        "#ffffff",
    "Gaps":        "#ff9900",
}

# Folder prefix → cluster (checked before keyword heuristics)
FOLDER_CLUSTERS = {
    "Transkripte/":   "Transkripte",
    "Atlas/Maps/":    "Maps",
    "Gaps/":          "Gaps",
    "Workbook/":      "Ganzheit",
    "Kapitel/01":     "Anatomie",
    "Kapitel/02":     "Anatomie",
    "Kapitel/03":     "Entgiftung",
    "Kapitel/04":     "Krankheiten",
}

# Keyword → cluster (matched against title first, then first 400 chars of content)
KEYWORD_CLUSTERS = {
    "Ernährung":   ["ernähr","zucker","fett","nahrung","essen","öl","eiweiß","protein",
                    "kollagen","cholesterin","alkohol","industriel"],
    "Entgiftung":  ["entgift","toxin","metall","schwermetall","gift","belast","adrenalin"],
    "Mythen":      ["mythos","mythen","irrtum","falsch","wahrheit","genetik","hormon-mythos"],
    "Krankheiten": ["krank","diabetes","herzinfarkt","krebs","zirrhose","fettleber","insulinresistenz"],
    "Anatomie":    ["anatomie","organ","zelle","bauchspeichel","mitochondrien","baustein","leberkonform"],
    "Ganzheit":    ["ganzheit","selbstheil","natur","urzustand","dankbar","emotion","ritual",
                    "leber heisst","leber heißt","leber als emotionaler"],
}


# ─── HELPERS ─────────────────────────────────────────────────────────────────
def slugify(text: str) -> str:
    text = text.lower()
    for src, dst in [('ä','ae'),('ö','oe'),('ü','ue'),('Ä','ae'),('Ö','oe'),('Ü','ue'),('ß','ss')]:
        text = text.replace(src, dst)
    text = re.sub(r'[^a-z0-9\-]', '-', text)
    text = re.sub(r'-+', '-', text)
    return text.strip('-')


def get_cluster(filepath: str, vault_path: str, content: str, title: str) -> str:
    rel = filepath.replace(vault_path.rstrip('/') + '/', '')

    # Folder-based priority
    for prefix, cluster in FOLDER_CLUSTERS.items():
        if rel.startswith(prefix):
            return cluster

    # Home.md is a map
    if rel == "Home.md":
        return "Maps"

    title_lower = title.lower()
    content_snippet = content.lower()[:400]

    for cluster, kws in KEYWORD_CLUSTERS.items():
        for kw in kws:
            if kw in title_lower:
                return cluster

    for cluster, kws in KEYWORD_CLUSTERS.items():
        for kw in kws:
            if kw in content_snippet:
                return cluster

    return "Ganzheit"


def get_type(filepath: str, vault_path: str) -> str:
    rel = filepath.replace(vault_path.rstrip('/') + '/', '')
    if rel.startswith("Transkripte/"):   return "transcript"
    if rel.startswith("Atlas/Maps/"):    return "map"
    if rel == "Home.md":                 return "map"
    if rel.startswith("Gaps/"):          return "gap"
    if rel.startswith("Kapitel/"):       return "chapter"
    return "concept"


def parse_frontmatter_tags(fm_text: str) -> list:
    tags_block = re.search(r'tags:\s*\n((?:\s+-\s+.+\n)+)', fm_text)
    if tags_block:
        return re.findall(r'-\s+["\']?#?(.+?)["\']?\s*$', tags_block.group(1), re.MULTILINE)
    tags_inline = re.search(r'tags:\s*\[(.+?)\]', fm_text)
    if tags_inline:
        return [t.strip().strip('"\'#') for t in tags_inline.group(1).split(',')]
    return []


def extract_excerpt(content: str) -> str:
    text = re.sub(r'^---.*?---\s*', '', content, flags=re.DOTALL)
    text = re.sub(r'\[\[([^\]|]+)(?:\|[^\]]+)?\]\]', r'\1', text)
    text = re.sub(r'[#>*`\[\]_]', '', text)
    lines = [l.strip() for l in text.split('\n') if len(l.strip()) > 40]
    return lines[0][:200] if lines else text.strip()[:200]


def resolve_wikilink(wl_text: str, all_ids: set, title_to_id: dict, stem_to_id: dict):
    slug = slugify(wl_text)
    if slug in all_ids:
        return slug
    wl_lower = wl_text.lower()
    if wl_lower in title_to_id:
        return title_to_id[wl_lower]
    if slug in title_to_id:
        return title_to_id[slug]
    if wl_lower in stem_to_id:
        return stem_to_id[wl_lower]
    for title_key, tid in title_to_id.items():
        if wl_lower in title_key or title_key in wl_lower:
            return tid
    return None


# ─── MAIN ────────────────────────────────────────────────────────────────────
def process_vault(vault_path: str, output_path=None) -> dict:
    vault_path = str(Path(vault_path).expanduser().resolve())

    if not os.path.isdir(vault_path):
        raise ValueError(f"Vault path does not exist: {vault_path}")

    vault_name = os.path.basename(vault_path)

    # Auto output path: <vault_parent>/lebergott_graph.json if not specified
    if output_path is None:
        output_path = os.path.join(os.path.dirname(vault_path), f"{slugify(vault_name)}_graph.json")

    output_path = str(Path(output_path).expanduser().resolve())

    # ── Find all .md files ──
    all_files = []
    for root, dirs, files in os.walk(vault_path):
        for f in sorted(files):
            if f.endswith('.md'):
                all_files.append(os.path.join(root, f))
    all_files.sort()

    print(f"Found {len(all_files)} markdown files in {vault_path}")

    # ── First pass: collect IDs and titles for link resolution ──
    raw_nodes = []
    title_to_id: dict = {}
    stem_to_id: dict = {}

    for filepath in all_files:
        with open(filepath, 'r', encoding='utf-8') as fh:
            content = fh.read()
        heading_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        title = heading_match.group(1).strip() if heading_match else Path(filepath).stem
        node_id = slugify(Path(filepath).stem)
        raw_nodes.append((node_id, title, filepath, content))
        title_to_id[title.lower()] = node_id
        title_to_id[slugify(title)] = node_id
        stem_to_id[Path(filepath).stem.lower()] = node_id

    all_ids = {n[0] for n in raw_nodes}

    # ── Second pass: full extraction ──
    nodes_data: dict = {}

    for node_id, title, filepath, content in raw_nodes:
        # Frontmatter
        yaml_tags = []
        fm_match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
        if fm_match:
            yaml_tags = parse_frontmatter_tags(fm_match.group(1))

        # Wikilinks
        wikilinks_raw = re.findall(r'\[\[([^\]]+)\]\]', content)
        wikilinks_normalized = []
        for wl in wikilinks_raw:
            wl_clean = wl.split('|')[0].strip()
            if '/' in wl_clean:
                wl_clean = wl_clean.split('/')[-1]
            if wl_clean and '#' not in wl_clean:
                wikilinks_normalized.append(wl_clean)

        # Content tags
        content_tags = re.findall(r'(?<!\[)#([a-zA-ZäöüßÄÖÜ][a-zA-ZäöüßÄÖÜ0-9_\-]+)', content)
        all_tags = list(set(yaml_tags + content_tags))

        # Word count
        text_clean = re.sub(r'```.*?```', '', content, flags=re.DOTALL)
        text_clean = re.sub(r'---.*?---', '', text_clean, flags=re.DOTALL)
        text_clean = re.sub(r'[#*\[\]`>\-|]', ' ', text_clean)
        word_count = len(text_clean.split())

        rel_path = filepath.replace(vault_path.rstrip('/') + '/', '')
        cluster = get_cluster(filepath, vault_path, content, title)
        node_type = get_type(filepath, vault_path)

        nodes_data[node_id] = {
            "id": node_id,
            "label": title,
            "path": rel_path,
            "group": cluster,
            "type": node_type,
            "_wikilinks": wikilinks_normalized,
            "tags": [t for t in all_tags if t],
            "wordCount": word_count,
            "excerpt": extract_excerpt(content),
            "connections": 0,
            "isHub": False,
            "isGap": False,
        }

    # ── Build links ──
    links = []
    link_set: set = set()
    connection_counts: dict = {nid: 0 for nid in nodes_data}

    for source_id, node in nodes_data.items():
        for wl in node["_wikilinks"]:
            target_id = resolve_wikilink(wl, all_ids, title_to_id, stem_to_id)
            if target_id and target_id != source_id and target_id in nodes_data:
                key = tuple(sorted([source_id, target_id]))
                if key not in link_set:
                    link_set.add(key)
                    links.append({
                        "source": source_id,
                        "target": target_id,
                        "type": "wikilink",
                        "strength": 1.0
                    })
                connection_counts[source_id] += 1
                connection_counts[target_id] += 1

    # Update connection counts
    for nid in nodes_data:
        nodes_data[nid]["connections"] = connection_counts[nid]
        nodes_data[nid]["isHub"] = connection_counts[nid] >= 5
        nodes_data[nid]["isGap"] = connection_counts[nid] <= 1

    # ── Detect gaps ──
    gaps_list = []
    for nid, node in nodes_data.items():
        c = node["connections"]
        if c == 0:
            gaps_list.append({
                "nodeId": nid,
                "reason": "0 connections — completely isolated node",
                "severity": "critical",
                "bridgeSuggestion": f"Could bridge to {node['group']} cluster"
            })
        elif c == 1:
            gaps_list.append({
                "nodeId": nid,
                "reason": "Only 1 connection — weakly integrated",
                "severity": "amber",
                "bridgeSuggestion": f"Could connect further into {node['group']} cluster"
            })

    # ── Build clusters ──
    cluster_counts: dict = {}
    for node in nodes_data.values():
        g = node["group"]
        cluster_counts[g] = cluster_counts.get(g, 0) + 1

    clusters = []
    for cluster_label, count in sorted(cluster_counts.items()):
        clusters.append({
            "id": slugify(cluster_label),
            "label": cluster_label,
            "color": CLUSTER_COLORS.get(cluster_label, "#888888"),
            "nodeCount": count
        })

    # ── Stats ──
    total_files = len(nodes_data)
    total_connections = len(links)
    hub_count = sum(1 for n in nodes_data.values() if n["isHub"])
    gap_count = len(gaps_list)
    avg_conn = round(total_connections * 2 / total_files, 2) if total_files else 0

    stats = {
        "total_files": total_files,
        "total_connections": total_connections,
        "total_gaps": gap_count,
        "total_hubs": hub_count,
        "avg_connections": avg_conn
    }

    # ── Finalize nodes (remove internal _wikilinks field) ──
    final_nodes = []
    for node in nodes_data.values():
        n = {k: v for k, v in node.items() if not k.startswith('_')}
        final_nodes.append(n)
    final_nodes.sort(key=lambda x: (-x["connections"], x["label"]))

    # ── Assemble graph ──
    graph = {
        "vault_id": slugify(vault_name),
        "vault_name": vault_name,
        "generated": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "stats": stats,
        "nodes": final_nodes,
        "links": links,
        "clusters": clusters,
        "gaps": gaps_list,
    }

    # ── Write output ──
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as fh:
        json.dump(graph, fh, ensure_ascii=False, indent=2)

    print(f"\nGraph written → {output_path}")
    print(f"  Files:       {total_files}")
    print(f"  Links:       {total_connections}")
    print(f"  Hubs (5+):   {hub_count}")
    print(f"  Gaps:        {gap_count}")
    print(f"  Avg conn:    {avg_conn}")

    return graph


# ─── CLI ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    vault_arg = sys.argv[1]
    output_arg = sys.argv[2] if len(sys.argv) > 2 else None

    process_vault(vault_arg, output_arg)
