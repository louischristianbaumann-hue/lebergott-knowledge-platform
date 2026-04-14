# Nightshift Report — 2026-04-14

## monitor_deployment — DONE (local verified, deploy pending)

| Step | Status | Notes |
|------|--------|-------|
| GitHub Actions runs | ❌ 0 runs | deploy.yml never reached remote (workflow scope) |
| Backend local test | ✅ | All endpoints verified at http://127.0.0.1:8765 |
| All 3 logins | ✅ | marcel / mitarbeiter / demo — all working |
| Chat bot (n8n) | ✅ | Responds in ~9.5s via n8n webhook |
| Graph endpoint | ✅ | 44 nodes, 302 links |
| Gaps endpoint | ✅ | 10 cached + 18 InfraNodus gaps |
| Bridges endpoint | ✅ | 8 bridges |
| Credential alignment | ✅ | Fixed: seed + frontend fallback now use mitarbeiter@/demo@ |
| Telegram sent | ✅ | Message ID 340 — credentials + status sent |
| Code on GitHub | ✅ | commit 40ad6ae pushed |

## Login Credentials (Production)

| Role | Email | Password |
|------|-------|----------|
| Admin | `marcel@lebergott.de` | `lebergott2024` |
| Staff | `mitarbeiter@lebergott.de` | `lebergott2024` |
| Client | `demo@lebergott.de` | `lebergott2024` |

## BLOCKER: Deploy to Railway + Vercel

**Root cause**: GitHub token lacks `workflow` scope. Prevents CI/CD pipeline push.
Railway CLI + Vercel CLI both require interactive browser auth (not available headless).

**One-time fix (Louis runs once in terminal)**:
```bash
gh auth refresh -h github.com -s workflow
git push origin main
```
This will trigger GitHub Actions → Railway (backend) + Vercel (frontend) auto-deploy.

## What's Working Locally

```
Backend:  http://127.0.0.1:8765/api/v1
Frontend: http://localhost:5173 (dev) or frontend/dist (production build)
```

All endpoints verified:
- `/api/v1/health` → `{"status":"ok"}`
- `/api/v1/auth/login` + `/api/v1/auth/me` → JWT + role
- `/api/v1/graph/{vault_id}` → 44 nodes, 302 links
- `/api/v1/lebergott/gaps` → 10 gaps
- `/api/v1/lebergott/bridges` → 8 bridges
- `/api/v1/infranodus/gaps` → 18 gaps
- `/api/v1/chat` → n8n responds in ~9.5s with real knowledge

## Git History (remote main at 40ad6ae)

| Commit | Description |
|--------|-------------|
| `40ad6ae` | fix: align user credentials (mitarbeiter@/demo@) |
| `31c02ff` | fix: frontend bugs — BASE_URL, wikilinks, CSS |
| `d07f495` | fix: CORS env parsing, seed isolation, cache keys |
| `8c7af79` | fix: normalize cached gap/bridge data |
| `b1bc2ef` | feat: organic bezier graph with breathing nodes |

Note: deploy.yml exists locally at `.github/workflows/deploy.yml` — will push once workflow scope granted.
