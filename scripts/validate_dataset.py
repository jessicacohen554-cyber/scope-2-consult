#!/usr/bin/env python3
"""Check the built dataset against the raw export and against the counts quoted
in README.md.

The first three checks are the ones that matter for trust: every non-empty source
cell must appear exactly once in responses_long with its value unchanged, and the
multi-select explosion must conserve selections. The rest guard the specific
figures the README cites, so that editing survey_meta.py and rebuilding cannot
silently leave the documentation stale.

Usage:  python3 scripts/validate_dataset.py     (exit 0 = all pass)
"""
from __future__ import annotations

import csv
import re
import sqlite3
import sys
from pathlib import Path

import openpyxl

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_dataset import SHEET, SRC, norm_text  # noqa: E402

csv.field_size_limit(10 ** 7)
ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


def main() -> int:
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    ws = wb[SHEET]
    it = ws.iter_rows(values_only=True)
    header = [norm_text(h) for h in next(it)]
    rows = [[norm_text(v) for v in r] for r in it]
    rows = [r for r in rows if any(r)]
    wb.close()

    qidx = [i for i, h in enumerate(header) if re.match(r"\s*\d{1,3}\s*\.", h)]
    qnum_of = {i: int(re.match(r"\s*(\d{1,3})", header[i]).group(1)) for i in qidx}
    raw_cells = sum(1 for r in rows for i in qidx if r[i])

    with (DATA / "responses_long.csv").open(encoding="utf-8") as f:
        long_rows = list(csv.DictReader(f))
    with (DATA / "response_selections.csv").open(encoding="utf-8") as f:
        sel_rows = list(csv.DictReader(f))

    lookup = {(int(r["respondent_id"]), int(r["question_number"])): r["answer_text"]
              for r in long_rows}
    mismatches = sum(
        1 for r in rows for i in qidx
        if r[i] and lookup.get((int(r[0]), qnum_of[i])) != r[i])
    n_selected = sum(int(r["n_selected"]) for r in long_rows if r["n_selected"])

    con = sqlite3.connect(DATA / "scope2_consultation.sqlite")
    scalar = lambda sql: con.execute(sql).fetchone()[0]  # noqa: E731

    checks = [
        # integrity
        ("round-trip cell count", raw_cells, len(long_rows)),
        ("round-trip value mismatches", 0, mismatches),
        ("selection explosion conserved", n_selected, len(sel_rows)),
        ("sqlite responses match csv", len(long_rows),
         scalar("SELECT COUNT(*) FROM responses")),
        ("sqlite selections match csv", len(sel_rows),
         scalar("SELECT COUNT(*) FROM response_selections")),
        ("no scale answer scored out of 1-5", 0, scalar(
            "SELECT COUNT(*) FROM responses r JOIN questions q USING(question_id) "
            "WHERE q.question_type IN ('likert_1_5','scale_labeled') "
            "AND r.answer_numeric NOT BETWEEN 1 AND 5")),
        ("every question has an anchor or is one", 0, scalar(
            "SELECT COUNT(*) FROM questions WHERE anchor_question IS NULL "
            "AND role NOT IN ('profile','other_specify')")),
        # figures quoted in README.md
        ("respondents", 1072, scalar("SELECT COUNT(*) FROM respondents")),
        ("questions", 180, scalar("SELECT COUNT(*) FROM questions")),
        ("answers", 70089, len(long_rows)),
        ("selections", 52552, len(sel_rows)),
        ("write-in selections", 54,
         sum(1 for r in sel_rows if r["is_canonical"] == "0")),
        ("truncated free-text answers", 8,
         sum(1 for r in long_rows if r["likely_truncated"] == "1")),
        ("lowest response count (Q110)", 75,
         scalar("SELECT MIN(n_answered) FROM questions")),
        ("respondents over 75% complete", 120, scalar(
            "SELECT COUNT(*) FROM respondents WHERE substantive_completion_pct > 75")),
        ("respondents under 10% complete", 43, scalar(
            "SELECT COUNT(*) FROM respondents WHERE substantive_completion_pct < 10")),
        ("redacted respondents", 573, scalar(
            "SELECT COUNT(*) FROM respondents "
            "WHERE redaction_requested = 'Yes' AND name IS NULL")),
        ("Q183 sentinel year 2099", 11, scalar(
            "SELECT COUNT(*) FROM responses "
            "WHERE question_number = 183 AND answer_numeric = 2099")),
        ("views all return rows", 5, sum(
            1 for v in ("v_scale_summary", "v_scale_answers", "v_selections",
                        "v_question_tree", "v_free_text")
            if scalar(f"SELECT COUNT(*) FROM {v}") > 0)),
    ]
    con.close()

    failed = 0
    for name, expected, got in checks:
        good = expected == got
        failed += not good
        print(f"  {'PASS' if good else 'FAIL'}  {name:<38} "
              f"expected={expected!s:<8} got={got}")
    print(f"\n{len(checks) - failed}/{len(checks)} checks passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
