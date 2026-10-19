# R3 — Electricity storage in scope 2 market-based accounting under hourly matching

- Date compiled: 2026-10-19
- Author: research shard R3
- Scope: how storage (batteries, pumped hydro, other same-carrier storage) is, could be, and is proposed to be accounted for in the scope 2 market-based method (MBM), especially under hourly matching; the "net load" problem; incrementality/vintage; implications for developers, generators and retail suppliers.
- Bottom line up front (each point is supported in the body):
  1. The 2015 Scope 2 Guidance (in force) does not address storage accounting. The only "storage" mentions are a passing reference in Box 4.1 and the phrase "storage of carbon". GAP.
  2. The Oct 2025 Phase 1 consultation draft contains **no storage-specific accounting rule**, **no "energy attribute certificates for storage" proposal**, and **no incrementality/additionality/commercial operation date (COD) requirement**. Storage shows up only in (a) the definition of consumption-based location-based factors ("stored electricity produced in a previous time period"), (b) the rationale text, and (c) the answer options of questions 45, 72, 140 and 147.
  3. Storage guidance is formally scheduled for the separate, informative **Scope 2 Guidance (Version 2.0)**, timeline TBD (Consolidated SDP, 29 Jul 2026).
  4. The current direction (Sep–Oct 2026) is "Method 1" = hourly matching + deliverability + **incrementality** ("age limit on eligible resources for voluntary claims (shall)"). The only storage reference in the incrementality design is a bare list item: "qualifying storage". The details are open for the TWG.
  5. The mechanics for storage hourly accounting exist only in third-party schemes. EnergyTag GC Scheme Standard v2: certificates are cancelled on charge, Storage Charge/Discharge Records are kept, and certificates are re-issued on discharge, inheriting the attributes net of measured losses. US 45V final regulations (Jan 2025): stored-electricity certificates count in the discharge hour, and "Storage systems need not themselves meet the incrementality requirement", but the stored certificates must meet incrementality "based on the attributes of the generator". EU Regulation 2023/1184 (renewable fuels of non-biological origin, RFNBO): allows only a "**new** storage asset" behind the same network connection point.

---

## Sources

| id | title | publisher | date / version | URL | local path | tier |
|---|---|---|---|---|---|---|
| S1 | GHG Protocol Scope 2 Guidance | WRI/WBCSD | 2015 (file "Final_Sept26") | https://ghgprotocol.org/sites/default/files/standards/Scope%202%20Guidance_Final_Sept26.pdf | `/tmp/claude-0/-home-user-scope-2-consult/b28ef211-cbcf-518f-a8b6-e173dc77c534/scratchpad/downloads/R3/s2g2015.pdf` | [GHGP-inforce] |
| S2 | Public Consultation – Scope 2 | GHG Protocol | Oct 2025 (consultation 20 Oct 2025–31 Jan 2026) | https://ghgprotocol.org/sites/default/files/2025-10/GHG-Protocol-Scope2-Public-Consultation.pdf | `.../downloads/R3/s2pc2025.pdf` | [GHGP-revision] |
| S3 | GHG Protocol Governance Overview, Annex A Decision-making criteria | GHG Protocol | Annex A v1.0 24.09.2024; Overview v1.1 26 Nov 2024 | https://ghgprotocol.org/sites/default/files/2024-09/Governance-Overview.pdf | `.../downloads/R3/Governance-Overview.pdf` | [GHGP-revision] (governance) |
| S4 | Scope 2 Public Consultation Summary (full) | GHG Protocol | 25 Aug 2026 (128 pp) | https://ghgprotocol.org/sites/default/files/2026-08/S2-PublicConsultationSummaryofFeedback-2026.08.25.pdf | `.../downloads/R3/repo/S2-PublicConsultationSummaryofFeedback-2026.08.25.pdf` | [GHGP-revision] |
| S5 | Scope 2 Public Consultation Feedback Summary: Executive Summary | GHG Protocol | 29 Jul 2026 | https://ghgprotocol.org/sites/default/files/2026-07/S2-ExecutiveSummary-PublicConsultation%20ummaryofFeedback-2026.07.29.pdf | `.../downloads/R3/repo/S2-ExecutiveSummary-PublicConsultation_ummaryofFeedback-2026.07.29.pdf` | [GHGP-revision] |
| S6 | Scope 2 Market-based Method Update: From 2025-2026 Public Consultation to Current Status (PDF; identical text published as blog dated 10.16.2026) | GHG Protocol | 16 Oct 2026 (3 pp) | https://ghgprotocol.org/sites/default/files/2026-10/S2-Market-Based-Method-Update-20261006.pdf ; blog: https://ghgprotocol.org/blog/scope-2-market-based-method-update-2025-2026-public-consultation-current-status | `.../downloads/R3/repo/S2-Market-Based-Method-Update-20261006.pdf` | [GHGP-revision] |
| S7 | Scope 2 TWG Meeting #23 Minutes | GHG Protocol | 6 Oct 2026 | https://ghgprotocol.org/sites/default/files/2026-10/S2-Meeting23-Minutes-20261006.pdf | `.../downloads/R3/m23min.pdf` | [GHGP-revision] |
| S8 | Scope 2 TWG Meeting #23 Presentation | GHG Protocol | 6 Oct 2026 (73 slides) | https://ghgprotocol.org/sites/default/files/2026-10/S2-Meeting23-Presentation-20261006.pdf | `.../downloads/R3/repo/S2-Meeting23-Presentation-20261006.pdf` | [GHGP-revision] |
| S9 | Consolidated Corporate Standard – Standard Development Plan (SDP) | GHG Protocol | 29 Jul 2026 | https://ghgprotocol.org/sites/default/files/2026-07/Consolidated-StandardDevelopmentPlan%28SDP%29-2026.07.29.pdf | `.../downloads/R3/repo/Consolidated-StandardDevelopmentPlan(SDP)-2026.07.29.pdf` | [GHGP-revision] |
| S10 | Scope 2 TWG Discussion Paper ("Working Draft; do not cite") | GHG Protocol | 26 Nov 2024 | https://ghgprotocol.org/sites/default/files/2024-11/S2-DiscussionPaper-20241126.pdf | `.../downloads/R3/repo/S2-DiscussionPaper-20241126.pdf` | [GHGP-revision] |
| S11 | Scope 2 TWG minutes and decks, meetings 2, 3, 4&5, 7, 10, 12, 15, 16 (indicative vote supporting info), 21 | GHG Protocol | Nov 2024–Dec 2025 | Governance repository, Workstream = Scope 2: https://ghgprotocol.org/standards-development-and-governance-repository?field_workstream_target_id=321 (individual file URLs are under /sites/default/files/2024-11 … 2025-12/, e.g. S2-Meeting7-Minutes-20250129_0.pdf, S2-Meeting10-Presentation-20250319.pdf, S2-Meeting16-Indicative-Voting-Supporting-Information-20250625.pdf, S2-Meeting21-Minutes-20251210.pdf) | `.../downloads/R3/repo/` | [GHGP-revision] |
| S12 | Consequential Electricity-Sector Emissions Impacts – Summary of Feedback | GHG Protocol | 29 Jul 2026 | https://ghgprotocol.org/sites/default/files/2026-07/Consequential-ElectricitySectorEmissionsImpacts-SummaryofFeedback-2026.07.29.pdf | `.../downloads/R3/repo/` | [GHGP-revision] |
| S13 | Repo consultation dataset (questions.csv, question_options.csv, responses_long.csv, response_selections.csv, respondents.csv), built from S2-PublicConsultationFeedback-RawData-2026.07.29.xlsx | this repo / GHG Protocol raw data | raw data 29 Jul 2026 | `/home/user/scope-2-consult/data/` | `/home/user/scope-2-consult/data/` | [GHGP-revision] (raw feedback) |
| T1 | Granular Certificate Scheme Standard, Version 2 | EnergyTag | "Published March 2024" (cover); file is under /2024/12/; PDF creation date 3 Oct 2025 | https://energytag.org/wp-content/uploads/2024/12/EnergyTag_Granular-Certificate-Scheme-Standard-V2.pdf | `.../downloads/R3/ET-GC-Standard-V2.pdf` | [third-party] |
| T2 | Granular Certificate Matching Standard, Version 1 | EnergyTag | "Published March 2024" | https://energytag.org/wp-content/uploads/2024/03/Granular-Certificate-Matching-Standard_V1.pdf | `.../downloads/R3/ET-GC-Matching-Standard-V1.pdf` | [third-party] |
| T3 | EnergyTag FAQ (web page) | EnergyTag | accessed 2026-10-19 | https://energytag.org/faq/ | `.../web/faq.html` (scratchpad) | [third-party] |
| T4 | Credit for Production of Clean Hydrogen and Energy Credit (final regulations, 26 CFR 1.45V), 90 FR 2224 | US Treasury / IRS | 10 Jan 2025, FR Doc. 2024-31513 | https://www.govinfo.gov/content/pkg/FR-2025-01-10/pdf/2024-31513.pdf | `.../downloads/R3/45V-final-2024-31513.pdf` | [third-party] (regulatory) |
| T5 | Commission Delegated Regulation (EU) 2023/1184 (RFNBO methodology) | European Commission | 10 Feb 2023; OJ L 157/11, 20.6.2023 | https://publications.europa.eu/resource/celex/32023R1184 | `.../downloads/R3/eu-2023-1184.html` | [third-party] (regulatory) |
| T6 | FaStGO Task 2: Explanatory notes to the proposal for a revised EN16325 | AIB et al. for European Commission | May 2020 | https://www.aib-net.org/sites/default/files/assets/news-events/AIB%20Project-Consult/FaStGO/FASTGO%20task%202%20part1%20Explanatory%20notes%20to%20text%20proposals%20for%20revised%20EN16325_FaStGO%20consultation.pdf | `.../downloads/R3/fastgo-explanatory.pdf` | [third-party] |
| T7 | 24/7 Carbon-Free Energy: Methodologies and Metrics | Google | February 2021 | https://www.gstatic.com/gumdrop/sustainability/24x7-carbon-free-energy-methodologies-metrics.pdf | `.../downloads/R3/google-247-methodology.pdf` | [third-party] |
| T8 | Scholta & Blaschke, "Temporal matching as an accounting principle for green electricity claims", Nature Communications | peer-reviewed | published 20 Oct 2025; doi:10.1038/s41467-025-65125-z | https://www.nature.com/articles/s41467-025-65125-z | `.../web/natcomm.html` | [third-party] |
| T9 | Riepin & Brown, "On the means, costs, and system-level impacts of 24/7 carbon-free energy procurement", Energy Strategy Reviews | peer-reviewed | Jul 2024; doi:10.1016/j.esr.2024.101488 (abstract via DOAJ) | https://doaj.org/article/c0ec8720f86a420a87c3ccc4a63b7326 | none (abstract only) | [third-party] |
| T10 | Xu, Ricks, Manocha, Patankar, Jenkins, "System-level impacts of voluntary carbon-free electricity procurement strategies", Joule | peer-reviewed | Feb 2024; doi:10.1016/j.joule.2023.12.007. Quoted abstract is from the 2022 SSRN preprint "System-Level Impacts of 24/7 Carbon-Free Electricity Procurement" (doi:10.2139/ssrn.4248431) via Crossref | https://doi.org/10.1016/j.joule.2023.12.007 | none | [third-party] |
| T11 | Riepin, Jenkins, Swezey, Brown, "24/7 carbon-free electricity matching accelerates adoption of advanced clean energy technologies", Joule 9(2) | peer-reviewed | Feb 2025; doi:10.1016/j.joule.2024.101808 | https://www.cell.com/joule/fulltext/S2542-4351(24)00544-0 (HTTP 403 from this session; not read) | none | [third-party] |

Not retrieved / not found (see GAPs): EN 16325:2024 final text (paywalled); PJM-GATS, WREGIS, NAR and M-RETS/CleanCounts storage rules; Microsoft and Peninsula Clean Energy storage methodologies; the "TWG memo – MBM" referenced in the Meeting 23 minutes (not in the public repository).

Page conventions: S1 printed page = PDF page − 2. T4 printed FR page = PDF page + 2223 (e.g., PDF p47 = FR 2270). For S2, S4, S5, S7, S8, S9, S10, T1 and T2, the printed page and slide numbers equal the PDF page numbers.

---

## Key definitions (verbatim, cited)

**Scope 2 Quality Criteria (in force)**. S1, Table 7.1, PDF p62 / printed p60:
> All contractual instruments used in the market-based method for scope 2 accounting shall:
> 1. Convey the direct GHG emission rate attribute associated with the unit of electricity produced.
> 2. Be the only instruments that carry the GHG emission rate attribute claim associated with that quantity of electricity generation.
> 3. Be tracked and redeemed, retired, or canceled by or on behalf of the reporting entity.
> 4. Be issued and redeemed as close as possible to the period of energy consumption to which the instrument is applied.
> 5. Be sourced from the same market in which the reporting entity's electricity-consuming operations are located and to which the instrument is applied.
> In addition, utility-specific emission factors shall:
> 6. Be calculated based on delivered electricity, incorporating certificates sourced and retired on behalf of its customers. Electricity from renewable facilities for which the attributes have been sold off (via contracts or certificates) shall be characterized as having the GHG attributes of the residual mix in the utility or supplier-specific emission factor.
> In addition, companies purchasing electricity directly from generators or consuming on-site generation shall:
> 7. Ensure all contractual instruments conveying emissions claims be transferred to the reporting entity only. No other instruments that convey this claim to another end user shall be issued for the contracted electricity. The electricity from the facility shall not carry the GHG emission rate claim for use by a utility, for example, for the purpose of delivery and use claims.
> Finally, to use any contractual instrument in the market-based method requires that:
> 8. An adjusted, residual mix characterizing the GHG intensity of unclaimed or publicly shared electricity shall be made available for consumer scope 2 calculations, or its absence shall be disclosed by the reporting entity.

**Vintage (QC4 explanation)**. S1 §7.5, PDF p66 / printed p64:
> Criteria 4. Vintage. Vintage reflects the date of energy generation from which the contractual instrument is derived. This is different from the age of the facility. In order to ensure temporal accuracy of scope 2 calculations, this criteria seeks to ensure that the generation on which the emission factors are based occurs close in time to the reporting period for which the certificates (or emissions) are claimed.

Note on terms: in the 2015 text, "vintage" means **generation date, not facility age**. In the 2026 revision materials, the label "Incrementality/ vintage" (S8 slide 34) is used for an **asset age limit**. A page must not conflate the two.

**Facility age (disclosure only, 2015)**. S1 Table 8.1, PDF p70 / printed p68:
> Facility age. Stakeholders may wish to know whether the purchase consists largely of generation attributes from older facilities or more recently constructed projects. Companies should note the year the generation facility that created the certificate/contract was first operational or substantially repowered.

**GHG accounting and reporting principles (2015 wording)**. S1 Ch. 3, PDF p23 / printed p21:
> GHG accounting and reporting shall be based on the following principles:
> •• Relevance. Ensure the GHG inventory appropriately reflects the GHG emissions of the company and serves the decision-making needs of users—both internal and external to the company.
> •• Completeness. Account for and report on all GHG emission sources and activities within the inventory boundary. Disclose and justify any specific exclusion.
> •• Consistency. Use consistent methodologies to allow for meaningful performance tracking of emissions over time. Transparently document any changes to the data, inventory boundary, methods, or any other relevant factors in the time series.
> •• Transparency. Address all relevant issues in a factual and coherent manner, based on a clear audit trail. Disclose any relevant assumptions and make appropriate references to the accounting and calculation methodologies and data sources used.
> •• Accuracy. Ensure that the quantification of GHG emissions is systematically neither over nor under actual emissions, as far as can be judged, and that uncertainties are reduced as far as practicable. Achieve sufficient accuracy to enable users to make decisions with reasonable confidence as to the integrity of the reported information.

Same page:
> Companies may encounter tradeoffs between principles when completing an inventory and should strike a balance between these principles based on their individual business goals.

Annex A (S3, PDF p8) restates these principles, using "reasonable assurance" in place of "reasonable confidence" for Accuracy. It adds "Conservativeness (for GHG reductions and removals)", "Permanence (for removals)" and "Comparability (TBD, subject to TWG and ISB discussion)" as "Additional principles [that] should be considered where relevant".

**Decision-making criteria and hierarchy**. S3 Annex A, PDF pp6–8:
> The criteria are ranked in a hierarchy to aid in decision making. When options present tradeoffs between criteria, the hierarchy should be generally followed, such that, for example, scientific integrity is not compromised at the expense of other criteria, while aiming to find solutions that meet all criteria.

> 1A. Scientific integrity • First, approaches should ensure scientific integrity and validity, adhere to the best applicable science and evidence (including academic literature, modeling or other research) and align with the latest climate science.
> 1B. GHG accounting and reporting principles • Second, approaches should meet the GHG Protocol accounting and reporting principles of accuracy, completeness, consistency, relevance, and transparency.
> 2A. Support decision making that drives ambitious global climate action • Third, approaches should advance the public interest by informing and supporting decision making that drives ambitious actions by private and public sector actors to reduce GHG emissions and increase removals in line with global climate goals. • GHG Protocol accounting frameworks should accurately and completely measure emissions such that the resulting GHG data informs effective individual and systemwide GHG mitigation action in line with global climate goals. Accounting approaches should not support or incentivize actions that are contrary to global climate goals. • Approaches should provide the necessary information to support sector-specific decarbonization in line with climate goals.
> 2B. Support programs based on GHG Protocol and uses of GHG data • Fourth, approaches should promote interoperability with key mandatory and voluntary climate disclosure and target setting programs that are based on GHG Protocol standards, where appropriate, while ensuring policy neutrality. … • Approaches should support appropriate uses of the resulting GHG data and associated information by various audiences …
> 3. Feasibility to implement • Fifth, approaches which meet the above criteria should be feasible to implement, meaning that they are accessible, adoptable, and equitable. …

**Proposed QC4 (temporal correlation)**. S2 §5.1.1, p20:
> Criterion 4. Temporal correlation. All contractual instruments used in the market-based method for scope 2 accounting shall be issued and redeemed for the same hour as the energy consumption to which the instrument is applied, except in certain cases listed in [Exemption to Quality Criteria 4].
> Temporal correlation reflects the simultaneity of the energy supply from which an emission factor is derived and the consumption to which the factor is applied.

**Proposed QC5 (deliverability)**. S2 §5.1.2, pp23:
> Criterion 5. Market Boundaries and alternate methodology for deliverability: All contractual instruments used in the market-based method shall be sourced from generation that is deemed deliverable to the consuming load. Deliverability shall be demonstrated using one of the approved methodologies listed in the table Proposed methodologies for demonstrating deliverability.
> … An electricity generating or consuming facility shall be considered as located at its first point of interconnection to a transmission network.

Deliverability concept (S2 p23):
> … deliverability, which means that electricity from a generator could plausibly be part of the mix serving the reporting entity through an electrically connected grid.

**Consumption-based vs production-based averages (proposed LBM)**. S2 §4.1.1, p10. This is the only storage-specific definitional text in the draft:
> "Consumption-based averages" characterize the weighted-average GHG emission rate of the electricity generation consumed in a specific geographic area and time period. Consumption-based averages reflect electricity imports, exports, and stored electricity produced in a previous time period, whereas production-based averages do not.

**Incrementality (as GHGP now uses the term)**. S6 p1 (Theory of change 1):
> … accounting for clean electricity that is matched hourly, delivered on the same grid, and generated by plants built within a set number of years (often called incrementality) makes it more likely that corporate demand supports new clean power.

The S4 summary uses parenthetical definitions:
> incrementality (defined as new projects in grid modelling studies) (S4 p56)

> Without an incrementality requirement (i.e., only newer resources) (S4 p48 and p74)

The 2024 Discussion Paper (S10 p32) uses "newness":
> ‘… shall be sourced from resources with a commercial operation date or recommissioning date within [a specified number of] years from the reporting period to which the instrument is applied.’

That text is an illustrative option in a working draft; it is not a proposal that went to consultation.

**2015 meaning of "additionality"** (contrast). S1 §11.3, PDF p92 / printed p90:
> This guidance does not require that contractual instruments claimed in the market-based method fulfil criteria such as offset "additionality" or prove the overall market impact of individual purchases or supplier programs result in direct and immediate changes in overall supply.

PDF p93 / printed p91:
> Scope 2 reporting is a report of usage and as such is independent of issues associated with additionality.

**"Net load"**. Not defined in any GHGP source retrieved. GAP. The closest in-force concept is the 2015 gross-vs-net rule for on-site generation (Q1, finding 1.4). EnergyTag Annex 2 uses "net charge" / "net discharge" hour (Q5).

**EnergyTag storage terms**. T1, Annex 1 Glossary, pp45–46:
> Storage Charge Record (SCR) — Registry record of energy charged to storage in a time interval.

> Storage Discharge Record (SDR) — Registry record of energy discharged from storage in a time interval.

> Storage Discharge Granular Certificate (SDGC) — A GC Issued following Storage discharge in compliance with all necessary requirements in both the Standard and Guidelines.

> Storage System (or Energy Storage System) — Separately measured system for storing energy where the energy carrier of the input into storage is of the same type as the energy carrier for the output of storage.

> Round Trip Efficiency — The ratio of the net total output energy in the discharging process to the net total input energy in the charging process.

> Reservoir — Refers to the Storage System's inventory of records at time "i" resulting from record charging that are available for allocation to Storage Discharge Records.

---

## Q1. What does guidance in force (2015) say or imply about storage in the MBM?

**1.1 No storage accounting rule exists. GAP.** [GHGP-inforce] A full-text search of S1 for "storage", "battery", "pumped", "round-trip", "charging" and "discharging" found these hits only:
- Box 4.1, PDF p29 / printed p27:
  > Improved short-term forecasting of variable resources and storage technologies will also minimize these challenges.
- §5.3.1, PDF p37 (lists "electric vehicle charging" as an electricity use).
- §4.3, PDF p30 (EV "charging infrastructure").
- Glossary, PDF p105 ("the storage of carbon"; unrelated).

GAP: the in-force guidance says nothing about how stored electricity, charging consumption, discharge, or storage losses are treated in either method.

**1.2 Box 4.1 recognizes that annual certificates do not reflect balancing resources.** S1 PDF p29 / printed p27:
> The market-based method may reflect these emissions in varying degrees: for instance a certificate for variable renewable energy will not likely report or show the GHG impacts of the other resources dispatched on the grid to complement that variability. However some utilities are designing certificates to be issued only from variable energy generated during periods when the "backup" resource is also zero emissions or when no back-up is needed.

INFERENCE: this is the closest 2015 hook for "firmed" or storage-shaped products. It is descriptive, not a requirement.

**1.3 Emission factors are generation-only; T&D losses go to scope 3, category 3.** S1 §4.2, PDF p29 / printed p27:
> They use generation-only emission factors (e.g. emissions assessed at the point of energy generation), designed to label emissions associated with a quantity of electricity delivered and consumed. The emission factors do not include T&D losses or upstream life-cycle emissions associated with the technology or fuel used in generation. Instead, these other categories of upstream emissions should be quantified and reported in scope 3, category 3 …

Appendix B, PDF p98 / printed p96:
> … as well as the energy consumed (e.g. "lost") during transmission and distribution. Because of T&D losses, the actual amount of electricity generated at a power plant will be greater than the total electricity consumed by customers alone.
> … One example of how this can be calculated is by applying the grid loss factor (ex: 7 percent grid loss rate for 100MWh consumption would mean 7MWh lost in T&D).

PDF p99 / printed p97:
> … if companies, their suppliers, or other value chain partners have purchased energy attribute certificates to cover the quantity of grid losses, they can report this calculation based on the market-based method procedures in this Guidance. If not, companies should use the location-based method emission factors.

Direct-line transfer, PDF p38 / printed p36:
> … Company B's scope 2 emissions will be the same as Company A's scope 1 emissions (minus any transmission and distribution losses, though in most cases of direct transfer there will be no losses).

INFERENCE: the 2015 guidance treats network losses as consumed energy that can be covered by certificates under the MBM in scope 3, category 3. It is silent on storage round-trip losses. By analogy, storage losses are energy consumed by whoever operates the store, but no source says so. GAP.

**1.4 Gross, not net, grid purchases ("net load" analogue).** S1 §5.4 (distributed generation), PDF p40 / printed p38:
> Many markets utilize "net metering" for these systems, which allows grid purchases to be measured only as net of any energy exported to the grid. … For accurate scope 2 GHG accounting, companies shall use the total—or gross—electricity purchases from the grid rather than grid purchases "net" of generation for the scope 2 calculation. A company's total energy consumption would therefore include self-generated energy (any emissions reflected in scope 1) and total electricity purchased from the grid (electricity). It would exclude generation sold back to the grid. If a company cannot distinguish between its gross and net grid purchases, it should state and justify this in the inventory.

Table 5.1 example (PDF p41 / printed p39): 100 kWh on-site production, 50 kWh consumed on site, 50 kWh exported, 70 kWh imported. Total consumption = 120 kWh; "Net" grid consumption = 20 kWh.

INFERENCE: if this "shall" were read across to a grid-connected store, its scope 2 activity data would be **gross charging energy**, not charging minus discharging. The guidance does not say whether a storage discharge is "generation sold back to the grid", because storage is not addressed. GAP. Note: one respondent (Tierra Climate, Q5/Q46, finding 3.6) asserts that under current practice "Only losses are included in Scope 2 activity data for storage". No GHGP text was found that states this. Treat it as a stakeholder interpretation, not guidance.

**1.5 Double-counting rules that would bear on storage.** S1 Table 5.2, PDF p42 / printed p40:
> If energy attribute certificates are sold from energy generation, companies shall treat consumed electricity as though it were purchased from the grid—using the hierarchies of emission factors indicated for both methods … Sold energy attribute certificates may be reported separately.

Unique claims, §7.5 Criteria 2, PDF p66 / printed p64:
> The underlying electricity (or megawatt-hour) minus the instrument, sometimes called "null power," shall also not reflect the same GHG emission rate, but should be assigned residual mix emissions for the purpose of delivery and/or use claims in the market-based method.

Criteria 1, PDF p65 / printed p63:
> (In specific cases of multipliers or issuance of multiple instruments from the same MWh, then all instruments shall be retired for a full claim on that MWh.)

INFERENCE: these are the in-force anchors for a rule that a charging certificate must be cancelled if a discharge certificate is to carry its attribute. Otherwise two instruments carry a claim on the same MWh (QC2).

**1.6 Owned generation consuming from the same grid** (relevant to a generator that also owns storage). S1 §5.6, PDF pp41–43 / printed pp39–41:
> … companies in this situation should treat their grid consumption as though it were supplied by their own generation facilities (e.g. as though they were an "on-site" source), with no additional emissions reported in scope 2 … The grid-consuming facility should secure a contract or other instrument with its own generation unit(s) to convey the claim following the Quality Criteria in the market-based method, including ensuring that there have not been any sales from that production conveying claims to other parties.

Endnote 6:
> These administrative buildings should be distinguished from auxiliary operations adjacent to generation facilities. Auxiliary operations may use electricity directly from the generation facility even before distribution and sales to the grid.

INFERENCE: this provides a path (not written for storage) for a nuclear owner's adjacent pumped-storage pumping load to be covered by an instrument from the owner's own generation, if no certificates from that output were sold.

**1.7 Annual vintage + national-scale market boundaries.** S1 §7.5, PDF p67 / printed p65:
> The United States, for example … has constituted a single market for use of certificates. The EU represents a multi-country market …

INFERENCE: under 2015 rules no time-shifting device is needed. An annual certificate already covers any hour, so storage has no attributional role in the MBM beyond its own consumption. This is why storage accounting becomes material only once QC4 is hourly.

**1.8 No age, newness or additionality test.** S1 §11.3, PDF p92 / printed p90:
> All energy has a direct emissions factor associated with generation, and the use of that emissions factor does not depend on whether the generation facility is existing or new, or why the generation has occurred.

---

## Q2. What did the 2025 consultation draft propose?

**2.1 No storage-specific MBM proposal. GAP versus the brief's expectation.** [GHGP-revision] S2 contains no proposal on charging and discharging, storage certificates, loss allocation, or co-located storage. The brief's expected items ("energy attribute certificates for storage", charging/discharging rules, co-located storage rules) are **not in S2**. All storage text in S2:
- p10: the consumption-based factor definition (quoted in Key definitions).
- p14 Q45 option e and p31 Q72 option i:
  > Enables emission changes from storage and demand-flexibility to be reflected more accurately
- p29 (MBM rationale):
  > Further, hourly price signals could create financial incentives for energy technologies (such as energy storage, clean firm power, demand response, etc.) that will be needed at scale to fully decarbonize grids.
- p41 Q140 option (lettered "a." twice in the source):
  > Shaping/firming or storage products required to align hourly supply with load
- p42 Q147 option b:
  > Provides a complementary metric to quantify actions such as energy storage or demand response

**2.2 No incrementality, additionality, COD, vintage-age, "new" vs "existing" resource, or grandfathering-by-asset-age rule.** A full-text search of S2 for "increment*", "additionalit*", "commercial operation", "new resource", "existing resource" and "vintage" found only cost-related "incremental cost" phrases and one SSS exclusion (2.6). S2 p4:
> It does not attempt to resolve every issue, additional topics are expected to be addressed in Phase 2.

**2.3 The hourly matching proposal.** S2 §5.1, p20:
> 1. Update the Scope 2 Quality Criteria 4 to require that all contractual instruments used in the market-based method be issued and redeemed for the same hour as the energy consumption to which the instrument is applied, except in certain cases of exemption.

§5.1.1, p20:
> This requirement would apply only to contractual instruments not to totals reported using residual mix or other default factors.

S2 p21:
> Where hourly contractual instruments are not available production load profiles shall be combined with monthly or annual contractual instruments to estimate hourly data …

Temporal hierarchy for instruments (p21): hourly contractual instruments; monthly/annual instruments combined with hourly production meter data from the same production asset; with a facility-specific production profile; with a regional publicly available production profile. Then monthly, then annual (below threshold). The activity-data hierarchy (pp21–22) ends with a "Flat average":
> Total consumption divided by the number of hours in the corresponding period for which data is available (e.g., … divide the yearly total by 8,760 hours …)

Exemption options 1–4 (pp22, 43) use an "[X] GWh/year in a deliverable market boundary" and/or an SME test. Q70 offered 5, 10 or 50 GWh. The exemption "would only apply to hourly matching; organizations would still need to meet the deliverability rule" (p43).

Accuracy trade-off, rationale p29:
> Power systems often dispatch resources every few minutes (e.g., five-minute intervals), as conditions shift within an hour. For feasibility reasons and aligned with research, the revisions propose the use of hourly matching of certificates as a practical cadence for accurate market-based allocation.

INFERENCE re net load: the draft fixes the accounting interval at one hour. It does not say whether a facility that both imports and exports within an hour (as a store does) reports gross or net per hour. GAP.

**2.4 The deliverability proposal.** S2 pp23–25. Zonal-pricing markets use zonal boundaries (Australia NEM, Brazil CCEE, ENTSO-E bidding zones, Russia). Canada uses provincial/territorial grids; mainland China uses named grid companies. For the US, three options are offered: "[to be determined] a. … eGRID b. DOE Needs Study Regions (45V) c. Wholesale Market/ Balancing Authority". African regional power pools are listed. Other countries use the country or the wide-area synchronous grid, "whichever is smaller".

Alternate methodology 1 (p25):
> … the average price at the point of consumption is less than 1.05 times the average price at the point of generation in the hour for which a claim is made.

Alternate methodology 2 (p25):
> … Delivery of power and attributes must be demonstrated on an hourly or more frequent basis with no direct counterbalancing reverse transactions.

INFERENCE: for storage, deliverability has two legs (generator to store, store to load). The draft does not say which location an instrument for discharged energy carries. GAP. EnergyTag (Q5) requires geographic matching on both legs; 45V requires all three locations in one region.

**2.5 Feasibility measures and legacy clause.** S2 §7.1, p46:
> … it could allow organizations to count, within scope 2 market-based accounting, contractual instruments (e.g., energy attribute certificates) from existing arrangements even when those instruments do not meet the proposed hourly matching and deliverability requirements.

Q176 eligibility date options (p48):
> a. Contract signed prior to implementation date of the Scope 2 Standard (post phase-in period) b. Contract signed prior to publication date of the Scope 2 Standard

The alternative is a "single effective date with a defined lead time and disaggregated disclosure" (p46). INFERENCE: the legacy clause is contract-based, not asset-age-based. It has no bearing on storage asset age.

**2.6 Standard Supply Service (SSS).** S2 §5.1.3, Criterion 6, p26:
> Standard Supply Service emission factors shall convey the direct GHG emission rate associated with resources where there is a traceable and mandatory financial relationship with consumers.

Examples include:
> Competitive or regulated suppliers complying with government-mandated clean energy procurement programs through the procurement of certificates on behalf of the load they serve. Examples of such programs include Renewable Portfolio Standards (RPS), Clean Energy Standards (CES), and nuclear-support policies applied to state-level electricity supply in the United States …

Also:
> Publicly owned facilities … This does not include new resources developed through competitive open tender processes where the government-owned entity receives no regulatory advantage or cost recovery not equally available to private developers.

Pro-rata rule, p26:
> A reporting entity may claim, up to its pro rata share, the electricity and associated attributes from SSS resources in the market-based method.

INFERENCE for the nuclear + pumped storage case: if the nuclear plant's attributes are procured under a state nuclear-support policy, they are SSS. They could then only be claimed pro rata, not concentrated through a storage product.

**2.7 Residual mix and fossil default.** Criterion 9, p27:
> A residual emission factor characterizing the GHG intensity of electricity, within the relevant market boundary and time interval, not claimed through contractual instruments or allocated via Standard Supply Service

Same page:
> Residual mix emission factors should reflect the highest temporal precision available for the relevant market boundary.

p28:
> In cases where a residual mix is not available, reporting organizations shall use a fossil-based emission factor … Generic location-based average grid emission factors shall not be used.

INFERENCE: hourly storage accounting interacts with the residual mix. Discharged energy without an issued storage certificate, and charging energy not covered by certificates, both affect what is "unclaimed" in each hour. No GHGP text addresses this. GAP.

---

## Q3. What did stakeholders say about storage, and what did GHGP summarize?

### 3.1 Questions touching storage (exact wording, distributions from S13)
No question text in questions.csv contains "storage". Storage appears only in answer options. Counts below are from S13 (`question_options.csv`; pct = share of respondents answering that question).

| Q | Exact question text (S13 / S2) | Storage option (exact) | n selected / n answered | % |
|---|---|---|---|---|
| Q45 | "Please provide your reasons for support, if any." (re: requirement to use the most precise location-based emission factor accessible) | "Enables emission changes from storage and demand-flexibility to be reflected more accurately" | 136 / 390 | 34.87% |
| Q72 | "Please provide reasons for support, if any." (re: hourly QC4) | "Enables emission changes from storage and demand-flexibility to be reflected more accurately." | 193 / 378 | 51.06% |
| Q140 | "What are the assumed main drivers affecting procurement price differences for hourly/deliverable EACs/PPAs relative to your current sourcing strategy (select all that apply):" | "Shaping/firming or storage products required to align hourly supply with load" | 286 / 446 | 64.13% (3rd of 8) |
| Q147 | "If you answered "yes" or "somewhat" to question 146, which of the following rationale captures your views?" | "Provides a complementary metric to quantify actions such as energy storage or demand response" | 111 / 170 | 65.29% (1st of 6) |

Context questions (S13):
- Q71 hourly QC4 support, n=909: rating 1 = 539 (59.30%); 2 = 99 (10.89%); 3 = 67 (7.37%); 4 = 77 (8.47%); 5 = 127 (13.97%).
- Q146 "Would the existence of a separate metric outside of scope 2 to quantify the emissions impact of electricity-related actions change your perspective on the proposed revisions?", n=517: No 234 (45.26%); "I do not support the development of impact metrics outside the scope 2 inventory." 126 (24.37%); Somewhat 106 (20.50%); Yes 51 (9.86%).
- Q153 exemptions, n=748: 5 = 52.67%, 4 = 23.66%.
- Q171 legacy clause, n=801: 5 = 75.03%, 4 = 14.98%.

Full Q72 option ranking (n=378): misallocation/"solar at night" 74.34%; accuracy 68.25%; greenwashing/time-shifting 65.87%; price signals 57.41%; technologies needed 56.35%; transparency 54.50%; **storage & demand flexibility 51.06%**; comparability 43.92%; decision-usefulness 37.57%; risk/opportunity 31.75%; other 13.23%.

**Denominator caution (two different numbers for the same option).** GHGP's S4 Figure 9 (p50–51) reports the Q72 storage option at **76%**, describing the base as "respondents who rated the proposed hourly matching requirement 4 or 5 (Support)". The section intro says it covers "427 respondents to these questions". Computed from S13: among Q72 respondents with a Q71 rating of 4–5 (n=194), 145 selected the storage option = **74.7%**. Among all 378 Q72 respondents it is **51.06%**. Similarly for Q45, S4 Figure 5 (p30) gives **35%** of "406 respondents"; S13 gives 136/390 = 34.87%. A page should state which base it uses.

### 3.2 Free-text volume (S13, R3's own regex; approximate)
- 716 free-text answers from 345 respondents match `storage|batter|pumped|BESS|round-trip|discharg`. This includes false positives such as data storage, thermal storage, gas storage and carbon storage. Treat it as an upper bound, not a count of storage views.
- Top questions: Q075 (111), Q073 (94), Q152 (75), Q141 (53), Q020 (42).
- 14 respondents (8 companies, 2 consultants, 2 industry groups, 1 academia, 1 data provider) used near-identical wording that hourly matching "can incentivize behavior, such as the timing of charging and discharging of energy storage projects, that align with an individual reporting entities carbon accounting needs at the expense of system-level benefits". This looks like shared or template text; a page should not count these as independent views.

### 3.3 Verbatim free-text responses (range of views)
Organisation type from respondents.csv; names only where the data has them (not redacted). Text is quoted exactly, including the respondents' own typos.

1. **Pass-through: cancel on charge, issue on discharge.** Ørsted A/S (Company, Denmark), Q133:
   > Batteries: we would encourage clarity in the scope 2 guidance on how scope 2 accounting would work for batteries. This would include taking into account internal resistance in batteries in scope 2 accounting rules. When batteries charge, they should consume GOs according to their power consumption and energy mix. When discharging the power, batteries should then receive GOs according to the power delivered to the grid.
2. **Rules missing; premature.** Sonnedix UK Services Ltd (Energy supplier/retailer or utility, UK), Q020:
   > At present, reporting and regulatory requirements for battery & storage systems are not fully established in all markets where we operate, for example, how losses during charge/discharge are to be accounted for, how GO's can be issued for electricity that has passed via a storage system and what meter boundary should be used for co-located BESS+PV/wind. It feels premature to be issuing this new MBM definition before guidelines for storage systems are established.
3. **Losses push storage operators over thresholds.** Same respondent, Q157:
   > In addition, if we take storage systems into account, the round trip losses are substantial and when aggregated can easily push a company above threshold levels. Applying hourly matching exemptions based on aggregate consumption within a market boundary would classify solar generators and storage operators as large consumers, despite the fact that Individual assets consume negligible electricity, Storage system losses are operational, and linked to efficiency rather than company behaviour.
4. **Attributional methods only see losses.** Tierra Climate Inc. (Data/analytics provider, US), Q073:
   > Energy storage is not recognized in MBM unless it is contractually tied to another reporter's load via EAC arbitrage, which introduces burdensome validation requirements (e.g., state-of-charge tracking, reservoir accounting). Merchant storage or independently operated storage will have positive emissions in MBM inventories unless it purchases EACs to cover losses, even when it reduces system emissions on a consequential basis. MBM, like LBM, fundamentally assigns emissions based on losses, not consequential changes to the grid.
5. **Emissions-based (charge/discharge-hour grid intensity) alternative.** Grenergy USA (Energy supplier/retailer or utility, US), Q152:
   > An emissions-based approach (RECs awarded based on emissions intensity of grid at time of discharge, and for grid-charging energy storage, removed for emissions intensity of grid at time of charge) would best satisfy these criteria.
6. **Risk that storage charged from fossil increases emissions.** Redacted (Company, US), Q075:
   > But for other grids and portfolios, storage resources dispatched to "fill the hourly gaps" in a company's renewable portfolio will increase fossil generation when they charge. Under these circumstances, due to the efficiency losses inherent in energy storage systems, storage deployed to reduce a company's reported emissions will have the effect of increasing atmospheric emissions.
7. **Hourly matching may misdirect dispatch.** WattTime (NGO, US), Q075:
   > Such a grid most urgently needs clean energy in the "duck curve" hours of 5-7. Hourly matching would specifically incentivize companies not to produce clean energy or discharge storage in these hours beyond their load. This would actively increase short-run emissions; cause grid stress; and slow renewables build in the long run.
8. **EU framework gap; stored renewables should count.** Eurelectric (Industry group, Belgium), Q075:
   > Without a consistent EU wide framework enabling storage to claim and transfer GOs, hourly rules could unintentionally discourage flexibility by preventing consumers from recognising stored renewable energy.
9. **Stored green power should keep green status.** Redacted (Company, Germany), Q022:
   > Demand: Ensure stored green electricity retains its "green status" and allow unbureaucratic, smart-meter-free recognition of self-consumption. Justification: Labeling discharged power as "gray" due to timestamp mismatches devalues battery investments and creates excessive administrative reporting burdens.
10. **Long-duration/pumped storage value.** International Hydropower Association (Industry group, Canada), Q018:
    > We hope that the drive to 24-7 renewable energy will send a price signal to better value storage, including long duration energy storage such as pumped storage hydropower.
11. **Support with incrementality; storage to time-shift.** Environmental Coalition on Standards (ECOS) (NGO, Belgium), Q152:
    > Hourly accounting, market boundaries reflecting power grid realities, and an incrementality standard (SSS or even better: an asset age limit) will very much increase the integrity of scope 2 reporting. Impact: Existing research has shown that a more granular MBM temporal matching drives real decarbonization via targeted investments in new technologies, the incorporation of storage to timeshift renewables, and real incentives for demand flexibility.
12. **Mechanics request (Japan).** NTT, Inc. (Company, Japan), Q075:
    > … we request clarification that hourly matching can be achieved even when using electricity storage devices connected independently from the grid, by utilizing the load profile of power plants that are the sources of EACs, the charge and discharge curves of energy storage system , and the load profiles of electricity demand .

    Mitsubishi Research Institute (Consultant, Japan), Q075:
    > Furthermore, with respect to the scope of hourly matching, we consider that the time-shifting effects of charging and discharging from energy storage systems should also be taken into account. Clear guidance should be developed in parallel to clarify the relevant concepts and their treatment in emissions accounting.
13. **Data problem.** Uptime Institute ("Other", US), Q089:
    > The problem is that no one, not even the balancing authority, knows what the emission factors are of the battery discharges because they don't know what kind of electrons have been purchased to charge the battery nor do they know the round trip efficient (RTE).
14. **Losses require more certificates.** Redacted (Company, US), Q141:
    > Current market-based methods of shifting energy from periods of high renewable generation to periods of low generation such as batteries are non-renewable and carry a further round trip efficiency loss, likely requiring even greater procurement of RECs to cover the battery losses to enable a REC time shift.

### 3.4 What GHGP summarized (S4, 25 Aug 2026; S5, 29 Jul 2026)
- Scale, S4 p6:
  > The consultation received nearly 1,100 responses from stakeholders across 56 countries.

  (S13 contains 1,072 respondents.)
- Q71 support (S4 Table 19, p49): Grand Total 909 = 22% rating 4–5, 7% rating 3, 70% rating 1–2. By type: Company 429 → 12% / 7% / 82%; Energy supplier/retailer or utility 81 → 26% / 12% / 62%; NGO 71 → 49% / 6% / 45%; Academia 31 → 48% / 6% / 45%.
- Storage in the LBM, S4 p20 (concerns):
  > A few indicated that temporal matching may not fully account for grid energy storage and the emissions associated with time-shifted power.

  S4 p31 (support):
  > … some indicated that this approach may also capture the effects of storage and demand-flexibility interventions.

  S4 p42:
  > … limitations may be more pronounced for energy-intensive industrial sectors, complex grids involving battery storage …
- Hourly matching and system-shaping, S4 p52:
  > … most indicated that hourly matching may create stronger market signals for the technologies and behaviors associated with highly decarbonized electricity systems, including clean firm power, long-duration energy storage, demand flexibility …
- Cost, S4 p108:
  > … organizations may encounter more limited and costly certificates or may procure firming services such as battery storage at increased cost. These respondents noted that battery-backed contracts can be complex to value and negotiate, reflecting considerations such as round-trip energy loss and physical degradation into the buyer's costs.

  S4 p109:
  > … capital allocated toward localized battery energy storage systems could, in some cases, be deployed more efficiently in centralized applications to support broader system-wide outcomes.
- Impact metric, S4 p114:
  > … an impact metric could also provide an avenue to recognize decarbonization investments that may not fit into current or proposed inventory allocation rules, such as energy storage, demand-side response, and out-of-boundary projects.
- Incrementality ("third pillar"):
  - S4 p56:
    > … a few referenced research on the "three pillars" approach … These respondents noted that the proposed market-based method revisions do not include an incrementality requirement …
  - S4 p114:
    > Some respondents suggest that an incrementality requirement (often termed a "third pillar") may be a relevant consideration …
  - S4 p89 (SSS as a proxy):
    > … SSS could serve a similar function by removing much of the existing generation an incrementality test would also exclude … alternative or complementary approaches, such as incorporating incrementality requirements or introducing a default option based on facility age limits.
  - S4 p92 (Project Age):
    > … older legacy resources (e.g., assets commissioned more than 10 or 15 years ago) could potentially be classified as SSS.
  - S4 p93 (opposition):
    > Restricting eligible supply based on age could potentially distort the market, increase the cost of clean energy, and discourage companies from signing contracts with older, yet highly functional, carbon-free resources that provide baseload power, these respondents suggested.
  - S5 p6–7:
    > Some respondents commented that an incrementality requirement, such as allowing companies to make voluntary clean electricity claims only when those claims are linked to newer clean energy projects, is a crucial consideration for directing capital to new clean energy development and driving ambitious climate action.
- Consequential consultation (S12, 29 Jul 2026):
  - p3:
    > Some respondents noted that consequential accounting is better suited to recognize certain technologies like battery storage and demand response, which attributional methods can only represent as a net emissions increase.
  - p6:
    > Since batteries/storage act as both electricity consumer and generator, some respondents noted that emissions impacts of charging and discharging of storage would require its own separate accounting treatment.
  - p14:
    > … determining the marginal emissions associated with battery discharge is difficult or even theoretically impossible.

GAP: neither summary reports a GHGP position on storage mechanics.

---

## Q4. Current direction (Oct 2026): what it says or leaves open on storage, incrementality and vintage

**4.1 Two MBMs; Method 1 includes incrementality.** S6 p2:
> Method 1: This approach would incorporate hourly matching, deliverability and incrementality accounting and reporting requirements.
> Method 2: This approach would maintain existing scope 2 requirements from the 2015 Scope 2 Guidance …

The ISB's September direction (S6 pp2–3):
> Companies [shall/should/may, language still to be determined] report under the market-based method if data that meets the quality criteria is available. If a company does report scope 2 market-based method emissions:
> • Companies may report using Method 2 (current market-based method under 2015 Scope 2 Guidance) until a to-be-determined date,
> • Companies should report using Method 1 until a to-be-determined date,
> • Prior to that date, companies shall disclose whether they are applying market-based Method 1 or Method 2, and
> • After that date, if a company reports scope 2 market-based method emissions, companies shall report using Method 1 if data that meets the quality criteria is available.

**4.2 Method 1 parameters (as presented to the ISB in September).** S8 slide 34:

| Element | Method 1 | Method 2 |
|---|---|---|
| Temporal requirement | Hourly (shall) | Annual (or monthly) |
| Geographic sourcing requirement | Deliverability (shall); market boundaries aligned with grid | Existing market boundaries |
| Incrementality/ vintage | Age limit on eligible resources for voluntary claims (shall) | No requirement |
| Transition mechanism | Transition/phase-in period until [TBD]; No legacy contract provision for method 1 | Transition/sunset period until [TBD]; Legacy contracts continue to be reflected in method 2 |

**4.3 Only explicit storage hook in the incrementality design.** S8 slide 40 (open questions referred to the TWG):
> 3. Technical details to implement Method 1 A. Deliverability boundary details B. Incrementality design details

Side box:
> Incrementality design details could include: Qualifying operational events within [X] yrs (e.g., new build, repowering, clean conversion, upgrade, or life extension); original off-taker; pro-rata grid-share allocation; qualifying storage

GAP: "qualifying storage" is undefined. No source states whether a storage asset can itself be a "qualifying operational event", whether the stored energy must come from qualifying generation, or both. "Life extension" and "upgrade" appear as candidate qualifying events. That matters for 50-year-old nuclear and pumped-hydro assets, but nothing is decided.

**4.4 ISB rationale.** S8 slide 37:
> Method 1 aligns with research* demonstrating that in Statement 2 the Market-Based Method can more effectively drive decarbonization if it requires that corporate scope 2 accounting is matched hourly, is deliverable, and supports funding of new capacity (incrementality).

Footnote: "*Peer-reviewed energy systems research from groups such as the Princeton ZERO Lab, EPRI, TU Berlin, and others."

Same slide:
> The MBM is a value-chain inventory metric, and there should be a plausible physical connection between the generated electricity and load for an EAC to be claimed within the value chain.

**4.5 Pulse check (direction, not decision).** S8 slide 39:
> 10/10 ISB members indicated support for the following approach: After the effective date of the revised standard (assumed to be 2030): …

Item 4:
> All existing contracts may be reported in statement 2 using the 2015 Scope 2 Guidance MBM until 203X. … No legacy clause provision other than transition timeline.

S7 p5:
> The Secretariat emphasized that a pulse check gives direction and is not a decision.

**4.6 Storage is pointed at Statement 3 (consequential), not the inventory.** S8 slide 28, Statement 3:
> Members supported a consequential metric for electricity procurement, reported outside the inventory. • It could capture actions the inventory misses, such as procurement in higher-emitting grids, storage and load shifting.

S7 p5: the ISB "unanimously supported developing an electricity-sector consequential accounting methodology for Statement 3, and unanimously supported starting that work in Q2 2027".

**4.7 TWG dissent on incrementality.** S7 p6:
> Members raised concerns about the inclusion of incrementality in Method 1, suggesting that earlier TWG polling had not supported it, that it is relevant to assessing impact but not necessary for allocating emissions attributes to consumption, and that it should sit outside the inventory. … The Secretariat responded that incrementality was raised in the consultation as an element enabling a theory of change under which demand finances new clean capacity where and when it is consumed, that the ISB supported its inclusion on integrity and impact grounds, that it is open for development by the TWG, and that a memo setting out the options proposed by TWG members in the August survey will be shared.

S7 p5 also records an open question about "how older resources under time-matched and deliverable contracts would be allocated". The Secretariat said these are among the questions referred to the TWG.

**4.8 Indicators that include generator age.** S8 slide 31:
> Commonly named indicators included contractual instrument type, contract length, market boundary, time interval, generator age, technology, share of procurement meeting Method 1, and public support status.

**4.9 ISO divergence.** S7 pp6–7: ISO WG4 adopted:
> … a three-level hierarchy … with monthly matching as the mandatory minimum, annual matching as a fallback subject to an anti-banking provision, and hourly matching optional. Mandatory hourly matching was rejected on feasibility and global applicability grounds.

S7 p7:
> … deliverability was removed as not practical

WG4 also "reached full consensus to remove the Standard Supply Service criterion".

**4.10 Where storage guidance is scheduled.** S9 p24, under "Guidance to be published separately from the standard" (informative Scope 2 Guidance (Version 2.0), timeline TBD), item 11.b:
> Create additional requirements or guidance and calculation examples for GHG accounting for energy storage systems (e.g., battery storage and pumped hydro), electric vehicle (EV) charging and grid integration, and other topics, including how to account for the differences between energy input and output from energy storage systems and round-trip efficiency losses

S9 p24, item 9.a (T&D losses):
> Clarify how to address unaccounted for energy (e.g., line losses, etc.) for different types of power companies …

**4.11 Earlier TWG discussion of storage (no decision recorded).**
- Meeting 7 minutes (29 Jan 2025; the page footer misprints "2024"), p4:
  > Members discussed the intricacies of reporting emissions from energy storage, and raised questions related to the criteria and hierarchies discussed.

  Meeting 7 deck slide 12 lists, under "Proposal 2", "5. Update guidance for allocating emissions to energy storage". Slide 23, "Proposal 3", gives a temporal hierarchy: "Hourly/subhourly with storage flow tracing; Hourly/subhourly (excluding storage); Monthly (excluding storage); Annual (excluding storage)".
- Meeting 10 deck (19 Mar 2025), slide 9 item 11:
  > Clarifies the sources of "consumed" electricity, including electricity that may be imported, or stored from a previous time. Clarifies that consumed electricity must be generated in the same accounting interval (unless stored).

  Slides 11/33:
  > Importance of C > P depends on how much of supply mix is served by imports and storage discharge … Importance of tracking stored emissions also depends on temporal granularity (only important for hourly accounting interval)
- Meeting 16 indicative-vote comments (25 Jun 2025), p2:
  > The deliverability criteria will create situations where energy storage facilities physically charge from fossil resources and induce incremental emissions while contributing to "net zero" claims.

  p8:
  > I do not think the deliverability criteria is sufficient for energy storage.
- Meeting 4&5 deck (Dec 2024), slide 69 (higher ratings for Option E, induced minus avoided):
  > Without this metric, likely that energy storage facilities will be incentivized to operate in a way that increases emissions

  Slide 59 (Option A, lower ratings): "Neglects infrastructural constraints and storage requirements".

  Minutes p9:
  > One TWG member noted that Option E works well to account for the value of energy storage, and that any method should strive to accurately quantify the benefits of storage solutions.
- Meeting 12 deck (16 Apr 2025), slide 27, Subgroup Proposal 1 (marginal impact):
  > Electricity generation during reporting period from all active generation and storage projects that meet (TBD) additionality criteria

  Meeting 15 minutes p3:
  > Members requested worked numeric examples and clarification on treatment of storage and behind‑the‑meter generation for the metric.
- Meeting 21 minutes (10 Dec 2025), p3:
  > A TWG member noted they perceive significant demand for an induced emissions metric and stated that it is unclear how system-level emissions for storage will be quantified without quantifying induced emissions.

  > The Secretariat noted that induced emissions as it relates to energy storage is a topic specific to the power sector and requires further discussion.

  Meeting 21 deck slide 22 lists use cases, including "BTM + storage (islanding capable)" and "Off-grid data center with onsite solar + gas + storage, with power export to the grid".
- Discussion Paper (S10, Nov 2024), p93:
  > … research has questioned whether a time and location matching requirement alone, without constraints such as project newness or additionality, can drive grid-wide emission reductions …

  p43:
  > … much of the research on this consideration uses a renewable energy project's 'newness' as a proxy or heuristic for additionality … 'newness' is notably distinct from more commonly understood definitions of causality or additionality related to project financing, regulatory surplus, etc.

GAP: no TWG material reviewed records any option, vote or decision on storage certificate mechanics: pass-through, cancellation on charge, issuance on discharge, loss allocation, or co-located vs standalone storage.

**4.12 Process dates.**
- ISB meeting on TWG outcomes moved to 15 Dec 2026, materials due 5 Dec 2026 (S7 p4).
- Consolidated public consultation slated for Q2 2027; joint GHG Protocol–ISO Corporate Standard slated for publication in Q4 2028 (S6 p3).
- Option C transition period "[~2033-2035]" (S8 slide 35); effective date "assumed to be 2030" (S8 slide 39).

---

## Q5. Mechanics under third-party schemes

### 5.1 EnergyTag GC Scheme Standard v2 (T1), §1.6 Energy Storage, pp24–31; Annexes 2–3, pp49–53
- **Why storage needs special rules**, p25:
  > For most historic EACs systems, cancellation for energy Input to storage is not required. The logic was that storage is not end-consumption and, in most cases the "clean-up" of storage losses was voluntarily dealt with by canceling the corresponding number of EACs if specific Attributes were claimed for the stored energy. GCs related to energy fed into and released from storage cannot be managed like this, as the time interval in which the energy is charged and discharged is of essential value. EnergyTag acknowledges that storage tracking is complex and is still in an early stage of development and implementation.

  Footnote 10:
  > Note that in some cases EACs are not canceled for losses.
- **Optional for issuers**, p10:
  > [the GC Issuer] may issue Storage Discharge GCs, and that where it does, it shall ensure that Storage Charge Records (SCRs), Storage Discharge Records (SDRs), and Storage Discharge GCs (SD-GCs) are managed in compliance with the requirements in 1.6 Energy Storage
- **Store is both producer and consumer; metering**, p24:
  > For any Storage System from which GCs/Storage Records will be issued/kept, that device will be considered both a Production Device and a Consumption Point …

  Data that "shall be metered" include:
  > Indication of state during each interval (charge/discharge), - Interval charge/discharge (Wh).
- **Records**, p25:
  > … all charged energy in a given time-interval is recorded in the Registry using Storage Charging Records (SCR), and that all discharged energy in a given time-interval is recorded using Storage Discharging Records (SDR). These records alone are not equivalent to tradable Granular Certificates as they do not contain information regarding the energy source and other Attributes of the energy charged into the Storage System (unless corresponding GCs are allocated to these records).
- **Cancellation on charge**, p29:
  > GCs for energy produced in the same time interval as the SCR shall be canceled, indicating that this cancellation is "for charging" energy into a Storage System.
- **Interval**, p29:
  > Time-intervals for registering SCRs and SDRs shall be 60 minutes or less, corresponding to the applicable local balance & settlement period …
- **Losses: measured in and out**, p27:
  > The amount of input energy for which SCRs are recorded, shall be based on measurement of energy input to storage. The amount of output energy for which SDRs are recorded, shall be based on measurement of energy output from storage.

  pp29–30:
  > SCRs represent a quantity of charged energy that shall be allocated to SDRs except for the share related to energy losses. Each unit of energy associated with an SCR may only be allocated once to an SDR.
- **Worked example**, p28 schematic: GC cancelled 15 Jan 2024 17:00–18:00, 100 Wh solar; "SCR AL (AL = After Losses) … Vol = 95 Wh"; SDR 20:00–21:00, 95 Wh; SD-GC issued for 95 Wh, "always AFTER cancellation of Input GCs".
- **Attribute inheritance**, p30:
  > Where SCRs containing Attributes from canceled GCs are allocated to SDRs, these Attributes shall be copied to SDRs. ∙ SD-GCs shall be Issued in equal volume as the corresponding SDRs.

  SD-GCs "shall record an indication that the GC is related to energy released from an Energy Storage System (i.e. Storage Tag)". They also "shall record the time interval of release from storage and may record the period of original generation", and "shall record both the location of the original Production Device … and the location of the storage device".
- **Two-leg geographic matching**, p29:
  > Geographical Matching shall be done between the location of the Production Device mentioned on the canceled GC and the Energy Storage System … and Geographical Matching shall be done between the location of the Energy Storage System mentioned on the SD-GC and the end-consumption of the represented energy.
- **Uncertified discharge / grid charging**, p28:
  > Where energy is discharged, but the corresponding SDRs are not allocated to a SD-GC, then the Storage System operator may allocate these SDRs to an 'unknown beneficiary' in order to ensure that the Reservoir reflects the physical capacity of the Storage System.

  INFERENCE: charging energy not covered by cancelled GCs yields SCRs without attributes. Under p25, those records "do not contain information regarding the energy source". The standard does not say these SDRs carry grid-mix or residual-mix attributes. GAP.
- **Claim condition**, p30:
  > In order to make a temporal claim that an energy Storage System has moved energy Attributes from one time to another, it is necessary to ensure that the following collection of elements are no longer available for further use: ∙ GC from the storage charge time interval (tc), ∙ SCR … (tc), ∙ SDR … (td), and ∙ SD-GC … (td).
- **Efficiency factor**, Annex 2, pp49–50:
  > Measurements of total input and output over a specified time period (e.g. 1 hour/1 month) shall be the basis for determining an efficiency factor …

  > The period over which the initial efficiency may be used should not be longer than 6 months after the startup of the battery.

  > Parasitic losses shall be included in this overall loss factor …

  > Determine if a particular hour is a "net charge" or "net discharge" hour.

  INFERENCE: EnergyTag works with one net state per metering interval (≤60 min). This is the operational answer to within-hour netting. It is not an explicit rule on netting simultaneous charge and discharge across co-located devices.
- **Allocation order**, Annex 3 (informative), pp52–53: FIFO, "Storage Operator Decides", "Weighted Average" (LIFO discouraged). p53:
  > In selecting an allocation method of SCRs to SDRs, the main guiding principle shall be ensuring positive environmental impact of the storage system.

  The GC Issuer or storage operator "shall transparently publish its allocation logic".
- **Vintage/age**: T1 has no age requirement for the storage asset or the charged generation. The Matching Standard (T2 p14) requires the claimant to communicate "which other Attributes are being matched … (e.g. date when the Production Device became operational)".
- **Matching Standard (T2)**: no storage rules beyond the glossary. It defines Temporal Matching (p14):
  > … the (sub)hourly time period of energy production as recorded on the canceled GCs, shall at least on an hourly basis coincide with the hourly time period of energy consumption to which these GCs are allocated.
- **EnergyTag FAQ (T3)**, accessed 2026-10-19:
  > How is energy released from storage accounted for in the hourly matching framework? EnergyTag is currently developing a robust standard for storage accounting, which meets the challenges associated with avoiding double-counting and ensuring credible storage claims. Among the topics that being addressed in the standard are: Treatment of energy losses in various energy storage systems. Allocating granular certificates to stored energy in a climate-credible and storage-operable way. Implementing the storage standard in a granular certificate registry.

  The same FAQ states:
  > Existing CFE Reliance (Delivery of what's not yours) . Today, a consumer can have zero emissions just by buying EACs from an asset they had no role in financing or refurbishing (e.g., 100% old hydro-powered). This is not a fair zero-emissions reflection.

### 5.2 US Treasury 45V final regulations (T4, 10 Jan 2025)
- **Regulatory text**, §1.45V-4(d)(3)(ii)(C), PDF p96–97 / FR 2319–2320:
  > (C) Use of energy storage. For purposes of meeting the requirements of paragraph (d)(3)(ii)(A) of this section, an EAC meets such requirements if the electricity represented by the EAC is discharged from a storage system in the same hour that the taxpayer's hydrogen production facility uses electricity to produce hydrogen. The storage system must be located in the same region as both the hydrogen production facility and the facility generating the stored electricity. To use the rule described in this paragraph (d)(3)(ii)(C), the volume of electricity use substantiated by each EAC representing stored electricity must account for storage-related efficiency losses. In addition, to use the rule described in this paragraph (d)(3)(ii)(C), EACs representing stored electricity must comprehensively address the storage of electricity by reflecting the energy attributes of the electricity generating facility that provided electricity to the storage facility, reflecting the temporal attributes regarding when the electricity is discharged from energy storage, and ensuring that paragraph (d)(2)(viii)(C) of this section relating to verification that each EAC is claimed and retired only once applies to EACs representing stored electricity.
- **Incrementality attaches to the generator, not the store**. Preamble, part v "Treatment of Energy Storage", PDF p47 / FR 2270:
  > Storage systems need not themselves meet the incrementality requirement, but the EACs that represent electricity stored in such storage systems must meet the incrementality requirement based on the attributes of the generator of such electricity.

  Same page:
  > … develop frameworks that comprehensively address storage, that is, do not allow selective reporting of EACs of stored electricity; and develop frameworks for estimating the temporal profile of stored and discharged electricity represented by EACs, including when storage is charged with multiple electricity generators, not all of which produce sufficiently minimal emissions …

  Same page:
  > … the ability of entities to claim and verify the use of energy storage is contingent on whether and when EAC registries can substantiate the effective tracking of electricity through that storage.

  Same page:
  > Some comments asked that hydrogen producers also be allowed to contract with off-site electricity storage to shift their load profile. These final regulations do not offer this option …

  The rule distinguishes two cases: on-site storage that shifts load (verified by meter) and off-site storage that shifts production profiles (via EAC registries).
- **Incrementality rule**, §1.45V-4(d)(3)(i)(A), PDF p95 / FR 2318:
  > … if the electricity generating facility that produced the unit of electricity to which the EAC relates has a COD that is no more than 36 months before the hydrogen production facility for which the EAC is retired was placed in service …

  Uprates are allowed on the same 36-month basis (B). There are also qualifying-State (C) and certain-nuclear (D) pathways. (D)(2):
  > … only 200 megawatt hours of electricity per operating hour per qualifying nuclear reactor may be considered incremental …

  A "qualifying nuclear reactor" (d)(2)(x) is a merchant or non-co-located reactor with average annual gross receipts below 4.375 cents/kWh in any two of 2017–2021, plus a physical connection or a ≥10-year written binding contract.
- **Hourly from 2030**, (d)(3)(ii)(B): EACs for electricity generated before 1 January 2030 may match on a calendar-year basis.
- GAP: R3 did not verify the current statutory status of the 45V credit after 2025 legislation. A page should cite T4 only as a regulatory design precedent.

### 5.3 EU RFNBO Delegated Regulation 2023/1184 (T5)
- Article 6, temporal correlation (until 31 Dec 2029 monthly; from 1 Jan 2030 hourly):
  > … or from renewable electricity from a new storage asset that is located behind the same network connection point as the electrolyser or the installation generating renewable electricity, that has been charged during the same one-hour period in which the electricity under the renewables power purchase agreement has been produced.
- Article 2(3) excludes storage from the definition of an "installation generating renewable electricity":
  > … excluding units producing electricity from biomass and storage units
- Article 5(a), additionality:
  > The installation generating renewable electricity came into operation not earlier than 36 months before the installation producing the renewable liquid and gaseous transport fuel of non-biological origin.
- Contrast with 45V: EU rules require the **storage asset itself to be "new"** and co-located behind the same connection point, as well as new generation. 45V exempts the storage asset from incrementality. GAP: "new storage asset" is not further defined in the text retrieved.

### 5.4 EU Guarantees of Origin / CEN EN 16325 (T6; T8)
- FaStGO proposal for the EN 16325 revision (May 2020), §2.12, p11:
  > Rules have been added to explain that Energy Storage, where the Input Energy Carrier is the same as the Output Energy Carrier, does not need the substantial administrative process of cancellation of GOs for the Input Carrier and Issuance of GOs for the Output Energy Carrier. Adopting this proposal would mean that no GO Issuance would be needed for storage, but that GOs may - at the discretion of the storage operator - be cancelled for storage energy losses.
- T8 characterizes the older EN 16325:2013+A1:2015:
  > Energy released from storage systems may only issue GOs if the respective systems are located next to a renewable energy generation facility and no GOs have been issued by that facility

  T8 recommends:
  > … storage systems should be allowed to issue EACs for discharged electricity, provided that a corresponding volume of EACs from electricity generated at the time of charging has been canceled.
- GAP: the final EN 16325 (2024/2025 edition) storage clauses were not retrieved (paywalled).

### 5.5 Corporate 24/7 methodologies
- Google (T7, Feb 2021), p9:
  > While it doesn't contribute to Googe's CFE Score, Excess CFE still represents clean electricity generation for the Regional Grid. It could also potentially be stored (using batteries, for example) and shifted to another hour where Contracted CFE is less than the Load MWh.

  (The typo "Googe's" is in the source.)

  p18 modelled one data center: solar 100 MW → 38% emission decrease / 68% CFE; 200 MW solar → 43% / 70%; "100 MW Solar + 50 MW BESS (2hr)" → 47% (+9%) / 72.5% (+4.5%); plus 5 MW firm → 55% (+17%) / 76% (+8%).

  GAP: T7 gives no loss or certificate-cancellation rule for storage.
- GAP: Microsoft, Peninsula Clean Energy and other 24/7 methodologies on storage were not retrieved.

### 5.6 North American registries
- GAP: no storage-specific certificate rules were found for M-RETS (now CleanCounts; https://cleancounts.org/solutions/innovations has no storage text), PJM-GATS, WREGIS or NAR. The PJM search returned only market rules on "Dispatched" vs "Non-Dispatched Charging Energy" (Manual 27; not certificate rules).

### 5.7 Academic evidence on storage and time-shifting (peer-reviewed; only abstract-level claims)
- T10, Xu et al. (Joule 2024). Quoted from the 2022 SSRN preprint abstract:
  > Hourly 24/7 CFE procurement drives early deployment of advanced, 'clean firm' resources, such as natural gas power plants with carbon capture and storage and long-duration energy storage. While hourly matching delivers greater impact, it also comes at a more significant cost premium ($13/MWh - $30/MWh higher) than volumetric matching.
- T9, Riepin & Brown (ESR, Jul 2024), abstract:
  > Utilising an hourly matching strategy, energy buyers can eliminate all carbon emissions linked to their electricity consumption, while also reducing system-level emissions by up to 572 kgCO2/a per MWh of participating load.
- T11, Riepin, Jenkins, Swezey, Brown (Joule, Feb 2025): full text not retrieved (HTTP 403). It is cited by ECOS (Q152) and others for storage and advanced technology adoption. Do not quote.
- GAP: no peer-reviewed source was retrieved that models storage **vintage** (legacy vs new storage) under hourly matching. No source specifically addresses legacy pumped storage in hourly matching, apart from the 45V preamble's general storage-asset exemption.

---

## Q6. Derivation (all INFERENCE unless marked "SOURCE")

Ground rules for this section: only S1 (QC1–8, principles), S2 (proposed QC4/5, SSS, residual mix), S3 (decision-making criteria) and S6/S8 (Method 1 and incrementality as currently framed) are used as premises. Third-party schemes are cited as precedents only.

### 6.1 The net-load problem stated in GHGP terms
- SOURCE: Scope 2 covers emissions from generation of electricity "purchased or acquired … consumed by the reporting company" (S2 p7, quoting S1 §5.3). For on-site generation, S1 requires gross grid purchases (Q1, finding 1.4).
- INFERENCE: a store has three flows. (a) Charging is grid withdrawal, i.e. consumption. (b) Discharging is an injection; it is not "generation" with its own direct emission rate. (c) The difference (losses, including parasitic) is energy that is truly consumed. QC1 speaks of "the direct GHG emission rate attribute associated with the unit of electricity produced". A discharge MWh has no direct emission rate of its own, so the only coherent attribute for it is the one inherited from the charged energy. That is "pass-through".
- INFERENCE: under annual matching the timing problem disappears (finding 1.7). Under hourly QC4 it becomes central. If only hour-of-discharge certificates count, discharged energy has no attribute unless the scheme re-issues one. If charging certificates are not cancelled, both the charging consumer and the discharge recipient could claim the same MWh, which conflicts with QC2.

### 6.2 What the criteria imply for an hourly storage ledger
1. **Cancellation on charge (double-counting guard)** follows from QC2 ("only instruments that carry the … claim associated with that quantity of electricity generation"), QC3 (tracked and retired) and the 2015 multiple-instrument rule ("all instruments shall be retired for a full claim on that MWh").
   - Option A: require charging certificates to be cancelled "for charging" in the charge hour (the EnergyTag/45V model).
     - Pro: unique claims; auditable.
     - Con: needs registry capability (45V makes the storage pathway contingent on registry capability).
2. **Loss haircut** follows from Accuracy ("systematically neither over nor under") and Completeness. Discharge certificates should equal measured output, not input. The loss quantity is consumption, so it needs either certificates or a residual/fossil factor under proposed Criterion 9 and the fossil default.
   - Option B1: issue discharge certificates equal to metered output; losses are the store operator's consumption and are reported in its scope 2.
   - Option B2: allocate losses to the end-claimant (gross-up).
   - Neither option appears in GHGP text. GAP. EnergyTag (B1-like, with records "After Losses") and 45V ("must account for storage-related efficiency losses") both apply a haircut but do not assign the losses to a reporter's scope.
3. **Which hour.** Proposed QC4 matches instruments to "the same hour as the energy consumption". With pass-through there are two consumptions: the store's charging (hour tc) and the end user's (hour td). INFERENCE: the charging certificate must be hour-matched to tc and the discharge certificate to td. This is the EnergyTag tc/td structure. It satisfies QC4 at both ends without any certificate crossing hours un-backed.
4. **Deliverability (proposed QC5) on two legs.** Generator to store, and store to load. INFERENCE: the store's location is its "first point of interconnection" (S2 p23). For co-located storage behind the generator's connection, leg 1 is trivially satisfied. For standalone storage it must fall within the same deliverable boundary. 45V requires all three in one region; EnergyTag requires geographic matching on both legs and records both locations.
5. **Comprehensiveness / no cherry-picking.** This follows from Completeness and Transparency, and from the 2015 instruction that companies "disclose and justify any specific exclusion".
   - Option C: all discharge from a registered store must be recorded. Uncovered discharge goes to an "unknown beneficiary" (EnergyTag) or, INFERENCE, to the residual mix.
   - 45V language to borrow: "do not allow selective reporting of EACs of stored electricity".
6. **Allocation order (FIFO / weighted / operator-decides)** is a Transparency and Consistency issue. EnergyTag requires published logic and names "ensuring positive environmental impact" as the guiding principle. GHGP is silent. GAP.
7. **Grid-charged storage.** If charging is not covered by cancelled clean certificates, the stored energy carries no clean attribute. Two options:
   - D1: it inherits the hour-tc residual mix (or fossil default where none exists).
   - D2: no attribute is issued on discharge; the receiving consumer falls to its own residual mix in hour td.
   - D1 is more accurate in principle but needs hourly residual mixes that track storage. S2 notes consumption-based location-based factors "reflect … stored electricity produced in a previous time period", but no residual-mix equivalent is proposed. GAP.
8. **Within-hour netting.** Proposed QC4 is hourly, and S2 says sub-hourly dispatch is a known accuracy trade-off (p29). INFERENCE: a single net state per settlement interval (EnergyTag) is consistent with the hourly cadence. The S1 gross-purchase "shall" suggests that across a reporting period, charge and discharge should not be netted against each other in activity data.
   - Option E: record charge and discharge per interval ≤ 60 min. Allow netting only within one interval at one meter; never net across hours.

### 6.3 Where incrementality would attach (if adopted)
- SOURCE: incrementality as GHGP now frames it is "generated by plants built within a set number of years" (S6). The Method 1 row reads "Age limit on eligible resources for voluntary claims (shall)" (S8 slide 34). Candidate qualifying events include "life extension" and "qualifying storage" (S8 slide 40).
- INFERENCE: the stated theory of change ("demand finances new clean capacity where and when it is consumed", S7 p6) concerns clean generation capacity. A discharge certificate under pass-through conveys the generator's attributes. Applying an age limit to the attribute therefore logically tests the generator whose energy was stored. That is the 45V approach: "Storage systems need not themselves meet the incrementality requirement, but … must meet the incrementality requirement based on the attributes of the generator".
- The alternative logic is that new storage is itself new "where and when" capacity that shifts clean supply into scarce hours. On that logic the storage asset could be a "qualifying operational event". The phrase "qualifying storage" in S8 leaves room for this. The EU RFNBO rule requires both new storage and new generation.

Options for incrementality and storage (not recommendations):

| Option | Rule sketch | Pros (cite criterion) | Cons |
|---|---|---|---|
| I-1 Generator-only (45V model) | Discharge certificates eligible for Method 1 only if the charged energy's generator meets the age/qualifying-event test; store age irrelevant | Coherent with pass-through and QC1; avoids double-gating; consistent with an existing regulatory precedent (2B interoperability) | Gives no Method 1 credit for new storage that shifts legacy clean energy; may under-reward time-shifting (2A) |
| I-2 Storage-as-qualifying-event | A new or uprated store makes discharged energy eligible even if the charged energy is from older generation (subject to cancellation and losses) | Rewards new flexibility capacity "where and when" scarce (2A); recognizes time-shifting | Could let legacy clean energy re-enter Method 1 via the store, weakening the "new clean capacity" theory; needs anti-gaming rules (e.g. no shifting already-abundant legacy output) |
| I-3 Both new (EU RFNBO model) | Store must be new and co-located; generation must be new | Strictest; simple story | Feasibility (3); excludes existing pumped hydro entirely; EU-specific context (hydrogen) |
| I-4 Neither (age-neutral pass-through) | Storage passes through attributes regardless of either age (2015 §11.3 logic) | Consistent with 2015 attributional logic; feasibility | Inconsistent with the Method 1 direction if an age limit is adopted for generation; old generation could be shifted by any store |
| I-5 Indicator only | Report store and generator age as key indicators (S8 slide 31 "generator age") | Transparency; keeps the inventory attributional (TWG minority view, S7 p6) | Does not change the Method 1 tCO2e figure |

### 6.4 The 50-year-old pumped storage next to a nuclear plant (legacy + legacy)
- Under 2015 rules (Method 2): no age test exists (finding 1.8). Annual certificates from the nuclear plant can be claimed without storage. The store's pumping load is consumption; under §5.6 an owner may cover it with its own generation's instrument if no claims were sold (finding 1.6). INFERENCE.
- Under Method 1 with I-1 (generator-only): the store's age is irrelevant. Discharge credit depends on whether the nuclear output it stored meets the age limit or a "qualifying operational event" within [X] years. Candidate events listed in S8 slide 40 include "life extension" and "upgrade"; 45V has an uprate pathway and a narrow nuclear pathway. A 50-year-old plant with no qualifying event would fail. The owner would have to charge from qualifying (incremental) generation to earn Method 1 discharge credit. Inference from the 45V precedent; GHGP is undecided. GAP.
- Under I-2: a 50-year-old store is not new, so it would not qualify as a "qualifying storage" event unless the definition covers repowering or life extension of storage. GAP.
- Under I-3: fails on both counts.
- Under I-4: qualifies with cancellation, losses and deliverability satisfied.
- SSS overlay (S2 Criterion 6): if the nuclear output is procured under a state nuclear-support policy, those attributes are SSS. Only pro-rata claims are allowed, and they "are ineligible for claims in the market-based inventories of other companies" beyond the pro-rata share. That would cap what a storage product could re-sell. INFERENCE.
- Deliverability: co-location satisfies leg 1. Leg 2 requires the load to be in the store's deliverable boundary.
- Answer to brief (i): the sources do not decide it. On the only precedent that addresses storage and incrementality together (45V), the answer would be **yes**. The pumped store would not need to be new, but the energy it stores would need to come from qualifying (incremental) generation, or the legacy nuclear plant would need a qualifying operational event. Under the EU model the store would not qualify at all.

### 6.5 Does all new storage need incremental clean energy? (brief ii)
- INFERENCE: under I-1, yes. A new store's discharge earns Method 1 credit only if its charged energy came from qualifying generation; the store's newness adds nothing to eligibility. Under I-2, no: a new store could itself be the qualifying event. Under I-3, yes, and the store must also be new. Under I-4, no.
- SOURCE for the "yes" precedent: 45V preamble (FR 2270). SOURCE for the "both" precedent: EU 2023/1184 Art 6 + Art 5. No GHGP source answers this. GAP.

### 6.6 Time-shifting benefit argument (brief iii)
- Attributional framing (inventory, Statement 2): S2 and S6 describe the MBM as allocating attributes to consumption ("Within corporate inventories scope 2 uses attributional methods to assign emissions", S2 p4). A store that charges with clean certificates in surplus hours and discharges in scarce hours does move clean attributes into scarce hours. Pass-through represents this attributionally without any consequential estimate. INFERENCE: this supports counting discharge backed by cancelled clean certificates under hourly QC4. It does not by itself answer whether the age limit applies to the store or the generator.
- Consequential framing (impact): whether time-shifting lowers system emissions depends on the marginal units displaced at charge and discharge. Respondents state it can go either way (finding 3.3, quote 6; WattTime, quote 7). GHGP direction places "storage and load shifting" in Statement 3 (S8 slide 28), starting Q2 2027.
- Decision-making criteria tension: criterion 2A says accounting approaches "should not support or incentivize actions that are contrary to global climate goals". This is the hook for anti-gaming guards (e.g. comprehensive reporting, no un-backed discharge claims). 1A/1B (accuracy) favour pass-through with measured losses. Criterion 3 (feasibility) favours registry-ready rules and phase-in. INFERENCE.
- "Regardless of asset age" argument: it is coherent with I-1 for the storage asset (45V). It is coherent with I-4 only if the age limit for the charged energy is also dropped. Under I-1 the asset-age question is moot; the energy-age question remains.

### 6.7 Candidate language a stakeholder might advocate (options, each with pros and cons)
- L1 (pass-through):
  > Contractual instruments representing electricity discharged from a storage system may be applied to consumption in the hour of discharge, provided that instruments for the electricity charged into the storage system were cancelled for charging in the hour of charging, the quantity applied does not exceed metered discharge, and the storage system is deliverable to the consuming load.
  - Pro: QC2/QC4/QC5 coherence.
  - Con: registry readiness.
- L2 (losses):
  > Storage losses (metered charge minus metered discharge over the efficiency period) shall be reported as electricity consumption by the entity operating the storage system [or: by the claimant], using contractual instruments or the residual mix for the hour(s) of charging.
  - Pro: Accuracy, Completeness.
  - Con: allocating losses to the operator burdens merchant storage and may trip exemption thresholds (Sonnedix, quote 3).
- L3 (comprehensiveness):
  > All discharge from a registered storage system shall be recorded; discharge not backed by cancelled charging instruments shall carry no attribute claim [or: shall carry the residual mix of the charging hour].
  - Pro: no cherry-picking.
  - Con: the residual-mix timing rule is undeveloped.
- L4 (incrementality attachment, choose one):
  - I-1: "Eligibility under [age limit] shall be determined by the generating facility whose attributes were charged into storage; storage systems need not themselves meet [the age limit]."
  - I-2: "Commissioning or repowering of a storage system within [X] years shall be a qualifying operational event for electricity discharged from it, provided …"
  - I-3: "… both the storage system and the generating facility shall meet …"

  Pros and cons as in the table in 6.3.
- L5 (disclosure): require disclosure of the storage tag, store location, generator location and age, round-trip efficiency used, and allocation method (FIFO/weighted/operator).
  - Pro: Transparency; comparable with EnergyTag SD-GC fields.
  - Con: reporting burden.

### 6.8 Implications by actor (INFERENCE; all contingent on undecided rules)
- **Developers (new storage):**
  - Under I-1, a new store's certificate value depends on charging from qualifying generation. Co-locating with new generation simplifies both legs of deliverability and the incrementality test.
  - Under I-2, new storage itself creates eligibility; its revenue opportunity is larger but subject to anti-gaming rules.
  - Registry capability (SCR/SDR) is a gating feasibility item (45V; EnergyTag "early stage").
- **Generators with legacy fleets (nuclear, hydro, pumped storage):**
  - Method 2 (until 203X) is unaffected.
  - Under Method 1 with an age limit, legacy output is ineligible unless a qualifying event applies ("life extension", "upgrade" are candidates) or SSS treatment applies.
  - Legacy pumped storage can still time-shift qualifying energy under I-1, and so can sell a shaping service. Its own age only matters under I-2/I-3.
- **Retail suppliers in competitive markets:**
  - Supplier-specific factors under QC6 must be "calculated based on delivered electricity". INFERENCE: storage within a supplier portfolio would need the same pass-through and loss accounting to avoid over-claiming clean hours.
  - SSS rules require pro-rata allocation of mandated resources (e.g. state nuclear support), which limits concentration of legacy clean attributes via storage products.
  - Q140 shows 64.13% of respondents expect "Shaping/firming or storage products" to drive hourly procurement prices.

---

## Numbers you may use on a page

| value | unit / meaning | source | page |
|---|---|---|---|
| 8 | Scope 2 Quality Criteria in force | S1 Table 7.1 | PDF 62 / p60 |
| 7% → 7 MWh per 100 MWh | example grid loss factor | S1 App. B | PDF 98 / p96 |
| 100 / 50 / 50 / 70 kWh; 120 kWh total vs 20 kWh "net" | gross vs net example | S1 Table 5.1 | PDF 41 / p39 |
| 20 Oct 2025 – 31 Jan 2026; 104 days | consultation window | S2 | p5 |
| 5, 10, 50 | GWh exemption threshold options (Q70) | S2 | p30 |
| 1.05× | price ratio, alternate deliverability method 1 | S2 | p25 |
| "nearly 1,100" responses, 56 countries | consultation scale | S4 | p6 |
| 1,072 | respondents in raw export | S13 manifest | — |
| 909; 22% / 7% / 70% | Q71 n; support 4–5 / neutral 3 / low 1–2 | S4 Table 19 | p49 |
| 539 (59.30%) rated 1; 127 (13.97%) rated 5 | Q71 extremes | S13 | — |
| 136 / 390 = 34.87% (GHGP: 35% of 406) | Q45 storage option | S13; S4 Fig. 5 | S4 p30 |
| 193 / 378 = 51.06%; 145 / 194 = 74.7% among Q71 4–5 raters (GHGP: 76%) | Q72 storage option | S13; S4 Fig. 9 | S4 p51 |
| 286 / 446 = 64.13% | Q140 "Shaping/firming or storage products" | S13 | — |
| 111 / 170 = 65.29% | Q147 storage/DR complementary metric | S13 | — |
| 14 | respondents using shared "timing of charging and discharging" wording | S13 (R3 regex) | — |
| 10/10 | ISB pulse-check support (direction, not decision) | S8 slide 39; S7 p5 | — |
| 2030 (assumed) | effective date of revised standard | S8 slide 39 | — |
| ~2033–2035 | Option C transition end (bracketed) | S8 slide 35 | — |
| 15 Dec 2026 | ISB meeting on TWG outcomes | S7 | p4 |
| Q2 2027 / Q4 2028 | consolidated consultation / publication | S6 | p3 |
| ≤ 60 min | EnergyTag SCR/SDR interval | T1 | p29 |
| 100 Wh in → 95 Wh out | EnergyTag worked example (5% loss) | T1 | p28 |
| ≤ 6 months | EnergyTag initial efficiency use after startup | T1 Annex 2 | p50 |
| 12 months | GC use window if not matched in its hour | T1 §1.7 | p31 |
| 36 months | 45V incrementality COD window | T4 §1.45V-4(d)(3)(i)(A) | FR 2318 |
| 200 MWh per operating hour per reactor | 45V qualifying-nuclear incremental cap | T4 (d)(3)(i)(D)(2) | FR 2319 |
| 1 Jan 2030 | 45V hourly matching start | T4 (d)(3)(ii)(B) | FR 2319 |
| 36 months; hourly from 1 Jan 2030 | EU RFNBO additionality / temporal correlation | T5 Art 5(a), Art 6 | — |
| 38% → 47% (+9%) emission decrease; 68% → 72.5% CFE | Google model: 100 MW solar vs + 50 MW/2 h BESS | T7 | p18 |
| $13–30/MWh | 24/7 cost premium vs volumetric (preprint abstract) | T10 | — |
| up to 572 kgCO2/a per MWh participating load | system-level reduction, hourly matching | T9 | abstract |

---

## Signals of future direction (revision materials only)

1. 2024-11-26, S10 p32: "Three pillars (time matching, deliverability, newness)" is listed as Option C, with illustrative COD/recommissioning language. Not taken to consultation.
2. 2025-01-29, S11 Meeting 7: "Update guidance for allocating emissions to energy storage" is among the proposals; members "discussed the intricacies of reporting emissions from energy storage". No outcome.
3. 2025-03-19, S11 Meeting 10: consumed electricity may include "stored from a previous time"; storage tracking is "only important for hourly accounting interval". This carried into S2 p10.
4. 2025-10 (S2): no storage rule; no incrementality; storage appears only in rationale and answer options.
5. 2026-07-29, S9 p24: storage accounting (battery and pumped hydro, input vs output, round-trip losses) is assigned to the informative Scope 2 Guidance (Version 2.0), timeline TBD.
6. 2026-07 (ISB): majority support for two MBMs (S6 p2).
7. 2026-09 (ISB): pulse check 10/10 on the hybrid approach. Method 1 includes an age limit "(shall)". Open items include "Incrementality design details", listing "qualifying storage" and "life extension" (S8 slides 34, 39, 40).
8. 2026-10-06, S7: TWG members object to incrementality inside the inventory. The Secretariat says it is "open for development by the TWG". Storage and load shifting are slated for Statement 3 (S8 slide 28). ISO WG4 diverges (monthly minimum, hourly optional, no deliverability, no SSS).
9. 2026-10-16, S6: key MBM workshop issues are "deliverability, incrementality, feasibility, and implementation timing". Storage is not named.
10. 2026-10-20 to 22: TWG workshop (Washington DC). Outcomes are not available as of 2026-10-19.

---

## Open questions / gaps

- GAP: no GHGP text (in-force or revision) on storage certificate mechanics: cancellation on charge, issuance on discharge, loss allocation, allocation order, co-located vs standalone, grid-charged storage.
- GAP: definition of "qualifying storage" and whether storage age or commissioning is an incrementality event (S8 slide 40).
- GAP: the value of [X] years and the list of qualifying operational events. Whether "life extension" covers nuclear licence extension or pumped-hydro refurbishment.
- GAP: whose scope 2 carries storage losses; gross vs net activity data for storage (only the S1 §5.4 on-site generation analogue exists).
- GAP: residual-mix treatment of un-certified discharge and of charging hours under hourly residual mixes.
- GAP: interaction of SSS with storage (e.g. a store charged from SSS-designated resources).
- GAP: within-hour netting for co-located generation + storage behind one meter (S2 is silent; EnergyTag uses a per-interval net state).
- GAP: "TWG memo – MBM" (S7 documents referenced) and the August 2026 TWG survey incrementality options memo are not in the public repository.
- GAP: final EN 16325 edition storage clauses; PJM-GATS, WREGIS, NAR, CleanCounts storage rules; Microsoft and Peninsula Clean Energy methodologies; T11 full text.
- GAP: current statutory status of 45V (only the January 2025 regulation was verified).
- Caution: two denominators for the Q45/Q72 storage options (S4 vs S13). Pages must say which is used.

---

## Suggested visuals

1. **Hourly storage ledger animation (EnergyTag-style).**
   - Must show: hour tc, a clean certificate cancelled "for charging" with an SCR created; the reservoir; the loss haircut (e.g. 100 → 95, labelled "example from T1 p28"); hour td, SDR, then SD-GC issued and matched to consumption in td; both locations recorded; the four elements withdrawn or cancelled before a claim.
   - Must not show: GHGP as having adopted this. Label it "third-party scheme; GHGP has no rule".
2. **Net-load timeline (24 h).**
   - Must show: store charging as load and discharging as injection; gross charge, gross discharge and losses; the 2015 gross-purchase rule as an analogue.
   - Must not show: invented emission rates. If example numbers are used, label them illustrative.
3. **Decision tree: legacy vs new storage under incrementality options I-1 to I-5.**
   - Must show: two separate questions ("Is the charged energy's generator qualifying?" and "Is the store qualifying?"), the SSS overlay, and the deliverability legs; 45V and EU RFNBO as precedents.
   - Must not show: any branch as "the GHGP rule". All branches are options pending the TWG/ISB (S8 slide 40).
4. **Two-method timeline** (2015 → Method 2 sunset 203X → Method 1).
   - Must show: bracketed dates as "TBD/assumed", and Statement 3 as the home for storage impacts from Q2 2027.
5. **Small multiples of the Q72/Q140/Q147 storage options with explicit denominators.**
   - Must not merge the S4 and S13 bases.
