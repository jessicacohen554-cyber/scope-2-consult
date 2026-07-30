# P40 — Overview & Objective Assessment (Wave 4)

**Model:** **claude-fable-5** (fallback: claude-opus-5) · **Runs in parallel with:** P41
**Needs:** ALL Wave 3 merged + exporter rerun with P20/P21 inputs
**Branch:** `claude/mbm-p40-index`

## Task

Rebuild `frontend/index.html` as the site's landing page: hero stats, the headline
7-anchor diverging chart, takeaway cards, and — the core of this prompt — the
**objective assessment** essay. PLAN.md §8 is the normative content brief: follow its
9-section structure exactly. Read PLAN §3 in full (your evidence base), §4 index spec,
and skim every shipped page so each claim can link to its chart.

## The essay — standards

- **Every factual claim links** to a specific panel on heatmap/respondents/evidence/
  integrity/proposal pages (anchor links). No unlinked numbers.
- **Verify before asserting**: any statistic you state must exist in `frontend/data/*.json`
  (spot-check against the db where PLAN §3 gives the number). Do not import numbers from
  memory or from this prompt alone.
- **Symmetric skepticism**: the support side's citation advantage AND its template
  propagation + vendor interest; the opposition's operational-evidence weight AND its
  redaction pattern + REC-investment interest. The §8 verdict framing — "the support
  side brings more research; the opposition brings more operational evidence; neither is
  disinterested" — is the calibration, in your own words.
- **Hedge small n** explicitly (Financial n=7–8, Government n=8–14, vendors n≈20).
- **Consultation ≠ referendum** appears early: self-selected, mobilized, redaction-skewed.
- Named organizations appear only where the site already names them (blocs,
  reclassifications); redacted respondents never guessed at.
- Length: 1,200–1,800 words of body prose; section headings from §8; written for a
  smart reader who hasn't seen the data.

## Page structure

Hero stats row (1,072 · 70,089 answers · 53.5% redacted · 7 proposals), the diverging
bar (S2Viz), the essay as article sections with `.scroll-reveal`, one
`.emphasis-callout` maximum ("Requirements rejected, escape hatches embraced" or your
sharper formulation), then takeaway cards linking every dashboard + the 9 proposal pages.
Keep the existing head-include recipe (Chart.js already wired by P11).

## Guardrails

Touch ONLY `frontend/index.html` (+ `frontend/js/index-page.js` if needed). No nav
edits. Design system law — the essay uses `article.css` long-form styles.

## Acceptance

PLAN.md §9. Served, zero console errors; every essay link resolves (click each);
screenshots 1440/390 full-page. A second read-through of the essay specifically for
balance: would a reasonable member of *each* side call it fair? Adjust until yes.
Commit + push. No PR.
