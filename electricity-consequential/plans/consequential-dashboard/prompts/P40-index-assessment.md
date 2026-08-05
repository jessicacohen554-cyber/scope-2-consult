# P40 — Overview & objective assessment (Wave 4)

**Model:** **claude-fable-5** (the highest-judgment editorial task in the project; run
on opus-5 only if fable-5 is unavailable, and say so in your report) · **Solo —
runs alone** · **Needs:** ALL Wave 3 merged + P35's memo applied (the manager patches
PLAN §3/§8 first) + exporter rerun with P20/P21 inputs
**Lane:** `wave4/p40-index` (worktree; commit only — the manager merges and pushes)

## Task

Build `electricity-consequential/frontend/index.html`: hero stats, headline charts,
takeaway cards, and — the core of this prompt — the **objective assessment** essay.
PLAN.md §8 is the normative content brief: follow its 8-section structure. Read PLAN §3
in full **as patched post-P35** (your evidence base), §4 "index.html" spec, the P35
memo itself, and skim every shipped page so each claim can link to its panel.

## The essay — standards

- **Every factual claim links** to a specific panel on decisions/topics/voices/
  respondents/integrity pages (anchor links). No unlinked numbers.
- **Verify before asserting**: any statistic you state must exist in
  `frontend/data/*.json` (spot-check against the db where PLAN §3 gives the number).
  Do not import numbers from memory or from this prompt alone.
- **Symmetric skepticism** (§8.7): complexity serves the modeling industry; simplicity
  serves reporters with weak actions to defend. Name both. Coordination exists on
  identifiable blocs; redaction correlates with the conservative position — state both
  without insinuation.
- **Small n discipline**: every subgroup claim carries its n inline; nothing built on
  a masked (<5) cell; the attrition context (165 → 36) appears before any late-survey
  question is cited.
- **Consultation ≠ referendum** appears in section 1, and the essay never uses vote
  language ("wins", "majority rules") for what is a self-selected record.
- Named organizations appear only where the site already names them (blocs, audit,
  cross-consultation panel); redacted respondents never guessed at.
- Length: 1,200–1,800 words of body prose; section headings from §8; written for a
  smart reader who has not seen the data.

## Page structure

Hero stats row (185 respondents · 44 questions · 63% "formula not appropriate" ·
41.6% redacted · 36 evidence submissions — analytical-base values from meta.json).
Headline block: Q19/Q21/Q24 stance strips + the matrix's top and bottom rows
(regulatory vs first-of-its-kind) via the shared renderers. The essay as article
sections with `.scroll-reveal`, one `.emphasis-callout` maximum (candidate: "A formula
without consent, tests with a gradient, and a field that answered 'not yet'" — or your
sharper formulation). Takeaway cards linking all nine other pages. Keep the standard
head-include recipe.

## Guardrails

Touch ONLY `electricity-consequential/frontend/index.html` (+
`electricity-consequential/frontend/js/index-page.js`, new). No nav edits. No
shared-file edits. Design-system law — the essay uses `article.css` long-form styles.

## Acceptance

PLAN.md §9. Served, zero console errors; every essay link resolves (click each);
screenshots 1440/390 full-page. A second read-through specifically for balance: would
a reasonable member of *each* camp — a hedge-fund-backed modeler, a reporting
sustainability lead, a granularity skeptic, an hourly advocate — call it fair? Adjust
until yes. Commit in your worktree. No push, no PR.
