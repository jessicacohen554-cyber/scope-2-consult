# Frontend — Scope 2 Public Consultation Response Explorer

Static site skeleton carrying the shared design language of the
[`hourly-cfe-optimizer`](https://github.com/jessicacohen554-cyber/hourly-cfe-optimizer)
dashboard: same fonts, palettes, animated header banner, cinematic circuit-board
background, and glassmorphism.

**Read [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) before touching anything — it is law.**

## Layout

```
frontend/
├── index.html                  # Landing page skeleton
├── DESIGN_SYSTEM.md            # The design guide (law)
├── templates/
│   └── page-template.html      # Canonical starting point for every new page
├── styles/
│   ├── shared.css              # All shared styles (verbatim upstream copy)
│   ├── article.css             # Long-form/scrollytell styles (verbatim)
│   └── cinematic.css           # Parallax background layer (verbatim)
├── js/
│   ├── nav.js                  # Top nav (site-specific: NAV_ITEMS, NAV_BRAND)
│   ├── shared-header.js        # Animated banner injector (verbatim)
│   ├── canvas-banners.js       # Canvas banner variants (verbatim)
│   ├── cinematic-bg.js         # GSAP parallax background (site-specific: image path)
│   ├── scroll-observer.js      # Scroll fade-in reveals (verbatim)
│   ├── chart-colors.js         # Canonical Chart.js palettes (verbatim)
│   └── shared-footer.js        # Footer injector (site-specific: links, note)
└── assets/
    ├── cinematic-bg.png        # Circuit-board background image
    └── circuit-header.svg      # Upstream header artwork (reference/alternates)
```

## Run locally

No build step. Serve statically (needed so the JS modules and assets resolve):

```bash
cd frontend
python3 -m http.server 8000
# open http://localhost:8000
```

GSAP and Google Fonts load from CDNs; without network the page still renders with
fallback fonts and a static background.

## Adding a page

1. Copy `templates/page-template.html`.
2. Change title, `<h1>`, subtitle, and content sections.
3. Add the page to `NAV_ITEMS` in `js/nav.js` (and `FOOTER_LINKS` in
   `js/shared-footer.js` if it belongs in the footer).
4. Follow the rules in `DESIGN_SYSTEM.md` — no inline styles for shared components,
   no hardcoded colors or fonts.
