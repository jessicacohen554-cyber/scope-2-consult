# P11 — Frontend infra: shell copy, renderers, fixtures (Wave 0, Lane F)

**Model:** claude-opus-5 · **Runs in parallel with:** P01 · **Blocks:** all Wave 3 pages
**Lane:** `wave0/p11-frontend-infra` (worktree; commit only — the manager merges and pushes)

## Task

Stand up `electricity-consequential/frontend/` — the design-system shell plus this
site's component layer — working entirely against hand-written fixtures (P22's real data
does not exist yet). Read PLAN.md §4 (architecture), §5 (data contract — you implement
the consumer side and author fixtures for every shape), §7 (infra spec) first; then root
`frontend/DESIGN_SYSTEM.md` (**law**), root `frontend/templates/page-template.html`,
and skim root `frontend/js/likert-viz.js` + `styles/site.css` — your salvage sources.

## Deliverables

1. **Shell copy** (PLAN §7): the 3 shared CSS files + 4 shared JS files byte-identical
   from root `frontend/`; `assets/cinematic-bg.png` reused; `js/cinematic-bg.js`
   copied; `templates/page-template.html` adapted (site title, corrected head-include
   list); `DESIGN_SYSTEM.md` copied with the head-include list fixed to match reality
   (site.css + site modules included) and a provenance line added.
2. `js/nav.js` — NAV_ITEMS/NAV_BRAND for this site (PLAN §4 nav; placeholder hrefs for
   pages that don't exist yet are correct behavior), NAV_BASE regex extended for
   `topics/` subpaths. `js/shared-footer.js` — FOOTER_LINKS mirroring nav +
   DEFAULT_NOTE naming the dataset. Everything else in both files verbatim.
3. Site modules, namespace `EC*` (PLAN §7): `js/data-loader.js` (`ECData` — port
   root S2Data; rename + fixtures switch), `js/segments.js` (`ECSegments` — 4-dim
   vocabulary from meta.json, URLSearchParams state, `segmentchange` events),
   `js/stance-viz.js` (`ECStance`: stance strips with polarity colors + grayed
   specials + n chips + popovers + masked hatching; paired diverging scoreboard with
   own-base percentages and specials sidebar; attrition strip; `srTable`),
   `js/matrix-viz.js` (`ECMatrix`: 9×3 stringency heatmap — sequential ramp, NEVER
   the support ramp (PLAN gotcha 5) — mini-matrix variant, required-vs-feasible
   dumbbell), `js/quote-cards.js` (`ECQuotes` + theme chips), `js/org-table.js`
   (`ECOrgTable` with stance-fingerprint chips), `styles/site.css` (`.ec-*` components,
   tokens only).
4. **Fixtures** — `frontend/data/fixtures/`: miniature hand-authored instances of EVERY
   PLAN §5 shape (meta with 2 segment dims fully populated + all 4 declared; 2 stance
   questions incl. one with a special option; 3 matrix tests + feasibility; 1 full
   scoreboard; themes for 2 questions; 4 quotes across for/against/context incl. one
   template badge + one redacted attribution; respondents.json with 3 org rows +
   attrition; 3 `fixtures/orgs/*.json`; integrity.json with 1 junk row, the
   resubmission shape, 1 bloc, 1 citation table) — enough to exercise every renderer
   path incl. `{"n":"<5"}` masks.
5. `dev.html` — harness page (linked from nowhere) rendering every component from
   fixtures; this is the smoke test all later waves use. Serve, zero console errors,
   Playwright screenshots 1440/390.

## Guardrails

- Touch ONLY `electricity-consequential/frontend/`. Nothing at the repo root; nothing
  in `electricity-consequential/{scripts,data,reference}/`.
- Verbatim shell files stay byte-identical to the root copies — prove with hashes in
  your report. Design-system law applies to every new component (tokens only, no
  hardcoded hex/fonts, the two glass recipes only, `.header-accent` mandatory).
- If a PLAN §5 shape is ambiguous when you implement the consumer, resolve it, note it,
  and **your reading wins** — P22 is instructed to match your fixtures. Report every
  such call loudly.

## Acceptance

PLAN.md §9 (items 3, 4, 5, 6, 7 — dataset validator N/A in your lane). Report: hash
table proving verbatim copies, the module APIs as implemented, every contract
reinterpretation (P22 must match), and the dev.html screenshot set. Commit in your
worktree. No push, no PR.
