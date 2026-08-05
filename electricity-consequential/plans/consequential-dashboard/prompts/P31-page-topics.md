# P31 — Topic deep-dive pages ×4 (Wave 3, Lane F)

**Model:** claude-opus-5 · **Runs in parallel with:** P30, P32–P34, P41 · **Needs:**
P11 + P22 (themes/quotes appear once P21 lands and the exporter reran — build against
`themes.json`/`quotes.json` whatever they currently contain; empty is a legal state)
**Lane:** `wave3/p31-topics` (worktree; commit only — the manager merges and pushes)

## Task

Build the four `electricity-consequential/frontend/topics/*.html` pages via ONE
config-driven renderer. Read PLAN.md §4 "topics/*" spec (standard panels + per-page
extras), §3.2–3.5 (expected numbers), §5 (which JSON feeds which panel), §2 gotchas
5–8.

## Architecture

- `frontend/js/topic-page.js` (new): reads a `TOPIC_CONFIG` global set by each page;
  renders the standard panels: (1) the topic's stance/matrix/scoreboard charts
  (`ECStance`/`ECMatrix`, full-size, with `ECSegments` toggles); (2) themes panel —
  horizontal bars from `themes.json` for the topic's rationale questions, showing raw
  and dedup-adjusted counts (label the difference), n per question; (3) quotes
  for/against/context via `ECQuotes` (attribution links to org profiles for named
  respondents; template badges); (4) response-base footnote listing every question's n.
  Panels degrade gracefully (hidden with an HTML comment) when their JSON is empty —
  report it, do not edit the exporter.
- Each page: copy of `templates/page-template.html` (paths get `../` prefixes — the
  NAV_BASE convention handles nav) + `<script>TOPIC_CONFIG = {...}</script>`.
- Configs from PLAN §4: **formula** (Q19+Q20 themes; Q21 with paired Q22/Q23 theme
  panels — near-even split, show both sides' reasoning with equal weight; Q24/Q25 —
  the settled call; Q18 benefits/challenges overview); **additionality** (full 9×3
  `ECMatrix` heatmap sorted by net requiredness with cell popovers; required-vs-
  feasible dumbbell from matrix.json feasibility incl. the "none feasible" 10;
  Q31+Q32, Q33+Q34, Q27/29/30 themes); **emission-rates** (OM scoreboard Q35/36 +
  BM scoreboard Q38/39 full-size with per-option popovers; Q37/40 themes; Q43/Q45
  granularity strips with segments + Q44/46 themes; Q41/42 themes); **weighting**
  (Q47/49 scoreboard with specials prominent — Unsure 15/21, "None appropriate" 9,
  "All feasible" 16; Q48/50/51 themes; Q52 evidence pointer panel → integrity page).
- Cross-links: every chart links back to decisions.html with the question preselected;
  quote attributions link to respondents.html org profiles.

## Guardrails

Touch ONLY `electricity-consequential/frontend/topics/` (new dir) and
`electricity-consequential/frontend/js/topic-page.js` (new). Asset paths from
`topics/` are `../styles/...`, `../js/...`, `../data/...`. No shared-file edits; no
nav edits. Design-system law applies in full.

## Acceptance

PLAN.md §9. All 4 pages render served, zero console errors, fixtures + real data;
spot-check on-page numbers (Q19 ≈63% No; regulatory +48 / first-of-kind −43;
SCED-locational 48/12; average emission rate 17/38; Unsure/None shares visible on
weighting). Screenshots of formula + additionality (1440/390). Commit in your
worktree. No push, no PR. Report config/JSON mismatches for the manager.
