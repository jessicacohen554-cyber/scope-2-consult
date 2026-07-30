# P22 — Frontend JSON exporter & validator (Wave 2, Lane D)

**Model:** claude-sonnet-5 · **Runs in parallel with:** P21 (rerun after P20/P21 merge) — may start as soon as P10 pushes, without waiting for P11
**Needs:** P10 merged · **Blocks:** all Wave 3 pages
**Branch:** `claude/mbm-p22-export-frontend`

## Task

Implement `scripts/analytics/export_frontend.py` and
`scripts/analytics/validate_frontend_data.py` producing/validating every file in the
data contract — PLAN.md §5 is the normative spec; read it twice, plus §2 gotchas and §6.
If P11 has merged and its fixture shapes deviate from §5, **match P11's shapes** and
flag the deviation in your report.

## Exporter behavior

- Inputs: `data/scope2_consultation.sqlite`, `data/derived/*` (P10),
  `reference/org_audit.csv` (P20), `reference/curated_quotes.json` (P21).
- `--allow-missing-curation`: if P20/P21 outputs are absent, emit `audit.json` from
  claimed classes with `"provisional": true`, and `quotes.json` as `{}` — Wave 3 pages
  must still render. Without the flag, missing inputs = loud failure.
- Outputs → `frontend/data/` exactly per contract: `meta.json`, `likert.json`,
  `reasons.json`, `selects.json`, `evidence.json`, `respondents.json`, `clusters.json`,
  `audit.json`, `quotes.json`, `orgs/{respondent_id}.json` (named respondents only).
- Segment slugs, top-N groupings (sector top 12 + grouped, country top 10 + grouped),
  2dp floats, sorted keys, trailing newline, deterministic byte-identical reruns.
- Privacy/noise guard: any segment value with fewer than 5 respondents overall emits
  `{"n": "<5"}` sentinel cells, never counts.
- Likert cells for ordinal questions carry ladder-length `c` arrays; the ladder labels
  live in `meta.json`. Off-scale counts (`Unsure`/`Unknown`/no-basis) go in `off`, never
  into `c`.
- `clusters.json`/`orgs/*.json`: redacted members by count/id only — never a name.

## Validator (`validate_frontend_data.py`, exit non-zero on any failure)

1. Every likert cell: `sum(c) == n`; segment n's sum to overall n (± off-scale rules).
2. Cross-check 10 hard numbers against the db: Q71 overall (909, 2.07, 638/67/204);
   Q71 redaction split (418/2.37 named, 491/1.81 redacted); Q171 (801, 4.58); Q138
   empirical count 27; redacted total 573; org_index length == named respondents;
   every org_index id has an `orgs/{id}.json`; every quote text verbatim-in-db;
   no construct mixing (a `support` question never shares a heatmap group id with
   `burden_relative` in meta); file size budget (≤500 KB, orgs ≤200 KB).
3. JSON parses, schema keys exactly as contracted (no extras without a `_comment`).

## Guardrails

- Touch ONLY `scripts/analytics/export_frontend.py`,
  `scripts/analytics/validate_frontend_data.py`, `frontend/data/` (excluding
  `frontend/data/fixtures/` — that's P11's).
- stdlib only. `python3 scripts/validate_dataset.py` all pass (27/27 as of this writing).
- Q174 reasons: `is_canonical = 1` only. Q140 likewise.

## Acceptance

PLAN.md §9. Both scripts run clean; validator passes; paste `ls -la frontend/data/` +
validator output in your report. Commit + push `claude/mbm-p22-export-frontend`. No PR.
When P20/P21 merge later, the manager reruns:
`python3 scripts/analytics/export_frontend.py && python3 scripts/analytics/validate_frontend_data.py`.
