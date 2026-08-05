#!/usr/bin/env python3
"""Validate the P21 curation layer: theme taxonomy, per-answer codes, quotes.

Guards what the topic pages, the voices page and the essay have to be able to
trust about the interpretive layer:

1. Closed vocabulary — every theme key in `coded_themes.csv` and every theme
   attached to a quote exists in `theme_taxonomy.md` (or is the reserved
   `uncodeable`, which never mixes with real keys).
2. Full coverage — every substantive free-text answer in the analytical base
   (roles comment/free_text_primary, junk/superseded respondents removed) has
   exactly one row, >=85% of them coded non-`uncodeable`, rows deterministic
   (sorted by respondent then question, pipe-joined keys sorted).
3. Template discipline — answers sharing the same normalised text carry
   identical codes, and every quote's `template_cluster` badge agrees with the
   cluster map recomputed here with P10's recipe (normalise to lowercase with
   whitespace collapsed, keep strings >=200 chars shared by >=2 respondents,
   sha1 the normalised string).
4. Verbatim + redaction discipline for quotes — `text` split on ``[…]`` must
   be literal substrings of that respondent's stored answer, in order; <=600
   chars; attribution is rebuilt from the db ("Org — org type, country" for
   named, "Redacted — org type, country" for redacted, never a name for
   redacted respondents); junk/superseded respondents are never quoted; each
   topic carries 3-6 quotes per side; quote themes are a subset of that
   answer's coded themes.

Usage:  python3 electricity-consequential/scripts/analytics/test_themes_quotes.py
(exit 0 = all pass)
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
DB = ROOT / "data" / "electricity_consequential.sqlite"
TAXONOMY = ROOT / "reference" / "theme_taxonomy.md"
CODED = ROOT / "reference" / "coded_themes.csv"
QUOTES = ROOT / "reference" / "curated_quotes.json"

ELISION = "[…]"
MAX_CHARS = 600
MIN_PER_SIDE, MAX_PER_SIDE = 3, 6
COVERAGE_FLOOR = 0.85

# PLAN §3.5 provisional analytical-base exclusions (junk 11/12/14, superseded
# 100); reconcile with reference/exclusions.csv when P20 merges.
EXCLUDED = {11, 12, 14, 100}
SUBSTANTIVE_ROLES = ("comment", "free_text_primary")

TOPICS = {
    "general": {18},
    "formula": {20, 22, 23, 25},
    "additionality": {27, 29, 30, 32, 34},
    "emission_rates": {37, 40, 41, 42, 44, 46},
    "weighting": {48, 50, 51, 52},
}
SIDES = ["against", "context", "for"]
QUOTE_KEYS = {"attribution", "org_type", "qid", "redacted", "respondent_id",
              "template_cluster", "text", "themes"}

# frontend/data segment vocabulary (PLAN.md §5) restricted to the org types
# present in this survey, plus the short labels used in attributions.
ORG_TYPES = {
    "Company": ("company", "Company"),
    "Consultant supporting organizations with GHG inventories/strategies":
        ("consultant", "Consultant"),
    "Non-profit organization/NGO/civil society": ("ngo", "NGO/civil society"),
    "Industry group": ("industry_group", "Industry group"),
    "Energy supplier/retailer or utility":
        ("energy_supplier", "Energy supplier/utility"),
    "Other (please specify below)": ("other", "Other"),
    "Academia/research": ("academia", "Academia/research"),
    "Data/analytics or software provider related to GHG inventories":
        ("data_analytics", "Data/analytics provider"),
    "Financial Institution": ("financial", "Financial institution"),
    "Government institution": ("government", "Government"),
    "GHG account/reporting program or initiative": ("ghg_program", "GHG program"),
    "Certificate registry/tracking system operator":
        ("registry_operator", "Registry operator"),
    "Verification/assurance provider": ("verification", "Verification/assurance"),
}


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.lower()).strip()


def taxonomy_keys(md: str) -> list[str]:
    """Theme keys from the `### <n>. `key` — <title>` headings."""
    return re.findall(r"^### \d+\. `([a-z0-9_]+)`", md, re.M)


def template_clusters(con) -> dict[tuple[int, int], str]:
    """(respondent_id, question_number) -> sha1 of the shared normalised string.

    P10's recipe over the full free-text table: a template cluster is a
    normalised answer of >=200 chars given by >=2 distinct respondents.
    """
    groups: dict[str, list[tuple[int, int]]] = collections.defaultdict(list)
    for rid, qnum, text in con.execute(
            "SELECT respondent_id + 0, question_number + 0, answer_text FROM responses "
            "WHERE question_type = 'free_text' AND answer_text IS NOT NULL "
            "AND length(answer_text) >= 200"):
        key = norm(text)
        if len(key) >= 200:
            groups[key].append((int(rid), int(qnum)))
    out: dict[tuple[int, int], str] = {}
    for key, members in groups.items():
        if len({rid for rid, _ in members}) >= 2:
            digest = hashlib.sha1(key.encode("utf-8")).hexdigest()
            for member in members:
                out[member] = digest
    return out


def main() -> int:
    tax = taxonomy_keys(TAXONOMY.read_text(encoding="utf-8"))
    tax_set = set(tax)

    con = sqlite3.connect(DB)
    respondents = {
        int(rid): dict(is_redacted=int(red), name=(name or "").strip(),
                       organization=(org or "").strip(), organization_type=otype,
                       country=country)
        for rid, red, name, org, otype, country in con.execute(
            "SELECT respondent_id + 0, is_redacted + 0, name, organization, "
            "organization_type, country FROM respondents")
    }
    substantive = {
        (int(rid), int(qnum)): text
        for rid, qnum, text in con.execute(
            "SELECT respondent_id + 0, question_number + 0, answer_text FROM v_free_text "
            f"WHERE role IN {SUBSTANTIVE_ROLES!r}")
        if int(rid) not in EXCLUDED
    }
    clusters = template_clusters(con)
    con.close()

    # ---------------- coded_themes.csv ----------------
    with CODED.open(encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        header = next(reader)
        rows = [(int(r), int(q), keys) for r, q, keys in reader]

    bad_header = [] if header == ["respondent_id", "question_number", "theme_keys"] \
        else [",".join(header)]
    coded = {(r, q): keys.split("|") for r, q, keys in rows}
    dup_rows = [f"{r} Q{q}" for (r, q), n in
                collections.Counter((r, q) for r, q, _ in rows).items() if n > 1]
    excluded_coded = [f"{r} Q{q}" for r, q, _ in rows if r in EXCLUDED]
    missing = sorted(set(substantive) - set(coded))
    extra = sorted(set(coded) - set(substantive))
    unsorted_rows = [] if [(r, q) for r, q, _ in rows] == sorted((r, q) for r, q, _ in rows) \
        else ["rows not sorted by (respondent_id, question_number)"]

    bad_keys, unsorted_keys, bad_uncodeable = [], [], []
    for (r, q), keys in coded.items():
        where = f"{r} Q{q}"
        if not keys or any(not k for k in keys):
            bad_keys.append(f"{where}: empty key")
            continue
        unknown = [k for k in keys if k not in tax_set and k != "uncodeable"]
        if unknown:
            bad_keys.append(f"{where}: {unknown}")
        if keys != sorted(keys):
            unsorted_keys.append(where)
        if "uncodeable" in keys and keys != ["uncodeable"]:
            bad_uncodeable.append(where)

    # coverage floor, raw and dedup-adjusted (each normalised text counted once)
    n_unc = sum(1 for k in coded.values() if k == ["uncodeable"])
    coverage = 1 - n_unc / len(coded) if coded else 0.0
    text_groups: dict[str, list[tuple[int, int]]] = collections.defaultdict(list)
    for cell, text in substantive.items():
        text_groups[norm(text)].append(cell)
    dedup_unc = sum(1 for cells in text_groups.values()
                    if coded.get(cells[0]) == ["uncodeable"])
    dedup_coverage = 1 - dedup_unc / len(text_groups) if text_groups else 0.0
    thin_coverage = [] if coverage >= COVERAGE_FLOOR and dedup_coverage >= COVERAGE_FLOOR \
        else [f"raw {coverage:.3f}, dedup {dedup_coverage:.3f} < {COVERAGE_FLOOR}"]

    # identical text (template clusters included) -> identical codes
    inconsistent = []
    for key, cells in text_groups.items():
        codesets = {tuple(coded[c]) for c in cells if c in coded}
        if len(codesets) > 1:
            inconsistent.append(f"{sorted(cells)}: {sorted(codesets)}")

    unused = sorted(tax_set - {k for keys in coded.values() for k in keys})

    # ---------------- curated_quotes.json ----------------
    quotes = json.loads(QUOTES.read_text(encoding="utf-8"))
    raw = QUOTES.read_bytes()

    flat = [(topic, side, q)
            for topic, sides in quotes.items()
            for side, arr in sides.items()
            for q in arr]

    bad_topic_key = sorted(set(quotes) ^ set(TOPICS))
    for topic in quotes:
        if topic in TOPICS and sorted(quotes[topic]) != SIDES:
            bad_topic_key.append(f"{topic}: sides {sorted(quotes[topic])}")

    bad_shape, bad_rid, bad_verbatim, too_long = [], [], [], []
    bad_elision, bad_attr, bad_redacted, bad_org_type = [], [], [], []
    bad_badge, missing_badge, bad_qid, bad_themes = [], [], [], []
    unsorted_sides, duplicates = [], []
    seen_text: dict[str, str] = {}

    for topic, side, q in flat:
        where = f"{topic}/{side} rid={q.get('respondent_id')} {q.get('qid')}"
        if set(q) != QUOTE_KEYS:
            bad_shape.append(f"{where}: keys {sorted(set(q) ^ QUOTE_KEYS)}")
            continue

        rid, qid, text = q["respondent_id"], q["qid"], q["text"]
        if not re.fullmatch(r"Q\d{3}", qid):
            bad_qid.append(f"{where}: malformed qid")
            continue
        qnum = int(qid[1:])
        if topic in TOPICS and qnum not in TOPICS[topic]:
            bad_qid.append(f"{where}: Q{qnum} not a {topic} question")

        person = respondents.get(rid)
        if person is None or rid in EXCLUDED:
            bad_rid.append(where)
            continue
        stored = substantive.get((rid, qnum))
        if stored is None:
            bad_rid.append(f"{where}: no substantive answer to Q{qnum}")
            continue

        # 1. verbatim: elision-aware, segments in order
        segments = [s.strip() for s in text.split(ELISION)]
        if any(not s for s in segments):
            bad_elision.append(f"{where}: empty segment around an elision")
        pos = 0
        for seg in segments:
            i = stored.find(seg, pos) if seg else -1
            if i < 0:
                bad_verbatim.append(f"{where}: {seg[:70]!r} not in stored answer (in order)")
                break
            pos = i + len(seg)

        # 2. length
        if len(text) > MAX_CHARS:
            too_long.append(f"{where}: {len(text)} chars")

        # 3. attribution/redaction rebuilt from the db
        slug, label = ORG_TYPES[person["organization_type"]]
        if q["org_type"] != slug:
            bad_org_type.append(f"{where}: {q['org_type']} != {slug}")
        if bool(person["is_redacted"]) != q["redacted"]:
            bad_redacted.append(f"{where}: redacted flag disagrees with the db")
        if q["redacted"]:
            expected = f"Redacted — {label}, {person['country']}"
        else:
            who = person["organization"] or person["name"] or "Unnamed"
            expected = f"{who[:80]} — {label}, {person['country']}"
        if q["attribution"] != expected:
            bad_attr.append(f"{where}: {q['attribution']!r} != {expected!r}")
        if q["redacted"]:
            for field in ("name", "organization"):
                value = person[field]
                if value and value.lower() not in ("redacted", "not provided") \
                        and value.lower() in q["attribution"].lower():
                    bad_attr.append(f"{where}: attribution leaks {field}")

        # 4. template badge agrees with the recomputed cluster map
        actual = clusters.get((rid, qnum))
        if q["template_cluster"] is None and actual is not None:
            missing_badge.append(f"{where}: template text, badge is null")
        if q["template_cluster"] is not None and q["template_cluster"] != actual:
            bad_badge.append(f"{where}: badge {q['template_cluster'][:8]} != "
                             f"{(actual or 'none')[:8]}")

        # 5. themes: non-empty, closed vocabulary, subset of the coded row
        themes = q["themes"]
        if not themes or not isinstance(themes, list):
            bad_themes.append(f"{where}: empty themes")
        else:
            unknown = [t for t in themes if t not in tax_set]
            outside = [t for t in themes if t not in coded.get((rid, qnum), [])]
            if unknown:
                bad_themes.append(f"{where}: unknown {unknown}")
            if outside:
                bad_themes.append(f"{where}: not in coded row {outside}")

        # 6. no quote reused across topics/sides
        key = norm(text)
        if key in seen_text:
            duplicates.append(f"{where}: same text as {seen_text[key]}")
        seen_text[key] = where

    thin = [f"{topic}/{side}={len(arr)}"
            for topic, sides in quotes.items() for side, arr in sides.items()
            if not MIN_PER_SIDE <= len(arr) <= MAX_PER_SIDE]

    for topic, sides in quotes.items():
        for side, arr in sides.items():
            order = [(q.get("respondent_id"), q.get("qid")) for q in arr]
            if order != sorted(order):
                unsorted_sides.append(f"{topic}/{side}")

    canonical = json.dumps(quotes, indent=1, sort_keys=True,
                           ensure_ascii=False).encode("utf-8") + b"\n"

    checks = [
        ("taxonomy has keys, no duplicates", [],
         (["no keys parsed"] if not tax else []) +
         [k for k, n in collections.Counter(tax).items() if n > 1]),
        ("csv header is the contract header", [], bad_header),
        ("one row per substantive answer (none missing)", [],
         [f"{r} Q{q}" for r, q in missing[:50]]),
        ("no rows outside the analytical base", [],
         [f"{r} Q{q}" for r, q in extra[:50]] + excluded_coded + dup_rows),
        ("csv rows sorted deterministically", [], unsorted_rows),
        ("theme keys from the closed vocabulary", [], bad_keys),
        ("pipe-joined keys sorted", [], unsorted_keys),
        ("uncodeable never mixes with real keys", [], bad_uncodeable),
        (f"coverage >= {COVERAGE_FLOOR:.0%} (raw and dedup)", [], thin_coverage),
        ("identical answers carry identical codes", [], inconsistent),
        ("every taxonomy key is used at least once", [], unused),
        ("all five topics with all three sides", [], bad_topic_key),
        ("quote objects match the contract shape", [], bad_shape),
        ("qid well-formed and on-topic", [], bad_qid),
        ("respondent in analytical base, answered that question", [], bad_rid),
        ("text is verbatim in the stored answer", [], bad_verbatim),
        ("elisions separate real segments", [], bad_elision),
        (f"text <= {MAX_CHARS} chars", [], too_long),
        ("org_type slug matches the respondent", [], bad_org_type),
        ("redacted flag matches the db", [], bad_redacted),
        ("attribution rebuilt from the db, no names for redacted", [], bad_attr),
        ("template badges match the cluster map", [], bad_badge),
        ("template text is always badged", [], missing_badge),
        ("quote themes in vocabulary and coded row", [], bad_themes),
        ("no quote reused across topics", [], duplicates),
        (f"{MIN_PER_SIDE}-{MAX_PER_SIDE} quotes per topic per side", [], thin),
        ("quotes sorted within each side", [], unsorted_sides),
        ("canonical serialization (sorted keys, trailing newline)", True,
         raw == canonical),
    ]

    failed = 0
    for name, expected, got in checks:
        good = got == expected
        failed += not good
        detail = "ok" if good else f"{len(got) if hasattr(got, '__len__') else got} problem(s)"
        print(f"  {'PASS' if good else 'FAIL'}  {name:<52} {detail}")
        if not good and hasattr(got, "__iter__") and not isinstance(got, bool):
            for item in list(got)[:8]:
                print(f"          - {item}")

    n_badged = sum(1 for _, _, q in flat if q.get("template_cluster"))
    n_redacted = sum(1 for _, _, q in flat if q.get("redacted"))
    print(f"\n{len(checks) - failed}/{len(checks)} checks passed  "
          f"({len(coded)} answers coded, {len(tax)} theme keys, "
          f"coverage {coverage:.1%} raw / {dedup_coverage:.1%} dedup, "
          f"{len(flat)} quotes, {n_badged} template-badged, {n_redacted} redacted)")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
