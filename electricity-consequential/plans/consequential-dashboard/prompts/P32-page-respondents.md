# P32 — Respondents page + org browser (Wave 3, Lane F)

**Model:** claude-opus-5 · **Runs in parallel with:** P30, P31, P33, P34, P41 ·
**Needs:** P11 + P22 merged
**Lane:** `wave3/p32-respondents` (worktree; commit only — the manager merges and pushes)

## Task

Build `electricity-consequential/frontend/respondents.html` — who responded, how far
they got, and the named-org browser. Read PLAN.md §4 "respondents.html" spec, §3.1/§3.6
(expected numbers), §5 (`respondents.json`, `orgs/{id}.json`), §2 gotchas 4, 8, 15.

## Panels

1. Org type × redaction stacked bars (13 types; the top-5 segment grouping is only for
   toggles — this chart shows all types).
2. Country bar with the US-majority callout (104/185 raw; use exported analytical
   numbers) + responding-as and inventory-profile small multiples.
3. Sector top-N bar.
4. **Attrition funnel** — 185 → 165 (Q18) → 133 (Q19) → … → 36 (Q52) from
   `respondents.json.attrition`; annotate what each drop means for reading the site
   (the evidence question ran at a fifth of the entry audience).
5. Engagement distribution (bands of substantive columns answered; median 19/43).
6. **Named-org browser** — `ECOrgTable` over `org_index` (105 rows): name, org type,
   audited class, country, n answered, cites?, template?, family, and the
   **stance-fingerprint chips** (Q19/Q21/Q24/Q31/Q33 answer letters, polarity-colored,
   `–` where unanswered). Search, sort, filter by org type/audited class. Row expand →
   org profile from `orgs/{id}.json`: profile header, flags, every answer in survey
   order (free text collapsed with expanders).
7. Named-vs-redacted comparison — the `redaction_effect` SCELL pairs per stance
   question as paired strips; caption states the direction (redacted lean further No
   on Q19, flip on Q21, coarse on Q45) without overclaiming at these n.

## Guardrails

Touch ONLY `electricity-consequential/frontend/respondents.html` and
`electricity-consequential/frontend/js/respondents-page.js` (new). No shared-file
edits (flag gaps for P42); no nav edits. Excluded respondents never appear on this
page (they are integrity.html material); redacted respondents appear only as
aggregates. Design-system law applies in full.

## Acceptance

PLAN.md §9. Served, zero console errors, fixtures + real data; browser search/sort/
expand all work; org profile loads lazily; every chart has its `.sr-only` table.
Screenshots 1440/390 (browser expanded state included). Commit in your worktree. No
push, no PR.
