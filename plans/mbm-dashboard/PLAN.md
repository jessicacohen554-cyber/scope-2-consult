# MBM Consultation Dashboard — Master Plan

This is the shared context document for every implementation session in the prompt pack
(`plans/mbm-dashboard/prompts/P*.md`). Every prompt starts with "read this file". It
carries: the verified findings digest, the site architecture, the frontend data contract,
the pipeline spec, the orchestration map, and the guardrails. Nothing in `data/` is ever
modified by this project — the pipeline only *adds* `data/derived/`, `reference/` inputs,
and `frontend/data/` exports.

**Goal.** A multi-page static dashboard site in `frontend/` analyzing the GHG Protocol
Scope 2 public consultation with a focus on the **market-based method (MBM)**: a likert
heatmap explorer with oppose/neutral/support grouping and org-type / industry /
redaction / country toggles; per-proposal drill-downs with reasons and curated quotes for
and against; an evidence & research-integrity analysis; a respondent legitimacy audit
(self-classification, coordinated campaigns, entity families); and a balanced,
evidence-linked objective assessment on the landing page.

---

## 1. How this plan is executed

The work is split into **14 prompts** across **5 waves**. Prompts inside a wave run in
**parallel Claude Code sessions** (separate branches); waves are **sequential**. A human
"plan manager" (or a manager session) hands out prompts, merges branches between waves,
and re-runs the exporter when curation inputs land.

| Wave | Prompts | Parallel? | Model | Depends on |
|---|---|---|---|---|
| 1 | P10 derived flags & text mining | ∥ P11, P20 | claude-opus-5 | — |
| 1 | P11 frontend infra (against fixtures) | ∥ P10, P20 | claude-opus-5 | — |
| 1* | P20 org legitimacy audit | ∥ P10, P11 | claude-opus-5 | — (db only; promoted from Wave 2) |
| 1* | P21 quote curation | ∥ P10, P11, P20 | claude-opus-5 | — (promoted; computes its own template dedup inline, cross-checks P10 later) |
| 2 | P22 frontend JSON exporter | rerun after P20/P21 merge | claude-opus-5 | P10 — may start the moment P10 pushes, even if P11 still running |
| 3 | P30 likert heatmap page | ∥ all Wave 3 | claude-opus-5 | P11 + P22 |
| 3 | P31 proposal deep-dive pages (×9) | ∥ | claude-opus-5 | P11 + P22 (quotes appear when P21 lands) |
| 3 | P32 respondents page + org browser | ∥ | claude-opus-5 | P11 + P22 |
| 3 | P33 evidence & research page | ∥ | claude-opus-5 | P11 + P22 |
| 3 | P34 integrity & coalitions page | ∥ | claude-opus-5 | P11 + P22 (provisional audit.json legal until P20 merges) |
| 3 | P41 methodology page | ∥ all Wave 3 (promoted from Wave 4) | claude-opus-5 | P10 + P22 |
| 3.5 | P35 viz-exploration stub | any time after P22 | claude-opus-5 | P22 |
| 4 | P40 index & objective assessment | sequential | **claude-fable-5** (fallback opus) | all Wave 3 + exporter rerun with P20/P21 |
| 5 | P42 QA, nav unification, polish | sequential, last | claude-opus-5 | everything |

**Wave overlap rules (the waves are barriers of convenience; the DAG is the truth):**
P20 needs only the database — it can launch alongside Wave 1 (its files,
`reference/org_audit.csv` + `scripts/analytics/test_org_audit.py`, are disjoint from
P10's). P22 may start as soon as **P10** has pushed — it does not wait for P11 (if P11
later reports a contract reinterpretation, the manager reconciles and P22 re-runs; the
exporter is cheap to re-run by design). P21 computes its own inline template-dedup (same
normalization recipe as P10, so cluster hashes line up) and merely cross-checks P10's
`text_clusters.csv` when available — so it too can launch on day one.
P41 needs only P10+P22 outputs and joins Wave 3. The **critical path** is
P10 → P22 → (P30–P34) → P40 → P42 — five sequential steps; everything else hangs off it
in parallel.

**Model rationale.** claude-opus-5 for every prompt except one — per the project owner's
standing instruction, no session runs on a smaller model. The single exception is
**P40 (index & objective assessment), which requires claude-fable-5** — it is the
highest-judgment editorial task in the project (balanced legitimacy assessment); run it
on opus-5 only if fable-5 is unavailable, and say so in its report.

**Branch strategy.** Each session branches off the branch that carries this plan
(`claude/mbm-survey-dashboard-plan-vomkop`) — or `main` once the plan has merged — using
the branch name given in its prompt (`claude/mbm-p10-derived-flags`, …). Sessions commit
and push their own branch and do **not** open PRs unless asked. Between waves the manager
merges finished branches together (they touch disjoint files by design; the only
deliberate merge point is `nav.js`, unified in P42).

**Lane isolation.** Lane D (data) owns `scripts/analytics/`, `data/derived/`,
`reference/org_audit.csv`, `reference/curated_quotes.json`, `frontend/data/`. Lane F
(frontend) owns `frontend/js/` site-specific files, `frontend/*.html`,
`frontend/proposals/`, `frontend/styles/site.css` (new file; the three upstream CSS files
stay verbatim). Wave 3 page prompts each own exactly their page + their JS module. Nobody
edits another lane's files; `nav.js` placeholder entries are added only by P11 and
finalized only by P42.

---

## 2. Repository primer

- `README.md` (root) — read it in full; it documents every table, view and caveat.
- Data: `data/scope2_consultation.sqlite` (tables `questions`, `responses`,
  `response_selections`, `question_options`, `respondents`; views `v_scale_answers`,
  `v_selections`, `v_free_text`, `v_answer_types`, `v_option_counts`, `v_scale_summary`,
  `v_question_tree`, `v_scale_by_redaction`, `v_redaction_profile`). CSV mirrors in
  `data/`. Codebook: `data/questions.csv` — 180 questions with `shorthand`, `label`,
  `method` (116 = mbm), `category`/`subcategory`, `policy_lever` (53), `asks_for`,
  `question_type`, `scale_construct`, `scale_anchor_low/high`, `anchor_question`,
  `parent_question`, `n_answered`.
- Frontend: `frontend/` — static design-system shell. **`frontend/DESIGN_SYSTEM.md` is
  law**: required head includes, `.header` block, shared component classes, palette
  variables, motion rules, and the "verbatim files stay verbatim" rule. Site-specific
  edits allowed only in `nav.js` (NAV_ITEMS/NAV_BRAND), `shared-footer.js`
  (FOOTER_LINKS/DEFAULT_NOTE), `cinematic-bg.js` (image path), page HTML, and **new**
  site-specific JS/CSS files.
- Scripts: `scripts/build_dataset.py` (mechanical reshape — do not touch),
  `scripts/survey_meta.py` (editorial metadata), `scripts/validate_dataset.py`
  (all checks must keep passing — 27/27 as of this writing; requires `pip install openpyxl`).

### Environment gotchas (every session hits these)

1. **No `sqlite3` CLI, no pandas.** Use `python3` with stdlib `sqlite3`, `csv`, `json`,
   `re`, `hashlib`. `pip install openpyxl` only if rebuilding the dataset (you won't).
2. **SQLite columns are TEXT-typed.** `sum(is_redacted)` silently returns 0. Use
   `is_redacted+0`, `answer_numeric+0.0`, `substantive_completion_pct+0.0` in SQL, or
   cast in Python.
3. `respondent_id` runs **5–1171 with gaps** — never assume 1..1072.
4. **Never pool scale scores across `scale_construct`.** `support` (5=support),
   `burden_relative`/`cost_relative` (**3 = same as today**; 5 = much more = complaint),
   `impact_magnitude`, labeled scales, `ordinal` ranks. Filter first, always.
5. **Divide by the right base.** Response rates run 1,072 → 75. Q71/Q83 have ~900
   answers; Q97/Q124 ~522. Never compare percentages across questions without showing n.
6. Q140 and Q174 mix write-ins into options: filter `is_canonical = 1`.
7. Drill-downs key on **`policy_lever`**, not `anchor_question` — the evidence-basis
   questions (Q122, Q138, Q158) and cost questions do *not* hang off the stance anchors.
8. Multi-select percentages sum >100%; derived per-respondent booleans come from
   `response_selections`, not option totals.
9. Off-scale options ("Unsure", "Unknown", "No basis to assess", "Prefer not to say")
   have `answer_numeric = NULL` and `is_off_scale = 1` in `question_options`. Show them;
   never fold them into the scale.
10. Free text: 4,000-char cap (8 truncated answers, `likely_truncated=1`); ~1,900 exotic
    spaces already normalized; `organization` is uncontrolled free text (placeholders,
    prose up to 3,890 chars) — truncate labels, join on `respondent_id` only.
11. Q183 years > 2050 (eleven 2099s) are protest answers — flag, don't average blindly.
12. Serving: `cd frontend && python3 -m http.server 8000`. `fetch()` breaks under
    `file://`. Playwright + Chromium are preinstalled
    (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`; never run `playwright install`).
13. Chart.js is **not** loaded yet. `js/chart-colors.js` applies Chart defaults on
    DOMContentLoaded and no-ops if Chart is absent — load Chart.js via a plain
    `<script src>` (pinned CDN version) in `<head>` *before* DOMContentLoaded fires,
    i.e. never `defer`/end-of-body.

---

## 3. Verified findings digest (all numbers computed from the SQLite db)

Implementation sessions must **not** re-derive these from scratch, but every number that
lands on a page must come from the exported JSON (which is validated against the db) —
this digest is orientation, not a data source.

### 3.1 The seven MBM support anchors (`scale_construct='support'`, 5 = strongly supports)

| Q | shorthand | n | mean | 1–2 (oppose) | 3 | 4–5 (support) |
|---|---|---|---|---|---|---|
| 71 | qc4_hourly_matching_support | 909 | **2.07** | 638 (70.2%) | 67 (7.4%) | 204 (22.4%) |
| 83 | qc5_deliverability_support | 875 | 2.40 | 516 (59.0%) | 98 | 261 (29.8%) |
| 97 | sss_pro_rata_support | 522 | 3.14 | 158 (30.3%) | 110 | 254 (48.7%) |
| 113 | resid_mix_def_support | 537 | 3.54 | 121 (22.5%) | 98 | 318 (59.2%) |
| 124 | fossil_fallback_support | 522 | 3.07 | 206 (39.5%) | 75 | 241 (46.2%) |
| 153 | hourly_exempt_support | 748 | **4.06** | 106 (14.2%) | 71 | 571 (76.3%) |
| 171 | legacy_clause_support | 801 | **4.58** | 39 (4.9%) | 41 | 721 (90.0%) |

The shape: **requirements rejected, escape hatches embraced.** Q171 is the tightest
consensus in the survey.

### 3.2 The other MBM scale questions (heatmap rows, 22 total)

- `burden_relative` (3 = same as today; high = complaint): Q78 internal effort QC4
  **4.74**, Q79 external cost QC4 **4.73**, Q92 QC5 4.53, Q93 QC5 4.52.
- `cost_relative`: Q139 procurement price **4.66** (415 of 444 answered 4–5).
- `impact_magnitude`: Q142 IFRS/GAAP 3.96 (n=127), Q179 legacy disclosure 2.68 (n=195).
- `readiness_labeled`: Q118 registry readiness **2.21** (n_scored=243; +67 "insufficient
  basis to assess").
- `sufficiency_labeled`: Q130 feasibility measures **2.33** (n_scored=556; +36 no-basis;
  label ladder is non-monotonic in wording — footnote it).
- `ordinal` ladders: Q70 threshold (50 GWh 437/651 = 67%), Q77 load-in-scope (33%
  "Unsure"), Q120/121 residual-mix lead times (44% "Unknown"), Q134 decision-usefulness
  gain (modal answer: "No meaningful improvement" 221/459), Q136 comparability gain
  (modal "No meaningful improvement" 210/432).
- `numeric_year`: Q183 uniform effective date (n=207, protest 2099s).

### 3.3 Segments and redaction

org_type (15): Company 466, Industry group 103, Consultant 96, NGO 92, Energy
supplier/utility 91, Other 77, Academia/research 44, Data/analytics 25, Financial 24,
Government 20, Registry operator 13, Verification 8, GHG program 7, Grid operator 4,
International agency 2. Sector: 29 values (Energy 184, Other 148, Manufacturing 138…).
Country: 56 (US 343, UK 95, JP 80, DE 71, CN 65…). responding_as: Organization 915 /
Individual 157 (redaction flat across this axis).

Redaction 573/1,072 (53.5%), steep gradient: Company **69.7%**, Financial **70.8%**
redacted vs Academia 22.7%, Data/analytics 20.0%, NGO 28.3%. Sectors: Biotech/pharma
95.7%, Chemicals 82.8%, Retail 77.4% vs Education 18.8%. Inventory preparers redact more
(67% of `involved_in_inventory=Yes`).

Redaction × stance (named mean vs redacted mean): Q71 2.37/1.81, Q83 2.65/2.19,
Q97 3.24/3.05, Q113 3.80/3.30, Q124 3.41/2.76, Q153 4.14/3.98, **Q171 4.51/4.63 — the
sole reversal**. Headlines built only on attributable responses skew supportive.

### 3.4 Stance by org type (mean; Q71/Q83/Q97/Q113/Q124/Q153/Q171)

| org type | Q71 | Q83 | Q97 | Q113 | Q124 | Q153 | Q171 |
|---|---|---|---|---|---|---|---|
| Company | 1.65 | 1.99 | 3.11 | 3.23 | 2.63 | 4.10 | 4.71 |
| Industry group | 1.68 | 1.83 | 2.53 | 3.08 | 2.37 | 3.71 | 4.73 |
| Consultant | 2.46 | 2.96 | 3.64 | 3.88 | 3.65 | 4.14 | 4.46 |
| NGO/nonprofit | 3.07 | 3.33 | 3.59 | 4.17 | 4.16 | 4.24 | 4.25 |
| Energy supplier/utility | 2.21 | 2.34 | 2.40 | 3.30 | 2.90 | 4.14 | 4.71 |
| Academia/research | 2.97 | 3.18 | 3.77 | 4.22 | 3.76 | 3.86 | 4.22 |
| **Data/analytics provider** | **4.10** | **4.00** | 4.18 | 4.32 | 4.39 | **3.56** | **3.81** |
| Financial Institution | 2.32 | 2.42 | 4.14 | 4.50 | 4.86 | 4.25 | 4.33 |
| Government institution | 2.07 | 4.09 | 3.20 | 2.75 | 3.75 | 4.25 | 4.00 |

**The commercial fingerprint:** data/analytics vendors (who would sell hourly-matching
tooling) are the only org type supporting Q71 while being the least supportive of the
exemptions and legacy clause that let reporters avoid buying it. The mirror image:
companies/industry groups oppose Q71 at ~82% and support the legacy clause at 4.7+.
Small-n caveats apply (Financial n=7–8 on Q97–124; Government n=8–14).

### 3.5 Coordination and duplication

- 154 respondents (14%) share ≥1 verbatim ≥200-char answer with ≥2 others (285 distinct
  shared strings). Largest single-question clusters: Q126 ×17, Q115 ×17, Q170 ×16,
  Q155 ×15, Q168 ×14. Stock short answers: "We disagree with proposed changes to the
  purposes of the MBM." ×23 + ALL-CAPS variant ×19.
- **Pro-hourly bloc (22 respondents):** byte-identical 7-anchor vector (5,5,4,5,5,4,4),
  45 shared verbatim texts. Named members: EnergyTag Ltd, TenneT, Princeton ZERO lab,
  critical infrastructure lab / U. Amsterdam, The Breakthrough Institute, AI + Planetary
  Justice Alliance, Bellona Europa, As You Sow, Enosi Australia, Buildings Alive, Firm
  Clean Power Corp, Renewabl Ltd, WattEd, Fervo Energy, Kaya Partners advisor, SIDENOR
  GROUP, "Employee"; +5 redacted. Free-text volumes cluster at 29–32k chars (shared
  response pack). The apparent independent academic corroboration is **not independent**.
- **euro_certificate bloc (found by P35, now in clusters.json):** 15 named European
  certificate-market organizations (RECS, Eurelectric, Finnish Energy, Samorka, ECS
  Switzerland, Fortum, Hafslund, Landsvirkjun, ON Power, BKW, Repower, Ecohz, Caely
  Renewables, SMK, Tetra Pak) sharing 17+ verbatim texts across 15+ questions; signature
  mirrors pro-hourly (oppose Q71/Q83, support Q153/Q171).
- Opposing blocs: SEMI + 5 members (17-item identical vectors; SEMI↔one member share 42
  verbatim texts), Avary/Foxconn family (6 identical 20-item vectors incl. 1 redacted),
  Luxshare (9 filings), EIGA↔SIGA (identical vectors, 15 shared texts), Greece cluster
  (4), Korea cluster (3), FEPC↔TEPCO. Signatures (1,1,1,1,1,5,5) n=9 and
  (1,1,1,1,1,1,5) n=6 (all redacted).
- Straight-lining is rare (all-1s ×2, all-5s ×4) — duplication is template-driven.
- **Consequence:** every "N respondents said X" stat must dedup on normalized text hash,
  and quote panels must badge template-cluster membership.

### 3.6 Self-classification audit leads (P20 verifies and completes)

- "NGO/civil society" (66 named): ~27 are trade/business/professional bodies — e.g.
  ABEEólica (wind trade assoc.), Society for Corporate Governance, German CEO Alliance,
  American Biogas Council, ABRACE, Mining Association of Canada, WBCSD, We Mean Business,
  CEBDS, AIGCC, B4NZ, Business Renewables Centre, Nuclear Innovation Alliance,
  **EnergyTag Ltd** (a UK Ltd running the hourly-certificate standard it advocates),
  WattTime (vendor/nonprofit hybrid), an LLC consultancy, Amazon Employees for Climate
  Justice, placeholder "ABC".
- "Academia/research" (34 named): ~19 genuine universities/labs (Oxford, Edinburgh ×2
  duplicate, MIT ×2, TU München, Princeton ZERO, Stanford WE3, Harvard Kennedy School,
  Tsinghua…); ~10 not academic institutions: The Breakthrough Institute (think tank),
  Aquilo Energy GmbH (company), Clean Kilowatts LLC, Resources for the Future,
  book-and-claim secretariat, a pasted CV, Korea National Cleaner Production Center…
  31 of 44 "academics" responded as individuals, not institutions; 10 are redacted.
- "Industry group" (58 named) includes actual companies: Baker Hughes, SIDENOR GROUP,
  AKTOR SA, a Luxshare factory. Trade bodies also hide in `Other` (econsense, CEBA,
  L'Afep), `Consultant`, `Data/analytics` (ecoinvent Association), `Verification` (JICPA).
- Entity families to group: Luxshare ×9, Avary/FPC ×5, Engie ×3, EDF ×2, Rio Tinto ×2,
  Deloitte ×2, U. Edinburgh ×2 (identical likert vectors — likely double submission),
  MIT ×2, Action Speaks Louder ×2.

### 3.7 Evidence basis

- Q138 MBM usefulness basis (multi-select, n=365): Professional judgment informed by
  literature/briefings 67.7%, **General awareness (no direct analysis) 46.9%**,
  Operational experience 22.7%, **Direct empirical analysis 7.4%**, Prefer not to say 2.7%.
- Q122 registry readiness basis (single, n=220): bare Professional judgment 66.4%,
  Public roadmap/docs 12.3%, Other 12.3%, Operator/vendor commitments 6.8%,
  **Pilot/production use 2.3%** — put next to the Q118 readiness cell.
- Q56 LBM comparator (n=408): empirical 3.9%.
- The survey never distinguishes peer-reviewed vs white papers — the research-backing
  analysis therefore combines (a) these basis questions, (b) free-text citation mining:
  613 answers / 172 respondents contain URLs; ~202 respondents (19%) show hard citation
  signals (URL, DOI, et al., "peer-review", .pdf, arxiv/ssrn, "journal"). Named cite at
  ~2× redacted rate. By org type: registries 61.5%, academia 50.0%, NGO 39.1% … Company
  15.4%, Financial 4.2%.
- Top linked domains: sciencedirect 161, ssrn 103, cell.com 98, iea.org 95,
  **tinyurl 62 (unverifiable)**, zenodo 58, energytag.org 55, resource-solutions.org 46,
  theclimategroup.org 43, cebuyers.org 37, ghgprotocol.org 36, zerogrid.org 35 … Advocacy
  domains outnumber peer-reviewed hosts in aggregate.
- Citations propagate by template: 27 duplicated long texts are citation-bearing (one
  10-respondent block, one 9-respondent block). Dedup before counting.
- Q158 exemption evidence is free text (n=297) — P21 codes a sample into
  evidence-type buckets.
- Colorful specifics for the evidence page (verify verbatim before quoting): a GHG
  Management Institute respondent declares coordination with Dr. Matthew Brander; another
  respondent cites Brander as external authority while noting he is a TWG member; a
  Wuppertal academic self-cites ("Sorry to toot my own horn"); Constellation Energy
  assembles a six-paper literature wall; TU München cites both sides of the hourly
  debate (Bjørn et al. 2025 vs Xu et al. 2024, Riepin & Brown 2024).

### 3.8 Reasons picklists (headline options; full lists in `data/question_options.csv`)

- Q74 against hourly matching (n=796): admin/data/audit burden **83.3%**, discourages
  global voluntary procurement 81.0%, prefer optional "may" 75.8%, no meaningful accuracy
  gain 64.5%.
- Q72 for hourly matching (n=378): reflects grid operation 74.3%, accuracy/scientific
  integrity 68.3%, reduces greenwashing 65.9%, price signals 57.4%.
- Q86 against deliverability (n=733): restricts highest-impact investment 77.9%,
  prefer "may" 67.0%, shift from PPAs to spot 66.2%.
- Q127 against fossil fallback (n=333): disproportionate regional impact 80.2%, overly
  conservative 76.6%.
- Q172 for legacy clause (n=672): trust/market confidence 85.6%, protects committed
  investments 83.5%, early-adopter equity 80.4%.
- Q156 against exemptions (n=230): inconsistency/comparability 50.9%; "support exemption,
  different criterion" 36.1%.
- Q150 against separate impact metric (n=231): no agreed methodology 66.2%, not auditable
  59.3%, greenwashing risk 45.0%.

### 3.9 Design-preference headlines

eGRID preferred US boundary 33.7% (but 32.9% "no US operations"); exemption threshold
50 GWh 67.1%; exemptions ongoing 57.3% vs time-limited 28.9%; exemption users in
conformance 68.7%; legacy eligibility "signed before implementation date" 71.7%;
transition via legacy clause 83.4%; Q146 separate impact metric: "No (doesn't change my
view)" 45.3% + "I do not support impact metrics" 24.4%.

### 3.10 Engagement

`n_substantive_answered`: median 46/166, p90 116; 88 respondents >75%. 978 answered ≥1
of the 7 anchors; only 342 answered all 7. MBM free text: 14,869 answers, 1,025
respondents, 10.27M chars. Most verbose: econsense 112k chars, NorthBridge Group 177k.

---

## 4. Site architecture

All pages copy `frontend/templates/page-template.html`, obey `DESIGN_SYSTEM.md`, load
Chart.js + the new site JS, and register in nav (P11 placeholders → P42 final).

```
frontend/
├── index.html                     # P40 — Overview & objective assessment
├── heatmap.html                   # P30 — Likert Explorer
├── respondents.html               # P32 — Who responded + org browser
├── evidence.html                  # P33 — Research & evidence integrity
├── integrity.html                 # P34 — Legitimacy audit & coalitions
├── methodology.html               # P41 — Methods, caveats, definitions
├── proposals/
│   ├── hourly-matching.html       # P31 — QC4 (Q71–82, Q76 load profiles)
│   ├── deliverability.html        # P31 — QC5 + market boundaries (Q83–96, 69, 88–91)
│   ├── sss.html                   # P31 — Standard Supply Service (Q97–112)
│   ├── residual-mix.html          # P31 — Q113–123 incl. registry readiness
│   ├── fossil-fallback.html       # P31 — Q124–129
│   ├── exemptions.html            # P31 — Q70, 153–170 + feasibility Q130–133
│   ├── legacy-clause.html         # P31 — Q171–180
│   ├── package-impacts.html       # P31 — Q20/22, 134–151 (usefulness, cost, IFRS, metric)
│   └── transition.html            # P31 — Q181–183
├── data/                          # P22 exports (+ fixtures/ from P11)
└── js/                            # P11 + per-page modules
```

**Nav (final form, P42)** — mega-menu via the existing `mega: true` support in `nav.js`:
- Overview → `index.html`
- Dashboards → Likert Explorer, Who Responded, Evidence & Research, Integrity & Coalitions
- Proposals (mega, 2 columns: "Quality criteria" / "Flexibility & package") → the 9 pages
- About → Methodology, link to dataset README on GitHub

### Page specs

**index.html — Overview & Objective Assessment (P40).** Hero stats row (1,072
respondents · 70,089 answers · 53.5% redacted · 7 MBM proposals). Headline diverging
stacked bar: the 7 anchors, oppose←|→support with neutral straddling. The **objective
assessment** as a long-form article section (structure in §8). Takeaway cards linking to
each dashboard. One `.emphasis-callout` maximum ("Requirements rejected, escape hatches
embraced").

**heatmap.html — Likert Explorer (P30).** CSS-grid heatmap. Rows = the 22 MBM scale/
ordinal questions grouped by `scale_construct` with a direction badge per group ("5 =
supports" / "5 = much more cost than today" / "5 = large impact" / labeled). Columns =
values of the selected segment. Toggles (`.toggle-btn-group`): segment dimension
(Org type / Sector / Country / Redaction / Responding as / Audited class), metric
(% support 4–5 · % oppose 1–2 · mean · net = %support−%oppose), and a "hide n<15
segments" switch. Cells: color from a construct-appropriate diverging scale built on
design tokens; cell text = metric value; hatched overlay when n<5 (never show a value);
base-size chip per column. Click cell → popover with the full 1–5 distribution +
off-scale count + link to the proposal page. Below: a "support vs opposition grouped"
stacked-bar view of the 7 anchors for the selected segment.

**proposals/*.html — 9 deep dives (P31).** One shared renderer (`js/proposal-page.js`)
driven by a per-page config: (1) stance panel — distribution bar + segment toggle +
redaction split; (2) reasons panel — horizontal bars for/against (options sorted by
count, % of answered, `is_canonical=1`); (3) cost/burden panel where the lever has one
(Q78/79, 92/93, 139 with "3 = today" annotation); (4) related design-preference selects;
(5) **quotes for / quotes against** — curated quote cards with attribution ("Google, LLC —
Company, US" or "Redacted — Company, US"), template-cluster badge where applicable, link
to org profile for named respondents; (6) evidence-basis panel where applicable (Q138 on
package-impacts, Q122 on residual-mix, Q158 coded sample on exemptions); (7) response-base
footnote. Page-specific extras: exemptions page carries threshold/eligibility/duration/
conformance sub-sections; deliverability carries US-boundary chooser results; transition
carries the Q183 year histogram with protest-answer flag.

**respondents.html (P32).** Panels: org-type distribution × redaction (stacked);
sector × redaction; country map-substitute (top-N bar); individual-vs-org; engagement
distribution (bands); redaction-effect summary (named vs redacted means per anchor —
mini heatmap); named-org browser: searchable/sortable table (493 orgs: name truncated,
type, audited class, sector, country, questions answered, cites?, template?, 7-anchor
mini-sparkline) → click → org profile view (modal or `org.html?id=` page) rendering
`orgs/{id}.json`: profile, flags, every MBM answer incl. free text.

**evidence.html (P33).** Panels: (1) Q138/Q122/Q56 basis distributions; (2) basis ×
stance: do supporters or opponents claim more empirical grounding (Q138 crossed with Q71
and Q134 buckets); (3) citation rates by org type, by stance bucket, by redaction;
(4) linked-domain table classified peer-reviewed / advocacy / government / data-vendor /
shortened-unverifiable; (5) template-propagated citations (how many "independent"
citations are copies); (6) "who did the homework" roll-up — respondents with direct
empirical analysis or operational experience and how they lean; (7) notable evidence
stories (verified verbatim quotes: coordination admissions, self-citation, TWG-member
citation, both-sides citation).

**integrity.html (P34).** Panels: (1) claimed vs audited classification (sankey-style or
grouped bar from `audit.json`, with a drill table naming names + audit basis);
(2) coordinated blocs — bloc cards (pro-hourly 22, SEMI, Avary, Luxshare, EIGA↔SIGA,
Greece, Korea, FEPC↔TEPCO) with member lists (named members only; redacted shown as
counts), shared-text counts, identical-vector length, and each bloc's 7-anchor signature;
(3) template-response prevalence and its effect on headline stats (recomputed Q71 with
and without dedup); (4) the data-vendor fingerprint panel; (5) entity families;
(6) methodology caveat box (what this audit can and cannot claim; redacted respondents
are unverifiable, not guilty).

**methodology.html (P41).** Dataset provenance; derived-field definitions (template flag,
audited class vocabulary, citation signals, bloc detection); every caveat from §2;
scale-direction table; how to reproduce (scripts + commands); limitations (self-selection,
non-response, consultation ≠ referendum — counts measure mobilization, not truth).

---

## 5. Frontend data contract (`frontend/data/*.json`)

P22 produces these; P11 builds `frontend/data/fixtures/` with the same shapes (tiny,
hand-written) so Lane F never blocks on Lane D. Loader falls back to fixtures only when
`?fixtures=1` is in the URL.

Segment keys (closed vocab, used everywhere):
`org_type` (15 values, slugged: `company`, `industry_group`, `consultant`, `ngo`,
`energy_supplier`, `other`, `academia`, `data_analytics`, `financial`, `government`,
`registry_operator`, `verification`, `ghg_program`, `grid_operator`, `intl_agency`),
`sector` (top 12 by n + `sector_other_grouped`), `country` (top 10 + `country_other`),
`redaction` (`named`/`redacted`), `responding_as` (`organization`/`individual`),
`audited_class` (P20 vocabulary; before P20 lands, exporter emits claimed classes).

- **`meta.json`** — `{generated, totals:{respondents, questions, answers, redacted,
  named}, segments:{dim:{label, values:[{key,label,n}]}}, questions:[{q, id, shorthand,
  label, construct, anchor_low, anchor_high, scale_note, lever, type, n_answered,
  page}]}` (questions array = the 22 heatmap rows + the reason/select/evidence questions
  used by pages).
- **`likert.json`** — `{"<q>": {"overall": CELL, "<dim>": {"<segkey>": CELL}}}` where
  `CELL = {c:[n1,n2,n3,n4,n5], off:<n off-scale>, n:<scored>, mean:<2dp>}`. Ordinal
  questions use `c` of ladder length and `labels:[...]` in meta. Client computes
  %oppose/(neutral)/%support = (c1+c2)/n, c3/n, (c4+c5)/n.
- **`reasons.json`** — `{"<q>": {anchor, lever, side:"for"|"against", n_answered,
  options:[{text, n, pct, by:{org_type:{...}, redaction:{...}}}]}}` (canonical only).
- **`selects.json`** — same shape for design-preference single/ordinal selects +
  `{"183": {years:{"2027":n,...}, protest_gt_2050:n}}`.
- **`evidence.json`** — `{basis:{q138:{options:[...], by_stance_q71:{oppose|neutral|
  support:{option:n}}, by_org_type:{...}}, q122:{...}, q56:{...}}, citations:{
  by_org_type:[{key, n, citing, pct}], by_redaction:{...}, by_stance_q71:{...},
  domains:[{domain, count, class}], template_citation_blocks:[{hash, n_respondents,
  preview}]}, stories:[{title, quote, respondent_id, attribution, verified:true}]}`.
- **`respondents.json`** — `{distributions:{org_type_x_redaction:[...],
  sector_x_redaction:[...], country:[...], responding_as:[...], engagement_bands:[...]},
  redaction_effect:[{q, mean_named, mean_redacted, n_named, n_redacted}],
  org_index:[{id, name(≤80 chars), org_type, audited_class, sector, country, nsub, pct,
  ft_chars, cites, template, entity_group, bloc, anchors:[7 scores or null]}]}`.
- **`orgs/{respondent_id}.json`** — one per named respondent (≈498 files):
  `{id, name, org_type, audited_class, audit_basis, sector, country, responding_as,
  flags:{template, bloc, entity_group, cites, citation_count}, answers:[{q, shorthand,
  label, lever, type, text, numeric, selections:[...]}]}` (MBM + general questions,
  survey order).
- **`clusters.json`** — `{text_clusters:[{hash, chars, n_respondents, named_members:[{id,
  name}], n_redacted, preview(≤240), questions:[...]}], vector_clusters:[{ids_named,
  n_redacted, length, signature}], blocs:[{key, label, signature:[...], members_named,
  n_redacted, shared_texts}], entity_families:[{name, ids, n}]}`.
- **`audit.json`** — `{vocabulary:[{key,label,definition}], rows:[{id, name, claimed,
  audited, basis(≤200 chars)}], summary:{claimed_x_audited counts}}`.
- **`quotes.json`** — `{"<lever>": {for:[QUOTE], against:[QUOTE]}}`,
  `QUOTE = {text(≤600), q, respondent_id, attribution, org_type, redacted,
  template_cluster:null|hash}`.

Size budget: every file ≤ 500 KB except `orgs/` (lazy-loaded singles ≤ 200 KB each).
All floats 2dp. All files end with newline; keys sorted (deterministic rebuilds).
`validate_frontend_data.py` asserts: cell counts sum to view counts in the db; every
segment n sums to the overall n; no question mixes constructs; every quote's text is a
verbatim substring of the respondent's stored answer; every org_index row has an
`orgs/{id}.json`; masks: exporter never emits a named breakdown for a segment value with
n<5 respondents overall (privacy/noise guard — emit `{n:<5}` sentinel instead).

---

## 6. Data pipeline spec (Lane D)

New directory `scripts/analytics/` (stdlib only, deterministic, idempotent):

- **`derive_flags.py`** (P10) → `data/derived/respondent_flags.csv`,
  `data/derived/text_clusters.csv`, `data/derived/vector_clusters.csv`,
  `data/derived/citations.csv`, `data/derived/domains.csv`.
  Logic: normalize free text (lowercase, collapse whitespace, strip punctuation edges) →
  sha1; a **text cluster** = normalized ≥200-char string shared by ≥3 respondents; a
  respondent `is_template_response` if they share ≥3 clustered strings with ≥2 others.
  **Vector clusters** = byte-identical tuples of ≥10 scale answers (question_number →
  answer_numeric over all scale questions answered by both). **Blocs** = hand-identified
  in §3.5, confirmed by script (pro-hourly = the exact 7-anchor signature (5,5,4,5,5,4,4)
  ∧ ≥3 shared texts with the bloc). **Entity families** = curated regex/name map (§3.6
  list) in the script as data. **Citations** = regex battery over `v_free_text` (URLs,
  DOIs, `et al.`, peer-review, .pdf, arxiv/ssrn/journal), domain extraction + a curated
  domain→class map (peer_reviewed / advocacy / government / data_vendor / shortener /
  other). Evidence-basis booleans from Q138/Q122 selections.
- **`reference/org_audit.csv`** (P20): `respondent_id, organization_verbatim, claimed,
  audited_class, confidence, basis` — closed `audited_class` vocabulary:
  `academic_institution, think_tank, ngo_civil_society, trade_association,
  business_coalition, company, consultancy, data_vendor, financial, government,
  registry_operator, standards_body, individual, unverifiable, placeholder`.
  Only named respondents audited; redacted → `unverifiable`.
- **`reference/curated_quotes.json`** (P21): the `quotes.json` shape, hand-curated.
- **`export_frontend.py`** (P22) → everything in §5; reads db + derived + reference;
  fails loudly if a reference file is missing (with `--allow-missing-curation` flag to
  emit without quotes/audit during Wave 2 parallelism).
- **`validate_frontend_data.py`** (P22): the invariant checks in §5; exit non-zero on
  any failure; run in P30–P42 acceptance.

---

## 7. Frontend infra spec (Lane F, P11)

- Chart.js pinned: `https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js`
  added to the required-head recipe right after GSAP, **before** `chart-colors.js`
  (which applies defaults at DOMContentLoaded and needs `Chart` global present).
  Document the addition in `frontend/DESIGN_SYSTEM.md` (a one-line amendment is the only
  permitted edit there) and in `templates/page-template.html`.
- New site-specific files (allowed; upstream files stay verbatim):
  - `js/data-loader.js` — `S2Data.load(name)` → cached fetch of `data/<name>.json`;
    `?fixtures=1` → `data/fixtures/<name>.json`; error panel helper for fetch failures
    (visible message advising `python3 -m http.server`).
  - `js/segments.js` — toggle-group builder bound to `meta.json` segment vocab; state in
    `URLSearchParams` (shareable links); emits `segmentchange` events.
  - `js/likert-viz.js` — (a) CSS-grid heatmap renderer (construct-grouped rows, hatched
    n<5 cells, base chips, click popover) and (b) diverging stacked horizontal bar
    (oppose 1–2 left in `--storage`-red tint, neutral 3 centered `--text-muted` tint,
    support 4–5 right in `--wind`-green tint; burden/cost constructs get an inverted
    amber "complaint" ramp and never the green/red support ramp).
  - `js/quote-cards.js`, `js/org-table.js` (vanilla sort/filter/search + lazy org fetch).
  - `styles/site.css` — new-component styles only (heatmap grid, quote cards, org table,
    popover), using design tokens exclusively.
- `nav.js`: replace placeholder `NAV_ITEMS` with the §4 structure (placeholder hrefs OK
  until pages exist); extend `isActive()` to match `proposals/` subpaths; keep everything
  else verbatim. `shared-footer.js` FOOTER_LINKS mirrors nav top level.
- Fixtures: `frontend/data/fixtures/*.json` — miniature (2 questions × 3 segment values)
  hand-authored instances of every contract shape.
- Accessibility: every heatmap cell gets `role="gridcell"` + `aria-label` with the full
  numbers; toggles are real `<button aria-pressed>`; charts get visually-hidden data
  tables (`.sr-only` utility in `site.css`); color scales pass WCAG against cell text
  (use the `-text` token variants).

---

## 8. The objective assessment (P40 content brief)

Written as a long-form article on `index.html`, every claim linked to a chart/table on
the site. Required structure:

1. **What happened here** — participation, redaction, completion; consultation ≠ poll
   (self-selected, mobilized).
2. **The headline shape** — requirements rejected, flexibilities embraced; the 7-anchor
   chart.
3. **Who supports, who opposes, and why it maps to interest** — org-type table; the
   data-vendor fingerprint; corporates protecting legacy REC claims (Q172's 83.5%
   "protects committed investments" is candid); utilities/industry-group alignment.
   State plainly that *both* directions of interest exist.
4. **Scientific integrity, weighed** — CORRECTED PER P35 (verified against the db):
   the support side's research advantage rests entirely on citation behavior (34.3% of
   Q71 supporters show citation signals vs 14.7% of opponents — clean separation), NOT
   on self-reported evidence basis: Q138 empirical-analysis rates are stance-neutral
   (7.6% oppose vs 8.0% support, overlapping CIs), and supporters are actually weakly
   HIGHER on operational experience (29.3% vs 21.6%), so "the opposition brings more
   operational evidence" is wrong as a group claim. Only 7.4% of anyone did direct
   analysis; supporter citations are partly template-propagated and advocacy-domain-heavy;
   opposition arguments rest mostly on burden/feasibility self-report (evidence about
   themselves, and consistent: 4.5–4.7 burden means, registry readiness 2.21, feasibility
   measures 2.33). Verdict style: "the support side cites more external research; both
   sides claim similar first-hand basis; neither is disinterested."
5. **Legitimate concerns that survive scrutiny** (regardless of motive): registry/data
   infrastructure not ready (44% unknown lead times, 2.3% pilot-basis claims);
   fossil-fallback regional equity (80.2% of opponents, echoed by supporters' own
   global-equity comments); market-participation risk; comparability of exemption
   patchworks; SSS definitional vagueness (73.3% "unclear rules" among opponents).
6. **Legitimate support arguments that survive scrutiny**: misallocation ("solar at
   night"), double-counting integrity, price-signal formation — grounded in the
   peer-reviewed literature both sides cite.
7. **Coordination and classification** — both sides campaign; name the blocs (named
   members only); self-classification unreliable in both directions; redacted majority
   is structurally less supportive, so attributable-only reads skew supportive.
8. **How an objective third party should read this** — signal vs mobilization; where
   diversity is real (residual mix 3.54 support crosses camps; consultants/academics
   mid-scale; government split); what evidence would actually settle the empirical
   disputes (published back-testing, registry pilots).
9. **Nuance & coalitions** — named non-redacted alignments (pro-hourly bloc members;
   Japanese utilities + FEPC; semiconductor supply chain via SEMI; industrial gas
   associations), with links to integrity.html.

Tone: third-party, specific, hedged where n is small, zero advocacy. No side declared
"right"; the reader leaves knowing which claims are backed by what.

---

## 9. Acceptance template (every prompt ends with this)

1. `python3 scripts/validate_dataset.py` → all checks pass (27/27 as of this writing) (you touched nothing in `data/`
   except `data/derived/`).
2. `python3 scripts/analytics/validate_frontend_data.py` passes (Waves 2+).
3. `cd frontend && python3 -m http.server 8000` → your page renders with zero console
   errors; toggles work; `?fixtures=1` works (Lane F).
4. Playwright screenshot(s) of your page (desktop 1440px + 390px mobile) saved to the
   session scratchpad and eyeballed: no overflow, no unstyled placeholder text, palette
   from tokens.
5. DESIGN_SYSTEM.md rules: no inline styles for shared components, no hardcoded
   hex/fonts, verbatim files untouched (`git diff --stat` proves it).
6. Commit to your assigned branch with a descriptive message; `git push -u origin
   <branch>` (retry 2s/4s/8s/16s on network failure). **No PR.**
7. Report back: what you built, deviations from the contract (if any — flag loudly),
   and anything the next wave needs to know.
