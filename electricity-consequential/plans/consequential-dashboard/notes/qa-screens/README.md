# P42 QA screenshot set

Captured with Playwright against `python3 -m http.server 8000` in
`electricity-consequential/frontend/`, using the preinstalled Chromium at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome` with `--no-sandbox`.
Chart.js, GSAP and the Google Fonts files were served to the browser from a
session-local mirror through route interception — the sandbox blocks those
hosts to Chromium, which is environmental and not a page fault. Nothing was
vendored into the repository.

| Pattern | What it is |
|---|---|
| `<page>-1440.png` · `<page>-390.png` | Full-page capture of all ten pages on the real export, at desktop and phone width. The acceptance set. |
| `<page>-{1440,390}-fixtures.png` | The same under `?fixtures=1`, kept only for the three pages where the fixtures themselves were the subject: `weighting` (its panels rendered empty before P42), `additionality` and `decisions`. All ten pages were run under fixtures and all ten were clean; `report-fixtures.json` is the record. |
| `state-matrix-popover-*.png` | The 9 × 3 matrix cell popover, opened with the keyboard. |
| `state-dim-<dim>-*.png` | The Decision Board with each of the four segment dimensions selected — the states that exercise the n<5 mask and the thin-n treatment. |
| `state-org-profile-*.png` | A respondent profile expanded from the org browser, opened with the keyboard. |
| `state-voices-filter-*.png` | The voices page with a filter engaged. |
| `report.json` · `report-fixtures.json` | Per-page HTTP status, console errors, failed requests and horizontal-overflow measurement for every capture. |

Full-page captures are stored at half linear resolution and colour-quantised;
interaction states at three-quarter. Raw captures came to 87 MB, which is not
a reasonable thing to put in a git repository — the set here is 16 MB and every
image is still legible at the detail it was taken to show.
