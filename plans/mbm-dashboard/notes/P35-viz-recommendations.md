# P35 — Visualization recommendations

**Session:** P35 (Wave 3.5 exploration stub) · **Branch:** `claude/mbm-p35-viz-exploration-ret740`
**Prototypes:** `frontend/dev-viz.html` (new; linked from nowhere, in no nav)
**Screenshots:** `plans/mbm-dashboard/notes/p35-screens/`
**Data:** the real exports in `frontend/data/` (generated 2026-07-29), not fixtures.

Nothing shipped. This memo plus the prototype page is the whole deliverable.

**Reproduce:** `cd frontend && python3 -m http.server 8000` → <http://localhost:8000/dev-viz.html>.
Add `?fixtures=1` to point the same prototypes at the hand-authored fixtures. Zero console
errors at 1440 px and 390 px. Every prototype uses design tokens only — no hex literal, no
`font-family` literal, no shared-component override.

> **Wave 3 status when this ran.** P30–P34 had not merged; `frontend/` contained only
> `index.html`, `dev.html` and the P11 shared modules. So question 6 is answered against the
> **shared renderers fed real data** rather than against shipped pages. That turns out to be
> the more useful target anyway: every defect in §6 lives in `js/likert-viz.js`,
> `js/org-table.js` or `styles/site.css`, so it will land on all five Wave 3 pages at once,
> and P42 can fix it in one place. The page-level judgements those prompts own (copy,
> section order, callout placement) are still open and are **not** covered here.

---

## Headline: three findings that change content, not just form

These came out of prototyping and matter more than any chart choice.

**1. Q138 does not support the claim that supporters hold more empirical basis.**
PLAN §8.4 and the P33 brief both lean on "supporters … hold more empirical basis". Against
real data, with the correct per-bucket denominators, the two distributions are
indistinguishable:

| Q138 basis (share of that stance bucket) | Oppose (n=250) | Support (n=75) |
|---|---|---|
| Direct empirical analysis | **7.6%** (95% CI 4.9–11.6) | **8.0%** (95% CI 3.7–16.4) |
| Operational experience | 21.6% (16.9–27.1) | 29.3% (20.2–40.4) |
| Professional judgment | 70.0% | 64.0% |
| General awareness (no analysis) | 47.2% | 49.3% |

19 opponents versus 6 supporters claimed direct empirical analysis. The intervals overlap
almost completely; on the strongest-basis partition the profiles are 7.6/17.6/50.4/22.0/2.4
against 8.0/22.7/46.7/21.3/1.3. The support side's research advantage is real but it rests
**entirely on the citation mining**, which does separate cleanly and with no interval
overlap: 34.3% of Q71 supporters show citation signals (95% CI 28.1–41.1) versus 14.7% of
opponents (12.2–17.7). P33 and P40 should attribute the claim to citations and say plainly
that the self-reported basis question shows no stance difference. Note also the direction
nobody predicted: supporters are (weakly) *higher* on operational experience, so
"the opposition brings more operational evidence" needs hedging too.

**2. There is a ninth coordinated bloc, it is the largest un-named one, and `clusters.json`
already contains it.** Build the shared-text graph over named respondents and component #2
is 15 organizations, **every one of them carrying no bloc card**: RECS Energy Certificate
Association, Eurelectric, Finnish Energy, Samorka, Association ECS Switzerland (five trade
bodies), plus Fortum, Hafslund, Landsvirkjun, ON Power, BKW Energie, Repower, Ecohz, Caely
Renewables, SMK and Tetra Pak. They share 17 verbatim texts across 15 distinct questions
(Q21, 34, 66, 73, 103, 106, 108, 111, 137, 149, 151, 158, 160, 162, 173) with 20 redacted
co-signer seats alongside; 12 of the 15 already carry `template: true`. Their anchor
signature is the tightest in the dataset and the mirror image of the pro-hourly bloc:

> Q71 **1.15** (n=13) · Q83 **1.27** (n=15) · Q97 **1.00** (n=7) · Q113 3.60 (n=5) ·
> Q124 4.50 (n=2) · Q153 **4.86** (n=14) · Q171 **5.00** (n=14, unanimous)

This is the European guarantee-of-origin / EAC establishment: total rejection of hourly
matching, deliverability and SSS pro-rata, unanimous support for exemptions and the legacy
clause. It belongs on `integrity.html` next to the pro-hourly bloc, and P40 §7's "both sides
campaign" is materially stronger with it. Adding it is a **data** change (`clusters.json`
`blocs[]` via P20/P22) — outside this session's guardrails, so flagged, not made.

**3. The bloc-card format cannot represent the coordination that exists.** 93 named
respondents sit in the shared-text graph; the 8 cards name 40 unique respondents (42 seats —
SIDENOR GROUP and "Employee" are printed on two cards each) and only **28** of those appear
in the graph at all. **365 of 451 edges (81%) touch a respondent no card names.** The
pro-hourly card names 17; its component is 37 organizations — 13 carded, 24 not. Conversely
12 carded members share no long text at all (6 Luxshare filings, 4 pro-hourly, FEPC/TEPCO),
so a text-graph view alone is also incomplete. The two views are complements, not rivals.

---

## Q1 · Evidence basis × stance (Q138 × Q71)

Screenshot: `q1-evidence-stance-four-forms.png`

Q138 is multi-select: 365 respondents made 538 selections, mean 1.47 each. Any "share of
answers" framing sums to 147%.

| | Form | Verdict |
|---|---|---|
| **A1** | 100% stacked share of selections | **Rejected.** Denominators are selections (372 from 250 people, 33 from 26, 114 from 75). Opponents ticked 149 boxes per 100 people, supporters 152, so the three bars are not on one scale and no rate can be read off them. Not fixable by relabelling. |
| **A2** | Grouped bar, % of stance base, 95% Wilson CI | **Winner.** One panel, correct denominators, and the whiskers are what stop a reader treating a 0.4-point gap as a finding. Neutral (n=26) is shown with an interval so wide it argues for itself instead of being silently dropped. |
| **A3** | Small multiples, one panel per basis | Runner-up. Shared y-axis, honest, and the flat profile across all five panels *is* the finding. Costs five panels to say what A2 says in one, and the two interesting options sit where the panels are shortest. |
| **A4** | Mekko on *strongest* basis claimed | Runner-up, and the best single-figure option. Collapsing the multi-select down an ordered ladder (empirical > operational > judgment > awareness > undisclosed) makes it a genuine partition — the only way a mosaic is honest here — and column width carries the base size A2 has to put in a legend. Costs a derived field, an editorial ladder to document, and the narrow neutral column clips its own caption. |

**Ranked recommendation:** A2 → A4 → A3 → A1 (never).
Ship A2 on `evidence.html`. If P33 wants one figure that also makes the small supporter base
*visible* rather than merely stated, A4 beside it is worth the extra field.

**Effort: M.** The chart itself is S (~60 lines against `S2Viz`), but it is blocked on a
contract addition — see §"Contract additions" below. Do not hand-copy the denominators onto
a page; the prototype does that only because it is a prototype, with the derivation inline.

---

## Q2 · Coalition and bloc structure

Screenshots: `q2a-bloc-cards.png`, `q2b-adjacency-matrix.png`,
`q2c-node-link-network.png`, `q2d-shared-text-bipartite.png`

Edge = two named respondents share ≥1 verbatim ≥200-character answer. Redacted co-signers
counted, never named. 93 nodes, 451 edges, 13 components (37, 15, 11, 5, 4, 4, 3, 3, 3, 2, 2, 2, 2).

| | Form | Verdict |
|---|---|---|
| **B1** | Bloc cards (current P34 answer) | **Keep, but not alone.** Cards are the only form that carries a signature, a shared-text count and an audited member list — the things a reader quotes. They are also a partition, and coordination is not partitioned: 81% of edges touch someone no card names, one whole 15-member component has no card, and two respondents appear twice with no way to show it. |
| **B2** | Adjacency matrix, ordered by component | **Winner.** All 93 nodes, no truncation, in one figure. Component ordering turns every coalition into a solid diagonal block and every cross-link into an off-diagonal mark — precisely the two things cards cannot show. The un-carded European bloc is the second block down and reads as an all-red band; the Luxshare block visibly contains uncarded members. Cell tint = shared-text count, left band = bloc identity. |
| **B3** | Node-link network, seeded per-component layout, shelf-packed | Runner-up, as an opener only. Conveys the shape instantly — two dense cores, one entirely un-carded, plus a long tail of pairs. Cannot identify anyone: 18 of 93 nodes can carry a label and even those collide; tie strength is a stroke width buried in a hairball; reproducibility depends on a pinned seed. Prettier, strictly less readable. |
| **B4** | Shared-text bipartite, largest component | **Specialist, and the best figure in the memo for one specific claim.** Rows = 37 respondents, columns = 36 individual verbatim texts, filled cell = "this organization filed this exact paragraph". Princeton's ZERO lab, the U. Amsterdam critical-infrastructure lab and The Breakthrough Institute sit on the same columns as Cleartrace, KPN, SAP and Our Energy. That is "the apparent independent academic corroboration is not independent" as a picture rather than a sentence. |

**Ranked recommendation for `integrity.html`:** **B2 as the panel-2 anchor, B1 kept below
it** as the quotable detail (with a ninth card once the data lands), **B4 in the evidence
panel** where the independence claim is made, **B3 not shipped** — it earns nothing B2 does
not, and costs a pinned random seed in production code.

Answering the question as asked: **no, a network is not more informative than cards for 8
blocs — but the premise is wrong.** The structure is not 8 blocs of ~5; it is 13 components
over 93 organizations of which a third are uncarded. Against *that*, a matrix beats both
cards and a network.

**Effort: B2 = M** (~90 lines: graph build, component sort, CSS grid; no library, no new
data — `clusters.json` as shipped is sufficient). **B4 = M.** **B3 = L** and not recommended.

---

## Q3 · Org-profile stance display at table density

Screenshots: `q3-stance-strip-three-ways.png`, `q3-stance-strip-mobile-390.png`

The test that decides this is **missing** anchors, not aesthetics: 1,194 of 3,493 anchor
slots (34%) are `null`, only 161 of 499 orgs answered all seven, 43 answered none. The
prototype table is deliberately 5 complete + 6 partial + 3 near-empty rows.

| | Form | Verdict |
|---|---|---|
| **C1** | The shipped `.s2-spark` bar strip | **Bug, not a preference.** Height encodes score, and `.s2-spark-na { height: 100% }` draws "not answered" at **full height** — the tallest mark in the strip is the absence of data, and next to a 3 px `1` it reads as a 5. With a third of slots null that is the common case, not an edge case. Height also double-encodes what color already says. |
| **C2** | 7-dot strip | **Winner.** Constant footprint per slot, so the seven positions line up down the column and vectors are comparable row to row. Score carried once, by color; absence is a hollow dashed ring *quieter* than every real value. Ordered red→amber→grey→blue→green so the ramp survives greyscale as lightness. `sr-only` readout unchanged. |
| **C3** | Tiny heatmap row | Runner-up. Contiguous cells read as one object, so whole-row patterns pop faster than dots. But adjacent similar tints blur, the null hatch sits *inside* the block and competes with real values, and it reuses the Likert-Explorer idiom at a size where its tints stop being distinguishable. |

A mini-*sparkline* (a line) was considered and **not** prototyped: with 34% of slots null a
line must either interpolate across gaps — fabricating answers nobody gave — or break into
disconnected segments that read as noise. It is disqualified by the data, not by taste.

**Ranked recommendation:** C2 → C3 → C1 (fix regardless of which form wins).
On mobile (390 px) all three clip identically; the strip column should be the first thing
`org-table.js` drops, or the table needs an explicit horizontal scroll affordance.

**Effort: S.** One CSS block in `styles/site.css` plus rewriting `sparkline()` in
`js/org-table.js` (~20 lines). No data change. **If nothing else from this memo is adopted,
adopt this** — it is the only item where the current code is actively wrong rather than
merely improvable.

---

## Q4 · The redaction story

Screenshots: `q4-redaction-three-ways.png`, `q4-slopegraph-detail.png`

`redaction_effect` ships 22 rows; only the **7 `support` anchors** may share an axis. The
other 15 are burden, cost, magnitude and ordinal rows where a higher mean means the opposite
thing — pooling them would be the worst error available on this panel.

| | Form | Verdict |
|---|---|---|
| **D1** | Mini heatmap (current P30/P32 answer) | **Baseline — keep as the accessible table.** Every number present and legible, cheapest to build. But the *direction* of each pair has to be derived by the reader from two tints differing by a few percent of alpha, so Q171's reversal — the one fact in the panel — is invisible until you read the digits. |
| **D2** | Slopegraph | **Winner.** Slope *is* the finding: six lines fall, Q171 rises, and the reversal is pre-attentive. |
| **D3** | Dumbbell, sorted by shift | Runner-up. Bar length is the effect size directly, and sorting isolates Q171. Gives up *level*: you can no longer see Q171 and Q153 sitting near the ceiling while Q71 sits near the floor, so the "requirements rejected, escape hatches embraced" shape is lost. Needs an extra legend the slopegraph gets free from its axis titles. |

**Two geometry corrections** for whoever writes the caption. Q171 does **not cross** the
other six — it already starts highest (4.51 named) and pulls further away (4.63 redacted).
It is the sole *upward* slope. The only actual crossing is **Q97 × Q124**: named readers
put Q124 above Q97 (3.41 vs 3.24), redacted readers reverse it (2.76 vs 3.05), because
fossil-fallback support collapses 0.65 among redacted respondents while SSS support barely
moves. That is its own sentence and the current heatmap hides it completely.

The pattern is identical in % support (Q171 +3.1 pp, everything else −4.2 to −19.3 pp), so
either metric works; mean keeps the 1–5 domain shared with the Likert Explorer.

**Ranked recommendation:** D2 as the figure, D1 retained beneath it as the numbers table
(it doubles as the `sr-only` equivalent). D3 not needed.

**Effort: M** — ~40 lines of SVG plus a label anti-collision nudge (4.63 and 3.98 collide
without it). No library, no data change.

---

## Q5 · Q183 protest answers

Screenshot: `q5-q183-three-ways.png`

207 answered across 22 distinct years (2026–2099). 17 answers fall after 2050, of which 11
are 2099. Eight years inside 2026–2050 have zero answers (2033, 2034, 2037, 2039, 2044,
2046, 2047, 2049).

| | Form | Verdict |
|---|---|---|
| **E1** | Category bars — what `dev.html` does today | **Rejected.** A category axis, not a time axis: years with zero answers are simply absent, so 2050 sits adjacent to 2055 and 2060 adjacent to 2099. The reader sees a smooth ramp of preferences where the data is a tight cluster plus a distant protest spike. Horizontal bars also put time on the vertical axis. |
| **E2** | Linear year axis + annotated protest bin | **Winner.** Every year 2026–2050 gets a slot whether or not anyone chose it, so the gaps show and the 2030/2035/2050 round-number spikes read as the anchoring artefact they are. Protest answers become one differently-coloured bin, labelled in place, carrying the "excluded from every average" caveat where the number is instead of in a footnote. |
| **E3** | Broken axis | **Rejected.** Its one advantage is keeping 2055–2060 distinguishable from the 2099s, which E2 lumps. Everything else is worse: two charts sharing a y-scale by hand with nothing enforcing it, a tail panel that gives 5 protest years the width of 25 real ones so **the protest tail reads as a second mode**, a gutter that needs explaining, and it does not survive a 390 px column. A broken axis earns its keep when the outliers are data; these are a refusal to answer. |

One honesty note for the caption either way: the protest set is **17, not 11**. The eleven
2099s are unambiguous; 2055–2060 (6 answers) are implausible rather than impossible, and
both E2's single bin and `protest_gt_2050` lump them together. Say so.

**Ranked recommendation:** E2 → E1/E3 (neither).
**Effort: S** — one `S2Viz.renderOptionBars` call replaced by a small dedicated histogram
(~50 lines including the annotation plugin). `selects.json["183"]` already has everything.

---

## Q6 · Shipped shared components against real data

Screenshots: `q6a-heatmap-real-data.png`, `q6b-heatmap-mobile-390.png`,
`q6c-diverging-and-option-bars.png`, `q6d-dev-html-broken-on-real-data.png`

**What holds up.** `S2Viz.renderHeatmap` at real scale (22 rows × 15 org types) keeps its
construct grouping and its n<5 mask honestly — `grid_operator` and `intl_agency` arrive as
hatching rather than as noise, which is exactly right. `renderDivergingBar` on the seven
anchors is the best figure the shared code produces; the "requirements rejected, escape
hatches embraced" shape is legible without a caption. The construct-aware ramp works: burden
rows are unmistakably not support rows.

**Eight defects, all label/CSS/ordering fixes rather than redesigns.**

1. **`dev.html?fixtures=0` is completely broken.** It hardcodes `S2Data.loadOrg(900)`, a
   fixtures-only id; against real data that 404s, the harness `.catch()` fires, and the
   *entire* page becomes one error panel (`q6d-…png`). Fix: `D.respondents.org_index[0].id`.
   One line, and it restores the only real-data smoke test the project has. **S**
2. **The heatmap column base chip is the segment's total n, not the cell's** — and it sits
   at the top of the column, inviting the reader to attach it to every cell beneath.
   Q142 × Company reads 75% under a chip saying `n=466`; that cell is `n=71`, a 6.6×
   overstatement. Q118 × Registry operator shows a flat **100%** on `n=6` under a chip of
   `n=13`. The `aria-label` and popover already carry the true cell n, so the sighted
   default is the least accurate view. Fix: per-cell n in the cell tooltip *title* and a
   footnote on the chip, or dim cells whose n is below some fraction of the column base. **S–M**
3. **Construct group order puts `ordinal` first and `support` second.** Group order follows
   first appearance in `meta.questions`, and Q70 is first — so the page opens on the least
   interpretable rows and the headline stance block is below the fold. Fix: an explicit
   construct order with `support` leading. **S**
4. **Column headers break mid-word** — "COMPAN Y", "REGISTRY OPERATO R", "GHG PROGRA
   M/INITIAT IVE". Fix: `overflow-wrap: normal` / `hyphens: manual` on `.s2-hm-colname`
   plus shorter labels in `meta.json`. **S**
5. **The last columns are cut off at 1440 px** with no visible scroll affordance —
   `intl_agency` renders as a bare "O". Fix: an edge fade or an explicit scroll hint on
   `.s2-heatmap-wrap`. **S**
6. **At 390 px the scale-direction badges are clipped** — "5 = stron", "5 – Highly
   sufficier". That badge is the single thing preventing a reader from misreading the burden
   rows as support, and mobile loses it. Fix: let `.s2-dir-badge` wrap below the group name
   under ~600 px. **S**, and the highest-severity item on this list after #2.
7. **Option-bar labels elide the part that distinguishes them.** Q74's options run 22–200
   characters and two of them share the prefix "Hourly matching should follow…", so they
   truncate to *visually identical* labels — the reader cannot tell the optional 'may'
   option (75.8%) from the recommended 'should' one (19.9%). That is misleading, not merely
   cramped, and it is the most consequential distinction on the hourly-matching page. Fix:
   `maxLines: 3` and `labelShare: ~0.44` for reason picklists. The longest option in
   `reasons.json` is 225 characters (Q116), so no budget rescues every question and the
   `sr-only` table has to stay the documented route to full text. **S**
8. **The metric legend still reads "% support (4–5)" over three- and four-rung ordinal
   ladders**, where `endWidth()` is correctly showing the top rung only. The renderer is
   right and the label is wrong. Fix: metric label varies by family. **S**

**Not a defect, a judgement call for P30:** with 15 org-type columns of which four are
almost entirely masked, the default view spends a quarter of its width on hatching. The
"hide n<15" toggle exists; consider defaulting it **on**.

---

## Cheap wins for the P42 QA pass

Ordered by (value ÷ effort). Everything here is S and touches shared code in one place, so
it lands on all five Wave 3 pages at once.

| # | Fix | Where | Effort |
|---|---|---|---|
| 1 | `.s2-spark-na` renders absence at full height → adopt the **C2 dot strip** | `site.css`, `org-table.js` | S |
| 2 | `dev.html` hardcoded org id 900 breaks every real-data smoke test | `dev.html` | S |
| 3 | Scale-direction badge clipped at 390 px | `site.css` | S |
| 4 | Q74 option labels truncate to identical text ('may' vs 'should') | `likert-viz.js` call sites | S |
| 5 | Construct group order — put `support` first | `meta.json` order or `likert-viz.js` | S |
| 6 | Heatmap column headers break mid-word | `site.css` | S |
| 7 | Heatmap columns clipped at 1440 px with no scroll affordance | `site.css` | S |
| 8 | "% support (4–5)" label over ordinal ladders | `likert-viz.js` | S |
| 9 | **Q183 histogram → E2** (linear axis + annotated protest bin) | new small renderer | S |
| 10 | Per-cell n alongside the column base chip | `likert-viz.js` | S–M |

Deliberately **not** cheap wins — worth doing, but they need a decision or an exporter run,
so they belong to P30/P33/P34 rather than to a QA pass:
**Q4 slopegraph (M)**, **Q2 adjacency matrix (M)**, **Q1 grouped bar + CI (M, blocked on the
contract)**, **the ninth bloc card (data change, P20/P22)**, and the §"Headline 1" copy
correction on `evidence.html` / `index.html` (editorial, P33/P40).

---

## Contract additions this memo depends on

Both are for P22 (`export_frontend.py`), and both are small.

1. **`evidence.json → basis.q138.by_stance_q71` needs a base per bucket.** It currently
   ships raw option counts with no denominator, so no honest rate is computable from the
   export alone. Add `base: {oppose, neutral, support}` and `no_anchor_score` (respondents
   who answered Q138 but have no Q71 score). Real values: 250 / 26 / 75, plus 14. Apply the
   same to `q122` and `q56`, which have the identical shape and the identical gap.
2. **Optional, only if A4 is adopted:** a `strongest` partition per bucket collapsing the
   multi-select down the documented ladder (empirical > operational > judgment > awareness >
   undisclosed), so a mosaic has a genuine partition to draw. Real values are in the
   `Q138_STANCE` constant in `dev-viz.html`, with the derivation query inline.

Until (1) lands, `evidence.html` should ship A2 **with counts only** (`19 of 250` vs
`6 of 75`) rather than percentages a reader cannot verify — never with hand-copied
denominators.

---

## Guardrails observed

Touched only `plans/mbm-dashboard/notes/**` (new) and `frontend/dev-viz.html` (new).
No shipped page, no shared JS or CSS, no `nav.js`, no `frontend/data/`, nothing under `data/`
modified — the SQLite database was read to compute the missing Q138 denominators and to
verify every number quoted here, never written. `git diff --stat origin/main` is empty: the
branch adds two new paths and modifies nothing tracked.

Design-system compliance for `dev-viz.html`: every CSS rule is `.p35-*` prefixed, so no
shared component is restyled; no hex literal, no `rgb()`, no named color, no `font-family`
literal; chart colors come from `RESOURCE_COLORS`/`SEMANTIC_COLORS` and SVG/canvas colors are
read out of CSS custom properties at runtime. The only inline `style` attributes are
data-driven geometry (bar heights, computed cell tints, grid column counts) — the same
pattern `js/likert-viz.js` already uses for its heatmap cells.

The 14 screenshots total ~7.6 MB; no PNG optimizer was available in this environment, so they
are unoptimized 2× captures. If that matters for repo weight, they can be re-shot at 1× or
run through `optipng` later without changing the memo.

`dev-viz.html` is a prototype harness and is linked from nowhere; it carries
`<meta name="robots" content="noindex, nofollow">` and is not registered in nav. If P42
adopts the winners it can be deleted, or kept alongside `dev.html` as the real-data smoke
test that `dev.html` currently cannot be.
