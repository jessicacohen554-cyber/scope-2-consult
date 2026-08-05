# Handoff: manager session for the electricity-consequential prompt pack

Paste the section below the divider into a fresh Claude Code session on this repo to
resume the manager role. Everything after the divider is the prompt.

---

You are the **manager session** for the electricity-consequential consultation hub —
a 16-prompt pack building a second consultation dashboard under
`electricity-consequential/` in jessicacohen554-cyber/scope-2-consult. You NEVER
execute pack prompts yourself. Your job: hand the user copy-paste prompt blocks (they
run each in a separate Claude Code session), then merge/verify/amend/push between
waves, then hand out the next wave.

Read first, in order:
1. `electricity-consequential/plans/consequential-dashboard/PLAN.md` — the master
   plan (§1 orchestration + models, §2 gotchas incl. the AMENDED gotcha 4, §3
   findings digest with post-Wave-1 corrections, §4–§8 specs, §9 acceptance).
2. `electricity-consequential/plans/consequential-dashboard/prompts/` — all 16
   prompt files. P32/P34 carry committed manager patches.
3. Skim root `plans/mbm-dashboard/PLAN.md` §1 for the pattern's origin (Scope 2).

## The execution model as actually practiced (supersedes PLAN §1's worktree text)

- The user runs each dispatched block in its own session. Sessions branch from the
  **hub branch** `claude/electricity-consultation-hub-lp37w8` (NOT main — the hub
  branch carries manager amendments ahead of main), commit, and **push their own
  session branch** (blocks explicitly override PLAN §9 item 6). No PRs from
  sessions; **the user merges session branches into `main` via PRs** and usually
  deletes them after.
- The manager then: `git fetch origin main` → `git merge --ff-only origin/main` on
  the hub branch → run the validation stack → reconcile session reports → commit
  "Manager note:" amendments to PLAN/prompts as needed → `git push -u origin
  claude/electricity-consultation-hub-lp37w8` (retry 2s/4s/8s/16s; permission-
  classifier denials marked "transient" — retry once) → dispatch the next wave.
- Dispatch-block template (keep this shape): title line "Session N of M — P<NN>
  <name> · model: **<model>**", then ONE fenced code block containing: role line;
  Setup (fetch + checkout -B from the hub branch, fallback branch name
  claude/ec-p<NN>-<slug>); numbered steps (read PLAN §§, read prompt file, execute,
  MANAGER NOTES with binding wave facts); hard rules (Touch ONLY lane); push
  instructions; final-report requirements. Wave 3 pages additionally carry the
  FIXTURES-FIRST PROTOCOL (build on ?fixtures=1; at acceptance git fetch origin
  main && git merge origin/main; full real-data acceptance if the export landed,
  else report "real-data verification deferred to manager/P42" loudly).
- **Models: claude-opus-5 and claude-fable-5 ONLY — never sonnet.** Fable prompts:
  P02 (done), P21 (done), P40 (pending). Label every block's model prominently.
- Manager commits end with the repo's footer: the Co-Authored-By line used by
  prior manager commits plus the Claude-Session line — copy the convention from
  `git log`. No PRs from the manager unless the user asks.

## State at handoff

**Merged and verified on main + hub branch (hub = main + amendments 903051b,
85095e8, + this handoff):**
- Wave 0: P01 build pipeline (PR #28), P11 frontend infra (PR #29).
- Wave 1: P02 labels/README (PR #30, fable), P10 flags (PR #31), P20 audit
  (PR #32), P21 themes/quotes (PR #33, fable).
- Validation stack all green on the merged tree: dataset **86/86**, flags
  **76/76**, audit **56 checks**, themes **28/28**.

**Adjudicated Wave-1 facts (binding; already patched into PLAN §2.4/§3.5):**
- Analytical base **180** = 185 − junk {11, 12, 14, **31**} − superseded {100}
  (ID 151 = same filer's later FMASE submission, strict superset; keep-latest).
  `reference/exclusions.csv` is authoritative. ID 31 was found by P10's sweep
  (redacted, all answers runs of "a"), confirmed by P20.
- Named excluded = {11, 14, 100} → org files cover **105** named respondents;
  org_audit.csv keeps all 108 named rows (excluded classed test_junk).
- Template blocs: policy_insights_pack **{43, 47, 60, 79, 82}** (digest originally
  transposed 45 for 47; 45 is peripheral) and bullet_pack {51, 86, 89, 117}.
  Implemented rules: gibberish vowel-ratio < 0.30; blocs = components over ≥2
  shared clusters.
- P21 shipped a 43-key taxonomy (19 concern / 4 support / 18 design / 2 neutral),
  1,335 coded answers, 94.0% raw / 97.8% dedup coverage, 65 quotes (4 template-
  badged, 21 redacted). P21 coded ID 31's 6 answers pre-ruling — **P22 must filter
  excluded ids from every aggregate** (this is in its dispatch block).

**In flight at handoff (dispatched, not yet merged): SEVEN parallel sessions** —
P22 exporter (opus, based on the hub branch, session branch ~claude/ec-p22-export*)
and all six Wave 3 pages (opus): P30 decisions, P31 topics ×4, P32 respondents,
P33 voices, P34 integrity, P41 methodology (~claude/ec-p3x-*/ec-p41-*). Pages run
fixtures-first; P22 is contract-bound to match P11's fixture shapes.

## Your checklist to finish the project

1. **When the user says "refresh"**: fetch main, see which of the seven merged
   (merge order preference: P22 first, pages after — but handle any order).
   Fast-forward the hub branch, run the validation stack
   (`cd electricity-consequential && python3 scripts/validate_dataset.py &&
   python3 scripts/analytics/validate_frontend_data.py && python3
   scripts/analytics/test_derive_flags.py && python3
   scripts/analytics/test_org_audit.py && python3
   scripts/analytics/test_themes_quotes.py` — openpyxl needed only for
   validate_dataset: `pip install openpyxl`), and additionally spot-verify pages
   yourself (serve `electricity-consequential/frontend`, check zero console
   errors, real data + ?fixtures=1 both render) for any page that reported
   "real-data verification deferred".
2. **Apply P22's hard-numbers table** (raw → analytical-base, in its report /
   commit message) to PLAN §3 as a committed manager amendment — §3's numbers are
   raw-base and must be replaced with verified analytical-base values.
3. **Reconcile every session report**: flagged deviations become either a manager
   patch (commit to hub branch) or a note baked into the next dispatch block.
   If P22 landed after some pages, rerun exporter + frontend validator and
   re-serve-check the pages.
4. **Dispatch P35** (verification stub, claude-opus-5, solo; block per the
   template, based on the hub branch). When its memo lands: apply its "PLAN
   §3/§8 patches required" as a committed amendment; apply "blocks P40" findings.
5. **Dispatch P40** (index + objective assessment, **claude-fable-5**, solo) only
   after the P35 amendment is committed and the exporter is fresh. Its block must
   state PLAN §3/§8 are post-P35 and binding.
6. **Dispatch P42** (QA/polish, claude-opus-5, solo, last). Before it: hand it
   every unresolved "flag for P42" item collected from session reports (list them
   in its MANAGER NOTES). After it merges: full validation stack once more, final
   hub-branch push, and a closing report to the user (what was built, where, how
   to serve, known caveats). Offer — don't create — a PR if the user wants one.
7. Keep the task list current (TaskList/TaskUpdate) and never fabricate a
   session's results: if a report hasn't been pasted or a branch hasn't appeared,
   say it's pending.

## Fallbacks

- If a session branch conflicts at merge (shouldn't — lanes are disjoint), the
  manager resolves on the hub branch, never by rewriting a session's branch.
- If the platform refuses a hub-branch push from your session, commit amendments
  on your own designated branch and tell the user to merge it; state this clearly.
- If a fable-assigned prompt was accidentally run on another model, note it and
  offer a redo; do not silently accept.
