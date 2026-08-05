# P20 — Org audit + exclusion adjudication (Wave 1, Lane D)

**Model:** claude-opus-5 · **Runs in parallel with:** P02, P10, P21 · **Needs:** P01
merged · **Blocks:** P22's final rerun (provisional export legal before you land)
**Lane:** `wave1/p20-org-audit` (worktree; commit only — the manager merges and pushes)

## Task

Two curation deliverables: the audited organizational classification for every named
respondent, and the adjudicated exclusion list that fixes the analytical base. Read
PLAN.md §2 (gotcha 4 — you are the adjudicator it references), §3.1/§3.5, §6 "P20";
then root `reference/org_audit.csv` + root `scripts/analytics/test_org_audit.py` for
the format and quality bar.

Input: the sqlite db (respondent profiles + their answers). **Do not browse the web** —
classify from the submission itself (org name, self-description in Q11/Q13/Q15/Q17,
answer content). Reproducibility beats certainty; encode uncertainty in `confidence`.

## Method + Output

1. `electricity-consequential/reference/org_audit.csv` — one row per **named**
   respondent (108): `respondent_id, organization_verbatim, claimed, audited_class,
   confidence, basis`.
   - `claimed` = `organization_type` verbatim from the db.
   - `audited_class` closed vocabulary (Scope 2's 15 + one): `academic_institution,
     think_tank, ngo_civil_society, trade_association, business_coalition, company,
     consultancy, data_vendor, financial, government, registry_operator,
     standards_body, individual, unverifiable, placeholder, test_junk`.
   - `basis` ≤200 chars quoting the deciding evidence ("self-describes as trade
     association in Q13", "org field is a consultancy describing client work").
   - Watch for the Scope 2 patterns: trade bodies self-filed as NGO; companies filed
     as Industry group; consultancies as Academia. Also this survey's specifics:
     **Conversio Pty Ltd** states it prepares client responses; **XRB** is a
     government-adjacent standards body; **Ever.green** is a company the consultation
     document itself cites; **SEMI** is a trade association.
2. `electricity-consequential/reference/exclusions.csv` — the adjudicated analytical-
   base ruling: `respondent_id, exclusion_reason, evidence`. Start from P10's
   candidates if merged (else PLAN §3.5's provisional set): junk {11, 12, 14},
   superseded resubmission {100}. For each, look at the actual answers and confirm or
   overturn with written evidence; check the rest of the 185 for anything P10's
   heuristics missed (near-empty rows, profile-only rows are NOT junk — non-response
   is legal). ID 12 is redacted: adjudicate on answer content alone, never guess at
   identity. **Expected outcome: exactly {11, 12, 14 junk; 100 superseded} unless you
   find real evidence otherwise — deviations are findings, flag them loudly.**
3. `scripts/analytics/test_org_audit.py` — port structural checks (header, ids
   integer/unique/sorted, coverage == all named respondents, no redacted respondent
   present, closed vocabulary, confidence ∈ {high,medium,low}, basis non-empty ≤200)
   + ≥8 spot fixtures from your most consequential calls + exclusions.csv checks
   (reasons ∈ {junk, superseded}, evidence non-empty).

## Guardrails

- Touch ONLY `electricity-consequential/reference/org_audit.csv`,
  `electricity-consequential/reference/exclusions.csv`,
  `electricity-consequential/scripts/analytics/test_org_audit.py`.
- No web browsing. No redacted respondent in org_audit.csv (redacted → not named →
  not auditable; ID 12 appears only in exclusions.csv).
- `python3 electricity-consequential/scripts/validate_dataset.py` must still pass
  (you touched nothing it checks).

## Acceptance

PLAN.md §9 (items 1, 6, 7). Report: the claimed × audited_class matrix, the 10 most
consequential reclassifications with their basis strings, the final exclusion ruling
with evidence, and confidence distribution. Commit in your worktree. No push, no PR.
