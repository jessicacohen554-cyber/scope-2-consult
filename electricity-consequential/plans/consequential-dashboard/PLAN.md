# Electricity-Sector Consequential Methods Consultation Hub — Master Plan

This is the shared context document for every implementation session in the prompt pack
(`electricity-consequential/plans/consequential-dashboard/prompts/P*.md`). Every prompt
starts with "read this file". It carries: the orchestration map, the repo primer and
environment gotchas, the provisional findings digest, the site architecture, the frontend
data contract, the pipeline spec, the assessment content brief, and the acceptance
template. Nothing outside `electricity-consequential/` is ever modified by this project —
the existing Scope 2 hub at the repo root is read-only reference material.

**Goal.** A second, self-contained consultation hub under `electricity-consequential/`
analyzing the GHG Protocol **Electricity Sector Consequential Methods** public
consultation (185 respondents, Q3–Q52): the same raw-export → tidy-dataset → codebook →
derived-flags → static-dashboard treatment the repo already applied to the Scope 2
consultation, adapted to this survey's very different shape — no Likert scales; binary
and 3-way stances, a 9×3 additionality-test matrix, appropriate-vs-not methodology
multi-selects, granularity ladders, and a free-text-dominated record. Deliverables: a
documented dataset (SQLite + CSV mirrors + README), hand-curated codebook and theme/quote
curation, a 10-page dashboard in the established design system, and a balanced
objective-assessment essay on the landing page.

---

## 1. How this plan is executed

The work is split into **16 prompts** across **7 waves** (0, 1, 2, 3, 3.5, 4, 5).
Prompts inside a wave run as **parallel subagent sessions in isolated git worktrees**;
waves are sequential. The **manager session** (the session that authored this plan) hands
out prompts, merges worktrees into the project branch between waves, reruns the exporter
when curation inputs land, patches downstream prompts when findings warrant it (recorded
as "manager note" commits), runs the validators at every merge point, and pushes.

| Wave | Prompt | Parallel? | Model | Depends on |
|---|---|---|---|---|
| 0 | P01 build pipeline + structural validation | ∥ P11 | claude-opus-5 | — |
| 0 | P11 frontend infra: shell copy, renderers, fixtures | ∥ P01 | claude-opus-5 | — |
| 1 | P02 question labelling, survey_meta, README | ∥ P10, P20, P21 | **claude-fable-5** | P01 |
| 1 | P10 derived flags: junk, resubmission, templates, citations | ∥ | claude-opus-5 | P01 |
| 1 | P20 org audit + junk/resubmission adjudication | ∥ | claude-opus-5 | P01 |
| 1 | P21 theme coding + quote curation | ∥ | **claude-fable-5** | P01 |
| 2 | P22 frontend JSON exporter + contract validator | solo | claude-opus-5 | P02 + P10 (curation via `--allow-missing-curation`; manager reruns after P20/P21) |
| 3 | P30 Decision Board page | ∥ all Wave 3 | claude-opus-5 | P11 + P22 |
| 3 | P31 topic deep-dive pages ×4 | ∥ | claude-opus-5 | P11 + P22 (quotes appear when P21 lands) |
| 3 | P32 respondents page + org browser | ∥ | claude-opus-5 | P11 + P22 |
| 3 | P33 voices & themes page | ∥ | claude-opus-5 | P11 + P22 |
| 3 | P34 integrity & evidence page | ∥ | claude-opus-5 | P11 + P22 |
| 3 | P41 methodology page | ∥ | claude-opus-5 | P02 + P22 |
| 3.5 | P35 exploration stub: digest verification + viz check | solo | claude-opus-5 | P22 |
| 4 | P40 index & objective assessment | solo | **claude-fable-5** | all Wave 3 + P35 + exporter rerun |
| 5 | P42 QA, nav unification, polish | solo, last | claude-opus-5 | everything |

**Critical path:** P01 → {P02, P10} → P22 → (P30–P34, P41) → P40 → P42. P11 starts on
day one against fixtures and never blocks. P20 and P21 need only the P01 database and run
with Wave 1; when their reference files merge, the manager reruns the exporter (the
Scope 2 promotion pattern). P35 runs mid-Wave-3 or right after; **P40 is held until P35's
verification memo lands** so the digest corrections reach the essay, exactly as the
Scope 2 pack did with its P35 → P33/P40 patch cycle.

**Wave 5 is not optional.** The Scope 2 pack specified a final QA wave (its P42) and
never ran it; its known shared-component bugs are still shipped. This pack's P42 is on
the critical path and the manager checklist ends with it.

**Model rationale.** claude-opus-5 for every prompt except three, which run on
**claude-fable-5** because their editorial judgment compounds downstream: **P02** (the
labelling/vocabulary layer every query and page inherits), **P21** (the theme taxonomy is
the interpretive substitute for the reason picklists this survey doesn't have; a weak
taxonomy starves four topic pages, the voices page and the essay), and **P40** (the
objective assessment, as in Scope 2). No prompt runs on any smaller model — per the
project owner's standing instruction, **opus-5 and fable-5 only**.

**Execution model (differs from Scope 2's branch-per-prompt).** Everything lands on one
branch: `claude/electricity-consultation-hub-lp37w8`. Subagents do **not** push and do
**not** open PRs. Each parallel subagent works in an isolated git worktree, commits its
lane there, and reports back; the manager merges the worktree branches (disjoint file
lanes by design), resolves the rare seam, validates, and pushes the project branch with
retry backoff (2s/4s/8s/16s). A solo-wave prompt may run directly on the project branch
checkout. Sessions must treat the branch name in their prompt header as their **lane
name**, not something to push.

**Lane isolation.** Lane D (data) owns `electricity-consequential/scripts/`,
`electricity-consequential/data/`, `electricity-consequential/reference/`,
`electricity-consequential/frontend/data/` (P22 only; P11 owns `frontend/data/fixtures/`).
Lane F (frontend) owns `electricity-consequential/frontend/` everything else. Wave 3 page
prompts each own exactly their page HTML + their page JS module. Nobody edits another
lane's files; nav/footer placeholder entries are written only by P11 and finalized only
by P42. **Nothing outside `electricity-consequential/` is ever written by any session.**
The single deliberate exception: P34 may read the Scope 2 SQLite database (read-only) for
the cross-consultation repeat-respondents panel.

---

## 2. Repository primer

**The Scope 2 hub at the repo root is the porting source — read, never write:**

- `scripts/build_dataset.py` (754 lines) — the mechanical reshape P01 ports. Its
  docstring separation ("all interpretation lives in survey_meta.py") is preserved here.
- `scripts/survey_meta.py` — the editorial-metadata pattern (closed vocabularies,
  `load_labels()` gatekeeper) P02 re-instantiates.
- `scripts/validate_dataset.py` — checks 1–13 are structural and port; 14+ are frozen
  dataset figures, re-derived for this dataset.
- `scripts/analytics/derive_flags.py`, `export_frontend.py`, `validate_frontend_data.py`,
  `test_*.py` — the clustering/citation/domain machinery, deterministic-JSON writer,
  privacy mask, and validation harness all port; every content constant is replaced.
- `frontend/DESIGN_SYSTEM.md` — **law**, copied into this hub by P11 (with its two known
  stale spots fixed: the documented head-include list omits `site.css` and the site JS
  modules). `frontend/js/likert-viz.js` is the salvage source for the new renderers.
- Root `README.md` — the documentation register P02's README mirrors.
- `plans/mbm-dashboard/PLAN.md` + `prompts/` — the pack this pack mirrors.

**This hub (all paths relative to `electricity-consequential/`):**

- Raw export: `Electricity-Sector-ConsequentialMethodsPublicConsultationFeedback-RawData-2026.07.29.xlsx`
  (507 KB, sheet **`Raw Data`**, A1:BE186 = header + 185 rows × 57 cols, col A = `ID`).
  Committed unmodified; the only data input.
- Consultation document: `reference/GHG-Protocol-Consequential-Electricity-Sector-Emissions-Impacts-Public-Consultation.pdf`
  (20 pp). Question context and the `doc_section` axis: §5 general feedback → Q18,
  §6 formula (6.1 TWG subgroup approach) → Q19–25, §7 additionality → Q26–34,
  §8 marginal emission rates (8.1 operating, 8.2 build) → Q35–46, §9 weighting → Q47–52.
- Build target: `data/electricity_consequential.sqlite` + CSV mirrors + `data/manifest.json`.

### Environment gotchas (every session hits these)

1. **No `sqlite3` CLI, no pandas.** Use `python3` with stdlib `sqlite3`, `csv`, `json`,
   `re`, `hashlib`. `pip install openpyxl` only for building/validating the dataset
   (P01/P02; nobody else rebuilds).
2. **SQLite columns are TEXT-typed** (ported convention). `sum(is_redacted)` silently
   returns 0 — use `is_redacted+0`, `answer_rank+0.0`, or cast in Python.
3. `respondent_id` runs **3–201 with gaps** — never assume 1..185.
4. **The analytical base is 180, not 185.** [ADJUDICATED post-Wave-1 — P10 sweep +
   P20 ruling in `reference/exclusions.csv`, which is authoritative.] Four junk/test
   respondents (IDs **11, 12, 14, 31** — ID 31 is a redacted all-"a" submission the
   provisional digest missed) and the superseded resubmission (ID **100**; ID 151 is
   the same person's later filing for FMASE, a strict superset of it) are excluded
   from every aggregate, quote pool and org browser, and appear only on the integrity
   page. Named excluded: 11, 14, 100 → org files cover 108 − 3 = **105** named
   analytical-base respondents. `respondents.csv` keeps all 185 rows; the exporter
   enforces the exclusion (including filtering the 6 `coded_themes.csv` rows for
   ID 31, coded before the ruling landed). Raw data is never modified.
5. **Never treat the additionality matrix as sentiment.** `req_level`
   (required > optional > not_required) is an ordered **stringency** scale — sequential
   ramp, never the green/red support ramp. Binary Yes/No strips may use support colors,
   with per-question polarity from `meta.json` (for Q19 the *critical* answer is "No").
6. **Never net the specials.** "Unsure", "None", "None are appropriate", "All are
   feasible", "None (no tests are feasible)", "N/A" are flagged `is_special` in
   `question_options` — show them as their own segments; exclude them from net-approval
   arithmetic and from `answer_rank`.
7. **Scoreboard nets use each question's own base.** Q35 (n=69) and Q36 (n=57) have
   different denominators; net% = pct_of_appropriate_base − pct_of_not_base, and both
   bases are always displayed. A methodology absent from both lists is unknown, not
   neutral.
8. **Divide by the right base, always.** Response counts fall from 165 (Q18) to 36
   (Q52). Every percentage on every page carries its n.
9. Multi-selects are **semicolon-delimited with trailing delimiters** ("Regulatory
   test;") and option labels carry **trailing/multiple spaces** ("SCED – locational  ").
   P01 normalizes whitespace before option matching; verbatim text is preserved in
   `answer_text`.
10. **Q26.x sub-numbered headers**: "26.1."–"26.9.", including the malformed
    "26.6 Posititve list" (missing dot, typo). Parser: `^\s*(\d{1,3})(?:\.(\d))?\.?\s`.
    question_id scheme: `Q018`…`Q052`, matrix `Q026_1`…`Q026_9`, display "Q26.1".
11. Free text capped at 4,000 chars (18 answers at/near the cap, `likely_truncated=1`);
    same Word-paste exotic-space contamination as Scope 2 — `norm_text()` ports as-is.
12. `organization` (Q5) is uncontrolled free text (one affiliation runs 1,257 chars).
    Join on `respondent_id` only; truncate labels.
13. Serving: `cd electricity-consequential/frontend && python3 -m http.server 8000`.
    `fetch()` breaks under `file://`. Playwright + Chromium preinstalled
    (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`; never run `playwright install`).
14. Chart.js 4.4.3 pinned via plain `<script src>` in `<head>` before `chart-colors.js`
    (which applies defaults at DOMContentLoaded) — never `defer`/end-of-body.
15. **Privacy under small n.** Four coarse segment dimensions only (§5). The exporter
    emits the `{"n":"<5"}` sentinel for any segment value with fewer than 5 respondents
    overall; pages hatch, never print, masked cells. Redacted respondents are never
    named, anywhere, ever.

---

## 3. Provisional findings digest

Computed by the manager directly from the raw export during planning, on the **raw base
(all 185 rows, junk included)** unless stated. Provisional in two ways: P01's build must
reproduce them; P22's export recomputes them on the **analytical base (180)**, and **P35
verifies the analytical-base numbers and the manager patches this section and P40's
brief** before the essay is written. Implementation sessions must not re-derive these
from scratch — and every number that lands on a page must come from the exported JSON,
not from this digest. Orientation, not a data source.

### 3.1 Participation and profile

185 respondents (IDs 3–201, gaps), 5,074 non-empty answer cells, 1,377 free-text answers
totalling 1.25M chars. Redaction requested: **77/185 = 41.6%** (108 named).
Country (28): US **104 (56%)**, UK 12, Japan 8, South Korea 6, Brazil/Germany/… tail.
Org type (13): Company 60, Consultant 27, NGO/civil society 21, Industry group 17,
Energy supplier/utility 16, Other 12, Academia/research 11, Data/analytics 7,
Financial 5, GHG program 3, Government 3, Registry operator 2, Verification 1.
Sector (24): Energy 38, Other 31, Prof/sci/tech services 20, ICT 17, Manufacturing 14.
Responding as: Organization 163 / Individual 22. Has inventory: Yes 101 / No 50 /
Other-N/A 34. Involved in inventory: Yes 95 / Not applicable 52 / No 32 / Other 6.
Engagement: median 19/43 substantive columns answered, p90 = 41; 183/185 answered ≥1.
Attrition is steep and monotone: Q18 n=165 → Q19 133 → Q21 110 → Q24 103 → matrix
99–108 → Q35 69 → Q43 80 → Q47 67 → Q52 **36**.

### 3.2 Stance questions

- **Q19 — is the Scope 2 TWG subgroup formula appropriate: 84 No / 49 Yes (63.2% No,
  n=133).** The consultation's headline. By org type (No/Yes): Company 28/13,
  Consultant 13/9, NGO 9/5, Industry group 8/3, Academia 6/3, **Energy supplier 5/7**,
  **Data/analytics 2/3**, Financial 4/0, GHG program 3/0, Government 1/2. Named
  42/29 vs redacted 42/20 — redacted lean further No.
- **Q21 — consider secondary effects: 57 Yes / 53 No (n=110).** A genuine split, and it
  flips by redaction: named 35Y/23N, redacted 22Y/30N.
- **Q24 — reporting period: 81 each-year / 22 lifetime (78.6%, n=103).** The one
  settled call.
- **Q31 — regional differences in additionality: 40 Yes / 32 Unsure-depends / 29 No
  (n=101).** Unresolved three ways.
- **Q33 — rigor varies by claim type (association vs causal): 43 Yes / 35 No (n=78).**
- **Q43 — max spatial granularity (n=80): Country 22 / Grid region 20 / Nodal 20 /
  Balancing area 15 / Zonal 3.** Four-way split across the whole coarse→fine ladder.
- **Q45 — max temporal granularity (n=81): Annual 31 / Hourly 30 / Sub-hourly 14 /
  Monthly 6.** A dead heat; binned: fine (hourly+sub-hourly) 44 vs coarse
  (annual+monthly) 37. By country: US 21H+8S vs 12A+1M (fine-leaning), **Japan 6/6
  Annual**, UK 2/2/2. Named lean fine (22H+9S vs 16A), redacted lean coarse (15A vs
  8H+5S). The Scope 2 hourly-vs-annual fight, replayed on consequential terrain.

### 3.3 The additionality matrix (Q26.1–26.9: Required / Optional / Not required)

| Test | n | R | O | N | net requiredness (%R−%N) |
|---|---|---|---|---|---|
| Regulatory | 108 | 69 | 22 | 17 | **+48** |
| Timing | 106 | 52 | 31 | 23 | **+27** |
| Contractual/tenor | 102 | 24 | 41 | 37 | −13 |
| Financial analysis | 107 | 18 | 58 | 31 | −12 |
| Positive list | 105 | 18 | 57 | 30 | −11 |
| Common practice | 103 | 23 | 33 | 47 | −23 |
| Barrier | 101 | 15 | 46 | 40 | −25 |
| Performance standard | 101 | 14 | 38 | 49 | −35 |
| First-of-its-kind | 99 | 10 | 36 | 53 | **−43** |

Three tiers: required (regulatory, timing), optional-middle (financial, positive list,
contractual — all Optional-modal), rejected (common practice, barrier, performance
standard, first-of-its-kind). **Q28 feasibility picks (n=98) rank almost identically**:
Regulatory 80, Timing 72, Positive list 58, Contractual 47, Financial 44, Performance 42,
Common practice 39, First-of-kind 35, Barrier 30, **"None (no tests are feasible)" 10**.
Requiredness and feasibility are coherent, not contradictory — the required tier is also
the feasible tier; the one asymmetry worth showing is first-of-kind (35 call it feasible,
10 want it required).

### 3.4 Methodology scoreboards (appropriate n / not-appropriate n; bases differ)

**Operating margin (Q35 n=69 / Q36 n=57):** SCED–locational **48/12**, Statistical
**44/10**, SCED–fuel-on-margin **40/11**, Scenario modeling 26/25, Heat-rate/LMP 23/24,
Capacity-factor-based 20/**31**, Difference-based 18/**28**. "None" 7/9.
**Build margin (Q38 n=69 / Q39 n=58):** Recent capacity additions **48/11**, Capacity
expansion modeling 30/27, Policy scenario 26/29, Average emission rate 17/**38**.
"None" 7/5.
**Weighting (Q47 n=67 / Q49-not-feasible n=57):** GHGP Grid-connected Guidelines
**30/8**, UNFCCC CDM Tool07 19/10, Default 0.50 build weight 16/8, Intervention
lifecycle 13/15, Resource adequacy 9/17. Specials: Unsure 15/21, "None are
appropriate" 9, "All are feasible" 16.
The shape: **clear winners exist per family** (SCED-locational + statistical for OM,
recent-capacity-additions for BM, GHGP guidelines for weighting) and clear losers
(capacity-factor and difference-based OM, average-emission-rate BM), with the middle
genuinely contested and Unsure shares large enough to be a maturity finding in
themselves.

### 3.5 Free text, evidence, coordination, integrity

- Free text dominates: 1,377 answers across 20 substantive columns (vs ~1,050 choice
  answers); Q18 alone n=165, median 1,638 chars. 18 answers at/near the 4,000 cap.
- **Q52 supporting research/documentation: n=36, of which 5 are "N/A"** — the
  consultation's own evidence question yielded ~31 substantive submissions. Citation
  mining across all free text (P10) is therefore the evidence story's main source.
- **Junk/test respondents (ADJUDICATED — final): ID 11** (name "fzbf", 12/15
  free-text answers gibberish), **ID 12** (redacted; all 24 free-text answers are the
  single letter "e"), **ID 14** (name "asdf", 9/10 gibberish), **ID 31** (redacted;
  all 6 free-text answers are runs of "a"; matrix straight-lined "Optional"; found by
  P10's full-185 sweep, confirmed by P20). Implemented gibberish rule: <20 chars AND
  (vowel ratio <0.30 | repeated-single-char | keyboard-run) on ≥50% of free answers.
- **Resubmission: IDs 100 → 151, same named individual (Julia Heidrich Sagaz)** — only
  8/36 overlapping cells identical; substantive answers *changed* between submissions
  (incl. Q19). Keep-latest policy: 151 counts, 100 is excluded and disclosed, the changed
  answers shown on the integrity page.
- **Entity family, not duplicate: Engie Impact ×2 (IDs 135, 160)** — different named
  individuals, different answers; both count, grouped as a family (Scope 2's Deloitte
  pattern).
- **Template blocks: 38 clusters (≥200 normalized chars shared by ≥2 respondents)
  spanning 25 respondents.** Two blocs [memberships CORRECTED post-Wave-1 from
  `data/derived/`]: **{43, 47, 60, 79, 82}** (5 core members of the
  `policy_insights_pack` — the provisional digest transposed 45 for 47; ID 45 is a
  peripheral single-cluster sharer, still template-flagged) and **{51, 86, 89, 117}**
  (the `bullet_pack`, ≥6 shared bullet-formatted texts across Q18–Q44). Bloc rule as
  implemented: connected components over ≥2 shared clusters (a ≥3 rule destroys the
  policy-insights bloc). Every "N said X" claim needs text-dedup, and quotes need
  template badges — same rules as Scope 2.
- Notable respondents (verify verbatim before quoting): **The NorthBridge Group** again
  the most verbose filer (75.7k chars; 177k in Scope 2); **Ever.green** responds — the
  consultation document itself uses Ever.green's contract structure as an additionality
  worked example; **XRB** (New Zealand's accounting standards board) files on behalf of
  its constituency; **Conversio Pty Ltd** states it prepares client responses to this
  consultation; **SEMI** (Scope 2 bloc anchor) appears again.

### 3.6 Redaction

41.6% overall. Named vs redacted stance splits above (3.2): redacted respondents lean
further against the formula, against secondary effects, and toward coarse granularity —
directionally the Scope 2 pattern (withheld identity correlates with the
defensive/conservative position), milder in size. P22 must export the named/redacted
SCELL split for every stance question so the integrity page can show it.

---

## 4. Site architecture

All pages copy `frontend/templates/page-template.html` (the P11 copy), obey
DESIGN_SYSTEM.md, load Chart.js + the site JS, and are registered in nav by P11
(placeholders) / P42 (final). Ten pages:

```
electricity-consequential/frontend/
├── index.html                 # P40 — Overview & objective assessment
├── decisions.html             # P30 — The Decision Board (centerpiece)
├── topics/
│   ├── formula.html           # P31 — Formula & scope         (doc §5–6, Q18–25)
│   ├── additionality.html     # P31 — Additionality           (doc §7, Q26–34)
│   ├── emission-rates.html    # P31 — Marginal emission rates (doc §8, Q35–46)
│   └── weighting.html         # P31 — BM/OM weighting         (doc §9, Q47–52)
├── voices.html                # P33 — Themes & voices
├── respondents.html           # P32 — Who responded + org browser
├── integrity.html             # P34 — Integrity & evidence
├── methodology.html           # P41 — Methods, caveats, reproduction
├── data/                      # P22 exports (+ fixtures/ from P11)
└── js/                        # P11 modules + per-page modules
```

**Nav (final form, P42):** Overview → `index.html` · Decision Board → `decisions.html` ·
Topics ▾ (Formula & scope / Additionality / Emission rates / Weighting) ·
Voices → `voices.html` · Respondents → `respondents.html` · Integrity →
`integrity.html` · About ▾ (Methodology / Scope 2 companion hub / dataset README on
GitHub). No mega-menu needed at 10 pages.

### Page specs

**decisions.html — the Decision Board (P30).** The whole consultation's closed decision
points in one visual grammar. Panels: (1) **stance strips** — Q19, Q21, Q24, Q33, Q31 as
horizontal 100% stacked bars (option order fixed from meta, n chip on every strip,
polarity-aware colors), with the shared segment toggle (org type / country / redaction /
responding-as) re-rendering all strips; (2) **additionality mini-matrix** — 9 tests ×
R/O/N strips sorted by net requiredness, sequential ramp, → links to
`topics/additionality.html`; (3) **methodology scoreboard roll-up** — every OM/BM/
weighting option as a paired diverging bar (appropriate → right, not-appropriate → left,
each labeled with its own base; specials listed beside, never netted), → links to topic
pages; (4) **granularity ladders** — Q43 and Q45 as ordered strips with the binned
fine-vs-coarse reading annotated; (5) **attrition strip** — n per substantive question in
survey order (165 → 36), the "how much evidence sits under each panel" context. Click any
strip → popover with full counts + segment split + link to its topic page.

**topics/*.html — 4 deep dives (P31).** One shared config-driven renderer
(`js/topic-page.js` reading a per-page `TOPIC_CONFIG` global). Standard panels: (1) the
topic's stance/matrix/scoreboard charts (same renderers as the Decision Board, full-size,
with segment toggles); (2) **themes panel** — coded free-text themes for the topic's
explain questions (horizontal bars, template-dedup-adjusted counts, n per question);
(3) **quotes for/against/context** — curated quote cards with attribution
("Company, US — named org" / "Redacted — Company, US"), template badges, links to org
profiles; (4) response-base footnote listing every question's n. Page extras:
*formula* — Q19 strip + Q20 themes; Q21 with paired Q22/Q23 reason themes; Q24/Q25 (the
settled call); Q18 benefits/challenges theme overview. *additionality* — the full 9×3
matrix as the site's one true heatmap (rows sorted by net requiredness, cell popovers
with segment splits); the **required-vs-feasible cross** (Q26 net requiredness plotted
against Q28 feasibility picks, incl. the 10 "none feasible"); Q31 + Q32 themes; Q33 +
Q34 themes; Q27/29/30 themes. *emission-rates* — OM scoreboard (Q35/36) + BM scoreboard
(Q38/39) full-size with per-option segment popovers; Q37/40 themes; granularity Q43/Q45
full treatment with segment toggles and Q44/46 themes; Q41 applicability + Q42
other-metrics themes. *weighting* — weighting scoreboard (Q47/49, specials prominent);
Q48/50 themes; Q51 other-approaches themes; Q52 evidence pointer panel (n=36 → link to
integrity page's evidence section).

**voices.html (P33).** The free-text record front and center: (1) theme taxonomy
overview — every theme with total mentions (raw and dedup-adjusted), grouped by topic;
(2) **filterable quote browser** — all curated quotes, filter by topic × stance ×
org type × redaction, theme chips on each card; (3) the template exhibit — the two
response packs shown as documents (shared passages highlighted, member lists with named
members only, redacted as counts); (4) verbosity/engagement distribution (chars per
respondent, the NorthBridge tail labeled); (5) how-coding-works note → methodology.

**respondents.html (P32).** (1) org type × redaction stacked bars; (2) country bar
(US share flagged); (3) sector top-N; (4) responding-as + inventory profile;
(5) **attrition funnel** 185 → 165 → 133 → … → 36 (the survey's engagement story);
(6) named-org browser — searchable/sortable table of the 105 named analytical-base
respondents (name ≤80 chars, org type, audited class, country, n answered, cites?,
template?, family, **stance fingerprint** = Q19/Q21/Q24/Q31/Q33 answer chips) → org
profile view rendering `orgs/{id}.json` (profile, flags, every answer incl. free text
in survey order); (7) named-vs-redacted stance comparison (the §3.6 splits).

**integrity.html (P34).** (1) **junk/test respondents** — the three rows shown verbatim
(IDs, the "e"/"asdf" evidence), the detection criteria, and the exclusion policy;
(2) **the resubmission** — IDs 100→151 with the changed answers shown side by side;
(3) entity families (Engie Impact ×2; any others P10 finds); (4) template blocs — bloc
cards ({43,45,60,79,82}, {51,86,89,117}) with shared-text counts, named members, effect
on headline stats (Q19/Q21 with and without dedup); (5) redaction analysis — the
gradient by org type + the named/redacted stance skew; (6) **the evidence base** —
Q52's 36 submissions tabulated, citation mining results (rates by org type/stance/
redaction, domain classification table, template-propagated citations), the "who did
the homework" roll-up; (7) cross-consultation panel — respondents appearing in both
consultations (SEMI, NorthBridge, Engie, Korean cluster candidates…) via read-only join
against the Scope 2 db, named only where named in both; (8) methodology caveat box
(what this audit can and cannot claim; redacted ≠ guilty; n=185 ≠ representative).

**methodology.html (P41).** Dataset provenance + build chain; question_id scheme and the
26.x parsing; junk/resubmission criteria and the 185→180 analytical base; theme-coding
method (closed vocabulary, curation process, dedup adjustment); matrix construct and
polarity definitions; scoreboard netting rule; segment coarsening + privacy mask;
scale/ladder definitions; limitations (self-selection, US-heavy, small n, thin Q52
evidence, consultation ≠ referendum); full reproduction commands.

**index.html (P40).** Hero stats row (185 respondents · 50 questions · 63% "formula not
appropriate" · 41.6% redacted · 36 evidence submissions). Headline stance-strip block
(Q19/Q21/Q24 + matrix top/bottom rows). The **objective assessment** (§8). Takeaway
cards linking every page. One `.emphasis-callout` maximum.

---

## 5. Frontend data contract (`frontend/data/*.json`)

P22 produces these; P11 authors `frontend/data/fixtures/` with identical shapes (tiny,
hand-written) so Lane F never blocks on Lane D; loader swaps to fixtures under
`?fixtures=1`. All aggregates are **analytical-base (180)**; junk/superseded rows appear
only inside `integrity.json`.

**Segment vocabulary (closed, coarse — gotcha 15):**
`org_type_5`: company 60 / consultant 27 / ngo 21 / industry_group 17 / other 56 (the
remaining nine types grouped; exact analytical-base counts from the db).
`country_4`: us / uk / jp / other. `redaction`: named / redacted.
`responding_as`: organization / individual.

**The cell grammar** (replaces Scope 2's likert CELL):
`SCELL = {"c": [counts in meta option order], "n": <sum>}` — length 2 for binaries,
3 for Q31 and matrix rows, 4–5 for Q43/Q45. No mean, no off-scale field: specials are
ordinary options flagged in meta so renderers can gray/segregate them. Client derives
percentages. Segment pattern everywhere: `{"overall": SCELL, "by": {"<dim>":
{"<key>": SCELL | {"n": "<5"}}}}`.

- **`meta.json`** — `{generated, totals:{respondents_raw:185, respondents:180,
  named, redacted, questions, answers, free_text_answers}, segments:{dim:{label,
  values:[{key,label,n}]}}, questions:[{qid, display, shorthand, label, topic,
  doc_section, type, asks_for, n_answered, page, options:[{key, label, special?:true,
  rank?:int}], polarity?:{critical:"<option key>"}}], matrix:{levels:[{key,label}],
  tests:[{qid, key, label, n}]}, scoreboards:{om|bm|weighting:{label, q_app, q_not,
  base_app, base_not}}}`.
- **`stances.json`** — `{"<qid>": {overall: SCELL, by: {...}}}` for Q19, Q21, Q24, Q31,
  Q33, Q43, Q45.
- **`matrix.json`** — `{tests:{"<qid>": {overall: SCELL(3), by: {...}}},
  feasibility:{n:98, per_test:{"<test key>": {n, by:{...}}},
  specials:{none_feasible:{n}}}}` (Q28).
- **`scoreboard.json`** — `{om|bm|weighting: {base_app, base_not, options:[{key, label,
  app:{n, by:{...}}, not:{n, by:{...}}, net_pct}], specials:[{key, label, side:
  "app"|"not", n}]}}`. net_pct per gotcha 7, 1dp.
- **`themes.json`** — the reasons.json replacement: `{taxonomy:[{key, label, definition,
  polarity: "concern"|"support"|"design"|"neutral"}], by_question:{"<qid>": {n_texts,
  n_coded, themes:[{key, n, n_dedup, share_pct}]}}}` from `reference/coded_themes.csv`.
  `n_dedup` counts template-cluster members once.
- **`quotes.json`** — `{"<topic or qid>": {for:[QUOTE], against:[QUOTE],
  context:[QUOTE]}}`, `QUOTE = {text(≤600, verbatim substring, […] elision allowed),
  qid, respondent_id, attribution, org_type, redacted, themes:[keys],
  template_cluster: null|hash}`. Junk/superseded respondents never quoted.
- **`respondents.json`** — `{distributions:{org_type_x_redaction, country, sector_top,
  responding_as, inventory, engagement_bands}, attrition:[{qid, display, n}],
  redaction_effect:[{qid, named: SCELL, redacted: SCELL}],
  org_index:[{id, name(≤80), org_type, audited_class, country, nsub, ft_chars, cites,
  template, family, fingerprint:{q19,q21,q24,q31,q33: option key|null}}]}`.
- **`orgs/{respondent_id}.json`** — one per named analytical-base respondent (105):
  `{id, name, org_type, audited_class, audit_basis, sector, country, responding_as,
  flags:{template, family, cites, citation_count}, answers:[{qid, display, shorthand,
  label, type, text, selections:[...]}]}` in survey order.
- **`integrity.json`** — `{excluded:[{id, reason:"junk"|"superseded", name_or_redacted,
  evidence:[strings], n_cells}], resubmission:{kept:151, dropped:100, changed:[{qid,
  before, after}]}, families:[{name, ids, n}], text_clusters:[{hash, chars,
  n_respondents, n_named, named_members:[{id,name}], n_redacted, preview(≤240),
  qids:[...]}], blocs:[{key, label, member_ids_named:[{id,name}], n_redacted,
  shared_texts}], dedup_effect:[{qid, raw: SCELL, deduped: SCELL}],
  citations:{by_org_type:[{key,n,citing,pct}], by_redaction:{...},
  by_stance_q19:{...}, domains:[{domain, count, class}], q52:[{respondent_id,
  attribution, preview}], template_citation_blocks:[...]},
  audit:{vocabulary:[{key,label,definition}], rows:[{id, name, claimed, audited,
  basis(≤200)}], summary:{...}}}`.

Size budget: every file ≤ 300 KB; `orgs/` singles ≤ 150 KB. Deterministic serialization
(sorted keys, 1dp percents / 2dp only where specified, trailing newline, ROUND_HALF_UP,
`generated` from the source file's date in `manifest.json`, never wall clock).
`validate_frontend_data.py` re-derives everything from the db and fails loudly (§6).

---

## 6. Data pipeline spec (Lane D)

**P01 — `scripts/build_dataset.py` + `scripts/survey_meta.py` (stub) +
`scripts/validate_dataset.py`.** Port the Scope 2 mechanical layer; every editorial
judgment goes to `survey_meta.py`/labels, per the upstream separation. Required deltas:
`SRC`/`SHEET`("Raw Data")/output names (`electricity_consequential.sqlite`); header
parser per gotcha 10 (store `question_id`, `question_number` INT major, `sub_number`,
`display`); PROFILE dict Q3–Q17 (14 fields — same semantics as Scope 2 incl.
redaction attribution: name/org → "Redacted" when Q3=Yes, "Not provided" when blank);
role rules re-derived from this survey's boilerplate ("If you selected 'Other'" →
`other_specify`; "Please explain your answer to question N" / "please provide
additional context" → `comment` with explicit `parent`; "If you answered yes/no to
question N" → `comment` + parent + `condition`); multi-select detection (semicolon,
trailing-delimiter convention — the 7 multi-select columns AG/AN/AO/AQ/AR/AZ/BB);
whitespace-normalized option matching with verbatim preservation; matrix columns typed
`matrix_rating` with ladder required(3)/optional(2)/not_required(1) as `answer_rank`;
ordered selects Q43/Q45 with coarse→fine ranks; specials list (gotcha 6) flagged
`is_special`, rank NULL; binary/3-way `single_select` with polarity left to meta;
`extract_refs` clamps 3..52 (catches "question 19", "question 21"…). Outputs: the same
6 CSVs + SQLite + manifest as Scope 2 (wide table included), views adapted:
`v_stance_answers` (choice answers incl. matrix, with topic/asks_for carried),
`v_stance_summary`, `v_selections`, `v_free_text`, `v_option_counts`, `v_answer_types`,
`v_question_tree`, `v_stance_by_redaction`, `v_redaction_profile`. Respondents table
carries `is_redacted`, `is_excluded` (0 at P01 — adjudication lands via P10/P20; the
*flag columns exist from day one*), engagement metrics. A generated
`reference/question_labels.csv` **stub** (mechanical shorthands, topic=`tbd`) lets the
build run before P02; `load_labels()` polices vocabularies once P02 replaces it.
`validate_dataset.py`: port structural checks 1–13 (round-trip cell conservation —
every non-empty cell appears exactly once, values verbatim; selection explosion
conservation ≈1,277; label coverage; anchor/parent integrity) + new frozen figures
(respondents 185, questions 44 (35 numbered + 9 matrix), answer cells 5,074, free-text
answers 1,377, redacted 77, junk-candidate cells 125, cap-length answers 18, views
return rows).

**P02 — labels, meta, README (fable).** Replace the stub `reference/question_labels.csv`
(44 rows × hand-judged fields: `shorthand` (≤40 snake_case, unique — e.g.
`formula_appropriate`, `addl_regulatory_req`, `om_methods_appropriate`,
`temporal_granularity_max`), `label`, `topic`
(profile/general/formula/additionality/emission_rates/weighting), `doc_section`
("6.1", "7.2"…), `category`/`subcategory` (cross-cutting concern vocabulary — design
before labelling, keep orthogonal to topic), `asks_for`
(stance/matrix_rating/feasibility_pick/method_pick/design_preference/rationale/
elaboration/evidence/respondent_attribute/open_feedback), `notes` (every wording
ambiguity — e.g. Q26.6 typo, Q28's unstated multi-select-ness, Q43/45 "maximum
appropriate" framing). Finalize `survey_meta.py`: SECTIONS (survey-order groups),
MATRIX ladder + construct, ordered-select ladders, SPECIAL_OPTIONS, POLARITY map,
NOTES, closed vocabularies + `load_labels()` gatekeeper. Rebuild; all validator checks
green; write `electricity-consequential/README.md` in the root-README register: pick-a-
file table, per-table docs, the caveats (analytical base, matrix-not-sentiment, specials,
own-base netting, redaction, attrition, template dedup, 26.x scheme), recipes (SQL +
python), rebuild instructions.

**P10 — `scripts/analytics/derive_flags.py` + tests.** Port the machinery; content:
- `data/derived/respondent_flags.csv` (all 185): `respondent_id, is_junk_candidate,
  junk_evidence, is_resubmission_superseded, resubmission_of, entity_family,
  is_template_respondent, n_shared_texts, template_bloc, has_citation,
  n_citation_answers, n_urls, stance_fingerprint` (Q19/21/24/31/33 answer keys,
  `-` where unanswered).
- `data/derived/text_clusters.csv` — normalized ≥200-char strings shared by **≥2**
  respondents (the Scope 2 threshold was ≥3; at n=185 pairs matter): hash, members,
  counts, qids, preview. Expect ≈38 clusters / ≈25 respondents.
- `data/derived/citations.csv` + `data/derived/domains.csv` — the Scope 2 regex battery
  + domain classification (port the DOMAIN_CLASS map; extend with domains seen here —
  marginalimpactmethod.*, ONS/MCTI Brazilian sources, etc.).
- Junk detection formalized: flag respondents where ≥50% of free-text answers are
  gibberish (<20 chars, consonant-heavy or single-repeated-char) — expect exactly
  {11, 12, 14}; resubmission detection (same normalized name, both non-empty — expect
  {100→151}); entity families (same normalized org — expect Engie Impact {135,160});
  blocs from text-cluster overlap (expect the 5-member and 4-member packs).
- `test_derive_flags.py`: frozen expectations above + determinism (byte-identical rerun).
P10 does **not** set `is_excluded` in the dataset — it emits candidates; P20 adjudicates;
P22 enforces.

**P20 — `reference/org_audit.csv` + adjudication + tests.** For all 108 named
respondents: `respondent_id, organization_verbatim, claimed, audited_class, confidence,
basis` — Scope 2's 15-value vocabulary + `test_junk`. **No web browsing** — classify
from the submission text itself (org name, self-description, answer content).
Plus `reference/exclusions.csv`: the adjudicated exclusion list
(`respondent_id, exclusion_reason ∈ {junk, superseded}, evidence`) — confirm/amend P10's
candidates {11, 12, 14, 100}; redacted junk (ID 12) is adjudicated on answer content
alone. `test_org_audit.py` ports the structural checks (coverage, closed vocab, no
redacted respondents, basis ≤200 chars) + spot fixtures.

**P21 — theme coding + quotes (fable).** One reading pass over all 1,377 free-text
answers (junk rows skipped). Produce (a) `reference/coded_themes.csv`:
`respondent_id, qid, theme_key` (multi-label; closed taxonomy of ~25–40 keys designed
first — concerns like `attribution_uncertainty`, `double_counting`, `data_availability`,
`regional_equity`, `complexity_burden`, `gaming_risk`, `alignment_inventory_vs_impact`,
supports like `system_view_needed`, `price_signal`, design asks like `tiered_by_claim`,
`default_5050`, `regional_tests`…; taxonomy documented in
`reference/theme_taxonomy.md` with definitions + inclusion rules); (b)
`reference/curated_quotes.json` in the §5 QUOTE shape — 3–6 quotes per side per topic
(for/against/context), verbatim substrings, ≤600 chars with `[…]` elisions, template
badges via the P10 hash recipe (compute inline if P10 hasn't merged — same recipe, hashes
line up), redaction-safe attribution, no junk/superseded respondents; (c)
`test_themes_quotes.py`: closed-vocab enforcement, verbatim-substring check
(elision-aware), quota/length/redaction rules, badge correctness.

**P22 — `scripts/analytics/export_frontend.py` + `validate_frontend_data.py`.** Emit §5
exactly. Port the deterministic writer, n<5 mask, org-file pruning,
`--allow-missing-curation` (emits without themes/quotes/audit and stamps
`"provisional": true` in meta). Enforce the analytical base from
`reference/exclusions.csv` (fallback: P10 candidates + hardcoded {11,12,14,100} if
neither has merged — flag loudly in meta). Validator groups: canonical bytes; SCELL
arithmetic vs db (every cell, every segment, sums equal overalls); mask placement;
the hard numbers (Q19 84/49 raw → recomputed analytical equivalents, matrix table §3.3,
scoreboard §3.4, attrition §3.1); org index/files coverage + no-redacted-names +
no-excluded-respondents; verbatim quotes; meta coverage (every page's questions
present); themes consistency (counts ≤ n_texts, dedup ≤ raw); size budgets. Exit
non-zero on any failure; used by every later prompt.

---

## 7. Frontend infra spec (Lane F, P11)

- **Shell copy** from root `frontend/` into `electricity-consequential/frontend/`:
  `styles/shared.css`, `styles/article.css`, `styles/cinematic.css` byte-identical;
  `js/shared-header.js`, `js/canvas-banners.js`, `js/scroll-observer.js`,
  `js/chart-colors.js` byte-identical; `assets/cinematic-bg.png` reused (shared visual
  identity); `templates/page-template.html` adapted (title/head list);
  `js/nav.js` with NAV_ITEMS/NAV_BRAND for this site (§4 structure, placeholder hrefs
  legal) and `NAV_BASE` regex extended to `topics/`; `js/shared-footer.js` FOOTER_LINKS
  + DEFAULT_NOTE for this site; `js/cinematic-bg.js` (path resolves relative to itself —
  usually zero edits); `DESIGN_SYSTEM.md` copied with the head-include list corrected to
  match reality (add site.css + site modules) and a provenance line ("copied from the
  repo-root hub, upstream hourly-cfe-optimizer"). Verbatim files stay verbatim — prove
  with byte comparison against the root copies in acceptance.
- **New site modules** (namespace `EC*`):
  - `js/data-loader.js` — port of S2Data as `ECData` (generic; rename only).
  - `js/segments.js` — port as `ECSegments` bound to the 4-dim §5 vocabulary;
    URLSearchParams state; `segmentchange` events.
  - `js/stance-viz.js` — `ECStance`: (a) stance strip renderer (100% stacked horizontal,
    polarity-aware color mapping, special options grayed, n chip, masked-segment
    hatching, popover with counts + segment table); (b) paired diverging scoreboard
    renderer (own-base percentages, specials sidebar); (c) attrition strip; (d) `srTable`
    visually-hidden data tables. Salvage grid/hatch/popover mechanics from root
    `likert-viz.js`; colors exclusively from design tokens (support ramp for polarity
    questions, neutral sequential for ladders).
  - `js/matrix-viz.js` — `ECMatrix`: the 9×3 CSS-grid heatmap (sequential stringency
    ramp on %, per-cell aria-labels, click popover with segment split), the mini-matrix
    variant, and the required-vs-feasible scatter/dumbbell.
  - `js/quote-cards.js` — port as `ECQuotes` + theme chips.
  - `js/org-table.js` — port as `ECOrgTable`; fingerprint chips instead of sparklines.
  - `styles/site.css` — new-component styles only, `.ec-*` prefixed, tokens only.
- **Fixtures**: `frontend/data/fixtures/*.json` — miniature hand-authored instances of
  every §5 shape (2 stance questions, 3 matrix tests, 1 scoreboard, 2 themes, 2 quotes,
  3 org rows + 3 org files, integrity with 1 bloc) exercising every renderer path incl.
  n<5 masks and specials. `?fixtures=1` switches the loader; `dev.html` harness renders
  every component from fixtures (the smoke test later waves rely on).
- Accessibility: real `<button aria-pressed>` toggles; `role="gridcell"` +
  aria-labels on matrix cells; `.sr-only` tables beside every canvas; WCAG-safe text
  via `-text` token variants.

---

## 8. The objective assessment (P40 content brief)

Long-form article on `index.html`; every claim links to a panel; verify every number
against the exported JSON. Structure (8 sections):

1. **What this consultation is, and who showed up.** AMI/TWG context in two sentences;
   185 self-selected respondents, 56% US, company-heavy; 41.6% redaction; steep
   attrition (165 → 36 — by the evidence question, four-fifths of the room has left);
   three junk submissions and one resubmission found and excluded (link integrity).
   Consultation ≠ referendum, and at this n, ≠ survey.
2. **The headline: the proposed formula does not command consent.** 63% No (84/133,
   raw) — but disaggregate the No via Q20 themes: "wrong construct for attribution" vs
   "right direction, underspecified" vs "too complex to audit" are different verdicts
   with different remedies. Segment view; named-vs-redacted check; the org types that
   *support* it (energy suppliers, data/analytics) noted with their n.
3. **Genuine splits, not consensus.** Secondary effects 57/53 (and the redaction flip);
   temporal granularity a dead heat with a US-vs-Japan geography; spatial split four
   ways; against that, annual reporting (79%) is the one settled call. Map the splits
   to interest where the data supports it, and say where it doesn't.
4. **The additionality gradient is coherent.** The three tiers; requiredness and
   feasibility rank almost identically (the crowd is answering "what works", not
   venting); the tension points: 10 respondents say no test is feasible, regional
   application unresolved (40/32/29), rigor-by-claim-type splits 43/35.
5. **The methodology scoreboards, read with humility.** Clear winners and losers per
   family at n=57–69; the large Unsure/None shares are themselves the finding — this
   field is younger than Scope 2's; no method commands a majority of even this small,
   self-selected base.
6. **The evidence base is thin, and the record is rhetorical.** The consultation's own
   evidence question yielded ~31 substantive submissions; citation mining across free
   text; template packs propagate identical arguments (show the dedup effect on Q19/Q21);
   distinguish argued positions from asserted ones; 4,000-char truncation caveat.
7. **Interest, coordination, integrity — symmetric skepticism.** Who gains from each
   answer (modeling consultancies and data vendors from complex/granular methods;
   reporting companies from simple/coarse ones; both directions of interest exist and
   neither invalidates an argument). The blocs, named members only. The redacted
   plurality leans conservative — attributable-only reads skew the other way. Scope 2
   repeat filers where the cross-consultation panel lands.
8. **How a third party should read this.** Signal strongest on: formula-as-proposed
   rejected, regulatory+timing tests, annual reporting, average-emission-rate BM
   rejected. Genuinely open: secondary effects, granularity, most of the methodology
   middle. What would settle it: published back-tests, registry pilots, the evidence
   Q52 barely surfaced. End on what the consultation *can* legitimately inform.

Tone: third-party, specific, hedged at small n (every subgroup claim carries its n),
zero advocacy, no side declared right. P35's verification memo corrections are binding.

---

## 9. Acceptance template (every prompt ends with this)

1. `python3 electricity-consequential/scripts/validate_dataset.py` → all checks pass
   (you touched nothing under `data/` except `data/derived/` — Lane D exceptions only).
2. `python3 electricity-consequential/scripts/analytics/validate_frontend_data.py`
   passes (Waves 2+).
3. `cd electricity-consequential/frontend && python3 -m http.server 8000` → your page
   renders with zero console errors; toggles work; `?fixtures=1` works (Lane F).
4. Playwright screenshots (desktop 1440px + 390px mobile) saved to your session
   scratchpad and eyeballed: no overflow, no unstyled placeholder text, palette from
   tokens.
5. DESIGN_SYSTEM.md rules: no inline styles for shared components, no hardcoded
   hex/fonts; the copied verbatim shell files stay byte-identical to the root-hub
   copies (prove with a diff/hash comparison in your report).
6. **Commit in your worktree** with a descriptive message. Do **not** push; do **not**
   open a PR; do not merge other lanes. The manager merges worktrees into
   `claude/electricity-consultation-hub-lp37w8`, revalidates, and pushes.
7. Report back: what you built, every deviation from PLAN.md (flag loudly), the evidence
   items your prompt's Acceptance section names, and anything the next wave needs.
