# P10 — Derived flags: junk, resubmission, templates, citations (Wave 1, Lane D)

**Model:** claude-opus-5 · **Runs in parallel with:** P02, P20, P21 · **Needs:** P01
merged · **Blocks:** P22 (and P20's adjudication cross-checks you)
**Lane:** `wave1/p10-derived-flags` (worktree; commit only — the manager merges and pushes)

## Task

Build `electricity-consequential/scripts/analytics/derive_flags.py` producing the
derived respondent-level tables for the integrity, coordination and evidence analyses.
Read PLAN.md §2 (gotchas 1–4), §3.5 (expected findings — **your outputs must reproduce
these**), §6 "P10" first; then root `scripts/analytics/derive_flags.py` — port its
machinery (normalize→sha1 clustering, citation regex battery, domain extraction +
classification, deterministic CSV writer, `--verify`), replace its content.

Input: `electricity-consequential/data/electricity_consequential.sqlite` only (stdlib
`sqlite3`, read-only URI; columns TEXT-typed — cast with `+0`). Works against P01's
build regardless of whether P02 has merged (key on question_number/qid, not shorthand).

## Outputs (all deterministic, sorted, rerunnable → byte-identical)

1. `data/derived/respondent_flags.csv` — one row per respondent (all 185):
   `respondent_id, is_junk_candidate, junk_evidence, is_resubmission_superseded,
   resubmission_of, entity_family, is_template_respondent, n_shared_texts,
   template_bloc, has_citation, n_citation_answers, n_urls, stance_fingerprint`.
   - Junk detection: ≥50% of the respondent's free-text answers are gibberish
     (<20 chars AND (consonant-heavy: vowel ratio <0.2 | single-repeated-character |
     keyboard-mash pattern)). **Expect exactly {11, 12, 14}** — ID 11 "fzbf" (12/15),
     ID 12 (redacted, 24/24 answers are "e"), ID 14 "asdf" (9/10). `junk_evidence` =
     up to 6 sample strings, pipe-joined.
   - Resubmission: two respondents share a normalized non-empty `name`; lower ID is
     superseded. **Expect exactly {100 → 151}** (Julia Heidrich Sagaz; answers differ —
     record which qids changed in your report).
   - Entity families: same normalized `organization`, different people. **Expect
     Engie Impact {135, 160}.** ("N/A" ×2 is not a family — guard against placeholder
     orgs: N/A, none, self, individual.)
   - `stance_fingerprint`: 5 chars for Q19/Q21/Q24/Q31/Q33 (first letter of answer,
     `-` unanswered), e.g. `NY A-`… define the encoding in the header comment.
2. `data/derived/text_clusters.csv` — normalized (lowercase, collapse whitespace,
   strip) ≥200-char strings shared by **≥2** respondents (pairs matter at n=185):
   `cluster_hash, n_respondents, n_named, n_redacted, chars, question_numbers,
   preview_240, has_citation, member_ids`. **Expect ≈38 clusters over ≈25
   respondents**, incl. the 5-member pack {43,45,60,79,82} and the 4-member
   bullet-pack {51,86,89,117} (≥6 shared texts). Bloc assignment (`template_bloc`):
   respondents sharing ≥3 clusters with the same partners; name the two packs
   `policy_insights_pack` and `bullet_pack` as data in the script.
3. `data/derived/citations.csv` — one row per free-text answer with ≥1 signal:
   `respondent_id, question_number, signals` (url, doi, etal, peer_review, pdf,
   preprint, journal, paren_year — port the battery).
4. `data/derived/domains.csv` — `domain, n_answers, n_respondents, class` with the
   ported DOMAIN_CLASS map extended for this record (marginalimpactmethod.*, Brazilian
   ONS/MCTI/SEEG sources, watttime, electricitymaps, gov suffixes). Unmapped → other.
5. `scripts/analytics/test_derive_flags.py` — frozen assertions: junk == {11,12,14};
   resubmission == {(100,151)}; Engie family == {135,160}; ≥35 text clusters; the two
   named blocs with exact memberships; all 185 respondents present; Q52 answer count
   36; determinism (run twice, byte-identical).

**You emit candidates; you do not exclude.** `respondents.csv`/the db stay untouched —
P20 adjudicates into `reference/exclusions.csv`, P22 enforces at export.

## Guardrails

- Touch ONLY `electricity-consequential/scripts/analytics/` and
  `electricity-consequential/data/derived/`. Never `data/*.csv`, the sqlite file,
  `build_dataset.py`, `survey_meta.py`, `reference/`, or `frontend/`.
- `python3 electricity-consequential/scripts/validate_dataset.py` must still pass.
- Redacted respondents: ids only, never names (ID 12 is redacted junk — evidence
  strings are its answers, which are "e", fine to show).

## Acceptance

PLAN.md §9 (items 1, 6, 7). Report: junk evidence per flagged id, the resubmission's
changed qids, cluster/bloc tallies, citation-respondent count, domain class table, and
3 sample rows per CSV. Commit in your worktree. No push, no PR.
