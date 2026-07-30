# P33 — Research & Evidence Integrity page (Wave 3)

**Model:** claude-opus-5 · **Runs in parallel with:** P30–P32, P34 · **Needs:** P11 + P22
**Branch:** `claude/mbm-p33-evidence`

## Task

Build `frontend/evidence.html` per PLAN.md §4 "evidence.html" spec from `evidence.json`
(+ `clusters.json` for template-citation panels). Read PLAN §3.7 first — the framing
constraint is that the survey never distinguishes peer-reviewed from grey literature, so
the page must be explicit about what each signal can and cannot show.

## Panels

1. Evidence-basis distributions: Q138 (MBM) with Q56 (LBM) comparator and Q122
   (registry readiness) — the 7.4% / 3.9% / 2.3% empirical shares as stat cards.
2. Basis × stance: Q138 selections crossed with Q71 stance buckets — **P35-corrected
   framing (verified against the db):** self-reported basis is stance-NEUTRAL (empirical
   7.6% oppose vs 8.0% support; supporters weakly HIGHER on operational experience 29.3%
   vs 21.6%); the stance separation lives in citation behavior only (34.3% vs 14.7%).
   Say this plainly — do not imply supporters claim more empirical grounding. Use the
   `base` {oppose:250, neutral:26, support:75} and `no_anchor_score:14` fields now in
   evidence.json basis panels for honest rates; multi-select caveat visible.
3. Citation rates: by org type (registries 62% → Financial 4%), by redaction (~2×), by
   Q71 stance bucket.
4. Linked-domain table: classified peer-reviewed/preprint · advocacy · government ·
   standard-setter · shortener · other, with counts; insight: advocacy domains outnumber
   peer-reviewed hosts in aggregate; 62 tinyurl links are unverifiable.
5. Template-propagated citations: the citation-bearing text clusters (n_respondents,
   preview) — "how many independent-looking citations are copies"; recompute a headline
   ("respondents citing X") with and without dedup.
6. "Who did the homework": respondents flagged evidence_empirical / operational and how
   they lean on the anchors.
7. Notable evidence stories from `evidence.json` `stories` (coordination admission,
   TWG-member citation, self-citation, both-sides citation) as quote cards — verbatim,
   attributed per the redaction rules.
8. Q158 coded-evidence panel (from P21's coding, exposed via evidence.json or a small
   dedicated fetch): what actually backs the exemption case.

Every panel carries its base (n) and a one-line "what this can't tell you" footnote.

## Guardrails

Touch ONLY `frontend/evidence.html` + `frontend/js/evidence-page.js` (new). Design
system law. No nav edits. If `evidence.json` lacks a field you need, degrade the panel
gracefully (hidden with an HTML comment) and report it — do not edit the exporter.

## Acceptance

PLAN.md §9. Served, zero console errors, real data matches PLAN §3.7 numbers.
Screenshots 1440/390. Commit + push. No PR.
