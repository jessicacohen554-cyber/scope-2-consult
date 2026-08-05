#!/usr/bin/env python3
"""Export the frontend data contract (PLAN.md Sec. 5) into ``frontend/data/``.

Reads ``data/electricity_consequential.sqlite`` plus ``data/derived/*`` (P10)
and the curation inputs ``reference/exclusions.csv`` + ``reference/org_audit.csv``
(P20) and ``reference/coded_themes.csv`` + ``reference/theme_taxonomy.md`` +
``reference/curated_quotes.json`` (P21). Writes:

    meta.json            segment vocabularies, question codebook, matrix and
                         scoreboard registries
    stances.json         Q19/21/24/31/33/43/45 as SCELLs, overall and by segment
    matrix.json          the 9 additionality tests + Q28 feasibility picks
    scoreboard.json      OM / BM / weighting paired scoreboards, own-base nets
    themes.json          theme taxonomy + per-question coded-theme counts
    quotes.json          curated quotes per topic (for / against / context)
    respondents.json     distributions, attrition, redaction effect, org index
    orgs/{id}.json       one profile per named analytical-base respondent (105)
    integrity.json       exclusions, resubmission, families, clusters, blocs,
                         dedup effect, citations, org audit

Standard library only: no pandas, no ``sqlite3`` CLI, no ``openpyxl``. Most
columns in this database are TEXT-typed, so every numeric use casts explicitly.

The analytical base (PLAN gotcha 4)
-----------------------------------
``reference/exclusions.csv`` is authoritative: junk {11, 12, 14, 31} plus the
superseded resubmission {100}, leaving **180** of 185 respondents. Excluded
respondents appear only inside ``integrity.json``; every other file's
aggregates, org profiles and quote pools are computed on the base. That
enforcement reaches the curation inputs too - ``coded_themes.csv`` carries six
rows for ID 31, coded before the exclusion ruling landed, and they are filtered
out here rather than reaching ``themes.json``. Falling back to the P10
candidate list (or, failing that, to a hardcoded set) stamps
``"provisional_base": true`` in meta and warns loudly.

Determinism
-----------
Reruns are byte-identical: keys are sorted, percentages are rounded to 1dp with
ROUND_HALF_UP, files are written compactly with a trailing newline, and
``meta.generated`` carries the *source export's* publication date (parsed from
``data/manifest.json``) rather than a wall-clock stamp.

Privacy (PLAN gotcha 15)
------------------------
Four coarse segment dimensions only. Any segment *value* with fewer than
``MIN_SEGMENT_N`` respondents on the analytical base never gets a breakdown:
its cell collapses to the contract's ``{"n": "<5"}`` sentinel everywhere
(stances, matrix, feasibility, scoreboard sides). The guard is on the segment
value's overall size, not on the individual cell count, so the mask is stable
across every question and a reader cannot difference it out. Segment *sizes*
themselves are published in ``meta.segments`` - that is the closed vocabulary
the pages need for base chips.

Redacted respondents are never named. The ``name`` column (the person's name)
is never exported at all; the only identity emitted is ``organization``, and
only for ``is_redacted = 0``. Redacted members of clusters, blocs and families
are counts, never ids-with-names.

Curation inputs
---------------
Without ``--allow-missing-curation`` a missing ``reference/org_audit.csv``,
``reference/coded_themes.csv``, ``reference/theme_taxonomy.md`` or
``reference/curated_quotes.json`` is a loud failure. With the flag,
``themes.json`` and ``quotes.json`` are ``{}``, ``integrity.audit`` is
``{"provisional": true}``, ``meta.provisional`` is ``true`` and everything else
is emitted in full.

Usage
-----
    python3 scripts/analytics/export_frontend.py [--allow-missing-curation]
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sqlite3
import sys
from collections import Counter, defaultdict
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
HUB_ROOT = SCRIPT_DIR.parents[1]
DB_PATH = HUB_ROOT / "data" / "electricity_consequential.sqlite"
MANIFEST_PATH = HUB_ROOT / "data" / "manifest.json"
DERIVED_DIR = HUB_ROOT / "data" / "derived"
REFERENCE_DIR = HUB_ROOT / "reference"
EXCLUSIONS_CSV = REFERENCE_DIR / "exclusions.csv"
ORG_AUDIT_CSV = REFERENCE_DIR / "org_audit.csv"
CODED_THEMES_CSV = REFERENCE_DIR / "coded_themes.csv"
THEME_TAXONOMY_MD = REFERENCE_DIR / "theme_taxonomy.md"
CURATED_QUOTES_JSON = REFERENCE_DIR / "curated_quotes.json"
OUT_DIR = HUB_ROOT / "frontend" / "data"
ORGS_DIR = OUT_DIR / "orgs"

# P10's citation machinery is imported rather than re-implemented so the domain
# table below classifies exactly as data/derived/domains.csv does. It is
# recomputed here (not copied) because domains.csv covers all 185 respondents
# and every aggregate this exporter emits must sit on the analytical base.
sys.path.insert(0, str(SCRIPT_DIR))
import derive_flags  # noqa: E402  (sibling module, path set above)

# --- contract constants -----------------------------------------------------

MIN_SEGMENT_N = 5           # below this a segment value gets no breakdown
SENTINEL = "<5"             # the masked-count marker
SECTOR_TOP_N = 10
INDEX_NAME_MAX = 80         # respondents.json org_index[].name
PROFILE_NAME_MAX = 300      # orgs/{id}.json name (organization is free text)
QUOTE_MAX = 600
PREVIEW_MAX = 240
BASIS_MAX = 200
FILE_BUDGET = 300 * 1024
ORG_BUDGET = 150 * 1024

# The hardcoded last-resort base (PLAN gotcha 4). Only reached when neither
# reference/exclusions.csv nor data/derived/respondent_flags.csv is present.
FALLBACK_EXCLUSIONS = {11: "junk", 12: "junk", 14: "junk", 100: "superseded"}

# The five stance questions of the org-browser fingerprint (PLAN Sec. 4).
FINGERPRINT_QIDS = (("q19", "Q019"), ("q21", "Q021"), ("q24", "Q024"),
                    ("q31", "Q031"), ("q33", "Q033"))

# The stance strip questions of PLAN Sec. 5 stances.json.
STANCE_QIDS = ("Q019", "Q021", "Q024", "Q031", "Q033", "Q043", "Q045")

# Questions whose headline counts the integrity page shows with and without
# template-bloc dedup (PLAN Sec. 4, integrity panel 4).
DEDUP_EFFECT_QIDS = ("Q019", "Q021")

# --- segment vocabularies (closed and coarse, PLAN Sec. 5 / gotcha 15) -------

# (database value, full slug, display label, org_type_5 group).
# `slug` is the respondent's *claimed* organisation type at full resolution -
# used by integrity.audit.rows[].claimed, where collapsing to five values would
# destroy the claimed-vs-audited comparison. `group` is the org_type_5 key that
# every segmented aggregate uses.
ORG_TYPES = (
    ("Company", "company", "Company", "company"),
    ("Consultant supporting organizations with GHG inventories/strategies",
     "consultant", "Consultant", "consultant"),
    ("Non-profit organization/NGO/civil society", "ngo", "NGO/civil society",
     "ngo"),
    ("Industry group", "industry_group", "Industry group", "industry_group"),
    ("Energy supplier/retailer or utility", "energy_supplier",
     "Energy supplier/utility", "other"),
    ("Other (please specify below)", "other_specified", "Other", "other"),
    ("Academia/research", "academia", "Academia/research", "other"),
    ("Data/analytics or software provider related to GHG inventories",
     "data_analytics", "Data/analytics provider", "other"),
    ("Financial Institution", "financial", "Financial institution", "other"),
    ("Government institution", "government", "Government institution", "other"),
    ("GHG account/reporting program or initiative", "ghg_program",
     "GHG program/initiative", "other"),
    ("Certificate registry/tracking system operator", "registry_operator",
     "Registry operator", "other"),
    ("Verification/assurance provider", "verification",
     "Verification/assurance", "other"),
)

ORG_TYPE_5 = (
    ("company", "Company"),
    ("consultant", "Consultant"),
    ("ngo", "NGO/civil society"),
    ("industry_group", "Industry group"),
    ("other", "Other (all smaller types)"),
)

# country_4 (PLAN Sec. 5). Everything outside the three named countries groups.
COUNTRY_4 = (
    ("us", "United States", "United States"),
    ("uk", "United Kingdom", "United Kingdom"),
    ("jp", "Japan", "Japan"),
    ("other", None, "Other countries"),
)

RESPONDING_AS = (
    ("Organization", "organization", "Organization"),
    ("Individual", "individual", "Individual"),
)

REDACTION = (("named", "Named"), ("redacted", "Redacted"))

SEGMENT_LABELS = {
    "org_type_5": "Organization type",
    "country_4": "Country",
    "redaction": "Named vs redacted",
    "responding_as": "Responding as",
}

# Sector labels are long and carry GICS-ish codes; short labels are curated for
# all 24 values so the top-N cut reads well whatever it selects.
SECTORS = {
    "Energy (10)": "Energy",
    "Other (please specify below)": "Other (specified)",
    "Professional, scientific, and technical services (2020)":
        "Professional/scientific/technical services",
    "Information and communication technology (45)":
        "Information & communications technology",
    "Manufacturing": "Manufacturing",
    "Education": "Education",
    "Services": "Services",
    "Finance (40)": "Finance",
    "Utilities (water, gas, electricity) (551010, 551020, 551030, 551040)":
        "Utilities",
    "Power generation (551050)": "Power generation",
    "Transportation (2030)": "Transportation",
    "Retail (2550, 3010)": "Retail",
    "Fossil fuels (101020)": "Fossil fuels",
    "Food and beverage (302010, 302020)": "Food and beverage",
    "Materials (15)": "Materials",
    "Construction (201030)": "Construction",
    "Biotech, health care and pharmaceutical (35201010, 3510, 35202010)":
        "Biotech/health care/pharma",
    "Chemicals (151010)": "Chemicals",
    "Consumer goods (25, 30)": "Consumer goods",
    "Infrastructure (2010)": "Infrastructure",
    "Insurance (4030)": "Insurance",
    "Forestry": "Forestry",
    "Hospitality (253010)": "Hospitality",
    "Agriculture (30202010)": "Agriculture",
}

INVENTORY_HAS = (
    ("Yes", "yes", "Yes"),
    ("No", "no", "No"),
    ("Other or N/A (please specify)", "other", "Other / not applicable"),
)

INVENTORY_INVOLVED = (
    ("Yes (Including completing this survey on behalf of my organization, "
     "drawing on inputs from relevant teams)", "yes", "Yes"),
    ("Not applicable", "not_applicable", "Not applicable"),
    ("No", "no", "No"),
    ("Other (please specify below)", "other", "Other"),
)

# Engagement measured in substantive answers per respondent (PLAN Sec. 3.1's
# "median 19/43 substantive columns answered"). The leading zero band is an
# addition to P11's fixture bands: two analytical-base respondents answered no
# substantive question at all (PLAN Sec. 3.1's "183/185 answered >=1"), and
# without it the distribution would not sum to the base.
ENGAGEMENT_BANDS = (
    ("0", "No substantive answers", 0, 0),
    ("1_5", "1–5 answers", 1, 5),
    ("6_15", "6–15 answers", 6, 15),
    ("16_30", "16–30 answers", 16, 30),
    ("31_plus", "31 or more answers", 31, 10 ** 6),
)

# --- option vocabularies (closed; PLAN Sec. 5 "counts in meta option order") --
# Every exported choice question declares its option order explicitly. The order
# is editorial and fixed: renderers read it from meta and index SCELL.c by it,
# so it must never depend on counts. `special` marks the escape hatches of
# gotcha 6 - real options, shown as their own segments, never netted.

BINARY_YES_NO = (("Yes", "yes", "Yes", False), ("No", "no", "No", False))

OPTIONS = {
    "Q019": BINARY_YES_NO,
    "Q021": BINARY_YES_NO,
    "Q024": (
        ("Reported each year", "each_year", "Reported each year", False),
        ("Reported once for the lifetime of the project", "lifetime",
         "Reported once for the project lifetime", False),
    ),
    "Q031": (
        ("Yes", "yes", "Yes", False),
        ("Unsure, depends on details", "unsure", "Unsure, depends on details",
         True),
        ("No", "no", "No", False),
    ),
    "Q033": BINARY_YES_NO,
    "Q043": (
        ("Country", "country", "Country", False),
        ("Grid region", "grid_region", "Grid region", False),
        ("Balancing area", "balancing_area", "Balancing area", False),
        ("Zonal", "zonal", "Zonal", False),
        ("Nodal", "nodal", "Nodal", False),
    ),
    "Q045": (
        ("Annual", "annual", "Annual", False),
        ("Monthly", "monthly", "Monthly", False),
        ("Hourly", "hourly", "Hourly", False),
        ("Sub-hourly", "sub_hourly", "Sub-hourly", False),
    ),
    "Q028": (
        ("Regulatory test", "regulatory", "Regulatory test", False),
        ("Timing test", "timing", "Timing test", False),
        ("Financial analysis test", "financial_analysis",
         "Financial analysis test", False),
        ("Barrier test", "barrier", "Barrier test", False),
        ("Common practice test", "common_practice", "Common practice test",
         False),
        ("Positive list", "positive_list", "Positive list", False),
        ("Performance standard", "performance_standard",
         "Performance standard", False),
        ("Contractual/tenor test", "contractual_tenor",
         "Contractual/tenor test", False),
        ("First-of-its-kind test", "first_of_kind", "First-of-its-kind test",
         False),
        ("None (no tests are feasible)", "none_feasible",
         "None (no tests are feasible)", True),
    ),
}

# The matrix ladder, high -> low stringency (survey_meta.MATRIX_LEVELS). Not a
# sentiment ramp: "Required" is not approval (PLAN gotcha 5).
MATRIX_LEVELS = (
    ("Required", "required", "Required", 3),
    ("Optional", "optional", "Optional", 2),
    ("Not required", "not_required", "Not required", 1),
)
MATRIX_RANK = {key: rank for _text, key, _label, rank in MATRIX_LEVELS}
for _n in range(1, 10):
    OPTIONS[f"Q026_{_n}"] = tuple(
        (text, key, label, False) for text, key, label, _rank in MATRIX_LEVELS)

# The methodology picklists. Q35/Q36 and Q38/Q39 and Q47/Q49 are matched pairs:
# each pair shares one option vocabulary so the scoreboard can put the same
# option on both sides of the axis.
OM_METHODS = (
    ("SCED – locational", "sced_locational", "SCED – locational", False),
    ("Statistical", "statistical", "Statistical", False),
    ("SCED – fuel on the margin", "sced_fuel_on_margin",
     "SCED – fuel on the margin", False),
    ("Scenario modeling", "scenario_modeling", "Scenario modeling", False),
    ("Heat-rate/LMP", "heat_rate_lmp", "Heat-rate/LMP", False),
    ("Capacity factor based", "capacity_factor", "Capacity-factor-based",
     False),
    ("Difference-based", "difference_based", "Difference-based", False),
    ("None", "none", "None", True),
)
BM_METHODS = (
    ("Recent capacity additions", "recent_capacity_additions",
     "Recent capacity additions", False),
    ("Capacity expansion modeling", "capacity_expansion_modeling",
     "Capacity expansion modeling", False),
    ("Policy scenario", "policy_scenario", "Policy scenario", False),
    ("Average emission rate", "average_emission_rate",
     "Average emission rate", False),
    ("None", "none", "None", True),
)
# The weighting pair shares its five real approaches but *not* its escape
# hatches: Q47 offers "None are appropriate", Q49 offers "All are feasible",
# and both offer "Unsure". Declaring one merged list would claim options the
# survey never showed, so the pair's specials are declared per question.
WEIGHTING_APPROACHES = (
    ("GHG Protocol Guidelines for Quantifying GHG Reductions from "
     "Grid-connected Electricity Projects", "ghgp_grid_connected",
     "GHGP Grid-connected Electricity Projects Guidelines", False),
    ("UNFCCC CDM Tool07", "cdm_tool07", "UNFCCC CDM Tool07", False),
    ("Default 0.50 build margin weight for all projects", "default_5050",
     "Default 0.50 build-margin weight", False),
    ("Intervention lifecycle approaches", "intervention_lifecycle",
     "Intervention lifecycle approaches", False),
    ("Resource adequacy approaches", "resource_adequacy",
     "Resource adequacy approaches", False),
)
UNSURE = ("Unsure", "unsure", "Unsure", True)
OPTIONS["Q035"] = OM_METHODS
OPTIONS["Q036"] = OM_METHODS
OPTIONS["Q038"] = BM_METHODS
OPTIONS["Q039"] = BM_METHODS
OPTIONS["Q047"] = WEIGHTING_APPROACHES + (
    UNSURE,
    ("None are appropriate", "none_appropriate", "None are appropriate", True),
)
OPTIONS["Q049"] = WEIGHTING_APPROACHES + (
    UNSURE,
    ("All are feasible", "all_feasible", "All are feasible", True),
)

# The three scoreboards (PLAN Sec. 3.4 / Sec. 5). Nets use each question's own
# base (gotcha 7). Weighting's "not" side asks about *feasibility*, not
# appropriateness - the label says so rather than letting a reader assume it.
SCOREBOARDS = (
    ("om", "Operating-margin methods", "Q035", "Q036", OM_METHODS,
     "Appropriate (Q35)", "Not appropriate (Q36)"),
    ("bm", "Build-margin methods", "Q038", "Q039", BM_METHODS,
     "Appropriate (Q38)", "Not appropriate (Q39)"),
    ("weighting", "OM/BM weighting approaches", "Q047", "Q049",
     WEIGHTING_APPROACHES, "Appropriate (Q47)", "Not feasible (Q49)"),
)

# The nine additionality tests: matrix question -> stable test key. Q28's
# feasibility picks use the same keys so the required-vs-feasible cross of
# PLAN Sec. 4 can join them.
MATRIX_TESTS = (
    ("Q026_1", "regulatory"),
    ("Q026_2", "timing"),
    ("Q026_3", "financial_analysis"),
    ("Q026_4", "barrier"),
    ("Q026_5", "common_practice"),
    ("Q026_6", "positive_list"),
    ("Q026_7", "performance_standard"),
    ("Q026_8", "contractual_tenor"),
    ("Q026_9", "first_of_kind"),
)

# --- page map (PLAN Sec. 4) --------------------------------------------------
# Inclusive question-number ranges per topic page. Q18 is general feedback and
# sits on the formula page, as P11's fixtures read it.

PAGE_RANGES = (
    ("topics/formula.html", (18, 25)),
    ("topics/additionality.html", (26, 34)),
    ("topics/emission-rates.html", (35, 46)),
    ("topics/weighting.html", (47, 52)),
)

# --- P20's audited-class vocabulary (PLAN Sec. 6) ----------------------------
# Definitions for the integrity page's audit panel. `test_junk` is in the
# vocabulary because org_audit.csv uses it, but no analytical-base respondent
# carries it - the junk rows are excluded before the audit block is built.

AUDIT_VOCABULARY = (
    ("company", "Company", "A commercial firm answering for itself."),
    ("consultancy", "Consultancy",
     "A firm selling advisory or inventory-preparation services."),
    ("trade_association", "Trade association",
     "A body whose members are companies in an industry, funded by them."),
    ("business_coalition", "Business coalition",
     "A cross-industry corporate platform or buyers' alliance."),
    ("ngo_civil_society", "NGO / civil society",
     "A non-profit pursuing a public-interest mission, not a members' trade "
     "body."),
    ("think_tank", "Think tank",
     "A research and advocacy organisation outside the academy."),
    ("academic_institution", "Academic institution",
     "A university, college or a research group inside one."),
    ("data_vendor", "Data / software vendor",
     "A firm selling data, certificates or software for GHG accounting."),
    ("financial", "Financial institution",
     "A bank, asset manager, insurer or investor group."),
    ("government", "Government / public body",
     "A ministry, agency, regulator or intergovernmental organisation."),
    ("registry_operator", "Registry operator",
     "An operator of a certificate registry or tracking system."),
    ("standards_body", "Standards / assurance body",
     "A standard setter, programme, or verification/assurance provider."),
    ("individual", "Individual",
     "A person answering in a personal capacity, no organisation."),
    ("unverifiable", "Unverifiable",
     "Identity withheld, so the claim cannot be checked."),
    ("placeholder", "Placeholder",
     "The organisation field holds a placeholder, not an identifiable body."),
    ("test_junk", "Test / junk submission",
     "A submission whose content is test data or gibberish."),
)

# Which audited class each claimed organisation type maps onto when the audit
# *agrees* with the claim. Anything else is a divergence, which is the number
# the integrity page reports.
CLAIMED_EQUIVALENT = {
    "company": "company",
    "consultant": "consultancy",
    "ngo": "ngo_civil_society",
    "industry_group": "trade_association",
    "energy_supplier": "company",
    "academia": "academic_institution",
    "data_analytics": "data_vendor",
    "financial": "financial",
    "government": "government",
    "ghg_program": "standards_body",
    "registry_operator": "registry_operator",
    "verification": "standards_body",
    # "Other (please specify below)" makes no claim to diverge from.
    "other_specified": None,
}

BLOC_LABELS = {
    "policy_insights_pack": "Policy-insights response pack",
    "bullet_pack": "Bullet-formatted response pack",
}

WHITESPACE_RE = re.compile(r"\s+")
KEY_INDEX_RE = re.compile(
    r"^\|\s*\d+\s*\|\s*`([a-z0-9_]+)`\s*\|\s*(\w+)\s*\|\s*(.+?)\s*\|$", re.M)
THEME_SECTION_RE = re.compile(
    r"^###\s+\d+\.\s+`([a-z0-9_]+)`.*?\n\*\*Definition\.\*\*\s*(.+?)\n\*\*",
    re.M | re.S)


# --- helpers ----------------------------------------------------------------


def fail(message: str):
    raise SystemExit(f"export_frontend: {message}")


def warn(message: str) -> None:
    print(f"export_frontend: WARNING {message}", file=sys.stderr)


def r1(value):
    """Round to 1dp, half-up, so reruns and the validator agree bit for bit."""
    if value is None:
        return None
    return float(Decimal(repr(float(value))).quantize(Decimal("0.1"),
                                                      rounding=ROUND_HALF_UP))


def pct(count: int, base: int):
    return r1(100.0 * count / base) if base else None


def rel(path: Path) -> str:
    try:
        return str(path.relative_to(HUB_ROOT))
    except ValueError:
        return str(path)


def collapse(text: str) -> str:
    return WHITESPACE_RE.sub(" ", (text or "")).strip()


def truncate(text: str, limit: int) -> str:
    text = collapse(text)
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def write_json(path: Path, obj) -> int:
    text = json.dumps(obj, sort_keys=True, ensure_ascii=False,
                      separators=(",", ":")) + "\n"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return len(text.encode("utf-8"))


def read_csv(path: Path) -> list[dict]:
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def int_or_zero(value) -> int:
    try:
        return int(str(value).strip() or 0)
    except ValueError:
        return 0


def verbatim_in(text, stored) -> bool:
    """True if text is a verbatim substring of stored, allowing […]-marked
    elisions: each segment must appear verbatim, in order."""
    if stored is None:
        return False
    pos = 0
    for seg in (part.strip() for part in text.split("[…]")):
        if not seg:
            continue
        found = stored.find(seg, pos)
        if found < 0:
            return False
        pos = found + len(seg)
    return True


# --- loading ----------------------------------------------------------------


def load_generated_date() -> str:
    """The source export's publication date - deterministic, unlike a clock."""
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    match = re.search(r"(\d{4})\.(\d{2})\.(\d{2})", manifest.get("source_file", ""))
    if not match:
        fail(f"cannot read a source date from {rel(MANIFEST_PATH)}")
    return "-".join(match.groups())


def load_exclusions() -> tuple[dict[int, dict], bool]:
    """The analytical base (PLAN gotcha 4), newest authority first.

    Returns ``({respondent_id: {reason, evidence}}, provisional)``.
    """
    if EXCLUSIONS_CSV.exists():
        out = {}
        for row in read_csv(EXCLUSIONS_CSV):
            pid = int(row["respondent_id"])
            reason = (row.get("exclusion_reason") or "").strip()
            if reason not in ("junk", "superseded"):
                fail(f"{rel(EXCLUSIONS_CSV)}: respondent {pid} has "
                     f"exclusion_reason {reason!r}, outside "
                     "{'junk', 'superseded'}")
            out[pid] = {"reason": reason,
                        "evidence": collapse(row.get("evidence") or "")}
        if not out:
            fail(f"{rel(EXCLUSIONS_CSV)} is empty")
        return out, False

    flags_path = DERIVED_DIR / "respondent_flags.csv"
    if flags_path.exists():
        warn(f"{rel(EXCLUSIONS_CSV)} (P20) is missing - falling back to P10's "
             "candidates in respondent_flags.csv; meta.provisional_base = true")
        out = {}
        for row in read_csv(flags_path):
            pid = int(row["respondent_id"])
            if int_or_zero(row.get("is_junk_candidate")):
                out[pid] = {"reason": "junk",
                            "evidence": collapse(row.get("junk_evidence") or "")}
            elif int_or_zero(row.get("is_resubmission_superseded")):
                out[pid] = {
                    "reason": "superseded",
                    "evidence": f"Superseded by respondent "
                                f"{row.get('resubmission_of') or '?'}",
                }
        if out:
            return out, True

    warn("neither reference/exclusions.csv nor data/derived/respondent_flags.csv "
         "is available - falling back to the hardcoded exclusion set "
         f"{sorted(FALLBACK_EXCLUSIONS)}; meta.provisional_base = true")
    return ({pid: {"reason": reason, "evidence": ""}
             for pid, reason in FALLBACK_EXCLUSIONS.items()}, True)


ORG_TYPE_SLUG = {value: slug for value, slug, _label, _group in ORG_TYPES}
ORG_TYPE_LABEL = {slug: label for _value, slug, label, _group in ORG_TYPES}
ORG_TYPE_GROUP = {slug: group for _value, slug, _label, group in ORG_TYPES}
ORG_TYPE_5_LABEL = dict(ORG_TYPE_5)


def load_people(con) -> dict[int, dict]:
    people = {}
    for row in con.execute(
        """
        SELECT respondent_id, organization, country, responding_as,
               organization_type, sector, has_ghg_inventory,
               involved_in_inventory, is_redacted + 0 AS is_redacted,
               n_substantive_answered + 0 AS nsub,
               free_text_chars + 0 AS ft_chars
        FROM respondents ORDER BY respondent_id
        """
    ):
        pid = row["respondent_id"]
        org_type = row["organization_type"]
        if org_type not in ORG_TYPE_SLUG:
            fail(f"unknown organization_type {org_type!r} (respondent {pid}) "
                 "- extend ORG_TYPES")
        if row["sector"] not in SECTORS:
            fail(f"unknown sector {row['sector']!r} (respondent {pid}) "
                 "- extend SECTORS")
        responding = [slug for value, slug, _label in RESPONDING_AS
                      if value == row["responding_as"]]
        if not responding:
            fail(f"unknown responding_as {row['responding_as']!r} "
                 f"(respondent {pid})")
        country_key = "other"
        for key, value, _label in COUNTRY_4:
            if value is not None and value == row["country"]:
                country_key = key
        people[pid] = {
            "id": pid,
            "organization": row["organization"],
            "country_value": row["country"],
            "country": country_key,
            "responding_as": responding[0],
            "org_type_value": org_type,
            "org_type_full": ORG_TYPE_SLUG[org_type],
            "org_type": ORG_TYPE_GROUP[ORG_TYPE_SLUG[org_type]],
            "sector_value": row["sector"],
            "sector": SECTORS[row["sector"]],
            "has_inventory": row["has_ghg_inventory"],
            "involved": row["involved_in_inventory"],
            "redacted": bool(row["is_redacted"]),
            "nsub": int(row["nsub"]),
            "ft_chars": int(row["ft_chars"]),
        }
    return people


def load_questions(con) -> dict[str, dict]:
    """The substantive codebook: Q18 upward, profile questions never exported.

    Profile rows carry the respondent's name (Q4) and organisation (Q5); they
    are respondent attributes, published as segments and org-profile keys, and
    are excluded from meta.questions, attrition and the org answer lists.
    """
    out = {}
    for row in con.execute(
        """
        SELECT question_id, question_number, sub_number, display, shorthand,
               label, topic, doc_section, category, asks_for, question_type,
               role, section, section_order, n_answered + 0 AS n_answered
        FROM questions WHERE question_number >= 18
        ORDER BY question_number, sub_number
        """
    ):
        out[row["question_id"]] = dict(row)
    return out


def check_option_vocabularies(con) -> None:
    """Every declared option vocabulary must be a bijection onto the db's.

    A missing option would silently drop answers from a count; an invented one
    would publish a category the survey never offered. Both fail here, at
    startup, rather than showing up as a quietly wrong bar.
    """
    for qid, declared in sorted(OPTIONS.items()):
        db_texts = {row[0] for row in con.execute(
            "SELECT option_text FROM question_options WHERE question_id = ?",
            (qid,))}
        declared_texts = [text for text, _key, _label, _special in declared]
        if not db_texts:
            fail(f"{qid} is declared in OPTIONS but has no question_options")
        if len(set(declared_texts)) != len(declared_texts):
            fail(f"{qid}: OPTIONS declares a duplicate option text")
        missing = sorted(db_texts - set(declared_texts))
        extra = sorted(set(declared_texts) - db_texts)
        if missing or extra:
            fail(f"{qid}: OPTIONS does not match question_options "
                 f"(missing {missing}, invented {extra})")
        db_specials = {row[0] for row in con.execute(
            "SELECT option_text FROM question_options WHERE question_id = ? "
            "AND is_special + 0 = 1", (qid,))}
        declared_specials = {text for text, _k, _l, special in declared
                             if special}
        if declared_specials != db_specials:
            fail(f"{qid}: OPTIONS flags {sorted(declared_specials)} as special, "
                 f"question_options.is_special flags {sorted(db_specials)}")


def load_flags() -> dict[int, dict]:
    return {int(row["respondent_id"]): row
            for row in read_csv(DERIVED_DIR / "respondent_flags.csv")}


def load_text_clusters() -> list[dict]:
    clusters = []
    for row in read_csv(DERIVED_DIR / "text_clusters.csv"):
        clusters.append({
            "hash": row["cluster_hash"],
            "chars": int(row["chars"]),
            "n_respondents": int(row["n_respondents"]),
            "n_named": int(row["n_named"]),
            "n_redacted": int(row["n_redacted"]),
            "preview": truncate(row["preview_240"], PREVIEW_MAX),
            "has_citation": bool(int_or_zero(row["has_citation"])),
            "members": sorted(int(part) for part in
                              row["member_ids"].split("|") if part),
            "question_numbers": sorted(int(part) for part in
                                       row["question_numbers"].split("|")
                                       if part),
        })
    clusters.sort(key=lambda item: (-item["n_respondents"], -item["chars"],
                                    item["hash"]))
    return clusters


# --- segments ---------------------------------------------------------------


def build_segments(people: dict[int, dict], base: list[int]) -> dict:
    """dim -> {label, values:[{key,label,n}], of:{respondent_id: key},
    masked:{keys}}. Sizes are analytical-base respondent counts."""
    dims: dict[str, dict] = {}

    def add(dim, ordered_keys, of):
        counts = Counter(of[pid] for pid in base)
        dims[dim] = {
            "label": SEGMENT_LABELS[dim],
            "values": [{"key": key, "label": label, "n": counts.get(key, 0)}
                       for key, label in ordered_keys],
            "of": of,
        }

    add("org_type_5", ORG_TYPE_5,
        {pid: person["org_type"] for pid, person in people.items()})
    add("country_4", [(key, label) for key, _value, label in COUNTRY_4],
        {pid: person["country"] for pid, person in people.items()})
    add("redaction", REDACTION,
        {pid: ("redacted" if person["redacted"] else "named")
         for pid, person in people.items()})
    add("responding_as", [(slug, label) for _value, slug, label in RESPONDING_AS],
        {pid: person["responding_as"] for pid, person in people.items()})

    for entry in dims.values():
        entry["masked"] = {value["key"] for value in entry["values"]
                           if value["n"] < MIN_SEGMENT_N}
    return dims


# --- the cell grammar (PLAN Sec. 5) -----------------------------------------


def scell(counts: Counter, order: list[str]) -> dict:
    """SCELL = {"c": [counts in meta option order], "n": <sum>}."""
    values = [counts.get(key, 0) for key in order]
    return {"c": values, "n": sum(values)}


def segmented_scell(answers: dict[int, str], order: list[str],
                    segments: dict) -> dict:
    """{overall: SCELL, by: {dim: {value: SCELL | {"n": "<5"}}}}."""
    entry = {"overall": scell(Counter(answers.values()), order), "by": {}}
    for dim, seg in segments.items():
        cells = {}
        for value in seg["values"]:
            key = value["key"]
            if key in seg["masked"]:
                cells[key] = {"n": SENTINEL}
                continue
            counts = Counter(option for pid, option in answers.items()
                             if seg["of"][pid] == key)
            cells[key] = scell(counts, order)
        entry["by"][dim] = cells
    return entry


def pick_cell(ids: set[int], segments: dict) -> dict:
    """A count cell for pick questions: {"n": N, "by": {dim: {value: {"n"}}}}."""
    by = {}
    for dim, seg in segments.items():
        cells = {}
        for value in seg["values"]:
            key = value["key"]
            if key in seg["masked"]:
                cells[key] = {"n": SENTINEL}
            else:
                cells[key] = {"n": sum(1 for pid in ids
                                       if seg["of"][pid] == key)}
        by[dim] = cells
    return {"n": len(ids), "by": by}


# --- answer access ----------------------------------------------------------


class Answers:
    """Analytical-base answers, indexed the handful of ways this export needs."""

    def __init__(self, con, base: set[int]):
        self.base = base
        self.text: dict[str, dict[int, str]] = defaultdict(dict)
        self.raw_text: dict[str, dict[int, str]] = defaultdict(dict)
        for row in con.execute(
            "SELECT respondent_id, question_id, answer_text FROM responses "
            "WHERE answer_text IS NOT NULL ORDER BY respondent_id, question_id"
        ):
            self.raw_text[row["question_id"]][row["respondent_id"]] = \
                row["answer_text"]
            if row["respondent_id"] in base:
                self.text[row["question_id"]][row["respondent_id"]] = \
                    row["answer_text"]

        self.picks: dict[str, dict[str, set[int]]] = defaultdict(
            lambda: defaultdict(set))
        self.pickers: dict[str, set[int]] = defaultdict(set)
        for row in con.execute(
            "SELECT respondent_id, question_id, option_text "
            "FROM response_selections ORDER BY respondent_id, selection_index"
        ):
            if row["respondent_id"] not in base:
                continue
            self.picks[row["question_id"]][row["option_text"]].add(
                row["respondent_id"])
            self.pickers[row["question_id"]].add(row["respondent_id"])

    def n_answered(self, qid: str) -> int:
        return len(self.text.get(qid, {}))

    def keyed(self, qid: str) -> dict[int, str]:
        """respondent_id -> option key, for a single/ordinal/matrix question."""
        table = {text: key for text, key, _label, _special in OPTIONS[qid]}
        out = {}
        for pid, text in self.text.get(qid, {}).items():
            if text not in table:
                fail(f"{qid}: answer {text!r} (respondent {pid}) is not in the "
                     "declared option vocabulary - extend OPTIONS")
            out[pid] = table[text]
        return out


def option_order(qid: str) -> list[str]:
    return [key for _text, key, _label, _special in OPTIONS[qid]]


# --- meta -------------------------------------------------------------------


def page_of(number: int):
    for page, (low, high) in PAGE_RANGES:
        if low <= number <= high:
            return page
    return None


def build_meta(questions, answers, segments, people, base, generated,
               polarity, provisional_base, provisional_curation) -> dict:
    entries = []
    for qid, question in questions.items():
        entry = {
            "qid": qid,
            "display": question["display"],
            "shorthand": question["shorthand"],
            "label": question["label"],
            "topic": question["topic"],
            "doc_section": question["doc_section"],
            "type": question["question_type"],
            "asks_for": question["asks_for"],
            "n_answered": answers.n_answered(qid),
            "page": page_of(question["question_number"]),
            "options": [],
        }
        for _text, key, label, special in OPTIONS.get(qid, ()):
            option = {"key": key, "label": label}
            if special:
                option["special"] = True
            if qid.startswith("Q026_"):
                option["rank"] = MATRIX_RANK[key]
            elif qid in ("Q043", "Q045"):
                # Coarse -> fine, survey_meta's ORDINAL_LADDERS order.
                option["rank"] = option_order(qid).index(key) + 1
            entry["options"].append(option)
        if qid in polarity and polarity[qid] is not None:
            entry["polarity"] = polarity[qid]
        entries.append(entry)

    matrix_tests = [{
        "qid": qid,
        "key": key,
        "label": questions[qid]["label"],
        "n": answers.n_answered(qid),
    } for qid, key in MATRIX_TESTS]

    scoreboards = {}
    for key, label, q_app, q_not, _options, _l_app, _l_not in SCOREBOARDS:
        scoreboards[key] = {
            "label": label,
            "q_app": q_app,
            "q_not": q_not,
            "base_app": len(answers.pickers[q_app]),
            "base_not": len(answers.pickers[q_not]),
        }

    n_redacted = sum(1 for pid in base if people[pid]["redacted"])
    free_text = sum(answers.n_answered(qid) for qid, question in questions.items()
                    if question["question_type"] == "free_text")
    return {
        "generated": generated,
        "matrix": {
            "levels": [{"key": key, "label": label}
                       for _text, key, label, _rank in MATRIX_LEVELS],
            "tests": matrix_tests,
        },
        "provisional": provisional_curation,
        "provisional_base": provisional_base,
        "questions": entries,
        "scoreboards": scoreboards,
        "segments": {dim: {"label": seg["label"], "values": seg["values"]}
                     for dim, seg in segments.items()},
        "totals": {
            "answers": sum(answers.n_answered(qid) for qid in questions),
            "free_text_answers": free_text,
            "named": len(base) - n_redacted,
            "questions": len(entries),
            "redacted": n_redacted,
            "respondents": len(base),
            "respondents_raw": len(people),
        },
    }


def load_polarity(questions) -> dict[str, dict]:
    """survey_meta.POLARITY, translated from answer text to option keys.

    A ``None`` entry there is a documented judgment that the question has no
    proposal-relative polarity (Q31, Q33); it becomes an absent key here, which
    is what the renderers read as "no support ramp, use the neutral sequence".
    """
    sys.path.insert(0, str(HUB_ROOT / "scripts"))
    import survey_meta  # noqa: PLC0415  (path set above)

    out = {}
    for number, entry in survey_meta.POLARITY.items():
        qid = f"Q{number:03d}"
        if qid not in questions:
            fail(f"survey_meta.POLARITY names Q{number}, absent from the "
                 "substantive codebook")
        if entry is None:
            continue
        table = {text: key for text, key, _label, _special in OPTIONS[qid]}
        critical = entry["critical"]
        if critical not in table:
            fail(f"{qid}: POLARITY critical answer {critical!r} is not one of "
                 "its options")
        out[qid] = {"critical": table[critical]}
    return out


# --- stances / matrix / scoreboard ------------------------------------------


def build_stances(answers, segments) -> dict:
    return {qid: segmented_scell(answers.keyed(qid), option_order(qid), segments)
            for qid in STANCE_QIDS}


def build_matrix(answers, segments) -> dict:
    tests = {qid: segmented_scell(answers.keyed(qid), option_order(qid),
                                  segments)
             for qid, _key in MATRIX_TESTS}

    picks = answers.picks["Q028"]
    table = {text: (key, special)
             for text, key, _label, special in OPTIONS["Q028"]}
    for text in picks:
        if text not in table:
            fail(f"Q028: selection {text!r} is not in the declared option "
                 "vocabulary - extend OPTIONS")
    per_test = {}
    specials = {}
    for text, ids in picks.items():
        key, special = table[text]
        if special:
            specials[key] = {"n": len(ids)}
        else:
            per_test[key] = pick_cell(ids, segments)
    return {
        "feasibility": {
            "n": len(answers.pickers["Q028"]),
            "per_test": per_test,
            "specials": specials,
        },
        "tests": tests,
    }


def build_scoreboard(answers, segments) -> dict:
    out = {}
    for key, _label, q_app, q_not, options, _l_app, _l_not in SCOREBOARDS:
        base_app = len(answers.pickers[q_app])
        base_not = len(answers.pickers[q_not])
        rows = []
        for text, opt_key, label, special in options:
            if special:
                continue
            app_ids = answers.picks[q_app].get(text, set())
            not_ids = answers.picks[q_not].get(text, set())
            rows.append({
                "key": opt_key,
                "label": label,
                "app": pick_cell(app_ids, segments),
                "not": pick_cell(not_ids, segments),
                # gotcha 7: each side divides by its own base, and the net is
                # the difference of the two *displayed* percentages, so a
                # reader can reproduce it from the two bars on screen.
                "net_pct": r1((pct(len(app_ids), base_app) or 0.0)
                              - (pct(len(not_ids), base_not) or 0.0)),
            })
        rows.sort(key=lambda row: (-row["net_pct"], row["key"]))

        # Specials are never netted (gotcha 6) and are declared per question,
        # because the two sides of a pair do not offer the same escape hatches.
        specials = []
        for side, qid in (("app", q_app), ("not", q_not)):
            for text, opt_key, label, special in OPTIONS[qid]:
                if not special:
                    continue
                ids = answers.picks[qid].get(text, set())
                if ids:
                    specials.append({"key": opt_key, "label": label,
                                     "side": side, "n": len(ids)})
        out[key] = {"base_app": base_app, "base_not": base_not,
                    "options": rows, "specials": specials}
    return out


# --- themes -----------------------------------------------------------------


def load_taxonomy() -> list[dict]:
    text = THEME_TAXONOMY_MD.read_text(encoding="utf-8")
    definitions = {key: collapse(definition)
                   for key, definition in THEME_SECTION_RE.findall(text)}
    taxonomy = []
    for key, polarity, label in KEY_INDEX_RE.findall(text):
        if key not in definitions:
            fail(f"{rel(THEME_TAXONOMY_MD)}: theme {key} has no "
                 "**Definition.** paragraph")
        if polarity not in ("concern", "support", "design", "neutral"):
            fail(f"{rel(THEME_TAXONOMY_MD)}: theme {key} has polarity "
                 f"{polarity!r}, outside the closed vocabulary")
        taxonomy.append({"key": key, "label": collapse(label),
                         "definition": definitions[key], "polarity": polarity})
    if not taxonomy:
        fail(f"{rel(THEME_TAXONOMY_MD)}: no key index table found")
    return taxonomy


def build_themes(questions, answers, base, cluster_of, allow_missing) -> dict:
    if not (CODED_THEMES_CSV.exists() and THEME_TAXONOMY_MD.exists()):
        if not allow_missing:
            fail(f"missing {rel(CODED_THEMES_CSV)} / {rel(THEME_TAXONOMY_MD)} "
                 "(P21). Rerun with --allow-missing-curation to emit no themes.")
        return {}

    taxonomy = load_taxonomy()
    valid = {entry["key"] for entry in taxonomy}
    # P21 reserves `uncodeable` for answers with no thematic content. It is not
    # a taxonomy key: it never appears in themes[] and never counts as coded.
    coded: dict[str, dict[str, set[int]]] = defaultdict(
        lambda: defaultdict(set))
    coded_any: dict[str, set[int]] = defaultdict(set)
    dropped = 0
    for row in read_csv(CODED_THEMES_CSV):
        pid = int(row["respondent_id"])
        if pid not in base:
            # PLAN gotcha 4: ID 31's six answers were coded before the
            # exclusion ruling landed. The base filter is enforced here.
            dropped += 1
            continue
        qid = f"Q{int(row['question_number']):03d}"
        if qid not in questions:
            fail(f"{rel(CODED_THEMES_CSV)}: unknown question "
                 f"{row['question_number']} (respondent {pid})")
        if pid not in answers.text.get(qid, {}):
            fail(f"{rel(CODED_THEMES_CSV)}: respondent {pid} is coded for "
                 f"{qid} but has no answer to it")
        for key in (row["theme_keys"] or "").split("|"):
            if not key or key == "uncodeable":
                continue
            if key not in valid:
                fail(f"{rel(CODED_THEMES_CSV)}: theme {key!r} (respondent "
                     f"{pid}, {qid}) is outside the taxonomy")
            coded[qid][key].add(pid)
            coded_any[qid].add(pid)
    if dropped:
        print(f"export_frontend: filtered {dropped} coded_themes rows for "
              "excluded respondents (PLAN gotcha 4)")

    by_question = {}
    for qid in sorted(coded_any):
        n_texts = answers.n_answered(qid)
        themes = []
        for key, ids in coded[qid].items():
            themes.append({
                "key": key,
                "n": len(ids),
                "n_dedup": len(dedup_groups(ids, qid, cluster_of)),
                "share_pct": pct(len(ids), n_texts),
            })
        themes.sort(key=lambda theme: (-theme["n"], theme["key"]))
        by_question[qid] = {
            "n_texts": n_texts,
            "n_coded": len(coded_any[qid]),
            "themes": themes,
        }
    return {"by_question": by_question, "taxonomy": taxonomy}


def dedup_groups(ids, qid: str, cluster_of) -> set:
    """Collapse respondents who shared a template text on this question.

    PLAN Sec. 3.5: every "N said X" claim needs text-dedup. Members of one
    text cluster on *this* question count once; everyone else counts alone.
    """
    groups = set()
    for pid in ids:
        cluster = cluster_of.get((pid, qid))
        groups.add(("cluster", cluster) if cluster else ("respondent", pid))
    return groups


# --- quotes -----------------------------------------------------------------


def build_quotes(answers, people, base, allow_missing) -> dict:
    if not CURATED_QUOTES_JSON.exists():
        if not allow_missing:
            fail(f"missing {rel(CURATED_QUOTES_JSON)} (P21). Rerun with "
                 "--allow-missing-curation to emit no quotes.")
        return {}

    curated = json.loads(CURATED_QUOTES_JSON.read_text(encoding="utf-8"))
    if not isinstance(curated, dict):
        fail(f"{rel(CURATED_QUOTES_JSON)}: expected an object keyed by topic")

    out = {}
    for topic, sides in sorted(curated.items()):
        if topic.startswith("_"):
            continue
        entry = {"for": [], "against": [], "context": []}
        for side in ("for", "against", "context"):
            for quote in sides.get(side) or []:
                pid = int(quote["respondent_id"])
                qid = str(quote["qid"])
                if pid not in base:
                    fail(f"{rel(CURATED_QUOTES_JSON)}: {topic}/{side} quotes "
                         f"respondent {pid}, who is outside the analytical base")
                stored = answers.text.get(qid, {}).get(pid)
                if stored is None:
                    fail(f"{rel(CURATED_QUOTES_JSON)}: respondent {pid} has no "
                         f"answer to {qid} ({topic}/{side})")
                text = (quote.get("text") or "").strip()
                if not verbatim_in(text, stored):
                    fail(f"{rel(CURATED_QUOTES_JSON)}: {topic}/{side} quote for "
                         f"respondent {pid} {qid} is not a verbatim substring "
                         "of the stored answer")
                if len(text) > QUOTE_MAX:
                    fail(f"{rel(CURATED_QUOTES_JSON)}: {topic}/{side} quote for "
                         f"respondent {pid} {qid} is {len(text)} chars "
                         f"(limit {QUOTE_MAX})")
                person = people[pid]
                if person["redacted"] and not quote.get("redacted"):
                    fail(f"{rel(CURATED_QUOTES_JSON)}: respondent {pid} is "
                         "redacted but the quote is not flagged redacted")
                if person["redacted"] and not str(
                        quote.get("attribution", "")).startswith("Redacted"):
                    fail(f"{rel(CURATED_QUOTES_JSON)}: redacted respondent "
                         f"{pid} carries a naming attribution")
                entry[side].append({
                    "attribution": quote["attribution"],
                    # org_type is collapsed to the org_type_5 vocabulary so the
                    # voices-page filter shares the segment keys; the finer
                    # claimed type is still spelled out in the attribution.
                    "org_type": person["org_type"],
                    "qid": qid,
                    "redacted": person["redacted"],
                    "respondent_id": pid,
                    "template_cluster": quote.get("template_cluster"),
                    "text": text,
                    "themes": list(quote.get("themes") or []),
                })
        out[topic] = entry
    return out


# --- respondents ------------------------------------------------------------


def attribution(person: dict) -> str:
    name = ("Redacted" if person["redacted"]
            else truncate(person["organization"], INDEX_NAME_MAX))
    return (f"{name} — {ORG_TYPE_LABEL[person['org_type_full']]}, "
            f"{person['country_value']}")


def distribution(counts: Counter, ordered, base_n: int, with_pct=False):
    rows = []
    for key, label in ordered:
        row = {"key": key, "label": label, "n": counts.get(key, 0)}
        if with_pct:
            row["pct"] = pct(counts.get(key, 0), base_n)
        rows.append(row)
    return rows


def build_respondents(questions, answers, segments, people, base, flags,
                      audit_class) -> dict:
    attrition = [{"qid": qid, "display": question["display"],
                  "n": answers.n_answered(qid)}
                 for qid, question in questions.items()]

    redaction_effect = []
    for qid in STANCE_QIDS:
        keyed = answers.keyed(qid)
        order = option_order(qid)
        redaction_effect.append({
            "qid": qid,
            "named": scell(Counter(key for pid, key in keyed.items()
                                   if not people[pid]["redacted"]), order),
            "redacted": scell(Counter(key for pid, key in keyed.items()
                                      if people[pid]["redacted"]), order),
        })

    named_counts = Counter()
    redacted_counts = Counter()
    for pid in base:
        target = redacted_counts if people[pid]["redacted"] else named_counts
        target[people[pid]["org_type"]] += 1
    org_rows = [{
        "key": key,
        "label": label,
        "named": named_counts.get(key, 0),
        "redacted": redacted_counts.get(key, 0),
        "total": named_counts.get(key, 0) + redacted_counts.get(key, 0),
    } for key, label in ORG_TYPE_5]

    sector_counts = Counter(people[pid]["sector"] for pid in base)
    ordered_sectors = sorted(sector_counts.items(),
                             key=lambda kv: (-kv[1], kv[0]))
    sector_top = [{"label": label, "n": count}
                  for label, count in ordered_sectors[:SECTOR_TOP_N]]
    tail = ordered_sectors[SECTOR_TOP_N:]
    if tail:
        sector_top.append({"label": f"All other sectors ({len(tail)})",
                           "n": sum(count for _label, count in tail)})

    bands = Counter()
    for pid in base:
        for key, _label, low, high in ENGAGEMENT_BANDS:
            if low <= people[pid]["nsub"] <= high:
                bands[key] += 1
                break

    fingerprints = {field: answers.keyed(qid) for field, qid in FINGERPRINT_QIDS}
    org_index = []
    for pid in base:
        person = people[pid]
        if person["redacted"]:
            continue
        flag = flags[pid]
        org_index.append({
            "id": pid,
            "name": truncate(person["organization"], INDEX_NAME_MAX),
            "org_type": person["org_type"],
            "audited_class": audit_class.get(pid),
            "country": person["country"],
            "nsub": person["nsub"],
            "ft_chars": person["ft_chars"],
            "cites": bool(int_or_zero(flag["has_citation"])),
            "template": bool(int_or_zero(flag["is_template_respondent"])),
            "family": flag["entity_family"] or None,
            "fingerprint": {field: fingerprints[field].get(pid)
                            for field, _qid in FINGERPRINT_QIDS},
        })

    return {
        "attrition": attrition,
        "distributions": {
            "country": distribution(
                Counter(people[pid]["country"] for pid in base),
                [(key, label) for key, _value, label in COUNTRY_4],
                len(base), with_pct=True),
            "engagement_bands": [
                {"key": key, "label": label, "n": bands.get(key, 0)}
                for key, label, _low, _high in ENGAGEMENT_BANDS],
            "inventory": {
                "has_inventory": distribution(
                    Counter(inventory_key(people[pid]["has_inventory"],
                                          INVENTORY_HAS, pid)
                            for pid in base),
                    [(slug, label) for _v, slug, label in INVENTORY_HAS],
                    len(base)),
                "involved": distribution(
                    Counter(inventory_key(people[pid]["involved"],
                                          INVENTORY_INVOLVED, pid)
                            for pid in base),
                    [(slug, label) for _v, slug, label in INVENTORY_INVOLVED],
                    len(base)),
            },
            "org_type_x_redaction": {
                "rows": org_rows,
                "total": {"named": sum(named_counts.values()),
                          "redacted": sum(redacted_counts.values())},
            },
            "responding_as": distribution(
                Counter(people[pid]["responding_as"] for pid in base),
                [(slug, label) for _v, slug, label in RESPONDING_AS],
                len(base)),
            "sector_top": sector_top,
        },
        "org_index": org_index,
        "redaction_effect": redaction_effect,
    }


def inventory_key(value, table, pid):
    for db_value, slug, _label in table:
        if db_value == value:
            return slug
    fail(f"unknown inventory value {value!r} (respondent {pid})")


# --- org profiles -----------------------------------------------------------


def build_orgs(questions, answers, people, base, flags, audit_class,
               audit_basis) -> list[tuple[int, dict]]:
    selections: dict[tuple[int, str], list[str]] = defaultdict(list)
    for qid, picks in answers.picks.items():
        for text, ids in picks.items():
            for pid in ids:
                selections[(pid, qid)].append(text)

    out = []
    for pid in base:
        person = people[pid]
        if person["redacted"]:
            continue
        flag = flags[pid]
        entries = []
        for qid, question in questions.items():
            stored = answers.text.get(qid, {}).get(pid)
            picked = sorted(selections.get((pid, qid), []))
            if stored is None and not picked:
                continue
            free_text = question["question_type"] == "free_text"
            if not free_text and not picked and stored is not None:
                # single_select / ordinal_select / matrix_rating answers live in
                # responses.answer_text; the fixtures render them as a
                # one-element `selections` list with `text` null.
                picked = [stored]
            entries.append({
                "qid": qid,
                "display": question["display"],
                "shorthand": question["shorthand"],
                "label": question["label"],
                "type": question["question_type"],
                "text": stored if free_text else None,
                "selections": picked,
            })
        out.append((pid, {
            "id": pid,
            "name": truncate(person["organization"], PROFILE_NAME_MAX),
            "org_type": person["org_type"],
            "audited_class": audit_class.get(pid),
            "audit_basis": audit_basis.get(pid, ""),
            "sector": person["sector"],
            "country": person["country"],
            "responding_as": person["responding_as"],
            "flags": {
                "template": bool(int_or_zero(flag["is_template_respondent"])),
                "family": flag["entity_family"] or None,
                "cites": bool(int_or_zero(flag["has_citation"])),
                "citation_count": int_or_zero(flag["n_citation_answers"]),
            },
            "answers": entries,
        }))
    return out


# --- integrity --------------------------------------------------------------


def build_audit(people, base, allow_missing) -> tuple[dict, dict, dict]:
    """(audit block, respondent_id -> audited class, respondent_id -> basis)."""
    named_base = sorted(pid for pid in base if not people[pid]["redacted"])
    if not ORG_AUDIT_CSV.exists():
        if not allow_missing:
            fail(f"missing {rel(ORG_AUDIT_CSV)} (P20). Rerun with "
                 "--allow-missing-curation to emit a provisional audit block.")
        return {"provisional": True}, {}, {}

    valid = {key for key, _label, _definition in AUDIT_VOCABULARY}
    audited: dict[int, str] = {}
    basis: dict[int, str] = {}
    for row in read_csv(ORG_AUDIT_CSV):
        pid = int(row["respondent_id"])
        if pid not in people:
            fail(f"{rel(ORG_AUDIT_CSV)}: unknown respondent_id {pid}")
        if people[pid]["redacted"]:
            fail(f"{rel(ORG_AUDIT_CSV)}: respondent {pid} is redacted and must "
                 "not be audited by name")
        klass = (row["audited_class"] or "").strip()
        if klass not in valid:
            fail(f"{rel(ORG_AUDIT_CSV)}: respondent {pid} has audited_class "
                 f"{klass!r}, outside the closed vocabulary")
        audited[pid] = klass
        basis[pid] = truncate(row.get("basis") or "", BASIS_MAX)
    missing = [pid for pid in named_base if pid not in audited]
    if missing:
        fail(f"{rel(ORG_AUDIT_CSV)}: {len(missing)} named analytical-base "
             f"respondents are unaudited, first few {missing[:5]}")

    rows = []
    matching = 0
    for pid in named_base:
        claimed = people[pid]["org_type_full"]
        rows.append({
            "id": pid,
            "name": truncate(people[pid]["organization"], INDEX_NAME_MAX),
            "claimed": claimed,
            "audited": audited[pid],
            "basis": basis[pid],
        })
        if CLAIMED_EQUIVALENT.get(claimed) == audited[pid]:
            matching += 1

    used = Counter(row["audited"] for row in rows)
    labels = {key: label for key, label, _definition in AUDIT_VOCABULARY}
    by_class = [{"key": key, "label": labels[key], "n": used[key]}
                for key, _label, _definition in AUDIT_VOCABULARY if used[key]]
    vocabulary = [{"key": key, "label": label, "definition": definition}
                  for key, label, definition in AUDIT_VOCABULARY if used[key]]
    audit = {
        "rows": rows,
        "summary": {
            "by_class": by_class,
            # "matching" = the audit landed on the class the respondent's own
            # organisation-type answer implies. "Other (please specify)" claims
            # nothing, so those rows can only diverge.
            "n_matching": matching,
            "n_diverging": len(rows) - matching,
            "n_rows": len(rows),
        },
        "vocabulary": vocabulary,
    }
    return audit, {pid: audited[pid] for pid in named_base}, \
        {pid: basis[pid] for pid in named_base}


def build_dedup_effect(answers, cluster_bloc) -> list[dict]:
    """Q19/Q21 with and without template-bloc dedup (PLAN Sec. 4, integrity).

    The dedup rule: every bloc contributes each *distinct* answer once. Where a
    bloc's members all answered the same way - which is the case throughout
    this record - that is one vote for the bloc instead of one per member.
    """
    rows = []
    for qid in DEDUP_EFFECT_QIDS:
        keyed = answers.keyed(qid)
        order = option_order(qid)
        raw = Counter(keyed.values())
        deduped = Counter()
        seen_bloc: set[tuple[str, str]] = set()
        for pid, key in sorted(keyed.items()):
            bloc = cluster_bloc.get(pid)
            if bloc is None:
                deduped[key] += 1
                continue
            if (bloc, key) in seen_bloc:
                continue
            seen_bloc.add((bloc, key))
            deduped[key] += 1
        rows.append({"qid": qid, "raw": scell(raw, order),
                     "deduped": scell(deduped, order)})
    return rows


def build_citations(questions, answers, segments, people, base, flags,
                    clusters) -> dict:
    # Rows are {key, n, citing, pct} exactly as Sec. 5 and P11's fixtures have
    # them: no label, because the key is a segment/option key the page already
    # has a label for in meta.
    def split(rows):
        out = []
        for key, members in rows:
            citing = sum(1 for pid in members
                         if int_or_zero(flags[pid]["has_citation"]))
            out.append({"key": key, "n": len(members), "citing": citing,
                        "pct": pct(citing, len(members))})
        return out

    by_org_type = split([
        (value["key"],
         [pid for pid in base
          if segments["org_type_5"]["of"][pid] == value["key"]])
        for value in segments["org_type_5"]["values"]])
    by_redaction = split([
        (value["key"],
         [pid for pid in base
          if segments["redaction"]["of"][pid] == value["key"]])
        for value in segments["redaction"]["values"]])
    q19 = answers.keyed("Q019")
    by_stance = split([
        (key, [pid for pid, answer in q19.items() if answer == key])
        for _text, key, _label, _special in OPTIONS["Q019"]])

    # domains.csv (P10) covers all 185 respondents; the table is recomputed here
    # on the analytical base with P10's own regex and classifier so the two
    # never drift apart in classification, only in base.
    domain_answers: dict[str, set] = defaultdict(set)
    domain_respondents: dict[str, set] = defaultdict(set)
    per_answer_domains: dict[tuple[int, str], set] = defaultdict(set)
    for qid, question in questions.items():
        if question["question_type"] != "free_text":
            continue
        for pid, text in answers.text[qid].items():
            for match in derive_flags.URL_RE.findall(text):
                domain = derive_flags.registrable_domain(match)
                if not domain:
                    continue
                domain_answers[domain].add((pid, qid))
                domain_respondents[domain].add(pid)
                per_answer_domains[(pid, qid)].add(domain)
    domains = [{
        "domain": domain,
        "count": len(domain_answers[domain]),
        "n_respondents": len(domain_respondents[domain]),
        "class": derive_flags.classify_domain(domain),
    } for domain in sorted(domain_answers)]
    domains.sort(key=lambda item: (-item["count"], item["domain"]))

    q52 = [{
        "respondent_id": pid,
        "attribution": attribution(people[pid]),
        "preview": truncate(text, PREVIEW_MAX),
    } for pid, text in sorted(answers.text["Q052"].items())]

    blocks = []
    for cluster in clusters:
        if not cluster["has_citation"]:
            continue
        found = set()
        for pid in cluster["members"]:
            for number in cluster["question_numbers"]:
                found |= per_answer_domains.get((pid, f"Q{number:03d}"), set())
        blocks.append({
            "hash": cluster["hash"],
            "n_respondents": cluster["n_respondents"],
            "preview": cluster["preview"],
            "domains": sorted(found),
        })
    blocks.sort(key=lambda item: (-item["n_respondents"], item["hash"]))

    return {
        "by_org_type": by_org_type,
        "by_redaction": by_redaction,
        "by_stance_q19": by_stance,
        "domains": domains,
        "q52": q52,
        "template_citation_blocks": blocks,
    }


def build_integrity(con, questions, answers, segments, people, base,
                    exclusions, flags, clusters, cluster_bloc, audit) -> dict:
    cells = Counter()
    for row in con.execute("SELECT respondent_id, COUNT(*) FROM responses "
                           "GROUP BY respondent_id"):
        cells[row[0]] = row[1]

    excluded = []
    for pid in sorted(exclusions):
        person = people[pid]
        evidence = exclusions[pid]["evidence"]
        excluded.append({
            "id": pid,
            "reason": exclusions[pid]["reason"],
            "name_or_redacted": ("Redacted" if person["redacted"]
                                 else truncate(person["organization"],
                                               INDEX_NAME_MAX)),
            "evidence": [part.strip() for part in evidence.split(". ")
                         if part.strip()] if evidence else [],
            "n_cells": cells.get(pid, 0),
        })

    resubmission = build_resubmission(answers, exclusions, flags)

    families = defaultdict(list)
    for pid in base:
        group = flags[pid]["entity_family"]
        if group:
            families[group].append(pid)
    family_rows = [{"name": name, "ids": sorted(ids), "n": len(ids)}
                   for name, ids in sorted(families.items())]
    family_rows.sort(key=lambda item: (-item["n"], item["name"]))

    def named_members(ids):
        return [{"id": pid, "name": truncate(people[pid]["organization"],
                                             INDEX_NAME_MAX)}
                for pid in ids
                if pid in people and not people[pid]["redacted"]]

    text_clusters = [{
        "hash": cluster["hash"],
        "chars": cluster["chars"],
        "n_respondents": cluster["n_respondents"],
        "n_named": cluster["n_named"],
        "named_members": named_members(cluster["members"]),
        "n_redacted": cluster["n_redacted"],
        "preview": cluster["preview"],
        "qids": [f"Q{number:03d}" for number in cluster["question_numbers"]],
    } for cluster in clusters]

    bloc_members = defaultdict(list)
    for pid, bloc in sorted(cluster_bloc.items()):
        bloc_members[bloc].append(pid)
    blocs = []
    for key, ids in sorted(bloc_members.items()):
        shared = sum(1 for cluster in clusters
                     if len(set(cluster["members"]) & set(ids)) >= 2)
        blocs.append({
            "key": key,
            "label": BLOC_LABELS.get(key, key.replace("_", " ").capitalize()),
            "member_ids_named": named_members(ids),
            "n_redacted": sum(1 for pid in ids if people[pid]["redacted"]),
            "shared_texts": shared,
        })
    blocs.sort(key=lambda item: (-(len(item["member_ids_named"])
                                   + item["n_redacted"]), item["key"]))

    return {
        "audit": audit,
        "blocs": blocs,
        "citations": build_citations(questions, answers, segments, people,
                                     base, flags, clusters),
        "dedup_effect": build_dedup_effect(answers, cluster_bloc),
        "excluded": excluded,
        "families": family_rows,
        "resubmission": resubmission,
        "text_clusters": text_clusters,
    }


def build_resubmission(answers, exclusions, flags):
    """The 100 -> 151 pair: the cells both submissions filled that changed.

    P20's ruling counts *overlapping* cells only - the later filing is a strict
    superset, so a cell the earlier one left blank is not a changed answer. Q4
    (the respondent's name) is never compared or exported, on the standing rule
    that no name column leaves the database.
    """
    dropped = [pid for pid, entry in exclusions.items()
               if entry["reason"] == "superseded"]
    if not dropped:
        return None
    if len(dropped) > 1:
        fail(f"more than one superseded respondent {sorted(dropped)}; the "
             "integrity contract carries a single resubmission pair")
    dropped_id = dropped[0]
    kept = flags.get(dropped_id, {}).get("resubmission_of")
    if not kept:
        fail(f"respondent {dropped_id} is superseded but respondent_flags.csv "
             "names no resubmission_of target")
    kept_id = int(kept)
    changed = []
    for qid in sorted(answers.raw_text):
        if qid == "Q004":
            continue
        before = answers.raw_text[qid].get(dropped_id)
        after = answers.raw_text[qid].get(kept_id)
        if before is None or after is None:
            continue
        if collapse(before) != collapse(after):
            changed.append({
                "qid": qid,
                "before": truncate(before, PREVIEW_MAX),
                "after": truncate(after, PREVIEW_MAX),
            })
    return {"kept": kept_id, "dropped": dropped_id, "changed": changed}


# --- main -------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Export frontend/data/*.json per PLAN.md Sec. 5.")
    parser.add_argument("--allow-missing-curation", action="store_true",
                        help="emit empty themes/quotes and a provisional audit "
                             "block when the P20/P21 inputs are absent")
    parser.add_argument("--out-dir", type=Path, default=None,
                        help="write somewhere other than frontend/data "
                             "(validate_frontend_data.py uses this to prove "
                             "reruns are byte-identical)")
    args = parser.parse_args()

    global OUT_DIR, ORGS_DIR
    if args.out_dir is not None:
        OUT_DIR = args.out_dir.resolve()
        ORGS_DIR = OUT_DIR / "orgs"

    for required in (DB_PATH, MANIFEST_PATH,
                     DERIVED_DIR / "respondent_flags.csv",
                     DERIVED_DIR / "text_clusters.csv",
                     DERIVED_DIR / "domains.csv",
                     DERIVED_DIR / "citations.csv"):
        if not required.exists():
            fail(f"missing input {rel(required)}")

    con = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    try:
        generated = load_generated_date()
        check_option_vocabularies(con)
        people = load_people(con)
        questions = load_questions(con)
        flags = load_flags()
        missing_flags = sorted(set(people) - set(flags))
        if missing_flags:
            fail(f"respondent_flags.csv misses {len(missing_flags)} "
                 f"respondents, first few {missing_flags[:5]}")

        exclusions, provisional_base = load_exclusions()
        unknown = sorted(set(exclusions) - set(people))
        if unknown:
            fail(f"exclusion list names unknown respondents {unknown}")
        base_ids = [pid for pid in sorted(people) if pid not in exclusions]
        base = set(base_ids)

        answers = Answers(con, base)
        segments = build_segments(people, base_ids)
        clusters = load_text_clusters()
        cluster_of = {}
        for cluster in clusters:
            for number in cluster["question_numbers"]:
                for pid in cluster["members"]:
                    cluster_of.setdefault((pid, f"Q{number:03d}"),
                                          cluster["hash"])
        cluster_bloc = {pid: flags[pid]["template_bloc"] for pid in base_ids
                        if flags[pid]["template_bloc"]}

        audit, audit_class, audit_basis = build_audit(people, base,
                                                      args.allow_missing_curation)
        polarity = load_polarity(questions)

        payload = {
            "meta": build_meta(questions, answers, segments, people, base_ids,
                               generated, polarity, provisional_base,
                               args.allow_missing_curation),
            "stances": build_stances(answers, segments),
            "matrix": build_matrix(answers, segments),
            "scoreboard": build_scoreboard(answers, segments),
            "themes": build_themes(questions, answers, base, cluster_of,
                                   args.allow_missing_curation),
            "quotes": build_quotes(answers, people, base,
                                   args.allow_missing_curation),
            "respondents": build_respondents(questions, answers, segments,
                                             people, base_ids, flags,
                                             audit_class),
            "integrity": build_integrity(con, questions, answers, segments,
                                         people, base_ids, exclusions, flags,
                                         clusters, cluster_bloc, audit),
        }
        orgs = build_orgs(questions, answers, people, base_ids, flags,
                          audit_class, audit_basis)
    finally:
        con.close()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ORGS_DIR.mkdir(parents=True, exist_ok=True)
    stale = {path.name for path in ORGS_DIR.glob("*.json")}
    written = {}
    for name, obj in sorted(payload.items()):
        written[f"{name}.json"] = write_json(OUT_DIR / f"{name}.json", obj)
    org_sizes = []
    for pid, obj in orgs:
        size = write_json(ORGS_DIR / f"{pid}.json", obj)
        org_sizes.append((size, pid))
        stale.discard(f"{pid}.json")
    for name in sorted(stale):
        (ORGS_DIR / name).unlink()

    print(f"export_frontend: wrote {len(written)} files + {len(orgs)} org "
          f"profiles to {rel(OUT_DIR)}")
    for name, size in sorted(written.items()):
        flag = "  OVER BUDGET" if size > FILE_BUDGET else ""
        print(f"  {name:<20} {size / 1024:8.1f} KB{flag}")
    org_sizes.sort(reverse=True)
    print(f"  orgs/ ({len(orgs)} files)   "
          f"{sum(size for size, _pid in org_sizes) / 1024:8.1f} KB total, "
          f"largest {org_sizes[0][0] / 1024:.1f} KB (orgs/{org_sizes[0][1]}.json)"
          + ("  OVER BUDGET" if org_sizes[0][0] > ORG_BUDGET else ""))
    if stale:
        print(f"  removed {len(stale)} stale org profiles")
    totals = payload["meta"]["totals"]
    print(f"  analytical base: {totals['respondents']} of "
          f"{totals['respondents_raw']} respondents "
          f"({len(payload['integrity']['excluded'])} excluded), "
          f"{len(orgs)} named org profiles"
          + ("  [PROVISIONAL BASE]" if provisional_base else ""))
    print(f"  curation: audit {'provisional' if audit.get('provisional') else 'from reference/org_audit.csv'}"
          f"; themes {len(payload['themes'].get('by_question', {}))} questions"
          f"; quotes {len(payload['quotes'])} topics")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
