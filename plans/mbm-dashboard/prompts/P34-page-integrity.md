# P34 — Legitimacy Audit & Coalitions page (Wave 3)

**Model:** claude-opus-5 · **Runs in parallel with:** P30–P33 · **Needs:** P11 + P22
(audit.json may be `"provisional": true` until P20 merges — render a provisional banner
in that case) · **Branch:** `claude/mbm-p34-integrity`

## Task

Build `frontend/integrity.html` per PLAN.md §4 "integrity.html" spec from `audit.json` +
`clusters.json` + `respondents.json`. Read PLAN §3.4–3.6 first. This page names names —
the tone rules below are load-bearing.

## Panels

1. **Claimed vs audited classification**: summary matrix (grouped bars or a compact
   claimed→audited table) + drill table of reclassified rows (org, claimed, audited,
   confidence, basis). Lead stat cards: "~27 of 66 named NGOs are business/trade
   bodies", "~10 of 34 named academics aren't academic institutions", "31 of 44
   academics responded as individuals".
2. **Coordinated blocs**: one card per bloc (pro_hourly, semi, avary, luxshare,
   eiga_siga, greece, korea, fepc_tepco): 7-anchor signature strip, member count
   (named listed, redacted as "+N redacted"), shared-text count, identical-vector
   length, and a neutral one-line description of the shared interest.
3. **Template prevalence**: 154 respondents / 285 shared strings; largest clusters
   table; Q71 oppose-share computed with and without template dedup (from
   clusters/likert data) — show the delta.
4. **The commercial fingerprint**: the data-vendor inverted pattern (support
   requirements 4.10, cool on escape hatches 3.56/3.81) opposite the corporate pattern —
   presented symmetrically: *both* patterns track commercial interest.
5. **Entity families**: Luxshare ×9, Avary ×5 etc. — "1,072 respondents ≠ 1,072
   independent entities".
6. **What this audit does not claim** (`.insight-box`, mandatory): redaction is
   permitted and unverifiable ≠ illegitimate; coordinated submissions are lawful
   consultation behavior on all sides; classification ≠ accusation; small-n caveats.

## Tone rules

Facts only, symmetric scrutiny, no motive language beyond what the data shows
("classified as X, legal form is Y"), no adjectives like "front group"/"astroturf",
redacted members never named or guessed. Every claim traceable to audit.json/clusters.json.

## Guardrails

Touch ONLY `frontend/integrity.html` + `frontend/js/integrity-page.js` (new). Design
system law. No nav edits.

## Acceptance

PLAN.md §9. Served, zero console errors; bloc cards match clusters.json; provisional
banner logic works (test by temporarily renaming audit.json — then restore).
Screenshots 1440/390. Commit + push. No PR.
