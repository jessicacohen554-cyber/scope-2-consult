# P35 — Visualization exploration stub (Wave 3.5, optional)

**Model:** claude-opus-5 · **Run:** any time after P22's real data exists; findings feed
P42 (and optionally reopen P30–P34 pages) · **Branch:** `claude/mbm-p35-viz-exploration`

## Status: STUB — deliberately underspecified

This prompt exists because several presentation decisions are better made against real
data than on paper. Explore, prototype on `frontend/dev.html` (or a `dev-viz.html`
copy), screenshot alternatives side by side, and write a short recommendation memo to
`plans/mbm-dashboard/notes/P35-viz-recommendations.md`. Do NOT ship page changes.

## Questions to explore (add your own)

1. **Evidence × stance**: is a grouped bar, a mosaic/mekko, or small multiples clearest
   for "supporters claim more empirical basis but n is small"? Multi-select overlap
   makes stacked shares misleading — find a form that doesn't lie.
2. **Coalition/bloc structure**: node-link network vs adjacency matrix vs simple bloc
   cards (current P34 answer). Is a network genuinely more informative than cards for
   8 blocs, or just prettier? Consider a shared-text bipartite view.
3. **Org profile stance display**: 7-dot strip vs mini-sparkline vs tiny heatmap row —
   what reads at table density in the org browser?
4. **The redaction story**: is there a single-figure form (slopegraph named→redacted per
   anchor?) stronger than the mini-heatmap chosen in P30/P32?
5. **Q183 protest answers**: histogram with a broken axis vs annotated outlier bin.
6. Anything in the shipped Wave 3 pages that real data revealed to be cramped,
   misleading, or dull — list concrete fixes with screenshots.

## Guardrails

Read-only with respect to shipped pages; prototypes live in dev pages + the memo. Design
system still applies to prototypes (they may graduate to production).

## Acceptance

The memo, with embedded/linked screenshots and a ranked recommendation per question +
effort estimate. Commit + push. No PR.
