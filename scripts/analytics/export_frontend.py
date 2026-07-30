#!/usr/bin/env python3
"""Export the frontend data contract (PLAN.md Sec. 5) into ``frontend/data/``.

Reads ``data/scope2_consultation.sqlite`` plus ``data/derived/*`` (P10) and, when
present, the two curation inputs ``reference/org_audit.csv`` (P20) and
``reference/curated_quotes.json`` (P21). Writes:

    meta.json            segment vocabularies + question codebook for the pages
    likert.json          per-question 1-5 / ladder distributions by segment
    reasons.json         reason picklists (rationale_for / rationale_against)
    selects.json         design-preference and cost-driver picklists + Q183 years
    evidence.json        evidence-basis, citation and story panels
    respondents.json     who-responded distributions + the named-org index
    clusters.json        text clusters, vector clusters, blocs, entity families
    audit.json           claimed vs audited classification
    quotes.json          curated quotes per policy lever
    orgs/{id}.json       one profile per named respondent

Standard library only: no pandas, no ``sqlite3`` CLI. Most columns in this
database are TEXT-typed, so every numeric use casts explicitly (``+0``,
``+0.0`` in SQL or ``int()``/``float()`` in Python).

Determinism
-----------
Reruns are byte-identical: keys are sorted, floats are rounded to 2dp with
ROUND_HALF_UP, files are written compactly with a trailing newline, and
``meta.generated`` carries the *source dataset's* publication date (parsed from
``data/manifest.json``) rather than a wall-clock stamp.

Privacy / noise guard
---------------------
Any segment value with fewer than ``MIN_SEGMENT_N`` respondents overall
(``grid_operator`` n=4 and ``intl_agency`` n=2 on the shipped data) never gets a
per-question or per-option breakdown: likert cells collapse to the contract's
``{"n": "<5"}`` sentinel and nested ``by`` maps carry the bare string ``"<5"``.
The guard covers every *breakdown* keyed by a segment value (likert cells,
reasons/selects ``by``, evidence basis/citation splits). It deliberately does
not blank the segment *sizes* themselves: ``meta.segments`` must publish each
value's ``n`` for the closed vocabulary and base chips, and
``respondents.distributions`` is that same respondent-count information crossed
with redaction (both are already published in PLAN Sec. 3.3).

Redacted respondents are never named: ``clusters.json`` and the org files
identify them by count or id only, and no ``name`` column from ``respondents``
(the person's name) is exported anywhere - the only identity emitted is
``organization``, and only for ``is_redacted = 0``. For the same reason the org
profiles skip ``role = 'profile'`` answers, which carry the respondent's name
(Q4), their organization again (Q5) and their newsletter opt-in (Q8); the
profile facts the pages need are already the org file's own keys. The two
"please specify" write-ins that qualify those keys (Q15 org type, Q17 sector)
are kept.

Curation inputs
---------------
Without ``--allow-missing-curation`` a missing ``reference/org_audit.csv`` or
``reference/curated_quotes.json`` is a loud failure. With the flag,
``audit.json`` is emitted from *claimed* classes (``"provisional": true``, its
vocabulary being the claimed org-type slugs) and ``quotes.json`` is ``{}``.

Documented additions to the Sec. 5 shapes (each carries a ``_comment`` in the
file that makes it): ``meta.constructs`` (heatmap row groups with their
direction badges, needed by Sec. 4's heatmap and by the validator's
construct-mixing check), ``meta.questions[].labels`` (ladder labels - Sec. 5
requires them for ordinal questions; emitted for every scale question),
``evidence.citations.by_redaction``/``by_stance_q71`` as lists shaped like
``by_org_type``, ``evidence.citations.domains[].n_respondents``, and the
``"<5"`` sentinel inside ``by`` maps.

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

REPO_ROOT = Path(__file__).resolve().parents[2]
DB_PATH = REPO_ROOT / "data" / "scope2_consultation.sqlite"
MANIFEST_PATH = REPO_ROOT / "data" / "manifest.json"
DERIVED_DIR = REPO_ROOT / "data" / "derived"
REFERENCE_DIR = REPO_ROOT / "reference"
ORG_AUDIT_CSV = REFERENCE_DIR / "org_audit.csv"
CURATED_QUOTES_JSON = REFERENCE_DIR / "curated_quotes.json"
OUT_DIR = REPO_ROOT / "frontend" / "data"
ORGS_DIR = OUT_DIR / "orgs"

# --- contract constants -----------------------------------------------------

MIN_SEGMENT_N = 5          # below this a segment value gets no breakdown
SENTINEL = "<5"            # the masked-count marker
SECTOR_TOP_N = 12
COUNTRY_TOP_N = 10
INDEX_NAME_MAX = 80        # respondents.json org_index[].name
PROFILE_NAME_MAX = 300     # orgs/{id}.json name (organization is free text)
QUOTE_MAX = 600
PREVIEW_MAX = 240
BASIS_MAX = 200
PROTEST_YEAR = 2050        # Q183 answers above this are protest answers

# The seven MBM stance anchors, in survey order (PLAN Sec. 3.1).
ANCHORS = (71, 83, 97, 113, 124, 153, 171)

# --- segment vocabularies (closed, PLAN Sec. 5) ------------------------------

# (database value, slug, display label) in PLAN Sec. 5 slug order.
ORG_TYPES = (
    ("Company", "company", "Company"),
    ("Industry group", "industry_group", "Industry group"),
    ("Consultant supporting organizations with GHG inventories/strategies",
     "consultant", "Consultant"),
    ("Non-profit organization/NGO/civil society", "ngo", "NGO/nonprofit"),
    ("Energy supplier/retailer or utility", "energy_supplier",
     "Energy supplier/utility"),
    ("Other (please specify below)", "other", "Other"),
    ("Academia/research", "academia", "Academia/research"),
    ("Data/analytics or software provider related to GHG inventories",
     "data_analytics", "Data/analytics provider"),
    ("Financial Institution", "financial", "Financial institution"),
    ("Government institution", "government", "Government institution"),
    ("Certificate registry/tracking system operator", "registry_operator",
     "Registry operator"),
    ("Verification/assurance provider", "verification", "Verification/assurance"),
    ("GHG account/reporting program or initiative", "ghg_program",
     "GHG program/initiative"),
    ("Electric Grid Operator", "grid_operator", "Grid operator"),
    ("International agency", "intl_agency", "International agency"),
)

# Sector labels are long and carry GICS-ish codes; slugs and short labels are
# curated for all 29 values so the top-12 cut is readable whatever it selects.
SECTORS = {
    "Energy (10)": ("energy", "Energy"),
    "Other (please specify below)": ("other_specified", "Other (specified)"),
    "Manufacturing": ("manufacturing", "Manufacturing"),
    "Professional, scientific, and technical services (2020)":
        ("professional_services", "Professional services"),
    "Information and communication technology (45)": ("ict", "ICT"),
    "Finance (40)": ("finance", "Finance"),
    "Utilities (water, gas, electricity) (551010, 551020, 551030, 551040)":
        ("utilities", "Utilities"),
    "Education": ("education", "Education"),
    "Retail (2550, 3010)": ("retail", "Retail"),
    "Services": ("services", "Services"),
    "Chemicals (151010)": ("chemicals", "Chemicals"),
    "Real estate (60)": ("real_estate", "Real estate"),
    "Power generation (551050)": ("power_generation", "Power generation"),
    "Biotech, health care and pharmaceutical (35201010, 3510, 35202010)":
        ("biotech_pharma", "Biotech/pharma"),
    "Transportation (2030)": ("transportation", "Transportation"),
    "Apparel (25203010)": ("apparel", "Apparel"),
    "Consumer goods (25, 30)": ("consumer_goods", "Consumer goods"),
    "Food and beverage (302010, 302020)": ("food_beverage", "Food and beverage"),
    "Construction (201030)": ("construction", "Construction"),
    "Materials (15)": ("materials", "Materials"),
    "Mining (151040)": ("mining", "Mining"),
    "Agriculture (30202010)": ("agriculture", "Agriculture"),
    "Insurance (4030)": ("insurance", "Insurance"),
    "Infrastructure (2010)": ("infrastructure", "Infrastructure"),
    "Forest products (15105010)": ("forest_products", "Forest products"),
    "Forestry": ("forestry", "Forestry"),
    "Fossil fuels (101020)": ("fossil_fuels", "Fossil fuels"),
    "Hospitality (253010)": ("hospitality", "Hospitality"),
    "Waste management": ("waste_management", "Waste management"),
}

RESPONDING_AS = (
    ("Organization", "organization", "Organization"),
    ("Individual", "individual", "Individual"),
)

REDACTION = (("named", "Named"), ("redacted", "Redacted"))

GROUPED_SECTOR_KEY = "sector_other_grouped"
GROUPED_COUNTRY_KEY = "country_other"

SEGMENT_LABELS = {
    "org_type": "Organization type",
    "sector": "Sector",
    "country": "Country",
    "redaction": "Redaction",
    "responding_as": "Responding as",
    "audited_class": "Audited class",
}

# --- heatmap row groups (scale_construct, PLAN Sec. 2 caveat 4 / Sec. 4) -----

CONSTRUCTS = (
    ("support", "Support for the proposal", "5 = strongly supports"),
    ("burden_relative", "Effort vs today", "3 = same as today, 5 = much more"),
    ("cost_relative", "Cost vs today", "3 = same as today, 5 = much higher"),
    ("impact_magnitude", "Knock-on impact", "5 = large impact (not support)"),
    ("readiness_labeled", "Readiness", "1 = far from ready, 5 = largely ready"),
    ("sufficiency_labeled", "Sufficiency",
     "1 = insufficient, 5 = highly sufficient (wording non-monotonic)"),
    ("ordinal", "Ordered choice", "ladder order; see labels"),
)

# --- page map (PLAN Sec. 4) -------------------------------------------------
# Inclusive question-number ranges per proposal page, exactly as Sec. 4 splits
# them (Q70 sits on the exemptions page, Q69 on deliverability).

PAGE_RANGES = (
    ("proposals/hourly-matching.html", ((71, 82),)),
    ("proposals/deliverability.html", ((69, 69), (83, 96))),
    ("proposals/sss.html", ((97, 112),)),
    ("proposals/residual-mix.html", ((113, 123),)),
    ("proposals/fossil-fallback.html", ((124, 129),)),
    ("proposals/exemptions.html", ((70, 70), (130, 133), (153, 170))),
    ("proposals/legacy-clause.html", ((171, 180),)),
    ("proposals/package-impacts.html", ((20, 20), (22, 22), (134, 151))),
    ("proposals/transition.html", ((181, 183),)),
)

# --- evidence stories (PLAN Sec. 3.7, verified verbatim slices) --------------
# Each story quotes the substring running from ``start`` to the end of ``end``
# in that respondent's stored answer, so the emitted text is verbatim by
# construction; the exporter fails loudly if either marker moves.

STORY_SPECS = (
    {
        "key": "coordination_admission",
        "title": "A respondent declares coordinated answers with a TWG member's colleague",
        "respondent_id": 503,
        "q": 20,
        "start": "Please also note",
        "end": "Dr. Matthew Brander.",
    },
    {
        "key": "twg_member_as_authority",
        "title": "Opposition cites a Technical Working Group member as external authority",
        "respondent_id": 945,
        "q": 20,
        "start": "As expert support for this opinion",
        "end": "‘contractually purchased electricity’.\"",
    },
    {
        "key": "self_citation",
        "title": "An academic cites their own paper, and says so",
        "respondent_id": 27,
        "q": 39,
        "start": "Sorry to toot my own horn",
        "end": "recommendations provided in it.",
    },
    {
        "key": "literature_wall",
        "title": "An energy supplier assembles a six-paper literature wall",
        "respondent_id": 982,
        "q": 152,
        "start": "The literature is significant",
        "end": "implementing fundamental revisions.",
    },
    {
        "key": "both_sides_cited",
        "title": "A university cites both sides of the hourly-matching debate",
        "respondent_id": 559,
        "q": 148,
        "start": "References:",
        "end": "Energy Strategy Reviews, 54, 101488.",
    },
)

PROVISIONAL_BASIS = "Provisional: respondent self-classification, not yet audited"

WHITESPACE_RE = re.compile(r"\s+")
NON_SLUG_RE = re.compile(r"[^a-z0-9]+")


# --- helpers ----------------------------------------------------------------


def fail(message: str):
    raise SystemExit(f"export_frontend: {message}")


def r2(value):
    """Round to 2dp, half-up, so reruns and the validator agree bit for bit."""
    if value is None:
        return None
    return float(Decimal(repr(float(value))).quantize(Decimal("0.01"),
                                                      rounding=ROUND_HALF_UP))


def numeric_value(value):
    """Answer scores are whole numbers in this dataset; keep them ints in JSON."""
    if value is None:
        return None
    number = float(value)
    return int(number) if number == int(number) else r2(number)


def rel(path: Path) -> str:
    """Repo-relative path for messages, falling back to the absolute path."""
    try:
        return str(path.relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


def slugify(text: str) -> str:
    return NON_SLUG_RE.sub("_", (text or "").lower()).strip("_")


def truncate(text: str, limit: int) -> str:
    text = WHITESPACE_RE.sub(" ", (text or "")).strip()
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


# --- loading ----------------------------------------------------------------


def load_generated_date() -> str:
    """The source export's publication date - deterministic, unlike a clock."""
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    match = re.search(r"(\d{4})\.(\d{2})\.(\d{2})", manifest.get("source_file", ""))
    if not match:
        fail(f"cannot read a source date from {MANIFEST_PATH}")
    return "-".join(match.groups())


def load_respondents(con) -> dict[int, dict]:
    rows = con.execute(
        """
        SELECT respondent_id, organization, country, responding_as,
               organization_type, sector, is_redacted + 0 AS is_redacted,
               n_substantive_answered + 0 AS nsub,
               substantive_completion_pct + 0.0 AS pct,
               free_text_chars + 0 AS ft_chars
        FROM respondents ORDER BY respondent_id
        """
    ).fetchall()
    people = {}
    for row in rows:
        org_type = row["organization_type"]
        if org_type not in ORG_TYPE_BY_VALUE:
            fail(f"unknown organization_type {org_type!r} (respondent "
                 f"{row['respondent_id']}) - extend ORG_TYPES")
        if row["sector"] not in SECTORS:
            fail(f"unknown sector {row['sector']!r} (respondent "
                 f"{row['respondent_id']}) - extend SECTORS")
        people[row["respondent_id"]] = {
            "id": row["respondent_id"],
            "organization": row["organization"],
            "country": row["country"],
            "responding_as": row["responding_as"],
            "org_type_value": org_type,
            "org_type": ORG_TYPE_BY_VALUE[org_type],
            "sector_value": row["sector"],
            "redacted": bool(row["is_redacted"]),
            "nsub": int(row["nsub"]),
            "pct": float(row["pct"]),
            "ft_chars": int(row["ft_chars"]),
        }
    return people


ORG_TYPE_BY_VALUE = {value: slug for value, slug, _label in ORG_TYPES}
ORG_TYPE_LABEL = {slug: label for _value, slug, label in ORG_TYPES}


def load_questions(con) -> dict[int, dict]:
    rows = con.execute(
        """
        SELECT question_number, question_id, shorthand, label, method, category,
               policy_lever, asks_for, role, question_type, scale_construct,
               scale_anchor_low, scale_anchor_high, scale_note, anchor_question,
               n_answered + 0 AS n_answered
        FROM questions ORDER BY question_number
        """
    ).fetchall()
    return {row["question_number"]: dict(row) for row in rows}


def load_ladders(con) -> dict[int, dict]:
    """Ordered canonical, on-scale options per choice/scale question."""
    ladders: dict[int, dict] = {}
    rows = con.execute(
        """
        SELECT question_number, option_text, option_rank, is_off_scale + 0 AS off,
               is_canonical + 0 AS canonical
        FROM question_options ORDER BY question_number, option_rank, option_text
        """
    ).fetchall()
    for row in rows:
        entry = ladders.setdefault(row["question_number"],
                                   {"labels": [], "ranks": [], "off_labels": []})
        if not row["canonical"]:
            continue
        if row["off"] or row["option_rank"] is None:
            entry["off_labels"].append(row["option_text"])
        else:
            entry["labels"].append(row["option_text"])
            entry["ranks"].append(int(row["option_rank"]))
    for number, entry in ladders.items():
        entry["index"] = {rank: i for i, rank in enumerate(entry["ranks"])}
        if len(entry["index"]) != len(entry["ranks"]):
            fail(f"Q{number}: duplicate option_rank values")
    return ladders


def load_flags() -> dict[int, dict]:
    flags = {}
    for row in read_csv(DERIVED_DIR / "respondent_flags.csv"):
        flags[int(row["respondent_id"])] = row
    return flags


# --- segments ---------------------------------------------------------------


def top_n_segment(people: dict[int, dict], field: str, top_n: int,
                  grouped_key: str, grouped_label: str,
                  slug_of, label_of) -> dict:
    counts = Counter(person[field] for person in people.values())
    ordered = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
    top = ordered[:top_n]
    tail = ordered[top_n:]
    values = [{"key": slug_of(value), "label": label_of(value), "n": count}
              for value, count in top]
    member_of = {value: slug_of(value) for value, _count in top}
    if tail:
        values.append({
            "key": grouped_key,
            "label": grouped_label.format(n=len(tail)),
            "n": sum(count for _value, count in tail),
        })
        for value, _count in tail:
            member_of[value] = grouped_key
    return {"values": values, "member_of": member_of}


def build_segments(people: dict[int, dict], audit: dict) -> dict:
    """dim -> {label, values:[{key,label,n}], of:{respondent_id: key}}."""
    dims: dict[str, dict] = {}

    counts = Counter(person["org_type"] for person in people.values())
    dims["org_type"] = {
        "values": [{"key": slug, "label": label, "n": counts.get(slug, 0)}
                   for _value, slug, label in ORG_TYPES if counts.get(slug, 0)],
        "of": {pid: person["org_type"] for pid, person in people.items()},
    }

    sector = top_n_segment(
        people, "sector_value", SECTOR_TOP_N, GROUPED_SECTOR_KEY,
        "Other sectors ({n} values)",
        lambda value: SECTORS[value][0], lambda value: SECTORS[value][1])
    dims["sector"] = {
        "values": sector["values"],
        "of": {pid: sector["member_of"][person["sector_value"]]
               for pid, person in people.items()},
    }

    country = top_n_segment(
        people, "country", COUNTRY_TOP_N, GROUPED_COUNTRY_KEY,
        "Other countries ({n} values)", slugify, lambda value: value)
    dims["country"] = {
        "values": country["values"],
        "of": {pid: country["member_of"][person["country"]]
               for pid, person in people.items()},
    }

    redaction_of = {pid: ("redacted" if person["redacted"] else "named")
                    for pid, person in people.items()}
    red_counts = Counter(redaction_of.values())
    dims["redaction"] = {
        "values": [{"key": key, "label": label, "n": red_counts.get(key, 0)}
                   for key, label in REDACTION],
        "of": redaction_of,
    }

    as_of = {}
    for pid, person in people.items():
        value = person["responding_as"]
        match = [slug for db_value, slug, _label in RESPONDING_AS
                 if db_value == value]
        if not match:
            fail(f"unknown responding_as {value!r} (respondent {pid})")
        as_of[pid] = match[0]
    as_counts = Counter(as_of.values())
    dims["responding_as"] = {
        "values": [{"key": slug, "label": label, "n": as_counts.get(slug, 0)}
                   for _value, slug, label in RESPONDING_AS],
        "of": as_of,
    }

    audited_of = audit["class_of"]
    audited_counts = Counter(audited_of.values())
    dims["audited_class"] = {
        "values": [{"key": entry["key"], "label": entry["label"],
                    "n": audited_counts.get(entry["key"], 0)}
                   for entry in audit["vocabulary"]
                   if audited_counts.get(entry["key"], 0)],
        "of": audited_of,
    }

    for dim, entry in dims.items():
        entry["label"] = SEGMENT_LABELS[dim]
        entry["suppressed"] = {value["key"] for value in entry["values"]
                               if value["n"] < MIN_SEGMENT_N}
    return dims


# --- likert -----------------------------------------------------------------


def heatmap_questions(questions: dict[int, dict]) -> list[int]:
    """The 22 MBM scale/ordinal rows (PLAN Sec. 3.2); Q183 is numeric, not a row."""
    return [number for number, question in sorted(questions.items())
            if question["method"] == "mbm"
            and question["question_type"] in ("likert_1_5", "scale_labeled",
                                              "ordinal_select")]


def empty_cell(width: int) -> dict:
    return {"c": [0] * width, "off": 0, "n": 0, "sum": 0.0}


def finish_cell(cell: dict) -> dict:
    total = sum(cell["c"])
    return {
        "c": cell["c"],
        "off": cell["off"],
        "n": total,
        "mean": r2(cell["sum"] / total) if total else None,
    }


def build_likert(con, ladders, segments, rows) -> dict:
    likert = {}
    for number in rows:
        ladder = ladders.get(number)
        if not ladder or not ladder["labels"]:
            fail(f"Q{number}: no option ladder for a heatmap row")
        width = len(ladder["labels"])
        overall = empty_cell(width)
        buckets: dict[str, dict[str, dict]] = {
            dim: defaultdict(lambda: empty_cell(width)) for dim in segments
        }
        answers = con.execute(
            "SELECT respondent_id, answer_numeric FROM responses "
            "WHERE question_number = ? ORDER BY respondent_id", (number,)
        ).fetchall()
        for row in answers:
            pid = row["respondent_id"]
            numeric = row["answer_numeric"]
            targets = [overall]
            for dim, entry in segments.items():
                key = entry["of"].get(pid)
                if key is None:
                    fail(f"respondent {pid} has no {dim} segment")
                targets.append(buckets[dim][key])
            if numeric is None:
                for cell in targets:
                    cell["off"] += 1
                continue
            rank = int(round(float(numeric)))
            if rank not in ladder["index"]:
                fail(f"Q{number}: answer_numeric {numeric!r} is not a ladder rank")
            slot = ladder["index"][rank]
            for cell in targets:
                cell["c"][slot] += 1
                cell["sum"] += rank
        entry = {"overall": finish_cell(overall)}
        for dim, seg in segments.items():
            entry[dim] = {}
            for value in seg["values"]:
                key = value["key"]
                if key in seg["suppressed"]:
                    entry[dim][key] = {"n": SENTINEL}
                else:
                    entry[dim][key] = finish_cell(
                        buckets[dim].get(key, empty_cell(width)))
        likert[str(number)] = entry
    return likert


# --- picklists (reasons / selects) ------------------------------------------


def selection_rows(con, number: int):
    return con.execute(
        """
        SELECT s.respondent_id, s.option_text
        FROM response_selections s
        WHERE s.question_number = ? AND s.is_canonical + 0 = 1
        ORDER BY s.respondent_id, s.selection_index
        """, (number,)
    ).fetchall()


def single_select_rows(con, number: int):
    return con.execute(
        "SELECT respondent_id, answer_text FROM responses "
        "WHERE question_number = ? AND answer_text IS NOT NULL "
        "ORDER BY respondent_id", (number,)
    ).fetchall()


def canonical_options(con, number: int) -> set[str]:
    return {row[0] for row in con.execute(
        "SELECT option_text FROM question_options "
        "WHERE question_number = ? AND is_canonical + 0 = 1", (number,))}


def option_picks(con, questions, number: int) -> dict[str, set[int]]:
    """option_text -> set of respondent ids, canonical options only.

    The is_canonical filter is what keeps Q140's and Q174's write-ins out of
    the picklists (PLAN Sec. 2 gotcha 6).
    """
    picks: dict[str, set[int]] = defaultdict(set)
    if questions[number]["question_type"] == "multi_select":
        for row in selection_rows(con, number):
            picks[row["option_text"]].add(row["respondent_id"])
    else:
        canonical = canonical_options(con, number)
        for row in single_select_rows(con, number):
            if row["answer_text"] in canonical:
                picks[row["answer_text"]].add(row["respondent_id"])
    return picks


def build_picklist(con, questions, segments, number: int, side) -> dict:
    question = questions[number]
    picks = option_picks(con, questions, number)
    n_answered = int(question["n_answered"] or 0)
    options = []
    for text, ids in sorted(picks.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        by = {}
        for dim in ("org_type", "redaction"):
            seg = segments[dim]
            counts = {}
            for value in seg["values"]:
                key = value["key"]
                if key in seg["suppressed"]:
                    counts[key] = SENTINEL
                else:
                    counts[key] = sum(1 for pid in ids
                                      if seg["of"].get(pid) == key)
            by[dim] = counts
        options.append({
            "text": text,
            "n": len(ids),
            "pct": r2(100.0 * len(ids) / n_answered) if n_answered else None,
            "by": by,
        })
    return {
        "anchor": question["anchor_question"],
        "lever": question["policy_lever"],
        "side": side,
        "n_answered": n_answered,
        "options": options,
    }


def reason_questions(questions) -> list[int]:
    return [number for number, question in sorted(questions.items())
            if question["method"] == "mbm"
            and question["question_type"] == "multi_select"
            and question["asks_for"] in ("rationale_for", "rationale_against")]


def select_questions(questions) -> list[int]:
    keep = []
    for number, question in sorted(questions.items()):
        if question["method"] != "mbm":
            continue
        if question["question_type"] not in ("single_select", "ordinal_select",
                                             "multi_select"):
            continue
        if question["asks_for"] in ("rationale_for", "rationale_against",
                                    "evidence_basis"):
            continue
        keep.append(number)
    return keep


def build_reasons(con, questions, segments) -> dict:
    out = {"_comment": (
        "PLAN Sec. 5 reasons.json. Canonical options only (is_canonical = 1, "
        "which is what keeps Q140/Q174 write-ins out). Counts in by.<dim> are "
        f"respondents; the string \"{SENTINEL}\" masks a segment value with "
        f"fewer than {MIN_SEGMENT_N} respondents overall. pct is n / n_answered "
        "as a percentage, 2dp.")}
    for number in reason_questions(questions):
        side = ("for" if questions[number]["asks_for"] == "rationale_for"
                else "against")
        out[str(number)] = build_picklist(con, questions, segments, number, side)
    return out


def build_selects(con, questions, segments) -> dict:
    out = {"_comment": (
        "PLAN Sec. 5 selects.json: design-preference and cost-driver picklists, "
        "same shape as reasons.json with side = null. Q183 is a free-text year: "
        "it carries years/protest_gt_2050 instead of options. The string "
        f"\"{SENTINEL}\" masks a segment value with fewer than {MIN_SEGMENT_N} "
        "respondents overall.")}
    for number in select_questions(questions):
        out[str(number)] = build_picklist(con, questions, segments, number, None)

    question = questions[183]
    years = Counter()
    protest = 0
    for row in con.execute(
        "SELECT answer_numeric FROM responses WHERE question_number = 183 "
        "AND answer_numeric IS NOT NULL"
    ):
        year = int(round(float(row[0])))
        years[year] += 1
        if year > PROTEST_YEAR:
            protest += 1
    out["183"] = {
        "anchor": question["anchor_question"],
        "lever": question["policy_lever"],
        "side": None,
        "n_answered": int(question["n_answered"] or 0),
        "years": {str(year): count for year, count in sorted(years.items())},
        "protest_gt_2050": protest,
    }
    return out


# --- evidence ---------------------------------------------------------------


def stance_bucket_of(con) -> dict[int, str]:
    buckets = {}
    for row in con.execute(
        "SELECT respondent_id, answer_numeric FROM responses "
        "WHERE question_number = 71 AND answer_numeric IS NOT NULL"
    ):
        score = float(row[1])
        buckets[row[0]] = ("oppose" if score <= 2
                           else "neutral" if score == 3 else "support")
    return buckets


STANCE_KEYS = ("oppose", "neutral", "support")


def basis_panel(con, questions, segments, number: int, stance) -> dict:
    picks = option_picks(con, questions, number)
    n_answered = int(questions[number]["n_answered"] or 0)
    options = [{
        "text": text,
        "n": len(ids),
        "pct": r2(100.0 * len(ids) / n_answered) if n_answered else None,
    } for text, ids in sorted(picks.items(), key=lambda kv: (-len(kv[1]), kv[0]))]

    by_stance = {key: {} for key in STANCE_KEYS}
    for text, ids in picks.items():
        for key in STANCE_KEYS:
            count = sum(1 for pid in ids if stance.get(pid) == key)
            if count:
                by_stance[key][text] = count

    seg = segments["org_type"]
    by_org_type: dict[str, object] = {}
    for value in seg["values"]:
        key = value["key"]
        if key in seg["suppressed"]:
            by_org_type[key] = SENTINEL
            continue
        counts = {}
        for text, ids in picks.items():
            count = sum(1 for pid in ids if seg["of"].get(pid) == key)
            if count:
                counts[text] = count
        by_org_type[key] = counts

    return {
        "q": number,
        "shorthand": questions[number]["shorthand"],
        "label": questions[number]["label"],
        "n_answered": n_answered,
        "options": options,
        "by_stance_q71": by_stance,
        "by_org_type": by_org_type,
    }


def citation_split(seg, flags, keys_and_labels) -> list[dict]:
    rows = []
    for key, label, member_ids in keys_and_labels:
        if seg is not None and key in seg["suppressed"]:
            rows.append({"key": key, "label": label, "n": SENTINEL,
                         "citing": SENTINEL, "pct": None})
            continue
        n = len(member_ids)
        citing = sum(1 for pid in member_ids
                     if int_or_zero(flags[pid]["has_citation"]))
        rows.append({"key": key, "label": label, "n": n, "citing": citing,
                     "pct": r2(100.0 * citing / n) if n else None})
    return rows


def build_evidence(con, questions, segments, people, flags, stance) -> dict:
    members: dict[str, dict[str, list[int]]] = {}
    for dim in ("org_type", "redaction"):
        grouped = defaultdict(list)
        for pid, key in segments[dim]["of"].items():
            grouped[key].append(pid)
        members[dim] = grouped

    org_rows = citation_split(
        segments["org_type"], flags,
        [(value["key"], value["label"], sorted(members["org_type"][value["key"]]))
         for value in segments["org_type"]["values"]])
    redaction_rows = citation_split(
        segments["redaction"], flags,
        [(value["key"], value["label"], sorted(members["redaction"][value["key"]]))
         for value in segments["redaction"]["values"]])
    stance_members = defaultdict(list)
    for pid, key in stance.items():
        stance_members[key].append(pid)
    stance_rows = citation_split(
        None, flags,
        [(key, key.capitalize(), sorted(stance_members[key]))
         for key in STANCE_KEYS])

    domains = [{
        "domain": row["domain"],
        "count": int(row["n_answers"]),
        "n_respondents": int(row["n_respondents"]),
        "class": row["class"],
    } for row in read_csv(DERIVED_DIR / "domains.csv")]
    domains.sort(key=lambda item: (-item["count"], item["domain"]))

    blocks = []
    for row in read_csv(DERIVED_DIR / "text_clusters.csv"):
        if not int_or_zero(row["has_citation"]):
            continue
        blocks.append({
            "hash": row["cluster_hash"],
            "n_respondents": int(row["n_respondents"]),
            "preview": truncate(row["preview_240"], PREVIEW_MAX),
        })
    blocks.sort(key=lambda item: (-item["n_respondents"], item["hash"]))

    return {
        "_comment": (
            "PLAN Sec. 5 evidence.json. by_redaction and by_stance_q71 under "
            "citations use the same list-of-rows shape as by_org_type. Each "
            "citation row is n = respondents in the group, citing = those with "
            "a hard citation signal (P10 has_citation). domains[].count is the "
            "number of free-text answers linking that domain; n_respondents is "
            "added so the pages can show how much of a domain's volume is one "
            f"respondent repeating themselves. \"{SENTINEL}\" masks a segment "
            f"value with fewer than {MIN_SEGMENT_N} respondents overall."),
        "basis": {
            "q138": basis_panel(con, questions, segments, 138, stance),
            "q122": basis_panel(con, questions, segments, 122, stance),
            "q56": basis_panel(con, questions, segments, 56, stance),
        },
        "citations": {
            "by_org_type": org_rows,
            "by_redaction": redaction_rows,
            "by_stance_q71": stance_rows,
            "domains": domains,
            "template_citation_blocks": blocks,
        },
        "stories": build_stories(con, people),
    }


def attribution(person: dict) -> str:
    name = ("Redacted" if person["redacted"]
            else truncate(person["organization"], INDEX_NAME_MAX))
    return f"{name} — {ORG_TYPE_LABEL[person['org_type']]}, {person['country']}"


def build_stories(con, people) -> list[dict]:
    stories = []
    for spec in STORY_SPECS:
        row = con.execute(
            "SELECT answer_text FROM responses WHERE respondent_id = ? "
            "AND question_number = ?", (spec["respondent_id"], spec["q"])
        ).fetchone()
        if row is None or not row[0]:
            fail(f"story {spec['key']}: respondent {spec['respondent_id']} has "
                 f"no answer to Q{spec['q']}")
        text = row[0]
        start = text.find(spec["start"])
        if start < 0:
            fail(f"story {spec['key']}: start marker not found in "
                 f"respondent {spec['respondent_id']} Q{spec['q']}")
        end = text.find(spec["end"], start)
        if end < 0:
            fail(f"story {spec['key']}: end marker not found in "
                 f"respondent {spec['respondent_id']} Q{spec['q']}")
        quote = text[start:end + len(spec["end"])]
        if len(quote) > QUOTE_MAX:
            fail(f"story {spec['key']}: quote is {len(quote)} chars "
                 f"(limit {QUOTE_MAX})")
        person = people[spec["respondent_id"]]
        stories.append({
            "key": spec["key"],
            "title": spec["title"],
            "quote": quote,
            "q": spec["q"],
            "respondent_id": spec["respondent_id"],
            "attribution": attribution(person),
            "verified": True,
        })
    return stories


# --- respondents ------------------------------------------------------------

ENGAGEMENT_BANDS = (
    ("pct_0_10", "Under 10%", 0.0, 10.0),
    ("pct_10_25", "10-25%", 10.0, 25.0),
    ("pct_25_50", "25-50%", 25.0, 50.0),
    ("pct_50_75", "50-75%", 50.0, 75.0),
    ("pct_75_100", "Over 75%", 75.0, 100.01),
)


def cross_redaction(segments, dim: str, people) -> list[dict]:
    seg = segments[dim]
    named = Counter()
    redacted = Counter()
    for pid, key in seg["of"].items():
        (redacted if people[pid]["redacted"] else named)[key] += 1
    rows = []
    for value in seg["values"]:
        key = value["key"]
        rows.append({
            "key": key,
            "label": value["label"],
            "named": named.get(key, 0),
            "redacted": redacted.get(key, 0),
            "total": value["n"],
        })
    return rows


def build_respondents(con, questions, segments, people, flags, audit,
                      rows) -> dict:
    anchors_of: dict[int, list] = {pid: [None] * len(ANCHORS) for pid in people}
    for index, number in enumerate(ANCHORS):
        for row in con.execute(
            "SELECT respondent_id, answer_numeric FROM responses "
            "WHERE question_number = ? AND answer_numeric IS NOT NULL", (number,)
        ):
            anchors_of[row[0]][index] = int(round(float(row[1])))

    redaction_effect = []
    for number in rows:
        stats = {"named": [0, 0.0], "redacted": [0, 0.0]}
        for row in con.execute(
            "SELECT respondent_id, answer_numeric FROM responses "
            "WHERE question_number = ? AND answer_numeric IS NOT NULL", (number,)
        ):
            key = "redacted" if people[row[0]]["redacted"] else "named"
            stats[key][0] += 1
            stats[key][1] += float(row[1])
        redaction_effect.append({
            "q": number,
            "shorthand": questions[number]["shorthand"],
            "n_named": stats["named"][0],
            "mean_named": (r2(stats["named"][1] / stats["named"][0])
                           if stats["named"][0] else None),
            "n_redacted": stats["redacted"][0],
            "mean_redacted": (r2(stats["redacted"][1] / stats["redacted"][0])
                              if stats["redacted"][0] else None),
        })

    bands = Counter()
    for person in people.values():
        for key, _label, low, high in ENGAGEMENT_BANDS:
            if low <= person["pct"] < high:
                bands[key] += 1
                break

    org_index = []
    for pid, person in sorted(people.items()):
        if person["redacted"]:
            continue
        flag = flags[pid]
        bloc = (flag["bloc"] or "").split("|")[0]
        org_index.append({
            "id": pid,
            "name": truncate(person["organization"], INDEX_NAME_MAX),
            "org_type": person["org_type"],
            "audited_class": audit["class_of"][pid],
            "sector": segments["sector"]["of"][pid],
            "country": segments["country"]["of"][pid],
            "nsub": person["nsub"],
            "pct": r2(person["pct"]),
            "ft_chars": person["ft_chars"],
            "cites": bool(int_or_zero(flag["has_citation"])),
            "template": bool(int_or_zero(flag["is_template_response"])),
            "entity_group": flag["entity_group"] or None,
            "bloc": bloc or None,
            "anchors": anchors_of[pid],
        })

    return {
        "_comment": (
            "PLAN Sec. 5 respondents.json. distributions rows carry respondent "
            "counts (the same segment sizes meta.segments publishes) crossed "
            "with redaction; the fewer-than-5 mask applies to per-question and "
            "per-option breakdowns, not to these segment sizes. "
            "redaction_effect covers all 22 heatmap rows, ordinal rows included "
            "(their means are ladder ranks - see meta.questions[].labels). "
            "org_index.anchors is Q71/83/97/113/124/153/171 in that order, null "
            "where unanswered."),
        "distributions": {
            "org_type_x_redaction": cross_redaction(segments, "org_type", people),
            "sector_x_redaction": cross_redaction(segments, "sector", people),
            "country": [dict(value) for value in segments["country"]["values"]],
            "responding_as": cross_redaction(segments, "responding_as", people),
            "engagement_bands": [
                {"key": key, "label": label, "n": bands.get(key, 0)}
                for key, label, _low, _high in ENGAGEMENT_BANDS],
        },
        "redaction_effect": redaction_effect,
        "org_index": org_index,
    }


# --- clusters ---------------------------------------------------------------


def build_clusters(people, flags) -> dict:
    def named_members(ids):
        return [{"id": pid, "name": truncate(people[pid]["organization"],
                                             INDEX_NAME_MAX)}
                for pid in ids if not people[pid]["redacted"]]

    text_clusters = []
    cluster_members: dict[str, list[int]] = {}
    for row in read_csv(DERIVED_DIR / "text_clusters.csv"):
        ids = sorted(int(part) for part in row["member_ids"].split("|") if part)
        cluster_members[row["cluster_hash"]] = ids
        text_clusters.append({
            "hash": row["cluster_hash"],
            "chars": int(row["chars"]),
            "n_respondents": int(row["n_respondents"]),
            "named_members": named_members(ids),
            "n_redacted": int(row["n_redacted"]),
            "preview": truncate(row["preview_240"], PREVIEW_MAX),
            "questions": sorted(int(part) for part in
                                row["question_numbers"].split("|") if part),
        })
    text_clusters.sort(key=lambda item: (-item["n_respondents"],
                                         -item["chars"], item["hash"]))

    anchor_vector: dict[int, str] = {
        pid: (flags[pid]["mbm_anchor_vector"] or "") for pid in people}

    vector_clusters = []
    for row in read_csv(DERIVED_DIR / "vector_clusters.csv"):
        ids = sorted(int(part) for part in row["member_ids"].split("|") if part)
        signatures = {anchor_vector[pid] for pid in ids}
        vector_clusters.append({
            "cluster_id": row["cluster_id"],
            "ids_named": [pid for pid in ids if not people[pid]["redacted"]],
            "n_redacted": sum(1 for pid in ids if people[pid]["redacted"]),
            "length": int(row["vector_length"]),
            "signature": (sorted(signatures)[0] if len(signatures) == 1
                          else None),
        })
    vector_clusters.sort(key=lambda item: (-item["length"], item["cluster_id"]))

    bloc_members: dict[str, list[int]] = defaultdict(list)
    for pid in sorted(people):
        for key in (flags[pid]["bloc"] or "").split("|"):
            if key:
                bloc_members[key].append(pid)

    blocs = []
    for key, ids in sorted(bloc_members.items()):
        signature = []
        for index in range(len(ANCHORS)):
            values = {vector[index] for pid in ids
                      if (vector := anchor_vector[pid]) and vector[index] != "-"}
            signature.append(int(sorted(values)[0]) if len(values) == 1 else None)
        shared = sum(1 for members in cluster_members.values()
                     if len(set(members) & set(ids)) >= 2)
        blocs.append({
            "key": key,
            "label": BLOC_LABELS.get(key, key.replace("_", " ").title()),
            "signature": signature,
            "members_named": named_members(ids),
            "n_redacted": sum(1 for pid in ids if people[pid]["redacted"]),
            "shared_texts": shared,
        })
    blocs.sort(key=lambda item: (-(len(item["members_named"])
                                   + item["n_redacted"]), item["key"]))

    families = defaultdict(list)
    for pid in sorted(people):
        group = flags[pid]["entity_group"]
        if group:
            families[group].append(pid)
    entity_families = [{"name": name, "ids": ids, "n": len(ids)}
                       for name, ids in sorted(families.items())]
    entity_families.sort(key=lambda item: (-item["n"], item["name"]))

    return {
        "_comment": (
            "PLAN Sec. 5 clusters.json, built from data/derived (P10). Redacted "
            "members are counts and ids only, never names. vector_clusters "
            "carry P10's cluster_id and a signature = the members' shared "
            "7-anchor vector string (Q71/83/97/113/124/153/171, '-' = "
            "unanswered), null if members differ on the anchors. blocs.signature "
            "is that vector as 7 values, null at any position where members do "
            "not agree. blocs.shared_texts counts clustered strings shared by "
            "at least two members of the bloc. A respondent can sit in two "
            "blocs (the Greek cluster nests inside pro_hourly)."),
        "text_clusters": text_clusters,
        "vector_clusters": vector_clusters,
        "blocs": blocs,
        "entity_families": entity_families,
    }


BLOC_LABELS = {
    "avary": "Avary / FPC supply chain",
    "semi": "SEMI and member companies",
    "luxshare": "Luxshare factory filings",
    "eiga_siga": "EIGA / SIGA industrial gases",
    "greece": "Greek industrial cluster",
    "korea": "Korean shared-response cluster",
    "fepc_tepco": "FEPC / TEPCO",
    "pro_hourly": "Pro-hourly-matching bloc",
}

# P20's closed audited_class vocabulary (PLAN Sec. 6), with definitions for the
# audit page. Used when reference/org_audit.csv is present.
AUDIT_VOCABULARY = (
    ("academic_institution", "Academic institution",
     "A university, college or a research group inside one."),
    ("think_tank", "Think tank",
     "A research and advocacy organisation outside the academy."),
    ("ngo_civil_society", "NGO / civil society",
     "A non-profit pursuing a public-interest mission, not a members' trade body."),
    ("trade_association", "Trade association",
     "A body whose members are companies in an industry, funded by them."),
    ("business_coalition", "Business coalition",
     "A cross-industry corporate platform or buyers' alliance."),
    ("company", "Company", "A commercial firm answering for itself."),
    ("consultancy", "Consultancy",
     "A firm selling advisory or inventory-preparation services."),
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
)


# --- audit ------------------------------------------------------------------


def build_audit(people, allow_missing: bool) -> dict:
    """Claimed vs audited classification, provisional until P20 lands."""
    if not ORG_AUDIT_CSV.exists():
        if not allow_missing:
            fail(f"missing {rel(ORG_AUDIT_CSV)} (P20). Rerun "
                 "with --allow-missing-curation to emit a provisional audit.")
        vocabulary = [{"key": slug, "label": label,
                       "definition": f"Claimed: {label}. Self-classification "
                                     "from the survey's organisation-type "
                                     "question, not yet audited."}
                      for _value, slug, label in ORG_TYPES]
        rows = [{
            "id": pid,
            "name": truncate(person["organization"], INDEX_NAME_MAX),
            "claimed": person["org_type"],
            "audited": person["org_type"],
            "basis": PROVISIONAL_BASIS,
        } for pid, person in sorted(people.items()) if not person["redacted"]]
        class_of = {pid: person["org_type"] for pid, person in people.items()}
        provisional = True
    else:
        valid = {key for key, _label, _definition in AUDIT_VOCABULARY}
        vocabulary = [{"key": key, "label": label, "definition": definition}
                      for key, label, definition in AUDIT_VOCABULARY]
        audited: dict[int, str] = {}
        basis: dict[int, str] = {}
        for row in read_csv(ORG_AUDIT_CSV):
            pid = int(row["respondent_id"])
            if pid not in people:
                fail(f"{ORG_AUDIT_CSV.name}: unknown respondent_id {pid}")
            if people[pid]["redacted"]:
                fail(f"{ORG_AUDIT_CSV.name}: respondent {pid} is redacted and "
                     "must not be audited by name")
            klass = (row["audited_class"] or "").strip()
            if klass not in valid:
                fail(f"{ORG_AUDIT_CSV.name}: respondent {pid} has "
                     f"audited_class {klass!r}, outside the closed vocabulary")
            audited[pid] = klass
            basis[pid] = truncate(row.get("basis") or "", BASIS_MAX)
        missing = sorted(pid for pid, person in people.items()
                         if not person["redacted"] and pid not in audited)
        if missing:
            fail(f"{ORG_AUDIT_CSV.name}: {len(missing)} named respondents are "
                 f"unaudited, first few {missing[:5]}")
        rows = [{
            "id": pid,
            "name": truncate(people[pid]["organization"], INDEX_NAME_MAX),
            "claimed": people[pid]["org_type"],
            "audited": audited[pid],
            "basis": basis[pid],
        } for pid in sorted(audited)]
        class_of = {pid: (audited[pid] if not person["redacted"]
                          else "unverifiable")
                    for pid, person in people.items()}
        provisional = False

    summary: dict[str, dict[str, int]] = {}
    for row in rows:
        summary.setdefault(row["claimed"], Counter())[row["audited"]] += 1

    audit = {
        "_comment": (
            "PLAN Sec. 5 audit.json. rows cover named respondents only; "
            "redacted respondents are unverifiable by construction and are "
            "counted, never listed. summary is claimed -> audited -> count. "
            "vocabulary describes the audited classes; claimed uses the "
            "org_type slugs of meta.segments.org_type (label them from there). "
            + ("provisional = true: reference/org_audit.csv (P20) is not "
               "present yet, so audited repeats the claimed class and the "
               "vocabulary is the claimed organisation-type slugs. The manager "
               "reruns the exporter when P20 merges."
               if provisional else
               "audited classes come from reference/org_audit.csv (P20).")),
        "provisional": provisional,
        "rows": rows,
        "summary": {claimed: dict(counts) for claimed, counts in summary.items()},
        "vocabulary": vocabulary,
    }
    audit["class_of"] = class_of
    return audit


# --- quotes -----------------------------------------------------------------


def build_quotes(con, people, flags, allow_missing: bool) -> dict:
    if not CURATED_QUOTES_JSON.exists():
        if not allow_missing:
            fail(f"missing {rel(CURATED_QUOTES_JSON)} (P21). "
                 "Rerun with --allow-missing-curation to emit no quotes.")
        return {}

    curated = json.loads(CURATED_QUOTES_JSON.read_text(encoding="utf-8"))
    if not isinstance(curated, dict):
        fail(f"{CURATED_QUOTES_JSON.name}: expected an object keyed by lever")

    cluster_of: dict[tuple[int, int], str] = {}
    for row in read_csv(DERIVED_DIR / "text_clusters.csv"):
        ids = {int(part) for part in row["member_ids"].split("|") if part}
        for number in (int(part) for part in
                       row["question_numbers"].split("|") if part):
            for pid in ids:
                cluster_of.setdefault((pid, number), row["cluster_hash"])

    out: dict[str, dict] = {}
    warnings: list[str] = []
    for lever, sides in sorted(curated.items()):
        if lever.startswith("_"):
            continue
        entry = {"for": [], "against": []}
        for side in ("for", "against"):
            for quote in sides.get(side, []) or []:
                pid = int(quote["respondent_id"])
                number = int(quote["q"])
                if pid not in people:
                    fail(f"{CURATED_QUOTES_JSON.name}: {lever}/{side} quotes "
                         f"unknown respondent {pid}")
                row = con.execute(
                    "SELECT answer_text FROM responses WHERE respondent_id = ? "
                    "AND question_number = ?", (pid, number)).fetchone()
                if row is None or not row[0]:
                    fail(f"{CURATED_QUOTES_JSON.name}: respondent {pid} has no "
                         f"answer to Q{number} ({lever}/{side})")
                text = (quote.get("text") or "").strip()
                if text not in row[0]:
                    fail(f"{CURATED_QUOTES_JSON.name}: {lever}/{side} quote for "
                         f"respondent {pid} Q{number} is not a verbatim "
                         "substring of the stored answer")
                if len(text) > QUOTE_MAX:
                    cut = text[:QUOTE_MAX].rsplit(" ", 1)[0]
                    warnings.append(
                        f"{lever}/{side} respondent {pid} Q{number}: quote "
                        f"{len(text)} chars, truncated to {len(cut)} "
                        f"(contract limit {QUOTE_MAX})")
                    text = cut
                person = people[pid]
                entry[side].append({
                    "text": text,
                    "q": number,
                    "respondent_id": pid,
                    "attribution": attribution(person),
                    "org_type": person["org_type"],
                    "redacted": person["redacted"],
                    "template_cluster": (cluster_of.get((pid, number))
                                         if int_or_zero(
                                             flags[pid]["is_template_response"])
                                         else None),
                })
        out[lever] = entry
    for warning in warnings:
        print(f"export_frontend: WARNING {warning}", file=sys.stderr)
    return out


# --- meta -------------------------------------------------------------------


def page_of(number: int):
    for page, ranges in PAGE_RANGES:
        for low, high in ranges:
            if low <= number <= high:
                return page
    return None


def meta_question_numbers(questions, rows) -> list[int]:
    numbers = set(rows)
    numbers.update(reason_questions(questions))
    numbers.update(select_questions(questions))
    numbers.update((183, 138, 122, 56))
    return sorted(numbers)


def build_meta(con, questions, ladders, segments, people, rows, generated) -> dict:
    totals = {
        "respondents": len(people),
        "questions": len(questions),
        "answers": con.execute("SELECT COUNT(*) FROM responses").fetchone()[0],
        "redacted": sum(1 for person in people.values() if person["redacted"]),
        "named": sum(1 for person in people.values() if not person["redacted"]),
    }
    question_entries = []
    for number in meta_question_numbers(questions, rows):
        question = questions[number]
        ladder = ladders.get(number)
        question_entries.append({
            "q": number,
            "id": question["question_id"],
            "shorthand": question["shorthand"],
            "label": question["label"],
            "construct": question["scale_construct"],
            "anchor_low": question["scale_anchor_low"],
            "anchor_high": question["scale_anchor_high"],
            "scale_note": question["scale_note"],
            "lever": question["policy_lever"],
            "type": question["question_type"],
            "n_answered": int(question["n_answered"] or 0),
            "page": page_of(number),
            "labels": (ladder["labels"] if ladder and ladder["labels"]
                       and question["question_type"] in
                       ("likert_1_5", "scale_labeled", "ordinal_select")
                       else None),
            "off_labels": (ladder["off_labels"] if ladder else []),
        })
    constructs = []
    for key, label, badge in CONSTRUCTS:
        members = [number for number in rows
                   if questions[number]["scale_construct"] == key]
        if members:
            constructs.append({"key": key, "label": label, "badge": badge,
                               "questions": members})
    return {
        "_comment": (
            "PLAN Sec. 5 meta.json. generated is the source export's "
            "publication date, not a wall-clock stamp, so reruns are "
            "byte-identical. Additions to Sec. 5: constructs (the heatmap row "
            "groups of Sec. 4 - one per scale_construct, with the direction "
            "badge a group must display, and the group id the validator checks "
            "for construct mixing), questions[].labels (the option ladder, "
            "which Sec. 5 requires for ordinal questions and which is emitted "
            "for every scale question; null for non-scale questions) and "
            "questions[].off_labels (the off-scale options counted in each "
            "cell's off, never in c). page is a path relative to frontend/. "
            f"segments values carry true respondent counts; the \"{SENTINEL}\" "
            f"mask applies to breakdowns of segment values with fewer than "
            f"{MIN_SEGMENT_N} respondents."),
        "generated": generated,
        "totals": totals,
        "segments": {
            dim: {"label": entry["label"], "values": entry["values"]}
            for dim, entry in segments.items()
        },
        "questions": question_entries,
        "constructs": constructs,
    }


# --- org profiles -----------------------------------------------------------


def build_orgs(con, questions, people, flags, segments, audit) -> list[tuple[int, dict]]:
    answers: dict[int, list[dict]] = defaultdict(list)
    for row in con.execute(
        """
        SELECT r.respondent_id, r.question_number, r.answer_text, r.answer_numeric
        FROM responses r JOIN questions q USING(question_id)
        JOIN respondents p ON p.respondent_id = r.respondent_id
        WHERE q.method IN ('mbm', 'general') AND p.is_redacted + 0 = 0
          AND (q.role <> 'profile' OR r.question_number IN (15, 17))
        ORDER BY r.respondent_id, r.question_number
        """
    ):
        question = questions[row["question_number"]]
        answers[row["respondent_id"]].append({
            "q": row["question_number"],
            "shorthand": question["shorthand"],
            "label": question["label"],
            "lever": question["policy_lever"],
            "type": question["question_type"],
            "text": row["answer_text"],
            "numeric": numeric_value(row["answer_numeric"]),
            "selections": [],
        })
    index: dict[tuple[int, int], dict] = {}
    for pid, items in answers.items():
        for item in items:
            index[(pid, item["q"])] = item
    for row in con.execute(
        """
        SELECT s.respondent_id, s.question_number, s.option_text
        FROM response_selections s JOIN questions q USING(question_id)
        JOIN respondents p ON p.respondent_id = s.respondent_id
        WHERE q.method IN ('mbm', 'general') AND p.is_redacted + 0 = 0
        ORDER BY s.respondent_id, s.question_number, s.selection_index
        """
    ):
        item = index.get((row["respondent_id"], row["question_number"]))
        if item is not None:
            item["selections"].append(row["option_text"])

    out = []
    for pid, person in sorted(people.items()):
        if person["redacted"]:
            continue
        flag = flags[pid]
        bloc = (flag["bloc"] or "").split("|")[0]
        out.append((pid, {
            "id": pid,
            "name": truncate(person["organization"], PROFILE_NAME_MAX),
            "org_type": person["org_type"],
            "audited_class": audit["class_of"][pid],
            "audit_basis": audit["basis_of"].get(pid, ""),
            "sector": segments["sector"]["of"][pid],
            "country": person["country"],
            "responding_as": segments["responding_as"]["of"][pid],
            "flags": {
                "template": bool(int_or_zero(flag["is_template_response"])),
                "bloc": bloc or None,
                "entity_group": flag["entity_group"] or None,
                "cites": bool(int_or_zero(flag["has_citation"])),
                "citation_count": int_or_zero(flag["n_citation_answers"]),
            },
            "answers": answers.get(pid, []),
        }))
    return out


# --- main -------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Export frontend/data/*.json per PLAN.md Sec. 5.")
    parser.add_argument("--allow-missing-curation", action="store_true",
                        help="emit a provisional audit.json and an empty "
                             "quotes.json when P20/P21 inputs are absent")
    args = parser.parse_args()

    for required in (DB_PATH, MANIFEST_PATH, DERIVED_DIR / "respondent_flags.csv",
                     DERIVED_DIR / "text_clusters.csv",
                     DERIVED_DIR / "vector_clusters.csv",
                     DERIVED_DIR / "domains.csv"):
        if not required.exists():
            fail(f"missing input {rel(required)}")

    con = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    try:
        generated = load_generated_date()
        people = load_respondents(con)
        questions = load_questions(con)
        ladders = load_ladders(con)
        flags = load_flags()
        missing_flags = sorted(set(people) - set(flags))
        if missing_flags:
            fail(f"respondent_flags.csv misses {len(missing_flags)} respondents, "
                 f"first few {missing_flags[:5]}")

        audit = build_audit(people, args.allow_missing_curation)
        audit["basis_of"] = {row["id"]: row["basis"] for row in audit["rows"]}
        segments = build_segments(people, audit)
        rows = heatmap_questions(questions)
        stance = stance_bucket_of(con)

        payload = {
            "meta": build_meta(con, questions, ladders, segments, people, rows,
                               generated),
            "likert": build_likert(con, ladders, segments, rows),
            "reasons": build_reasons(con, questions, segments),
            "selects": build_selects(con, questions, segments),
            "evidence": build_evidence(con, questions, segments, people, flags,
                                       stance),
            "respondents": build_respondents(con, questions, segments, people,
                                             flags, audit, rows),
            "clusters": build_clusters(people, flags),
            "quotes": build_quotes(con, people, flags,
                                   args.allow_missing_curation),
        }
        orgs = build_orgs(con, questions, people, flags, segments, audit)
    finally:
        con.close()

    audit_out = {key: value for key, value in audit.items()
                 if key not in ("class_of", "basis_of")}
    payload["audit"] = audit_out

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
        print(f"  {name:<20} {size / 1024:8.1f} KB")
    org_sizes.sort(reverse=True)
    print(f"  orgs/ ({len(orgs)} files)   "
          f"{sum(size for size, _pid in org_sizes) / 1024:8.1f} KB total, "
          f"largest {org_sizes[0][0] / 1024:.1f} KB (orgs/{org_sizes[0][1]}.json)")
    if stale:
        print(f"  removed {len(stale)} stale org profiles")
    print(f"  audit: {'provisional (claimed classes)' if audit['provisional'] else 'from reference/org_audit.csv'}"
          f"; quotes: {len(payload['quotes'])} levers")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
