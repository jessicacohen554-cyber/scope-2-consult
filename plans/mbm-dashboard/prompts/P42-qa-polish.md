# P42 — QA, nav unification & polish (Wave 5, final)

**Model:** claude-opus-5 · **Sequential — runs alone, last** · **Needs:** everything merged
**Branch:** `claude/mbm-p42-qa`

## Task

Final integration pass over the whole site. You are the only session permitted to edit
`nav.js`/`shared-footer.js` after Wave 1, and the only one allowed to touch other lanes'
pages (for fixes, not redesigns). Read PLAN.md §4, §7, §9; read P35's memo if it exists
and apply its cheap wins.

## Checklist

1. **Nav & footer final**: every page present in `NAV_ITEMS` (mega-menu per PLAN §4),
   `isActive()` correct on every page incl. `proposals/` subpages; FOOTER_LINKS mirrors;
   no dead links anywhere (crawl all hrefs with a script).
2. **Data freshness**: rerun `export_frontend.py` + `validate_frontend_data.py`;
   confirm `audit.json` is not provisional; quotes present for all 9 levers;
   `python3 scripts/validate_dataset.py` all pass (27/27 as of this writing).
3. **Design-system compliance audit**: grep all pages/site JS for hardcoded hex,
   font-family literals, inline styles on shared components; verify verbatim files
   byte-identical to their last Wave-0 state (`git log --follow` / diff against P11's
   merge); `.header-accent` present on every page; ≤2 emphasis-callouts per page.
4. **Playwright sweep**: every page at 1440px and 390px, plus interaction states
   (heatmap popover, each segment dimension once, org profile expanded, one proposal
   page per template variant). Fix overflow, collision, unreadable contrast. Save the
   screenshot set to `plans/mbm-dashboard/notes/qa-screens/`.
5. **Accessibility pass**: keyboard-only walk of toggles/popovers/table; aria-labels on
   heatmap cells; `.sr-only` data tables next to every canvas chart; contrast of heatmap
   ramps (use `-text` token variants for cell text).
6. **Consistency**: number formats (percent 1dp, means 2dp), base-n footnotes on every
   panel, identical oppose/neutral/support color semantics across all pages,
   redaction-attribution format uniform.
7. **Performance**: total transfer per page < 2 MB excluding fonts/bg (check network
   panel); org JSONs lazy-load only.
8. **Content spot-audit**: 15 random numbers traced page → JSON → SQLite; every index
   essay link lands on its intended panel.
9. Update `frontend/README.md`: page map, data regeneration commands, fixtures mode.

## Acceptance

The full checklist with evidence in your report (crawler output, validator output,
screenshot dir listing, the 15-number trace table). Commit + push
`claude/mbm-p42-qa`. No PR unless the user asks.
