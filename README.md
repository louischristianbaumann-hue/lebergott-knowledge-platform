# Lebergott Knowledge Platform

Personalized knowledge graph navigation with AI-powered chat, Rudolf Steiner analysis framework, and real-time gap discovery. Built for [Lebergott](https://lebergott.com) — where ancient wisdom meets modern intelligence.

---

## What it does

| Feature | Description |
|---------|-------------|
| **Mycelium Graph** | D3 force-directed knowledge graph — organic, animated, bioluminescent |
| **AI Chat** | n8n-powered bot with Steiner-based reasoning and [[wikilink]] responses |
| **Gap Analysis** | InfraNodus live integration — finds knowledge gaps per user |
| **Freiheitsprofil** | Rudolf Steiner 7-dimension freedom profile radar per user |
| **3 Roles** | Client (`/lebergott`), Admin/Marcel (`/admin`), Staff (`/staff`) |
| **PWA** | iPhone Safari-optimized, installable, offline-capable |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite + D3.js |
| **Backend** | FastAPI + SQLAlchemy + SQLite (PostgreSQL-ready) |
| **Chat** | n8n webhook + Claude fallback |
| **Knowledge** | InfraNodus MCP (6 Lebergott graphs) |
| **Auth** | JWT tokens (HS256) |
| **Deploy Frontend** | Vercel |
| **Deploy Backend** | Railway |
| **Styling** | Custom CSS — Lebergott brand system |

---

## Quick Start

```bash
# Clone
git clone https://github.com/louischristianbaumann-hue/lebergott-knowledge-platform.git
cd lebergott-knowledge-platform

# Backend
cd backend
pip install -r requirements.txt
cp ../.env.example .env   # fill in your values
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev   # → http://localhost:5173
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET_KEY` | **Yes** | 32+ char random string — `python -c "import secrets; print(secrets.token_hex(32))"` |
| `INFRANODUS_API_KEY` | **Yes** | InfraNodus API key from [infranodus.com](https://infranodus.com) |
| `N8N_WEBHOOK_URL` | **Yes** | n8n webhook URL for the Lebergott Bot workflow |
| `N8N_AUTH_TOKEN` | **Yes** | Bearer token for n8n webhook auth |
| `DATABASE_URL` | No | Defaults to SQLite. Use `postgresql+asyncpg://` for production |
| `CORS_ORIGINS` | No | JSON array of allowed origins, e.g. `["https://your-app.vercel.app"]` |
| `DEBUG` | No | `true` / `false` (default: `false`) |

---

## Deploy

### Frontend → Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

```bash
# vercel.json is already configured
# Set env vars in Vercel dashboard:
# VITE_API_URL = https://your-railway-backend.up.railway.app
vercel --prod
```

### Backend → Railway

```bash
# railway.toml + Procfile are already configured
# Set env vars in Railway dashboard
railway up
```

Railway required env vars: `JWT_SECRET_KEY`, `INFRANODUS_API_KEY`, `N8N_WEBHOOK_URL`, `N8N_AUTH_TOKEN`

---

## Project Structure

```
├── backend/
│   ├── api/routes.py          # All API endpoints
│   ├── core/config.py         # Settings (pydantic-settings)
│   ├── models/                # SQLAlchemy models + Pydantic schemas
│   └── services/
│       ├── chat_service.py    # n8n + InfraNodus + demo fallback
│       ├── graph_service.py   # Knowledge graph operations
│       ├── infranodus_service.py  # InfraNodus REST API client
│       └── analysis_service.py    # Steiner 7-dimension analysis
├── frontend/
│   ├── src/
│   │   ├── components/        # MyceliumGraph, ChatPanel, GapPanel, ...
│   │   ├── pages/             # LebergottApp, MarcelDashboard, StaffView, ...
│   │   ├── hooks/             # useGraphData, useAnalysis
│   │   └── utils/api.js       # Fetch client with retry + backoff
│   └── public/                # PWA icons, manifest, service worker
├── data/
│   ├── lebergott_graph.json   # Seed knowledge graph
│   └── infranodus_cache.json  # Offline fallback for InfraNodus data
└── docs/ARCHITECTURE.md       # Deep dive into architecture decisions
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | JWT login |
| `POST` | `/api/chat` | AI chat (n8n → InfraNodus → demo) |
| `GET` | `/api/graphs/live` | All 6 InfraNodus graphs |
| `GET` | `/api/lebergott/gaps` | Live gap analysis |
| `GET` | `/api/lebergott/bridges` | Conceptual bridges |
| `GET` | `/api/analysis/{user_id}` | Steiner Freiheitsprofil |
| `GET` | `/api/health` | Health check |

Full API docs at `/docs` (Swagger) when backend is running.

---

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| `--lebergott-dark` | `#1a3a2a` | Primary dark green |
| `--lebergott-gold` | `#c5a55a` | Accent gold |
| `--lebergott-cream` | `#faf9f5` | Background cream |
| `--font-display` | Playfair Display | Headings |
| `--font-body` | DM Sans | Body text |

---

## Knowledge Framework

The platform is built on Rudolf Steiner's philosophy of freedom — specifically the **7 Dimensions of Freedom** from *Die Philosophie der Freiheit* (1894):

1. Sinnliche Wahrnehmung (Sensory Perception)
2. Begriffliches Denken (Conceptual Thinking)
3. Moralische Intuition (Moral Intuition)
4. Willensfreiheit (Freedom of Will)
5. Denkfreiheit (Freedom of Thought)
6. Liebeshandlung (Action from Love)
7. Ganzheitserleben (Holistic Experience)

Each user gets a personalized **Freiheitsprofil** radar chart based on their onboarding answers and chat interactions.

---

## License

Private — Lebergott GmbH. All rights reserved.

---

*Built with [Claude Code](https://claude.ai/code) · Powered by [InfraNodus](https://infranodus.com) · Deployed on [Vercel](https://vercel.com) + [Railway](https://railway.app)*
