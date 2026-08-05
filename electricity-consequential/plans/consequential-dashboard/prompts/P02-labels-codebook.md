# P02 — Question labelling, survey_meta, README (Wave 1, Lane D)

**Model:** **claude-fable-5** (this prompt carries the vocabulary layer every downstream
query and page inherits — do not substitute a smaller model) · **Runs in parallel
with:** P10, P20, P21 · **Needs:** P01 merged · **Blocks:** P22
**Lane:** `wave1/p02-labels` (worktree; commit only — the manager merges and pushes)

## Task

Replace P01's stub codebook with the real editorial layer: hand-label all 44 questions,
finalize `survey_meta.py`, rebuild, harden validation, and write the dataset README.
Read PLAN.md §2, §3 (in full — the numbers contextualize every question), §6 "P02";
then the consultation PDF at
`electricity-consequential/reference/GHG-Protocol-...-Public-Consultation.pdf` (it
defines each question's intent and the `doc_section` axis); then root
`reference/question_labels.csv` + root `README.md` §"questions" for the register and
quality bar; then `HANDOFF-question-labelling.md` at the repo root for the craft notes
on shorthand design (why `question_text_short` truncation is useless, parallel-sibling
naming, the ambiguity-notes discipline).

## Deliverables

1. `electricity-consequential/reference/question_labels.csv` — 44 rows, columns:
   `question_id, question_number, shorthand, label, topic, doc_section, category,
   subcategory, asks_for, notes`.
   - `shorthand`: ≤40-char snake_case, globally unique, meaning-bearing and parallel
     across siblings (`addl_regulatory_req` … `addl_first_of_kind_req` for the matrix;
     `om_methods_appropriate`/`om_methods_inappropriate` mirroring
     `bm_methods_appropriate`/…; `spatial_granularity_max`/`temporal_granularity_max`).
   - `topic` (closed): profile / general / formula / additionality / emission_rates /
     weighting. `doc_section`: "5"–"9" with subsections where the PDF gives them
     ("6.1", "7.2", "8.1", "8.2", "9.1").
   - `category`/`subcategory`: a cross-cutting concern vocabulary you design FIRST
     (orthogonal to topic — e.g. quantification_design, additionality_design,
     feasibility_and_data, claims_and_rigor, regional_variation, evidence,
     resp_profile). Document the vocabulary in `survey_meta.py` before labelling rows.
   - `asks_for` (closed): stance / matrix_rating / feasibility_pick / method_pick /
     design_preference / rationale / elaboration / evidence / respondent_attribute /
     open_feedback.
   - `notes`: every wording defect and interpretive hazard — the Q26.6 "Posititve"
     typo/missing dot; Q28's option list restating the matrix tests; Q35/36 trailing-
     space labels; Q43/45 "maximum appropriate" framing (a ceiling, not a preference —
     answering "Nodal" does not mean demanding nodal); Q19's reference to PDF §6.1;
     conditional-parent chains (Q22/Q23 → Q21 yes/no branches); Q52's dual role
     (evidence for Q51's suggestion, and the survey's only evidence request).
2. `electricity-consequential/scripts/survey_meta.py` finalized: SECTIONS, MATRIX
   construct (`req_level`, stringency semantics documented), Q43/Q45 ladders with
   anchors ("1 = coarsest (Country)" / "5 = finest (Nodal)"), SPECIAL_OPTIONS,
   POLARITY map (Q19 critical="No"; Q21/Q24/Q31/Q33 documented judgments), NOTES,
   closed vocabularies, `load_labels()` policing everything (unique shorthands, vocab
   membership, no empty labels/notes-where-flagged).
3. Rebuild (`python3 electricity-consequential/scripts/build_dataset.py`) and extend
   `validate_dataset.py`: labels-complete check (44/44, no `tbd`), vocab checks,
   polarity coverage for stance questions, plus keep every P01 check green.
4. `electricity-consequential/README.md` — the dataset front door, in the root README's
   register: header stats line; pick-a-file table; per-table documentation including the
   codebook column semantics; **caveats section** (analytical base 181 and what is
   excluded; matrix is stringency not sentiment; specials never netted; own-base
   scoreboard netting; attrition 165→36 — divide by n_answered always; redaction 41.6%
   and its stance skew; template dedup; the 26.x id scheme; trailing-space
   normalization); 8–10 SQL/python recipes against the real schema; rebuild commands.

## Guardrails

- Touch ONLY `electricity-consequential/reference/question_labels.csv`,
  `electricity-consequential/scripts/survey_meta.py`,
  `electricity-consequential/scripts/validate_dataset.py`,
  `electricity-consequential/data/` (rebuild output), `electricity-consequential/README.md`.
- `question_id`/`question_number` are immutable join keys. Never touch
  `build_dataset.py`'s mechanical logic (if you find a build bug, flag it for the
  manager instead — P10/P20/P21 are running against P01's build concurrently).
- Read every question's FULL text (from `questions.csv` / the raw export) before
  labelling it. Design each vocabulary before using it; if labelling forces a vocabulary
  revision, revise everywhere, not just forward.

## Acceptance

PLAN.md §9 (items 1, 6, 7). Report: the final topic/category/asks_for vocabularies with
per-value counts, the 10 hardest labelling calls and how you resolved them, validator
tally after rebuild, and the README's caveat list. Commit in your worktree. No push,
no PR.
