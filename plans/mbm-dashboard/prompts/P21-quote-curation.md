# P21 — Quote curation per proposal (Wave 2, Lane D)

**Model:** claude-opus-5 · **Runs in parallel with:** P20, P22 · **Needs:** P10 merged
**Branch:** `claude/mbm-p21-quote-curation`

## Task

Curate representative verbatim quotations for and against each MBM proposal, producing
`reference/curated_quotes.json` (shape: PLAN.md §5 `quotes.json`). Also code the Q158
free-text evidence sample. Read PLAN.md §2, §3.5 (template clusters — your dedup guard),
§3.8, §4 (proposal pages) first.

## Levers to cover (keys = the `policy_lever` groupings used by the 9 proposal pages)

`qc4_hourly_matching` (comments Q73/75/82/76), `qc5_deliverability` (Q85/87/89/90/96),
`sss` (Q99/101/105/106/108/112), `resid_mix_def` (Q115/117/123 + readiness Q119),
`fossil_fallback_ef` (Q126/128/129), `hourly_exempt` (Q155/157/159/160/162/165/168/170),
`legacy_clause` (Q173/175/177/178/180), `mbm_package` (Q135/137/141/143/149/151 + Q20/22),
`transition` (Q182 + Q183 context).

## Method

1. For each lever × side (for/against): pull comment/elaboration answers joined to the
   respondent's stance on the lever's anchor (for = answered 4–5 or the reasons_for
   question; against = 1–2 or reasons_vs). Use `v_free_text` + `responses`.
2. Selection criteria, in order: (a) **substantive** — argues a mechanism, cites
   evidence, or gives a concrete operational detail; not boilerplate; (b) **diverse** —
   across org types, geographies, named + redacted; (c) **not template-duplicated** —
   check `data/derived/text_clusters.csv`; if a quote IS from a template cluster and
   worth including anyway (e.g. the bloc's canonical argument), include it ONCE with its
   `template_cluster` hash set; (d) quotable at ≤600 chars — take a clean verbatim
   substring, never paraphrase, mark elisions with `[…]`.
3. 4–6 quotes per lever per side (fewer where a side is thin, e.g. legacy-clause
   opposition n=133). Attribution: named → `"Org name — Org type, Country"`; redacted →
   `"Redacted — Org type, Country"`.
4. **Q158 evidence coding:** read all 297 answers; code each into
   `data/derived/q158_evidence_coding.csv` (`respondent_id, codes` pipe-joined from:
   `cites_study, cites_own_data, cost_argument, data_access_argument, feasibility_argument,
   sme_equity_argument, anecdote_only, no_evidence_assertion, other`). This feeds the
   evidence page's "what actually backs the exemption case" panel.

## Output

- `reference/curated_quotes.json` (PLAN §5 QUOTE shape; keys sorted; verbatim `text`
  must be a substring of the stored answer modulo `[…]` elisions).
- `data/derived/q158_evidence_coding.csv`.
- `scripts/analytics/test_quotes.py`: every quote's respondent_id exists; every non-elided
  text segment is a verbatim substring of that respondent's answer to that question;
  every lever key present; ≤600 chars; redacted quotes carry no name.

## Guardrails

- Touch ONLY the three files above.
- Never attribute a redacted respondent by name even if their text hints at identity.
- Balance discipline: you are curating BOTH sides' best arguments, not building a case.
  If a side's strongest material is template text, say so in the report rather than
  padding with weak singletons.

## Acceptance

PLAN.md §9. Run your test file. Commit + push `claude/mbm-p21-quote-curation`. No PR.
Report: quotes per lever/side, how many carry template badges, and Q158 code frequencies.
