#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# Lebergott Knowledge Platform — Railway Deploy Setup
# Run ONCE after: railway login
# Usage: bash scripts/setup-railway.sh
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "🚂 Lebergott → Railway Deploy"
echo "────────────────────────────"

# 1. Link project (creates new Railway project if not linked)
echo "→ Linking Railway project..."
railway init --name "lebergott-knowledge-platform" 2>/dev/null || railway link

# 2. Set environment variables
echo "→ Setting environment variables..."

JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")

railway variables set \
  JWT_SECRET_KEY="$JWT_SECRET" \
  N8N_WEBHOOK_URL="https://n8n-production-6fe9.up.railway.app/webhook/lebergott-bot" \
  ENVIRONMENT="production" \
  DEBUG="false"

echo "   JWT_SECRET_KEY: generated (${JWT_SECRET:0:8}...)"
echo "   N8N_WEBHOOK_URL: set"
echo "   ENVIRONMENT: production"

# Prompt for InfraNodus API key (required for live graphs)
if [ -n "${INFRANODUS_API_KEY:-}" ]; then
  railway variables set INFRANODUS_API_KEY="$INFRANODUS_API_KEY"
  echo "   INFRANODUS_API_KEY: set from env"
else
  echo "   ⚠️  INFRANODUS_API_KEY not set — live graphs will use cache"
  echo "      Run: railway variables set INFRANODUS_API_KEY=<your-key>"
fi

# 3. Deploy
echo "→ Deploying..."
railway up --detach

echo ""
echo "✅ Deploy started!"
echo "   Dashboard: https://railway.app/dashboard"
echo "   Logs:      railway logs"
echo "   URL:       railway open"
echo ""
echo "   Health check will be at: <RAILWAY_URL>/api/v1/health"
