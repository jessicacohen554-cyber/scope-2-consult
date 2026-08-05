# P35 — Exploration stub: digest verification + viz check (Wave 3.5)

**Model:** claude-opus-5 · **Solo; runs any time after P22, before P40 launches** ·
**Needs:** P22 merged (real `frontend/data/`)
**Lane:** `wave3half/p35-verification` (worktree; commit only — the manager merges)

## Status: STUB — deliberately underspecified

This prompt exists because the plan's findings digest (PLAN.md §3) was computed on the
raw base during planning, and because presentation decisions read differently against
real data than on paper. Explore, verify, screenshot, and write a memo to
`electricity-consequential/plans/consequential-dashboard/notes/P35-verification-memo.md`.
**Do NOT ship page changes.** The Scope 2 precedent (its P35) found two content errors
and a ninth bloc this way — hunt for surprises, not confirmation.

## Questions to explore (add your own)

1. **Digest verification.** Recompute every PLAN §3 number on the analytical base
   (181) from the db and the exported JSON. Produce the §3-replacement table: raw →
   analytical, flagging every value that moves enough to change a sentence. Check the
   org-type × Q19 table, the redaction splits (does the Q21 flip survive exclusion?),
   the matrix nets, the scoreboard tallies, the attrition sequence.
2. **The §8 essay brief.** Does any claim in PLAN §8 fail against real data? (The
   Scope 2 P35 caught exactly this.) Specifically test: "redacted lean conservative"
   across ALL stance questions (not just the three cited); "requiredness and
   feasibility rank almost identically" (compute the rank correlation); "clear winners
   exist per scoreboard family" (are the winners robust to dedup?); the Q19 theme
   split promised in §8.2 (do P21's codes actually partition the No side?).
3. **Coordination beyond the two packs.** Any vector-identical stance fingerprints
   (Q19/21/24/31/33 + matrix) shared by ≥3 respondents? Any near-duplicate free texts
   under the 200-char cluster floor that matter? Korean-cluster candidates among the
   6 KR respondents?
4. **Viz reality-check on dev pages only** (a `dev-viz.html` copy is legal, linked
   from nowhere): does the 9×3 matrix read at 390px? Do the paired scoreboards
   mislead when bases differ by 12 (69 vs 57) — is the own-base annotation loud
   enough? Is the required-vs-feasible dumbbell legible or does it need a table?
   Screenshot alternatives side by side.
5. **Small-n masking in practice.** With the 4-dim vocabulary, how many segment cells
   are actually masked per stance question? If org_type_5 × Q33 (n=78) is mostly
   sentinel, flag which panels should drop the toggle rather than render a mask farm.

## Memo format

Headline findings first (content corrections outrank chart advice); then one section
per question with a verdict table (options ranked, Winner/Rejected), a one-line ranked
recommendation, and an S/M/L effort tag; then "PLAN §3/§8 patches required" as exact
replacement text the manager can apply; then "cheap wins for P42" ordered by
value÷effort; then "contract additions requested" (fields P22 should add, if any).

## Guardrails

Read-only with respect to shipped pages, exporters, and data. You may add ONLY the
memo, screenshots under `plans/consequential-dashboard/notes/p35-screens/`, and an
unlinked `frontend/dev-viz.html`. `git diff --stat` in your report proves the
boundary.

## Acceptance

The memo, with embedded screenshot references, the §3 replacement table, and explicit
"blocks P40: yes/no" per finding. Commit in your worktree. No push, no PR.
