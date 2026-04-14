# Nightshift Report — 2026-04-14

## frontend_build_and_push — DONE (partial)

| Step | Status | Notes |
|------|--------|-------|
| `npm run build` | ✅ | 1.22s, 393kB JS / 21kB CSS / 2kB HTML |
| Commit t2+t5 fixes | ✅ | Commits `d07f495`, `31c02ff` pushed to `main` |
| Push to GitHub | ✅ | `louischristianbaumann-hue/lebergott-knowledge-platform` |
| GitHub Actions workflow | ⚠️ BLOCKED | Token lacks `workflow` scope — deploy.yml could not be pushed |
| GitHub Actions CI | ⏳ | No runs yet (workflow not on remote) |

## BLOCKER: GitHub Token Missing `workflow` Scope

**What**: `gh` token has scopes `gist, read:org, repo` but NOT `workflow`.
Pushing `.github/workflows/deploy.yml` requires the `workflow` scope.

**Fix needed (manual)**:
```bash
gh auth refresh -h github.com -s workflow
# Then re-push:
git push origin main
```

## What IS on GitHub (pushed successfully)

All frontend + backend fixes from nightshift tasks t2–t5:
- `fix: normalize cached gap/bridge data` (8c7af79)
- `feat: organic bezier graph with breathing nodes` (b1bc2ef → rebased)
- `fix: CORS env parsing, seed isolation, cache key mapping` (d07f495)
- `fix: frontend bugs — BASE_URL, wikilinks, missing CSS classes, badge colors` (31c02ff)

Code is production-ready on GitHub. Deploy can proceed once workflow scope is granted.
