# Build brief for page shards

You are building one or two pages of a standalone educational site, "Scope 2 Frontier",
for a reader who is expert in climate strategy and GHG accounting, learning power-market
and standards-revision detail. Pages are hybrid scrollytelling: a reading column plus
pinned figures that change as the reader scrolls, with light interactivity only where it
aids understanding. Tone: neutral, grounded, no hype, no persuasion. Short sentences.

## Hard rules (violations will be caught by a verification shard)
1. SOURCE OF TRUTH: only facts in the research dossiers under
   `guidance-explainer/research/` may appear on a page. Do not add facts from memory.
   If a dossier lacks something the page needs, write a GAP callout, do not fill it.
2. CITE: every sourced statement carries a `.cite` chip with the right tier class
   (`inforce` = GHG Protocol guidance in force; `revision` = GHG Protocol revision
   materials: TWG/ISB/SC minutes, decks, drafts, RFIs, feedback summaries, blogs;
   `third` = third party). The chip text names the document, section/page. The chip
   href points to `sources.html#<id>` where `<id>` is the source id from the dossier
   Sources table (lowercase, hyphens). Keep a list of every id you use and hand it
   back in your report so the Sources page can be assembled.
3. LABEL: anything reasoned but not stated by a source goes in a `.callout.inference`.
   Anything unknown/unaddressed goes in a `.callout.gap`. Dated revision direction goes
   in a `.callout.signal`. Verbatim text goes in `.quote` or `.defn` blocks with
   quotation marks and exact wording (copy from the dossier; never "clean up" a quote).
4. STRENGTH: never state a requirement more strongly than the source (shall/should/may).
   Never present a proposal as adopted. Say "proposed", "under consideration",
   "the TWG discussed" as the dossier does.
5. NUMBERS: only from the dossier's "Numbers you may use" tables, with citation.
6. DESIGN: use `site/_template.html` as the starting point (copy it); use only classes
   in `site/site.css` plus a small page-specific `<style>` for layouts unique to the
   page, using the CSS tokens (never literal hex). No external libraries. No emoji.
   No mermaid. Figures are hand-authored inline SVG using the svg classes in site.css
   (`.node`, `.edge`, `.t`, `.fill-*`, `.soft-*`), `currentColor` for strokes/text,
   `viewBox` sized to content, labelled arrows, `role="img"` + `aria-label`, a
   `<figcaption>` stating the claim. Keep SVG text >= 10.5px at drawn scale, nothing
   overlapping, labels inside the viewBox. Every figure must read on light AND dark
   (only token colours; no literal fills).
7. MOBILE: the page must work at 400px wide with no horizontal scroll. Scrolly figures
   stack above the steps on phones automatically; keep each figure's viewBox aspect
   roughly 16:10 or squarer so it fits in ~40vh on a phone. Wide tables go inside
   `.scroll-x`. Do not set fixed widths.
8. INTERACTIVITY: use the shared behaviours (scrolly steps, `.seg` toggles, `.stepper`
   frame animations, `.matrix` cells, `.tabs`, `<details>`). Page-specific JS is
   allowed in a small inline `<script>` at the end, only when a shared behaviour
   cannot do it, and must not break if JS is off (content visible at rest).
9. STRUCTURE per page: hero (eyebrow, h1 as a question or claim, lede, meta, tier
   legend) → `.toc` → 4-7 sections, each with a section-head, and at least one figure
   or interactive per section where it aids understanding → a closing "What to take
   into a position" section with a `.callout.key` and 3-6 bullets that separate
   SOURCED / INFERENCE / GAP → `.pager` prev/next → `.foot`. Reading time 7-12 min.
10. The nav block in the template lists all pages; keep it verbatim. Set the pager links
    to the pages named in your brief.
11. Write the final file to `guidance-explainer/site/<name>.html`. Validate: well-formed
    HTML (every tag closed; run `python3 -c "import html.parser"`-based or `xmllint
    --html --noout` check if available), no `TODO`, no placeholder text from the
    template, no literal hex colours outside the `:root` tokens.
12. Report back: pages written, the list of source ids used (id → document title / URL
    as given in the dossier), any dossier gaps you had to flag, and any claim you were
    unsure about.
