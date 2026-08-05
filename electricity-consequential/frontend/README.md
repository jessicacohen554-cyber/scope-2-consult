# Frontend — Electricity-Sector Consequential Methods Consultation hub

A ten-page static dashboard over the GHG Protocol's Electricity-Sector
Consequential Methods public consultation. No build step, no framework, no
bundler: plain HTML, one stylesheet per layer, and a set of `EC*` JavaScript
modules that read pre-computed JSON out of `data/`.

Three documents govern this directory and outrank anything written here:

| Document | What it governs |
|---|---|
| [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) | Visual law: tokens, components, the verbatim-file rule, the fourteen rules for new pages. |
| [`../plans/consequential-dashboard/PLAN.md`](../plans/consequential-dashboard/PLAN.md) | §4 site architecture, §5 the data contract, §7 the module spec, and the fifteen environment gotchas in §2. |
| [`../README.md`](../README.md) | The dataset: tables, columns, caveats, rebuild instructions. |

---

## Serving it

`fetch()` does not work under `file://`, so the pages must be served:

```bash
cd electricity-consequential/frontend
python3 -m http.server 8000
# then open http://127.0.0.1:8000/
```

Two query parameters change what loads:

| URL | Effect |
|---|---|
| *(none)* | The real export in `data/`. |
| `?fixtures=1` | The hand-authored miniatures in `data/fixtures/` — every contract shape at toy scale, including masked cells, thin-n cells and special options. Lets a page be worked on without the pipeline. |
| `?dim=<key>` | Pre-selects a segment dimension on pages with the toggle: `org_type_5`, `country_4`, `redaction`, `responding_as`. |

The pages also read filter state from the URL (`?qtopic=`, `?qorg=`, `?qtheme=`
on the voices page, and the org browser's search and sort), so any view a reader
reaches by clicking is a link they can share.

---

## Page map

| Page | Prompt | What it holds |
|---|---|---|
| `index.html` | P42 (see note) | Hero stats, the three closed questions, the additionality gradient at its poles, the objective assessment, cards to every other page. |
| `decisions.html` | P30 | The Decision Board: stance strips, the additionality mini-matrix, the methodology roll-up, both granularity ladders, the attrition strip — all cuttable by four segment dimensions. |
| `topics/formula.html` | P31 | Consultation §5–6, Q18–Q25. The headline formula question and its coded explanations. |
| `topics/additionality.html` | P31 | Consultation §7, Q26–Q34. The 9 × 3 stringency matrix and the required-vs-feasible cross. |
| `topics/emission-rates.html` | P31 | Consultation §8, Q35–Q46. Operating- and build-margin scoreboards, and the granularity ladders in full. |
| `topics/weighting.html` | P31 | Consultation §9, Q47–Q52. The weighting scoreboard, where the specials outpoll the named approaches. |
| `voices.html` | P33 | Theme taxonomy, the filterable quote browser, the template packs as documents, verbosity distribution. |
| `respondents.html` | P32 | Who filed: type × redaction, country, sector, the attrition funnel, the named-org browser, and the named-vs-redacted and US-vs-rest stance comparisons. |
| `integrity.html` | P34 | Excluded submissions, the resubmission diff, response packs, the redaction gradient, citation mining, cross-consultation overlap. |
| `methodology.html` | P41 | Provenance, constructs, arithmetic rules, the privacy mask, limitations, reproduction commands. |

Two unlinked development harnesses also live here and are not part of the site:
`dev.html` (renders every component from fixtures — the smoke test) and
`dev-viz.html` (P35's narrow-viewport comparison of three additionality-matrix
layouts). Neither is in the nav, and neither is held to the page rules.

> **Note on `index.html`.** PLAN §4 assigns the overview page and its assessment
> to **P40**. P40 never merged — at P42 the file did not exist on any branch, so
> `Overview` 404'd from every page in the site. P42 built it to the §4 and §8
> briefs rather than ship a hub with a broken front door. The prose in the
> assessment section is the part to review first, and it deliberately uses only
> figures that can be sourced from `data/*.json`; several claims in the §8 brief
> rest on stance-conditioned theme splits and significance tests that are not in
> the contract, and those are stated qualitatively rather than with a number.

---

## Layout

```
frontend/
├── index.html · decisions.html · voices.html · respondents.html
├── integrity.html · methodology.html
├── topics/{formula,additionality,emission-rates,weighting}.html
├── dev.html · dev-viz.html          # unlinked harnesses
├── styles/
│   ├── shared.css     ← verbatim from the repo-root hub
│   ├── article.css    ← verbatim
│   ├── cinematic.css  ← verbatim
│   └── site.css         this hub's own components, all .ec- prefixed
├── js/
│   ├── shared-header.js · canvas-banners.js · scroll-observer.js
│   ├── chart-colors.js · cinematic-bg.js      ← all verbatim
│   ├── nav.js · shared-footer.js              ← shell files, site-specific lists
│   ├── data-loader.js  ECData     fetch + cache + fixtures switch + error panels
│   ├── segments.js     ECSegments the four-dimension toggle, URL-backed
│   ├── stance-viz.js   ECStance   strips, scoreboards, attrition, themes,
│   │                              popovers, sr-tables, token colors
│   ├── matrix-viz.js   ECMatrix   the 9 × 3 heatmap, the mini-matrix, the cross
│   ├── quote-cards.js  ECQuotes   quote cards and theme chips
│   ├── org-table.js    ECOrgTable the searchable named-respondent browser
│   └── <page>-page.js             one module per page, owns no figures
├── templates/page-template.html   the shell every page starts from
├── assets/cinematic-bg.png        ← verbatim, shared with the root hub
└── data/                          the export (see below) + fixtures/
```

`stance-viz.js` must load before `matrix-viz.js`: `ECMatrix` borrows `ECStance`'s
popover, token-color and screen-reader-table machinery. Chart.js is a plain
`<script src>` in `<head>`, never `defer` — `chart-colors.js` applies its
defaults on `DOMContentLoaded`. If the CDN fails, every canvas panel replaces
itself with an `.ec-empty` note pointing at the data table beneath it.

### Verbatim files

Nine files are byte-identical copies of the repo-root Scope 2 hub's, and stay
that way (DESIGN_SYSTEM.md rule 11). Verify before and after any change:

```bash
cd /path/to/scope-2-consult
for f in styles/shared.css styles/article.css styles/cinematic.css \
         js/shared-header.js js/canvas-banners.js js/scroll-observer.js \
         js/chart-colors.js js/cinematic-bg.js assets/cinematic-bg.png; do
  a=$(sha256sum "frontend/$f" | cut -d' ' -f1)
  b=$(sha256sum "electricity-consequential/frontend/$f" | cut -d' ' -f1)
  [ "$a" = "$b" ] && echo "ok   $f" || echo "DRIFT $f"
done
```

`nav.js` and `shared-footer.js` are shell-derived but deliberately not verbatim:
each carries this site's own link list at the top of the file, and nothing else
in them is edited.

---

## Regenerating the data

Nothing in `data/` is hand-edited. It is written by the exporter from the SQLite
database and the curation reference files, and it is deterministic — sorted keys,
fixed rounding, and `generated` taken from the source file's date in
`data/manifest.json` rather than the wall clock, so an unchanged input produces
byte-identical output.

```bash
# from the repository root
python3 electricity-consequential/scripts/analytics/export_frontend.py
python3 electricity-consequential/scripts/analytics/validate_frontend_data.py

# the other three checks that must also stay green
python3 electricity-consequential/scripts/validate_dataset.py
python3 electricity-consequential/scripts/analytics/test_derive_flags.py
python3 electricity-consequential/scripts/analytics/test_org_audit.py
python3 electricity-consequential/scripts/analytics/test_themes_quotes.py
```

Run the exporter twice and diff `data/` against itself to confirm determinism.
`validate_frontend_data.py` re-derives every published figure from the database
and fails loudly; it is the check that matters before anything is pushed.

### What the files hold

| File | Contents |
|---|---|
| `meta.json` | Totals, the four segment vocabularies, every question with its options and polarity, the matrix ladder, the scoreboard families. Every page loads this first. |
| `stances.json` | The seven stance questions as `SCELL`s, overall and by segment. |
| `matrix.json` | The nine additionality tests (`SCELL` of 3, plus `net_pct`) and the Q28 feasibility picks. |
| `scoreboard.json` | The three methodology families, each option with its own-base `net_pct` and both bases, specials listed separately. |
| `themes.json` | The coded-theme taxonomy and per-question counts, raw and template-deduplicated. |
| `quotes.json` | Curated verbatim quotes by topic and side, with attribution, theme keys and template badges. |
| `respondents.json` | Distributions, the attrition series, the named-vs-redacted and US-vs-rest stance comparisons, and the org index. |
| `orgs/{id}.json` | One profile per named analytical-base respondent, **lazy-loaded** — nothing under `orgs/` is fetched until a reader expands that row. |
| `integrity.json` | Exclusions, the resubmission, entity families, text clusters, response packs, the dedup effect, and the citation/evidence tables. |

`data/fixtures/` mirrors every shape above at toy scale. When the contract
changes, the fixtures change with it, or `?fixtures=1` silently stops exercising
the new path.

---

## The rules a change has to keep

These are not style preferences; they are how the site avoids saying something
false. PLAN §2 numbers them as gotchas.

1. **Every percentage carries its n.** Bases fall from 160 to 34 across this
   survey. A bare percentage is a misreading waiting to happen.
2. **Each question divides by its own base.** The two halves of a scoreboard
   pair have *different* denominators and both are always on screen. A net is
   the difference of the two displayed percentages, never a recomputation.
3. **Stringency is not sentiment.** The additionality matrix is painted with the
   sequential indigo ramp. `Required` is not approval. Support colors are only
   for questions that declare a `polarity` in `meta.json`.
4. **Specials are never netted.** "Unsure", "None", "All are feasible", "N/A"
   are their own segments, always neutral gray, never folded into a
   support/oppose reading.
5. **Small cells are not published.** A segment cell under five respondents is
   hatched and suppressed, not printed. Between five and nine it publishes
   counts and no percentage. Redacted respondents are never named, anywhere.
6. **Nothing on a page is a raw-base figure** except on `integrity.html` and
   `methodology.html`, where the 185 → 180 adjudication is the subject and is
   always labelled as such.
7. **Pages own no numbers.** A page module reads the export and renders it. If a
   figure is not in `data/`, the page says so rather than carrying a constant
   that can go stale.

---

## Accessibility

Every canvas has a visually-hidden data table beside it, so the numbers survive
without JavaScript-drawn pixels. Matrix cells are `role="gridcell"` with a full
aria-label and are reachable and openable by keyboard; popovers close on
`Escape`. Toggles are real `<button aria-pressed>` / `<button aria-expanded>`
elements. Ramp text uses the `-text` token variants to hold contrast, and
everything animated respects `prefers-reduced-motion: reduce`.

---

## Design lineage

The visual system comes from the `hourly-cfe-optimizer` dashboard by way of the
repo-root Scope 2 consultation hub: same tokens, same nav and footer mechanics,
same cinematic banner and parallax background. This hub adds one layer of its
own — `styles/site.css` and the `EC*` modules — for the components this survey
needs and Scope 2 did not: stringency matrices, paired own-base scoreboards,
granularity ladders and stance fingerprints. Nothing in `site.css` restyles a
`shared.css` class; where a shared component was close but not right, it gets a
modifier, not a fork.
