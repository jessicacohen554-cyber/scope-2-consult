# Codebook: financial institutions and investors (GHG Protocol Scope 2 consultation)

The survey asks for an organisation type ("Financial Institution" is one of fifteen options) and a
sector ("Finance (40)", "Insurance (4030)"), but neither alone captures the stakeholder group.
Asset managers filed as "Company", investor networks filed as "NGO/civil society", and several
banks filed as "Industry group". This codebook defines the cohort, the roles respondents speak
from, and the themes coded from their free text. Everything here is editorial judgement and is
reproduced from `reference/financial_cohort.csv`, `data/derived/financial_themes.csv` and
`reference/financial_quotes.csv` by `scripts/analytics/financial.py export`.

## 1. Cohort rule

**Institutions (tier `institution`, 35 respondents)** — any respondent meeting one of:

- `type`: self-classified organisation type is "Financial Institution" (24 respondents, Q14);
- `audit`: `reference/org_audit.csv` assigns `audited_class = financial` (adds 4 named investors
  who filed as "Company" or "Other");
- `sector`: sector is "Finance (40)" or "Insurance (4030)" **and** organisation type is "Company"
  **and** the audit did not classify the filer as an individual (adds 6);
- `manual`: one redacted "Company" whose write-in sector is "Asset Management" (446).

Excluded on purpose, and named in the method note: a self-described independent advisor
(audited `individual`), a GRESB contractor, a data vendor in the finance sector, an ESG data
provider filing as "Data/analytics", and an environmental-commodity trading house filing as a
consultant. One commodity trader that *self-classified* as a Financial Institution (ACT Group)
is kept under the rule and tagged `intermediary`.

**Associations (tier `association`, 14 respondents)** — hand-listed bodies whose members are
investors, banks or insurers: investor networks (IIGCC, AIGCC, Ceres, ICCR, Just Share) and
sector associations (Association of British Insurers, Japanese Bankers Association, General
Insurance Association of Japan, European Banking Federation, B4NZ, plus four redacted
Canadian / US / global banking and insurance bodies). Real-estate investment associations (REITs)
and accounting bodies are not included.

## 2. Role (`role`, with an optional `secondary_role`)

Coded from how the respondent describes itself in its own text, not from the organisation name.

| code | meaning |
|---|---|
| `data_user` | speaks as an investor or analyst who *uses* companies' Scope 2 disclosures |
| `capital_allocator` | speaks as a financier, fund manager or lender of clean-energy assets and PPAs |
| `own_footprint_reporter` | speaks as a reporter of its own Scope 2 (offices, branches, leased buildings) |
| `intermediary` | environmental-commodity trader / certificate market participant |
| `investor_network` | association whose members are investors |
| `sector_association` | banking or insurance industry body |
| `unstated` | no self-description in the text (often scale answers only) |

## 3. Themes (`data/derived/financial_themes.csv`, one row per respondent, 0/1)

Coded only where the respondent says it in its own words; selecting a survey picklist option
does not count. Each row carries one verbatim `quote` (and `quote_q`) that the exporter checks
against the stored answer.

| theme | 1 = respondent says… |
|---|---|
| `ppa_bankability` | hourly matching or deliverability would fracture load aggregation, PPA volumes, project financing or offtaker pools |
| `emerging_market_capital` | deliverability or hourly rules steer capital away from high-emitting or emerging-market grids where impact is greatest |
| `dirty_grid_skeptic` | disputes that procurement on the dirtiest grids is more ambitious or impactful |
| `additionality_gap` | the proposal should recognise or require additionality / incrementality / new build, or differentiate instruments by whether they caused new supply |
| `conservative_defaults` | explicitly endorses conservative fallbacks (fossil-based factor, residual mix, SSS pro-rata) as integrity protections |
| `disclosure_over_flexibility` | asks that any flexibility (exemptions, legacy, load profiles, SSS, paid data) be disclosed, disaggregated or tiered so users can see it |
| `comparability_gain` | says the revisions improve comparability or decision-usefulness for investors |
| `comparability_loss` | says the revisions, exemptions or legacy treatment reduce comparability |
| `distributed_small_loads` | many small sites, branches or leased offices; asks for site-level or higher thresholds; Scope 2 immaterial for the sector |
| `real_assets` | real-estate specific barriers: tenant data, landlords, multi-tenant buildings, certifications |
| `regional_data_gaps` | hourly or granular data unavailable in the respondent's region (APAC, Latin America, Japan, UK sub-regions) |
| `financial_reporting_spillover` | knock-on effects on IFRS/GAAP hedge accounting, loan KPIs, asset valuation, litigation |
| `optional_not_mandatory` | hourly matching and/or deliverability should be "may" or "should", not "shall" |
| `policy_neutrality` | the GHG Protocol should remain a neutral standard-setter and not embed a procurement policy |

`additionality_route` (only where `additionality_gap` = 1): `inventory` (differentiate instruments,
treat unbundled certificates as weaker, add a vintage or standard-supply incrementality test inside
Scope 2), `channel` (keep the inventory conservative and report financed capacity or avoided
emissions alongside it), `both`, else `na`.

`impact_metric`: `support` / `oppose` / `none` — stance, in the respondent's own words, on a
separate consequential or impact metric (the survey's Q146 answer is reported separately).

`legacy_design` (semicolon list, primary first):

| code | meaning |
|---|---|
| `guardrails` | wants limits: sunset or term cap, minimum original term, no unbundled certificates, no transfer, pre-cutoff anti-rush rules, mandatory disaggregated disclosure |
| `full_protection` | wants full original term, all instrument types, transfers / novation / renewals / asset-level protection |
| `uniform_date` | prefers a single effective date with disaggregated disclosure, or parallel old/new reporting |
| `support_unspecified` | supports a legacy clause without design detail |
| `oppose` | opposes a legacy clause |
| `not_addressed` | nothing on the legacy clause |

## 4. Provenance

All 49 submissions (842,000 characters including scale answers) were read in full by one AI
coder, in one pass, in October 2026. Themes were coded conservatively: a theme is 1 only where
the respondent states it, so absence means "not raised", not "disagrees". No second-coder
agreement statistic was computed. One pair of submissions (130, a redacted UK individual, and
598, PGIM) share 107 sentences verbatim; 130 is kept in the respondent table but excluded
from theme and legacy-design tallies so one voice is not counted twice. Three cohort members
share sentences with filers outside the cohort (Just Share with 57 other respondents — the
pro-hourly template; respondent 925 with 21; respondent 966 with 14), and the three
banking-sector bodies carry near-identical legacy-clause paragraphs; these are flagged in the
respondent table.
