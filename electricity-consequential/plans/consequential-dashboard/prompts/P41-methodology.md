# P41 — Methodology page (Wave 3, Lane F)

**Model:** claude-opus-5 · **Runs in parallel with:** P30–P34 · **Needs:** P02 + P22
merged
**Lane:** `wave3/p41-methodology` (worktree; commit only — the manager merges and pushes)

## Task

Build `electricity-consequential/frontend/methodology.html` — the site's methods,
caveats and reproduction reference. Read PLAN.md §4 "methodology.html" spec, §2 (every
gotcha becomes a documented caveat), §6 (the pipeline you are documenting), and this
hub's `README.md` (P02's; don't duplicate it — link and summarize).

## Sections

1. **Provenance & build chain** — the raw export (name, date, dimensions, sha1), the
   consultation PDF, the build pipeline stages, and the strict mechanical/editorial
   separation (build_dataset.py vs survey_meta.py vs question_labels.csv).
2. **Question identity** — the Q018…Q052 / Q026_1…Q026_9 scheme, the malformed-header
   tolerance, absent Q1/2/7/8, the display convention.
3. **The analytical base** — 185 raw → 181 analytical: the junk-detection criteria
   (with the actual evidence strings), the resubmission rule, the adjudication trail
   (P10 candidates → P20 ruling → P22 enforcement), and the disclosure principle (raw
   data never modified; excluded rows fully visible on integrity.html).
4. **Constructs & arithmetic** — `req_level` as ordered stringency (not sentiment);
   polarity declarations for binaries; specials never netted; scoreboard own-base
   netting with a worked example (SCED–locational: 48/69 vs 12/57); ladder definitions
   for Q43/Q45; the fine-vs-coarse binning rule.
5. **Theme coding** — the closed taxonomy, multi-label coding, template propagation,
   dedup-adjusted counts, coverage %, and where human judgment enters (link the
   taxonomy doc).
6. **Privacy & masking** — the 4-dim coarse segment vocabulary and why (n=185), the
   n<5 sentinel, redaction handling (Redacted/Not provided, never nulls, never names).
7. **Limitations** — self-selected sample; US-heavy (56%); attrition 165→36; thin Q52
   evidence base; template coordination; consultation ≠ referendum; what this site can
   and cannot support.
8. **Reproduction** — every command, in order, actually executed by you before
   documenting (build → validate → derive → export → validate-frontend → serve), with
   expected check counts.

## Guardrails

Touch ONLY `electricity-consequential/frontend/methodology.html` (an inline
`<script>` for small dynamic stamps is fine — no separate page module needed unless
you want one, in which case `js/methodology-page.js` is yours too). No shared-file
edits; no nav edits. Design-system law; long-form sections use `article.css` styles.

## Acceptance

PLAN.md §9. Served, zero console errors. Every documented command was actually run and
its output matches what you document (paste the tally lines in your report).
Screenshots 1440/390. Commit in your worktree. No push, no PR.
