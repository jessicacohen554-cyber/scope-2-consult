# P30 — Likert Explorer page (Wave 3)

**Model:** claude-opus-5 · **Runs in parallel with:** P31–P34 · **Needs:** P11 + P22 merged
**Branch:** `claude/mbm-p30-heatmap`

## Task

Build `frontend/heatmap.html` — the Likert Explorer — per PLAN.md §4 "heatmap.html" spec,
using the shared components from P11 (`S2Data`, `S2Segments`, `S2Viz`) and the real
`frontend/data/` JSON from P22. Read PLAN.md §2 (gotchas 4, 5, 9), §3.1–3.2 (the 22 rows
and their constructs), §4, §5, §7 first; then skim `frontend/dev.html` to see the
components in action.

## Requirements

- Page from `templates/page-template.html`; title "Likert Explorer"; subtitle names the
  oppose(1–2)/neutral(3)/support(4–5) grouping convention.
- Heatmap: rows = 22 MBM scale/ordinal questions **grouped by `scale_construct`** with
  direction badges; columns = selected segment's values. Toggles: segment dimension
  (Org type / Sector / Country / Redaction / Responding as / Audited class), metric
  (% support · % oppose · mean · net), "hide n<15 columns". Ordinal questions render in
  their own group with ladder tooltips, excluded from the % support/oppose metrics
  (grey "n/a" cells) — means only where ranks are meaningful; off-scale counts shown in
  the popover always.
- Cell click → distribution popover (1–5 bars + off-scale + n + link to proposal page).
- Below the heatmap: diverging stacked bar of the 7 anchors for the current segment
  selection (S2Viz.renderDivergingBar), and a redaction-split mini-panel (named vs
  redacted mean per anchor — the Q171 reversal must be visible).
- Insight callouts (max 2 `.insight-glass`): the "requirements vs escape hatches" shape;
  the burden scales' "3 = today" warning.
- URL state: segment + metric survive reload/share via S2Segments.
- Register nothing in nav (P11 already placed the entry; P42 finalizes).

## Guardrails

Touch ONLY `frontend/heatmap.html` and (if needed) `frontend/js/heatmap-page.js` (new).
No edits to shared JS/CSS — if a component gap exists, work around it locally in your
page file and flag it for P42. Design system rules apply in full.

## Acceptance

PLAN.md §9: serve, zero console errors, both fixtures and real data render; Playwright
screenshots (1440/390) of: default view, sector segment + mean metric, a popover open,
n<5 hatching visible (audited-class segment has small values). Commit + push. No PR.
