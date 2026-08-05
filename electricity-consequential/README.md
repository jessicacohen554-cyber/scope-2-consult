# GHG Protocol Electricity-Sector Consequential Methods consultation — processed feedback dataset

Reshapes the GHG Protocol's Electricity-Sector Consequential Methods public
consultation raw export into a tidy, queryable dataset with a hand-curated
question codebook, so that answers stay tied to their respondent while being
straightforward to aggregate and drill into.

**Source:** `Electricity-Sector-ConsequentialMethodsPublicConsultationFeedback-RawData-2026.07.29.xlsx`
(published 2026-07-29, single sheet `Raw Data`, 185 rows × 57 columns).
The original file is committed unmodified at this hub's root and is the only
data input; everything under `data/` is regenerated from it by
`scripts/build_dataset.py`. The companion consultation document — which defines
what each question is asking about — is
`reference/GHG-Protocol-Consequential-Electricity-Sector-Emissions-Impacts-Public-Consultation.pdf`.

**185 respondents · 56 question columns (43 substantive, including the 9-test
additionality matrix) · 5,074 answers · 1,277 multi-select selections · 1,377
substantive free-text answers totalling 1.24M characters**

---

## Pick a file

| Want to… | Use |
|---|---|
| Slice, group and join answers in SQL | `data/electricity_consequential.sqlite` |
| Tidy analysis in pandas / R / duckdb | `data/responses_long.csv` |
| One row per respondent, PivotTable-friendly | `data/responses_wide.csv` |
| Read what a question actually asks and how to score it | `data/questions.csv` |
| Option frequencies for a choice question | `data/question_options.csv` |
| Count who selected each option, per respondent | `data/response_selections.csv` |
| Respondent profiles and engagement metrics | `data/respondents.csv` |

`data/manifest.json` records the build's row counts and type/role/label
tallies. Outputs are CSVs and SQLite only; the CSVs open directly in Excel if
you need a spreadsheet view.

---

## Tables

### `questions` — the codebook (56 rows, one per question column)

The interpretation layer, and the place to start. The survey numbers its
questions 3–52 (1, 2, 7 and 8 are absent from the export); question 26 is a
nine-row matrix carried as sub-numbered questions 26.1–26.9. Beyond the
verbatim `question_text`, each row carries:

| Column | Meaning |
|---|---|
| `question_id` / `question_number` / `sub_number` | `Q019` (zero-padded, sorts correctly), `19`, and the matrix sub-number (`Q026_4` → 26, 4) |
| `display` | `Q19`, `Q26.4` — the human-facing form |
| `shorthand` | **snake_case slug carrying what the question is actually about** — `formula_appropriate`, not the first 120 characters. Unique across all 56, no digits |
| `label` | 4–8 word title for charts and tables |
| `topic` | Which part of the consultation: `profile`, `general`, `formula`, `additionality`, `emission_rates`, `weighting` — the axis pages are built from |
| `doc_section` | The consultation document subsection that *defines* what the question interrogates: `6.1` the TWG formula, `7.1` the additionality tests, `8.1`/`8.2` the OM/BM methodologies, `8` cross-cutting emission-rate questions, `9.1` the weighting approaches, `5` general feedback, `n/a` profile |
| `category` / `subcategory` | The cross-cutting concern — 9 categories, 23 subcategories (see below) |
| `asks_for` | What shape the answer takes — 10 values, `stance` through `open_feedback` |
| `question_type` | `single_select`, `multi_select`, `matrix_rating`, `ordinal_select`, `free_text` |
| `role` | `primary`, `free_text_primary`, `comment`, `other_specify`, `profile` |
| `construct` | What ranks mean: `stringency` for the matrix, `ordinal` for the granularity ladders, empty otherwise |
| `condition` | Which parent answer a follow-up was addressed to (`yes`, `no`, `selected`), where the survey said so |
| `parent_question` / `anchor_question` | The question a follow-up elaborates, and the substantive proposal it sits under |
| `references_questions` | Question numbers cited in the wording |
| `n_answered` / `response_rate_pct` | The base for every percentage you compute |
| `notes` / `label_notes` | Data-handling caveats, and the wording defects / interpretive hazards |

Four axes, deliberately orthogonal, so a question can be found from whichever
direction you are coming at it:

| Axis | Question it answers | Example |
|---|---|---|
| `topic` | which section of the consultation? | `additionality` selects all 17 additionality questions |
| `doc_section` | which part of the PDF is being interrogated? | `8.2` selects the build-margin block |
| `category` / `subcategory` | what concern is being probed? | `feasibility_and_data` finds the test-feasibility pair (Q28/29) *and* the weighting-feasibility pair (Q49/50), two sections apart |
| `asks_for` | is the answer a stance, a pick, a reason, evidence? | `rationale` collects all ten why-boxes across every topic |

The categories: `resp_profile` (13), `quantification_design` (11 — formula
structure, effects boundary, reporting period, and the two granularity
ceilings), `additionality_design` (11), `method_choice` (11), 
`feasibility_and_data` (4), `regional_variation` (2), `claims_and_rigor` (2),
`overall_assessment` (1), `evidence` (1).

The vocabularies are closed. `reference/question_labels.csv` is the
hand-curated input; `scripts/survey_meta.py` holds the permitted values and
`load_labels()` rejects anything else at build time — unknown values, duplicate
or numeric shorthands, subcategories under the wrong category, missing hazard
notes, or a leftover `tbd` placeholder all fail the build loudly.

### `responses` / `responses_long.csv` — one row per answer given (5,074)

One row per respondent × question; nothing is aggregated. `shorthand`, `topic`,
`doc_section`, `category` and `asks_for` are carried on every answer so
discrete answers can be grouped without joining back to `questions`.

`answer_text` is verbatim (after whitespace normalisation — see caveat 9).
`answer_numeric` is the comparable position where one exists: 3/2/1 for the
matrix's Required/Optional/Not required, the coarse→fine rank for the two
granularity ladders, and `NULL` for everything else — binary stances have no
ladder, and special options never carry a rank. Free-text answers also carry
`char_count`, `word_count` and `likely_truncated`. Unanswered questions are
absent rather than blank: with response counts falling from 165 to 36, the
non-response pattern is itself meaningful.

### `response_selections` — one row per option ticked (1,277)

Multi-select cells exploded (the seven multi-select questions: 28, 35, 36, 38,
39, 47, 49). `is_special = 1` marks the escape hatches ("None", "Unsure", "All
are feasible"…). Every selection string in this export matches an offered
option (`is_canonical` is uniformly 1): this survey routes write-ins to
separate free-text questions (30, 42, 51) instead of an "Other" box.

### `question_options` — option catalogue (173 rows)

Every distinct option per choice question with `n_selected`,
`pct_of_answered` (of that question's own base), `option_rank` (matrix and
ladders only), `is_special`, `is_other_option`.

### `respondents` — one row per respondent (185)

Profile fields (Q3–Q17: country, organisation type, sector, GHG-inventory
status and involvement, individual vs organisation) plus `is_redacted`, the
`is_excluded` / `exclusion_reason` columns (present but empty at this layer —
see caveat 1), and engagement metrics: `n_substantive_answered`,
`substantive_completion_pct`, `n_free_text_answers`, `free_text_chars`,
`n_multi_select_selections`.

### SQLite views

| View | Grain | Purpose |
|---|---|---|
| `v_stance_answers` | respondent × question | Every closed-choice answer joined to respondent profile — the cross-tab workhorse |
| `v_stance_summary` | question | n answered, n ranked, mean ladder position where a ladder exists |
| `v_selections` | respondent × option | Multi-select picks joined to respondent profile, specials flagged |
| `v_free_text` | respondent × question | All free text in survey order, with lengths |
| `v_answer_types` | respondent × answer type | How many answers of each kind each respondent gave |
| `v_option_counts` | question × option | Every distinct answer to a choice question, keyed by `shorthand` |
| `v_question_tree` | question | Each substantive question with its follow-ups nested under it |
| `v_stance_by_redaction` | question × answer | Counts split named vs redacted — the redaction-skew view |
| `v_redaction_profile` | respondent group | Redaction crossed with respondent type, completion, verbosity |

Unlike the Scope 2 hub's database at the repo root, numeric columns here are
typed (`INTEGER`/`REAL`), so `SUM(is_redacted)` and `AVG(answer_numeric)` work
directly.

---

## Caveats

**1. The analytical base downstream is 181, not 185 — but this dataset ships
all 185.** Three junk/test submissions (respondent IDs 11, 12, 14 — one is 24
answers of the single letter "e") and one superseded resubmission (ID 100,
resubmitted as ID 151 by the same named individual with changed answers) are
excluded from every downstream aggregate, quote pool and browser. The
`is_excluded` / `exclusion_reason` columns exist from day one but are empty at
this layer: adjudication lands in `reference/exclusions.csv` via the
derived-flags and org-audit passes, and the frontend exporter enforces it. The
raw export is never modified, and nothing is deleted here — the four rows are
present and countable.

**2. The additionality matrix is stringency, not sentiment.** Questions
26.1–26.9 ask whether each of nine tests should be Required / Optional / Not
required in an additionality framework for renewable energy projects.
"Required" is not approval and "Not required" is not disapproval — the ladder
(`answer_numeric` 3/2/1) measures how binding the test should be. Never colour
it with a support ramp, and never average it with anything. The matrix stem and
the Required/Optional definitions appear only in the consultation document
(§7.2 preamble); the export headers carry only the test names, including the
malformed `26.6 Posititve list` (see caveat 8).

**3. Special options are never netted.** Twelve picklist options are flagged
`is_special`: "Unsure", "Unsure, depends on details", "None", "None are
appropriate", "None (no tests are feasible)", "All are feasible", "Not
applicable", "Other or N/A (please specify)" across their questions. They are
real answers, shown as their own segments — but they carry no rank and stay out
of every net figure. "All are feasible" on Q49 means the *opposite* of a pick;
netting it as one inverts its meaning.

**4. Scoreboard nets use each question's own base — and Q47/Q49 are not even
the same construct.** The appropriate/not-appropriate pairs have different
denominators: Q35 (n=69) vs Q36 (n=57), Q38 (n=69) vs Q39 (n=58), Q47 (n=67)
vs Q49 (n=57). Net % = pct of the appropriate base − pct of the
not-appropriate base, both bases displayed; a methodology absent from both
lists is unknown, not neutral. The weighting pair is asymmetric on top of
that: Q47 asks which approaches are *appropriate*, Q49 which are *not feasible
to implement* — an approach can be appropriate yet infeasible, so Q49 is not
Q47's inverse.

**5. Response rates collapse from 165 to 36 — always divide by `n_answered`.**
Q18 draws 165 answers, the stance questions 133 → 78, the methodology
scoreboards 57–69, and the survey's only evidence request (Q52) 36. The median
respondent answered 19 of 43 substantive questions. A raw count of picks
conflates "most people disagree" with "most people had left".

**6. 41.6% of respondents requested redaction — and redaction skews the
stances.** 77 of 185 asked for identity redaction; their `name` and
`organization` read `"Redacted"` (never null; blank-but-not-redacted reads
`"Not provided"`). Redacted respondents lean further against the proposed
formula (Q19: 42 No / 20 Yes redacted, vs 42 / 29 named), flip Q21 (secondary
effects: named 35 Yes / 23 No, redacted 22 / 30), and lean coarser on
granularity. Any headline built only on attributable responses skews
supportive. `v_stance_by_redaction` gives the split for every closed question.

**7. Coordinated text is real — dedup before "N respondents said X".**
Roughly 38 shared-text clusters (≥200 normalised characters appearing
verbatim in 2+ submissions) span ~25 respondents, including one five-member
and one four-member response pack (provisional figures; the derived-flags pass
under `scripts/analytics/` finalises them in `data/derived/`). Identical
passages inflate naive counts and propagate identical citations. Quote-level
work needs the cluster flags.

**8. The 26.x identifier scheme.** Matrix rows are `question_id`
`Q026_1`…`Q026_9` (`question_number` 26, `sub_number` 1–9, `display`
`Q26.1`…). The source header for 26.6 is malformed — `26.6 Posititve list`,
missing its second period and misspelling "Positive" — and is parsed as 26.6
regardless. Do not "fix" the raw export. `question_id` and `question_number`
are immutable join keys.

**9. Whitespace is normalised; verbatim text is preserved.** The export
carries non-breaking, narrow, thin, ideographic and zero-width spaces (844
cells affected) plus trailing/doubled spaces on multi-select option labels
("SCED – locational  ;"). Normalisation runs before option matching — it is
what keeps otherwise-identical labels from splitting into separate options.
`answer_text` keeps the respondent's text (normalised whitespace only, nothing
dropped); source-cell lengths drive the truncation flag.

**10. Other data-quality notes.**
- Survey numbers 1, 2, 7 and 8 are absent from the export; numbering runs
  3–52. `respondent_id` runs 3–201 with gaps — never assume 1..185.
- **Polarity is proposal-relative** (`survey_meta.POLARITY`): the critical
  answer on Q19 is "No", but on Q21 it is **"Yes"** — the drafted approach
  excludes secondary effects (document §6.1), so Yes pushes against the draft —
  and on Q24 it is the lifetime option, against the drafted each-year
  recommendation. Q31 and Q33 have no drafted position and deliberately carry
  no polarity.
- **Q43/Q45 ask for a *maximum appropriate* granularity** — a ceiling, not a
  preference. Ranks run coarse (1) to fine; answering "Nodal" does not demand
  nodal data. The document offers "Daily" on Q45, but no respondent selected
  it, so it is absent from the export and the ladder skips from Monthly to
  Hourly.
- The Q18 header is cut off mid-parenthesis in the export; the document
  completes it "(…costs, comparability, clarity of claims)".
- **The conditional filters were not enforced by the form.** 13 of Q22's 66
  answers lack the required Yes on Q21; Q23: 10 of 57 without a No; Q32: 20 of
  57 without a Yes on Q31; Q34: 15 of 53 without a Yes on Q33; and Q25 has 9
  answers from respondents who skipped Q24 itself. Filter by the parent answer
  where the distinction matters.
- Free text is capped at 4,000 characters by the survey tool; 18 substantive
  answers sit at the cliff and are flagged `likely_truncated = 1`.
- `organization` (Q5) is uncontrolled free text — one "affiliation" runs 1,255
  characters. Join on `respondent_id`, truncate for display.

---

## Recipes

Paths are relative to `electricity-consequential/`.

```sql
-- The headline: is the TWG subgroup formula appropriate, by organisation type.
SELECT organization_type, answer_text, COUNT(*) AS n
FROM v_stance_answers WHERE shorthand = 'formula_appropriate'
GROUP BY 1, 2 ORDER BY 1, n DESC;

-- The additionality matrix, sorted by net requiredness (%R − %N of each
-- test's own base). Stringency, not sentiment.
SELECT q.display, q.label, COUNT(*) AS n,
       SUM(r.answer_text = 'Required')     AS required,
       SUM(r.answer_text = 'Optional')     AS optional,
       SUM(r.answer_text = 'Not required') AS not_required,
       ROUND(100.0 * (SUM(r.answer_text = 'Required')
                    - SUM(r.answer_text = 'Not required')) / COUNT(*), 1) AS net_pct
FROM responses r JOIN questions q USING(question_id)
WHERE r.question_type = 'matrix_rating'
GROUP BY r.question_id ORDER BY net_pct DESC;

-- Own-base netting for the operating-margin scoreboard (caveat 4). Both
-- pct_of_answered columns already divide by their own question's base.
SELECT a.option_text AS methodology,
       a.n_selected AS appropriate_n, b.n_selected AS not_appropriate_n,
       ROUND(a.pct_of_answered - COALESCE(b.pct_of_answered, 0), 1) AS net_pct
FROM question_options a
LEFT JOIN question_options b
       ON b.question_id = 'Q036' AND b.option_text = a.option_text
WHERE a.question_id = 'Q035' AND a.is_special = 0
ORDER BY net_pct DESC;

-- The weighting picks with their escape hatches shown apart (caveats 3, 4).
SELECT question_id, option_text, is_special, n_selected, pct_of_answered
FROM question_options WHERE question_id IN ('Q047', 'Q049')
ORDER BY question_id, is_special, n_selected DESC;

-- The attrition spine: how much evidence sits under each substantive question.
SELECT display, shorthand, n_answered, response_rate_pct
FROM questions WHERE question_number >= 18
ORDER BY question_number, sub_number;

-- Does withholding identity travel with the stance? (caveat 6)
SELECT answer_text, n_named, n_redacted FROM v_stance_by_redaction
WHERE shorthand = 'formula_appropriate';

-- Cross-cutting axes: every feasibility judgment, whichever section it lives in.
SELECT display, shorthand, asks_for, n_answered FROM questions
WHERE category = 'feasibility_and_data' ORDER BY question_number;

-- The granularity ladders as ceilings: option, rank, and share of the base.
SELECT q.display, o.option_text, o.option_rank, o.n_selected, o.pct_of_answered
FROM question_options o JOIN questions q USING(question_id)
WHERE q.asks_for = 'design_preference'
ORDER BY q.question_number, o.option_rank;

-- A drill-down tree: the matrix with the follow-ups hanging off it.
SELECT display, shorthand, role, condition, n_answered
FROM v_question_tree WHERE anchor_number = 26;

-- Everything one respondent said, in survey order.
SELECT display, shorthand, answer_text FROM responses
WHERE respondent_id = 3 ORDER BY question_number, sub_number;
```

```python
import pandas as pd

long = pd.read_csv("data/responses_long.csv")

# Fine vs coarse temporal-granularity ceiling (Q45), base kept visible.
t = long[long.shorthand == "temporal_granularity_max"]
fine = (t.answer_numeric >= 3).map({True: "hourly or finer", False: "monthly or coarser"})
print(fine.value_counts(), "of n =", len(t))

# Where the written record concentrates: free-text volume per concern.
ft = long[(long.question_type == "free_text") & (long.question_number >= 18)]
print(ft.groupby("category").char_count.agg(["count", "sum"])
        .sort_values("sum", ascending=False))
```

---

## Rebuilding

```bash
pip install openpyxl
python3 scripts/build_dataset.py     # from electricity-consequential/
python3 scripts/validate_dataset.py  # expect 86/86 checks passed
```

Deterministic — the same input produces byte-identical output. Three files
share the work:

- `scripts/build_dataset.py` — mechanical reshaping only. Verified on the
  current build: every non-empty source cell appears exactly once in
  `responses_long` with its value unchanged (5,074 cells, 0 mismatches), and
  the multi-select explosion conserves selections (1,277).
- `scripts/survey_meta.py` — every editorial judgement: section groupings, the
  matrix stringency ladder, the granularity ladders and their anchors, special
  options, the proposal-relative polarity map, per-question caveats, and the
  closed vocabularies for every codebook axis.
- `reference/question_labels.csv` — the hand-curated shorthand, label, topic,
  document section, concern category and answer shape for each of the 56
  question columns, with a notes column disclosing every wording defect found.
  The build fails loudly, naming the question, if a row is missing, a
  shorthand repeats or carries a digit, a vocabulary value is unrecognised, a
  subcategory sits under the wrong category, or a required hazard note is
  empty.
