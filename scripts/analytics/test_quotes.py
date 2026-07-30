#!/usr/bin/env python3
"""Validate the hand-curated quote set and the Q158 evidence coding.

Guards the two things a reader of the proposal pages has to be able to trust:

1. Every quote is genuinely verbatim. `text` is split on the elision marker
   ``[…]`` and each remaining segment must be a literal substring of that
   respondent's stored answer to that question — so nothing was paraphrased,
   tightened, or stitched together across questions.
2. Redaction is never broken. A respondent who asked for redaction is attributed
   as ``Redacted — <org type>, <country>`` and nothing else.

It also re-derives the template-cluster map from the database with the same
recipe P10 uses (normalise a free-text answer of >=200 chars to lowercase with
whitespace collapsed, sha1 it, keep the strings shared by >=3 respondents) and
asserts every `template_cluster` badge in the file matches — a quote drawn from
a coordinated response pack must carry its hash, and a quote that is not must
carry `null`.

Usage:  python3 scripts/analytics/test_quotes.py     (exit 0 = all pass)
"""
from __future__ import annotations

import collections
import csv
import hashlib
import json
import re
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
DB = ROOT / "data" / "scope2_consultation.sqlite"
QUOTES = ROOT / "reference" / "curated_quotes.json"
Q158_CODING = ROOT / "data" / "derived" / "q158_evidence_coding.csv"

ELISION = "[…]"
MAX_CHARS = 600
MIN_PER_SIDE, MAX_PER_SIDE = 4, 6

LEVERS = [
    "fossil_fallback_ef", "hourly_exempt", "legacy_clause", "mbm_package",
    "qc4_hourly_matching", "qc5_deliverability", "resid_mix_def", "sss", "transition",
]
SIDES = ["against", "for"]
QUOTE_KEYS = {"attribution", "org_type", "q", "redacted", "respondent_id",
              "template_cluster", "text"}

# frontend/data segment vocabulary (PLAN.md §5)
ORG_TYPE_SLUGS = {
    "Company": "company",
    "Industry group": "industry_group",
    "Consultant supporting organizations with GHG inventories/strategies": "consultant",
    "Non-profit organization/NGO/civil society": "ngo",
    "Energy supplier/retailer or utility": "energy_supplier",
    "Other (please specify below)": "other",
    "Academia/research": "academia",
    "Data/analytics or software provider related to GHG inventories": "data_analytics",
    "Financial Institution": "financial",
    "Government institution": "government",
    "Certificate registry/tracking system operator": "registry_operator",
    "Verification/assurance provider": "verification",
    "GHG account/reporting program or initiative": "ghg_program",
    "Electric Grid Operator": "grid_operator",
    "International agency/multilateral organization": "intl_agency",
}

Q158_CODES = {
    "cites_study", "cites_own_data", "cost_argument", "data_access_argument",
    "feasibility_argument", "sme_equity_argument", "anecdote_only",
    "no_evidence_assertion", "other",
}


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.lower()).strip()


def template_clusters(con) -> dict[tuple[int, int], str]:
    """(respondent_id, question_number) -> sha1 of the shared normalised string.

    Same recipe as scripts/analytics/derive_flags.py (P10): a template cluster is
    a normalised free-text answer of >=200 chars given by >=3 distinct respondents.
    """
    groups: dict[str, list[tuple[int, int]]] = collections.defaultdict(list)
    for rid, qnum, text in con.execute(
            "SELECT respondent_id, question_number, answer_text FROM responses "
            "WHERE question_type = 'free_text' AND answer_text IS NOT NULL "
            "AND length(answer_text) >= 200"):
        key = norm(text)
        if len(key) >= 200:
            groups[key].append((rid, qnum))
    out: dict[tuple[int, int], str] = {}
    for key, members in groups.items():
        if len({rid for rid, _ in members}) >= 3:
            digest = hashlib.sha1(key.encode("utf-8")).hexdigest()
            for member in members:
                out[member] = digest
    return out


def main() -> int:
    quotes = json.loads(QUOTES.read_text(encoding="utf-8"))
    raw = QUOTES.read_bytes()

    con = sqlite3.connect(DB)
    respondents = {
        rid: dict(is_redacted=int(red), name=name, organization=org,
                  organization_type=otype, country=country)
        for rid, red, name, org, otype, country in con.execute(
            "SELECT respondent_id, is_redacted + 0, name, organization, "
            "organization_type, country FROM respondents")
    }
    answers = {
        (rid, qnum): text for rid, qnum, text in con.execute(
            "SELECT respondent_id, question_number, answer_text FROM responses "
            "WHERE answer_text IS NOT NULL")
    }
    clusters = template_clusters(con)

    flat = [(lever, side, q)
            for lever, sides in quotes.items()
            for side, arr in sides.items()
            for q in arr]

    # --- per-quote checks; each collects the offending quotes ---
    bad_shape, bad_rid, bad_verbatim, too_long = [], [], [], []
    bad_elision, bad_named, bad_redacted, bad_org_type = [], [], [], []
    bad_badge, missing_badge, bad_lever_key = [], [], []
    seen_text: dict[str, str] = {}
    duplicates = []

    for lever, side, q in flat:
        where = f"{lever}/{side} rid={q.get('respondent_id')} Q{q.get('q')}"
        if set(q) != QUOTE_KEYS:
            bad_shape.append(f"{where}: keys {sorted(set(q) ^ QUOTE_KEYS)}")
            continue

        rid, qnum, text = q["respondent_id"], q["q"], q["text"]
        person = respondents.get(rid)
        if person is None:
            bad_rid.append(where)
            continue

        stored = answers.get((rid, qnum))
        if stored is None:
            bad_rid.append(f"{where}: no answer to Q{qnum}")
            continue

        # 1. verbatim: every non-elided segment is a literal substring
        segments = [s.strip() for s in text.split(ELISION)]
        if any(not s for s in segments):
            bad_elision.append(f"{where}: empty segment around an elision")
        for seg in segments:
            if seg and seg not in stored:
                bad_verbatim.append(f"{where}: {seg[:70]!r} not in stored answer")

        # 2. length
        if len(text) > MAX_CHARS:
            too_long.append(f"{where}: {len(text)} chars")

        # 3. redaction discipline
        expected_type = ORG_TYPE_SLUGS.get(person["organization_type"])
        if q["org_type"] != expected_type:
            bad_org_type.append(f"{where}: {q['org_type']} != {expected_type}")
        if bool(person["is_redacted"]) != q["redacted"]:
            bad_redacted.append(f"{where}: redacted flag disagrees with the db")
        if q["redacted"]:
            expected = f"Redacted — {q['attribution'].split(' — ', 1)[-1]}"
            if q["attribution"] != expected or not q["attribution"].startswith("Redacted — "):
                bad_named.append(f"{where}: {q['attribution']!r}")
            for field in ("name", "organization"):
                value = (person[field] or "").strip()
                if value and value.lower() not in ("redacted", "not provided") \
                        and value.lower() in q["attribution"].lower():
                    bad_named.append(f"{where}: attribution leaks {field}")
        else:
            tail = f", {person['country']}"
            if not q["attribution"].endswith(tail) or " — " not in q["attribution"]:
                bad_named.append(f"{where}: {q['attribution']!r}")

        # 4. template badge agrees with the recomputed cluster map
        actual = clusters.get((rid, qnum))
        if q["template_cluster"] is None and actual is not None:
            missing_badge.append(f"{where}: template text, badge is null")
        if q["template_cluster"] is not None and q["template_cluster"] != actual:
            bad_badge.append(f"{where}: badge {q['template_cluster'][:8]} != "
                             f"{(actual or 'none')[:8]}")

        # 5. no quote reused across levers/sides
        key = norm(text)
        if key in seen_text:
            duplicates.append(f"{where}: same text as {seen_text[key]}")
        seen_text[key] = where

    for lever in quotes:
        if lever not in LEVERS:
            bad_lever_key.append(lever)
        if sorted(quotes[lever]) != SIDES:
            bad_lever_key.append(f"{lever}: sides {sorted(quotes[lever])}")

    thin = [f"{lever}/{side}={len(quotes[lever][side])}"
            for lever in quotes for side in quotes.get(lever, {})
            if not MIN_PER_SIDE <= len(quotes[lever][side]) <= MAX_PER_SIDE]

    # --- Q158 evidence coding ---
    q158_ids = {rid for (rid, qnum) in answers if qnum == 158}
    with Q158_CODING.open(encoding="utf-8") as f:
        coding = list(csv.DictReader(f))
    coded_ids = {int(r["respondent_id"]) for r in coding}
    bad_codes = [f"{r['respondent_id']}: {c}" for r in coding
                 for c in r["codes"].split("|") if c not in Q158_CODES]
    unsorted_codes = [r["respondent_id"] for r in coding
                      if r["codes"].split("|") != sorted(r["codes"].split("|"))]
    empty_codes = [r["respondent_id"] for r in coding if not r["codes"].strip()]

    con.close()

    checks = [
        ("all nine lever keys present", [], sorted(set(LEVERS) - set(quotes)) + bad_lever_key),
        ("quote objects match the contract shape", [], bad_shape),
        ("respondent_id exists and answered that question", [], bad_rid),
        ("text is verbatim in the stored answer", [], bad_verbatim),
        ("elisions separate real segments", [], bad_elision),
        (f"text <= {MAX_CHARS} chars", [], too_long),
        ("org_type slug matches the respondent", [], bad_org_type),
        ("redacted flag matches the db", [], bad_redacted),
        ("redacted quotes carry no name", [], bad_named),
        ("template badges match the cluster map", [], bad_badge),
        ("template text is always badged", [], missing_badge),
        ("no quote reused across levers", [], duplicates),
        (f"{MIN_PER_SIDE}-{MAX_PER_SIDE} quotes per lever per side", [], thin),
        ("json keys sorted, file ends with newline", True,
         raw.endswith(b"\n") and json.dumps(quotes, sort_keys=True, ensure_ascii=False)
         == json.dumps(quotes, ensure_ascii=False)),
        ("Q158 coding covers every Q158 answer", set(), q158_ids ^ coded_ids),
        ("Q158 codes come from the closed vocabulary", [], bad_codes),
        ("Q158 codes are sorted and non-empty", [], unsorted_codes + empty_codes),
    ]

    failed = 0
    for name, expected, got in checks:
        good = got == expected
        failed += not good
        detail = "ok" if good else f"{len(got) if hasattr(got, '__len__') else got} problem(s)"
        print(f"  {'PASS' if good else 'FAIL'}  {name:<46} {detail}")
        if not good and hasattr(got, "__iter__") and not isinstance(got, bool):
            for item in list(got)[:8]:
                print(f"          - {item}")

    n_quotes = len(flat)
    n_badged = sum(1 for _, _, q in flat if q.get("template_cluster"))
    n_redacted = sum(1 for _, _, q in flat if q.get("redacted"))
    print(f"\n{len(checks) - failed}/{len(checks)} checks passed  "
          f"({n_quotes} quotes, {n_badged} template-badged, {n_redacted} redacted, "
          f"{len(coding)} Q158 answers coded)")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
