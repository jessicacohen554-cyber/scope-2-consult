# Handoff: label and categorise all 180 consultation questions

Paste the section below into a fresh Claude Code session on this repo. Everything
after the divider is the prompt.

---

## Task

I want to work through every question in the GHG Protocol Scope 2 public
consultation and attach two things to each: a **category** and a **shorthand
label** that carries the question's contextual meaning, so I can read and pivot
this survey without re-reading 180 paragraphs of question text.

Start by reading `README.md`, then `data/questions.csv` and
`scripts/survey_meta.py`. The dataset is already built and validated — run
`python3 scripts/validate_dataset.py` to confirm (expect 21/21).

### Scope: 180 questions, not 200

The survey numbers its questions 3–183. **Numbers 1, 2 and 7 are absent from the
published export**, so there are exactly **180** questions to label, not 200 or
183. `question_number` is the survey's own numbering; `question_id` is the
zero-padded form (`Q071`). Never renumber either — the IDs are the join key to
70,089 answers, and they are what the consultation document itself cites.

### What to produce

A new hand-curated input file, `reference/question_labels.csv`, one row per
question:

| Column | Content |
|---|---|
| `question_id` | `Q071` — must match `data/questions.csv` exactly, all 180 present |
| `question_number` | `71` |
| `shorthand` | snake_case slug, ≤40 chars, unique. The contextual meaning, not a text truncation |
| `label` | 4–8 word human-readable title for charts and tables |
| `category` | Top-level category from the taxonomy we agree in round 1 |
| `subcategory` | Finer grouping within the category |
| `policy_lever` | The specific proposal at stake (e.g. `qc4_hourly_matching`), shared across every question interrogating it |
| `asks_for` | What the answer *is*: `stance`, `rationale_for`, `rationale_against`, `cost_estimate`, `data_availability`, `timeline`, `design_preference`, `evidence_basis`, `elaboration`, `respondent_attribute` |
| `notes` | Anything ambiguous or double-barrelled about the wording |

Then wire it in: `build_dataset.py` should read it, left-join onto the codebook by
`question_id`, and fail loudly if a question is missing or a `shorthand` is
duplicated. Add the joined columns to `data/questions.csv`, the `questions`
table, and the SQLite views where they help (`v_scale_summary`,
`v_question_tree`). Add a validation check that all 180 questions are labelled
with unique shorthands.

### Why shorthand is the hard part

`question_text_short` already exists and is just the first 120 characters — it is
useless as a label, because the survey's wording buries the subject. Q71 opens
"On a scale of 1-5 do you support an update to Quality Criteria 4 to require that
all contractual instruments…". The shorthand needs to be
`qc4_hourly_matching_support`. Q78 and Q79 both open "Please indicate your best
estimate of the…" and are only distinguishable deep into the sentence:
`qc4_internal_admin_effort` and `qc4_external_service_cost`.

Sibling questions must be *parallel and diffable*, sharing a `policy_lever`
prefix so they sort together:

```
Q071  qc4_hourly_matching_support        stance
Q072  qc4_hourly_matching_reasons_for    rationale_for
Q073  qc4_reasons_for_comment            elaboration
Q074  qc4_hourly_matching_reasons_vs     rationale_against
Q075  qc4_reasons_vs_comment             elaboration
Q076  qc4_load_profiles_effect           design_preference
```

Beware the 62 questions whose text is near-identical boilerplate ("Please provide
comments regarding your reasons for support."). Their meaning comes entirely from
what they hang off, so use the existing `anchor_question` / `parent_question`
columns to resolve them — those columns exist for exactly this.

### How I want to work

Go **section by section**, in the 27 sections already in `data/questions.csv`.
For each batch, show me a compact table of the questions with your proposed
category / shorthand / label / policy_lever / asks_for, and the **full question
text** for anything you found ambiguous. I'll correct, and you carry the
correction forward — if I rename a policy lever, apply it to every sibling
without me asking twice.

Sections and sizes, smallest-first is fine but Q3–17 (profile) should go first
since it's quick and sets conventions:

```
 1. Q3-17    n=14  Respondent profile
 2. Q18      n=1   Scope 2 definition
 3. Q19-20   n=2   LBM and MBM definitions
 4. Q21-22   n=2   Purposes of the LBM and MBM
 5. Q23-34   n=12  LBM emission factor hierarchy
 6. Q35-43   n=9   Definition of 'accessible'
 7. Q44-51   n=8   LBM requirement: most precise accessible EF
 8. Q52-56   n=5   LBM decision-usefulness and comparability
 9. Q57-61   n=5   LBM hourly data availability
10. Q62-68   n=7   LBM cost, effort and readiness
11. Q69-70   n=2   Deliverable market boundary / exemption threshold
12. Q71-76   n=6   MBM QC4: hourly matching
13. Q77-82   n=6   MBM QC4: cost and effort
14. Q83-91   n=9   MBM QC5: deliverability
15. Q92-96   n=5   MBM QC5: cost and effort
16. Q97-112  n=16  Standard Supply Service (SSS)
17. Q113-123 n=11  Residual mix emission factors
18. Q124-129 n=6   Fossil-based fallback emission factor
19. Q130-133 n=4   Feasibility measures
20. Q134-138 n=5   MBM decision-usefulness and comparability
21. Q139-141 n=3   Procurement cost impacts
22. Q142-145 n=4   Financial reporting (IFRS/GAAP) impacts
23. Q146-151 n=6   Separate impact metric outside scope 2
24. Q152     n=1   Overall balance of revisions
25. Q153-170 n=18  Exemptions to hourly matching
26. Q171-180 n=10  Legacy clause
27. Q181-183 n=3   Transition approach
```

**Round 1, before any labelling:** propose the `category` / `subcategory`
taxonomy and the `policy_lever` vocabulary as a single flat list for me to
approve, and say where it disagrees with the 27 existing sections. Those sections
are my derived groupings, not the GHG Protocol's, and are fair game to restructure
— the categories may well want to cut across them (cost-and-effort questions
recur in five separate sections and arguably belong together). Don't start
labelling until I've signed off on the vocabulary.

Commit per section or per few sections to `claude/ghg-protocol-feedback-data-im78hh`
so I can follow the diff. Don't open a PR.

### Constraints

- `question_id` and `question_number` are immutable. Every one of the 180 gets a
  row; no gaps, no invented numbers.
- Shorthands unique across all 180, snake_case, ≤40 chars, no question numbers
  inside them (the ID column already carries that).
- Editorial judgement belongs in `scripts/survey_meta.py` or
  `reference/question_labels.csv`, never hardcoded in `build_dataset.py`. That
  separation is deliberate.
- Rebuild and re-validate before each commit; the README quotes specific counts
  and `validate_dataset.py` asserts them.
- Read the **full** `question_text`, not `question_text_short`. Several questions
  are double-barrelled and the second clause is where the meaning lives.

### Context worth carrying in

- **Scale direction is inconsistent.** A bare 1–5 box means support in Q23/35/44/
  71/83/97/113/124/153/171, but relative cost in Q78/79/92/93/139 (**3 is anchored
  to the respondent's current effort**, so 5 is a complaint), and impact magnitude
  in Q142/179. `scale_construct` records this. Labels should make it obvious which
  is which — a reader seeing `qc4_internal_admin_effort` next to
  `qc4_hourly_matching_support` should not be tempted to average them.
- **Redaction is a finding, already tracked.** 573 of 1,072 respondents (53.5%)
  requested redaction; `name` and `organization` read `"Redacted"` with
  `is_redacted = 1`, never null. Redacted respondents are consistently *less*
  supportive — Q71 1.81 vs 2.37, Q124 2.76 vs 3.41 — with the legacy clause
  (Q171) the sole reversal. See `v_scale_by_redaction`. Keep it that way.
- **Response rates run 1,072 down to 75.** `n_answered` is in the codebook and is
  the denominator for everything.
- Q140 and Q174 carry `review_option_split = 1`, meaning my split between offered
  options and typed write-ins is worth a second look on those two.
