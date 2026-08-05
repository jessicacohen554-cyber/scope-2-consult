# Design System — Electricity-Sector Consequential Methods Consultation Hub

**This document is law.** Every page in `electricity-consequential/frontend/` MUST use
the centralized design system described here. Never write new inline CSS for any
component that already has a shared class.

**Provenance.** Copied from the repo-root Scope 2 hub (`frontend/DESIGN_SYSTEM.md`),
which is itself lifted verbatim from the `hourly-cfe-optimizer` dashboard
(jessicacohen554-cyber/hourly-cfe-optimizer, `dashboard/` — its `docs/DESIGN_SYSTEM.md`
is the upstream source). Two corrections were applied on copy, both fixing places where
the root doc had drifted from what its own pages actually ship: the required `<head>`
include list now names `styles/site.css` and the site JS modules, and the architecture
table below lists the site-specific component layer. All three sites share one visual
identity: same fonts, same palettes, same animated header banner, same cinematic
circuit-board background, same glassmorphism. When in doubt, match the upstream
dashboard pixel for pixel.

## Architecture

| File | Role |
|------|------|
| `styles/shared.css` | Single source of truth for ALL visual styles — variables, nav, banner, typography, cards, glass panels, grids, buttons, tables, footer, responsive rules. Copied verbatim from upstream. **Do not fork its values.** |
| `styles/article.css` | Long-form/scrollytelling page styles (story sections, fade-ins). Copied verbatim. |
| `styles/cinematic.css` | Fixed parallax background layer + z-index layering + dark section insets. Copied verbatim. |
| `js/nav.js` | Injects the sticky dark top nav. **Only `NAV_ITEMS` and `NAV_BRAND` are site-specific** — everything else stays identical to upstream. |
| `js/shared-header.js` | Injects the animated banner overlay into every `.header`. Default variant is `freq-circuit-gradient` (animated canvas: frequency bars + circuit traces on a near-white gradient). Verbatim copy. |
| `js/canvas-banners.js` | Canvas banner variant implementations, lazy-loaded by `shared-header.js`. Verbatim copy. |
| `js/cinematic-bg.js` | Injects the fixed circuit-board background (`assets/cinematic-bg.png`) and drives the GSAP scroll pan/zoom. Only the image path is site-specific. |
| `js/scroll-observer.js` | IntersectionObserver fade-in for `.scroll-reveal`, `.story-section`, etc. Verbatim copy. |
| `js/shared-footer.js` | Injects the standard footer + 4-color bottom banner. **Only `FOOTER_LINKS` and `DEFAULT_NOTE` are site-specific.** |
| `assets/cinematic-bg.png` | The circuit-board background image (upstream `134ECF38-…png`, renamed). |

Site-specific component layer (this hub only — **not** upstream files, and not shared
with the Scope 2 hub even where the code is a rename of its equivalent):

| File | Role |
|------|------|
| `styles/site.css` | Every new component this hub introduces, all `.ec-` prefixed: stance strips, the stringency matrix, the scoreboard, the attrition strip, theme bars, quote cards, the org browser, the popover, loader error panels, and the `.sr-only` utility. Tokens only — no hex, no font-family literals. |
| `js/data-loader.js` | `ECData` — fetches the `data/*.json` contract files, or `data/fixtures/*.json` under `?fixtures=1`. |
| `js/segments.js` | `ECSegments` — the four-dimension segment vocabulary from `meta.json`, `.toggle-btn-group` controls, and URL-backed view state. |
| `js/stance-viz.js` | `ECStance` — stance strips, the paired diverging scoreboard, the attrition strip, `srTable`. |
| `js/matrix-viz.js` | `ECMatrix` — the 9×3 additionality stringency heatmap, its mini variant, and the required-vs-feasible cross. |
| `js/quote-cards.js` | `ECQuotes` — curated quote cards with theme chips and template badges. |
| `js/org-table.js` | `ECOrgTable` — the named-organization browser with stance-fingerprint chips. |
| `dev.html` | Component harness rendering every one of the above from fixtures. Linked from nowhere; the smoke test every later wave runs. |

## Required `<head>` Includes (Every Page)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles/shared.css">
<link rel="stylesheet" href="styles/article.css">
<link rel="stylesheet" href="styles/cinematic.css">
<link rel="stylesheet" href="styles/site.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script><!-- pinned Chart.js; plain script, never defer — chart-colors.js sets Chart defaults on DOMContentLoaded -->
<script src="js/nav.js"></script>
<script src="js/chart-colors.js"></script>
<script src="js/shared-header.js"></script>
<script src="js/scroll-observer.js"></script>
<script src="js/shared-footer.js"></script>
<script src="js/data-loader.js"></script>
<script src="js/segments.js"></script>
<script src="js/stance-viz.js"></script>
<script src="js/matrix-viz.js"></script>
<script src="js/quote-cards.js"></script>
<script src="js/org-table.js"></script>
```

Pages under `topics/` prefix every one of those local paths with `../`. A page that
uses none of a given site module may omit it, but `site.css` is never optional.

And immediately before `</body>`:

```html
<script src="js/cinematic-bg.js"></script>
```

Use `templates/page-template.html` as the starting point for every new page — copy it,
change the `<title>`, `<h1>`, subtitle, and content sections, nothing else.

## Standard Page Header (Every Page)

```html
<header class="header" id="pageHeader">
    <h1>Page Title Here</h1>
    <div class="subtitle">One-line page description</div>
    <div class="header-accent"></div>
</header>
```

The animated banner overlay is auto-injected by `shared-header.js`. The default
(no `data-header-variant` attribute) is the **`freq-circuit-gradient`** canvas
banner — light theme, animated frequency bars over circuit traces — which is what
the upstream site uses everywhere. Dark variants (`dense-circuit-navy`,
`frequency-spectrum`, `stacked-curves-dark`, …) are available via
`data-header-variant`, but stay on the default unless there is a strong reason.
**Never create custom header gradients or banner styles.**

`.header-accent` is the mandatory 4-px navy→blue→green→amber→red gradient bar at
the banner's bottom edge. Never omit it.

## Typography

Fonts load from Google Fonts; never hardcode `font-family` — use the variables:

| Variable | Stack | Use |
|----------|-------|-----|
| `--font-heading` | Plus Jakarta Sans → DM Sans | Headings, nav, buttons |
| `--font-heading-banner` | Plus Jakarta Sans | Banner `<h1>` (weight 800, −0.8px tracking) |
| `--font-body` | DM Sans → Plus Jakarta Sans | Body copy (line-height 1.75) |
| `--font-data` | Plus Jakarta Sans | Stat values, numerals |
| `--font-mono` | DM Sans | Tags/labels (project convention; not an actual mono face) |

Base font size is 18px (18.5px ≥1200px, 19px ≥1600px). Banner `h1` is 3.2rem/800.
Section titles are 1.5rem/700 in `--navy`.

## Color Palette (NEVER Hardcode — Use the Variables)

Core brand:

| Token | Hex | Role |
|-------|-----|------|
| `--navy` | `#1A2744` | Headings, primary brand |
| `--navy-dark` | `#0F1A2E` | Banner gradient start, footer |
| `--navy-mid` | `#1E3A5F` | Banner gradient end |
| `--bg-page` | `#F8F9FC` | Page background (also cinematic fallback) |
| `--accent-cyan` | `#38bdf8` | Nav active state, links on dark |
| `--text-primary` / `--text-secondary` / `--text-muted` | `#000` / `#1E293B` / `#566370` | Text hierarchy (muted is WCAG-fixed) |

Semantic/accent colors, the full resource palette (`--solar #F59E0B`, `--wind #22C55E`,
`--hydro #0EA5E9`, `--nuclear #6366F1`, `--ldes #E91E63`, …) and ISO palette
(`--iso-caiso`…`--iso-spp`) are all defined in `styles/shared.css` and mirrored for
Chart.js in `js/chart-colors.js` (`RESOURCE_COLORS`, `ISO_COLORS`, `SEMANTIC_COLORS`).
Each has `-t` (55% fill), `-bg` (8% tint), and WCAG-safe `-text` variants. In this
repo, use them as the categorical chart palette; in styles, reference the variable,
never the hex.

Accent bar / bottom banner gradient (the brand signature):
`navy → --hydro → --wind → --solar → --red`, left to right.

## Layered Page Anatomy (bottom to top)

1. **`#bgCamera` / `#bgImage`** — fixed, full-viewport circuit-board PNG
   (`assets/cinematic-bg.png`), 160vw × 160vh with overscan, panned/zoomed by GSAP
   ScrollTrigger through seeded keyframes (`js/cinematic-bg.js`). Respects
   `prefers-reduced-motion` (static) and degrades gracefully without GSAP.
2. **Transparent wrappers** — `.content-wrap` / `.main-content` stay transparent so
   the background shows between sections (`cinematic.css` handles z-index).
3. **Content surfaces** — solid `.card` / `.chart-panel` for dense readable content;
   frosted `.glass-chart-panel` / `.insight-glass` where the background should glow
   through; dark `.section-dark` insets for emphasis chapters.
4. **Banner** — `.header` with the animated canvas overlay and `.header-accent`.
5. **Nav** — sticky `#topNav` (`#1a1a2e`, z-index 1000).

## Glassmorphism Spec

Only these two frosted components exist. Do not invent new glass recipes.

- **`.glass-chart-panel`** — `rgba(255,255,255,0.75)` fill, 1px `rgba(255,255,255,0.6)`
  border, `backdrop-filter: blur(16px)`, radius `--radius-xl`,
  shadow `0 8px 32px -8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)`.
  Add `.flush` inside grids (grid gap handles spacing).
- **`.insight-glass`** — `rgba(255,255,255,0.85)` fill, `blur(12px)`, 3px colored left
  border (default hydro blue; `.insight-glass-indigo/-cyan/-red/-green` variants).

Text-dense panels stay **solid** (`.card`, `.chart-panel`) — readability beats effect.

## Standard Component Classes (Use Instead of Custom CSS)

| Component | Class |
|-----------|-------|
| White card | `.card` (+ `.card-spacious`) |
| Chart panel (solid) | `.chart-panel` |
| Glass chart panel | `.glass-chart-panel` (+ `.flush`) |
| Glass insight callout | `.insight-glass` (+ color variants) |
| Accent-bordered card | `.card-accent` + `.card-accent-indigo/-cyan/-green/-red` |
| Insight callout (solid) | `.insight-box` (+ `.insight-warn/-danger/-success`) |
| Dark emphasis callout | `.emphasis-callout` + `.emphasis-big/.emphasis-desc/.emphasis-sub` — **max 1–2 per page** |
| Stat card | `.stat-card` + `.stat-value` + `.stat-label`; hero row: `.hero-stats-row` |
| Section container | `.content-section` (1440px) / `.content-section-narrow` (1080px) / `.content-section-wide` (1600px) |
| Section heading | `.section-title` + `.section-subtitle` |
| Grids | `.grid-2col` / `.grid-3col` / `.grid-auto` / `.grid-stats` |
| Chart containers | `.chart-container` (320px) / `-sm` (240) / `-lg` (400) / `-xl` (480) |
| Toggle group | `.toggle-btn-group` + `button.active` |
| Pill button | `.btn-pill` |
| Data table | `.data-table` |
| Legend | `.legend` + `.legend-item` + `.legend-dot` |
| Dark section inset | `.section-dark` (navy gradient, rounded, inset margins) |
| Footer | `<footer id="siteFooter">` → injected `.page-footer` + `.bottom-banner` |

New in this hub (`styles/site.css`, rendered by the `EC*` modules — never hand-write
their markup):

| Component | Class | Renderer |
|-----------|-------|----------|
| Control row / toggle wrapper | `.ec-controls` + `.ec-control` | `ECSegments` |
| Stance strip (100% stacked) | `.ec-strip*` | `ECStance.renderStrips` |
| Paired diverging scoreboard | `.ec-score*` | `ECStance.renderScoreboard` |
| Attrition strip | `.ec-attrition*` | `ECStance.renderAttrition` |
| Stringency matrix + mini | `.ec-matrix*` | `ECMatrix.renderHeatmap` / `renderMini` |
| Theme bars | `.ec-theme*` | `ECStance.renderThemes` |
| Quote card | `.ec-quote*` | `ECQuotes.render` |
| Org browser | `.ec-org*`, `.ec-table*` | `ECOrgTable.render` |
| Cell popover | `.ec-popover*` | shared by `ECStance` / `ECMatrix` |
| Tag / chip | `.ec-tag` + variants | all of them |
| Loader failure panel | `.ec-error*` | `ECData.errorPanel` |

## Motion Rules

- **Scroll reveals**: add `.scroll-reveal` (or `.scroll-reveal-slow`) to any element
  that should fade in + slide up on entering the viewport; `js/scroll-observer.js`
  adds `.visible` at 15% visibility. No bespoke reveal code.
- **Cinematic background**: GSAP ScrollTrigger scrub 1.8, seven keyframes seeded by
  page path so each page pans differently. Never re-tune per page.
- **Banner animation**: owned entirely by `shared-header.js`/`canvas-banners.js`.
- **Hovers**: cards lift `translateY(-2px…-4px)` with soft shadow growth, 0.3s ease.
- Everything must respect `prefers-reduced-motion: reduce`.

## Rules for New Pages or Features (The Law)

1. **NEVER write inline `<style>` blocks for components that exist in shared.css.**
   Page-specific styles are ONLY for layouts/elements unique to that page.
2. **NEVER hardcode `font-family`** — use `var(--font-heading)`, `var(--font-body)`,
   `var(--font-data)`, `var(--font-mono)`.
3. **NEVER hardcode hex colors** — use CSS variables in styles and
   `RESOURCE_COLORS.*` / `ISO_COLORS.*` / `SEMANTIC_COLORS.*` in Chart.js.
4. **NEVER create custom header/banner gradients** — use `.header` +
   `shared-header.js`.
5. **NEVER duplicate footer styles** — use the injected `.page-footer` +
   `.bottom-banner`.
6. **Use spacing variables** — `var(--space-xs)`…`var(--space-3xl)`, `var(--pad-page)`.
7. **Use shadow variables** — `var(--shadow-sm)`…`var(--shadow-xl)`.
8. **Use radius variables** — `var(--radius-sm)`…`var(--radius-pill)`.
9. **Body background** — `var(--bg-page)` or `var(--bg-page-white)`. Never hardcode.
10. **If a shared component is close but not quite right**, extend it with a modifier
    class in shared.css rather than creating a new component.
11. **Keep verbatim files verbatim.** `shared.css`, `article.css`, `cinematic.css`,
    `shared-header.js`, `canvas-banners.js`, `scroll-observer.js`, `chart-colors.js`
    and `cinematic-bg.js` are byte-identical copies of the repo-root hub's files — if
    one needs a change, consider whether the root hub and the upstream dashboard need
    the same change, and never let them drift silently. Site-specific edits live only
    in `nav.js` (`NAV_BASE`/`NAV_ITEMS`/`NAV_BRAND`), `shared-footer.js`
    (`FOOTER_BASE`/`FOOTER_LINKS`/`DEFAULT_NOTE`), `styles/site.css`, the `EC*`
    modules, and page HTML.
12. **Prefix every new component `.ec-`.** `site.css` owns them; nothing in it may
    restyle a `shared.css` class. If a shared component is close, add a modifier.
13. **Stringency is not sentiment.** The additionality matrix
    (required / optional / not_required) is an ordered stringency scale and must be
    painted with the sequential indigo ramp, never the green/red support ramp. Support
    colors are reserved for questions that carry a `polarity` block in `meta.json`.
    Special options ("Unsure", "None", "All are feasible", "N/A") are always neutral
    gray, are never netted, and are never folded into a support/oppose reading.
14. **Every percentage carries its n.** Response bases fall from 165 to 36 across this
    survey; a bare percentage is a misreading waiting to happen. Segment cells below
    five respondents arrive as the `{"n":"<5"}` sentinel and must be hatched, never
    printed and never drawn as zero.
