# Scope 2 Frontier — guidance learning site

A standalone, eight-page scrollytelling site on carbon capture (CCS/CCU), electricity
storage and impact (consequential) accounting under the GHG Protocol as it stands and
as the Scope 2 revision is taking shape (status as of 19 Oct 2026). Not tied to the
consultation explorer in `frontend/`.

Live on GitHub Pages: https://jessicacohen554-cyber.github.io/scope-2-consult/guidance-explainer/

Also published as a Claude artifact: https://claude.ai/artifact/Sv6kih1EPETLMRHk5TwWQM

## Layout

```
guidance-explainer/
├── BUILD-BRIEF.md          # rules every page-building shard followed
├── QA-BRIEF.md             # rules the verification shards followed
├── research/
│   ├── DOSSIER-FORMAT.md   # the dossier contract (tiers, verbatim quotes, INFERENCE / GAP labels)
│   ├── R1-lsrg-ccs-eac.md              # LSR Standard/Guidance on point-source capture; CCS-backed EACs
│   ├── R2-scope2-update-governance.md  # Oct 16 2026 update; governance; Scope 2 TWG vs AMI TWG; ISB
│   ├── R3-storage-hourly.md            # storage under hourly market-based accounting
│   ├── R4-consequential-ccus.md        # Statement 3 / impact accounting applied to CCUS
│   ├── QA-REPORT-A.md / QA-REPORT-B.md # verification findings and fixes
├── index.html, sources.html, 8 module pages   # the site itself (served by GitHub Pages)
├── styles/                    # shared.css, article.css, cinematic.css — verbatim copies of frontend/styles
├── js/                        # design-system modules; nav.js and shared-footer.js carry this site's links
├── assets/cinematic-bg.png    # circuit-board background
├── guidance.css               # this site's components (citation chips, tiers, callouts, scrolly, matrix)
├── site.js                    # scrolly steps, toggles, steppers, matrix, wide-figure scroll
└── template.html              # starting point for any new page
```

## Design

The site uses the repo's design system (`frontend/DESIGN_SYSTEM.md`): Plus Jakarta Sans and DM Sans, the navy palette, the animated banner, the cinematic circuit-board background, the injected nav and footer. `styles/*.css`, `js/shared-header.js`, `js/canvas-banners.js`, `js/scroll-observer.js` and `js/cinematic-bg.js` are verbatim copies; only `js/nav.js` (NAV_ITEMS, NAV_BRAND) and `js/shared-footer.js` (FOOTER_LINKS, DEFAULT_NOTE) are site-specific. `guidance.css` adds the learning-page components on top of the shared tokens and never restyles shared classes. Source tiers are hydro blue (in force), solar amber (revision) and slate (third party); inference is indigo, gap is red, signal is green.

## Method

1. Four research shards retrieved the primary documents (GHG Protocol standards and
   guidance in force, then the standards development and governance repository, then
   third parties) and wrote dossiers with verbatim, page-cited extracts. Every claim is
   tagged `[GHGP-inforce]`, `[GHGP-revision]` or `[third-party]`; reasoning is labelled
   `INFERENCE`; unanswered questions are labelled `GAP`.
2. Four page shards built the pages from the dossiers only (no outside facts), citing
   every sourced sentence with a chip that links to a row on `sources.html`.
3. Two verification shards checked every page against its dossier (citation integrity,
   quote fidelity, claim strength, numbers and denominators, label discipline, render
   at 400 px and 1280 px in light and dark) and fixed what they found. Their reports are
   in `research/`.

`sources.html` is generated from the dossiers' Sources tables (152 documents). The
downloaded PDFs are not committed.

## Local preview / republish

```bash
cd guidance-explainer && python3 -m http.server 8000   # open http://localhost:8000
```

GitHub Pages serves `main` directly, so a merge to `main` deploys the site. To republish the Claude artifact: copy the HTML, `guidance.css`, `site.js`, `styles/`, `js/` and `assets/` to a scratch folder, strip
`index.html` to body content (the artifact host wraps the main page), and publish
`index.html` with the other files as supporting files.

## Known limits

- Two scroll-pinned figures (the governance process flow and the incrementality
  timeline) render with small text on phones; the step cards beside them carry the full
  text. Other wide figures scroll sideways on phones.
- The Scope 2 TWG workshop of 20–22 Oct 2026 and the ISB meeting of 15 Dec 2026 post-date
  the material; pulse checks quoted on the pages are direction, not decisions.
