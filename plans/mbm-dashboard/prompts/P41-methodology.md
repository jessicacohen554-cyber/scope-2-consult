# P41 — Methodology page (Wave 4)

**Model:** claude-sonnet-5 · **Runs in parallel with:** P40 · **Needs:** P22 (final rerun)
**Branch:** `claude/mbm-p41-methodology`

## Task

Build `frontend/methodology.html` per PLAN.md §4 spec. Sources: root `README.md`
(provenance + caveats — reuse its substance, not verbatim walls of text), PLAN §2
gotchas, §6 derived-field definitions, `scripts/analytics/` docstrings.

## Sections

1. **Data provenance**: the GHG Protocol raw export (link), build pipeline
   (`build_dataset.py` → tidy tables → `analytics/` → JSON), counts from
   `data/manifest.json`.
2. **Question taxonomy**: method/category/policy_lever/asks_for axes with one example
   each; the 27-section caveat (our grouping, not GHG Protocol's).
3. **Scale directions table**: every construct with anchors and the "never pool"
   warning; the Q130 non-monotonic-label footnote.
4. **Derived fields, defined precisely**: template flag (≥3 shared ≥200-char normalized
   strings with ≥2 others), text/vector clusters, blocs, entity families, citation
   signals + domain classes, audited-class vocabulary with definitions, quote-curation
   criteria (from P20/P21 prompt specs — cite them as
   `plans/mbm-dashboard/prompts/P2*.md`).
5. **Known limitations**: self-selection and mobilization; redaction bias (named-only
   reads skew supportive); response-rate variation (divide by n); free-text org names;
   truncated answers; Q183 protest years; what the legitimacy audit cannot claim
   (mirror P34's caveat box).
6. **Reproduce it**: exact commands (`python3 scripts/build_dataset.py`,
   `python3 scripts/analytics/derive_flags.py`, `export_frontend.py`,
   `validate_frontend_data.py`, serve command).

## Guardrails

Touch ONLY `frontend/methodology.html`. Prose page — solid `.card` panels, no charts
required. Design system law. No nav edits.

## Acceptance

PLAN.md §9 (validator + served render + screenshots). Every command in §6 actually runs
— execute each one. Commit + push. No PR.
