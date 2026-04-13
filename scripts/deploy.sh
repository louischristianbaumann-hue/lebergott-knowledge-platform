#!/bin/bash
# ============================================================
# Lebergott Knowledge Platform — One-Command Deploy Script
# Run from project root: bash scripts/deploy.sh
# ============================================================
set -e

echo "🌿 Lebergott Deploy — $(date)"
echo "=================================================="

RAILWAY_URL="${RAILWAY_URL:-}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ── Step 1: Railway Backend ────────────────────────────────
echo ""
echo "📦 Step 1: Backend → Railway"
echo "--------------------------------------------------"

if ! command -v railway &> /dev/null; then
    echo "  Installing Railway CLI..."
    npm install -g @railway/cli
fi

if [ -z "$RAILWAY_TOKEN" ]; then
    echo "  Logging in to Railway (browser will open)..."
    railway login
fi

echo "  Deploying backend..."
cd "$PROJECT_ROOT"
railway up --detach

# Get Railway URL
RAILWAY_URL=$(railway domain 2>/dev/null || echo "")
if [ -z "$RAILWAY_URL" ]; then
    echo "  → Railway URL not found. Get it from: railway.app/dashboard"
    echo "  → Set RAILWAY_URL=https://your-app.up.railway.app and re-run"
else
    echo "  → Backend live at: https://$RAILWAY_URL"
fi

# ── Step 2: Vercel Frontend ────────────────────────────────
echo ""
echo "🚀 Step 2: Frontend → Vercel"
echo "--------------------------------------------------"

if ! command -v vercel &> /dev/null; then
    echo "  Installing Vercel CLI..."
    npm install -g vercel
fi

cd "$PROJECT_ROOT/frontend"

# Build with Railway URL
if [ -n "$RAILWAY_URL" ]; then
    echo "  Building with VITE_API_URL=https://$RAILWAY_URL"
    VITE_API_URL="https://$RAILWAY_URL" npm run build
else
    echo "  Building (set RAILWAY_URL env var for production API URL)"
    npm run build
fi

# Deploy to Vercel
echo "  Deploying to Vercel..."
VERCEL_URL=$(vercel --prod --yes 2>&1 | grep "https://" | tail -1 | awk '{print $NF}')

if [ -n "$VERCEL_URL" ]; then
    echo "  → Frontend live at: $VERCEL_URL"

    # Set VITE_API_URL in Vercel env
    if [ -n "$RAILWAY_URL" ]; then
        echo "  Setting VITE_API_URL in Vercel..."
        vercel env add VITE_API_URL production <<< "https://$RAILWAY_URL"
    fi
else
    echo "  → Deploy complete. Get URL from: vercel.com/dashboard"
fi

# ── Summary ───────────────────────────────────────────────
echo ""
echo "=================================================="
echo "✅ Deploy Complete"
echo ""
echo "  Backend:  ${RAILWAY_URL:+https://$RAILWAY_URL/api/v1/health}"
echo "  Frontend: ${VERCEL_URL:-check vercel.com/dashboard}"
echo ""
echo "Next steps:"
echo "  1. Open Vercel dashboard → add VITE_API_URL env var → Railway URL"
echo "  2. Open Railway dashboard → add env vars from .env.example"
echo "  3. Test login at your Vercel URL"
echo "=================================================="
