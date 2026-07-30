# P31 — Proposal deep-dive pages ×9 (Wave 3)

**Model:** claude-opus-5 · **Runs in parallel with:** P30, P32–P34 · **Needs:** P11 + P22
(quotes appear once P21 has merged and the exporter reran — build against `quotes.json`
whatever it currently contains; empty is a legal state)
**Branch:** `claude/mbm-p31-proposals`

## Task

Build the nine `frontend/proposals/*.html` pages via ONE config-driven renderer. Read
PLAN.md §4 "proposals/*" spec (the 7 standard panels + page-specific extras), §3.1/3.8/3.9
(expected numbers), §5 (which JSON feeds which panel), §2 gotchas 4–9.

## Architecture

- `frontend/js/proposal-page.js` (new): reads a `PROPOSAL_CONFIG` global set by each
  page; renders the standard panels into placeholder sections. Panels: stance
  (S2Viz.renderDivergingBar + segment toggle + redaction split), reasons for/against
  (S2Viz.renderOptionBars, sorted, % of answered, n badges), cost/burden (with the
  "3 = same as today" annotation — never the support color ramp), design-preference
  selects, quotes for/against (S2Quotes), evidence-basis panel (where configured),
  base-size footnote listing every question's n.
- Each page: copy of `templates/page-template.html` (paths get `../` prefixes — the
  template already models this) + `<script>PROPOSAL_CONFIG = {...}</script>`.
- Configs (lever keys, question lists, extras) — from PLAN §4 page tree:
  hourly-matching (Q71–82, 76; evidence: none direct — link to evidence page),
  deliverability (Q83–96 + Q69/88–91 boundary chooser extra), sss (Q97–112),
  residual-mix (Q113–123 incl. readiness panel Q118/120/121 + Q122 basis),
  fossil-fallback (Q124–129 + global-equity Q129 quotes), exemptions (Q70, 153–170 +
  Q130–133 feasibility panel + threshold/eligibility/duration/conformance subsections +
  Q158 coded evidence), legacy-clause (Q171–180 incl. Q176 date + Q179 impact),
  package-impacts (Q20/22 definition feedback + Q134–138 usefulness ordinals + Q139–141
  procurement + Q142–145 IFRS + Q146–151 impact metric), transition (Q181–183 with year
  histogram + protest-answer flag for >2050).
- Cross-links: stance panel links to heatmap.html with the question preselected; quote
  attributions link to respondents.html org profiles.

## Guardrails

Touch ONLY `frontend/proposals/` (new dir), `frontend/js/proposal-page.js` (new).
Asset paths from `proposals/` are `../styles/...`, `../js/...`, `../data/...` — the
page-template's `../` convention. Design system law applies. No nav edits.

## Acceptance

PLAN.md §9. All 9 pages render served, zero console errors, real data; spot-check
against PLAN §3.1 numbers on-page (Q71 70.2% oppose; Q171 90.0% support; 50 GWh 67.1%).
Playwright screenshots of hourly-matching, exemptions, package-impacts (1440/390).
Commit + push. No PR. Report any config/JSON mismatches for the manager.
