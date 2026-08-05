# P35 — Verification memo (Wave 3.5)

**Session:** P35 exploration stub, solo, claude-opus-5 · **Branch:** `claude/ec-p35-verification`
**Scope touched:** this memo, `notes/p35-screens/`, `frontend/dev-viz.html` (unlinked). Nothing else.
**Method:** every §3 figure recomputed from `data/electricity_consequential.sqlite` +
`reference/exclusions.csv` in queries written against the raw tables, not through the exporter, then
cross-checked against `frontend/data/*.json`. Screenshots taken in Chromium at 1440 px and 390 px
with the blocked CDNs (Chart.js, GSAP, fonts) fulfilled from locally-fetched copies via Playwright
route interception, so the charts render as a real user sees them.

**Validation stack at time of writing:** dataset 86/86 · frontend 73/73 · flags 76/76 · org audit 56 ·
themes 28/28. All green.

---

## 1. Headline findings

Content corrections first, chart advice last. "Blocks P40" is stated per finding.

| # | Finding | Blocks P40 |
|---|---|---|
| **F1** | **§8 is still written on the raw base.** Nine separate figures in the essay brief are 185-base numbers, including "**three** junk submissions" (there are **four**). §3 was re-based post-Wave-2; §8 was not. | **YES** |
| **F2** | **§8.2's promised Q19 No-side trio does not exist in P21's taxonomy.** Two of its three concepts have **zero** codes on Q20 (`additionality_wrong_construct` 0, `verification_difficulty` 0). The actual No side is dominated by one code — `net_impact_completeness`, **50 of 80** coded (62.5%). Writing §8.2 as briefed produces a fabricated theme split. | **YES** |
| **F3** | **Country is a stronger axis than redaction, and §3.2/§8 barely mention it.** US vs non-US is significant on **4 of 6** stance measures (Q19 p=0.0055, Q24 p<0.0001, Q31 p=0.0015, Q45 p=0.0151). Redaction is significant on **2 of 7** — and **Q19, the flagship redaction claim in §3.6/§8.7, is p=0.22, i.e. noise.** The two axes are orthogonal (p=0.68), so this is an addition, not a replacement. | **YES** |
| **F4** | **PLAN §3.3's matrix nets disagree with the shipped site on 2 of 9 rows.** §3.3 uses `round(%R − %N)`; both shipped renderers *and* the scoreboard exporter use `round(%R) − round(%N)`. Regulatory: §3.3 **+47.1** vs site **+47.2**. Barrier: §3.3 **−27.6** vs site **−27.5**. The essay would print numbers the panel it links to contradicts. | **YES** |
| **F5** | **The template-cluster span is 26 respondents, not 25** (§3.5). 23 bloc members + 3 peripheral single-cluster sharers (45, **110**, **173** — §3.5 names only 45). | **YES** (if quoted) |
| **F6** | **The `policy_insights_pack` is a single-country bloc.** All five members — and the peripheral ID 45 — are the **only six Korean respondents in the analytical base**, all redacted. The largest bloc is a national coordination effort, not an industry one. Carries a disclosure judgment (§6). | no — reframes §8.7 |
| **F7** | **The template detector misses verbatim copies.** IDs **90** (Industrial Energy Consumers of America) and **97** (redacted, US) share an **827-character Q20 answer differing by one hyphen**. P10 normalizes lowercase+whitespace only, so punctuation variants hash apart. A punctuation-insensitive hash gives **39 clusters / 28 respondents** (vs 38/26); the 8-bloc count is unchanged. Plus paraphrase-level pairs no exact hash can catch (§5). | no |
| **F8** | **The n<5 privacy mask never fires — anywhere.** Zero `"<5"` sentinels across all six JSON files, because the rule keys on *segment-value size overall* (smallest is `jp`, n=8), not on cell n. Meanwhile **4 published stance cells have n<5**, printing exact counts (Q21 `jp` n=3 → `[1,2]`). | no |
| **F9** | **Q45's "Japan 6/6 Annual" survives exclusion — confirmed, use it.** All 6 Japanese respondents who answered Q45 chose Annual (8 Japanese in base). §3.2 flagged this as never re-verified; it is now verified. | no — unblocks |
| **F10** | **At 390 px the additionality matrix hides its net-requiredness column entirely.** 450 px grid in a 328 px scroll port; 122 px hidden at 390, 152 px at 360, 36 px at 768. The column the rows are *sorted by* is off-screen with no affordance. Page-level overflow is 0, which is why no earlier check caught it. | no |
| **F11** | **The required-vs-feasible cross is unreadable at both widths.** Point labels clip off the canvas at 1440 *and* 390; the three optional-middle tests collide into an illegible pile. It is the panel carrying §8.4's headline claim. | no |

Two claims I set out to break and **could not**: §3.2's Q21 named/redacted flip (exact), and §8.4's
"requiredness and feasibility rank almost identically" (Spearman **ρ = 0.900**, top three ranks identical).

---

## 2. Every disagreement with PLAN §3

**§3.1, §3.2, §3.4, §3.6 reproduce exactly — every figure, including all named/redacted splits.**
Detail: 5,074 raw rows / 4,903 surviving; 43 substantive questions; 3,348 answers; 1,329 free text;
1,239,964 chars; 75/180 = 41.7 % redacted; US 104 / UK 12 / JP 8 / other 56; org types 60/25/21/17/57;
responding-as 159/21; inventory 100/46/34 and 95/51/28/6; engagement bands 2/57/18/57/46; the full
attrition series Q18 160 → Q52 34 with matrix 96–104 and thin questions Q42 35, Q50 37, Q51 38, Q30 39;
all nine matrix count rows and Q28's ten feasibility picks; all three scoreboards' counts, bases and
specials; the org-type × redaction panel including the 3/5 tail across 4 types; the Q31 redaction
contrast. **All 91 stance segment cells in `stances.json` match the database.**

Three disagreements:

| Where | PLAN §3 says | I compute | Note |
|---|---|---|---|
| §3.5 template blocks | clusters "spanning **25** respondents" | **26** | 23 bloc members + peripherals **45, 110, 173**. `is_template_respondent` is also 26. No excluded respondent is involved. §6's P10 spec says "≈25", which is fine; §3.5 states it as fact. |
| §3.3 matrix, Regulatory | net **+47.1** | site renders **+47.2** | §3.3 = `round1(49/104)`. Site + scoreboard exporter = `round1(63.5) − round1(16.3)`. |
| §3.3 matrix, Barrier | net **−27.6** | site renders **−27.5** | §3.3 = `round1(−27/98)`. Site = `13.3 − 40.8`. |

The other seven matrix rows are identical under both conventions. The site is **internally consistent**
(mini-matrix on `decisions.html` and the heatmap on `topics/additionality.html` agree with each other and
with `scoreboard.json`'s `net_pct`); **PLAN §3.3 is the outlier.** Patch §3.3, not the code.

### 2a. A challenge to §3.3's editorial call (not an arithmetic error)

§3.3: *"the one asymmetry worth showing is first-of-kind (35 call it feasible, 8 want it required)."*
On feasible-share minus required-share, first-of-its-kind ranks **4th of 9**:

| Test | called feasible | want required | gap |
|---|---|---|---|
| **Positive list** | 61.1 % | 15.7 % | **+45.4 pp** |
| Performance standard | 44.2 % | 12.2 % | +32.0 pp |
| Financial analysis | 46.3 % | 15.4 % | +30.9 pp |
| First-of-its-kind | 36.8 % | 8.3 % | +28.5 pp |

First-of-its-kind wins on *ratio* (4.4× vs 3.9×), which is presumably where the framing came from, but the
natural reading — "how many think it works, minus how many want it mandatory" — makes **positive list** the
standout, and it ties straight into the optional-middle tier (positive list is Optional-modal, 56/102).

### 2b. The org-type × Q19 table §3.2 leaves to the JSON

Derived from the db; matches `stances.json → Q019.by.org_type_5` cell for cell.

| `org_type_5` | n | Yes | No | % No |
|---|---|---|---|---|
| Industry group | 11 | 3 | 8 | 72.7 % |
| Company | 41 | 13 | 28 | 68.3 % |
| NGO/civil society | 14 | 5 | 9 | 64.3 % |
| Consultant | 21 | 9 | 12 | 57.1 % |
| Other | 42 | 18 | 24 | 57.1 % |
| **Total** | **129** | **48** | **81** | **62.8 %** |

Every cell is ≥ 11, so this table is safe to publish. The **self-declared** types behind §8.2's
"the org types that *support* it" claim: energy supplier/utility **7 Y / 5 N (n=12)**, data/analytics
**3 Y / 2 N (n=5)**. Both majority-Yes, so the claim holds — but n=5 is at the privacy floor and must
carry its n. (Government institution 2/3 and verification 1/1 are higher still and too small to cite.)

### 2c. §3.2 is missing its largest effect: country

| Measure | US | non-US | gap | p |
|---|---|---|---|---|
| Q19 formula **not** appropriate | 54/74 = 73.0 % | 27/55 = 49.1 % | +23.9 pp | **0.0055** |
| Q24 annual reporting | 53/55 = 96.4 % | 27/44 = 61.4 % | +35.0 pp | **<0.0001** |
| Q31 regional differences = Yes | 14/57 = 24.6 % | 23/41 = 56.1 % | −31.5 pp | **0.0015** |
| Q45 fine granularity | 29/42 = 69.0 % | 15/36 = 41.7 % | +27.4 pp | **0.0151** |
| Q21 secondary effects | 29/56 = 51.8 % | 27/50 = 54.0 % | −2.2 pp | 0.82 |
| Q33 rigor by claim type | 25/42 = 59.5 % | 17/33 = 51.5 % | +8.0 pp | 0.49 |

Against which redaction is significant on only **Q21** (p=0.035) and **Q31** (p=0.0002); Q19 is p=0.22,
Q45-coarse p=0.066, Q43 p=0.40, Q24 p=0.55, Q33 p=0.33 *and in the opposite direction*.

Country and redaction are **independent** (US 40.4 % redacted vs non-US 43.4 %, p=0.68), and stratifying
confirms both stories:

- Q31's redaction effect survives in **both** country strata (US p=0.016, non-US p=0.0017) → real.
- Q19's redaction effect survives in **neither** (US p=0.25, non-US p=0.50) → directional only.
- Q24's country effect survives in **both** redaction strata (named p=0.0059, redacted p=0.0004) → real.

**Consequence for the essay:** "annual reporting is the one settled call" is really *"settled among US
respondents (96.4 %), contested outside (61.4 %)"*. And the headline 62.8 % No is substantially a US
result. Japan is the mirror image on both — **6 of 7 Japanese say the formula *is* appropriate**, and
6/6 want Annual.

---

## 3. PLAN §3 / §8 patches required

Exact replacement text. Apply verbatim.

### Patch 1 — §3.3, the matrix table's two changed rows and the paragraph under it

Replace the `Regulatory` and `Barrier` rows of the §3.3 table with:

```
| Regulatory | 104 | 66 | 21 | 17 | **+47.2** |
| Barrier | 98 | 13 | 45 | 40 | −27.5 |
```

and append this sentence to the paragraph that begins "The three tiers hold":

```
Net requiredness is computed the way every shipped renderer computes it —
round(%R) − round(%N), each percentage rounded to 1dp first — which is also the
convention behind `scoreboard.json`'s `net_pct`. Computing it as round(%R − %N)
instead changes two of the nine rows (regulatory +47.1, barrier −27.6); those are
not the numbers on the site and must not be quoted.
```

### Patch 2 — §3.3, the feasibility paragraph's last sentence

Replace:

```
Requiredness and feasibility are coherent, not contradictory — the required tier is also
the feasible tier; the one asymmetry worth showing is first-of-kind (35 call it feasible,
8 want it required).
```

with:

```
Requiredness and feasibility are coherent, not contradictory — the required tier is also
the feasible tier, and the two rankings correlate at Spearman ρ = 0.90 with the top three
places identical. The asymmetry worth showing is the gap between "this could be done" and
"this should be mandatory": positive list is the widest (61.1% call it feasible, 15.7% want
it required, +45.4pp), ahead of performance standard (+32.0pp), financial analysis (+30.9pp)
and first-of-its-kind (36.8% vs 8.3%, +28.5pp). First-of-its-kind is the largest *ratio*
(4.4×) but the fourth-largest gap; lead with positive list.
```

### Patch 3 — §3.5, the template-blocks bullet's first sentence

Replace:

```
- **Template blocks: 38 clusters (≥200 normalized chars shared by ≥2 respondents)
  spanning 25 respondents.**
```

with:

```
- **Template blocks: 38 clusters (≥200 normalized chars shared by ≥2 respondents)
  spanning 26 respondents** — 23 bloc members plus three peripheral single-cluster
  sharers (45, 110, 173). The detector matches on a lowercase+whitespace-normalized
  hash only, so punctuation variants of the same passage escape it: IDs 90 and 97
  share an 827-character Q20 answer differing by a single hyphen, and a
  punctuation-insensitive hash would report 39 clusters spanning 28 respondents.
  The 8-bloc count is unaffected.
```

### Patch 4 — §3.2, new bullet to insert after the Q19 bullet

```
- **Country is the sharpest cut in the set, and it is not the redaction axis.**
  US respondents (104 of 180) reject the formula far harder than the rest of the room
  (73.0% No, 54/74, against 49.1%, 27/55; p=0.006), want annual reporting almost
  unanimously (96.4% against 61.4%; p<0.0001), reject regional differentiation
  (24.6% Yes against 56.1%; p=0.002) and want fine temporal granularity (69.0%
  against 41.7%; p=0.015). Japan inverts all of it: 6 of 7 Japanese respondents call
  the formula appropriate, and 6 of 6 pick Annual. Country and redaction are
  statistically independent (p=0.68) and both effects survive stratification against
  each other, with one exception — the Q19 redaction lean does not (p=0.25 named-stratum,
  p=0.50 redacted-stratum). Every country claim carries its n; UK and Japan are ≤8.
```

### Patch 5 — §3.6, the opening paragraph's last clause

Replace:

```
Redacted respondents lean further against the formula (41N/19Y vs named 40N/29Y),
against secondary effects (21Y/29N vs named 35Y/21N), and toward coarse temporal
granularity (coarse 17 vs fine 13, against named fine 31 vs coarse 17) —
directionally the Scope 2 pattern (withheld identity correlates with the
defensive/conservative position), milder in size.
```

with:

```
Redacted respondents lean further against the formula (41N/19Y vs named 40N/29Y),
against secondary effects (21Y/29N vs named 35Y/21N), and toward coarse temporal
granularity (coarse 17 vs fine 13, against named fine 31 vs coarse 17) —
directionally the Scope 2 pattern (withheld identity correlates with the
defensive/conservative position), milder in size. **How much milder matters: of the
seven stance questions only two clear significance — Q21 (p=0.035) and Q31 (p=0.0002).
The Q19 lean quoted first here is p=0.22 and does not survive stratification by country
in either stratum; Q33 runs the other way. Treat Q31 (and to a lesser extent Q21) as the
redaction findings and everything else as directional colour that must be labelled as
such.**
```

### Patch 6 — §3.5, add to the resubmission/coordination material (new bullet)

```
- **The `policy_insights_pack` is a single-country bloc.** Its five members and the
  peripheral sharer ID 45 are the only six respondents from one non-US country in the
  analytical base, and all six are redacted. This reframes the bloc: it is a national
  coordination effort, not an industry one. **Disclosure note:** `country_4` buckets that
  country inside "other", so it is not individually published anywhere in
  `frontend/data/`. Naming it on the integrity page would be new attribute disclosure
  about six redacted respondents — the essay and the bloc card should say "a single
  non-US country" unless the owner rules otherwise.
```

### Patch 7 — §8, the raw-base figures (nine edits)

| §8 section | Currently reads | Replace with |
|---|---|---|
| 8.1 | `185 self-selected respondents, 56% US` | `185 filed and 180 analytical, 57.8% US` |
| 8.1 | `41.6% redaction` | `41.7% redaction (75 of 180)` |
| 8.1 | `steep attrition (165 → 36 — by the evidence question, four-fifths of the room has left)` | `steep attrition (160 → 34 — by the evidence question, four-fifths of the room has left)` |
| 8.1 | `three junk submissions and one resubmission found and excluded` | `four junk submissions and one superseded resubmission found and excluded` |
| 8.2 | `63% No (84/133, raw)` | `62.8% No (81/129)` |
| 8.3 | `Secondary effects 57/53` | `Secondary effects 56/50` |
| 8.3 | `annual reporting (79%) is the one settled call` | `annual reporting (80.8%) is the one settled call — though it is settled mainly among US respondents (96.4%) and only 61.4% outside them` |
| 8.4 | `regional application unresolved (40/32/29)` | `regional application unresolved (37 yes / 32 unsure / 29 no)` |
| 8.4 | `rigor-by-claim-type splits 43/35` | `rigor-by-claim-type splits 42/33` |
| 8.6 | `yielded ~31 substantive submissions` | `yielded 29 substantive submissions (34 answers, 5 of them bare "N/A")` |

### Patch 8 — §8.2, replace the promised theme trio

Replace:

```
   but disaggregate the No via Q20 themes: "wrong construct for attribution" vs
   "right direction, underspecified" vs "too complex to audit" are different verdicts
   with different remedies.
```

with:

```
   but disaggregate the No via Q20 themes, which are coded for 80 of the 81 No
   respondents. The No side is not three even verdicts; it is one dominant argument
   plus two smaller ones. (a) **Incomplete impact accounting** — `net_impact_completeness`,
   50 of 80 (62.5%), the single most discriminating code in the set (+49.7pp against the
   Yes side): the formula does not net induced emissions against avoided ones. (b) **Wrong
   venue or wrong sequence** — `integrate_with_scope2_recognition` (19) plus
   `workstream_coordination` (18, and zero on the Yes side) plus
   `inventory_vs_impact_boundary` (10), together 35 of 80 (43.8%): not "your formula is
   wrong" but "this belongs with the Scope 2 workstream, in that order". (c) **Burden,
   data and equity** — `complexity_burden` (14), `attribution_uncertainty` (8),
   `regional_equity` (6), together 18 of 80 (22.5%). The three groups overlap (35 of 80
   respondents carry two of them) and cover 75 of 80; they are emphases, not a partition,
   and must be described as such. For contrast the Yes side is near-monolithic:
   `formula_structurally_sound` on 33 of 39.
```

### Patch 9 — §8.7, hedge the redaction claim

Replace:

```
The redacted plurality leans conservative — attributable-only reads skew the other way.
```

with:

```
The redacted plurality leans conservative on two of seven stance questions —
secondary effects (p=0.035) and, most sharply, regional differentiation, where redacted
respondents pick "unsure/depends" 22/41 against named 10/57 (p=0.0002). On the headline
formula question the lean is real in direction but not in significance (p=0.22), so it
must not be stated as a finding. Companies are 41 of the 75 redacted respondents and the
only org type where redaction is the majority, so every "redacted respondents think X"
sentence is substantially "companies think X" and is hedged as such.
```

### Patch 10 — §4, the index.html hero row

Replace:

```
Hero stats row (185 respondents · 50 questions · 63% "formula not appropriate" ·
41.6% redacted · 36 evidence submissions).
```

with:

```
Hero stats row (180 analytical respondents of 185 filed · 43 substantive questions ·
62.8% "formula not appropriate" · 41.7% redacted · 29 substantive evidence submissions).
Every hero figure is analytical-base; none of the raw-base figures from the provisional
digest may appear here.
```

---

## 4. Verdict tables per stub question

### Q1 · Digest verification — **§3 stands, with three corrections** · effort **S**

| Option | Verdict |
|---|---|
| Accept §3 as written | **Rejected** — F4, F5 and the §3.3 asymmetry call are wrong |
| Patch the three items, keep the rest | **Winner** — everything else reproduces exactly, including all 91 stance segment cells |
| Re-derive §3 from scratch | Rejected — no evidence of systemic error |

**Recommendation:** apply patches 1–6. **Blocks P40: yes** (F4 and F5 are quotable numbers).

### Q2 · The §8 essay brief — **fails on four counts** · effort **M**

| Claim | Verdict |
|---|---|
| "redacted lean conservative" across all stance questions | **Rejected** — 2 of 7 significant; flagship Q19 is p=0.22 |
| "requiredness and feasibility rank almost identically" | **Confirmed** — ρ = 0.900, top 3 identical |
| "clear winners exist per scoreboard family" robust to dedup | **Confirmed** — SCED-locational, recent-capacity-additions and GHGP all stay #1 and *strengthen* under dedup |
| Q19 theme split partitions the No side | **Rejected** — the briefed trio has two zero-use codes |
| §8's base | **Rejected** — nine raw-base figures, incl. "three junk submissions" |

One extra, worth a sentence in §8.5: **dedup flips a sign.** BM capacity-expansion modeling goes
**−3.4 raw → +5.5 deduped** (its not-appropriate side loses 5 of 26 to template collapse). It is the
only scoreboard option whose verdict changes, so "narrowly rejected" is not a safe phrase for it.
Under dedup OM heat-rate/LMP also moves −7.8 → −0.9 while scenario modeling moves −8.4 → −12.5,
so the raw near-tie §3.4 warns against ranking is a dedup artifact — the caution stands, the
reason changes. **Blocks P40: yes.**

### Q3 · Coordination beyond the two packs — **three real signals, one honest negative** · effort **M**

| Candidate | Verdict |
|---|---|
| Korean identity of `policy_insights_pack` (F6) | **Winner** — reframes §8.7's coordination section |
| {90, 97} verbatim pair missed by the hash (F7) | **Winner** — detector gap, quantified |
| Paraphrase pairs: {41 Tierra Climate, 74 redacted} at 0.99 on Q29/Q32 across 5 questions; {141 BCSE, 152 American Biogas Council, 171 redacted}; {179 REsurety, 107, 106, 161} | **Winner** — real, but no exact-hash rule can catch them; report as a caveat, do not re-engineer P10 now |
| {54, 136, 143} sharing a full stance + 9-cell matrix vector | **Rejected** — `RROOOOOOO` is the 3rd-commonest complete matrix vector (5 of 94) and real text similarity is low (136↔143 max 0.42). Coincidence, not a bloc. |
| {110, 173} as a 9th bloc | **Rejected** — their two identical texts are *one* cluster hash spanning two questions, so the edge weight is 1, below `MIN_BLOC_SHARED_CLUSTERS`. The rule is behaving correctly. |
| {67, 131} sharing a 178-char exact string | Noted — genuinely below the 200-char floor; the floor is doing its job |

Also worth a line: **Engie Impact's two filings are not independent** — 135 and 160 share Q29 at 0.85
similarity. §3.5 says "different named individuals, different answers"; "different answers" overstates it.

**Blocks P40: no** — but F6 changes what §8.7 should say.

### Q4 · Viz reality-check — **one real bug, one bad chart, one panel to copy** · effort **S/M**

| Panel | Verdict |
|---|---|
| Paired scoreboards (`topics/emission-rates.html`) | **Winner — no change needed.** The axis states "Not appropriate — % of 54 who answered Q36" / "Appropriate — % of 66 who answered Q35", and the specials block spells out "the two questions have different bases (66 and 54) and neither is a referendum". The own-base annotation is loud enough. This is the best panel on the site and the pattern the others should borrow. |
| Mini-matrix (`decisions.html`) at 390 px | **Winner** — net chip + n chip on every row, fully legible |
| 9×3 matrix at 390 px | **Rejected as shipped** (F10) — net column entirely off-screen; headers break mid-word ("REQUIRE D") |
| Required-vs-feasible cross | **Rejected as shipped** (F11) — labels clip off-canvas at 1440 *and* 390; the optional-middle three collide illegibly; labels are the verbose "Requiredness of the …" strings |

`frontend/dev-viz.html` (unlinked) renders the real data in three narrow-viewport variants —
screenshot at `notes/p35-screens/devviz-matrix-alternatives.png`:

- **A** — as shipped, for reference: 122 px of a 450 px grid outside the port.
- **B** — net promoted into the row header. Three data columns fit 328 px with no scroll; the sort key
  stays beside the label it sorts. **Ranked first**: smallest change, keeps per-level counts.
- **C** — `ECMatrix.renderMini`, i.e. the stacked-bar row the Decision Board *already ships*. Cleanest
  read, loses per-level raw counts to the popover. **Ranked second**, and it is the zero-new-code option:
  render `renderMini` below a breakpoint and the heatmap above it.

Everything else is clean: **zero horizontal page overflow at 390 px on all nine pages**, and with the
CDNs fulfilled, **zero console errors on every page**. The CDN failures in a bare sandbox run are
environmental, as briefed — but note there is no graceful fallback if Chart.js fails for a real user, so
the cross and any other canvas panel render as blank space. Low priority, worth knowing.

**Blocks P40: no.**

### Q5 · Small-n masking in practice — **the opposite of a mask farm** · effort **S**

The stub asked which panels should drop the toggle rather than render a mask farm. There is no mask
farm: **the sentinel never fires anywhere**, because gotcha 15 keys it on the segment value's overall
respondent count and the smallest of those is `jp` at 8. What actually ships:

- 91 stance segment cells, **0 masked**, **4 with n<5**, 23 with n<10.
- The n<5 cells: `Q021 country_4/jp` n=3 `[1,2]`, `Q024 org_type_5/industry_group` n=3 `[1,2]`,
  `Q024 country_4/jp` n=4, `Q033 country_4/uk` n=4.
- `matrix.json`: 27 cells with n<10, none below 5.

| Option | Verdict |
|---|---|
| Drop the country toggle on thin questions | Rejected — country is the most informative axis (F3); dropping it loses the finding |
| Keep as-is | Rejected — an n=3 cell printing `[1,2]` is exactly what gotcha 15 meant to prevent |
| **Add a cell-level n<5 mask on top of the segment-level one** | **Winner** — masks exactly 4 cells today, changes nothing else, and makes the rule match its stated intent |
| Render sub-10 cells with a visible thin-n treatment | **Winner (pair with the above)** — `jp` and `uk` are ≤7 on every stance question except Q19; the percentage should be suppressed in favour of the raw count below ~10 |

**Blocks P40: no.**

---

## 5. Cheap wins for P42, by value ÷ effort

1. **Matrix option B or C below a breakpoint** (F10). C is zero new code — call `renderMini` under
   ~640 px. Highest value: it restores the sort key on mobile. **S**
2. **Short labels on the cross** (F11) — use `meta.matrix.tests[].label` stripped of "Requiredness of
   the …", pad the x-axis max, and offset colliding labels. **S**
3. **Cell-level n<5 mask + thin-n treatment under n=10** (F8). Four cells today. **S**
4. **Move `net_pct` into `matrix.json`** (F4) so no renderer can diverge from the digest again. **S**
   (contract change — see §6)
5. **Fix §3.5's cluster span in any UI copy that quotes it** (F5). **S**
6. **Chart.js fallback** — a `.ec-empty` note when `window.Chart` is undefined, matching the existing
   empty-state pattern in `matrix-viz.js`. **S**
7. **Header wrapping in the matrix** — "REQUIRE D" / "OPTIONA L" break mid-word at 390 px. Fixed for
   free by option B/C. **XS**
8. Known and already banked: `topics/weighting.html` under `?fixtures=1` renders prose only. Not
   re-reported. **—**

---

## 6. Contract additions requested (P22)

| # | Addition | Why |
|---|---|---|
| C1 | `matrix.json → tests.<qid>.net_pct` (1 dp, exporter-computed, pre-rounded convention) | Root cause of F4. Two renderers each compute the net client-side today; the digest computes it a third way. One authoritative field ends it. |
| C2 | `integrity.json → text_clusters_n_respondents` (integer, = 26) | F5. The spanned count exists only in prose right now, which is exactly how it drifted. |
| C3 | Cell-level thin-n handling in every `SCELL` — either extend the mask to cell n<5, or add `"thin": true` at n<10 | F8. Lets renderers hatch or suppress without re-deriving bases. |
| C4 | `respondents.json → country_effect`, mirroring `redaction_effect` (per-stance-question `us` / `non_us` SCELL pair) | F3. P40 needs the country cut and there is no shipped panel for it; today it can only be got by re-querying the db, which §3 forbids for page numbers. |
| C5 | *(optional)* `integrity.json → blocs[].n_countries` or a `single_country: true` flag | F6, without naming the country. Lets the integrity page make the point safely. |

C1 and C4 are the two that matter. C4 is the only one that unblocks essay content.

---

## 7. Deviations from PLAN.md and the prompt

Flagged loudly, as required.

1. **The hub branch no longer exists.** `claude/electricity-consultation-hub-lp37w8` was merged as PR #46
   and deleted; `git ls-remote --heads origin` returns `main` only. I branched
   `claude/ec-p35-verification` from `origin/main` at `d4b2605`, which *is* the merge commit for that
   branch, so the content is identical to what the prompt asked for. No content was lost.
2. **I pushed.** The prompt's PUSH section explicitly overrides PLAN §9 item 6 ("commit in your
   worktree, do not push"). No PR opened — the user merges.
3. **I did not work in a git worktree.** The prompt's SETUP gives a plain `checkout -B`, and this is a
   solo wave with no parallel lane to isolate from.
4. **I installed two packages** into the session environment: `playwright` (the Python bindings were
   absent; the browser at `/opt/pw-browsers/chromium-1194` was already there and `playwright install`
   was never run) and `openpyxl` (needed by `validate_dataset.py`, as the manager's note says). Neither
   is committed; no repo file changed.
5. **I fetched Chart.js and GSAP over `curl` into the session scratchpad** and served them to the browser
   through Playwright route interception, purely to screenshot the charts. `dev-viz.html` itself contains
   no vendored library and no localhost reference. Nothing was committed.
6. **Screenshots are committed to the repo** at `notes/p35-screens/` — 35 PNGs, **11.4 MB total**. Raw
   captures came to 49 MB, so the eighteen full-page context shots are stored at half linear resolution
   and every file is palette-optimised; the twelve panel/exhibit captures the memo cites are kept at
   native resolution. Flagging the payload in case the manager wants it pruned further to the cited
   exhibits only.
7. **No page, exporter, data, reference or plan file was modified.** The exporter was not rerun. See the
   boundary proof below.

### Boundary proof

```
$ git diff --stat origin/main...HEAD
 electricity-consequential/frontend/dev-viz.html                                        | 187 +++++++
 electricity-consequential/plans/consequential-dashboard/notes/P35-verification-memo.md | 445 +++++++++
 electricity-consequential/plans/consequential-dashboard/notes/p35-screens/*.png        | Bin (35 files)
 37 files changed, 632 insertions(+)
```

Every path is inside `electricity-consequential/`, every change is an addition (no file modified or
deleted), and the only non-`notes/` file is the unlinked `dev-viz.html` the prompt authorizes. No
shipped page, exporter, dataset, reference file, `PLAN.md` or prompt file was touched.

---

## 8. Screenshot index

All under `notes/p35-screens/`.

| File | Shows |
|---|---|
| `panel-matrix-mobile.png` | **F10** — the 9×3 matrix at 390 px with the net column clipped away |
| `chart-cross-1440.png` | **F11** — label collision and right-edge clipping at desktop width |
| `chart-cross-390.png` | **F11** — the same chart at 390 px |
| `chart-scorepanel-390.png` | The scoreboard panel that needs no change (own-base annotation + specials note) |
| `chart-mini-390.png` | The mini-matrix pattern recommended as matrix option C |
| `devviz-matrix-alternatives.png` | **A / B / C** side by side at 328 px content width |
| `devviz-net-rounding.png` | **F4** — the two rounding conventions, per row |
| `<page>-{desktop,mobile}.png` | Full-page captures of all nine pages at 1440 px and 390 px |
