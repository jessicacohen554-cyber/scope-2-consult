# P34 — Integrity & evidence page (Wave 3, Lane F)

**Model:** claude-opus-5 · **Runs in parallel with:** P30–P33, P41 · **Needs:** P11 +
P22 (audit block may be `provisional:true` until P20 merges — render a provisional
banner in that state; test by temporarily renaming integrity.json, then restore)
**Lane:** `wave3/p34-integrity` (worktree; commit only — the manager merges and pushes)

## Task

Build `electricity-consequential/frontend/integrity.html` — data quality, coordination,
and the evidence base. Read PLAN.md §4 "integrity.html" spec, §3.5–3.6, §5
(`integrity.json`), §2 gotchas 4 and 15. This page names names; read the Tone rules
below twice.

## Panels

1. **Junk/test respondents** — the four excluded junk rows (IDs 11, 12, 14, 31) with their
   evidence strings shown verbatim ("e" ×24, "asdf"…), the detection criteria, the
   adjudication trail, and the exclusion policy statement (raw data untouched;
   analytical base 180).
2. **The resubmission** — IDs 100 → 151 side-by-side: same named individual, which
   answers changed (from `integrity.json.resubmission.changed`), keep-latest rule.
3. **Entity families** — Engie Impact ×2 (+ any others): both counted, grouped, why
   that differs from a duplicate.
4. **Template blocs** — bloc cards for the two packs: named members, redacted counts,
   shared-text counts, covered questions, and the **dedup-effect panel**: Q19/Q21
   overall strips raw vs deduped side by side (expect small but visible shifts —
   print both numbers).
5. **Redaction** — the 41.6% rate, the gradient by org type, and the named-vs-redacted
   stance skew (paired strips; note the Q21 flip and the Q45 coarse lean).
6. **The evidence base** — Q52's table (n=36, 5 "N/A"; attribution + preview per row);
   citation-mining results: citing-respondent rates by org type / redaction / Q19
   stance; the domain-classification table; template-propagated citations. Headline
   the asymmetry honestly: whichever side cites more, say so, with the template caveat.
7. **Cross-consultation panel** — respondents present in both consultations, via
   read-only queries against the ROOT Scope 2 db (`data/scope2_consultation.sqlite`):
   match named orgs (normalized) across the two respondent tables — expect SEMI,
   NorthBridge, Engie entities, Ever.green/EnergyTag-adjacent actors; show only
   respondents **named in both** datasets, with links to both hubs' profiles where
   they exist. If the join yields fewer than 5 solid matches, render the panel as a
   note instead of a table — do not pad.
8. **Caveat box** — what this page can and cannot claim: redacted ≠ hiding; template
   ≠ invalid (coordinated positions are legal consultation behavior); junk exclusion
   criteria are mechanical and disclosed; n=185 self-selected.

## Tone rules

Facts, not accusations. Every named claim traces to visible data on this page.
Coordination is described ("submitted matching text") never characterized ("astroturf").
Redacted respondents are counted, never guessed at. The junk respondents are shown as
data-quality records, not mocked.

## Guardrails

Touch ONLY `electricity-consequential/frontend/integrity.html` and
`electricity-consequential/frontend/js/integrity-page.js` (new). The cross-consultation
join is not in P22's export: run it yourself as a one-off read-only script against
BOTH sqlite files (root `data/scope2_consultation.sqlite` + this hub's db), inline the
resulting match list into `integrity-page.js` as a static constant, and preserve the
exact query in a docstring above it for reproducibility. Read-only means read-only —
nothing at the repo root is modified, and no files are added outside your two. No
shared-file edits; no nav edits. Design-system law applies in full.

## Acceptance

PLAN.md §9. Served, zero console errors, fixtures + real data; provisional-audit
banner logic works; dedup-effect numbers match integrity.json; cross-consultation
matches listed with both-named rule respected. Screenshots 1440/390. Commit in your
worktree. No push, no PR.
