#!/usr/bin/env python3
"""Assertions for derive_flags.py. Run with plain ``python3``.

    python3 electricity-consequential/scripts/analytics/test_derive_flags.py

Regenerates the derived tables into a scratch directory, checks that the
findings PLAN.md Sec. 3.5 expects still fall out, and proves the run is
byte-for-byte reproducible. Never writes to ``data/derived/``.
"""

from __future__ import annotations

import csv
import hashlib
import shutil
import sqlite3
import sys
import tempfile
from collections import defaultdict
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
            result["problems"] = derive_flags.verify(con, result)
        finally:
            con.close()
        derive_flags.write_outputs(result)
    finally:
        derive_flags.OUT_DIR = original
    return result


OUTPUTS = ("respondent_flags.csv", "text_clusters.csv", "citations.csv", "domains.csv")


def main() -> int:
    workdir = Path(tempfile.mkdtemp(prefix="ec_derive_flags_test_"))
    try:
        first = workdir / "run1"
        first.mkdir()
        result = generate(first)

        flags = read_rows(first / "respondent_flags.csv")
        clusters = read_rows(first / "text_clusters.csv")
        citations = read_rows(first / "citations.csv")
        domains = read_rows(first / "domains.csv")

        with sqlite3.connect(f"file:{derive_flags.DB_PATH}?mode=ro", uri=True) as con:
            db_ids = {int(r[0]) for r in con.execute(
                "SELECT respondent_id FROM respondents")}
            redacted = {int(r[0]) for r in con.execute(
                "SELECT respondent_id FROM respondents WHERE is_redacted+0 = 1")}
            q52 = con.execute(
                "SELECT COUNT(*) FROM v_free_text WHERE question_number+0 = 52"
            ).fetchone()[0]

        print("\nself-verification")
        check("derive_flags.verify() reports no problems",
              not result["problems"], "; ".join(result["problems"]))

        print("\ncoverage")
        check_equal("all 185 respondents present", len(flags), 185)
        csv_ids = {int(r["respondent_id"]) for r in flags}
        check("respondent ids match the database exactly", csv_ids == db_ids,
              f"missing={sorted(db_ids - csv_ids)[:5]} extra={sorted(csv_ids - db_ids)[:5]}")
        check("respondent_flags is sorted by id",
              [int(r["respondent_id"]) for r in flags] == sorted(csv_ids))
        check_equal("header matches the P10 contract",
                    list(flags[0].keys()), derive_flags.FLAG_HEADER)
        check_equal("Q52 answers (the evidence question)", q52, 36)

        print("\njunk candidates")
        junk = {int(r["respondent_id"]) for r in flags if int(r["is_junk_candidate"])}
        check("PLAN.md's junk set {11, 12, 14} is flagged",
              {11, 12, 14} <= junk, f"got {sorted(junk)}")
        # Deviation, documented in derive_flags' docstring and the P10 report:
        # id 31 (6/6 answers "aaa".."aaaaaa", all nine matrix rows straight-lined
        # "Optional") is a fourth candidate PLAN.md Sec. 3.5 missed. P20
        # adjudicates; this module only nominates.
        check_equal("junk candidates are exactly {11, 12, 14, 31}",
                    junk, {11, 12, 14, 31})
        check("every junk candidate carries evidence",
              all(r["junk_evidence"] for r in flags if int(r["is_junk_candidate"])))
        check("no non-candidate carries evidence",
              all(not r["junk_evidence"]
                  for r in flags if not int(r["is_junk_candidate"])))
        evidence = {int(r["respondent_id"]): r["junk_evidence"].split("|")
                    for r in flags if int(r["is_junk_candidate"])}
        check("evidence is capped at 6 samples",
              all(len(v) <= derive_flags.JUNK_EVIDENCE_MAX for v in evidence.values()))
        check("id 12's evidence is the single letter e",
              set(evidence[12]) == {"e"}, f"{evidence[12]}")
        check("id 14's evidence is the asdf keyboard mash",
              set(evidence[14]) <= {"asdf", "adsf"}, f"{evidence[14]}")
        counts = {i: (n, total) for i, (n, total, _e) in result["junk"].items()}
        for respondent_id, expected in ((11, (12, 15)), (12, (24, 24)), (14, (9, 10))):
            check_equal(f"id {respondent_id} gibberish share (PLAN.md Sec. 3.5)",
                        counts[respondent_id], expected)

        print("\nresubmission")
        check_equal("superseded -> kept is exactly {100 -> 151}",
                    result["superseded"], {100: 151})
        superseded = {int(r["respondent_id"]) for r in flags
                      if int(r["is_resubmission_superseded"])}
        check_equal("only id 100 is flagged superseded", superseded, {100})
        by_id = {int(r["respondent_id"]): r for r in flags}
        check_equal("id 100 points at its survivor", by_id[100]["resubmission_of"], "151")
        check_equal("id 151 points back at id 100", by_id[151]["resubmission_of"], "100")

        print("\nentity families")
        families = defaultdict(set)
        for row in flags:
            if row["entity_family"]:
                families[row["entity_family"]].add(int(row["respondent_id"]))
        check_equal("Engie Impact family is {135, 160}",
                    families.get("engie_impact"), {135, 160})
        check_equal("no other entity family is claimed", set(families), {"engie_impact"})
        check("placeholder organizations form no family",
              not any(key in families for key in ("n_a", "na", "none", "redacted")))

        print("\ntext clusters")
        check("at least 35 text clusters", len(clusters) >= 35, f"got {len(clusters)}")
        check_equal("38 clusters (PLAN.md Sec. 3.5)", len(clusters), 38)
        check("every cluster has >= 2 respondents",
              all(int(r["n_respondents"]) >= derive_flags.MIN_CLUSTER_MEMBERS
                  for r in clusters))
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
        template = {int(r["respondent_id"]) for r in flags
                    if int(r["is_template_respondent"])}
        members = set()
        for row in clusters:
            members |= {int(i) for i in row["member_ids"].split("|")}
        check_equal("template respondents are exactly the cluster members",
                    template, members)
        check_equal("26 template respondents", len(template), 26)
        check("n_shared_texts is 0 exactly for non-template respondents",
              all((int(r["n_shared_texts"]) > 0) == bool(int(r["is_template_respondent"]))
                  for r in flags))

        print("\nblocs")
        blocs = result["blocs"]
        check_equal("policy_insights_pack is {43, 47, 60, 79, 82}",
                    blocs.get("policy_insights_pack", {}).get("members"),
                    {43, 47, 60, 79, 82})
        check_equal("bullet_pack is {51, 86, 89, 117}",
                    blocs.get("bullet_pack", {}).get("members"), {51, 86, 89, 117})
        pair_counts = result["pair_counts"]
        check("every bullet_pack pair shares >= 6 texts (PLAN.md Sec. 3.5)",
              all(pair_counts[(a, b)] >= 6
                  for a in sorted({51, 86, 89, 117})
                  for b in sorted({51, 86, 89, 117}) if a < b),
              f"{ {k: v for k, v in pair_counts.items() if set(k) <= {51, 86, 89, 117}} }")
        # PLAN.md Sec. 3.5 lists {43, 45, 60, 79, 82}; id 45 shares only the
        # 788-char Q18/Q20 passage, id 47 shares that and the 218-char Q23
        # passage. 45 is a peripheral sharer, not a pack member.
        check("id 45 is a template respondent but not a bloc member",
              45 in template and by_id[45]["template_bloc"] == "",
              f"n_shared={by_id[45]['n_shared_texts']} bloc={by_id[45]['template_bloc']!r}")
        check_equal("id 45 shares exactly one cluster",
                    by_id[45]["n_shared_texts"], "1")
        bloc_column = defaultdict(set)
        for row in flags:
            if row["template_bloc"]:
                bloc_column[row["template_bloc"]].add(int(row["respondent_id"]))
        check("template_bloc column agrees with resolved membership",
              all(bloc_column[k] == blocs[k]["members"] for k in blocs),
              f"{dict(bloc_column)}")
        check("every bloc member is a template respondent",
              all(members_ <= template for members_ in bloc_column.values()))

        print("\nstance fingerprints")
        check("every fingerprint is 5 characters",
              all(len(r["stance_fingerprint"]) == 5 for r in flags))
        alphabet = set("YNELU-")
        check("fingerprints use only the documented alphabet",
              all(set(r["stance_fingerprint"]) <= alphabet for r in flags),
              f"{sorted({c for r in flags for c in r['stance_fingerprint']})}")
        check_equal("unanswered respondents get the blank fingerprint",
                    by_id[100]["stance_fingerprint"], "-----")
        # id 151 answered Q19 No, Q21 Yes, Q24 lifetime, Q31 Yes, Q33 Yes.
        check_equal("id 151 fingerprint", by_id[151]["stance_fingerprint"], "NYLYY")
        with sqlite3.connect(f"file:{derive_flags.DB_PATH}?mode=ro", uri=True) as con:
            q19 = {int(r[0]): r[1] for r in con.execute(
                "SELECT respondent_id, answer_text FROM responses "
                "WHERE question_number+0 = 19 AND answer_text <> ''")}
        check_equal("Q19 fingerprint slot matches the database",
                    sum(1 for i, a in q19.items()
                        if by_id[i]["stance_fingerprint"][0] == a[0]), len(q19))
        check_equal("Q19 answered (PLAN.md Sec. 3.2)", len(q19), 133)

        print("\ncitations")
        citing = sum(int(r["has_citation"]) for r in flags)
        check_equal("citing respondents", citing, 49)
        check("has_citation agrees with n_citation_answers",
              all(int(r["has_citation"]) == (int(r["n_citation_answers"]) > 0)
                  for r in flags))
        valid_signals = {name for name, _ in derive_flags.SIGNAL_PATTERNS}
        check("every signal token is from the documented battery",
              all(set(r["signals"].split("|")) <= valid_signals for r in citations))
        check("every citation row has at least one signal",
              all(r["signals"] for r in citations))
        check("citations.csv is sorted by (respondent, question)",
              [(int(r["respondent_id"]), int(r["question_number"])) for r in citations]
              == sorted((int(r["respondent_id"]), int(r["question_number"]))
                        for r in citations))
        cite_ids = {int(r["respondent_id"]) for r in citations}
        check("citation rows cover every flagged citer",
              cite_ids >= {int(r["respondent_id"]) for r in flags
                           if int(r["has_citation"])})
        check("respondents with n_urls > 0 all appear in citations.csv",
              all(int(r["respondent_id"]) in cite_ids
                  for r in flags if int(r["n_urls"]) > 0))

        print("\ndomains")
        check("domains found", len(domains) >= 60, f"got {len(domains)}")
        classes = {r["class"] for r in domains}
        check("classes come from the curated vocabulary",
              classes <= derive_flags.DOMAIN_CLASSES, f"got {sorted(classes)}")
        by_domain = {r["domain"]: r for r in domains}
        for domain, expected in (("marginalimpactmethod.org", "advocacy"),
                                 ("sciencedirect.com", "peer_reviewed"),
                                 ("ssrn.com", "peer_reviewed_or_preprint"),
                                 ("ghgprotocol.org", "standard_setter"),
                                 ("watttime.org", "advocacy"),
                                 ("electricitymaps.com", "data_vendor"),
                                 ("nrel.gov", "government"),
                                 ("meti.go.jp", "government"),
                                 ("harvard.edu", "research"),
                                 ("tinyurl.com", "shortener")):
            check(f"{domain} classified {expected}",
                  domain in by_domain and by_domain[domain]["class"] == expected,
                  by_domain.get(domain, {}).get("class", "absent"))
        check("no truncated-URL fragment is minted as a domain",
              not any(r["domain"].startswith("www.") for r in domains),
              f"{[r['domain'] for r in domains if r['domain'].startswith('www.')]}")
        check("n_respondents never exceeds n_answers",
              all(int(r["n_respondents"]) <= int(r["n_answers"]) for r in domains))
        check("domains are sorted by (-answers, -respondents, name)",
              [(-int(r["n_answers"]), -int(r["n_respondents"]), r["domain"])
               for r in domains]
              == sorted((-int(r["n_answers"]), -int(r["n_respondents"]), r["domain"])
                        for r in domains))

        print("\nprivacy")
        names = {r["name"] for r in read_rows(
            derive_flags.REPO_ROOT / "data" / "respondents.csv")
            if r["name"] and r["name"] != "Redacted"}
        blob = "\n".join(path.read_text(encoding="utf-8")
                         for path in (first / name for name in OUTPUTS))
        leaked = sorted(n for n in names if len(n) > 4 and n in blob)
        check("no respondent name appears in any derived table", not leaked,
              f"{leaked[:5]}")
        check("no redacted respondent carries an entity_family",
              not any(int(r["respondent_id"]) in redacted and r["entity_family"]
                      for r in flags))
        check("the derived tables name no organization column at all",
              all("organization" not in row for row in (flags[0], clusters[0])))

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
