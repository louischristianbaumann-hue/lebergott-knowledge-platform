---
title: SYNODEA NEXT — Architecture Blueprint
date: '2026-04-13'
tags:
- type/architecture
- domain/business/synodea
- domain/tech/fullstack
- theme/build
- status/active
type: architecture
created: 2026-04-12
version: '1.0'
---

# SYNODEA NEXT — Architecture Blueprint

> Master Reference Document. All implementation agents work from THIS document.

## 1. System Overview

### High-Level Architecture

```
  CUSTOMER (React SPA + D3.js)  ←→  FastAPI Gateway  ←→  ADMIN Dashboard
                                         |
                    +--------------------+-------------------+
                    |                    |                   |
                 Auth Svc          Analysis Engine      Customer Svc
                                        |
                        +---------------+---------------+
                        |               |               |
                    Smart Conn.    InfraNodus       Steiner Scorer
                        |               |               |
                    SQLite (PostgreSQL-ready)
```

### Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Deployment | Managed SaaS (we run it) | Kunden senden Content, wir laufen lassen |
| Analysis Engine | Import existing analysis.py, bridge.py, config.py | Wrap, nicht rewrite |
| Database | SQLite + SQLAlchemy (PostgreSQL swap = connection string) | Simple now, scales later |
| Auth | JWT tokens, per customer | No self-signup, managed onboarding |
| Frontend | React 18 + Vite + D3.js | Fast dev, native force-directed graph |
| API | FastAPI + Pydantic v2 | Type safety, auto OpenAPI, async |
| Graph Viz | D3.js force simulation, custom mycelium physics | Kein Library wrapt was wir brauchen |

### Imported Files (Don't Rewrite)

| File | Class/Function | Strategy |
|------|---------------|----------|
| analysis.py | SynodeaAnalysis | Import into AnalysisEngine service |
| bridge.py | SynodeaBridge | Import into BridgeService |
| config.py | load_framework() | Import directly |
| report.py | generate_report() | Wrap in ReportService + HTML/JSON |
| steiner_framework.json | 7 dimensions + rubrics | Single source of truth |

---

## 2. Data Flow

### Per-Analysis Pipeline

| Phase | Was | Dauer |
|-------|-----|-------|
| 1. Intake | Parse MD, fetch URLs, extract text + wikilinks | ~5s |
| 2. Content Store | Store per customer in content_items table | ~2s |
| 3a. Lens 1 (SC) | Vault matches, semantic gaps, connected concepts | ~15s |
| 3b. Lens 2 (InfraNodus) | Knowledge graph metrics, clusters, gaps, bridges per dimension | ~90s |
| 3c. Lens 3 (Steiner) | 7 dimension scores (1.0-5.0) with justifications | ~30s |
| 4. Synthesis | Calculate Freiheitsindex, map archetype, generate D3 data | ~5s |
| 5. Delivery | API immediately, dashboard live, PDF/MD on demand | Instant |

---

## 3. API Design

**Base URL:** `https://api.synodea.com/api/v1`
**Auth:** `Authorization: Bearer <jwt_token>` — tokens issued during onboarding.

### Endpoints

| Group | Endpoints |
|-------|----------|
| Auth | `POST /auth/token`, `/auth/refresh`, `GET /auth/me` |
| Customers | CRUD at `/customers` (admin) |
| Content | `POST /content/upload` (multipart), `/content/urls`, `GET /content/{id}` |
| Analyses | `POST /analyses`, `GET /analyses/{id}`, `/analyses/{id}/scores`, `/graph`, `/gaps`, `/bridges`, `/development` |
| Graph | `GET /graphs/{id}`, `/dimension/{dim}`, `/gaps`, `/bridges`, `/clusters` |
| Framework | `GET /framework`, `/dimensions`, `/archetypes` (public) |

### Core Schemas (Pydantic v2)

| Schema | Key Fields |
|--------|-----------|
| AnalysisRequest | customer_id, analysis_type (full/update), requested_dimensions |
| AnalysisResult | freiheitsindex, archetype, scores[7], gaps[], bridges[], graph_data |
| DimensionScore | dimension_id, score (1.0-5.0), label, justification, evidence, recommendation |
| GapNode | label, cluster, gap_type (knowledge/practice/research), severity (0-1) |
| BridgeRecommendation | source_concept, target_concept, bridge_type, confidence |
| GraphData | nodes[], edges[], clusters[], gap_zones[], bridge_paths[], physics |

---

## 4. Database Schema

### Entity Relationships

```
customers 1---* analyses 1---* dimension_scores
    |                |
    +---* api_tokens +---* content_items
                     +---* graph_snapshots
                     +---* gap_nodes
                     +---* bridge_recommendations
```

### Tables

| Table | Key Columns |
|-------|------------|
| customers | id, name, slug, industry, plan (starter/pro/enterprise), status |
| api_tokens | customer_id, token_hash, scopes, expires_at |
| content_items | customer_id, analysis_id, source_type, raw_text, wikilinks JSON |
| analyses | customer_id, status, freiheitsindex, archetype, lens_1/2/3_raw JSON |
| dimension_scores | analysis_id, dimension_id, score, label, justification, lens sub-scores |
| graph_snapshots | analysis_id, graph_type, nodes_json, edges_json, clusters_json |
| gap_nodes | analysis_id, label, gap_type, severity, source_lens |
| bridge_recommendations | analysis_id, source_concept, target_concept, confidence |

---

## 5. React Component Map

### Routes

| Route | Component | Data Source |
|-------|-----------|------------|
| /dashboard | FreiheitsindexCard + DimensionOverview + RecentAnalyses | GET /analyses/{id} |
| /graph | MyceliumCanvas + GraphControls + DimensionFilter | GET /graphs/{id} |
| /profil | RadarChart + ArchetypeBadge + DimensionDetail (expandable) | GET /analyses/{id}/scores |
| /gaps | DarkZoneMap + GapList + BridgeSuggestions | GET /analyses/{id}/gaps |
| /development | DimensionSelector + CurrentState + NextLevel + FirstStep | GET /analyses/{id}/development |
| /report | ReportRenderer + ExportButtons (PDF/MD/Excalidraw) | GET /analyses/{id}/report |

### Key Components

| Component | Funktion |
|-----------|----------|
| MyceliumCanvas | D3 force simulation — organic knowledge graph |
| RadarChart | 7-axis spider chart fuer Freiheitsprofil |
| DarkZoneMap | Graph mit leuchtenden Gaps |
| DimensionDetail | Expandable Score + Evidence + Recommendation |
| BridgeSuggestions | Bridge-Pfade mit Confidence-Filter |

---

## 6. Customer Journey (Lebergott)

| Phase | Was passiert |
|-------|-------------|
| Week 0 | 44 MD files uploaded → Customer record → JWT token → Dashboard URL |
| Week 0-1 | First full analysis: 3 lenses → Freiheitsindex → Graph → Gaps |
| Week 2+ | Customer explores dashboard, reads development paths |
| Ongoing | Delta analyses, compare with previous, track improvement |

---

## 7. InfraNodus Integration

| Phase | InfraNodus Call | Zweck |
|-------|----------------|-------|
| Graph Creation | create_knowledge_graph | Brand content → named graph per dimension |
| Cluster Analysis | generate_topical_clusters | Identify thematic groups |
| Gap Detection | generate_content_gaps | Find missing connections |
| Bridge Discovery | develop_conceptual_bridges | Connect disconnected concepts |
| Comparison | overlap_between_texts / difference_between_texts | Between dimensions or competitors |

**Graph Naming:** `synodea-{customer_slug}-{dimension_id}`

---

## 8. Steiner Scoring Pipeline

| Step | Input | Output |
|------|-------|--------|
| 1. Load Rubric | steiner_framework.json | 7 dimensions with 5-level rubrics |
| 2. Gather Evidence | Lens 1 (vault) + Lens 2 (InfraNodus) | Context per dimension |
| 3. Score | Evidence + Rubric → Claude Opus | Score 1.0-5.0 + justification |
| 4. Calculate | Average of 7 scores | Freiheitsindex |
| 5. Map Archetype | Score range | Der Naive → Der Freie Geist |

---

## 9. Graph Visualization (D3.js Mycelium)

### Physics

| Parameter | Default | Beschreibung |
|-----------|---------|-------------|
| chargeStrength | -120 | Node repulsion |
| linkDistance | 60 | Edge rest length |
| centerStrength | 0.03 | Pull to center |
| collisionRadius | 18 | Min distance between nodes |
| alphaDecay | 0.02 | Simulation cooling |

### Visual Encoding

| Element | Encoding |
|---------|----------|
| Node size | Betweenness centrality |
| Node color | Cluster membership |
| Edge width | Connection weight |
| Gap nodes | Pulsing animation (red glow) |
| Bridge edges | Animated dashed lines |
| Clusters | Convex hull overlay (subtle) |

---

## 10. Security & Multi-tenancy

| Aspekt | Implementierung |
|--------|----------------|
| Tenant Isolation | customer_id filter on ALL queries |
| Auth | JWT with customer_id claim |
| Rate Limiting | 100 req/min per token |
| Content Encryption | At rest: SQLite encryption. In transit: HTTPS only. |
| Admin Access | Separate JWT scope, 2FA required |

---

## Netzwerk

[[Steiner-Dimensionen]] · [[Scoring-Rubrik]] · [[SYNODEA]] · [[Anti-Gravity]]
---

## Gaps & Bridges

> Inhaltlich abgeleitet — Lücken und Verbindungen in dieser Note.

### Lücken (was fehlt)

| # | Gap | Warum relevant |
|---|-----|---------------|
| 1 | **Praktische Umsetzung** — Wie graph in konkreten Schritten realisiert werden kann, fehlt noch | Ohne Umsetzung bleibt Konzept abstrakt |
| 2 | **Externe Verbindung** — Zusammenhang zwischen analysis und anderen Systemen/Kontexten | Isolation verhindert Synergien |
| 3 | **Messung & Evaluation** — Kriterien um Fortschritt bei customer zu bewerten | Ohne Messung kein Fortschritt |

### Brücken (was verbindet)

| # | Bridge | Potenzial |
|---|--------|-----------|
| 1 | **Graph → Content** — Verbindung stärkt systematischen Aufbau | Skalierbarkeit |
| 2 | **Analysis × Praxis** — Theorie und Anwendung vereinen | Wirksamkeit |
| 3 | **Analyses × Kontext** — Integration in bestehendes System | Tiefe |

---
*[[AI OS/8_LOGS/2026-04-13_nightshift-revolution-report|Vault Revolution 2026]]*

## Gaps & Brücken

> InfraNodus-Analyse (13.04.2026)

| Typ | Insight |
|-----|---------|
| Gap | **Gap Tools→Automation** — Tools zeigen Gaps, aber der Körper kennt sie schon. SYNODEA muss Kunden-Emotionen in Graph-Analyse einbauen. |
| Brücke | **System formt Zustände** — Die Architektur trainiert das Nervensystem. SYNODEA = System das Freiheitsprofil formt. |
