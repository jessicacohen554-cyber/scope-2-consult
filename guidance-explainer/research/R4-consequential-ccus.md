# R4 Dossier: Consequential ("impact", Statement 3) accounting for CCUS on stationary power: CCS vs CCU, coal vs gas, retrofit vs new build

- Date compiled: 2026-10-19
- Author: research shard R4
- Scope: what the GHG Protocol says (in-force and revision materials) about (a) the multi-statement framework and where consequential/impact accounting sits, (b) the building blocks for consequential accounting (baseline, primary/secondary effects, additionality, OM/BM, weighting), and (c) how those blocks apply to carbon capture on power plants. Third-party numbers are added only where a source states them.
- Bottom line up front:
  1. "Statement 3" is real. In the AMI Phase 1 White Paper (RFI version, March 2026) it is called the **"GHG impact statement"**. It is based on consequential accounting. The listed alternative names are "GHG impacts/outcomes of actions", "GHG outcome statement" and "Mitigation intervention statement". All names are draft.
  2. **No GHG Protocol document I found addresses carbon capture on power plants inside consequential/impact accounting.** That includes the AMI materials, the electricity consequential consultation, the Project Protocol, the Grid-Connected Guidelines, the Policy and Action Standard and LSR Ch. 16. The closest building blocks are:
     - LSR Ch. 14 (inventory treatment of captured fossil CO2);
     - the Grid Guidelines' worked "retrofit an existing coal plant" row (Table 2.1);
     - the Project Protocol's retrofit boxes (Box 8.2, Box 8.7).

     Everything in this dossier about how to do consequential CCS accounting is labeled INFERENCE.
  3. The electricity consultation's own formula and its nine additionality tests were written for procurement of (mostly renewable) electricity. CCS, capture, retrofits and existing fossil plants are not mentioned anywhere in the consultation document (verified by full-text search).

---

## Sources

Local download root (untrusted data, not committed): `/tmp/claude-0/-home-user-scope-2-consult/b28ef211-cbcf-518f-a8b6-e173dc77c534/scratchpad/downloads/R4/` (abbreviated `DL/` below).

| id | title | publisher | date / version | URL | local path | tier |
|---|---|---|---|---|---|---|
| S1 | Actions and Market Instruments Phase 1 Progress Update White Paper, Version 3, Request for Information | GHG Protocol | March 2026 | https://ghgprotocol.org/sites/default/files/2026-03/AMI-Phase1-WhitePaper-RFI.pdf | DL/AMI-Phase1-WhitePaper-RFI.pdf | [GHGP-revision] |
| S2 | Explanatory Memo, Request for Information, AMI Phase 1 Progress Update White Paper | GHG Protocol | March 2026 | https://ghgprotocol.org/sites/default/files/2026-03/AMI-Phase1-WhitePaper-RFI-ExplanatoryMemo.pdf | DL/AMI-Phase1-WhitePaper-RFI-ExplanatoryMemo.pdf | [GHGP-revision] |
| S3 | Blog: "GHG Protocol Launches Action and Market Instruments Request for Information: What It Is and Why It Matters" | GHG Protocol | 03.31.2026 | https://ghgprotocol.org/blog/ghg-protocol-launches-action-and-market-instruments-request-information-what-it-and-why-it | DL/blog.html | [GHGP-revision] |
| S4 | AMI Phase 1 Progress Update White Paper: RFI, Summary of Responses | GHG Protocol | "September 2026" (PDF metadata creation date 2026-09-02; brief said Sep 23, which I did not verify) | https://ghgprotocol.org/sites/default/files/2026-09/AMI-Request-for-Information-Summary-of-Responses.pdf | DL/AMI-RFI-Summary.pdf | [GHGP-revision] |
| S5 | AMI TWG Meeting Minutes, "Full TWG, Meeting #2.08" (file name says Meeting20) | GHG Protocol | 2026-09-09 | https://ghgprotocol.org/sites/default/files/2026-09/AMI-Meeting20-Minutes-2026.09.09.pdf | DL/AMI-M20-minutes.pdf | [GHGP-revision] |
| S6 | AMI TWG Meeting 2.08 presentation | GHG Protocol | 2026-09-09 | https://ghgprotocol.org/sites/default/files/2026-09/AMI-Meeting20-Presentation-2026.09.09.pdf | DL/ami/AMI-Meeting20-Presentation-2026.09.09.pdf | [GHGP-revision] |
| S7a/b/c | AMI TWG in-person workshop presentations, Day 1/2/3 | GHG Protocol | 2026-06-30 / 07-01 / 07-02 (posted 2026-09) | https://ghgprotocol.org/sites/default/files/2026-09/AMI-InPersonMeeting-Presentation-2026.06.30.pdf (also …2026.07.01.pdf, …2026.07.02.pdf) | DL/ami/AMI-InPersonMeeting-Presentation-2026.0{6.30,7.01,7.02}.pdf | [GHGP-revision] |
| S8 | AMI TWG in-person meeting, agenda and participants | GHG Protocol | 2026-06-30 to 07-02 | https://ghgprotocol.org/sites/default/files/2026-09/AMI-InPersonMeeting-Summary-2026.06.30.pdf | DL/ami/AMI-InPersonMeeting-Summary-2026.06.30.pdf | [GHGP-revision] |
| S9a/b | AMI TWG Meeting 8 presentation / minutes (Scope 2 consequential subgroup update; July 2025 ISB feedback) | GHG Protocol | 2025-09-16 | https://ghgprotocol.org/sites/default/files/2025-09/AMI-Meeting8-Presentation-20250916.pdf ; …/AMI-Meeting8-Minutes-20250916.pdf | DL/ami/AMI-Meeting8-*.pdf | [GHGP-revision] |
| S10 | AMI TWG minutes, Meeting 2.07 | GHG Protocol | 2026-07-15 | https://ghgprotocol.org/sites/default/files/2026-07/AMI-Meeting7-Minutes-20260715.pdf | DL/ami/AMI-Meeting7-Minutes-20260715.pdf | [GHGP-revision] |
| S11a/b | AMI TWG minutes Meeting 6 / Meeting 14 | GHG Protocol | 2025-04-23 / 2026-03-25 | https://ghgprotocol.org/sites/default/files/2025-05/AMI-Meeting6-Minutes-20250423.pdf ; https://ghgprotocol.org/sites/default/files/2026-04/AMI-Meeting14-Minutes-20260325.pdf | DL/ami/ | [GHGP-revision] |
| S11c | AMI TWG minutes Meeting 4 | GHG Protocol | 2025-02-19 | https://ghgprotocol.org/sites/default/files/2025-02/AMI-Meeting4-Minutes-20250219.pdf | DL/ami/AMI-Meeting4-Minutes-20250219.pdf | [GHGP-revision] |
| S12 | Corporate Standard – Consolidated Standard Development Plan | GHG Protocol | 2026-07-29 | https://ghgprotocol.org/sites/default/files/2026-07/Consolidated-StandardDevelopmentPlan%28SDP%29-2026.07.29.pdf | DL/ami/Consolidated-StandardDevelopmentPlan(SDP)-2026.07.29.pdf | [GHGP-revision] |
| S13 | ISB response letter plus "Scientific Accuracy Complaint … The Need for Additionality" (Sinha, Das, WattTime et al.) | GHG Protocol (repository) | 2026-08-24 | https://ghgprotocol.org/sites/default/files/2026-09/SinhaDasWattTime-Complaint-Additionality-2026.08.24.pdf | DL/ami/SinhaDasWattTime-Complaint-Additionality-2026.08.24.pdf | [GHGP-revision] (complaint text is third-party) |
| S14 | Public Consultation – Consequential Electricity-Sector Emissions Impacts | GHG Protocol | Oct 2025; change log dated 12/2/2025 | https://ghgprotocol.org/sites/default/files/2025-10/GHG-Protocol-Consequential-Electricity-Sector-Emissions-Impacts-Public-Consultation.pdf | /home/user/scope-2-consult/electricity-consequential/reference/GHG-Protocol-Consequential-Electricity-Sector-Emissions-Impacts-Public-Consultation.pdf | [GHGP-revision] |
| S15 | Consequential Electricity Sector Emissions Impacts – Summary of Public Consultation Feedback | GHG Protocol | July 2026 (file dated 2026-07-29) | https://ghgprotocol.org/sites/default/files/2026-07/Consequential-ElectricitySectorEmissionsImpacts-SummaryofFeedback-2026.07.29.pdf | DL/Cons-SummaryFeedback.pdf | [GHGP-revision] |
| S16 | Processed raw feedback dataset (185 respondents) for S14 | repo build of GHGP raw data 2026-07-29 | 2026-07-29 source | (raw xlsx in repo) | /home/user/scope-2-consult/electricity-consequential/data/{questions,question_options,responses_long,respondents}.csv | [GHGP-revision] (respondent text is third-party opinion) |
| S17 | The GHG Protocol for Project Accounting | WRI/WBCSD | 2005 | https://ghgprotocol.org/sites/default/files/standards/ghg_project_accounting.pdf | DL/ghg_project_accounting.pdf | [GHGP-inforce] |
| S18 | Guidelines for Quantifying GHG Reductions from Grid-Connected Electricity Projects | WRI/WBCSD | 2007 (PDF created 2007-07-31) | The URL in the brief (…/standards/Guidelines%20for%20Grid-Connected%20Electricity%20Projects.pdf) returned "Page not found". Working URL: https://ghgprotocol.org/sites/default/files/2024-11/Guidelines%20for%20Grid-Connected%20Electricity%20Projects.pdf | DL/Grid-Guidelines.pdf | [GHGP-inforce] |
| S19 | Policy and Action Standard | WRI/WBCSD | 2014 | https://ghgprotocol.org/sites/default/files/standards/Policy%20and%20Action%20Standard.pdf | DL/PolicyAction.pdf | [GHGP-inforce] |
| S20 | Land Sector and Removals Standard and Guidance v1.0, Chapter 16 "Evaluating the impact of actions" | GHG Protocol | v1.0 (posted 2026-06) | https://ghgprotocol.org/sites/default/files/2026-06/Land-Sector-and-Removals-Guidance-v1.0-Chapter16_0.pdf | DL/LSR-Ch16.pdf | [GHGP-inforce] |
| S21 | LSR Standard and Guidance v1.0, Chapter 14 "CO2 removals and CO2 capture with geologic storage" | GHG Protocol | v1.0 (posted 2026-06) | https://ghgprotocol.org/sites/default/files/2026-06/Land-Sector-and-Removals-Guidance-v1.0-Chapter14.pdf | DL/LSR-Ch14.pdf | [GHGP-inforce] |
| S22 | GHG Protocol Scope 2 Guidance | WRI/WBCSD | 2015 | https://ghgprotocol.org/sites/default/files/2023-03/Scope%202%20Guidance.pdf | DL/Scope2Guidance.pdf | [GHGP-inforce] |
| S23 | Scope 2 Public Consultation – Proposed revisions | GHG Protocol | Oct 2025 | https://ghgprotocol.org/sites/default/files/2025-10/GHG-Protocol-Scope2-Public-Consultation.pdf | DL/S2-Consultation.pdf | [GHGP-revision] |
| S24 | Processed Scope 2 consultation feedback dataset | repo build of GHGP raw data 2026-07-29 | 2026-07-29 | (S2 raw xlsx in repo) | /home/user/scope-2-consult/data/{responses_long,respondents,questions}.csv | [GHGP-revision] (respondent text is third-party opinion) |
| S25 | Policy and Action Standard – Energy Supply Sector Guidance, Draft | WRI | May 2015 (draft) | https://ghgprotocol.org/sites/default/files/2022-12/Energy%20Supply%20-%20Additional%20Guidance.pdf | DL/PA-EnergySupply.pdf | [GHGP-inforce] (draft guidance) |
| T1 | Cost and Performance Baseline for Fossil Energy Plants Volume 1: Bituminous Coal and Natural Gas to Electricity, Rev 4a | US DOE NETL | Oct 2022 | https://netl.doe.gov/projects/files/CostAndPerformanceBaselineForFossilEnergyPlantsVolume1BituminousCoalAndNaturalGasToElectricity_101422.pdf | DL/tp/netl_rev4a.pdf | [third-party] |
| T2 | IPCC AR5 WGIII Annex III, Technology-specific Cost and Performance Parameters (Table A.III.2) | IPCC | 2014 | https://www.ipcc.ch/site/assets/uploads/2018/02/ipcc_wg3_ar5_annex-iii.pdf | DL/tp/ar5_annexIII.pdf | [third-party] |
| T3 | IEAGHG Insight Paper 2020-IP15, "IEA Press Webinar: Special Report on CCUS: CCUS in Clean Energy Transitions" (secondary summary of the IEA report) | IEAGHG | 2020 | https://publications.ieaghg.org/insightpapers/2020-IP15%20Release%20of%20ETP%20SR%20on%20CCUS.pdf | DL/tp/ieaghg_ip15.pdf | [third-party] |
| T4 | Grubert & Sawyer, "US power sector carbon capture and storage under the Inflation Reduction Act could be costly with limited or negative abatement potential", Environ. Res.: Infrastruct. Sustain. 3(1), DOI 10.1088/2634-4505/acbed9 | IOP | 2023-03 | https://doi.org/10.1088/2634-4505/acbed9 (abstract retrieved via Crossref API; full text blocked by Cloudflare) | none (abstract only) | [third-party] |
| T5 | Grubert & Sawyer, Reply to commentary, DOI 10.1088/2634-4505/ad0ff1 | IOP | 2023-12 | https://doi.org/10.1088/2634-4505/ad0ff1 (abstract via Crossref) | none | [third-party] |

Not retrieved (stated so nothing is invented): IEA web report pages (HTTP 403 to curl and WebFetch); IEAGHG report 2011-02 "Retrofitting CO2 capture to existing power plants" (HTTP 403); full text of T4 (Cloudflare). I found no Carbon Capture Coalition response in S16. Clean Air Task Force did respond to S14 (S16 respondent 177), but none of its answers mention CCS.

Page-number conventions (all verified with pdftotext per page):
- S1, S2, S4, S5, S14 and S15: the PDF page equals the printed page.
- S17, S18, S19 and S22: PDF page = printed page + 2.
- S20: PDF page n = printed page 395+n. S21: PDF page n = printed page 342+n.
- T1: PDF page = printed page + 27 in the front matter.
- T2: Table A.III.2 is on PDF p.7, printed p.1335.
- Citations below give both numbers as "p.X (PDF p.Y)" wherever they differ.

---

## Key definitions (verbatim, cited)

**Statement 3 / GHG impact statement** [GHGP-revision] (S1, p.6):
> "The GHG impact statement provides a dedicated, structured statement for reporting on the impacts of actions taken by the reporting company inside and outside its value chain (e.g., emissions avoided, reduced, or removed). It applies to actions such as projects, interventions, investments, production/sale of products, and purchase/consumption of products. This statement uses consequential accounting methods that aim to quantify the global change in GHGs in the atmosphere resulting from a given action. This involves estimating the GHG impacts of an action relative to a credible baseline scenario in which the action did not occur."

> "…with Statement 1 (physical GHG inventory) and Statement 2 (market-based GHG inventory) based on attributional accounting, Statement 3 (GHG impact statement) based on consequential accounting, and Statement 4 (non-GHG indicators) based on key performance indicators (KPIs)." (S1, p.5)

Alternative names (S1, Figure 6, p.36, read from the rendered figure): "GHG impacts/outcomes of actions", "GHG outcome statement", "Mitigation intervention statement". Figure note 3: "Names of statements reflect the current majority view of the AMI TWG. They are draft versions and subject to change."

Elsewhere: the ISO 14067 WD2 extract labels the Statement 3 approach "Mitigation approach", with allocation hierarchy "Consequential" and electricity factor "Marginal emission factors" (S1, Annex D Table H.1, p.51). The Gillenwater & Broekhoff 2026 extract in S7b calls it "Mitigation Intervention statement" (S7b, PDF p.70).

**Attributional accounting** (S1, pp.17–18):
> "Attributional accounting (also known as inventory accounting): A type of GHG accounting that quantifies total GHG emissions (and removals and other accounting categories, if applicable) within a defined inventory boundary and time period."

**Consequential accounting** (S1, p.18):
> "Consequential accounting: A type of GHG accounting that estimates the impacts or changes in GHG emissions (and removals) resulting from specific projects, actions, or interventions relative to a baseline scenario in which the project, action, or intervention did not occur. It quantifies the systemwide or global change in GHGs in the atmosphere caused by an action, project, or intervention."
>
> "Project accounting is a type of consequential accounting that estimates the effects of projects on GHG emissions and removals relative to a baseline scenario." (pp.18–19)
>
> "Policy/action accounting is a type of consequential accounting that quantifies the total changes in emissions and removals caused by policies and actions larger than projects…" (p.19)
>
> "Intervention accounting is used as a broader term to refer to consequential accounting at any scale, including projects and actions larger than projects (inclusive of both project accounting and policy/action accounting)." (p.19)

The same distinction in the electricity consultation (S14, p.5):
> "Attributional, or inventory, accounting tracks GHG emissions and removals within a defined organizational and operational boundary over time." … "Consequential accounting estimates the impacts or changes in GHG emissions resulting from specific projects, actions, or interventions relative to a counterfactual baseline scenario." … "The project-based accounting approach evaluates system-wide emissions impacts of the project or intervention in question, without regard to the reporting company's operational or organizational inventory boundary."

**Statement 3 impact sub-categories** (S1, p.22):
> "Within organizational boundary impacts: Quantified GHG impacts of actions implemented by the reporting company within its organizational boundary (which are not reported in other statements)."
>
> "Value chain associated impacts … within its value chain, outside of its organizational boundary (which are not reported in other statements)."
>
> "Sector associated impacts … within its key sector(s), outside of its value chain…"
>
> "Beyond value chain and sector (global) impacts … outside of its sector…"
>
> "GHG impacts of sold products: Quantified change in system-wide GHG emissions resulting from the use of products sold by the reporting company relative to emissions in a counterfactual baseline scenario…"

**Additionality** (S1, p.21, option 1, citing the Project Protocol):
> "A criterion often applied to GHG projects stipulating that project-based GHG reductions should only be quantified if the project activity 'would not have happened anyway'—i.e., that the project activity (or the same technologies or practices it employs) would not have been implemented in its baseline scenario—and/or that project activity emissions are lower than baseline emissions."

S1 lists eight optional definitions (pp.21). The S14 framing (p.9) is: "the principle that claimed emission reductions or avoided emissions must result from actions that would not have occurred otherwise."

**Avoided emissions** (S1, p.21, from LSR):
> "GHG emissions that are prevented as a result of a company's action(s), compared to a baseline scenario without the action(s)"

S22 Glossary (p.99, PDF p.101): "An assessment of emissions reduced or avoided compared to a reference case or baseline scenario."

**Leakage** (S1, p.23):
> "A phenomenon that occurs when corporate actions lead to increased emissions and/or decreased removals outside of a company's traditional inventory boundary."

**Primary / secondary effects** (S17, §2.4, p.11, PDF p.13):
> "A primary effect is the intended change caused by a project activity in GHG emissions, removals, or storage associated with a GHG source or sink. … The primary effect is defined as a change relative to baseline emissions…"
>
> "A secondary effect is an unintended change caused by a project activity in GHG emissions, removals, or storage associated with a GHG source or sink … Secondary effects are typically small relative to a project activity's primary effect. In some cases, however, they may undermine or negate the primary effect."
>
> "One-time effects—Changes in GHG emissions associated with the construction, installation, and establishment or the decommissioning and termination of the project activity."
>
> "Upstream and downstream effects—Recurring changes in GHG emissions associated with inputs to the project activity (upstream) or products from the project activity (downstream), relative to baseline emissions." (pp.11–12, PDF pp.13–14)

**Baseline scenario** (S17, §2.8, p.12, PDF p.14):
> "The baseline scenario is a reference case for the project activity. It is a hypothetical description of what would have most likely occurred in the absence of any considerations about climate change mitigation."

The three generic possibilities are:
- "implementation of the same technologies or practices used in the project activity";
- "implementation of a baseline candidate"; or
- "the continuation of current activities, technologies, or practices…"

**Captured CO2 vs removal** [GHGP-inforce] (S21, p.343, PDF p.1):
> "Captured CO2: CO2 collected at a source (preventing an emission) and that continues to be stored in a non-atmospheric carbon pool. In this case, companies do not need to account for those emissions in the relevant scope if they meet the geologic storage requirements, but this is not accounted for and reported as a removal."

Figure 14.1 labels "point source fossil carbon capture and storage" as the "Captured fossil CO2 pathway" ("GHG capture with geologic storage"). This is distinct from "Removal pathways" (DACCS, BECCS).

**Operating margin / build margin**:
- S18 §2.3 (p.11, PDF p.13): "Generation displaced from existing power plants is referred to as the 'operating margin' (OM). Generation from potential new capacity, whose construction is avoided due to the project activity, is referred to as the 'build margin' (BM)."
- S14 §8 (p.13): "Operating margin emission rates consider the emission rates of the marginal generator(s) only … best suited to estimate impacts from discrete, temporary, and small changes in demand and generation." "Build margin emission rates … consider the emission rates of the mix of generating resources that are likely to be built to meet increased energy demand or retired to meet reductions in demand … useful in estimating impacts from permanent and large changes in demand and generation, as well as policy changes."

**Intended / unintended effects** (S19 Glossary):
- "Intended effects: Effects that are intentional based on the original objectives of the policy or action." (p.177, PDF p.179)
- "Unintended effects: Effects that are unintentional based on the original objectives of the policy or action. Unintended effects may include a variety of effects, such as rebound effects, lack of compliance or enforcement, effects on behavior once a policy is announced but before it is implemented, and effects on members of society not targeted by the policy or action." (p.180, PDF p.182)
- "Baseline scenario: A reference case that represents the events or conditions most likely to occur in the absence of the policy or action (or package of policies or actions) being assessed." (p.175, PDF p.177)

Term-usage note: the S14 consultation uses "consequential", "avoided emissions" and "emissions impact" interchangeably. The Project Protocol (S17) uses "GHG reductions". LSR Ch.16 uses "intervention accounting". Statement 3 claims language is still being debated: "reduced emissions" vs "avoided emissions" (S5, p.6).

---

## Q1. The multi-statement framework and where impact/consequential accounting sits

**F1.1 Four statements are proposed. Statement 3 is the consequential "GHG impact statement".** [GHGP-revision] S1 pp.4–6; S2 p.4.
> "A total of four statements are under consideration for the multi-statement reporting structure (figure ES.1): 1. Physical GHG inventory 2. Market-based GHG inventory 3. GHG impact statement 4. Non-GHG indicators" (S1 p.4)

S2 p.4 numbers them "Statement 1: Physical GHG inventory (existing, no change) • Statement 2: Market-based GHG inventory • Statement 3: GHG impact statement • Statement 4: Non-GHG indicators".

Figure 6 (S1 p.36) places "Scope 2 – location based" in Statement 1 and "Scope 2 – market-based" in Statement 2. Both are colored purple, meaning "addressed by the Scope 2 Standard/Guidance".

**F1.2 Statement 3 is separate from the inventories and is not a full footprint.** S1 p.39:
> "The GHG impact statement does not provide a comprehensive assessment of a corporate footprint, but instead allows reporters to report the impact of activities that are quantified using consequential methods and therefore not reflected in the physical GHG inventory. By maintaining a clear separation from Statement 1 (physical GHG inventory) and Statement 2 (market-based GHG inventory), this statement would ensure that claims about mitigation impacts, avoided emissions, credits, and other impacts based on consequential accounting are transparent and separately reported from statements using attributional accounting methods."

**F1.3 No netting; disaggregated reporting.** S1 p.28 (Transparency, application to actions and market instruments):
> "A foundational concept for multi-statement GHG reporting design is transparent and disaggregated reporting of unique reporting statements and elements, without netting." … "Ensure separate reporting of elements that are attributional (e.g., physical inventory emissions) and consequential (e.g., GHG impacts of actions)." … "Whether to include one or more accounting categories within a target boundary and whether to net one category against another (i.e., treat one as fungible with another) is a policy decision."

S1 p.34: "GHG Protocol requires disaggregation of reporting elements in GHG reports."

RFI result (S4 p.4): "Many respondents recommended phased implementation and clear use cases, with a strict prohibition on netting impact results against physical or market-based inventories."

**F1.4 Statement 3 quality criteria, accounting method and phase-2 topics.** S1 p.40:
> "This statement is expected to include quality criteria such as additionality, credible baselines, permanence, mitigate leakage, unique issuance and claiming, monitoring, independent validation and verification, GHG program governance, and sustainable development benefits and safeguards. These will be further developed in phase 2."
>
> "Accounting method: The GHG impact statement uses consequential accounting methods to quantify the impact on GHG emissions or removals of specific projects, actions, or interventions. It does so by estimating the GHG impacts of an action relative to a baseline scenario in which the action did not occur. Specific consequential accounting methods based on the type of action or intervention may vary and are to be further discussed in phase 2."
>
> "Phase 2 topics include: … developing additionality criteria, quality criteria, and safeguards for eligible interventions; addressing the issue of double claiming; selecting appropriate baselines; and discussing the concept of induced emissions … Phase 2 will also be informed by the outcomes of the scope 2 public consultation on consequential accounting methods (see box 2)."

GAP: S1 says "Further details and options on quality criteria are presented in section 9" (p.33), but the White Paper has no section 9. Its contents end at section 8 (p.9).

**F1.5 Method families.** S1 §5.2 (pp.18–19) names project accounting, policy/action accounting, intervention accounting (the umbrella) and consequential product LCA. Avoided emissions from sold products is a sub-category (S1 p.22). Market instruments (carbon credits, commodity certificates, mitigation-related contractual agreements; S1 p.17) can sit in Statement 2 or 3 subject to criteria (S1 p.37).

The S7a baselines breakout (PDF p.50) lists four candidate baseline approaches:
1. "Project-specific procedure (Project Protocol)"
2. "Performance or industry benchmark baseline (Project Protocol)"
3. "Scenario method (Policy and Action)"
4. "Comparison group method (Policy and Action)"

S7b (PDF p.5) records "Four baseline types proposed agreed".

**F1.6 Additionality is to be required for Statement 3.** [GHGP-revision]
- S7c (PDF p.18), draft text: "Statement 3: Actions and market instruments shall be additional, i.e. reflect emissions reduction, avoidance, or removal that would not have occurred in the absence of the reporting company's intervention (Note: specific additionality tests to be determined)." Sub-bullets: "Credits: … (ICVCM)"; "Other actions: Companies shall demonstrate that emissions reductions or removals from projects meet additionality requirements based on established frameworks or standards. (SBTi)".
- S5 p.6: "The Secretariat responded that additionality must be present in Statement 3 and that a majority of the members participating in the subgroup considered that there should be at least impact requirements for Statement 2."

**F1.7 Draft Statement 3 boundary, time boundary and scope proposals (TWG drafts, not decided).** S7b:
- PDF p.66: "Proposal: Include all significant GHG effects of the action in the GHG assessment boundary. • i.e. all significant systemwide/global positive and negative GHG impacts of the action. • Impacts may include direct/primary impacts as well as indirect/secondary impacts (if significant) such as life cycle impacts, avoided emissions, leakage, market-mediated (e.g. substitution and displacement) effects … • Companies shall disclose and justify if any GHG impact is excluded from the GHG assessment boundary."
- PDF p.67: "Time boundary … Proposal: – Annual change in GHG emissions (and removals, if applicable) occurring in the reporting year quantified ex-post".
- S7a PDF p.52, same theme, marked "?": "The time period shall be one year for the reporting year (calendar year or other 12-month reporting period), quantified ex-post." and "Use marginal if you have them • Use average if marginal is not available".
- S7b PDF p.65 options for which actions to report include "Option 2: Companies should evaluate all major actions they undertake that are expected to have significant impacts on climate change not captured in the GHG inventory, including mitigation actions … as well as other actions that have negative or mixed impacts".

**F1.8 RFI support.** S4 p.23: 366 valid responses to Q24; "Most respondents (80%) selected 'I should be included.'" (293 included / 51 neutral / 22 not included). S4 p.25: 69% "strongly agree" or "agree" that Statement 3 should reflect positive and negative impacts. S4 p.41: "the newly proposed statements are expected to remain optional for the foreseeable future."

**F1.9 Precedent already in force: the Corporate Standard Ch. 8 (quoted in S1 Annex C, pp.47–49; I did not re-download the Corporate Standard itself).**
> "When companies implement internal projects that reduce GHGs from their operations, the resulting reductions are usually captured in their inventory's boundaries. These reductions need not be reported separately unless they are sold, traded externally, or otherwise used as an offset or credit." (S1 p.48)

The listed exceptions include an on-site plant (e.g., CHP) that "may increase a company's direct emissions, while displacing the consumption of grid electricity by the companies supplied. Any resulting emissions reductions at the plants where this electricity would have otherwise been produced will not be captured in the inventory of the company installing the on-site plant." (S1 pp.48–49)

INFERENCE: this is the closest in-force precedent for "within-inventory reduction vs. system effect". Reductions at your own plant show up in your inventory. Changes at other plants on the grid do not, and belong in separate (Statement 3) reporting.

**F1.10 Worked example in S2 (p.10), CHP:**
> "5. At another site, the company installs a Combined Heat and Power (CHP) plant which not only supplies the site but also provides power and heat to a local community. → This project would be accounted for in the newly proposed GHG impact statement, 'within organizational boundaries' category and also has implication for Scope 1 reporting in the physical GHG inventory."

Example 7 (p.10): a wind farm investment where the company has no operations → "sector associated impacts". The S2 caveat (p.9): "the simplified assumption is made that all applicable quality criteria (including additionality) that are still to be defined, would be met."

GAP: mutual exclusivity between Statement 1 and Statement 3 (could the same captured tonne appear in both?) is undecided. S1 p.35: "Decisions have also not been made on whether statements are mutually exclusive or not." See F6.3.

---

## Q2. Attributional inventory reduction vs consequential impact; application to retrofit and new build

### Building blocks (SOURCE)

**B1. Inventory treatment of captured fossil CO2** (S21) [GHGP-inforce]:
- Owner/controller of the capture facility (S21 p.359, PDF p.17): "Do not report scope 1 emissions for the CO2 that is captured and stored in a geologic reservoir; • Report any fugitive emissions of captured CO2 released at that facility in scope 1; • Report emissions from other processes in the geologic storage pathway and any fugitive emissions of captured CO2 not occurring at the capture facility in the relevant scope 3 category; • Reflect the captured CO2 as a reduction in scope 1 emissions compared to previous years, if CO2 was emitted from the facility in prior years."
- Electricity purchasers from such a facility (same page): "Do not report scope 2 emissions for the CO2 that is captured and stored in a geologic reservoir; • Report any fugitive emissions of captured CO2 released at that facility in scope 2" … "Reflect the captured CO2 as a reduction in scope 2 emissions compared to previous years…" (pp.359–360, PDF pp.17–18)
- S21 p.350 (PDF p.8): "The impact of CO2 capture is reflected in a GHG inventory by not reporting emissions that have instead been prevented. … Any CO2 that is not captured, and all GHG emissions due to the capture process itself, must be fully accounted for."
- Not a removal (same page): "Captured CO2 pathways with geologic storage where the stored carbon is derived from fossil fuels … are not accounted for as CO2 removals. Instead, capture of fossil CO2 from a point source prevents emissions if that CO2 is captured and stored."
- Life-cycle requirement (Requirement 19.GS, p.344, PDF p.2): "Companies shall account for all life cycle GHG emissions that occur throughout the geologic storage pathway (i.e., cradle to grave)."
- Scope 3 placement (p.360, PDF p.18): "companies should treat captured CO2 as a product." Transport goes to scope 3 cat. 9; injection and EOR-produced oil and gas go to cat. 12.
- Upstream (p.357, PDF p.15): "This includes any upstream GHG emissions from the extraction, transportation, processing, distribution, and storage of the materials the captured CO2 is derived from, and fugitive emissions of captured CO2".

**B2. Inventory vs intervention accounting** (S20, LSR Ch.16) [GHGP-inforce]:
- p.396 (PDF p.1): "This information should be reported outside the physical GHG inventory, within the GHG report…"
- p.398 (PDF p.3): "To evaluate the impacts of specific actions, companies should use project or intervention accounting methods, which estimate the systemwide GHG impacts of an action relative to a counterfactual baseline scenario in which the action did not occur".
- p.397 (PDF p.2), reporting requirement: "If companies estimate and report the GHG impacts of specific actions separately from the inventory, they shall disclose the data sources, methods, and assumptions used to quantify the impact(s) of the evaluated action(s), the assessment boundary, the assessment time period, whether it is an ex ante and/or ex post assessment, and whether the results have been third-party verified."
- p.397: "These impacts can occur within a company's scope 1, scope 2, and scope 3 inventory, as well as beyond the inventory boundary. Companies should understand the systemwide impacts of their actions by looking at the potential for avoided emissions, leakage, substitution, and displacement effects…"
- p.406 (PDF p.11): "In GHG inventory accounting (as opposed to intervention accounting), all changes to emissions, removals, and other metrics within the company's inventory boundary over time matter, independent of whether that change results from the planned actions of the reporting company or actions taken by other actors."
- p.409 (PDF p.14): "Any estimates of avoided emissions must not be included in or deducted from the company's scope 1, 2, or 3 inventory."
- p.411 endnote 1: "The GHG Protocol's workstream on actions and market instruments will define where to report the impacts of actions in a GHG report and if additional information needs to be disclosed."
- Table 16.4 (p.409): an action that improves the inventory but "leads to net negative GHG impacts … For example, due to leakage" → "Do not implement action".

**B3. Retrofit primary effects and baseline** (S17) [GHGP-inforce]:
- Box 8.2 (p.52, PDF p.54): "A retrofit project activity involves modifying existing equipment, or replacing existing equipment with new parts, devices, or systems that: • improve the equipment's efficiency and lower its rate of GHG emissions; and/or • increase the equipment's utilization so that it produces more of a particular product or service. Thus, many retrofit project activities result in two primary effects: (1) lowering the rate of GHG emissions associated with the equipment, and (2) displacing GHG emissions from other sources, for any amount of production greater than historical levels, due to increased utilization. For the first primary effect, 'continuation of current activities' would involve continued operation of the equipment that the project activity is retrofitting. For the second primary effect, 'continuation of current activities' would involve continued production from other existing facilities that the project activity's expanded production displaces. For the first primary effect, the most significant barrier to the continuation of current activities would be the breakdown of existing equipment (e.g., by reaching the end of its useful lifetime). If a piece of equipment would have to be replaced in the near future, then in practical terms this would constitute an absolute barrier to the continuation of current activities, and the continuation of current activities should not be considered as a baseline scenario alternative."
- Box 8.7 (p.58, PDF p.60): "Project Activities That Reduce the GHG Emission Rate of an Existing Process (Retrofit Projects). For these project activities, baseline emissions from the continuation of current activities may be estimated as the historical GHG emission rate for the process or equipment that is being retrofitted." Also: "Project Activities That Displace or Reduce Production from Other Sources. … A common example is estimating the 'operating margin' for grid electricity production".
- §8 (p.50, PDF p.52) example of "continuation of current activities": "Continued operation of existing equipment, where the project activity involves retrofitting the equipment to improve its efficiency."
- The Project Protocol's six primary-effect types (§5.2, p.30, PDF p.32) contain no carbon-capture category. Its sink definition is biological only (p.11, PDF p.13): "The Project Protocol identifies one GHG sink category: increased storage or removals of CO2 by biological processes."

**B4. The Grid Guidelines' worked retrofit row** (S18 Table 2.1, p.12, PDF p.14) [GHGP-inforce]. GHG project: "Retrofit an existing grid-connected coal-fired power plant to improve its generation efficiency and capacity".

| Project activity | Primary effect | Grid-connected? | Addressed by Guidelines? |
|---|---|---|---|
| "1. Generate current levels of electricity output more fuel-efficiently" | "Reduce combustion GHG emissions from 'off-grid' electricity generation*" | "No*" | "No. Account for GHG reductions using Project Protocol general procedures." |
| "2. Generate more grid electricity, due to greater capacity and utilization" | "Reduce combustion GHG emissions from grid-connected power plants" | "Yes" | "Yes" |

Footnote: "* Although the electricity from this project activity is still delivered to the grid, the GHG reductions the project activity causes occur at the coal-fired power plant itself (because of its enhanced fuel efficiency) and not at other grid-connected power plants. The project activity is therefore not considered a 'grid-connected' project activity for the purposes of these guidelines."

The same table lists "Install and operate grid-connected natural gas combined-cycle power plant | Generate low-emission electricity from high-efficiency natural gas plant | Reduce combustion GHG emissions from (higher emitting) grid-connected power plants | Yes | Yes". In other words, a new fossil plant is a grid-connected generation project in the Guidelines.

**B5. The Guidelines formulas** (S18 §12.2.2, p.71, PDF p.73; quoted in S14 p.7):
> "Primary Effect_t = Baseline Emissions_p,t – Project Activity Emissions_p,t"; "Secondary Effect_s,t = Baseline Emissions_s,t – Project Activity Emissions_s,t"; "GHG Reduction_t = Primary Effect_t + Σ_s (Secondary Effect_s,t)".

S14 p.7: "Baseline Emissions_t = Emission Rate_baseline,t × Generation_project,t; Project Activity Emissions_t = Emission Rate_project,t × Generation_project,t". Baseline emission rate (S18 Eq.1, p.13, PDF p.15): "ER_baseline = wBM + (1-w)OM".

**B6. Secondary effects for grid projects** (S18 §4.3–4.5, pp.27–29, PDF pp.29–31; quoted in S14 pp.8–9):
> "Most grid-connected project activities will either reduce or cause no increase in fuel extraction and transportation GHG emissions, so changes in these emissions can often be ignored as secondary effects. Possible exceptions include project activities that use biofuels…" … "Secondary effects may be excluded from the GHG assessment boundary if they involve a reduction, not an increase, in GHG emissions … Otherwise, if their magnitude is more than a few percent of the expected primary effect GHG reductions, they should be included in the GHG assessment boundary."

S17 §5.3.2 (p.32, PDF p.34) upstream examples include "changes in the release of methane (CH4) during coal mining" and "CH4 leaks from gas transport and storage". It also covers market responses: "Market responses occur when alternative providers or users of an input or product react to a change in market supply or demand caused by the project activity."

**B7. Policy and Action Standard: CCS as a sink category in policy assessment.** S19 Table 6.3 (p.54, PDF p.56): "Sink category: Carbon capture and storage | Removal and storage of CO2 | Industrial facilities, power plants, geological formations | CO2".

Note the inconsistency with LSR Ch.14: LSR (2026) says captured fossil CO2 is not a removal. The P&A Standard (2014) lists "Carbon capture and storage" under sink categories. INFERENCE: for a page, use LSR's newer terminology and flag the older P&A table as a terminology difference, not a rule.

### Application (all INFERENCE, built from B1–B7; each step names its block)

**A. Retrofit of an existing plant (coal or gas)**

(a) Inventory, Statement 1 (B1). The plant owner's scope 1 falls by the CO2 captured and geologically stored, if LSR geologic-storage requirements are met. The owner still reports:
- residual stack CO2 (the uncaptured share);
- fugitive captured CO2 at the facility (scope 1);
- the capture process's own emissions (e.g., any added fuel combustion; "all GHG emissions due to the capture process itself, must be fully accounted for");
- transport and injection emissions (scope 3, cat. 9/12).

This "own emissions go down" result is the attributional reduction. It shows in Statement 1 versus prior years ("Reflect the captured CO2 as a reduction in scope 1 emissions compared to previous years"). Under the Corporate Standard Ch.8 precedent (F1.9), it "need not be reported separately unless … sold, traded externally, or otherwise used as an offset or credit".

(b) Consequential, Statement 3 (B2–B6). The question the reader asked: does the retrofit get credit as a direct, at-plant reduction, or only as a grid/system change?

What the in-force GHG Protocol text implies is both, split into separate effects:
- **Effect R1, the at-plant emission-rate reduction.** This is analogous to Grid Guidelines Table 2.1 activity 1 (B4). The reduction happens "at the … power plant itself", so the Guidelines classify it as not "grid-connected" and send it to Project Protocol general procedures. The Project Protocol baseline for a retrofit's rate effect is "continuation of current activities", estimated "as the historical GHG emission rate for the process or equipment that is being retrofitted" (B3, Box 8.7).
  - So R1 ≈ (historical unabated rate − abated rate) × the plant's generation. This is a direct, plant-level primary effect, not an OM/BM grid effect.
  - Caveat from B3: if the plant would have retired or needed replacement soon ("end of its useful lifetime"), then "continuation of current activities should not be considered as a baseline scenario alternative". The baseline becomes whatever replaces the plant (grid OM/BM). The impact must then be computed as a system change.
  - This end-of-life test is the hinge between "retrofit credited at the plant" and "retrofit credited as a system change".
- **Effect R2, the output change from the energy penalty.** Box 8.2 describes a retrofit that increases output as a second primary effect: "displacing GHG emissions from other sources, for any amount of production greater than historical levels". A capture retrofit usually does the reverse. For a fixed-fuel NGCC, NETL's greenfield cases show net output falling about 11% (T1, ES-4). The lost MWh must then be supplied by other grid generators.
  - INFERENCE: by symmetry with Box 8.2 and Table 2.1 activity 2, that lost output is a grid-connected effect, valued at the marginal rate (OM, possibly BM, Eq.1). It is negative (an emissions increase).
  - If the retrofit instead holds net output by burning more fuel (NETL's PC design holds 650 MW net with about 27% more coal input; T1, ES-3), the extra fuel's upstream emissions are an upstream secondary effect (B6). This is one of the cases where the Guidelines' presumption that most projects "reduce or cause no increase in fuel extraction" does not obviously hold.
- **Effect R3, dispatch and capacity-factor change.** If capture revenue or incentives change how often the plant runs, the extra (or fewer) MWh displace (or are displaced by) marginal generation. This is again an OM/BM effect. T4 models "six scenarios for lifespan extension and capacity factor changes" (see Q5).
- **Effect R4, lifetime extension / lock-in.** If the retrofit keeps a plant running that would otherwise retire, the baseline for those extra years is the replacement mix (BM), not the unabated plant (B3 end-of-life barrier). With a clean BM, those years could carry a net emissions increase equal to the residual emissions (plus upstream) minus the replacement's emissions. T4 reports −24% to +82% emissions changes "versus business-as-usual for affected generators" across its scenarios.
- **Secondary effects.**
  - One-time: construction of capture, transport and storage infrastructure (S17 §5.3.1).
  - Upstream: added fuel, including coal-mine CH4 and gas-system CH4 (S17 §5.3.2; S21 p.357).
  - Downstream: CO2 transport, injection and fugitives (S21 Req. 19.GS); for EOR, produced-oil life-cycle emissions and market displacement (S21 p.357; see Q4).
- **Reporting location.** For the plant owner, the S1/S2 framework points to Statement 3 "within organizational boundary impacts" (S1 p.22). By analogy, S2's CHP example "also has implication for Scope 1 reporting in the physical GHG inventory". Whether R1 can then appear both in Statement 1 (as the scope 1 drop) and in Statement 3 is the unresolved mutual-exclusivity question (F6.3).

A consultation respondent made the same split. The NorthBridge Group (consultant, S16 respondent 96, Q22):
> "some actions, like installing carbon capture on a fossil plant or accelerating the retirement of a fossil plant … may also require special treatment. Carbon capture or early plant retirement can result in direct abatement of fossil emissions associated with a specific plant and/or affect how the plant is operated that may not be fully reflected in the OM or BM impact assessment. … Special treatment may therefore be needed to separately recognize: 1) the direct cessation of emissions from the unit (using observed and verifiable data), and 2) the consequential effects associated with replacement generation and capacity decisions."

**B. New-build plant with capture (coal or gas)**

(a) Inventory, Statement 1 (B1). The owner reports a new scope 1 source equal to the residual (uncaptured) emissions plus capture-process and fugitive emissions. The captured and stored CO2 is not reported (B1). Nothing is "reduced" versus a prior year at that facility, because the facility is new. The scope 1 total rises.

(b) Consequential, Statement 3 (B4–B5). A new CCS plant is a grid-connected generation project activity. It is analogous to the S18 Table 2.1 new-NGCC row, whose primary effect is "Reduce combustion GHG emissions from (higher emitting) grid-connected power plants".
- Baseline emissions = ER_baseline (wBM + (1−w)OM) × the project's generation (B5).
- Project emissions = the plant's residual rate × generation (not zero, unlike renewables; S14 p.7 notes "For renewable energy generation the project scenario Primary Effect emissions are usually zero").
- Impact ≈ Generation × (ER_baseline − residual rate), plus or minus secondary effects.
- So yes: a new-build CCS plant's consequential credit is only a system-change credit. It depends on what it displaces, and it is positive only where the displaced margin is more emitting than the plant's residual rate.
- Weight w: S18 §5.3 (p.32, PDF p.34): "Generally, project activities that can provide firm power at all times will fully displace the BM (i.e., w = 1)." S14 p.17 default: "Project provides firm power, and on-peak, baseload, or intermittent generation: 1". INFERENCE: a firm, dispatchable CCS plant would typically get w = 1, so the BM rate drives the result. If the BM is mostly zero-carbon, a new CCS plant can show a negative impact.
- Alternative baseline framing (S17 project-specific procedure, B3/§2.8): the most likely alternative might be an unabated plant of the same type ("implementation of a baseline candidate"). Then the primary effect ≈ (unabated rate − abated rate) × generation, with the additionality question shifted to whether capture would have been built anyway.
- One-time effects (S18 §4.3.1, p.27): "if a project activity displaces construction of another power plant – in other words, if it affects the build margin – then similar GHG emissions would also occur in the baseline scenario". The extra one-time emissions from capture equipment, pipelines and storage wells would be the difference.

A consultation respondent noted the consultation formula does not handle this case. Constellation Energy (utility, S16 respondent 181, Q20):
> "The proposed Scope 2 TWG subgroup formula does not address the emissions impact from actions that produce incremental emissions, such as building a new natural gas-fired power plant to serve load. Instead, the proposed formula assumes all electricity projects are clean electricity projects."

---

## Q3. Applying the electricity consequential draft (S14) to the four cases

**SOURCE: what the draft proposes**

- **Subgroup formula (S14 §6.1, pp.7–8):** "Emissions Impact_t = Σ_{i∈P_y} (MWh_i × MER_i)", where "P_y = set of all procurement transactions in the reporting year; MWh_i = megawatt hours procured in transaction i; MER_i = marginal emission rate applicable to the grid region, time, and conditions of transaction i". Hourly form: "Emissions Impact = Σ_{t=1}^{8760} (MWh_t^procured × MER_t)".
  - "the Scope 2 TWG subgroup approach recommends limiting the analysis to the reporting year period only and suggests reporting these impacts each year." (p.8)
  - "The approach developed by the Scope 2 TWG subgroup does not consider secondary effects of electricity projects and focuses quantification entirely on the primary effects related to changes on the grid within a given reporting year." (p.9)
- **Nine tests (S14 §7.1, p.10, verbatim names and key sentences):**
  1. Regulatory test: "checks whether a project is mandated by law or regulation."
  2. Timing test: "whether the incentive (such as credits, PPAs, or certificates) influenced the decision to build or operate the project. If the project was already planned or under construction before the incentive was available, then it fails this test."
  3. Financial analysis test: "If the project would not have been pursued without the additional revenue stream, it passes the test."
  4. Barrier test: "significant barriers, such as technological, institutional, or market, would have prevented the project from moving forward."
  5. Common practice test: "If similar projects are already widely implemented without incentives, then the project is considered 'business as usual' and not additional."
  6. Positive list: "a predefined set of project types or circumstances that are automatically considered additional. For example, early-stage technologies, off-grid renewables, or projects in high carbon intensity regions".
  7. Performance standard test: "sets a quantitative benchmark (e.g., a baseline emissions rate, energy efficiency level, or renewable penetration level) and considers any project that outperforms it as additional."
  8. Contractual/tenor test: "uses the nature of project contracts, particularly their duration, as an indicator of additionality."
  9. First-of-its-kind test: "grants additionality to projects that introduce a new technology, scale, or application not yet present in a market or region."

  The Q26 survey wording frames the tests as "a framework designed to assess additionality for renewable energy projects" (p.11).
- **OM methods (S14 §8.1, pp.13–14):** SCED sensitivity (fuel-on-the-margin; locational), scenario modelling, heat-rate/LMP, statistical, capacity-factor based, difference-based. **BM methods (§8.2, p.15):** recent capacity additions, policy scenario, capacity expansion modelling, average emission factor.
- **Weighting (S14 §9.1, pp.17–18):**
  - Guidelines formula: "Build margin weight = the lesser of 1, or (Capacity Value / (Rated Capacity x Capacity Factor))" with defaults (firm, on-peak/baseload/intermittent: 1; firm, exclusively off-peak: 0.5; not firm, on-peak/baseload/intermittent: 0.5; not firm, exclusively off-peak: 0).
  - UNFCCC CDM Tool07: "Wind and solar … 0.25"; "All other projects … 0.5 for the first crediting period (7 to 10 years), and 0.75 for the second and third".
  - Subgroup ideas: "Default 0.50 build margin weight for all projects", "Resource adequacy approaches", "Intervention lifecycle approaches" ("If a project has not been anticipated in capacity planning, operating margin rates alone may be used for the first 5 years of a project, after which build margin rates should be used.").
- **Illustrative rates in the draft (S14 p.17):** "decreased output from a nearby combined-cycle gas generator (operating margin impact of roughly ~800 lb CO₂/MWh) … may result in retirement of a coal generator (build margin impact of roughly ~2,000 lb CO2/MWh)".
- **Existing vs new, retirements, retrofits.** The draft never mentions retrofits, uprates, repowering, CCS or capture (full-text search of S14). Its only treatment of existing resources is through the margin definitions. BM rates represent resources "likely to be built … or retired" (p.13). The average-emission-factor BM method "Uses a 'location-based method' style average of existing grid generation to estimate the emission rate of units that would be built or retired." (p.15)

**INFERENCE: how the four cases map onto the draft**

Formula fit. The S14 formula multiplies procured MWh by an MER and implicitly treats the procured generation as zero-emitting. It cannot represent a CCS plant's residual emissions, energy-penalty output loss, upstream fuel or T&S emissions. It also excludes secondary effects by design (p.9).
- For (i)–(iv), the older Guidelines structure (B5: Primary = Baseline − Project emissions; plus secondary effects) is the GHG Protocol method that can carry a non-zero project emission rate. A later sector method would have to restore it.
- Respondents flagged the same limitation (Constellation, above; CRS, below).

| Case | Plausible baseline (draft's tools) | OM/BM and weighting | Main sign risks |
|---|---|---|---|
| (i) Retrofit CCS, existing gas (NGCC) | Rate effect at the plant: historical unabated rate (Box 8.7). If the plant would retire: replacement mix | Lost net output (NETL F-class: 727→645 MW net, −11.3%) valued at OM, or BM if persistent | Upstream CH4 from the same fuel spread over fewer MWh; lifetime extension if retirement was the baseline |
| (ii) Retrofit CCS, existing coal | As (i) | If net output is held, more coal burned (NETL SC PC: +27% thermal input); if not, lost output valued at the margin | Larger absolute capture tonnes; upstream coal-mine CH4 per MWh rises; lifetime extension of high-emitting assets |
| (iii) New-build gas with CCS | BM (w = 1 if firm, S18 §5.3) or an unabated NGCC baseline candidate (project-specific) | Firm, so w = 1 by Guidelines default | If BM is mostly zero-carbon, the impact can be negative (residual 38–39 kg/MWh net at 90% capture vs ≈0) |
| (iv) New-build coal with CCS | As (iii) | As (iii) | Residual 99–104 kg/MWh net at 90% capture (NETL) plus higher upstream CH4 (AR5 methane column 68 g/kWh) |

(NETL numbers are greenfield designs; see Q5. kg values are derived from lb.)

Likely pass or fail on the nine tests, per the draft's wording. All of this is INFERENCE and depends on facts no source here provides for any specific plant:

| Test (S14 p.10 wording) | (i) Retrofit gas | (ii) Retrofit coal | (iii) New gas+CCS | (iv) New coal+CCS |
|---|---|---|---|---|
| Regulatory ("mandated by law or regulation") | Fails where a CO2 performance standard requires capture; otherwise passes. Jurisdiction-specific, not determinable from sources | Same | Same | Same |
| Timing ("already planned or under construction before the incentive was available") | Hinges on which "incentive". The draft lists "credits, PPAs, or certificates". Public tax credits are not named. Respondents flagged "planned"/"under construction" as undefined (S15 p.8) | Same | Same | Same |
| Financial analysis ("would not have been pursued without the additional revenue stream") | Plausible pass if capture is uneconomic without the revenue. No GHG Protocol source gives CCS economics; T4 says 45Q can make CCS "profitable for coal- and natural gas-based electricity generator owners". If so, a buyer's added revenue may not be decisive | Same | Same | Same |
| Barrier ("technological, institutional, or market") | Plausible pass (limited deployment). T3 (secondary): "a little over 20 operating CCUS facilities, the vast majority are associated with natural gas processing" | Same | Same | Same |
| Common practice ("widely implemented without incentives") | Likely pass where power CCS is rare | Same | Same | Same |
| Positive list ("early-stage technologies…") | Depends on list content. None exists in the draft | Same | Same | Same |
| Performance standard ("outperforms" a benchmark rate) | Depends on the benchmark: passes against an unabated fleet average; fails against a zero-carbon benchmark | Same | Same | Same |
| Contractual/tenor | Passes only if a long-term offtake or contract enabled the retrofit | Same | Same | Same |
| First-of-its-kind ("not yet present in a market or region") | Region-specific; "Once the technology becomes established … subsequent projects no longer qualify" | Same | Same | Same |

Additional INFERENCE: the draft's tests ask whether a project (a build or operate decision) is additional. For a retrofit, the decisive counterfactual question is the Project Protocol's end-of-life barrier (B3): would the plant have kept running unabated, or retired? None of the nine tests addresses that question directly. The respondent-proposed "Incrementality test" (S15 p.10) would treat a retrofit, life extension or uprate as a "material change relative to a prior state", without proving causation.

**Consultation option distributions** (S15 Tables 1–9 and 16–17; reproduced exactly from S16 `question_options.csv`):

| Question | Result (count, % of answering) | n |
|---|---|---|
| Q19 formula appropriate? | Yes 49 (37%) / No 84 (63%) | 133 |
| Q21 include secondary effects? | Yes 57 (52%) / No 53 (48%) | 110 |
| Q24 annual vs lifetime | Each year 81 (79%) / once for lifetime 22 (21%) | 103 |
| Q26 Regulatory | Required 69 (64%) / Optional 22 (20%) / Not required 17 (16%) | 108 |
| Q26 Timing | 52 (49%) / 31 (29%) / 23 (22%) | 106 |
| Q26 Financial analysis | 18 (17%) / 58 (54%) / 31 (29%) | 107 |
| Q26 Barrier | 15 (15%) / 46 (46%) / 40 (40%) | 101 |
| Q26 Common practice | 23 (22%) / 33 (32%) / 47 (46%) | 103 |
| Q26 Positive list | 18 (17%) / 57 (54%) / 30 (29%) | 105 |
| Q26 Performance standard | 14 (14%) / 38 (38%) / 49 (49%) | 101 |
| Q26 Contractual/tenor | 24 (24%) / 41 (40%) / 37 (36%) | 102 |
| Q26 First-of-its-kind | 10 (10%) / 36 (36%) / 53 (54%) | 99 |
| Q28 feasible (multi-select) | Regulatory 80 (82%), Timing 72 (74%), Positive list 58 (59%), Contractual 47 (48%), Financial 44 (45%), Performance std 42 (43%), Common practice 39 (40%), First-of-kind 35 (36%), Barrier 30 (31%), None 10 (10%) | 98 |
| Q31 regional differences | Yes 40 (40%) / Unsure 32 (32%) / No 29 (29%) | 101 |
| Q33 rigor by claim type | Yes 43 (55%) / No 35 (45%) | 78 |
| Q47 appropriate weighting (multi) | GHGP Guidelines 30 (45%), CDM Tool07 19 (28%), Default 0.5 BM 16 (24%), Unsure 15 (22%), Intervention lifecycle 13 (19%), Resource adequacy 9 (13%), None 9 (13%) | 67 |
| Q49 not feasible (multi) | Unsure 21 (37%), Resource adequacy 17 (30%), All feasible 16 (28%), Intervention lifecycle 15 (26%), CDM Tool07 10 (18%), GHGP Guidelines 8 (14%), Default 0.5 8 (14%) | 57 |

S15 p.8 summary: "Overall, the survey showed that regulatory and timing tests are the most favored to be included as mandatory." S15 p.4: "Most frequently mentioned was the risk of double counting: without clear separation, consequential results could be confused with verified inventory reductions."

**What respondents said about existing resources, retrofits, uprates and new build** (verbatim from S16 `responses_long.csv`; organization type from `respondents.csv`; respondent_id given):

1. The NorthBridge Group (consultant; id 96; Q22): carbon capture "may also require special treatment … Special treatment may therefore be needed to separately recognize: 1) the direct cessation of emissions from the unit (using observed and verifiable data), and 2) the consequential effects associated with replacement generation and capacity decisions." (full quote in Q2)
2. The NorthBridge Group (id 96; Q30): "Incrementality instead assesses whether a discrete, identifiable action changed system behavior relative to a prior state (e.g., new builds, uprates, life extensions, repowering, or operational dispatch changes)." Also: "MIM should apply uniformly across all generation technologies (fossil and clean)…"
3. Constellation Energy (energy supplier/utility; id 181; Q20): "…does not address the emissions impact from actions that produce incremental emissions, such as building a new natural gas-fired power plant to serve load. Instead, the proposed formula assumes all electricity projects are clean electricity projects."
4. Center for Resource Solutions (non-profit; id 35; Q18): "Additionality is discussed only for renewable projects, not fossil ones. A consequential accounting framework should apply across the electricity sector." And: "the framework is ambiguous about whose action is being measured. It alternates between the action of the generator (building or operating a project) and the action of the purchaser or investor (buying clean electricity or financing a project). These actions involve different baselines and requirements."
5. Redacted (GHG accounting/reporting program; id 174; Q20): consequential approaches should "also allow for accounting of removals (e.g., biomass based power plants with CCS)."
6. ACORE (non-profit; id 159; Q27): "When implementing the timing test, it is fundamental to ensure that reporters can claim credit for actions that enable repowers, uprates, and delayed decommissionings, in addition to new-build generation."
7. Environmental Markets Association (industry group; id 153; Q29): "Age-based eligibility rules can reduce market efficiency … The RECs of older, already cost-recovered, projects producing clean electricity (e.g., older hydro or nuclear) can still be displacing dirtier sources. … It is discriminatory to cast older facilities that produce equivalent avoided emissions benefits as ineligible for consequential accounting because of additionality preferences."
8. Low Impact Hydropower Institute (non-profit; id 56; Q32): "Relicensed projects should be considered to have new commissioning dates given that significant new investments will likely be made to upgrade or overhaul facilities … Any investments or upgrades at the turbine-level should be considered additional".
9. Tierra Climate Inc. (data/analytics provider; id 41; Q27): "Regulatory Test (Required): Should be required only for greenfield projects … However, this test should not disqualify behavioral interventions applied to already existing assets, even if they received regulatory support."
10. Vidia Equity (financial institution; id 25; Q18): "People often underestimate the full cumulative negative GHG emissions lifetime impact of setting up a new gas-fired powerplant that is likely to operate for the next 20-30 years." Q22: "Upstream GHG emissions (in gCO2e/kWh) are usually not negligible, and especially high (+15-20%) for fossil fuel -based electricity as the GHG emissions from the continuous extraction, processing, transport, including methane leakage!, need to be accounted for." (This is a respondent's claim, not a sourced number.)
11. Clean Path Partners LLC (consultant; id 189; Q22): long-term effects include that "new fossil fuel plants are delayed and/or existing fossil fuel plants are retired, and emissions are permanently lowered from the alternative baseline."
12. Clean Air Task Force (non-profit; id 177; Q52; no CCS content): "an inaccurate weighting, e.g. giving operating margin a 50% weighting in a context where it should be 0%, could allow a completely non-impactful project to receive significant credit."

Theme coded in the repo taxonomy (reference/theme_taxonomy.md, theme 14 "additionality_stringency_chill"): "excluding worthy projects (including existing resources needing reinvestment)".

---

## Q4. CCU vs CCS in consequential terms

**F4.1 Inventory: CCU is not a captured-CO2 pathway, so the emission stays in the inventory.** [GHGP-inforce] S21 p.351 (PDF p.9):
> "Captured CO2 emissions with product storage or use as an input for other production purposes (e.g., greenhouse fertilization) do not represent a captured CO2 pathway with geologic storage (i.e., does not include permanent storage in geologic reservoirs). Carbon captured and stored in products represents temporary storage, followed by re-release to the atmosphere at the end of the product lifecycle. Reporting product carbon storage is optional in this Standard. Companies that choose to report product carbon storage must satisfy the requirements in Chapter 15."

S21 reporting requirements (p.347, PDF p.5):
> "CO2 capture with geologic storage that meets the geologic storage requirements is not reported as emissions in the relevant scope." … "Fossil CO2 capture that doesn't meet the geologic storage requirement is reported as 'fossil fuel and industrial emissions' in the relevant scope."

Reversals (same page): "Reversals of CO2 capture with geologic storage: Net carbon losses from geologic reservoirs associated with previously disclosed captured CO2 (no longer in the inventory boundary)."

INFERENCE: a power plant that captures CO2 for utilization (fuels, chemicals, beverages, greenhouses) still reports that CO2 in its scope 1 under LSR. Only geologic storage (with traceability, data quality and monitoring requirements) removes it from scope 1.

**F4.2 EOR is geologic storage but requires cradle-to-grave accounting of the produced oil and gas.**
- S21 Req. 19.GS (p.344, PDF p.2): "Enhanced oil and gas recovery: For geologic storage pathways with enhanced oil and gas recovery, companies shall account for all downstream GHG emissions associated with the extraction, processing, transportation, distribution, storage, and use (i.e., combustion) of oil, natural gas, or other hydrocarbons produced from the geologic reservoir and report such emissions in scope 1, scope 2, and/or scope 3."
- Box 14.1 (pp.352–353, PDF pp.10–11): "Despite the recovery and retention of injected CO2 within the EOR system, the full life cycle of the produced oil or natural gas must be considered to determine the net CO2 flux … Where the net geologic carbon stock change is positive and greater than the life cycle GHG emissions of the geologic storage with EOR pathway … the EOR can provide climate benefits. Where the net geologic carbon stock change is negative, it leads to net CO2 emissions from geologic storage."
- Consequential pointer (p.357, PDF p.15): "Alternative methods to quantify global impacts using consequential or intervention GHG accounting methods are described in Chapter 16. Such methods can be applied to quantify the impacts of EOR production, which would include the displacement of non-EOR oil and gas production."

This is the only place in the GHG Protocol sources I found where CCS/EOR is explicitly connected to consequential accounting.

**F4.3 Project Protocol hooks for utilization: downstream effects, market responses and equivalence.** S17 §5.3.2 (p.32, PDF p.34): downstream effects relate to "the products produced (downstream) by a project activity"; market responses: "a downstream market response occurs when … [supply changes] causes [activity] to shift … to meet unchanged … demand." S17 §2.13 (pp.14–15, PDF pp.16–17): "if the project activity were not implemented, it should be assumed that the market would have provided a quantity and quality of products or services equivalent to what the project activity would have produced."

INFERENCE for CCU (consequential):
- The baseline for the utilized CO2 is whatever product or CO2 source the market would otherwise have used: fossil feedstock for synthetic fuel, or other CO2 sources.
- The impact is not the captured tonnage. It is the difference in life-cycle emissions between the CCU product system and the displaced product system, including re-release at use or end of life (S21 p.351 "temporary storage, followed by re-release").
- For EOR, the market response is the displacement or non-displacement of other oil production (S21 p.357).
- Permanence: the AMI White Paper says "This principle applies to removals only" (S1 p.32). For avoided-emission claims via fossil capture, permanence enters through LSR reversal accounting and storage monitoring, not through the AMI principle.
- Signal: ISO WG4 consensus is to remove permanence as a principle, with Statement 3 referencing ISO 14064-2 (S5 pp.3–4).

**F4.4 GAP.** No GHG Protocol source quantifies CCU re-release timing, utilization baselines or EOR displacement rates. No third-party number on CCU permanence was retrieved for this dossier.

---

## Q5. Coal vs gas: numbers only from sources

**T1 NETL Rev 4a (Oct 2022), greenfield new-build designs** [third-party]. Exhibit ES-3 (PC), p.8 (PDF p.35) and Exhibit ES-4 (NGCC), p.9 (PDF p.36). Caveats:
- T1 p.3 (PDF p.30): "All plant configurations were evaluated based on installation at a greenfield site." Capacity factor 85% for PC and NGCC.
- These are NOT retrofit performance figures (GAP: retrofit penalties are not in this dossier).
- "All cases sequester the CO2 offsite." (ES-1 footnote D)
- Capture-rate basis (footnote D): "The capture rate for PC and NGCC cases is based on the total feedstock minus unburned carbon in ash (PC cases)."

| Case | Capture | Net output (MWe) | Aux power (MWe) | Net HHV efficiency (%) | CO₂ lb/MWh-net (source) | kg/MWh-net (derived ×0.4536) |
|---|---|---|---|---|---|---|
| SubC PC B11A | 0% | 650 | 38 | 38.6 | 1,790 | ≈812 |
| SubC PC B11B.90 | 90% | 650 | 118 | 30.2 | 230 | ≈104 |
| SubC PC B11B.95 | 95% | 650 | 124 | 29.7 | 117 | ≈53 |
| SC PC B12A | 0% | 650 | 36 | 40.2 | 1,718 | ≈779 |
| SC PC B12B.90 | 90% | 650 | 113 | 31.7 | 219 | ≈99 |
| SC PC B12B.95 | 95% | 650 | 118 | 31.2 | 111 | ≈50 |
| NGCC F B31A | 0% | 727 | 14 | 53.6 | 755 | ≈342 |
| NGCC F B31B.90 | 90% | 645 | 47 | 47.6 | 85 | ≈39 |
| NGCC F B31B.95 | 95% | 640 | 49 | 47.3 | 43 | ≈20 |
| NGCC H B32A | 0% | 992 | 17 | 55.1 | 735 | ≈333 |
| NGCC H B32B.90 | 90% | 883 | 62 | 49.0 | 83 | ≈38 |
| NGCC H B32B.95 | 95% | 877 | 65 | 48.7 | 42 | ≈19 |

Derived (arithmetic on T1 values; label as derived on any page):
- Efficiency penalty: SC PC 40.2→31.7% (−8.5 pts) at 90% capture; NGCC F 53.6→47.6% (−6.0 pts); NGCC H 55.1→49.0% (−6.1 pts).
- PC design holds 650 MW net by raising thermal input: SC PC 1,617,359→2,054,118 kWt (+27.0%).
- NGCC design holds fuel constant (205,630 lb/hr F-class), so net output falls 727→645 MW (−11.3%); H-class 992→883 MW (−11.0%).
- Because of the penalty, the per-MWh net emission-rate reduction at 90% capture is smaller than 90%: SC PC 1,718→219 lb/MWh = −87.3%; NGCC F 755→85 = −88.7%.

**T2 IPCC AR5 WGIII Annex III, Table A.III.2, "Emissions of selected electricity supply technologies (gCO2eq/kWh)"**, p.1335 (PDF p.7) [third-party, 2014; CCS listed under "Pre-commercial Technologies"].

| Technology | Direct emissions min/median/max | Infrastructure & supply chain | Methane emissions (typical) | Lifecycle min/median/max |
|---|---|---|---|---|
| Coal — PC | 670 / 760 / 870 | 9.6 | 47 | 740 / 820 / 910 |
| Gas — Combined Cycle | 350 / 370 / 490 | 1.6 | 91 | 410 / 490 / 650 |
| CCS — Coal — PC | 95 / 120 / 140 | 28 | 68 | 190 / 220 / 250 |
| CCS — Coal — IGCC | 100 / 120 / 150 | 9.9 | 62 | 170 / 200 / 230 |
| CCS — Coal — Oxyfuel | 14 / 76 / 110 | 17 | 67 | 100 / 160 / 200 |
| CCS — Gas — Combined Cycle | 30 / 57 / 98 | 8.9 | 110 | 94 / 170 / 340 |

INFERENCE grounded in T2: the methane column rises with CCS (coal PC 47→68; gas CC 91→110). This illustrates why upstream fuel effects, which the S18 Guidelines say "can often be ignored", are not negligible for capture retrofits with an energy penalty. Life-cycle CCS-gas (median 170) exceeds direct emissions (median 57) by more than the direct value.

**T4 Grubert & Sawyer 2023: lock-in and capacity-factor effects (abstract, verbatim)** [third-party]:
> "the 45Q tax credit for carbon oxide sequestration, incentivizes emitters to maximize production and sequestration of carbon oxides, not abatement." … "This analysis introduces a model and investigates six scenarios for lifespan extension and capacity factor changes to show that US CCS fossil power sector retrofits could demand $0.4–$3.6 trillion in 45Q tax credits to alter greenhouse gas emissions by −24% ($0.4 trillion) to +82% ($3.6 trillion) versus business-as-usual for affected generators."

The reply (T5, abstract) responds to a DOE commentary (Robert Kennedy) that disputed whether "regulatory structures would prevent the negative outcomes". The authors write: "We share a belief that many of these loopholes can be closed, and disagree that they have already been closed." This is contested literature; present it as one modeled result with the dispute noted.

**T3 IEAGHG summary of IEA CCUS in Clean Energy Transitions (2020), p.2** [third-party, secondary]:
> "If these assets were to continue to operate unconstrained throughout their technical lives, they would emit more than 600 billion tonnes of CO2 by 2070 … over the next decade, more than a half of CCUS deployment must be dedicated to addressing emissions from these existing assets, requiring retrofits in both the power and industry sectors."

Also: "Today, with a little over 20 operating CCUS facilities, the vast majority are associated with natural gas processing". GAP: the original IEA wording was not retrieved (403).

**GHG Protocol illustrative margins (S14 p.17):** gas OM "roughly ~800 lb CO₂/MWh", coal BM "roughly ~2,000 lb CO2/MWh". These are illustrative, not data.

**AMI TWG member comment (S11a, p.4):** "Some members suggested that gas is typically dispatched after coal and nuclear so marginal emission factors would be lower in many places." This is a member view, not a finding.

INFERENCE (coal vs gas):
- Coal capture moves more tonnes per MWh, so its primary effect per MWh is larger (≈680 vs ≈300 kg/MWh-net difference at 90% capture, derived from T1).
- Coal also has a larger efficiency penalty and a higher residual rate.
- Gas has higher upstream methane per kWh in T2 (110 vs 68 g/kWh with CCS).
- Lock-in risk from life extension (T4) applies to both. GAP: no source here quantifies coal vs gas separately.

---

## Q6. Interplay with scope 2 market-based claims (Statement 2) and impact claims (Statement 3)

**F6.1 Scope 2 contractual instruments convey an emission rate, not an impact.** [GHGP-inforce] S22 Table 7.1 (p.60, PDF p.62): "All contractual instruments used in the market-based method for scope 2 accounting shall: 1. Convey the direct GHG emission rate attribute associated with the unit of electricity produced. 2. Be the only instruments that carry the GHG emission rate attribute claim associated with that quantity of electricity generation. …"

S22 §4.2 "Emission rate approach" (p.28, PDF p.30): "This guidance does not support an 'avoided emissions' approach for scope 2 accounting due to several important distinctions between corporate accounting and project-level accounting. However, companies can report avoided grid emissions from energy generation projects separately from the scopes using a project-level accounting methodology."

S22 §6.9 (p.52, PDF p.54):
> "Avoided emissions estimations are not necessarily equivalent to global emissions reductions from additional projects and should therefore not be used to reduce a company's footprint." … "However, if the project operates in a jurisdiction with an emissions cap on the power sector, or comes from an energy generation facility also producing verified emission reductions (also termed a GHG offset), the company should not make public claims about avoided emissions. The avoided grid emissions will either be zero, in the case of a cap as regulated entities may emit up to the level of the cap, or already represented in claims by the offset purchaser."

**F6.2 LSR inventory rule for purchasers of electricity from a capture facility** (B1, S21 p.359): such purchasers "Do not report scope 2 emissions for the CO2 that is captured and stored in a geologic reservoir". INFERENCE: in an inventory the purchaser's claim is about the emission rate of the electricity (attributional, Statement 1 or 2), not about avoided grid emissions.

**F6.3 Double counting across Statements 2 and 3: options on the table** [GHGP-revision]. S6 (PDF p.27), "Mutual exclusivity between Statement 1, 2, and 3":
> "Option 1: Companies may account and report changes in GHG emissions [and removals, if applicable] resulting from a single activity through Statement 2 and Statement 3 as long as the quantified impacts of the activity are different and there is no double counting of impacts across the two statements. Option 2: Companies shall not account and report changes in GHG emissions [and removals, if applicable] from a single action in both Statement 2 and Statement 3. … Option 3: Companies may account and report [emissions/removals or changes in emissions/removals] resulting from a single activity through Statement 2 or Statement 3. However, if the organization reports changes in GHG emissions [and removals, if applicable] in Statement 2 then, it shall also quantify and report in Statement 3."

Proposed ISO text in the same slide: "Statement #1, statement #2, and statement #3 provide different perspectives of the same organization and therefore should not be seen as additive. Thus, the results from each statement shall be kept separate and shall not be added or subtracted from each other." S5 p.4: "the working group concluded that the statements are not mutually exclusive".

S7c (PDF p.14) poses the open questions: "Statement 1 vs Statement 3 (non credits): Should companies report an action in statement 1 and also quantify and report the consequential impact of that instrument purchase in statement 3? Should that be required, optional, or prohibited? Statement 2 vs Statement 3 (credits): …". S7c's boiler example (PDF p.10): "The full impacts of the boiler could be calculated in statement 3 for the company – The downstream scope 3 impacts could be reported in statement 1 for the company • Is it ok to report both? - yes".

S1 Annex A (p.44) Q32 (Statement 3): "Should double claiming be avoided between an organization purchasing a physical product and an organization purchasing a commodity certificate from the same product if they are unbundled? Should there be co-claiming and if so how should co-claiming be reported?"

**F6.4 Statement 2 impact direction.** S5 p.6: "The Secretariat described the direction of travel as being that what is reported in Statement 2 should have a demonstrated impact going beyond business as usual." S7c (PDF p.19): "Option 3 was agreed: Additionality required for Statement 2." Statement 2 design: "Principles level: Additionality is the principle for all sectors … Details for how to operationalize it TBD including role for sector-specific approaches." S1 fn 3 (p.5): "No changes will be made in the AMI TWG regarding the requirements for scope 2 location-based and market-based reporting."

INFERENCE: whether Statement 2's additionality applies to scope 2 EACs is unresolved. Scope 2 market-based rules remain with the Scope 2 TWG. S13, the WattTime/academics complaint, objects that the proposed Scope 2 MBM "excludes the principle of additionality" (S13 p.2).

**F6.5 Who claims what (INFERENCE built from F1.1, F6.1–F6.3 and CRS's "whose action" point):**
- **Plant owner/generator.** Statement 1: scope 1 net of captured-and-stored CO2 (S21). Statement 3: "within organizational boundary impacts" of its own retrofit or new-build decision, against a baseline and subject to additionality (S1 p.22; S7c PDF p.18).
- **EAC buyer.** Statement 2 (market-based) carries the instrument's emission-rate attribute. Under S22 QC1/QC2 only one claimant per MWh is allowed, and with capture the rate is the plant's residual rate, not zero. INFERENCE on the rate: GAP, no source states how a CCS plant's EAC rate is set.
- **The buyer's own Statement 3 claim.** It would require showing that the buyer's action (e.g., a long-term contract) caused the retrofit or new build (S14 timing and contractual tests; S15 p.11 tiering of "association" vs "causal" claims).
- **The problem.** The generator's Statement 3 impact and the buyer's Statement 3 impact describe the same physical change. The rules to prevent both counting it are not written. S15 p.4 notes "multiple parties (utilities, buyers, aggregators, storage owners) could end up claiming credit for the same avoided emissions without clear attribution rules". S4 p.36 says respondents "want clear rules defining who can report a benefit when multiple parties are involved in the same intervention".
- **Caps.** Under S22 §6.9, if the plant sits under a power-sector emissions cap, or the captured tonnes were also credited, the company "should not make public claims about avoided emissions".

**F6.6 Scope 2 consultation respondents framing fossil+CCS as "clean firm" under hourly matching** [GHGP-revision, respondent opinion] (S24):
- Princeton University ZERO Lab (academia; id 677; Q073): "Hourly matching drives decarbonization by sending signals and investment direction to deploy technologies necessary to decarbonize all hours of the day, including batteries, demand flexiblity, longer-duration storage technologies, and 'clean firm' generation technologies (advanced nuclear, geothermal, fossil w/CCS, hydrogen etc)".
- ExxonMobil (company; id 943; Q141): "Hourly matched PPAs may require a shift from variable renewable to low carbon firm dispatchable power generation: nuclear, CCGT+CCS, advanced geothermal."
- Redacted (company; id 871; Q141): "The changes can be expected to drive procurement of more clean firm technologies like nuclear and natural gas + CCS."
- SmartestEnergy Ltd. (energy supplier; id 510; Q020): "Current MBM risks cherry‑picking and obscuring the role of other generation sources in energy transition including nuclear, fossil fuelled with carbon capture, energy storage and hydrogen-to-power."

INFERENCE: this is the channel by which a CCS plant's attributes would enter Statement 2. It is separate from any Statement 3 impact claim.

---

## Comparison matrix (retrofit / new build × coal / gas × CCS / CCU)

Legend: SOURCE = stated in a cited source; INF = inference from cited building blocks.

| | Retrofit, coal, CCS | Retrofit, gas, CCS | New build, coal, CCS | New build, gas, CCS | Any, CCU (utilization) |
|---|---|---|---|---|---|
| Statement 1 inventory | SOURCE (S21 p.359): captured+stored CO2 not in scope 1; "reflect … as a reduction … compared to previous years"; capture-process, fugitive and T&S emissions counted | SOURCE (same) | SOURCE (S21): residual + process + fugitive in scope 1; INF: no year-over-year reduction because the source is new | SOURCE / INF (same) | SOURCE (S21 p.347, p.351): not a captured-CO2 pathway; the fossil CO2 stays in scope 1; product storage optional (Ch.15) |
| Statement 3 primary effect | INF from S18 Table 2.1 + S17 Box 8.2/8.7: at-plant rate reduction vs historical unabated rate (a "plant itself" effect) | INF (same) | INF from S18 Table 2.1 NGCC row + Eq.1: Gen × (wBM+(1−w)OM − residual rate) | INF (same) | INF from S17 §2.13/§5.3.2: displaced product/CO2 source; net of re-release |
| Baseline | SOURCE (S17 Box 8.7): historical emission rate, unless end of useful life (Box 8.2) → then replacement generation (INF) | SOURCE / INF (same) | SOURCE (S18 §2.3, §5.3): BM/OM; firm → w = 1 | SOURCE / INF (same) | INF: market-equivalent product system (S17 §2.13) |
| Energy-penalty treatment | INF: if output is held, extra coal → upstream secondary effect; numbers SOURCE (T1, greenfield): +27% thermal input SC PC | INF: lost output (T1 −11%) valued at the margin, analogous to Box 8.2 effect (2) | SOURCE (T1): embedded in the residual rate; INF: affects net MWh credited | SOURCE (T1) / INF (same) | INF: same penalty logic applies |
| Upstream fuel | SOURCE (S17 §5.3.2 coal-mine CH4; T2 methane 47→68 g/kWh) | SOURCE (S17 gas leaks; T2 91→110) | SOURCE (T2) | SOURCE (T2) | INF |
| Lifetime extension / lock-in | INF (S17 Box 8.2 barrier) + SOURCE (T4 −24% to +82%) | INF + SOURCE (T4 covers coal and gas retrofits) | INF: plant life (T1: "thirty-year life") vs BM | INF (same) | GAP |
| Additionality tests (S14) | INF: see Q3 table; regulatory and timing are jurisdiction/fact-specific | INF (same) | INF (same) | INF (same) | GAP (no S14 coverage) |
| Permanence / reversal | SOURCE (S21): storage monitoring; reversal reporting | SOURCE (same) | SOURCE (same) | SOURCE (same) | SOURCE (S21 p.351): "temporary storage, followed by re-release" |
| EOR variant | SOURCE (S21 Req.19.GS): downstream oil/gas life cycle counted; consequential displacement per Ch.16 | SOURCE (same) | SOURCE (same) | SOURCE (same) | n/a |
| Where reported (plant owner) | SOURCE (S1 p.22) / INF: Statement 3 "within organizational boundary"; S2 CHP example analog | SOURCE / INF (same) | SOURCE / INF (same) | SOURCE / INF (same) | INF |

---

## Numbers you may use on a page

| Value | Unit | What | Source, page |
|---|---|---|---|
| 4 | statements | Physical, market-based, GHG impact, non-GHG indicators | S1 p.4 |
| 80% (293 of 366) | % respondents | "It should be included" for the GHG impact statement | S4 p.23 |
| 69% | % | strongly agree/agree that Statement 3 should reflect positive and negative impacts (n=351) | S4 p.25 |
| 84% | % | "strong support" or "support" for multi-statement framework | S4 p.3 |
| 437 | valid responses | AMI RFI | S4 p.3 |
| 185 | valid responses | electricity consequential consultation | S15 p.2 |
| 37% / 63% | Yes/No | subgroup formula appropriate (n=133) | S15 p.5 |
| 52% / 48% | Yes/No | include secondary effects (n=110) | S15 p.5 |
| 79% / 21% | each year / lifetime | reporting period (n=103) | S15 p.6 |
| 64% required | % | regulatory test (highest "required") | S15 p.7 |
| 54% not required | % | first-of-its-kind test | S15 p.7 |
| 45% | % | GHGP Guidelines appropriate weighting (n=67) | S15 p.18 |
| ~800 / ~2,000 | lb CO₂/MWh | illustrative gas OM / coal BM | S14 p.17 |
| 1 / 0.5 / 0.5 / 0 | BM weight | Guidelines default weights by firm/peak status | S14 p.17; S18 Fig 5.1 p.31 |
| 0.25; 0.5 then 0.75 | BM weight | CDM Tool07 defaults (wind/solar; other) | S14 p.18 |
| 5 years | years | intervention-lifecycle OM-only period before BM | S14 p.18 |
| 10 years | years | Guidelines default quantification period | S18 p.71 (PDF p.73) |
| "more than a few percent" | of primary effect | secondary-effect inclusion threshold | S18 p.29 (PDF p.31) |
| 5% (e.g.) | of primary effect | respondent-suggested materiality threshold | S15 p.6 |
| 90 / 95 | % | NETL capture-rate cases | T1 ES-1 p.2 |
| 1,718 → 219 → 111 | lb CO₂/MWh-net | SC PC at 0/90/95% capture | T1 ES-3 p.8 (PDF p.35) |
| 1,790 → 230 → 117 | lb CO₂/MWh-net | SubC PC at 0/90/95% | T1 ES-3 |
| 755 → 85 → 43 | lb CO₂/MWh-net | NGCC F-class at 0/90/95% | T1 ES-4 p.9 (PDF p.36) |
| 735 → 83 → 42 | lb CO₂/MWh-net | NGCC H-class at 0/90/95% | T1 ES-4 |
| 40.2 → 31.7 | % HHV | SC PC net efficiency, 0→90% capture | T1 ES-3 |
| 53.6 → 47.6; 55.1 → 49.0 | % HHV | NGCC F; H net efficiency, 0→90% | T1 ES-4 |
| 727 → 645; 992 → 883 | MWe net | NGCC F; H net output, 0→90% capture (fixed fuel) | T1 ES-4 |
| 36 → 113 | MWe | SC PC auxiliary power, 0→90% | T1 ES-3 |
| 85% | capacity factor | NETL PC/NGCC assumption | T1 p.3 (PDF p.30) |
| 30 | years | NETL plant life assumption | T1 p.3 |
| 740/820/910 | gCO2eq/kWh | Coal PC lifecycle min/median/max | T2 Table A.III.2 p.1335 |
| 410/490/650 | gCO2eq/kWh | Gas CC lifecycle | T2 |
| 190/220/250 | gCO2eq/kWh | CCS coal PC lifecycle | T2 |
| 94/170/340 | gCO2eq/kWh | CCS gas CC lifecycle | T2 |
| 47 / 68 | gCO2eq/kWh | methane, coal PC without / with CCS | T2 |
| 91 / 110 | gCO2eq/kWh | methane, gas CC without / with CCS | T2 |
| −24% to +82% | % emissions vs BAU | modeled CCS retrofit outcomes under 45Q | T4 abstract |
| $0.4–$3.6 trillion | USD | 45Q credits in those scenarios | T4 abstract |
| >600 | GtCO2 by 2070 | existing-asset committed emissions (secondary report of IEA) | T3 p.2 |
| "a little over 20" | facilities | operating CCUS facilities (2020, secondary) | T3 p.2 |

Derived values, to be labeled "derived" on a page: kg/MWh conversions (×0.4536); efficiency penalties of 8.5 and 6.0 percentage points; +27.0% coal input; −11.3% NGCC output; per-MWh reduction of 87.3% (SC PC 90%) and 88.7% (NGCC F 90%).

---

## Signals of future direction (revision materials only, dated)

1. **2025-07 ISB meeting (reported in S9a slide p.25, dated 2025-09-16).** The ISB did not support the Marginal Impact Method (MIM) going to consultation ("7/11 members" had significant concerns). Concerns included "Some concerns that the additionality test, as described in the MIM proposal, is not sufficiently rigorous to support avoided emission claims" and "Concern about a standard 50:50 weighting across build and operating margin impacts". S9a p.26: "The ISB directed this work to continue within the Actions and Market Instruments TWG, which will enable the issue to be addressed in a cross-sector manner". S9b p.4: "one of the areas of ISB concern was related to netting, not the broader consideration of avoided emissions."
   - Note the wording difference: S9a p.25 says "Some concerns that the additionality test … is not sufficiently rigorous". The AMI Meeting 10 deck (2025-11-12, PDF p.36; https://ghgprotocol.org/sites/default/files/2025-12/AMI-Meeting10-Presentation-20251112.pdf) says "Consensus view that the additionality test, as described in the MIM proposal, is not sufficiently rigorous to support avoided emission claims."
2. **2025-10-20 to 2026-01-31.** Consequential electricity consultation (S14); summary published July 2026 (S15).
3. **2026-03 White Paper (S1 p.7).** Phase 2 includes "Coordinating with the Scope 2 TWG on how to further develop recently proposed consequential accounting methodologies for the electricity sector within Statement 3 (GHG impact statement)."
4. **2026-06-30 to 07-02 in-person TWG (S7).**
   - Additionality required for Statement 3 (draft "shall" text).
   - Four baseline types agreed.
   - Annual ex-post time boundary proposed.
   - "Include all significant GHG effects" boundary proposed.
   - "Side topic: no aggregation of avoided emissions across subcategories" (S7b PDF p.5).
5. **2026-09 RFI summary (S4 p.40).** "Additional requirements and guidance will be developed to avoid inappropriate comparisons, aggregation, netting, or substitution across statements." Also: "a draft consolidated Corporate Standard including AMI requirements will be produced for public consultation in Q2 2027." (S2 p.4 said Q3 2027; S1 p.2 said "2027".)
6. **2026-09-09 TWG 2.08 (S5).**
   - "additionality must be present in Statement 3".
   - ISO WG4: statements "not mutually exclusive"; Statement 3 references "external standards such as ISO 14064-2".
   - Claims-language debate: "reduced emissions rather than avoided emissions".
   - Next TWG call 2026-10-07 (Meeting 2.09). I did not retrieve minutes of that meeting (not in the repository listing when checked).
7. **2026-08-24 (S13).** The ISB classified the Sinha/Das/WattTime letter as a complaint. It is about additionality in Scope 2 MBM: "a reporting entity could purchase low-quality, non-additional RECs from existing resources … and claim 100% clean energy with no actual impact on grid emissions." The ISB reply: topics "will be given due consideration by the Scope 2 Technical Working Group".
8. **Consolidated SDP (S12, 2026-07-29).** Describes the second consultation as "consequential accounting methods for estimating avoided emissions from electricity-sector actions." It also states that AMI phase 1 ran "From March 31 to May 31, 2026". S4 p.3 says the RFI ran "to June 15, 2026". Dates differ; report both.

---

## Open questions / gaps

- **GAP (central): no GHG Protocol text on CCS/point-source capture in consequential/impact accounting.** Verified by full-text search of S1, S2, S4, S5, S6, S7a–c, S9, S12, S14, S15, S17, S18 and S20. Mentions of CCS are limited to:
  - LSR Ch.14 inventory rules (S21);
  - BECCS as a mitigation-action example (S20 Table 16.2, p.402, PDF p.7);
  - a "Carbon capture and storage" sink row in P&A Table 6.3 (S19 p.54);
  - the P&A Energy Supply draft intro listing CCS as a measure (S25 p.2);
  - a member noting IPCC CCUS report timing (S11c, AMI Meeting 4 minutes, 2025-02-19, p.4);
  - respondent free text (S16, S24).
- **GAP: mutual exclusivity of Statements 1/2/3** (whether a captured tonne can appear in Statement 1 and Statement 3). Undecided (S1 p.35; S6 PDF p.27 options; S7c).
- **GAP: Statement 3 time basis.** TWG proposal is annual ex-post (S7b), consultation majority favors annual (S15), while the Guidelines use a default 10 years and lifetime (S18). Lifetime-extension effects of a retrofit are hard to express on an annual basis. No source resolves this.
- **GAP: how a CCS plant's EAC emission rate would be set** for Scope 2 MBM / Statement 2.
- **GAP: retrofit-specific performance.** T1 covers greenfield plants only. IEAGHG 2011-02 (retrofit study) and the IEA report pages could not be retrieved (403). No source in this dossier gives retrofit capture penalties.
- **GAP: CCU baselines, re-release timing and EOR displacement rates.** No quantified source.
- **GAP: marginal-emissions datasets (WattTime, Electricity Maps, etc.) applied to CCS plants.** None found. S14's dataset table lists providers but says nothing on CCS.
- **GAP: Carbon Capture Coalition, RMI and Princeton CCS-in-power analyses** were not retrieved. Princeton ZERO Lab appears only as an S24 respondent.
- **Ambiguity:** the AMI White Paper refers to a "section 9" on quality criteria that does not exist (S1 p.33).
- **Numbering ambiguity in repository files:** "AMI-Meeting20" = "Meeting #2.08"; "AMI-Meeting7-…20260715" = "Meeting number 2.07"; S8 points outcomes to "TWG Meeting #19".
- **Terminology conflict:** P&A Standard Table 6.3 lists CCS as a "sink category"; LSR Ch.14 says fossil capture "is not accounted for and reported as a removal".

---

## Suggested visuals

1. **Baseline-vs-project bars (retrofit, then new build).** Two small multiples using T1 SC PC or NGCC numbers (label kg values as derived).
   - Retrofit panel: bars for "historical unabated plant" vs "plant with capture". Overlay stacked add-ons: replacement MWh for lost output (at an illustrative OM rate, with that rate explicitly labeled hypothetical), upstream fuel, T&S.
   - New-build panel: "baseline = BM rate × generation" vs "project = residual rate × generation", shown for two BM cases (fossil-heavy BM vs mostly clean BM) so the sign can flip.
   - Must show: residual emissions, the energy penalty, and that the 90% capture rate ≠ 90% per-MWh reduction.
   - Must not show: specific OM/BM values as if sourced (only S14's "~800 / ~2,000 lb" are illustrative GHG Protocol numbers); retrofit numbers from T1 as if they were retrofit data.
2. **Primary/secondary effects map (causal chain).**
   - Center node: the capture action.
   - Primary: at-plant rate reduction (S17 Box 8.7 / S18 Table 2.1).
   - Grid: lost or added MWh → OM/BM.
   - Secondary: one-time (construction, wells), upstream (coal-mine CH4, gas leaks), downstream (transport, injection, fugitive, EOR oil life cycle), market-mediated (EOR displacement, dispatch), lifetime extension.
   - Tag each edge with its source block (B1–B6).
   - Must not imply the GHG Protocol has published this map. Label it "INFERENCE assembled from …".
3. **2×2: Retrofit / New build × Attributional (Statement 1) / Consequential (Statement 3).**
   - Retrofit × Statement 1: "scope 1 falls by captured+stored CO2; process emissions stay" (SOURCE S21).
   - Retrofit × Statement 3: "at-plant effect vs historical rate + grid effects; end-of-life test decides baseline" (INF).
   - New build × Statement 1: "new scope 1 residual source" (SOURCE/INF).
   - New build × Statement 3: "system change only: displaces BM/OM" (INF).
   - Footnote: mutual exclusivity unresolved; no netting across statements (S1 p.28; S4).
4. **Nine-tests checklist.** Rows = the nine S14 tests (verbatim short names). Columns = the four cases. Cells = "depends on X" phrasing (not pass/fail ticks), with S15 required/optional/not-required percentages in a side column.
   - Must state that the tests were framed "for renewable energy projects" and that none mentions retrofits.
   - Must show the respondent-proposed "Incrementality" test as a separate, non-draft row.
5. **Statement placement diagram** (adapted from S1 Figure 6): where the plant owner's numbers vs the EAC buyer's numbers sit (Statement 1 scope 1; Statement 2 scope 2 MBM; Statement 3 within-org-boundary vs sector-associated). Show a "double-claiming risk" bracket linking the generator's and buyer's Statement 3, marked as an unresolved GAP.
