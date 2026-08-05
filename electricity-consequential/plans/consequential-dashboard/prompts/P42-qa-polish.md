# P42 — QA, nav unification & polish (Wave 5, final)

**Model:** claude-opus-5 · **Solo — runs alone, last** · **Needs:** everything merged
**Lane:** `wave5/p42-qa` (worktree; commit only — the manager merges and pushes)

## Task

Final integration pass over the whole hub. You are the only session permitted to edit
`nav.js`/`shared-footer.js` after Wave 0, and the only one allowed to touch other
lanes' pages (for fixes, not redesigns). Read PLAN.md §4, §7, §9; read the P35 memo
and apply its cheap-wins list; read every Wave 3/4 session report the manager gives
you for flagged gaps. The Scope 2 pack specified this wave and never ran it — its
known bugs shipped. This one runs to completion.

## Checklist

1. **Nav & footer final**: every page present in NAV_ITEMS per PLAN §4 (incl. the
   About group: Methodology, "Scope 2 companion hub" cross-link, dataset README on
   GitHub); `isActive()` correct on every page incl. `topics/` subpages;
   FOOTER_LINKS mirrors nav; crawl every href on every page with a script — zero dead
   links. The cross-link points at the root hub in a way that works when the repo is
   served from its root AND degrades to the GitHub README link otherwise — pick the
   implementation, document it in the code.
2. **Data freshness**: rerun `export_frontend.py` + `validate_frontend_data.py`;
   confirm no `provisional` flags remain; themes/quotes present for all four topics;
   `python3 electricity-consequential/scripts/validate_dataset.py` all green; every
   analytics test script (`test_derive_flags`, `test_org_audit`,
   `test_themes_quotes`) green.
3. **Design-system compliance audit**: grep all pages/site JS for hardcoded hex,
   font-family literals, inline styles on shared components; verify the copied
   verbatim shell files are byte-identical to the root-hub copies (hash table);
   `.header-accent` on every page; ≤1–2 emphasis-callouts per page.
4. **Playwright sweep**: every page at 1440px and 390px plus interaction states
   (matrix cell popover open, each segment dimension once on decisions.html, org
   profile expanded, one topic page per config, voices filters engaged). Fix
   overflow, collision, unreadable contrast. Save the set to
   `plans/consequential-dashboard/notes/qa-screens/`.
5. **Accessibility pass**: keyboard-only walk of toggles/popovers/org table;
   aria-labels on matrix cells; `.sr-only` tables beside every canvas; ramp contrast
   via `-text` token variants; `prefers-reduced-motion` respected.
6. **Consistency**: number formats (percent 1dp, nets signed), base-n chip on every
   panel, polarity color semantics identical across all pages, specials always
   grayed/segregated, attribution format uniform, junk/superseded absent everywhere
   outside integrity.html.
7. **Performance**: total transfer per page < 2 MB excluding fonts/bg; org JSONs
   lazy-load only.
8. **Content spot-audit**: 15 random numbers traced page → JSON → SQLite (paste the
   trace table); every index-essay link lands on its intended panel.
9. Update `electricity-consequential/frontend/README.md` (create it): page map, data
   regeneration commands, fixtures mode, design lineage. Fix any stale spots in this
   hub's DESIGN_SYSTEM.md copy.

## Acceptance

The full checklist with evidence in your report (crawler output, validator outputs,
hash table, screenshot dir listing, the 15-number trace). Commit in your worktree. No
push (the manager makes the final push), no PR unless the user asks.
