# QA report, shard B (storage-mechanics, storage-revision, consequential-basics, consequential-ccus, index)

Compiled 2026-10-19 by verification shard QA-B. Scope: five pages only. Basis: R3 (storage pages), R4 (consequential pages), R1 to R4 (index). sources.html read-only.

## Method

- Citation integrity: script over every `.cite` href; each id looked up in `sources.html` and the row's tier compared with the chip class. Result: 317 chips on the five pages; every id resolves; every tier class matches its row. No missing ids to report. index.html carries no chips (hub page; its claims are carried and cited on module pages).
- Quote fidelity: script extracting every curly-quoted span on each page (body text, `.quote`, `.defn`; split on ellipses; typographic quotes, dashes and whitespace normalised) and searching the dossier. Result: 0 unmatched fragments on storage-mechanics, consequential-basics, consequential-ccus, index; 1 on storage-revision (“Regardless of age”, a paraphrase in quote marks; see SR-8). Spot checks against primary files where the build shards were unsure: S13 raw data (Tierra Climate), S14 PDF (first-of-its-kind sentence), TWG #23 deck slide 28 (S8), TWG #23 minutes p.3 (S7), MBM update p.1 (S6), T4 abstract via Crossref.
- Numbers: script listing every numeral on each page not present in the dossier; then a manual check of unit, base and source for each figure. Only hits: an SVG comment (0.36 px/unit) and an axis tick (1,000) on consequential-ccus. All bar lengths re-computed against their stated scales; all match.
- Labels and strength: every section read sentence by sentence against the dossier.
- Render: checker copied to the scratchpad and run on port 8822, because 8802 was already bound on this machine (`EADDRINUSE`); plus a figure-level script (rendered font size, text outside viewBox, text overlap; per-figure screenshots at 400 px, light and dark).
- Links: pager and nav targets exist; no TODO/placeholder; no literal hex outside tokens.

## Flagged-first items (requested by the build shards)

| Item | Verdict |
|---|---|
| storage-revision decision tree, I-2 "B is enough" | Supported. R3 §6.3 I-2 sketch: a new or uprated store "makes discharged energy eligible even if the charged energy is from older generation"; §6.5 "Under I-2, no: a new store could itself be the qualifying event." "Enough" asserts sufficiency only; R3 is silent on whether A alone also suffices under I-2, and the label does not claim otherwise. No change. Related fix SR-3 (the companion toggle figure said the highlighted asset "must be new"). |
| Condensed 45V one-claim sentence ("45V counts stored energy in the discharge hour and tests the generator, not the store") | Supported by T4 §1.45V-4(d)(3)(ii)(C) and the FR 2270 preamble (R3 §5.2). No change. The comparison-table cell on storage-mechanics did need the other incrementality pathways (SM-3). |
| Tierra Climate attribution (Q5/Q46 vs Q073) | Two different quotes. The Q073 block quote on storage-mechanics is correct (verified in S13, respondent 247, Q073). The "Only losses are included in Scope 2 activity data for storage" sentence is from respondent 247's **Q046** answer, which is about the **location-based method** ("Under the LBM, energy storage is always assigned positive emissions …"). The dossier's "Q5/Q46, finding 3.6" is an internal slip (there is no finding 3.6). The page's "Q5/Q46" chip and its "under current practice" framing were wrong: see SM-2. |
| Q72 "7th of 11" | Supported: R3 §3.1 full ranking (n=378) puts the storage option 7th of 11 listed options. The page states the base (respondents answering that question). No change. |
| "profitable for coal- and natural gas-based electricity generator owners" (T4) | Phrase is in R4 (Q3 table) and verified verbatim in the T4 abstract via Crossref. The abstract's full clause: "Under IRA's 45Q changes, carbon capture and storage (CCS) is expected to be profitable for coal- and natural gas-based electricity generator owners, particularly regulated utilities …". The page's lead-in "say 45Q can make CCS" is a fair paraphrase of R4's own wording; nit only (CC-9). |
| "Once the technology becomes established … subsequent projects no longer qualify" (S14 §7.1) | Verified in the S14 PDF: "Once the technology becomes established and replicated, subsequent projects no longer qualify." The ellipsis covers "and replicated". No change. |
| New-build Statement 1 inference from LSR "if CO2 was emitted from the facility in prior years" | Supported. The quoted words are verbatim (R4 B1, S21 p.359). The conclusion matches R4 Application B(a) and the comparison matrix ("INF: no year-over-year reduction because the source is new"). It sits in an inference callout, and the matrix cell is badged Source / Inference. No change. |
| Q26 and Q47 percentages | All 27 Q26 values and 9 n's match R4's distribution table; all five Q47 values match (n=67). Chips cite S15 and the S16 dataset, which is how R4 sources the table. No change. |

## storage-mechanics.html (R3)

| Sev | Location | Problem | Dossier ref | Proposed fix |
|---|---|---|---|---|
| fix | §1 first prose ("Start with what is missing…") | "nothing on charging, discharging or round-trip losses" is too broad: S1 does mention charging (EV charging, §5.3.1 and §4.3). | R3 1.1 | "…finds one passing mention of storage technologies and nothing on how storage charging, discharging or round-trip losses are treated." |
| fix | §1 callout "A stakeholder reading, not guidance" | Wrong question (Q5/Q46) and wrong framing. The sentence is from Tierra's Q046 answer about the location-based method. "Under current practice" is not the respondent's framing. | R3 1.4 (internal slip); S13 respondent 247, Q046 | "One respondent, Tierra Climate, writes in a Q46 answer about the location-based method that “Only losses are included in Scope 2 activity data for storage”. The research found no GHG Protocol text that states this." Chip text "…Tierra Climate, Q46". |
| fix | §3 precedents table, 45V cell "Must the charged energy's generator be new?" | Presents the 36-month COD rule as the only route. R3 lists uprate, qualifying-State and certain-nuclear pathways. | R3 5.2 | Append "Uprate, qualifying-State and certain-nuclear pathways also exist (FR 2318–2319)." |
| fix | §5 key callout | "The Quality Criteria point toward cancel on charge, re-issue on discharge…" is reasoning (R3 §6.2 is all INFERENCE) and sits unlabelled in a key callout. | R3 6.2 | "On the research's reading (inference), the Quality Criteria point toward…". |
| fix | §5 sourced bullet on EnergyTag | "re-issues on discharge" overstates: issuing SD-GCs is optional for issuers ("may issue"). | R3 5.1 (T1 p.10) | "…and, where an issuer opts in, re-issues on discharge…". |
| nit | §4 h2 "The draft mentioned storage four ways" | The section lede lists three kinds of mention (definition, rationale, answer options). | R3 2.1 | "…three ways…". Applied (trivial). |
| nit | §3 gap callout | Its first sentence restates an R3 INFERENCE (records without attributes) inside a gap callout. It is a close reading of T1 p.25. | R3 5.1 | None. |
| nit | §1 step 3 | "may be covered by certificates under the market-based method" is a close paraphrase of S1 p.97 ("can report this calculation based on the market-based method"). R3 labels the overall reading as inference. | R3 1.3 | None. |
| nit | Ledger stepper, JS off | Frame captions 2 to 6 stay hidden without JS. | BUILD-BRIEF rule 8 | Add `<noscript>` style to show `[data-frame-caption]`. Applied (trivial). |
| nit | Render (phone) | Figures draw text at about 8.5 to 9.2 CSS px at 400 px width. Legible. Text is 10.5 px in viewBox units, as the brief requires. | — | None. |

## storage-revision.html (R3)

| Sev | Location | Problem | Dossier ref | Proposed fix |
|---|---|---|---|---|
| fix | §1 section-head lede | "storage has been sent elsewhere" overstates. "Qualifying storage" stays in the Method 1 incrementality design. The Statement 3 placement is TWG member feedback (see SR-2). Storage guidance is assigned to the informative Guidance v2.0. | R3 4.3, 4.6, 4.10 | "The ISB has set a direction. It is not a decision. Most storage questions are routed elsewhere: accounting guidance to a later informative Guidance, impacts toward Statement 3." |
| fix | §1 signal callout "storage goes to Statement 3" | Slide 28 records TWG members' feedback, not an ISB position. Primary check of S8 slide 28: "TWG feedback related to AMI multi-statement approach … Members supported a consequential metric…". The ISB's own position (S7 p.5) is unanimous support for developing an electricity consequential methodology starting Q2 2027; it does not single out storage. | R3 4.6; S8 slide 28 | Label "Signal of direction · storage toward Statement 3"; open with "TWG member feedback, as summarised in the deck:". |
| fix | §3 toggle figure, figcaption and aria-label | "Green marks the asset that must be new under the selected option." Under I-1 the generator may pass through a qualifying event (life extension, upgrade); under I-2 a new store is sufficient, not required. | R3 6.3 table; S8 slide 40 | "Highlighted badges mark the asset the selected option tests (age limit or qualifying event)…" (aria-label to match). |
| fix | §6 inference bullet | "On the only precedent that addresses storage and incrementality together…". EU 2023/1184 also addresses both, as the same page shows. R3 6.4 has the same slip. | R3 5.3, 6.4 | "On the 45V precedent, a 50-year-old pumped store could still qualify if it charges from qualifying generation; under the EU model it would not." |
| fix | §6 closing signal callout | "A position on storage would need to be brought to the incrementality design discussion" is advice/reasoning inside a signal callout. | R3 signals 9 | Mark it: "Inference: a position on storage would most naturally enter through the incrementality design discussion." |
| nit | §6 sourced bullet | "TWG members objected": the minutes say "Members raised concerns". | R3 4.7 | "raised concerns that…". Applied. |
| nit | §4 Q(iii) inference | “Regardless of age” in quote marks; R3's phrase is "Regardless of asset age". | R3 6.6 | “Regardless of asset age”. Applied. |
| nit | §2 prose | "commonly named key indicators": S8 says "Commonly named indicators". | R3 4.8 | "among commonly named indicators". Applied. |
| nit | §3 toggle, JS off | Only the I-1 explanation shows without JS. Most of the I-2 to I-4 content is repeated in §5. | BUILD-BRIEF 8 | Add `<noscript>` style for `[data-mode-show]`. Applied. |
| nit | §4 decision tree, SSS overlay box | Applies an R3 INFERENCE (6.4 SSS overlay) without its own label. The whole figure is captioned as options, not rules. | R3 6.4 | None. |
| ok | Timeline "2026-10-20 to 22" cites TWG #23 minutes p.3 | Verified in S7: agenda item 5 "In-person/hybrid TWG workshop (October 20-22, Washington DC)" is on p.3. | — | — |
| ok | Defn "Describing one stakeholder 'theory of change'" | Verified in S6 p.1: "Theory of change 1: These stakeholders responded that…". | — | — |

## consequential-basics.html (R4)

| Sev | Location | Problem | Dossier ref | Proposed fix |
|---|---|---|---|---|
| fix | §2 h2 and TOC "Additionality will be required in Statement 3" | Presents draft TWG text ("shall") and a Secretariat statement as a settled future rule (proposed vs adopted). | R4 F1.6, signals 4, 6 | "Additionality is proposed as a Statement 3 requirement". |
| fix | §1 statement-grid SVG, plant owner × Statement 3 tag "SOURCE · AMI WP p.22" | The sub-category is sourced, but placing the plant owner's capture action there is inference (R4 F6.5; matrix "SOURCE (S1 p.22) / INF"). | R4 F6.5, comparison matrix | Tag "SRC + INF · WP p.22". |
| fix | §3 scrolly step 3 | "For capture, that means capture units, pipelines and storage wells." This is an application (R4 Application A, all INFERENCE) in a plain paragraph. | R4 Q2 Application A | "Applied to capture (inference): capture units, pipelines and storage wells." |
| fix | §4 inference callout | "The TWG's own July 2026 boundary proposal". That proposal is the AMI TWG's (S7b); the formula is the Scope 2 TWG subgroup's. The wording implies the same group. | R4 F1.7 | "The AMI TWG's July 2026 boundary proposal…". |
| fix | §5 key callout | Unlabelled inference ("the electricity consultation's simpler formula drops the parts that matter…", R4 Q3 "INFERENCE"). "Never netted" is stronger than a draft. | R4 Q3, F1.3 | Rewrite with "in the draft" and "(inference)". |
| nit | §2 timeline, 2026-06-30 item | "annual ex-post time boundary proposed" is on S7b PDF p.67; the chip gives p.5 only. | R4 F1.7 | Chip "PDF pp.5, 67". Applied. |
| nit | §3 formula note | "so a project with non-zero emissions carries them here" is a light reading of S14 p.7. | R4 B5 | None. |
| nit | Render (phone) | 600-unit-wide viewBoxes (statement grid, effects map) draw text at about 6.1 to 6.3 CSS px at 400 px width. Legible on a 2× screen but small. The brief's 10.5 px rule is met in viewBox units. A design pass (taller, narrower layouts or a horizontal-scroll wrapper as on index) would help; it is not a minimal edit. | — | Not applied; see "What remains". |

## consequential-ccus.html (R4)

| Sev | Location | Problem | Dossier ref | Proposed fix |
|---|---|---|---|---|
| fix | §1 prose after the matrix | The "short answer" and "For the plant owner, the draft framework points to Statement 3's 'within organizational boundary impacts'" are R4 INFERENCE (Application A "Reporting location") in plain paragraphs. The first says "as inference" only in passing. | R4 Q2 Application A | Move both into a `.callout.inference`, keeping the chips. |
| fix | §3 opening prose | "A new CCS plant is a grid-connected generation project, like the new-NGCC row…; Baseline emissions are … project emissions are …". R4 Application B(b) makes this an analogy and marks it INFERENCE. | R4 Q2 Application B | Put the analogy in an inference callout; keep the sourced S14 sentence as prose. |
| fix | §3 details, one-time effects | "What remains is the extra construction for capture equipment, pipelines and storage wells" is R4 inference, in a plain paragraph. | R4 Application B | Prefix "Inference:". |
| fix | §6 section-head lede | "The tests were written 'to assess additionality for renewable energy projects'" overstates. R4: the **Q26 survey wording** frames them as "a framework designed to assess additionality for renewable energy projects". | R4 Q3 (S14 p.11) | "The consultation's survey question frames the tests as “a framework designed to assess additionality for renewable energy projects”." |
| fix | §8 key callout | The impact-side treatment (credit against its own history "only if it was not about to retire", "A new build earns only a system-change credit") is R4 INFERENCE, unlabelled in a key callout. | R4 Q2 Application | Mark the inventory clause as sourced and the impact clauses as inference. |
| fix | §8 SOURCED (third party) bullet | "NETL's designs cut the per-MWh rate by…": R4 is explicit that these are greenfield new-build designs, not retrofit data. A takeaway bullet on a retrofit-focused page should say so. | R4 Q5 caveats | "NETL's greenfield (new-build) designs…". |
| nit | §8 SOURCED bullet 2 | "In-force project rules give retrofits a historical-rate baseline". The source says baseline emissions "may be estimated as" the historical rate. | R4 B3 (Box 8.7) | "…allow retrofits a historical-rate baseline…". Applied. |
| nit | §3 new-build figure | The verdict panels ("Impact per MWh = baseline − residual: positive") are inference; the caption does not say so. | R4 Application B | Caption prefixed "Inference:". Applied. |
| nit | §6 Financial-analysis cell | "say 45Q can make CCS 'profitable …'" vs the abstract's "is expected to be profitable … particularly regulated utilities". Matches R4's own paraphrase. | R4 Q3 table; T4 | None (dossier wording kept). |
| nit | §2 step 1 | "The brown bar": a colour word that depends on the theme token. | — | None. |
| nit | Render (phone) | Four 600-unit-wide figures draw text at about 5.9 to 6.3 CSS px at 400 px. The rotated "double-claiming risk" label was flagged outside the viewBox by the script; on inspection it is inside (false positive from pre-transform bbox). | — | Not applied; see "What remains". |

## index.html (hub; R1 to R4)

| Sev | Location | Problem | Dossier ref | Proposed fix |
|---|---|---|---|---|
| blocker | Map figure, "Module 3 · Storage impact" node | "ISB pointed storage and load shifting at Statement 3 (Sept 2026)" attributes TWG member feedback to the ISB. Primary check of S8 slide 28 ("TWG feedback related to AMI multi-statement approach … Members supported a consequential metric … storage and load shifting") confirms it. The ISB position (S7 p.5; R2 S04 slide 30) is support for an electricity-sector consequential methodology from Q2 2027, not a storage placement. | R3 4.6; R2 Q3 (Sept 2026 ISB) | "TWG members point storage and load" / "shifting at Statement 3 (Oct 2026)". |
| fix | Hero meta "Documents behind them 145" | sources.html states 152 (and lists 152 rows). | sources.html | "152". |
| fix | Status note | "the Independent Standards Board's vote scheduled for 15 December 2026". Sources say an ISB "meeting on TWG outcomes" (R3 4.12; R2 "meeting on TWG outcomes has moved from November to December 15, 2026"). No vote is documented. | R2 Q2; R3 4.12 | "…the Independent Standards Board's meeting on TWG outcomes, scheduled for 15 December 2026…". |
| fix | Map SVG aria-label | "the draft three-statement framework": four statements are under consideration (R4 F1.1); the map shows three of them. | R4 F1.1 | "three of the four statements in the draft multi-statement framework". |
| nit | No cite chips on the hub | Headline claims carry no chips; each is cited on its module page. Checked: CCS left out of scope 1 / buyers' scope 2 (R4 B1, R1); "2015: any technology can carry an emission-rate attribute" (R1, S3 p.90 / p.102); Method 1/2 proposed (R2, R3); Q2 2027 start "(direction)" (R3 4.6); "Scope 2 TWG owns the electricity detail; AMI TWG owns the framework" (R2: "the AMI TWG sets the framework … the Scope 2 TWG develops the electricity-specific details", S03 p.5); LSR Standard v1.1 and Guidance v1.0 (R1). | — | None. |
| nit | Method cards | Third party "Used only where GHG Protocol material is silent" is slightly strong: NETL/AR5 numbers and respondents are used alongside GHG Protocol text. The gap card's "where a stakeholder can shape the outcome" is an opinion. | — | None. |

## Render and links (all five pages)

- Checker (port 8822): 400 px and 1280 px, light and dark: no horizontal overflow on any page; no page or console errors except one 404 for `/favicon.ico` (no favicon is referenced; harmless).
- Figure script: no text overlaps; no text outside a viewBox (one false positive, explained above).
- Interactives have matching targets: storage-mechanics stepper → `#ledger` (frames 0 to 5, 6 captions); storage-revision `.seg` → `#attach` (i1 to i4, matching `.m-*` groups and `data-mode-show` blocks); consequential-ccus `.matrix` (r1, r3, n1, n3 ↔ `data-detail-for`) and `.seg` → `#nb` (fossil/clean ↔ `.only-*` and `data-mode-show`); scrolly `data-step` indices match step counts (4, 6, 9 steps).
- Pager links: storage-mechanics governance ← → storage-revision; storage-revision ← storage-mechanics → consequential-basics; consequential-basics ← storage-revision → consequential-ccus; consequential-ccus ← consequential-basics → sources; index ← sources → ccs-removals. All files exist. Nav block identical on all five.
- No TODO or placeholder text; no literal hex outside tokens.

## Severity counts

| Page | blocker | fix | nit |
|---|---|---|---|
| storage-mechanics | 0 | 5 | 5 |
| storage-revision | 0 | 5 | 5 |
| consequential-basics | 0 | 5 | 3 |
| consequential-ccus | 0 | 6 | 5 |
| index | 1 | 3 | 2 |
| **Total** | **1** | **24** | **20** |

## Changes applied (minimal edits; structure unchanged)

storage-mechanics.html
- §1 prose: "nothing on charging, discharging…" became "nothing on how storage charging, discharging or round-trip losses are treated".
- §1 Tierra note: now "writes in a Q46 answer about the location-based method that …"; chip text "Tierra Climate, Q46".
- §3 table, 45V generator cell: added "Uprate, qualifying-State and certain-nuclear pathways also exist (FR 2318–2319)."
- §5 key callout: added "On the research's reading (inference), …".
- §5 EnergyTag bullet: added "where an issuer opts in" before "re-issues on discharge".
- §4 h2: "four ways" became "three ways" (nit).
- Head: `<noscript>` style so ledger captions show without JS (nit).

storage-revision.html
- §1 lede: "storage has been sent elsewhere" became "Most storage questions are routed elsewhere: accounting guidance to a later informative Guidance, impacts toward Statement 3."
- §1 signal callout: label is now "storage toward Statement 3", and the quote is prefixed "TWG member feedback, as summarised in the deck:".
- §3 toggle figure: figcaption and aria-label now say the highlighted asset is the one the option "tests (age limit or qualifying event)", not the one that "must be new".
- §6 inference bullet: "On the only precedent …" became "On the 45V precedent …; under the EU model it would not."
- §6 closing signal: the advice sentence is now tagged Inference and reads "would most naturally enter through the incrementality design discussion".
- Nits: "objected" became "raised concerns"; “Regardless of age” became “Regardless of asset age”; "key indicators" became "indicators"; `<noscript>` style for `[data-mode-show]`.

consequential-basics.html
- TOC and §2 h2: "Additionality will be required in Statement 3" became "Additionality is proposed as a Statement 3 requirement".
- §1 statement-grid SVG: plant-owner Statement 3 tag "SOURCE · AMI WP p.22" became "SRC + INF · WP p.22".
- §3 scrolly step 3: the capture application moved into an inference callout.
- §4 inference callout: "The TWG's own" became "The AMI TWG's".
- §5 key callout: "never netted" became "in the draft, not netted"; the formula judgement is prefixed "On the research's reading (inference)".
- Nit: timeline chip "PDF p.5" became "PDF pp.5, 67".

consequential-ccus.html
- §1: the "short answer" and plant-owner placement paragraphs now sit in `.callout.inference` ("Inference · the short answer"), with "By analogy" added before the CHP example.
- §3 opening: the new-NGCC analogy and baseline/project definitions are in an inference callout; the sourced S14 sentence stays as prose.
- §3 details: "Inference:" prefix on the one-time-effects remainder.
- §6 lede: now "The consultation's survey question frames the tests as “a framework designed to assess additionality for renewable energy projects”."
- §8 key callout: inventory clause marked "(sourced)", impact clauses "(inference)".
- §8 third-party bullet: "NETL's greenfield (new-build) designs".
- Nits: "give retrofits" became "allow retrofits"; the new-build figure caption is prefixed "Inference:".

index.html
- Map node (blocker): "ISB pointed storage and load / shifting at Statement 3 (Sept 2026)" became "TWG members point storage and load / shifting at Statement 3 (Oct 2026)".
- Hero: "Documents behind them 145" became "152".
- Status note: "vote scheduled for 15 December 2026" became "meeting on TWG outcomes, scheduled for 15 December 2026".
- Map aria-label: "the draft three-statement framework" became "three of the four statements in the draft multi-statement framework".

Re-checks after the edits
- Citations: all ids resolve and all tiers match (317 chips).
- Quotes: 0 unmatched fragments on all five pages.
- HTML: well-formed, no unclosed or mismatched tags.
- Render (port 8822): no overflow at 400 or 1280 px in light or dark; only the `/favicon.ico` 404.
- Figures: no overlaps; every SVG text stays inside its box (the index node text was shortened to fit its 186-unit card).

## What remains (not fixed)

- Phone legibility of 600-unit-wide figures on consequential-basics (2) and consequential-ccus (4): about 6 CSS px text at 400 px. Fixing it needs a layout pass or a horizontal-scroll wrapper (the pattern index uses); a minimal edit cannot do it.
- R3's own slips, which the build shards will reproduce if they reuse the dossier: §1.4 "Tierra Climate, Q5/Q46, finding 3.6" (should be Q046, an LBM answer) and §6.4 "the only precedent that addresses storage and incrementality together". The dossiers are research inputs, so they were not edited.
- Nits left as is (listed in the tables above).
