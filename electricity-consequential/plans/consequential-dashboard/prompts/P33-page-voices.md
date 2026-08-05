# P33 — Voices & themes page (Wave 3, Lane F)

**Model:** claude-opus-5 · **Runs in parallel with:** P30–P32, P34, P41 · **Needs:**
P11 + P22 (themes/quotes may be empty until P21 lands + exporter rerun — empty is a
legal state; degrade gracefully and report)
**Lane:** `wave3/p33-voices` (worktree; commit only — the manager merges and pushes)

## Task

Build `electricity-consequential/frontend/voices.html` — the free-text record front
and center (1,377 answers; this survey's arguments live here, not in picklists). Read
PLAN.md §4 "voices.html" spec, §3.5, §5 (`themes.json`, `quotes.json`,
`integrity.json` for the template exhibit), §2 gotcha 15.

## Panels

1. **Theme taxonomy overview** — every theme with total mentions grouped by polarity
   (concern / support / design), raw vs dedup-adjusted bars side by side with a
   caption explaining the difference; per-topic drill (which themes dominate which
   topic).
2. **Filterable quote browser** — all curated quotes via `ECQuotes`; filters: topic ×
   side (for/against/context) × org type × redaction; theme chips on every card;
   template badges; attribution links to org profiles.
3. **The template exhibit** — the two response packs from `integrity.json`
   (`policy_insights_pack` 5 members, `bullet_pack` 4 members) rendered as document
   cards: shared-passage preview, member list (named members only; redacted as
   counts), which questions each pack covers, and a link to integrity.html's
   dedup-effect panel.
4. **Verbosity distribution** — free-text chars per respondent (log-scale bar or
   band chart), the NorthBridge Group tail labeled (75.7k chars), median annotated.
5. A short "how coding works" note card → methodology.html (closed taxonomy,
   multi-label, template propagation, coverage %).

## Guardrails

Touch ONLY `electricity-consequential/frontend/voices.html` and
`electricity-consequential/frontend/js/voices-page.js` (new). If `themes.json` or
`quotes.json` lacks something you need, degrade the panel gracefully (hidden with an
HTML comment) and report it — do not edit the exporter. No shared-file edits; no nav
edits. Junk/superseded respondents never appear. Design-system law applies in full.

## Acceptance

PLAN.md §9. Served, zero console errors, fixtures + real data; every filter
combination renders (or empty-states cleanly); template exhibit matches
integrity.json. Screenshots 1440/390. Commit in your worktree. No push, no PR.
