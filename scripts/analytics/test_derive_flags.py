#!/usr/bin/env python3
"""Assertions for derive_flags.py. Run with plain ``python3``.

    python3 scripts/analytics/test_derive_flags.py

Regenerates the derived tables into a scratch directory, checks the headline
findings from PLAN.md Sec. 3.5-3.7 still fall out, and proves the run is
byte-for-byte reproducible. Never writes to ``data/derived/``.
"""

from __future__ import annotations

import csv
import hashlib
import shutil
import sqlite3
import sys
import tempfile
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import derive_flags  # noqa: E402

FAILURES: list[str] = []
CHECKS = 0


def check(name: str, condition: bool, detail: str = "") -> None:
    global CHECKS
    CHECKS += 1
    if condition:
        print(f"  PASS  {name}{('  ' + detail) if detail else ''}")
    else:
        print(f"  FAIL  {name}  {detail}")
        FAILURES.append(name)


def check_between(name: str, value, low, high) -> None:
    check(name, low <= value <= high, f"expected {low}-{high}, got {value}")


def check_equal(name: str, value, expected) -> None:
    check(name, value == expected, f"expected {expected}, got {value}")


def read_rows(path: Path) -> list[dict]:
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def digest(path: Path) -> str:
    return hashlib.sha1(path.read_bytes()).hexdigest()


def generate(out_dir: Path) -> dict:
    """Run the pipeline with output redirected to ``out_dir``."""
    original = derive_flags.OUT_DIR
    derive_flags.OUT_DIR = out_dir
    try:
        con = sqlite3.connect(f"file:{derive_flags.DB_PATH}?mode=ro", uri=True)
        con.row_factory = sqlite3.Row
        try:
            result = derive_flags.build(con)
        finally:
            con.close()
        derive_flags.write_outputs(result)
    finally:
        derive_flags.OUT_DIR = original
    return result


OUTPUTS = (
    "respondent_flags.csv", "text_clusters.csv", "vector_clusters.csv",
    "citations.csv", "domains.csv",
)


def main() -> int:
    workdir = Path(tempfile.mkdtemp(prefix="derive_flags_test_"))
    try:
        first = workdir / "run1"
        first.mkdir()
        result = generate(first)

        flags = read_rows(first / "respondent_flags.csv")
        clusters = read_rows(first / "text_clusters.csv")
        vectors = read_rows(first / "vector_clusters.csv")
        citations = read_rows(first / "citations.csv")
        domains = read_rows(first / "domains.csv")

        print("\ncoverage")
        check_equal("all respondents present", len(flags), 1072)
        with sqlite3.connect(f"file:{derive_flags.DB_PATH}?mode=ro", uri=True) as con:
            db_ids = {int(r[0]) for r in con.execute(
                "SELECT respondent_id FROM respondents")}
        csv_ids = {int(r["respondent_id"]) for r in flags}
        check("respondent ids match the database exactly", csv_ids == db_ids,
              f"missing={sorted(db_ids - csv_ids)[:5]} extra={sorted(csv_ids - db_ids)[:5]}")
        check("respondent_flags is sorted by id",
              [int(r["respondent_id"]) for r in flags] == sorted(csv_ids))
        check_equal("header matches the P10 contract",
                    list(flags[0].keys()), derive_flags.FLAG_HEADER)

        print("\ntemplate responses")
        template = sum(int(r["is_template_response"]) for r in flags)
        check_between("template respondents", template, 140, 170)
        check("every template respondent shares clustered text",
              all(int(r["n_shared_texts"]) >= 1
                  for r in flags if int(r["is_template_response"])))
        check("no non-clustered respondent is flagged",
              all(int(r["is_template_response"]) == 0
                  for r in flags if int(r["n_shared_texts"]) == 0))

        print("\ntext clusters")
        check("text clusters found", len(clusters) >= 250, f"got {len(clusters)}")
        check("every cluster has >= 3 respondents",
              all(int(r["n_respondents"]) >= 3 for r in clusters))
        check("every cluster string is >= 200 chars",
              all(int(r["chars"]) >= derive_flags.MIN_CLUSTER_CHARS for r in clusters))
        check("named + redacted == members",
              all(int(r["n_named"]) + int(r["n_redacted"]) == int(r["n_respondents"])
                  for r in clusters))
        check("member_ids count matches n_respondents",
              all(len(r["member_ids"].split("|")) == int(r["n_respondents"])
                  for r in clusters))
        check("cluster hashes are unique",
              len({r["cluster_hash"] for r in clusters}) == len(clusters))
        check("previews are single-line and <= 240 chars",
              all(len(r["preview_240"]) <= 240 and "\n" not in r["preview_240"]
                  for r in clusters))

        print("\nvector clusters")
        check("at least 17 vector clusters", len(vectors) >= 17, f"got {len(vectors)}")
        check("every vector is >= 10 items",
              all(int(r["vector_length"]) >= derive_flags.MIN_VECTOR_LENGTH
                  for r in vectors))
        check("every vector cluster has >= 2 members",
              all(int(r["n_respondents"]) >= 2 for r in vectors))
        lengths = {r["cluster_id"]: (int(r["n_respondents"]), int(r["vector_length"]))
                   for r in vectors}
        check("a 6-member length-20 cluster exists (Avary family)",
              (6, 20) in lengths.values())
        check("a 6-member length-17 cluster exists (SEMI)",
              (6, 17) in lengths.values())

        print("\nblocs")
        blocs = result["blocs"]
        check_equal("pro_hourly bloc size", len(blocs["pro_hourly"]["members"]), 22)
        anchors = {int(r["respondent_id"]): r["mbm_anchor_vector"] for r in flags}
        check("every pro_hourly member has anchor vector 5545544",
              all(anchors[i] == "5545544" for i in blocs["pro_hourly"]["members"]))
        for key, _label, _rule, expected in derive_flags.BLOC_DEFS:
            check_equal(f"bloc {key}", len(blocs[key]["members"]), expected)
        bloc_counts = Counter()
        for row in flags:
            for key in filter(None, row["bloc"].split("|")):
                bloc_counts[key] += 1
        check("bloc column agrees with resolved membership",
              all(bloc_counts[k] == len(blocs[k]["members"]) for k in blocs),
              f"{dict(bloc_counts)}")

        print("\nentity families")
        families = Counter(r["entity_group"] for r in flags if r["entity_group"])
        for family, expected in sorted(derive_flags.EXPECTED_FAMILY_SIZES.items()):
            check_equal(f"entity family {family}", families.get(family, 0), expected)
        check("luxshare covers the 9 Latin-script filings plus CJK variants",
              families.get("luxshare", 0) >= 9)

        print("\ncitations")
        citing = sum(int(r["has_citation"]) for r in flags)
        check_between("citation respondents", citing, 190, 215)
        check("has_citation agrees with n_citation_answers",
              all(int(r["has_citation"]) == (int(r["n_citation_answers"]) > 0)
                  for r in flags))
        valid_signals = {name for name, _ in derive_flags.SIGNAL_PATTERNS}
        check("every signal token is from the documented battery",
              all(set(r["signals"].split("|")) <= valid_signals for r in citations))
        check("every citation row has at least one signal",
              all(r["signals"] for r in citations))
        cite_ids = {int(r["respondent_id"]) for r in citations}
        check("citation respondents are a superset of flagged citers",
              cite_ids >= {int(r["respondent_id"]) for r in flags
                           if int(r["has_citation"])})
        url_answers = sum(1 for r in citations if "url" in r["signals"].split("|"))
        check_equal("answers containing a URL", url_answers, 613)

        print("\ndomains")
        check("domains found", len(domains) >= 150, f"got {len(domains)}")
        classes = {r["class"] for r in domains}
        check("classes come from the curated vocabulary",
              classes <= {"peer_reviewed", "peer_reviewed_or_preprint", "advocacy",
                          "government", "data_vendor", "standard_setter",
                          "shortener", "other"}, f"got {sorted(classes)}")
        by_domain = {r["domain"]: r for r in domains}
        for domain, expected in (("sciencedirect.com", "peer_reviewed"),
                                 ("ssrn.com", "peer_reviewed_or_preprint"),
                                 ("energytag.org", "advocacy"),
                                 ("ghgprotocol.org", "standard_setter"),
                                 ("tinyurl.com", "shortener")):
            check(f"{domain} classified {expected}",
                  domain in by_domain and by_domain[domain]["class"] == expected,
                  by_domain.get(domain, {}).get("class", "absent"))
        check("n_respondents never exceeds n_answers",
              all(int(r["n_respondents"]) <= int(r["n_answers"]) for r in domains))

        print("\nevidence basis")
        check_equal("Q138 direct empirical analysis",
                    sum(int(r["evidence_empirical"]) for r in flags), 27)
        check_equal("Q138 operational experience",
                    sum(int(r["evidence_operational"]) for r in flags), 83)
        check("general-awareness-only excludes stronger claims",
              all(not (int(r["evidence_general_only"])
                       and (int(r["evidence_empirical"])
                            or int(r["evidence_operational"]))) for r in flags))
        check_equal("Q122 readiness basis answered",
                    sum(1 for r in flags if r["readiness_basis"]), 220)
        check_equal("Q122 pilot/production use",
                    sum(1 for r in flags if r["readiness_basis"] == "pilot_production_use"), 5)

        print("\nprivacy")
        with sqlite3.connect(f"file:{derive_flags.DB_PATH}?mode=ro", uri=True) as con:
            redacted = {int(r[0]) for r in con.execute(
                "SELECT respondent_id FROM respondents WHERE is_redacted+0 = 1")}
        named_in_vectors = " ".join(r["named_members"] for r in vectors)
        check("no redacted placeholder leaks into named_members",
              "Redacted" not in named_in_vectors)
        for row in vectors:
            listed = len([x for x in row["named_members"].split("|") if x])
            members = [int(x) for x in row["member_ids"].split("|")]
            expected_named = sum(1 for i in members if i not in redacted)
            if listed != expected_named:
                check(f"named_members count for {row['cluster_id']}", False,
                      f"listed {listed}, expected {expected_named}")
                break
        else:
            check("named_members lists exactly the non-redacted members", True)

        print("\ndeterminism")
        second = workdir / "run2"
        second.mkdir()
        generate(second)
        for name in OUTPUTS:
            check(f"{name} is byte-identical on rerun",
                  digest(first / name) == digest(second / name))

    finally:
        shutil.rmtree(workdir, ignore_errors=True)

    print()
    if FAILURES:
        print(f"{CHECKS - len(FAILURES)}/{CHECKS} checks passed; failures:")
        for name in FAILURES:
            print(f"  - {name}")
        return 1
    print(f"{CHECKS}/{CHECKS} checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
