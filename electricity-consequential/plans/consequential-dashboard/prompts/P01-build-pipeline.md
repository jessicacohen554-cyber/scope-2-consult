# P01 — Build pipeline + structural validation (Wave 0, Lane D)

**Model:** claude-opus-5 · **Runs in parallel with:** P11 · **Blocks:** P02, P10, P20, P21, P22
**Lane:** `wave0/p01-build-pipeline` (worktree; commit only — the manager merges and pushes)

## Task

Port the Scope 2 mechanical reshape to the electricity consultation export. Read
`electricity-consequential/plans/consequential-dashboard/PLAN.md` §2 (gotchas 1–3, 9–12
especially), §3 (the numbers your build must reproduce), §6 "P01" spec first; then read
root `scripts/build_dataset.py` and `scripts/survey_meta.py` end to end — they are the
porting source, and their mechanical/editorial separation is preserved here.

Input: `electricity-consequential/Electricity-Sector-ConsequentialMethodsPublicConsultationFeedback-RawData-2026.07.29.xlsx`
(sheet `Raw Data`, A1:BE186; col A = `ID`). `pip install openpyxl` first.

## Deliverables

1. `electricity-consequential/scripts/build_dataset.py` — stages mirror upstream:
   norm_text (port verbatim) → load grid → pass-1 shape detection → labels join →
   pass-2 typing → parent/anchor → pass-3 option catalogue → pass-4 long/selections →
   respondents → codebook → wide → writers. Deltas (PLAN §6): header parser per gotcha
   10 (`Q018`…`Q052`, `Q026_1`…`Q026_9`, display "Q26.1"; tolerate the "26.6 Posititve
   list" malformed header); PROFILE Q3–Q17 with the Scope 2 redaction attribution
   (Redacted / Not provided — no nulls); role rules from THIS survey's boilerplate
   ("Please explain your answer to question N" → comment + parent N; "If you answered
   yes/no to question N" → comment + parent + condition; "If you selected 'Other'" →
   other_specify); the 7 multi-select cols (AG, AN, AO, AQ, AR, AZ, BB) split on ";"
   with whitespace-normalized option matching (labels carry trailing spaces — gotcha 9);
   matrix cols W–AE typed `matrix_rating`, ladder required=3/optional=2/not_required=1
   → `answer_rank`; Q43/Q45 `ordinal_select` coarse→fine ladders; binaries/3-way
   `single_select`; specials (gotcha 6) `is_special=1`, rank NULL; refs clamp 3..52.
2. `electricity-consequential/scripts/survey_meta.py` — the editorial module seeded with:
   SECTIONS (survey-order groups), MATRIX ladder, ordered-select ladders, SPECIAL_OPTIONS,
   POLARITY stub, NOTES stub, closed vocabularies (topics per PLAN §6 P02; categories
   minimal — P02 finalizes) and a ported `load_labels()` gatekeeper.
3. `electricity-consequential/reference/question_labels.csv` **stub** — one row per
   question, mechanical shorthands (`q19_formula_stance` style), `topic=tbd` legal at
   this stage only; P02 replaces every row. Build fails loudly on missing/duplicate rows.
4. `data/`: `questions.csv`, `question_options.csv`, `respondents.csv` (all 185; with
   `is_redacted`, `is_excluded`=0 placeholder, `exclusion_reason` empty, engagement
   metrics), `responses_long.csv`, `response_selections.csv`, `responses_wide.csv`,
   `electricity_consequential.sqlite` (5 tables + indexes + views: `v_stance_answers`,
   `v_stance_summary`, `v_selections`, `v_free_text`, `v_option_counts`,
   `v_answer_types`, `v_question_tree`, `v_stance_by_redaction`, `v_redaction_profile`),
   `manifest.json`.
5. `electricity-consequential/scripts/validate_dataset.py` — structural checks ported
   (round-trip: every non-empty source cell appears exactly once in responses_long,
   values verbatim; selection-explosion conservation; sqlite==csv; labels coverage;
   parent/anchor integrity; shorthand hygiene) + frozen figures for THIS dataset
   (respondents 185; questions 44; non-empty answer cells 5,074; free-text answers
   1,377; exploded selections from the 7 multi-selects ≈1,277 — freeze your computed
   value; redacted 77; truncated/cap-length answers 18; views non-empty). Print
   `N/N checks passed`, exit non-zero on failure.

Verify against PLAN §3 before finishing: Q19 84/49 · Q21 57/53 · Q24 81/22 · Q31
40/32/29 · Q33 43/35 · Q43 22/20/20/15/3 · Q45 31/30/14/6 · matrix row counts §3.3 ·
scoreboard tallies §3.4. Any mismatch: investigate, don't paper over; if the plan is
wrong, flag it loudly in your report.

## Guardrails

- Touch ONLY `electricity-consequential/scripts/`, `electricity-consequential/data/`,
  `electricity-consequential/reference/question_labels.csv`. Never anything at the repo
  root; never `frontend/`.
- The raw xlsx is read-only. Deterministic build: identical bytes on rerun.
- Editorial judgment (section names, ladder semantics, notes) goes in `survey_meta.py`
  or the labels CSV, never inline in build code — the upstream separation is deliberate.

## Acceptance

PLAN.md §9 (items 1, 6, 7). Also paste into your report: the validator tally, the
manifest counts, 3 sample rows each of `questions.csv` / `responses_long.csv` /
`response_selections.csv`, and the exact frozen figures you locked. Commit in your
worktree. No push, no PR.
