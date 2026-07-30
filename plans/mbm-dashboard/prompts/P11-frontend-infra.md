# P11 — Frontend infrastructure & fixtures (Wave 1, Lane F)

**Model:** claude-sonnet-5 · **Runs in parallel with:** P10 · **Blocks:** all Wave 3 pages
**Branch:** `claude/mbm-p11-frontend-infra`

## Task

Build the shared frontend plumbing every dashboard page will use, developed against
hand-written fixture JSON so you never depend on the data lane. Read
`plans/mbm-dashboard/PLAN.md` §4 (architecture), §5 (data contract — you implement the
consumer side and author fixtures for every shape), §7 (infra spec) first, then
`frontend/DESIGN_SYSTEM.md` (it is law) and `frontend/README.md`.

## Deliverables

1. **Chart.js wiring.** Add pinned Chart.js
   (`https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js`) to
   `frontend/templates/page-template.html` and `frontend/index.html` head blocks,
   positioned after GSAP and **before** `js/chart-colors.js`'s DOMContentLoaded hook
   fires (plain `<script src>`, never defer). Add one line documenting it in
   `DESIGN_SYSTEM.md`'s required-includes block (the only edit allowed there).
2. **`frontend/js/data-loader.js`** — global `S2Data` with `load(name)` (cached fetch of
   `data/<name>.json`; `?fixtures=1` switches to `data/fixtures/`), `loadOrg(id)`, and a
   visible error panel helper for fetch failures (message advising
   `python3 -m http.server`).
3. **`frontend/js/segments.js`** — global `S2Segments`: builds `.toggle-btn-group`
   controls from `meta.json` segment vocabularies, persists state to `URLSearchParams`,
   dispatches `segmentchange` CustomEvents. Buttons are real `<button aria-pressed>`.
4. **`frontend/js/likert-viz.js`** — global `S2Viz`:
   - `renderHeatmap(el, {questions, cells, segment, metric})`: CSS-grid heatmap;
     rows grouped by `scale_construct` with direction badges; cell tint from design
     tokens via a construct-aware scale (support: red→neutral→green diverging using
     `--storage`/`--text-muted`/`--wind` tints and their `-text` variants for cell text;
     burden/cost: white→amber `--solar`/`--geothermal` "complaint" ramp — NEVER the
     support ramp); n<5 cells render hatched with no number; per-column base chips;
     click → popover with full distribution + off-scale count + page link; cells carry
     `role="gridcell"` and complete `aria-label`s.
   - `renderDivergingBar(canvas, rows, opts)`: Chart.js horizontal stacked bar, oppose
     (1–2) left / neutral (3) straddle / support (4–5) right, using
     `SEMANTIC_COLORS`/`RESOURCE_COLORS` from `chart-colors.js` and
     `buildLegendFromChart` for legends.
   - `renderOptionBars(canvas, options, opts)`: horizontal bars for reason picklists
     (% of answered, count labels).
5. **`frontend/js/quote-cards.js`** — `S2Quotes.render(el, quotes)`: quote cards
   (`.card` variants) with attribution line, template-cluster badge, org-profile link.
6. **`frontend/js/org-table.js`** — `S2OrgTable.render(el, rows, opts)`: vanilla
   sortable/filterable/searchable table over `respondents.json` `org_index`, with lazy
   `orgs/{id}.json` fetch on row expand.
7. **`frontend/styles/site.css`** — styles for the above new components ONLY, using
   design tokens exclusively (no hex, no font-family literals). Include a `.sr-only`
   utility. Never touch `shared.css`/`article.css`/`cinematic.css`.
8. **`frontend/data/fixtures/*.json`** — miniature hand-authored instances of EVERY
   contract shape in PLAN §5 (meta, likert, reasons, selects, evidence, respondents,
   clusters, audit, quotes + `orgs/900.json`): 2–3 questions, 3 segment values, 2 quotes
   each — enough to exercise every renderer path incl. n<5 hatching and off-scale counts.
9. **Nav + footer.** Replace `NAV_ITEMS` in `frontend/js/nav.js` with the PLAN §4
   structure (Overview / Dashboards dropdown / Proposals mega-menu 2 columns / About),
   pointing at the final filenames (pages don't exist yet — that's fine). Extend
   `isActive()` to match `proposals/` subpaths. Mirror top-level in
   `shared-footer.js` FOOTER_LINKS. These are the sanctioned site-specific files.
10. **`frontend/dev.html`** — a throwaway harness page (linked from nowhere) that renders
    every component from fixtures, used for your Playwright screenshots and later waves'
    smoke tests.

## Guardrails

- Touch ONLY: `frontend/js/{data-loader,segments,likert-viz,quote-cards,org-table}.js`
  (new), `frontend/styles/site.css` (new), `frontend/data/fixtures/` (new),
  `frontend/dev.html` (new), `frontend/js/nav.js` + `frontend/js/shared-footer.js`
  (sanctioned edits), `frontend/templates/page-template.html` + `frontend/index.html`
  (head includes + site.css link only), `frontend/DESIGN_SYSTEM.md` (one-line Chart.js
  amendment).
- Verbatim upstream files stay byte-identical: `shared.css`, `article.css`,
  `cinematic.css`, `shared-header.js`, `canvas-banners.js`, `scroll-observer.js`,
  `chart-colors.js`. Prove with `git diff --stat`.
- No frameworks, no bundler, no npm. Vanilla IIFE globals matching the existing style.
- All new UI honors `prefers-reduced-motion`; dynamic cards get `.scroll-reveal`
  (scroll-observer's MutationObserver picks them up automatically).

## Acceptance

PLAN.md §9. Specifically: `cd frontend && python3 -m http.server 8000`, open
`dev.html?fixtures=1` — every component renders, zero console errors; Playwright
screenshots at 1440px and 390px. Commit + push `claude/mbm-p11-frontend-infra`. No PR.
Report any contract shape you had to reinterpret — P22 must match your reading.
