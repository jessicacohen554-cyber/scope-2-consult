# P20 — Organization legitimacy audit (Wave 1*, Lane D — needs only the db, may run alongside P10/P11)

**Model:** claude-opus-5 · **Runs in parallel with:** P10, P11 (and later P21/P22) · **Needs:** nothing — database only
**Branch:** `claude/mbm-p20-org-audit`

## Task

Produce `reference/org_audit.csv`: an audited organizational classification for every
**named** respondent (≈498 rows), because self-classification is unreliable — PLAN.md
§3.6 lists verified leads (~27 of 66 named "NGOs" are trade/business bodies; ~10 of 34
"academics" aren't academic institutions; companies filed as "Industry group"). Read
PLAN.md §2, §3.6, §6 first.

## Method

1. Pull named respondents (`is_redacted+0 = 0`) with `organization`, `organization_type`,
   `organization_type_other`, `sector`, `sector_other`, `country`, `responding_as` from
   the db.
2. Classify each into the closed vocabulary (PLAN §6): `academic_institution,
   think_tank, ngo_civil_society, trade_association, business_coalition, company,
   consultancy, data_vendor, financial, government, registry_operator, standards_body,
   individual, unverifiable, placeholder`.
3. Evidence hierarchy for `basis` (≤200 chars, cite which): (a) the org name itself
   (legal form: GmbH/LLC/Ltd/SA = company; "Association"/"Council"/"Federation" =
   trade_association…), (b) the respondent's own `*_other` write-ins (they often confess:
   "Trade association"), (c) their free-text self-descriptions in the survey, (d) your
   background knowledge of well-known bodies (WBCSD, Breakthrough Institute, WattTime…).
   **Do not browse the web** — the audit must be reproducible from the dataset + common
   knowledge; mark genuinely unknown entities `unverifiable` with `confidence=low`.
4. `confidence`: `high` (legal form or self-confession), `medium` (well-known entity),
   `low` (judgment call). When claimed and audited agree, still emit the row
   (`audited_class` = mapped claimed class).
5. Work in batches of ~50, keeping a running tally; spot-check the PLAN §3.6 leads land
   where expected (EnergyTag Ltd → trade/standards or company — pick one, document why;
   Breakthrough Institute → think_tank; Baker Hughes → company; U. Edinburgh →
   academic_institution).

## Output

- `reference/org_audit.csv`: `respondent_id, organization_verbatim, claimed,
  audited_class, confidence, basis`. Named respondents only; sorted by respondent_id;
  quoting per Python csv defaults.
- `scripts/analytics/test_org_audit.py`: asserts all named respondents present, closed
  vocabulary respected, no redacted ids, ≥20 NGO→trade/business reclassifications,
  ≥8 academia reclassifications, spot fixtures for 10 known rows.
- A summary table in your final report: claimed × audited counts.

## Guardrails

- Touch ONLY `reference/org_audit.csv` and `scripts/analytics/test_org_audit.py`.
- Never include redacted respondents (their names are "Redacted" — nothing to audit).
- This file feeds a public-facing "claimed vs audited" table (P34): `basis` must be
  factual and defensible, never speculative about motive ("legal form is GmbH" ✓;
  "probably lying" ✗). An organization being a trade association is a classification,
  not an accusation.
- `python3 scripts/validate_dataset.py` all pass (27/27 as of this writing).

## Acceptance

PLAN.md §9. Run your test file. Commit + push `claude/mbm-p20-org-audit`. No PR. Report
the claimed×audited matrix and the 15 most consequential reclassifications with their
basis strings.
