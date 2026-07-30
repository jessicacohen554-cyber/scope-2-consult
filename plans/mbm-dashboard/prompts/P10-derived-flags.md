# P10 — Derived respondent flags & text mining (Wave 1, Lane D)

**Model:** claude-opus-5 · **Runs in parallel with:** P11 · **Blocks:** P20, P21, P22
**Branch:** `claude/mbm-p10-derived-flags` (branch off the branch carrying this plan, or
`main` if the plan has merged)

## Task

Build `scripts/analytics/derive_flags.py` producing the derived respondent-level tables
that power the coordination, citation and evidence analyses. Read
`plans/mbm-dashboard/PLAN.md` §2 (gotchas), §3.5–3.7 (expected findings — your outputs
must reproduce these numbers), §6 (spec) first, then the root `README.md`.

Input: `data/scope2_consultation.sqlite` only (stdlib `sqlite3`; no pandas, no sqlite3
CLI in this environment; columns are TEXT-typed — cast with `+0`).

## Outputs (all deterministic, sorted keys/rows, rerunnable)

1. `data/derived/respondent_flags.csv` — one row per respondent (all 1,072):
   `respondent_id, is_template_response, n_shared_texts, entity_group, bloc,
   vector_cluster_id, mbm_anchor_vector, has_citation, n_citation_answers,
   n_urls, domains, evidence_empirical, evidence_operational, evidence_general_only,
   readiness_basis`
   - `mbm_anchor_vector`: 7 chars for Q71,83,97,113,124,153,171 (`-` where unanswered),
     e.g. `55455-4`.
   - `evidence_*` from Q138 selections (`response_selections`, `is_canonical=1`);
     `readiness_basis` from Q122 answer text.
2. `data/derived/text_clusters.csv` — one row per shared normalized string (≥200 chars,
   shared by ≥3 respondents): `cluster_hash, n_respondents, n_named, n_redacted, chars,
   question_numbers, preview_240, has_citation, member_ids`
   - Normalization: lowercase → collapse all whitespace runs to single space → strip →
     sha1. Expect ~285 clusters covering ~154 respondents.
3. `data/derived/vector_clusters.csv` — groups of respondents sharing byte-identical
   scale-answer vectors of length ≥10 (vector = sorted (question_number, answer_numeric)
   pairs over ALL scale questions both answered — build per-respondent full vectors, then
   group identical (length ≥10) exact tuples): `cluster_id, n_respondents, vector_length,
   member_ids, named_members`. Expect ~18 groups incl. a 6-member length-20 group
   (Avary family) and a 6-member length-17 group (SEMI).
4. `data/derived/citations.csv` — one row per free-text answer with ≥1 citation signal:
   `respondent_id, question_number, signals` (pipe-joined from: `url`, `doi`,
   `etal`, `peer_review`, `pdf`, `preprint`, `journal`, `paren_year`).
5. `data/derived/domains.csv` — `domain, n_answers, n_respondents, class` using a
   curated DOMAIN_CLASS map in the script (classes: `peer_reviewed` (sciencedirect,
   nature.com, cell.com, pnas, doi.org, springer, wiley, tandfonline, iopscience,
   ssrn+arxiv+zenodo as `preprint` subclass — keep them `peer_reviewed_or_preprint`),
   `advocacy` (energytag.org, cebuyers.org, zerogrid.org, resource-solutions.org,
   theclimategroup.org, matched.energy, scopetrue.org, wattime/atttime), `government`
   (.gov, federalregister, neso.energy, iea.org, nrel.gov, lbnl.gov), `standard_setter`
   (ghgprotocol.org), `shortener` (tinyurl, bit.ly), `other`). Unmapped domains → `other`.

Plus **blocs** (hardcode the definitions as data in the script, then *verify* membership
programmatically): `pro_hourly` = exact anchor vector `5545544` on (71,83,97,113,124,
153,171) — expect 22 members; `semi`, `avary`, `luxshare`, `eiga_siga`, `greece`,
`korea`, `fepc_tepco` from vector/text clusters + entity names. Entity families
(`entity_group`): Luxshare (9), Avary/FPC (5), Engie (3), EDF (2), Rio Tinto (2),
Deloitte (2), Edinburgh (2), MIT (2), Action Speaks Louder (2) — name-pattern map from
PLAN §3.6.

6. `scripts/analytics/test_derive_flags.py` — assertions runnable with plain
   `python3 scripts/analytics/test_derive_flags.py`: template respondents ≈154 (assert
   140–170), pro_hourly bloc == 22, ≥17 vector clusters, citations respondents 190–215,
   all 1,072 respondents present, determinism (run twice, byte-identical).

## Guardrails

- Touch ONLY `scripts/analytics/` and `data/derived/`. Never modify `data/*.csv`,
  the sqlite file, `scripts/build_dataset.py`, `scripts/survey_meta.py`, or `frontend/`.
- `python3 scripts/validate_dataset.py` must pass (27/27 as of this writing).
- Free-text source: view `v_free_text` (or `responses` joined to `questions
  where question_type='free_text'`).
- Redacted respondents: never emit their (empty) names; `entity_group`/bloc membership
  may include them by id only.

## Acceptance

PLAN.md §9 checklist. Also paste into your final report: template count, bloc sizes,
citation-respondent count, and 3 sample rows of each CSV. Commit + push
`claude/mbm-p10-derived-flags`. No PR.
