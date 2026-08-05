# P22 — Frontend JSON exporter + contract validator (Wave 2, Lane D)

**Model:** claude-opus-5 · **Solo wave** · **Needs:** P02 + P10 merged (P20/P21 optional —
degrade via `--allow-missing-curation`; the manager reruns you when they land)
**Lane:** `wave2/p22-export-frontend` (worktree; commit only — the manager merges and pushes)

## Task

Build `electricity-consequential/scripts/analytics/export_frontend.py` +
`validate_frontend_data.py` and emit `electricity-consequential/frontend/data/`.
PLAN.md §5 is the normative spec; **read it twice**, plus §2 gotchas 4–8 and 15, §6
"P22". Then root `scripts/analytics/export_frontend.py` + `validate_frontend_data.py` —
port the infrastructure (deterministic writer, n<5 mask + sentinel, org-file pruning,
top-N grouping, the validation harness idiom), replace all content. **If P11's fixtures
deviate from §5 in any shape, match P11's fixtures and flag the deviation** — the
consumer's reading wins.

## Exporter behavior

- **Analytical base enforcement**: read `reference/exclusions.csv` (P20); fallback to
  `data/derived/respondent_flags.csv` candidates; final fallback hardcoded
  {11, 12, 14 junk; 100 superseded} with a loud warning + `"provisional_base": true`
  in meta. Excluded respondents appear ONLY in `integrity.json`; every other file's
  aggregates, org files and quote pools exclude them.
- Emit: `meta.json`, `stances.json` (Q19/21/24/31/33/43/45), `matrix.json` (9 tests +
  Q28 feasibility), `scoreboard.json` (om/bm/weighting; net on own base; specials never
  netted), `themes.json` (from `reference/coded_themes.csv` + taxonomy; n and n_dedup
  via P10's text_clusters), `quotes.json` (from `reference/curated_quotes.json`),
  `respondents.json` (distributions, attrition, redaction_effect, org_index with
  fingerprints + flags), `orgs/{id}.json` (~106 named analytical-base respondents),
  `integrity.json` (excluded + resubmission + families + clusters + blocs +
  dedup_effect on Q19/Q21 + citations incl. the Q52 table + audit block).
  `--allow-missing-curation`: themes/quotes empty objects, audit block
  `{"provisional": true}`, everything else full.
- Segment dims exactly: `org_type_5`, `country_4`, `redaction`, `responding_as`
  (PLAN §5 vocab); `{"n":"<5"}` sentinel for any segment value under 5 respondents.
  Deterministic bytes: sorted keys, ROUND_HALF_UP, 1dp percents, trailing newline,
  `generated` from the manifest's source-file date.

## Validator (`validate_frontend_data.py`)

Check groups, each re-deriving from the db + derived/reference files: (1) canonical
bytes (rerun exporter in temp dir → byte-identical); (2) SCELL arithmetic — every cell
of every file: counts sum to n, segment cells sum to overall, option order matches
meta; (3) mask placement — every under-5 segment masked, no masked value leaked;
(4) hard numbers on the analytical base — recompute Q19/Q21/Q24/Q31/Q33/Q43/Q45
overalls, the §3.3 matrix table, the §3.4 scoreboards, attrition; assert equality with
the JSON (freeze the analytical-base values in the validator and paste them in your
report — they become PLAN §3's verified replacements); (5) exclusion invariant — no
excluded id anywhere outside integrity.json; no redacted name anywhere; org files ==
org_index exactly; (6) quotes verbatim (elision-aware) + no excluded/redacted-name
violations + badge correctness; (7) themes consistency (n_dedup ≤ n ≤ n_texts;
taxonomy closure); (8) meta coverage (every §4 page's questions present; polarity
present for stance questions); (9) size budgets (≤300 KB, orgs ≤150 KB). Exit non-zero
on any failure. Every Wave 3+ prompt runs this in acceptance.

## Guardrails

- Touch ONLY `electricity-consequential/scripts/analytics/{export_frontend.py,
  validate_frontend_data.py}` and `electricity-consequential/frontend/data/`
  (excluding `frontend/data/fixtures/` — that is P11's).
- Never modify the db, `data/derived/`, `reference/`, or any frontend page/module.
- `python3 electricity-consequential/scripts/validate_dataset.py` must still pass.

## Acceptance

PLAN.md §9 (items 1, 2, 6, 7). Report: `ls -la frontend/data/` with sizes, the full
validator output, the analytical-base hard numbers table (raw §3 value → analytical
value, side by side), and any P11-fixture deviations you matched. Commit in your
worktree. No push, no PR. Note for the manager: rerun command is
`python3 scripts/analytics/export_frontend.py && python3 scripts/analytics/validate_frontend_data.py`
(from `electricity-consequential/`).
