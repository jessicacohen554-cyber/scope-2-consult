# GHG Protocol Scope 2 public consultation — processed feedback dataset

Reshapes the GHG Protocol's Scope 2 public consultation raw export into a tidy,
queryable dataset with a question codebook, so that answers stay tied to their
respondent while being straightforward to aggregate and drill into.

**Source:** [`S2-PublicConsultationFeedback-RawData-2026.07.29.xlsx`](https://ghgprotocol.org/sites/default/files/2026-07/S2-PublicConsultationFeedback-RawData-2026.07.29.xlsx)
(published 2026-07-29, single sheet `clean_data_final1`, 1,072 rows × 181 columns).
The original file is committed unmodified at the repository root and is the only
input; everything under `data/` is regenerated from it by
`scripts/build_dataset.py`.

**1,072 respondents · 180 questions · 70,089 answers · 52,552 multi-select selections**

---

## Pick a file

| Want to… | Use |
|---|---|
| Slice, group and join answers in SQL | `data/scope2_consultation.sqlite` |
| Tidy analysis in pandas / R / duckdb | `data/responses_long.csv` |
| One row per respondent, PivotTable-friendly | `data/responses_wide.csv` |
| Read what a question actually asks and how to score it | `data/questions.csv` |
| Option frequencies for a choice question | `data/question_options.csv` |
| Count who selected each option, per respondent | `data/response_selections.csv` |
| Respondent profiles and engagement metrics | `data/respondents.csv` |
| Work entirely in Excel | `data/scope2_consultation.xlsx` |

`manifest.json` records the build's row counts and type/role tallies.

---

## Tables

### `questions` — the codebook (180 rows, one per question)

The interpretation layer, and the place to start. Beyond the verbatim
`question_text`, it carries:

| Column | Meaning |
|---|---|
| `question_id` / `question_number` | `Q071` (zero-padded, sorts correctly) and `71` |
| `section` / `section_order` | Topic grouping — 27 sections, see caveat 2 |
| `question_type` | `likert_1_5`, `scale_labeled`, `single_select`, `ordinal_select`, `multi_select`, `free_text`, `numeric_year` |
| `role` | `primary`, `reasons_support`, `reasons_oppose`, `comment`, `basis`, `other_specify`, `profile`, `free_text_primary` |
| `scale_construct` | **What the numbers mean** — `support`, `burden_relative`, `cost_relative`, `impact_magnitude`, `effort_labeled`, `readiness_labeled`, `sufficiency_labeled`, `ordinal` |
| `scale_anchor_low` / `scale_anchor_high` / `scale_note` | Direction of the scale, in words |
| `anchor_question` | The substantive proposal this question sits under |
| `parent_question` | The specific question this one elaborates |
| `references_questions` | Question numbers cited in the wording, extracted from the text |
| `n_answered` / `response_rate_pct` | Base for every percentage you compute |
| `n_write_in_selections` / `review_option_split` | Write-in contamination, and whether it needs an eyeball (caveat 5) |
| `notes` | Per-question caveats |

### `responses` / `responses_long.csv` — one row per answer given (70,089)

`respondent_id` × `question_id` plus `answer_text` (verbatim) and
`answer_numeric` (the comparable score: 1–5 for scales, a 0-based rank for
ordinal ladders, the year for Q183, `NULL` for off-scale options such as
"Unsure"). Free-text answers also carry `char_count`, `word_count` and
`likely_truncated`. Unanswered questions are absent rather than blank — the
non-response pattern is meaningful here, since most respondents answered only
part of the survey.

### `response_selections` — one row per option ticked (52,552)

Multi-select cells exploded. `is_canonical = 1` marks one of the survey's offered
options; `0` marks text a respondent typed into an "Other" box that the export
concatenated into the same cell (54 selections across Q63, Q140, Q174). Nothing
is discarded.

### `question_options` — option catalogue (635 rows)

Every distinct option per choice question with `n_selected`, `pct_of_answered`,
`option_rank` (for ordered ladders), `is_other_option`, `is_off_scale`,
`is_canonical`.

### `respondents` — one row per respondent (1,072)

Profile fields (Q3–Q17: country, organisation type, sector, whether they have a
GHG inventory, whether they are involved in preparing it, individual vs
organisation) plus engagement metrics: `n_substantive_answered`,
`substantive_completion_pct`, `n_free_text_answers`, `free_text_chars`,
`n_multi_select_selections`.

### SQLite views

| View | Purpose |
|---|---|
| `v_scale_summary` | Per-question n, mean, and low/mid/high splits, with `scale_construct` shown |
| `v_scale_answers` | Every scale answer joined to respondent profile — the cross-tab workhorse |
| `v_selections` | Multi-select picks joined to respondent profile |
| `v_question_tree` | Each substantive question with its follow-ups nested under it |
| `v_free_text` | All free text in survey order, with lengths |

---

## Caveats

**1. Scale direction is not consistent — never pool across constructs.** The
survey reuses a bare 1–5 box for three different things:

- `support` (Q23, 35, 44, 71, 83, 97, 113, 124, 153, 171) — 5 = strongly supports.
- `burden_relative` / `cost_relative` (Q78, 79, 92, 93, 139) — **3 is anchored to
  the respondent's current cost or effort**, so 5 means "much more expensive than
  today". A high score here is a complaint, not endorsement.
- `impact_magnitude` (Q142, 179) — 5 = large knock-on impact. Also not support.

Averaging Q71 with Q78 produces a meaningless number. Filter on
`scale_construct` first. `scale_note` in `questions` spells out each anchoring.

**2. Section groupings are ours, not the GHG Protocol's.** The raw export has no
section column. The 27 topic sections were derived by reading the questions in
order; the consultation document's own numbering (Q159 refers to "section 5.3.1")
is not reproduced in the export. Edit `SECTIONS` in `scripts/survey_meta.py` to
regroup. `role`, `anchor_question` and `parent_question` are likewise derived —
from question wording, using the rules in `build_dataset.py`.

**3. Only 46% of responses are attributable.** 573 of 1,072 respondents (53.5%)
requested redaction, and their `name` and `organization` are blank in the source.
The remaining 499 supplied both (498 in practice). Any analysis by named
organisation covers under half the sample. `country`, `organization_type` and
`sector` are populated for all 1,072.

**4. Response rates vary enormously — always divide by `n_answered`.** Questions
range from 1,072 responses (profile) down to 75 (Q110). Only 120 respondents
answered more than 75% of the substantive questions; 43 answered under 10%. A raw
count of option picks conflates "most people disagree" with "most people skipped
it".

**5. Two questions mix write-ins into their option list.** Q140 and Q174 are
flagged `review_option_split = 1`: a string classified as a write-in was still
picked by 5+ respondents. Options were separated from write-ins by frequency
(≥5% of answers), plus the survey's standard escape choices ("Prefer not to say",
"Unsure", "None of the above" …). Strings like "None", "N/A" and "NA" were left
as write-ins because in Q63/Q140/Q174 they read as dismissals typed into an
"Other" box — but they are indistinguishable from an offered option by text
alone. Flip `is_canonical` in `question_options` if you read them differently.

**6. Free text is capped at 4,000 characters** by the survey tool; 8 answers hit
the cap and are marked `likely_truncated = 1`.

**7. Other data-quality notes.** Questions 1, 2 and 7 are absent from the
published export. Two Q118 answers were stored as JSON-ish literals
(`["4 - Mostly ready"]`) and are normalised. The source is littered with
non-breaking, narrow-no-break, thin, ideographic and zero-width spaces (~1,900
occurrences) from respondents pasting out of Word; these are normalised to plain
spaces or removed, which is what stops otherwise-identical option labels
splitting into separate strings. Q183 is a free-text year: values above 2050
(including eleven 2099s) look like protest answers. Q67's top two options overlap
as worded. Q4/Q5 are free text, so `organization` is not a controlled
vocabulary — the same body appears under different spellings.

---

## Recipes

```sql
-- Support by question, strongest first. Restricting to one construct is the point.
SELECT question_number, mean_score, n_scored, question_text_short
FROM v_scale_summary WHERE scale_construct = 'support'
ORDER BY mean_score DESC;

-- Does support for hourly matching (Q71) split by whether the respondent
-- actually prepares an inventory?
SELECT p.involved_in_inventory, COUNT(*) n, ROUND(AVG(a.answer_numeric), 2) mean
FROM v_scale_answers a JOIN respondents p USING(respondent_id)
WHERE a.question_number = 71 GROUP BY 1 ORDER BY n DESC;

-- Everything one respondent said about the legacy clause (section 26).
SELECT question_number, role, answer_text FROM responses r
JOIN questions q USING(question_id)
WHERE respondent_id = 397 AND section_order = 26 ORDER BY question_number;

-- Read a proposal's full drill-down: the scale question, its reason picklists,
-- and the comment fields hanging off it.
SELECT * FROM v_question_tree WHERE anchor_number = 83;

-- Why respondents opposed deliverability (Q86), split by organisation type.
SELECT option_text, organization_type, COUNT(*) n FROM v_selections
WHERE question_number = 86 AND is_canonical = 1
GROUP BY 1, 2 ORDER BY n DESC LIMIT 20;

-- Are US respondents more supportive of eGRID as the deliverable boundary?
SELECT country, answer_text, COUNT(*) n FROM responses r
JOIN respondents p USING(respondent_id)
WHERE question_number = 88 GROUP BY 1, 2 HAVING n > 3 ORDER BY n DESC;
```

```python
import pandas as pd

q     = pd.read_csv("data/questions.csv")
long  = pd.read_csv("data/responses_long.csv")
resp  = pd.read_csv("data/respondents.csv")
picks = pd.read_csv("data/response_selections.csv")

# Mean support per question, with the wording attached.
support = q.loc[q.scale_construct == "support", ["question_number", "question_text_short"]]
(long.merge(support, on="question_number")
     .groupby(["question_number", "question_text_short"])
     .answer_numeric.agg(["count", "mean"]).round(2)
     .sort_values("mean"))

# Support for hourly matching by sector, limited to sectors with 20+ answers.
df = long.query("question_number == 71").merge(resp, on="respondent_id")
by_sector = df.groupby("sector").answer_numeric.agg(["count", "mean"])
by_sector[by_sector["count"] >= 20].round(2).sort_values("mean")
```

---

## Rebuilding

```bash
pip install openpyxl
python3 scripts/build_dataset.py
```

Deterministic — same input gives byte-identical output. Two files:

- `scripts/build_dataset.py` — mechanical reshaping. Verified on the current
  build: every non-empty source cell appears exactly once in `responses_long`
  with its value unchanged (70,089 cells, 0 mismatches), and `sum(n_selected)`
  equals the `response_selections` row count (52,552).
- `scripts/survey_meta.py` — every editorial judgement: section groupings, scale
  constructs and anchors, ordinal ladders, off-scale labels, per-question notes.
  Disagreements about interpretation are resolved by editing this file and
  re-running.
