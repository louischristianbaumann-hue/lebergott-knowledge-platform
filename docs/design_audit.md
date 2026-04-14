# Design Audit — Lebergott App
_Generated: 2026-04-14 | Target: InfraNodus / Juggle Plugin Aesthetic_

---

## Current State — Color Palette

### Two competing color systems (problem):

| System | Tokens | Usage |
|--------|--------|-------|
| **Bioluminescent dark** | `#0a0f0a` bg, `#00ff88` green, `#00ddcc` teal, `#ff9944` amber | Dashboard, LandingPage, Layout |
| **Lebergott brand** | `#1a3a2a` forest, `#c5a55a` gold, `#faf9f5` cream | LebergottApp, LoginPage |

**Root problem:** The app has two visual identities fighting each other. `LebergottApp.jsx` uses gold/cream. `Dashboard.jsx` and `LandingPage.jsx` use dark bioluminescent green. Neither is InfraNodus-level quality.

---

## Current State — What's Over-Designed

### LebergottApp.jsx
- Triple-layered background: `leafBg` gradient + radial green overlay + radial gold halos
- StatPill components with gold borders in header (decorative, not data-driven)
- FloatingPanel uses `rgba(250,249,245,0.97)` — CREAM panels over dark forest bg = jarring
- Bottom nav pill with gold border, cream background — feels like an iOS app widget, not a knowledge tool
- `brand.leafBg: linear-gradient(135deg, #1a3a2a 0%, #0f2418 40%, #1a3028 100%)` — forced nature
- Multiple radial gradient overlays stacked (3 layers total)

### LoginPage.jsx
- Decorative floating leaf SVG animation (`lb-leaf-float`)
- Gold gradient top accent line on card
- bgHalo1 + bgHalo2 = two decorative radial glow effects
- Cream card on dark forest background — dramatic but not functional
- Playfair Display for headline — too editorial

### global.css
- `lb-typing-dot` uses gold (#c5a55a) — chatbot feel vs tool feel
- `.lb-btn-gold` — dedicated gold button class with gold shadows
- Gold wikilinks with gold borders
- Score ring with green glow box-shadow
- Multiple animation keyframes: `lb-leaf-float`, `lb-pulse-gold`, `lb-dot-bounce`, `lb-card-enter`

### mycelium.css
- `nutrientFlow` animation on links — over-metaphorical
- `sporeSpread` loading animation — nature metaphor forced into UI
- `gapFlicker` animation on gap nodes — noisy
- Radial gradient background in `.mycelium-wrapper::before`

### LandingPage.jsx
- Hero vignette: `radial-gradient(ellipse 60% 60% at 50% 50%, transparent 0%, rgba(10,15,10,0.7) 100%)` — decorative fog
- `glow-text` with `text-shadow: 0 0 20px var(--accent-glow-strong)` — Matrix-style
- Feature cards with `drop-shadow(0 0 6px rgba(${accent}, 0.6))` on icons
- Demo CTA card with `linear-gradient(135deg, rgba(0,255,136,0.06)...)` background

---

## Current State — Typography

| Element | Current Font | Problem |
|---------|-------------|---------|
| Headlines | Playfair Display (serif) | Decorative, editorial — not a tool |
| Logo text | Playfair Display | Same |
| Body | DM Sans | Fine |
| Data/badges | DM Sans / JetBrains Mono | Monospace for badges = over-engineered |

**Fix:** Single font family. Inter or DM Sans everywhere. No Playfair Display. No serif.

---

## Current State — Component Structure

```
Layout (sidebar nav + main + right panel)
├── nav: 56px icon strip, green glow logo
├── sidebar: VaultFileList (220px)
├── main: MyceliumGraph (flex 1)
└── right: 320px panel (Chat/Gaps/Bridges tabs)

LebergottApp (fullscreen, no Layout)
├── header: fixed top bar (logo + stat pills)
├── graph: absolute, full screen
├── node detail: fixed centered card
├── bottom nav: floating pill (Chat/Gaps/Bridges)
└── panels: FloatingPanel bottom/left/right
```

---

## Target Aesthetic — InfraNodus Reference

Source: infranodus.io visual language

| Property | Value | Notes |
|----------|-------|-------|
| **Background** | `#0d0d0d` | Near-black, not green |
| **Surface panels** | `rgba(15,15,15,0.95)` with `rgba(255,255,255,0.06)` border | Semi-transparent dark |
| **Text primary** | `rgba(255,255,255,0.9)` | Clean white |
| **Text secondary** | `rgba(255,255,255,0.5)` | Muted white |
| **Text muted** | `rgba(255,255,255,0.3)` | Very dim |
| **Node colors** | Multi-color by cluster | Purple, blue, orange, teal, pink — bright on dark |
| **Edge color** | `rgba(255,255,255,0.1)` to 0.15 | Barely visible threads |
| **Font** | Inter / -apple-system / DM Sans | Single sans-serif, NO Playfair |
| **Font sizes** | 11-13px for data labels | Dense but readable |
| **Panel borders** | `rgba(255,255,255,0.08)` | Whisper-thin |
| **Accent** | Data-driven (cluster colors) | No single "gold" accent |
| **Animations** | Subtle node pulse only | No flow animations, no nature metaphors |
| **Layout** | Graph full viewport + right sidebar | Panels are tools, not decorations |

### InfraNodus Node Color System (cluster-based):
```
Cluster 0: #8b5cf6 (violet)
Cluster 1: #3b82f6 (blue)
Cluster 2: #f97316 (orange)
Cluster 3: #10b981 (emerald)
Cluster 4: #ec4899 (pink)
Cluster 5: #f59e0b (amber)
Cluster 6: #06b6d4 (cyan)
```
Hub nodes: larger radius + slight glow (same hue, brighter)
Gap nodes: desaturated, dimmer — visually "empty"

---

## Delta — What Must Change

### REMOVE (decorative, non-functional):
- [ ] All Playfair Display font usage
- [ ] Gold accent color (#c5a55a) as primary brand color
- [ ] Cream/forest color system for panels
- [ ] Decorative floating leaf SVG
- [ ] Gold top accent line on login card
- [ ] bgHalo1 / bgHalo2 radial decorative glows
- [ ] `nutrientFlow` link animation
- [ ] `sporeSpread` loading animation → replace with simple spinner or dot
- [ ] `gapFlicker` animation → subtle opacity only
- [ ] `leafBg` gradient → solid near-black
- [ ] Cream FloatingPanel backgrounds → dark semi-transparent
- [ ] StatPill gold borders in header

### CHANGE (redesign to InfraNodus aesthetic):
- [ ] Background: `#1a3a2a` / `#0a0f0a` → `#0d0d0d`
- [ ] Panel bg: cream/forest → `rgba(13,13,13,0.96)` with `rgba(255,255,255,0.06)` border
- [ ] Node colors: single green → cluster-based multi-color palette
- [ ] Edge color: `#00cc6a` → `rgba(255,255,255,0.12)`
- [ ] Login card: cream on dark → dark card on dark (`#141414` on `#0d0d0d`)
- [ ] Bottom nav: gold-bordered pill → dark minimal bar
- [ ] Chat input: gold focus ring → blue/accent focus ring
- [ ] Loading: spore spread → simple 3-dot or ring

### KEEP (already correct):
- [x] Layout structure (nav strip + graph + right panel)
- [x] D3.js force simulation
- [x] Breathing animation concept (just tone it down)
- [x] Node detail overlay pattern
- [x] Wikilink concept in chat
- [x] DM Sans for body text (keep, also add Inter as primary)
- [x] Tab system (Chat/Gaps/Bridges)
- [x] Mobile PWA safe-area handling

---

## New CSS Token System

```css
:root {
  /* Backgrounds — all near-black */
  --bg-base:    #0d0d0d;
  --bg-surface: #141414;
  --bg-panel:   rgba(15, 15, 15, 0.97);
  --bg-hover:   rgba(255, 255, 255, 0.04);

  /* Text */
  --text-1: rgba(255, 255, 255, 0.92);
  --text-2: rgba(255, 255, 255, 0.55);
  --text-3: rgba(255, 255, 255, 0.30);

  /* Borders */
  --border-1: rgba(255, 255, 255, 0.08);
  --border-2: rgba(255, 255, 255, 0.12);
  --border-3: rgba(255, 255, 255, 0.20);

  /* Node cluster colors */
  --node-0: #8b5cf6;
  --node-1: #3b82f6;
  --node-2: #f97316;
  --node-3: #10b981;
  --node-4: #ec4899;
  --node-5: #f59e0b;
  --node-6: #06b6d4;

  /* Functional accents */
  --accent-gap:    #f97316;  /* orange for gaps */
  --accent-bridge: #06b6d4;  /* cyan for bridges */
  --accent-active: #8b5cf6;  /* purple for selected */

  /* Typography — single family */
  --font: -apple-system, 'Inter', 'DM Sans', BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

---

## Files to Redesign (Priority Order)

| Priority | File | What changes |
|----------|------|-------------|
| 1 | `global.css` | New token system, remove gold/cream/Playfair |
| 2 | `mycelium.css` | Dark node system, remove nature animations |
| 3 | `LebergottApp.jsx` | Dark panels, new header, new bottom nav |
| 4 | `LoginPage.jsx` | Dark card, no decorative elements |
| 5 | `LandingPage.jsx` | Remove forced nature aesthetics |
| 6 | `ChatPanel.jsx` | Dark input, neutral accent |
| 7 | `GapPanel.jsx` / `BridgePanel.jsx` | Use new token colors |

---

_Next task: Execute redesign starting with global.css + mycelium.css_
