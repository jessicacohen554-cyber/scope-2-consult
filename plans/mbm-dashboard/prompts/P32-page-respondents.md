# P32 — Who Responded page + org browser (Wave 3)

**Model:** claude-opus-5 · **Runs in parallel with:** P30, P31, P33, P34
**Needs:** P11 + P22 · **Branch:** `claude/mbm-p32-respondents`

## Task

Build `frontend/respondents.html` per PLAN.md §4 "respondents.html" spec, from
`respondents.json` + `orgs/{id}.json`. Read PLAN §3.3, §3.10, §5 first.

## Panels

1. Org type × redaction stacked bars (the 70% corporate vs 20–28% academic/NGO/vendor
   gradient is the story — annotate it).
2. Sector × redaction (top 12 + grouped) and country (top 10 + grouped) bars.
3. Individual vs organization; engagement-band distribution; "978 answered ≥1 anchor,
   342 all 7" base-size callout.
4. Redaction-effect mini-heatmap: named vs redacted mean per anchor (Q171 reversal
   visible) with a "headlines built on named responses skew supportive" insight-glass.
5. **Named-org browser** (S2OrgTable): 493 orgs, columns per contract (name ≤80 chars,
   claimed type, audited class, sector, country, answered, cites?, template?, 7-anchor
   mini-sparkline or colored dots). Search, sort, filter by org type / audited class /
   bloc. Row expand → org profile rendered from `orgs/{id}.json`: profile header, flags
   (template/bloc/entity-family badges), full MBM answer list with free text
   (collapsible per question, `likely_truncated` marker where flagged).
6. Footnote: `organization` is free text — placeholders and prose exist; redacted
   respondents are structurally different (link to methodology).

## Guardrails

Touch ONLY `frontend/respondents.html` + `frontend/js/respondents-page.js` (new, if
needed). Design system law. No nav edits. Redacted respondents never named.

## Acceptance

PLAN.md §9. Served page, zero console errors; org search for "Google" and "EnergyTag"
works; a profile expand renders free text. Screenshots 1440/390 (overview + one open
profile). Commit + push. No PR.
