# Lebergott Knowledge Platform — Staff Access

## Login-Daten

| Rolle | Email | Passwort | Zugang |
|-------|-------|----------|--------|
| **Admin** (Marcel) | `marcel@lebergott.de` | `Lebergott2026!` | `/admin` Dashboard |
| **Mitarbeiter** | `mitarbeiter@lebergott.de` | `Staff2026!` | `/staff` View |
| **Demo-Klient** | `demo@lebergott.de` | `Demo2026!` | `/lebergott` App |

---

## URLs

| Service | Lokal | Produktion (nach Deploy) |
|---------|-------|--------------------------|
| **Frontend** | `http://localhost:5173` | `https://lebergott-knowledge-platform.vercel.app` |
| **Backend API** | `http://127.0.0.1:8000/api/v1` | `https://lebergott-knowledge-platform-production.up.railway.app/api/v1` |
| **API Docs** | `http://127.0.0.1:8000/docs` | `.../docs` |
| **Health Check** | `http://127.0.0.1:8000/api/v1/health` | `.../api/v1/health` |

---

## Anleitung: App starten (lokal)

### Backend starten
```bash
cd /Users/lautlos/Obsidian/go\ to/local/AI\ OS/7_PROJECTS/SYNODEA-NEXT
uvicorn backend.main:app --reload --port 8000
```

### Frontend starten
```bash
cd frontend
npm run dev
```

Dann im Browser: `http://localhost:5173`

---

## MCP Config für Claude Desktop

Mitarbeiter können den Lebergott Bot direkt in Claude Desktop einbinden.

### Setup-Schritte

1. Claude Desktop öffnen → Einstellungen → Entwickler → Konfiguration bearbeiten
2. Datei öffnen: `~/Library/Application Support/Claude/claude_desktop_config.json`
3. Folgenden Block unter `"mcpServers"` einfügen:

```json
{
  "mcpServers": {
    "lebergott-backend": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://127.0.0.1:8000/api/v1"
      ]
    }
  }
}
```

4. Backend lokal starten (siehe oben)
5. Claude Desktop neu starten

**Vollständige Konfiguration:** `docs/staff_mcp_config.json` (copy-paste-ready JSON)

---

## Chat Bot — Direkt nutzen

Der Lebergott Bot läuft über n8n und antwortet auf Wissensfragen aus der Lebergott Knowledge Base.

**Via API (curl-Beispiel):**
```bash
# 1. Login — Token holen
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"mitarbeiter@lebergott.de","password":"Staff2026!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 2. Frage stellen
curl -X POST http://127.0.0.1:8000/api/v1/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question":"Was sind die Kernprinzipien von Lebergott?","vault_id":"lebergott"}'
```

**Via n8n Webhook (direkt):**
```bash
curl -X POST https://n8n-production-6fe9.up.railway.app/webhook/lebergott-bot \
  -H "X-Auth-Token: <N8N_AUTH_TOKEN from Railway env>" \
  -H "Content-Type: application/json" \
  -d '{"question":"Was sind die Kernprinzipien von Lebergott?"}'
```

---

## Knowledge Graph

**Graph-Daten abrufen:**
```bash
curl http://127.0.0.1:8000/api/v1/graph/lebergott
# → 44 Nodes, 302 Links (Bezier-Kurven, pulsierend)
```

**Gaps (Wissenslücken):**
```bash
curl http://127.0.0.1:8000/api/v1/lebergott/gaps
curl http://127.0.0.1:8000/api/v1/infranodus/gaps  # Live InfraNodus
```

**Bridges (Verbindungen):**
```bash
curl http://127.0.0.1:8000/api/v1/lebergott/bridges
```

---

## Deploy — Einmalige Aktion (Louis, einmalig)

Um die App live auf Railway + Vercel zu deployen, einmalig im Terminal:

```bash
gh auth refresh -h github.com -s workflow
git push origin main
```

→ GitHub Actions triggert automatisch Railway (Backend) + Vercel (Frontend) Deploy.

---

## Technischer Stack

| Layer | Technologie |
|-------|------------|
| Frontend | React 18 + Vite + D3.js |
| Backend | FastAPI + SQLAlchemy + SQLite |
| Auth | JWT (7 Tage) + bcrypt |
| Chat | n8n Webhook → Claude → InfraNodus |
| Graph | D3-Force + Bezier-Kurven (Myzel-Optik) |
| Deploy | Vercel (Frontend) + Railway (Backend) |
| CI/CD | GitHub Actions (`.github/workflows/deploy.yml`) |

---

## Sicherheitshinweise

- Passwörter für Produktion in `.env` ändern (`JWT_SECRET_KEY`)
- API Keys nicht in Git committen (`.env` ist in `.gitignore`)
- `staff_mcp_config.json` enthält n8n Auth Token — intern halten
