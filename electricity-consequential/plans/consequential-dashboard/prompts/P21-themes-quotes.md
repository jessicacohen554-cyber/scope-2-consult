# P21 — Theme coding + quote curation (Wave 1, Lane D)

**Model:** **claude-fable-5** (the theme taxonomy is this survey's substitute for reason
picklists — the interpretive layer four topic pages, the voices page and the essay stand
on; do not substitute a smaller model) · **Runs in parallel with:** P02, P10, P20 ·
**Needs:** P01 merged · **Blocks:** P22's final rerun (provisional export legal first)
**Lane:** `wave1/p21-themes-quotes` (worktree; commit only — the manager merges and pushes)

## Task

One disciplined reading pass over the free-text record (1,377 answers, 1.25M chars),
producing a closed theme taxonomy, per-answer theme codes, and curated quotes. Read
PLAN.md §3 (what the closed questions already establish — themes explain the *why*
behind those splits), §5 (`themes.json` / `quotes.json` shapes), §6 "P21"; then root
`reference/curated_quotes.json` + root `scripts/analytics/test_quotes.py` for the
verbatim/redaction discipline.

Input: the sqlite db (`v_free_text`). Skip junk respondents {11, 12, 14} and superseded
{100} (PLAN §3.5 provisional set; reconcile with `reference/exclusions.csv` if P20 has
merged). Template-dedup: compute normalized-text sha1 inline with P10's exact recipe
(lowercase → collapse whitespace → strip → sha1; ≥200 chars shared by ≥2) so hashes
line up when P10 merges — cross-check then, don't block now.

## Method + Output

1. **Design the taxonomy first** — `electricity-consequential/reference/theme_taxonomy.md`:
   ~25–40 keys with label, definition, inclusion/exclusion rules, polarity
   (`concern` / `support` / `design` / `neutral`), and 2 worked examples each. Expect
   concerns like `attribution_uncertainty`, `double_counting_risk`,
   `inventory_vs_impact_boundary` (consequential results must not enter Scope 2
   inventories), `data_availability`, `model_manipulability`, `complexity_burden`,
   `regional_equity`, `verification_difficulty`; supports like `system_level_signal`,
   `price_signal_formation`, `avoids_gaming_of_averages`; design asks like
   `tiered_rigor_by_claim`, `regional_test_variants`, `default_5050_weight`,
   `align_with_existing_tools`, `annual_truing_up`. Let the record correct this list —
   these are seeds, not the answer.
2. Code every substantive free-text answer (multi-label) →
   `electricity-consequential/reference/coded_themes.csv`:
   `respondent_id, question_number, theme_keys` (pipe-joined, ≥1 key or `uncodeable`).
   Template-cluster members get identical codes (code the text once, propagate).
3. `electricity-consequential/reference/curated_quotes.json` — PLAN §5 QUOTE shape,
   keyed by topic (formula/additionality/emission_rates/weighting/general): 3–6 quotes
   per side (`for`/`against`/`context`) per topic. Verbatim substrings of stored
   answers (`[…]` elisions allowed, each segment verbatim), ≤600 chars, theme keys
   attached, template badge where the source text is clustered, attribution
   "Org Name — org type, country" for named / "Redacted — org type, country" for
   redacted, never a name for redacted respondents, no junk/superseded respondents.
   Favor quotes that *explain* the closed-question splits (why the formula fails; why
   secondary effects cut both ways; why granularity divides; what makes tests
   infeasible).
4. `scripts/analytics/test_themes_quotes.py`: closed-vocab enforcement (every
   theme_key in the taxonomy), coverage floor (≥85% of substantive answers coded
   non-`uncodeable`), quote verbatim check (elision-aware substring), length/quota/
   redaction/exclusion rules, badge correctness vs your inline cluster map,
   deterministic file ordering.

## Guardrails

- Touch ONLY `electricity-consequential/reference/{theme_taxonomy.md,
  coded_themes.csv, curated_quotes.json}` and
  `electricity-consequential/scripts/analytics/test_themes_quotes.py`.
- Codes and quotes come from reading the actual answers — never infer a respondent's
  theme from their org type or stance. Balance: if a topic's record is lopsided, the
  quote set may be lopsided, but say so in your report rather than manufacturing
  balance.
- `python3 electricity-consequential/scripts/validate_dataset.py` must still pass.

## Acceptance

PLAN.md §9 (items 1, 6, 7). Report: the final taxonomy with per-theme counts (raw and
dedup-adjusted), coverage %, quotes per topic/side, how many carry template badges, and
the 5 most load-bearing coding decisions. Commit in your worktree. No push, no PR.
