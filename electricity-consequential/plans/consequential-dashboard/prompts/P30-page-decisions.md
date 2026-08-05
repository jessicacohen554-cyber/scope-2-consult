# P30 — The Decision Board page (Wave 3, Lane F)

**Model:** claude-opus-5 · **Runs in parallel with:** P31–P34, P41 · **Needs:** P11 + P22
merged
**Lane:** `wave3/p30-decisions` (worktree; commit only — the manager merges and pushes)

## Task

Build `electricity-consequential/frontend/decisions.html` — the site's analytical
centerpiece: every closed decision point of the consultation in one visual grammar.
Read PLAN.md §4 "decisions.html" spec, §3.2–3.4 (the expected numbers), §2 gotchas
5–8 and 15, §5 (which JSON feeds which panel), §7; then skim `frontend/dev.html` to
see `ECStance`/`ECMatrix`/`ECSegments` in action.

## Panels

1. **Stance strips** — Q19, Q21, Q24, Q33, Q31 via `ECStance` strips; polarity colors
   (Q19's "No" is the critical stance); n chip per strip; one shared `ECSegments`
   toggle (org type / country / redaction / responding-as) re-rendering all five;
   click → popover with counts + full segment table + link to the topic page.
2. **Additionality mini-matrix** — 9 tests × R/O/N sorted by net requiredness
   (`ECMatrix` mini variant, sequential ramp), header chip "n = 99–108 per test",
   → `topics/additionality.html`.
3. **Methodology scoreboard roll-up** — om/bm/weighting families from
   `scoreboard.json` as paired diverging bars (appropriate right, not-appropriate
   left, own-base %s, both bases printed, specials listed beside — never netted),
   → `topics/emission-rates.html` / `topics/weighting.html`.
4. **Granularity ladders** — Q43 + Q45 ordered strips with the binned fine-vs-coarse
   annotation (44 vs 37 on Q45) and segment toggle participation.
5. **Attrition strip** — n per substantive question in survey order (165 → 36) via
   `ECStance.attrition`; caption states the base-size discipline (gotcha 8).

Spot-check on-page numbers against PLAN §3 analytical-base equivalents (P22's report
carries the table): Q19 ≈63% No; Q24 ≈79% annual; regulatory test net ≈+48; average
emission rate BM ≈17/38. Hero stat cards at top (respondents · questions · % No on
Q19 · redaction %) stamped from meta.json — no hardcoded numbers anywhere in the HTML.

## Guardrails

Touch ONLY `electricity-consequential/frontend/decisions.html` and
`electricity-consequential/frontend/js/decisions-page.js` (new). No edits to shared
JS/CSS — work around gaps locally and flag them for P42. No nav edits (P11 placed the
entry). Design-system law applies in full.

## Acceptance

PLAN.md §9. Served, zero console errors; both fixtures (`?fixtures=1`) and real data
render; all toggles work; every strip has its n chip and its `.sr-only` table.
Screenshots 1440/390. Commit in your worktree. No push, no PR. Report any JSON/renderer
mismatches for the manager.
