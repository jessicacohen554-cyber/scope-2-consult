# Theme taxonomy — Electricity-Sector Consequential Methods consultation

Closed coding vocabulary for the free-text record (Q18–Q52, 20 substantive questions,
1,377 answers; junk respondents 11/12/14 and superseded 100 excluded → 1,335 codeable
answers). Produced by P21; consumed by `reference/coded_themes.csv`, the P22 exporter
(`themes.json`), the four topic pages, `voices.html`, and the P40 assessment.

**Design method.** Keys were drafted from a reconnaissance pass over Q18 (general),
Q20 (formula rationale), Q22 (secondary effects), Q27 (additionality rationale),
Q37 (operating-margin methods), Q41 (model applicability), Q48 (weighting rationale)
and Q52 (evidence), seeded by PLAN.md §6, then locked before the full coding pass.
The record was allowed to correct the seed list: `model_manipulability` and
`greenwashing_overclaiming` merged into `gaming_greenwashing_risk` (the record argues
them in one breath); "keep it separate/voluntary" asks fold into
`inventory_vs_impact_boundary`; storage/flexibility recognition folds into
`corrects_attributional_blindspots`; purpose-definition complaints fold into
`tiered_rigor_by_claim`. One key was added mid-pass when the record demanded it:
`workstream_coordination` (10+ respondents independently argue the Scope 2 and
AMI/consequential workstreams must be developed and released in coordination — a
recurring position no seed key covered). 43 keys — three more than the ~25–40
planning band, accepted because this survey argues five topic families each with
opposing camps (deviation noted in the P21 report).

**Coding rules.**

1. **Multi-label.** Every substantive answer gets every theme it argues (typically
   1–5). An answer with no thematic content ("N/A", "-", "no comment", pure
   cross-reference) is coded `uncodeable`.
2. **Text only.** Codes come from what the answer says — never from the respondent's
   org type, country, or closed-question stance.
3. **Template propagation.** Answers whose normalized text is identical (the P10
   recipe: lowercase, collapse whitespace, strip) carry identical codes; the text is
   coded once.
4. **Argued, not mentioned.** A theme is coded when the answer asserts or argues it,
   not when it merely names the concept to dismiss it or quote the survey. An answer
   that argues *against* a design ask is coded with the opposing camp's key where one
   exists (e.g. rejecting the 50/50 default → usually `dynamic_lifecycle_weighting`
   or `standardization_guidance`, not `default_5050_weight`).
5. **Polarity** is a property of the theme, not the respondent: `concern` = names a
   problem/risk of consequential accounting or the proposal; `support` = argues value
   of consequential accounting or a proposed element; `design` = prescribes how the
   standard should be built; `neutral` = contextual/informational content.

---

## Key index

| # | key | polarity | label |
|---|---|---|---|
| 1 | `attribution_uncertainty` | concern | Causal attribution is uncertain or untraceable |
| 2 | `baseline_counterfactual_problem` | concern | Baselines/counterfactuals are contested |
| 3 | `comparability_loss` | concern | Divergent methods destroy comparability |
| 4 | `complexity_burden` | concern | Complexity, cost and administrative burden |
| 5 | `data_availability` | concern | Required data unavailable or immature |
| 6 | `verification_difficulty` | concern | Not auditable / assurance is impractical |
| 7 | `gaming_greenwashing_risk` | concern | Method freedom invites gaming and greenwash |
| 8 | `double_counting_risk` | concern | Same impact claimed more than once |
| 9 | `inventory_vs_impact_boundary` | concern | Keep impact out of the Scope 2 inventory |
| 10 | `incentive_erosion_procurement` | concern | Separation erodes the procurement incentive |
| 11 | `perverse_incentives` | concern | Metric design rewards the wrong behavior |
| 12 | `sme_equity` | concern | Smaller organizations cannot participate |
| 13 | `regional_equity` | concern | Data-poor regions and markets disadvantaged |
| 14 | `additionality_stringency_chill` | concern | Strict additionality chills investment |
| 15 | `additionality_wrong_construct` | concern | Additionality misapplied to this metric |
| 16 | `net_impact_completeness` | concern | Impact must net induced against avoided |
| 17 | `secondary_effects_unquantifiable` | concern | Secondary effects too speculative to require |
| 18 | `simplified_methods_misleading` | concern | Average/simplified methods misstate margins |
| 19 | `formula_oversimplified` | concern | The formula is too coarse for the system |
| 20 | `real_world_impact_signal` | support | Measures real-world system impact |
| 21 | `investment_steering_dirty_grids` | support | Steers investment where impact is highest |
| 22 | `corrects_attributional_blindspots` | support | Fixes what attributional accounting misses |
| 23 | `formula_structurally_sound` | support | The formula is a sound starting structure |
| 24 | `integrate_with_scope2_recognition` | design | Integrate impact with Scope 2 recognition |
| 25 | `tiered_rigor_by_claim` | design | Calibrate rigor to claim type and purpose |
| 26 | `standardization_guidance` | design | Standardize methods, defaults, disclosure |
| 27 | `regional_test_variants` | design | Adapt tests/methods to regional context |
| 28 | `default_5050_weight` | design | Endorse the fixed 0.50/0.50 OM/BM default |
| 29 | `dynamic_lifecycle_weighting` | design | Weight OM/BM by lifecycle/system condition |
| 30 | `align_with_existing_tools` | design | Build on established tools and standards |
| 31 | `hourly_locational_granularity` | design | Require fine temporal/spatial granularity |
| 32 | `coarse_granularity_feasibility` | design | Prefer coarse granularity for feasibility |
| 33 | `annual_truing_up` | design | Report annually, true up with actuals |
| 34 | `lifetime_impact_view` | design | Value lifetime/cumulative impact framing |
| 35 | `secondary_effects_material` | design | Secondary effects are material — include them |
| 36 | `additionality_gatekeeping` | design | Require additionality tests as gatekeepers |
| 37 | `additionality_optionality` | design | Keep additionality tests optional/flexible |
| 38 | `additionality_test_design` | design | Refine individual test mechanics |
| 39 | `model_validation_governance` | design | Govern, validate and tier the models |
| 40 | `dispatch_based_methods_preferred` | design | Prefer dispatch-grounded marginal methods |
| 41 | `workstream_coordination` | design | Coordinate the Scope 2 and AMI workstreams |
| 42 | `jurisdiction_specific_context` | neutral | Jurisdiction-specific system context |
| 43 | `evidence_pointer` | neutral | Supplies references, data or documentation |

---

## Concern themes

### 1. `attribution_uncertainty` — Causal attribution is uncertain or untraceable
**Definition.** Argues that the causal effect of a single actor's action on grid
emissions cannot be reliably established: dispatch is driven by thousands of actors
and exogenous variables, system responses cannot be traced to one decision, and
estimates therefore carry irreducible or unquantifiable uncertainty ("false
precision").
**Include:** untraceability of individual actions; unknowable system response;
uncertainty ranges so wide results lose meaning; asks to communicate uncertainty as
decision information.
**Exclude:** disputes about *which* baseline to use (→ 2); model-choice divergence
(→ 3); audits (→ 6).
**Examples.** rid 3 Q18: "It is not technically feasible to trace how an individual
organisation's action … directly causes a specific fossil fuel generator to reduce
output, defer investment, or retire capacity." · rid 42 Q18: "Causal attribution is
inherently uncertain, particularly in complex and interconnected power systems where
marginal effects depend on dispatch order, market conditions, policy constraints, and
counterfactual assumptions."

### 2. `baseline_counterfactual_problem` — Baselines/counterfactuals are contested
**Definition.** Argues that defining the baseline (what would have happened absent
the action) is methodologically contested, dynamic, or manipulable: static baselines
misrepresent evolving grids, multiple baseline levels produce divergent claims, and
the offset literature's baseline failures carry over.
**Include:** dynamic-grid vs static-baseline critiques; baseline-level ambiguity
(node/region/nation); offset/REDD+ baseline track record; "fictional baseline vs
actual base year" consistency arguments.
**Exclude:** generic causal untraceability (→ 1); deliberate baseline-shopping as
gaming (→ 7, may co-code).
**Examples.** rid 37 Q18: "establishing a baseline for a given year … is an inverse
calculation. It requires estimating how the past would have looked absent the
project." · rid 56 Q18: "a key methodological challenge is how a baseline is
established, and which projects are deemed eligible to be analyzed in a project
scenario."

### 3. `comparability_loss` — Divergent methods destroy comparability
**Definition.** Argues that method, model, data or assumption freedom produces
inconsistent, non-reproducible or non-comparable results across reporters, periods or
providers — undermining trust, benchmarking and aggregation.
**Include:** "different entities model different consequences"; provider/model
divergence; results not reproducible; pleas for uniformity grounded in comparability.
**Exclude:** the *ask* for standardization (→ 26, often co-coded); deliberate
exploitation of freedom (→ 7).
**Examples.** rid 3 Q18: "Loss of comparability: Different entities could model
different 'consequences,' leading to inconsistent and unverifiable results." ·
rid 42 Q18: "Results can vary widely depending on modeling choices … reducing
comparability across organizations and over time."

### 4. `complexity_burden` — Complexity, cost and administrative burden
**Definition.** Argues the methods are too complex, costly, or resource-intensive for
routine corporate use: modeling expertise, data pipelines, administrative overhead,
or compliance cost outweigh decision value.
**Include:** cost/effort/burden claims; "overengineered"; distraction from real
decarbonization work; burden-driven non-participation.
**Exclude:** burden falling specifically on small orgs (→ 12) or data-poor regions
(→ 13) — co-code where both are argued; pure data gaps (→ 5).
**Examples.** rid 60 Q18 (template bloc): "applying consequential accounting could
impose additional analytical and administrative burdens without delivering actionable
insights for corporate decarbonization." · rid 55 Q18: "We disagree with developing
and using new methods in ways that increase complexity without meaningful climate
benefit."

### 5. `data_availability` — Required data unavailable or immature
**Definition.** Argues that required inputs — marginal emission rates, dispatch data,
hourly/nodal series, residual context — are unavailable, proprietary, immature or
non-uniform across markets.
**Include:** MER/dispatch data gaps; proprietary or paywalled inputs; data absent
outside organized markets; calls for public data infrastructure as a precondition.
**Exclude:** the equity consequences of the gap (→ 12/13); granularity preferences
(→ 31/32).
**Examples.** rid 58 Q18: "If marginal emission rate (MER) data at highly granular
time intervals and locations is required, it will demand unrealistic costs and
effort." · rid 51 Q18 (template bloc): "Substantially more data and information would
need to be readily available publicly to properly assess the system-wide potential
impacts."

### 6. `verification_difficulty` — Not auditable / assurance is impractical
**Definition.** Argues results cannot be independently verified or assured: no audit
trail, modeled outputs unverifiable, MRV burden unworkable, or evidence standards
undefined for consequential claims.
**Include:** audit-trail absence; assurance-perspective evidence gaps; verifier
workload; "unverifiable claims" framings.
**Exclude:** comparability of results (→ 3); the ask for third-party model
validation (→ 39).
**Examples.** rid 3 Q20: "There is no verifiable audit trail that can confirm the
physical or operational consequence of an individual electricity project on system
emissions." · rid 42 Q18: "From an assurance perspective, this uncertainty makes it
difficult to define what constitutes sufficient, appropriate evidence."

### 7. `gaming_greenwashing_risk` — Method freedom invites gaming and greenwash
**Definition.** Argues that methodological degrees of freedom (method, model,
baseline, assumption or data selection) will be exploited to flatter results, or that
the outputs will fuel misleading public claims — cherry-picking, selective baselines,
marketing-driven claims, credibility erosion.
**Include:** cherry-picking/selective assumptions; baseline shopping; "enables the
creation of claims"; greenwashing and credibility-erosion warnings.
**Exclude:** innocent divergence without exploitation (→ 3); double counting as the
specific failure (→ 8).
**Examples.** rid 27 Q18: "Without standardised baselines and marginal factors,
organisations might choose assumptions that maximise perceived impact." · rid 29 Q18:
"a potential for 'cherry-picking' favorable methodologies if the rules are not
rigorous and standardized."

### 8. `double_counting_risk` — Same impact claimed more than once
**Definition.** Argues the same physical emission change can be claimed by multiple
actors or in multiple ledgers: overlap between consequential results and Scope 2 or
offsets, allocation among value-chain actors, or attribute/impact double claiming.
**Include:** multi-claimant overlap; allocation rules asks framed as double-counting
safeguards; inventory/offset interaction double counts.
**Exclude:** claim-confusion without duplication (→ 9).
**Examples.** rid 62 Q18: "Allocation rules should prevent multiple entities from
claiming the same impact." · rid 37 Q20: "they risk facilitating the creation of
marketing driven claims and enabling double counting."

### 9. `inventory_vs_impact_boundary` — Keep impact out of the Scope 2 inventory
**Definition.** Argues consequential results are a different construct from
attributional inventories and must remain outside them: separate metric, separate
report, clear labels, never netted into Scope 2, and (for some) never made mandatory.
**Include:** separation and labeling asks; claim-confusion warnings; "complement, not
replace"; "must remain voluntary/optional" framings; attributional-first principle
statements.
**Exclude:** the opposing integration camp (→ 24); double counting (→ 8).
**Examples.** rid 53 Q18: "This is critical to ensure accuracy and credibility and
avoid mixing attributional value-chain and consequential accounting methods." ·
rid 42 Q18: "If consequential results are mixed with attributional Scope 2
inventories, users may misinterpret modeled impacts as firm-level emissions
reductions."

### 10. `incentive_erosion_procurement` — Separation erodes the procurement incentive
**Definition.** Argues that relegating impact to a separate, unrecognized metric (or
burdening it with strict criteria) removes the motive that drives voluntary clean
energy procurement: PPA signings, project finance and corporate investment would
slow.
**Include:** "removes the main incentive"; PPA hesitation/abandonment; "companies
will stop investing"; value-proposition loss for reporters.
**Exclude:** chill caused specifically by additionality-test stringency (→ 14);
generic burden (→ 4).
**Examples.** rid 39 Q18: "Removing and reallocating this primary incentive to a
separate consequential accounting approach would obviate the reason all of our
clients have chosen the 'hard right' of causing new clean energy generation." ·
rid 58 Q18: "consumers, fearing claim risks and calculation burdens, may hesitate or
abandon PPA executions."

### 11. `perverse_incentives` — Metric design rewards the wrong behavior
**Definition.** Argues a specific metric construction rewards behavior that worsens
real outcomes: build-margin-dominant weights crediting emissions-raising dispatch,
optimizing the metric instead of decarbonizing, rebound effects.
**Include:** metric-gaming dynamics that are *structural* (the honest optimizer is
misdirected); storage/dispatch misdirection; "optimise for emissions credits rather
than long-term decarbonisation".
**Exclude:** dishonest exploitation (→ 7); incentive *loss* (→ 10).
**Examples.** rid 41 Q18: "build margin-dominant metrics can perversely reward
behavior that increases short-term emissions, while penalizing efforts to reduce
them." · rid 22 Q18: "organisations may optimise for emissions credits rather than
long-term regional decarbonisation."

### 12. `sme_equity` — Smaller organizations cannot participate
**Definition.** Argues the burden falls disproportionately on smaller or
resource-constrained organizations, excluding them from participation — and asks for
size-scaled requirements where offered as the remedy.
**Include:** SME capacity limits; participation inequity by size; size-tiered
verification asks.
**Exclude:** regional/market inequity (→ 13); generic burden (→ 4).
**Examples.** rid 13 Q18: "reduced participation by smaller organizations, and
difficulties in global harmonization." · rid 70 Q18: "guarantee the feasibility of
the calculation by all types of stakeholders (small companies as well as large
companies)."

### 13. `regional_equity` — Data-poor regions and markets disadvantaged
**Definition.** Argues regions or markets with weak data infrastructure, immature
markets, or unique grid structures are structurally disadvantaged by the proposed
methods — advanced-market bias.
**Include:** data-poor market disadvantage; developed-market bias; penalties for
regulatory failures outside reporters' control; emerging-market participation risk.
**Exclude:** proposals to adapt tests/methods regionally (→ 27, co-code where both);
country descriptions without an equity argument (→ 41).
**Examples.** rid 60 Q18 (template bloc): "such an approach may inadvertently favor
companies operating in advanced power markets where data access and transparency are
much higher." · rid 22 Q18: "Regions with poor data availability could be
disadvantaged in claiming impacts."

### 14. `additionality_stringency_chill` — Strict additionality chills investment
**Definition.** Argues that overly strict or narrow additionality requirements deter
investment in clean resources — excluding worthy projects (including existing
resources needing reinvestment) and slowing deployment.
**Include:** stringency deterring projects; narrow eligibility excluding existing
hydro/nuclear reinvestment; "every electron" arguments against tight gates.
**Exclude:** claims additionality is conceptually misapplied (→ 15); test-mechanics
critiques (→ 38).
**Examples.** rid 58 Q18: "If overly stringent additionality tests are mandated, it
may slow down the deployment of new renewable energy." · rid 56 Q18: "stringent rules
can unnecessarily limit the number of recognized GHG reductions and in some cases
exclude projects that are additional and highly desirable."

### 15. `additionality_wrong_construct` — Additionality misapplied to this metric
**Definition.** Argues additionality is conceptually the wrong gate for measuring
avoided grid emissions: required only for offset-like claims, inconsistently applied
(renewables but not fossil), or withholding accountability where measurement should
be unconditional.
**Include:** "no additionality needed for system-impact measurement"; inconsistent
application critiques; additionality-for-offsets-only positions.
**Exclude:** stringency-chill arguments that accept the construct (→ 14);
purpose-tiering that keeps additionality for some claims (→ 25, frequently co-coded).
**Examples.** rid 35 Q18: "(A) measuring system-wide avoided grid emissions (a
consequential analysis that does not require additionality), and (B) supporting
claims of beyond-business-as-usual (beyond-BAU) emissions reductions (i.e., offsets),
which do require additionality tests." · rid 35 Q18: "the framework would withhold
accountability for reporting entities' impacts unless they can prove additionality —
an outcome that is neither desirable nor fit for purpose."

### 16. `net_impact_completeness` — Impact must net induced against avoided
**Definition.** Argues the proposed quantification is incomplete because it counts
only avoided emissions: induced emissions from consumption/charging, project
emissions, or the full net equation must be included.
**Include:** induced-emissions omission; project-emissions subtraction; "half the
picture"; net = avoided − induced formulations; storage charging/discharging netting.
**Exclude:** secondary-effects scope (→ 35/17); formula coarseness without a missing
term (→ 19).
**Examples.** rid 23 Q20: "The proposed formula captures only procurement-driven
avoided emissions. For a consequential method, that is only half the picture." ·
rid 41 Q20: "The formula only accounts for avoided emissions (via marginal emission
rate × procured electricity) and ignores induced emissions."

### 17. `secondary_effects_unquantifiable` — Secondary effects too speculative to require
**Definition.** Argues secondary/market-wide effects (price responses, rebound,
system reactions) are too speculative, complex, or outside a reporter's visibility
and control to be required in quantification.
**Include:** "not the responsibility of organizations"; speculative/unmodelable
market responses; double-count worries specific to secondary-effect layering.
**Exclude:** the inclusion camp (→ 35); generic attribution uncertainty (→ 1).
**Examples.** rids 51/86/89/117 Q23 (template bloc): "It should not be the
responsibility of organizations to consider how the grid might respond to a renewable
pro[ject]." · rids 43/47/60/79/82 Q23 (template bloc): "when calculating the
secondary effect when quantifying the emission effect, there is a concern about the
possibi[lity of double counting]."

### 18. `simplified_methods_misleading` — Average/simplified methods misstate margins
**Definition.** Argues specific simplified methodologies — capacity-factor-based,
difference-based, average emission rates for build margin — misrepresent marginal
reality by conflating average with marginal or failing to isolate the intervention.
**Include:** capacity-factor/difference-based/average-rate critiques; average ≠
marginal arguments; "cannot isolate the intervention" critiques of before/after
differencing.
**Exclude:** praise of dispatch-grounded methods (→ 40, usually co-coded); the
formula's own coarseness (→ 19).
**Examples.** rid 15 Q37: "Capacity factor is average, not marginal." · rid 26 Q37:
"they conflate average emissions with marginal (operating margin) impacts, which is
inconsistent with OM accounting principles."

### 19. `formula_oversimplified` — The formula is too coarse for the system
**Definition.** Argues the §6.1 formula's structure (Σ MWh × MER) is too simple for
the system it claims to measure: single-multiplication reduction, ignores
congestion/losses/interactions, or contradicts the granularity direction of Scope 2
reform.
**Include:** "single multiplication" critiques; system-complexity mismatch;
granularity-inconsistency-with-MBM arguments; national-interconnection complexity.
**Exclude:** missing terms (→ 16); baseline definition (→ 2).
**Examples.** rid 3 Q20: "this consequential formula simplifies the system to a
single multiplication of volume and a representative marginal rate." · rids 151/183
Q20 (template bloc): "The proposed formula is overly simplified and does not capture
the complexity of the Brazilian national interconnected system."

## Support themes

### 20. `real_world_impact_signal` — Measures real-world system impact
**Definition.** Argues consequential accounting's core value: it measures actual
system-level emission consequences of actions, producing decision-useful signals for
procurement, investment and strategy that attributional allocation cannot.
**Include:** "real-world impact" framings; decision-usefulness; "answers what changed
because of my action"; welcoming impact measurement as the right goal.
**Exclude:** the specific where-to-invest steering claim (→ 21); specific
attributional-blindspot corrections (→ 22).
**Examples.** rid 29 Q18: "It answers the question, 'What was the change in grid
emissions as a consequence of my action?'" · rid 48 Q18: "it directly addresses the
question that ultimately matters: whether corporate actions reduce global emissions
in the real world."

### 21. `investment_steering_dirty_grids` — Steers investment where impact is highest
**Definition.** Argues consequential metrics direct capital, procurement and demand
signals toward the highest-impact locations and times — carbon-intensive grids,
under-electrified regions, high-marginal-displacement hours.
**Include:** dirty-grid steering; energy-access/leapfrogging framings; time/place
optimization of procurement; demand-signal formation for high-impact EACs.
**Exclude:** generic impact measurement (→ 20).
**Examples.** rid 18 Q20: "This would incentivize companies to procure more EACs in
the places and times where the grid is the most carbon-intensive." · rid 67 Q18:
"this metric incentivizes corporations to invest in clean energy located in
carbon-intensive grids where displacement value is highest."

### 22. `corrects_attributional_blindspots` — Fixes what attributional accounting misses
**Definition.** Argues attributional methods (LBM/MBM, grid averages) misstate
reality in identified ways that consequential methods correct: storage and
flexibility penalized, renewable purchases overstated on clean grids, average factors
masking marginal behavior.
**Include:** storage/DR/flexibility recognition; "averages mask marginal behaviour";
overstated renewable claims under attributional; merchant-asset invisibility.
**Exclude:** general impact-signal value (→ 20); formula endorsements (→ 23).
**Examples.** rid 41 Q18: "[storage] is consistently misrepresented under
attributional methods … It penalizes grid-beneficial behavior." · rid 27 Q18: "With
~80-85% renewable electricity, attributional methods can overstate the impact of
buying renewable electricity."

### 23. `formula_structurally_sound` — The formula is a sound starting structure
**Definition.** Argues the §6.1 formula is structurally appropriate: separates
primary/secondary effects, avoids hard-coding methodological choices, aligns with
established project-accounting logic, and provides a workable foundation.
**Include:** "appropriate structure/starting point"; modularity and flexibility
praise; MRV-friendly separation of terms.
**Exclude:** support conditioned on adding missing terms (→ 16 for the missing term,
co-code where the answer does both); general consequential-accounting support (→ 20).
**Examples.** rid 29 Q20: "a standard and appropriate structure for this type of
analysis. It correctly identifies the core components of a consequential
calculation." · rid 42 Q20: "the proposed formula is appropriate as an initial
framework … flexible enough to be applied across different market structures."

## Design themes

### 24. `integrate_with_scope2_recognition` — Integrate impact with Scope 2 recognition
**Definition.** Argues consequential impact should be integrated with, recognized
alongside, or counted toward Scope 2 accounting: a third ledger/EIM inside Scope 2,
impact as an MBM quality criterion, "purchaser-caused" tags, or equal-standing
recognition frameworks.
**Include:** integration/recognition asks; third-metric-within-Scope-2 designs;
impact counted toward mitigation; "equal viability and importance".
**Exclude:** the separation camp (→ 9); generic support (→ 20).
**Examples.** rid 24 Q18: "GHGP should integrate consequential impact into
attributional accounting as a core quality criterion whenever feasible." · rid 18
Q20: "Introducing a new impact metric as a third ledger within Scope 2 — such as an
Emissions Impact-based Method (EIM) — would provide a critical accounting pathway."

### 25. `tiered_rigor_by_claim` — Calibrate rigor to claim type and purpose
**Definition.** Argues requirements (additionality, evidence, precision) should scale
with the claim being made and the use case served — internal decisions vs public
claims vs offset-like claims; association vs causal claims — and that the draft must
define which purposes it serves.
**Include:** purpose-differentiated requirement ladders; claim-type distinctions;
complaints that the draft fails to distinguish its purposes/outputs.
**Exclude:** rejecting additionality outright for measurement (→ 15, co-code when
both argued); org-size tiers (→ 12).
**Examples.** rid 25 Q27: "We need to be careful about what kind of additionality is
really needed and how high the burden of proof is for a given use case." · rids
150/170 Q34 (template bloc): "It depends on the purpose. For a causal claim, yes, a
rigorous additionality test should be required. For an a[ssociation claim …]."

### 26. `standardization_guidance` — Standardize methods, defaults, disclosure
**Definition.** Asks the GHG Protocol to constrain the method space for reporters:
standardized methodologies, default values and factors, data-source hierarchies,
minimum data quality, mandatory disclosure of assumptions and uncertainty,
conservative/lower-bound defaults.
**Include:** defaults for data-limited regions; disclosure/transparency requirements;
data hierarchies; conservativeness principles; single-uniform-method demands.
**Exclude:** governance of *models/providers* (→ 39); alignment with named external
tools (→ 30).
**Examples.** rid 62 Q18: "the framework should prioritize simple, transparent
defaults where data are limited … Acceptable data sources should follow a
hierarchy." · rid 22 Q20: "the formula should be paired with explicit guidance on:
Minimum acceptable data quality and temporal resolution."

### 27. `regional_test_variants` — Adapt tests/methods to regional context
**Definition.** Argues additionality tests or quantification methods should be
adapted to regional/market context: different tests binding in different markets,
region-specific thresholds, market-structure-dependent applicability.
**Include:** regional adaptation asks; market-maturity-dependent test selection;
region-specific capacity thresholds.
**Exclude:** the uniformity camp (→ 3/26); regional *fairness* complaints (→ 13).
**Examples.** rids 151/183 Q32 (template bloc): "Brazil (SIN): policy-based tests are
less relevant; contract (PPA) and common practice tests are more approp[riate]." ·
rid 22 Q27: "[common practice is] Highly relevant in markets where renewables are
mature: US (ERCOT, CAISO): solar is ubiquitous and financially attractive."

### 28. `default_5050_weight` — Endorse the fixed 0.50/0.50 OM/BM default
**Definition.** Endorses a fixed 0.50 build-margin / 0.50 operating-margin default
weighting — simplicity, global applicability, participation-enabling.
**Include:** explicit 50/50 endorsements, including as fallback default.
**Exclude:** rejecting 50/50 as arbitrary (→ 29 or 26 depending on the argument).
**Examples.** rid 15 Q48: "Default 50/50 split is perfect for AREC market. It's
simple, globally applicable, defensible, and enables participation." · rid 13 Q48:
"A fixed ratio (e.g., 50% OM + 50% BM) is simple and practical for preliminary
estimates or data-limited contexts."

### 29. `dynamic_lifecycle_weighting` — Weight OM/BM by lifecycle/system condition
**Definition.** Argues OM/BM weights should vary with project lifecycle stage, system
investment condition, resource adequacy, or dispatchability — not fixed defaults:
OM-dominant early years shifting to BM, capacity-constrained systems weighting BM
higher, dispatchability-based frameworks.
**Include:** intervention-lifecycle weighting; resource-adequacy-conditioned weights;
dispatchability-based weighting; explicit rejections of fixed defaults in favor of
condition-dependent weights.
**Exclude:** fixed 50/50 endorsements (→ 28); named-tool adoption without the
dynamic argument (→ 30).
**Examples.** rid 26 Q48: "Operating margin effects typically dominate in early
years, while build margin effects materialize later as investment responses occur." ·
rid 41 Q48: "We recommend GHG Protocol develop a new framework where BM/OM weights
are based on dispatchability."

### 30. `align_with_existing_tools` — Build on established tools and standards
**Definition.** Argues for adopting or aligning with named, established frameworks:
UNFCCC CDM Tool07, GHGP Grid-Connected Project Guidelines, the Corporate/Project
Standards, disclosure regimes, or existing registry/market infrastructure.
**Include:** named-tool adoption rationales (track record, recognition,
comparability); consistency-with-Corporate-Standard asks; existing-mechanism reuse.
**Exclude:** generic standardization without a named external anchor (→ 26).
**Examples.** rid 26 Q48: "CDM Tool 07 is appropriate due to its longstanding use,
conservativeness, and methodological clarity." · rid 69 Q18 (template bloc): "The
GHGP Project Standard must be aligned with the Corporate Standard to make
consequential accounting useful for companies."

### 31. `hourly_locational_granularity` — Require fine temporal/spatial granularity
**Definition.** Argues marginal rates and impact quantification need fine temporal
(hourly/sub-hourly) and/or spatial (nodal/zonal/locational) resolution to be
accurate, because marginal behavior varies continuously.
**Include:** hourly-or-finer advocacy; nodal/locational advocacy; "as granular as
possible" positions (even with pragmatic fallbacks); annual-average distortion
arguments.
**Exclude:** coarse-preference arguments (→ 32); pure data-gap observations (→ 5).
**Examples.** rid 22 Q20: "the formula is appropriate so long as marginal emission
rates are applied at the correct temporal resolution (hourly or finer) rather than
fixed annual averages." · rid 29 Q37: "they most accurately reflect the complex
reality of which power plants are displaced by new renewable generation on an hourly
or sub-hourly basis."

### 32. `coarse_granularity_feasibility` — Prefer coarse granularity for feasibility
**Definition.** Argues coarse resolution (annual, monthly, country/grid-region) is
appropriate or preferable: feasibility, data reality, small-country practicality,
diminishing returns of precision, or accessibility for ordinary reporters.
**Include:** annual/country-level advocacy; "good enough" precision arguments;
coarse-by-default with fine-as-option designs.
**Exclude:** fine-granularity positions with reluctant fallbacks (→ 31); pure
data-availability complaints (→ 5).
**Examples.** rid 25 Q37: "analysts will simply want to use the annual average grid
emission factors that are easily publicly accessible … to estimate a reasonable
empirical baseline." · rids 51/86/89/117 Q44 (template bloc): "Countries can widely
vary in size – those that are smaller can comfortably utilize a country-level
granularity."

### 33. `annual_truing_up` — Report annually, true up with actuals
**Definition.** Argues impacts should be assessed and reported per reporting year
using actual data — annual accounting cycles, ex-post correction of estimates,
avoiding decades-long forecast lock-in.
**Include:** each-year reporting rationales; true-up/actuals-update mechanisms;
forecast-risk arguments against lifetime lock-in.
**Exclude:** lifetime framing (→ 34); hourly resolution within the year (→ 31).
**Examples.** rids 108/109 Q25 (template bloc): "Electricity-related project emission
impacts should be calculated and reported on an annual basis." · rids 150/170/187 Q46
(template bloc): "MERs should be as granular as possible given available data" paired
with their Q25 position that "the purpose … is to measure routine impacts" year by
year.

### 34. `lifetime_impact_view` — Value lifetime/cumulative impact framing
**Definition.** Argues the lifetime/cumulative frame matters: investment decisions
lock in multi-decade impacts, lifetime totals drive capital allocation, and one-year
snapshots understate what a project changes.
**Include:** lifetime-reporting support; cumulative-impact arguments;
forward-looking lifetime estimates for investment decisions.
**Exclude:** annual-cycle advocacy (→ 33); build-margin weighting mechanics (→ 29).
**Examples.** rid 25 Q18: "purchase and investment decisions lock in
path-dependencies for many years and even decades … a forward-looking assessment of
the enabled average lifetime impact." · rids 151/183 Q25 (template bloc): "The
climate impact of a renewable project is a cumulative result over its lifetime."

### 35. `secondary_effects_material` — Secondary effects are material — include them
**Definition.** Argues secondary effects are real and material and should be
considered: market/price responses, cross-border effects, lifecycle/upstream
emissions, curtailment interactions, health and co-benefit impacts.
**Include:** named secondary-effect inclusion asks; materiality-threshold designs
for including them; lifecycle/upstream inclusion; co-benefit quantification.
**Exclude:** the exclusion camp (→ 17); induced-vs-avoided netting of the primary
effect (→ 16).
**Examples.** rid 13 Q22: "Market interaction effects, including price fluctuations,
cross-border trading, or capacity market impacts." · rid 25 Q22: "Upstream GHG
emissions (in gCO2e/kWh) are usually not negligible, and especially high (+15-20%)
for fossil fuel-based electricity."

### 36. `additionality_gatekeeping` — Require additionality tests as gatekeepers
**Definition.** Argues additionality tests (individually or as a battery) must be
required to protect the integrity of impact claims — including per-test rationales
for required status (regulatory ensures beyond-mandate, timing ensures causation,
etc.).
**Include:** required-status advocacy with integrity rationales; "optional tests
defeat the purpose"; per-test required justifications.
**Exclude:** optional-status advocacy (→ 37); test-mechanics refinements (→ 38).
**Examples.** rid 3 Q27: "Every additionality test listed should be required in order
to ensure integrity, credibility, and accountability in claims of avoided or reduced
emissions." · rid 26 Q27: "Crediting legally required actions would violate
environmental integrity by rewarding business-as-usual outcomes."

### 37. `additionality_optionality` — Keep additionality tests optional/flexible
**Definition.** Argues tests should be optional, context-dependent, or serve as a
flexible evidence menu rather than mandatory gates — reporters choose the tests that
fit their situation and claim.
**Include:** optional-status advocacy; evidence-menu framings; flexibility rationales
for specific tests kept optional.
**Exclude:** rejecting additionality's premise (→ 15); purpose-tiering ladders
(→ 25, co-code when both).
**Examples.** rid 25 Q27: "So, all tests should be optional, depending on the need
for evidence and the strength of any 'additionality claims' being made." · rid 23
Q27: "the rest of the optional tests can remain optional as a means of providing
additional evidence."

### 38. `additionality_test_design` — Refine individual test mechanics
**Definition.** Argues the mechanics of individual tests: subjectivity/feasibility
critiques (financial data sensitivity, barrier-test subjectivity) and concrete
refinements (tenor minimums, FID/FNTP timing definitions, regulatory
broad-vs-project-mandate distinctions, positive-list upkeep, size-scaled evidence).
**Include:** per-test feasibility/subjectivity arguments; threshold and definition
proposals; verification-mechanics designs for tests.
**Exclude:** required-vs-optional status arguments (→ 36/37); regional adaptation
(→ 27).
**Examples.** rid 24 Q27: "'under construction' should be defined as the actual
physical construction of the project, after FNTP is achieved, not 'under
construction' by current U.S. tax incentive rules." · rid 15 Q27: "Barrier test
(company-by-company assessment of whether barriers prevent development — too
subjective, different companies assess same barriers differently)."

### 39. `model_validation_governance` — Govern, validate and tier the models
**Definition.** Asks the GHG Protocol to govern the model space: applicability
criteria matching models to project characteristics (size, technology,
dispatchability, market), rigor tiers, decision trees, third-party validation,
replication requirements, accreditation, benchmarking and periodic review.
**Include:** model-applicability frameworks; validation/accreditation asks;
open-methods/replicability requirements; model registries and comparisons.
**Exclude:** reporter-facing defaults and disclosure (→ 26); preferring a method
family on the merits (→ 40).
**Examples.** rid 26 Q41: "GHG Protocol could classify quantification methods into
tiers of analytical rigor, and specify which project characteristics justify or
require each tier." · rid 3 Q41: "Applicability should be conditional on the ability
of independent reviewers to replicate or verify the results using publicly available
information."

### 40. `dispatch_based_methods_preferred` — Prefer dispatch-grounded marginal methods
**Definition.** Argues methods grounded in actual system operation — SCED-based,
statistical inference on observed dispatch, heat-rate/LMP where dispatch data absent
— are the credible way to estimate marginal impacts.
**Include:** SCED/statistical endorsements on marginal-fidelity grounds;
dispatch-realism rationales; recent-capacity-additions BM endorsements on
observability grounds.
**Exclude:** critiques of simplified methods (→ 18, usually co-coded); granularity
preferences (→ 31).
**Examples.** rid 29 Q37: "Methodologies based on security-constrained economic
dispatch (SCED) models or sophisticated statistical analysis are the most appropriate
because they most accurately reflect the complex reality of which power plants are
displaced." · rid 42 Q37: "Operating margin impacts are, by definition, short-run and
dispatch-driven. Methods grounded in actual system operation are therefore the most
credible."

### 41. `workstream_coordination` — Coordinate the Scope 2 and AMI workstreams
**Definition.** Argues the consequential/AMI workstream and the Scope 2 revision must
be developed, consulted and released in coordination: parallel review, aligned
timelines and effective dates, no lock-in of Scope 2 decisions before the
consequential framework is assessable, fully-informed consultation.
**Include:** parallel-review and unified-release asks; timeline-alignment demands;
complaints that the consultation is under-informed (missing AMI white paper,
subgroup proposal not released); no-lock-in warnings.
**Exclude:** substantive integration of the metrics themselves (→ 24); separation of
ledgers (→ 9).
**Examples.** rid 185 Q18: "The GHGP electricity standard setting processes should be
parallel and release a unified, coherent standard on a single date with public input
on the interplay of the standards." · rid 172 Q18: "The fact that stakeholders will
not have an opportunity to consider the white paper as part of the Electricity-Sector
Consequential Methods consultation period will limit stakeholders' ability to provide
fully informed comments."

## Neutral themes

### 42. `jurisdiction_specific_context` — Jurisdiction-specific system context
**Definition.** Supplies substantive jurisdiction-specific system context that frames
the respondent's position: Brazil's hydro-dominated SIN, New Zealand dry-year risk,
Japanese data infrastructure, Korean market structure, EU regulation.
**Include:** named-jurisdiction grid/market/policy specifics doing argumentative
work.
**Exclude:** passing country mentions; regional fairness arguments (→ 13); regional
test adaptation asks (→ 27).
**Examples.** rid 27 Q18: "In New Zealand, hydro variability and seasonal dry-year
risks complicate marginal emissions estimation." · rids 151/183 Q46 (template bloc):
"Hourly granularity is technically possible, but in Brazil it should be used with
caution due to the predominan[ce of hydropower]."

### 43. `evidence_pointer` — Supplies references, data or documentation
**Definition.** The answer's function is to supply evidence: citations, named
datasets/tools, submitted documents, or references supporting an approach.
**Include:** bibliographies; named methodology papers/tools; submitted appeals and
reports; data-source pointers offered as evidence.
**Exclude:** passing mentions of a tool being used (→ 30 where argued as
alignment).
**Examples.** rid 22 Q52: "RE24 recommends referencing: NREL Cambium methodology
papers, IEA modelling methodology notes, PJM & MISO SCED documentation." · rid 49
Q18: "[1] Rudkevich, A. M. & Ruiz, P. A. (2012). Locational Carbon Footprint of the
Power Industry."

---

## `uncodeable`

Reserved value (not a taxonomy key): the answer has no thematic content — empty
gestures ("N/A", "-", "None", "no comment"), pure cross-references ("see above",
"see our attached letter" with no argument), or text too fragmentary to carry a
position. Target: ≥85% of substantive answers coded non-`uncodeable`
(`test_themes_quotes.py` enforces).
