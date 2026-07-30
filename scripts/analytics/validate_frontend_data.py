#!/usr/bin/env python3
"""Validate ``frontend/data/*.json`` against the database and the contract.

Every check re-derives its expectation from ``data/scope2_consultation.sqlite``
(or from ``data/derived/``) rather than trusting the export, so this script
fails when the exporter is wrong, when the exporter's inputs change under it,
or when someone hand-edits the JSON. It prints one line per check and exits
non-zero if any check fails.

Checks (PLAN.md Sec. 5 / prompt P22 Sec. "Validator")
    1  every file parses, keys are sorted, files end with a newline, and the
       bytes are exactly the canonical serialization (proves deterministic
       rebuilds), and no undocumented extra keys (extras need a ``_comment``)
    2  every likert cell: sum(c) == n, ladder width matches meta labels, off
       and mean match the database, and overall n + off == questions.n_answered
    3  segment n's roll up to overall n, allowing for the fewer-than-5 mask,
       and the mask is applied exactly where it is due
    4  the ten hard numbers of the prompt, cross-checked live against the db
    5  reasons/selects/evidence option counts and the is_canonical filter
    6  org_index length == named respondents, every id has an orgs file, no
       redacted respondent is named anywhere
    7  every quote and story text is a verbatim substring of the stored answer
    8  no construct mixing in meta.constructs; questions carry their ladders
    9  clusters/audit agree with data/derived and with the db
    10 file budgets: every file <= 500 KB, every orgs file <= 200 KB

Standard library only. Usage:

    python3 scripts/analytics/validate_frontend_data.py
"""

from __future__ import annotations


def _verbatim_in(text, stored):
    """True if text is a verbatim substring of stored, allowing [\u2026]-marked
    elisions: each segment must appear verbatim, in order."""
    if stored is None:
        return False
    pos = 0
    for seg in (t.strip() for t in text.split("[\u2026]")):
        if not seg:
            continue
        found = stored.find(seg, pos)
        if found < 0:
            return False
        pos = found + len(seg)
    return True

import csv
import json
import sqlite3
import sys
from collections import Counter, defaultdict
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DB_PATH = REPO_ROOT / "data" / "scope2_consultation.sqlite"
DERIVED_DIR = REPO_ROOT / "data" / "derived"
DATA_DIR = REPO_ROOT / "frontend" / "data"
ORGS_DIR = DATA_DIR / "orgs"

FILE_BUDGET = 500 * 1024
ORG_BUDGET = 200 * 1024
MIN_SEGMENT_N = 5
SENTINEL = "<5"
QUOTE_MAX = 600
PREVIEW_MAX = 240
INDEX_NAME_MAX = 80
ANCHORS = (71, 83, 97, 113, 124, 153, 171)
SEGMENT_DIMS = ("audited_class", "country", "org_type", "redaction",
                "responding_as", "sector")

# PLAN Sec. 5 top-level key sets. Extra keys are legal only alongside a
# _comment that documents them (prompt P22, validator check 3).
CONTRACT_KEYS = {
    "meta": {"generated", "totals", "segments", "questions"},
    "reasons": set(),          # keyed by question number
    "selects": set(),          # keyed by question number
    "evidence": {"basis", "citations", "stories"},
    "respondents": {"distributions", "redaction_effect", "org_index"},
    "clusters": {"text_clusters", "vector_clusters", "blocs", "entity_families"},
    "audit": {"vocabulary", "rows", "summary", "provisional"},
}
CELL_KEYS = {"c", "off", "n", "mean"}
ORG_KEYS = {"id", "name", "org_type", "audited_class", "audit_basis", "sector",
            "country", "responding_as", "flags", "answers"}
ORG_ANSWER_KEYS = {"q", "shorthand", "label", "lever", "type", "text",
                   "numeric", "selections"}
ORG_FLAG_KEYS = {"template", "bloc", "entity_group", "cites", "citation_count"}

# The ten hard numbers of prompt P22, asserted as literals *and* recomputed
# from the database.
HARD = {
    "q71_n": 909, "q71_mean": 2.07, "q71_low": 638, "q71_mid": 67,
    "q71_high": 204,
    "q71_named_n": 418, "q71_named_mean": 2.37,
    "q71_redacted_n": 491, "q71_redacted_mean": 1.81,
    "q171_n": 801, "q171_mean": 4.58,
    "q138_empirical": 27,
    "redacted_total": 573,
}


def rel(path: Path) -> str:
    """Repo-relative path for messages, falling back to the absolute path."""
    try:
        return str(path.relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


def r2(value):
    if value is None:
        return None
    return float(Decimal(repr(float(value))).quantize(Decimal("0.01"),
                                                      rounding=ROUND_HALF_UP))


class Report:
    def __init__(self) -> None:
        self.failures: list[str] = []
        self.passed = 0

    def check(self, ok: bool, label: str, detail: str = "") -> bool:
        if ok:
            self.passed += 1
            print(f"  ok   {label}" + (f" — {detail}" if detail else ""))
        else:
            self.failures.append(f"{label}{': ' + detail if detail else ''}")
            print(f"  FAIL {label}" + (f" — {detail}" if detail else ""))
        return ok

    def section(self, title: str) -> None:
        print(f"\n{title}")


def load(name: str):
    return json.loads((DATA_DIR / f"{name}.json").read_text(encoding="utf-8"))


def read_csv(path: Path) -> list[dict]:
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def int_or_zero(value) -> int:
    try:
        return int(str(value).strip() or 0)
    except ValueError:
        return 0


# --- checks -----------------------------------------------------------------


def check_files(report: Report) -> dict:
    report.section("1. files parse, are canonical (sorted keys, trailing "
                   "newline) and declare their extras")
    names = ["meta", "likert", "reasons", "selects", "evidence", "respondents",
             "clusters", "audit", "quotes"]
    docs = {}
    for name in names:
        path = DATA_DIR / f"{name}.json"
        if not report.check(path.exists(), f"{name}.json exists"):
            continue
        raw = path.read_bytes()
        try:
            obj = json.loads(raw.decode("utf-8"))
        except ValueError as error:
            report.check(False, f"{name}.json parses", str(error))
            continue
        docs[name] = obj
        canonical = (json.dumps(obj, sort_keys=True, ensure_ascii=False,
                                separators=(",", ":")) + "\n").encode("utf-8")
        report.check(raw == canonical, f"{name}.json is canonical bytes",
                     "sorted keys, compact separators, trailing newline")
        if name in CONTRACT_KEYS and CONTRACT_KEYS[name]:
            extras = set(obj) - CONTRACT_KEYS[name] - {"_comment"}
            report.check(not extras or "_comment" in obj,
                         f"{name}.json extras are documented",
                         f"extra keys {sorted(extras)}" if extras else "none")
    for name in ("likert", "reasons", "selects"):
        if name not in docs:
            continue
        bad = [key for key in docs[name]
               if not key.startswith("_") and not key.isdigit()]
        report.check(not bad, f"{name}.json is keyed by question number",
                     f"stray keys {bad[:4]}" if bad else
                     f"{sum(1 for key in docs[name] if key.isdigit())} questions")
    for name in ("reasons", "selects"):
        if name not in docs:
            continue
        bad = []
        for key, entry in docs[name].items():
            if key.startswith("_"):
                continue
            expected = ({"anchor", "lever", "side", "n_answered", "years",
                         "protest_gt_2050"} if key == "183" else
                        {"anchor", "lever", "side", "n_answered", "options"})
            if set(entry) != expected:
                bad.append(f"{key} keys {sorted(set(entry) ^ expected)}")
                continue
            for option in entry.get("options", []):
                if set(option) != {"text", "n", "pct", "by"}:
                    bad.append(f"{key} option keys {sorted(option)}")
                    break
                if set(option["by"]) != {"org_type", "redaction"}:
                    bad.append(f"{key} by-dims {sorted(option['by'])}")
                    break
        report.check(not bad, f"{name}.json entries have the contracted keys",
                     "; ".join(bad[:3]))
    if not report.check(ORGS_DIR.is_dir(), "orgs/ exists"):
        return docs
    return docs


def check_likert(report: Report, con, docs) -> None:
    report.section("2. likert cells: sum(c) == n, ladder width, off and mean "
                   "recomputed from the database")
    meta, likert = docs["meta"], docs["likert"]
    questions = {entry["q"]: entry for entry in meta["questions"]}
    rows = sorted(int(key) for key in likert)
    expected_rows = [row[0] for row in con.execute(
        "SELECT question_number FROM questions WHERE method = 'mbm' AND "
        "question_type IN ('likert_1_5','scale_labeled','ordinal_select') "
        "ORDER BY question_number")]
    report.check(rows == expected_rows,
                 "likert.json holds exactly the 22 MBM scale/ordinal rows",
                 f"{len(rows)} rows")

    ladders = {}
    for number in rows:
        ranks = [row[0] for row in con.execute(
            "SELECT option_rank FROM question_options WHERE question_number = ? "
            "AND is_canonical + 0 = 1 AND is_off_scale + 0 = 0 AND "
            "option_rank IS NOT NULL ORDER BY option_rank", (number,))]
        ladders[number] = ranks

    bad_sum, bad_width, bad_mean, bad_off, bad_keys, bad_base = [], [], [], [], [], []
    for number in rows:
        width = len(ladders[number])
        labels = questions[number]["labels"]
        if labels is None or len(labels) != width:
            bad_width.append(f"Q{number} meta labels")
        expected = {}
        for row in con.execute(
            "SELECT answer_numeric, COUNT(*) FROM responses "
            "WHERE question_number = ? GROUP BY answer_numeric", (number,)
        ):
            expected[row[0]] = row[1]
        counts = [expected.get(float(rank), 0) for rank in ladders[number]]
        off = expected.get(None, 0)
        total = sum(counts)
        mean = r2(sum(rank * count for rank, count
                      in zip(ladders[number], counts)) / total) if total else None
        cells = [("overall", "overall", likert[str(number)]["overall"])]
        for dim in SEGMENT_DIMS:
            for key, cell in likert[str(number)][dim].items():
                cells.append((dim, key, cell))
        for dim, key, cell in cells:
            if cell.get("n") == SENTINEL:
                if set(cell) != {"n"}:
                    bad_keys.append(f"Q{number} {dim}/{key} sentinel keys")
                continue
            if set(cell) != CELL_KEYS:
                bad_keys.append(f"Q{number} {dim}/{key} keys {sorted(cell)}")
                continue
            if sum(cell["c"]) != cell["n"]:
                bad_sum.append(f"Q{number} {dim}/{key}")
            if len(cell["c"]) != width:
                bad_width.append(f"Q{number} {dim}/{key} width {len(cell['c'])}")
        overall = likert[str(number)]["overall"]
        if overall["c"] != counts:
            bad_sum.append(f"Q{number} overall c {overall['c']} != {counts}")
        if overall["off"] != off:
            bad_off.append(f"Q{number} off {overall['off']} != {off}")
        if overall["mean"] != mean:
            bad_mean.append(f"Q{number} mean {overall['mean']} != {mean}")
        n_answered = con.execute(
            "SELECT n_answered + 0 FROM questions WHERE question_number = ?",
            (number,)).fetchone()[0]
        if overall["n"] + overall["off"] != n_answered:
            bad_base.append(f"Q{number} {overall['n']}+{overall['off']} "
                            f"!= {n_answered}")
    report.check(not bad_sum, "every cell sums to its n", "; ".join(bad_sum[:4]))
    report.check(not bad_width, "every c array has ladder width",
                 "; ".join(bad_width[:4]))
    report.check(not bad_keys, "cell keys are exactly c/off/n/mean (or the "
                               "sentinel)", "; ".join(bad_keys[:4]))
    report.check(not bad_off, "off-scale counts match the database",
                 "; ".join(bad_off[:4]))
    report.check(not bad_mean, "means match the database (2dp, half-up)",
                 "; ".join(bad_mean[:4]))
    report.check(not bad_base, "overall n + off == questions.n_answered",
                 "; ".join(bad_base[:4]))


def segment_of(con) -> tuple[dict, dict, list]:
    """respondent_id -> segment key per dimension, rebuilt from the database.

    The export slugs its segment keys, so the slug spelling is recovered
    positionally from ``meta.segments``; the *membership* rule is re-derived
    here from the database exactly as the contract states it (all 15 org types;
    sector = top 12 by n then the tail grouped; country = top 10 then the tail
    grouped; ties broken by value ascending). If the exporter grouped a
    different set, the per-cell comparisons in check_rollup fail.
    """
    meta = load("meta")
    people = {row["respondent_id"]: row for row in con.execute(
        "SELECT respondent_id, organization_type, sector, country, responding_as, "
        "is_redacted + 0 AS is_redacted FROM respondents")}
    sizes = {dim: {value["key"]: value["n"]
                   for value in meta["segments"][dim]["values"]}
             for dim in SEGMENT_DIMS}
    audit = load("audit")
    audit_class = {row["id"]: row["audited"] for row in audit["rows"]}

    of: dict[str, dict[int, str]] = {dim: {} for dim in SEGMENT_DIMS}
    for pid, row in people.items():
        of["redaction"][pid] = "redacted" if row["is_redacted"] else "named"
        of["responding_as"][pid] = row["responding_as"].lower()

    problems = []
    for dim, column, top_n in (("org_type", "organization_type", None),
                               ("sector", "sector", 12),
                               ("country", "country", 10)):
        counts = Counter(row[column] for row in people.values())
        ordered = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
        keys = [value["key"] for value in meta["segments"][dim]["values"]]
        head = ordered if top_n is None else ordered[:top_n]
        tail = [] if top_n is None else ordered[top_n:]
        if len(keys) != len(head) + (1 if tail else 0):
            problems.append(f"{dim}: meta has {len(keys)} values, the "
                            f"top-{top_n} rule gives {len(head) + bool(tail)}")
            continue
        resolved = {value: keys[index] for index, (value, _n)
                    in enumerate(head)}
        for value, _n in tail:
            resolved[value] = keys[-1]
        for pid, row in people.items():
            of[dim][pid] = resolved[row[column]]
        rebuilt = Counter(of[dim].values())
        if rebuilt != sizes[dim]:
            problems.append(f"{dim}: meta sizes {sizes[dim]} != recomputed "
                            f"{dict(rebuilt)}")

    # audited_class: audited where P20 audited them, and for redacted
    # respondents whatever the export declares it does - the claimed class while
    # the audit is provisional, "unverifiable" once org_audit.csv lands.
    for pid in people:
        if pid in audit_class:
            of["audited_class"][pid] = audit_class[pid]
        elif audit["provisional"]:
            of["audited_class"][pid] = of["org_type"][pid]
        else:
            of["audited_class"][pid] = "unverifiable"
    rebuilt = Counter(of["audited_class"].values())
    if rebuilt != sizes["audited_class"]:
        problems.append(f"audited_class: meta sizes {sizes['audited_class']} "
                        f"!= recomputed {dict(rebuilt)}")
    return of, sizes, problems


def check_rollup(report: Report, con, docs) -> None:
    report.section("3. segment n's roll up to overall n and the fewer-than-5 "
                   "mask lands exactly where it is due")
    of, sizes, problems = segment_of(con)
    report.check(not problems,
                 "segment membership re-derived from the db reproduces "
                 "meta.segments (top-12 sector / top-10 country groupings)",
                 "; ".join(problems[:2]))
    likert = docs["likert"]
    scored = {}
    for number in (int(key) for key in likert):
        scored[number] = [row[0] for row in con.execute(
            "SELECT respondent_id FROM responses WHERE question_number = ? AND "
            "answer_numeric IS NOT NULL", (number,))]

    bad_roll, bad_mask, bad_vocab = [], [], []
    for dim in SEGMENT_DIMS:
        keys_in_meta = {value["key"] for value in
                        docs["meta"]["segments"][dim]["values"]}
        for number, ids in scored.items():
            cells = likert[str(number)][dim]
            if set(cells) != keys_in_meta:
                bad_vocab.append(f"Q{number} {dim} keys differ from meta")
                continue
            observed = Counter(of[dim][pid] for pid in ids if pid in of[dim])
            total = 0
            for key, cell in cells.items():
                masked = cell.get("n") == SENTINEL
                should_mask = sizes[dim][key] < MIN_SEGMENT_N
                if masked != should_mask:
                    bad_mask.append(f"Q{number} {dim}/{key} masked={masked} "
                                    f"segment n={sizes[dim][key]}")
                    continue
                if masked:
                    total += observed.get(key, 0)
                else:
                    if cell["n"] != observed.get(key, 0):
                        bad_roll.append(f"Q{number} {dim}/{key} {cell['n']} != "
                                        f"{observed.get(key, 0)}")
                    total += cell["n"]
            if total != likert[str(number)]["overall"]["n"]:
                bad_roll.append(f"Q{number} {dim} rolls up to {total} != "
                                f"{likert[str(number)]['overall']['n']}")
    report.check(not bad_vocab, "every dimension uses meta's closed vocabulary",
                 "; ".join(bad_vocab[:4]))
    report.check(not bad_roll, "segment cells match the db and sum to overall",
                 "; ".join(bad_roll[:4]))
    report.check(not bad_mask,
                 f"the {SENTINEL} sentinel appears for exactly the segment "
                 f"values with fewer than {MIN_SEGMENT_N} respondents",
                 "; ".join(bad_mask[:4]))

    masked = sorted({f"{dim}/{key}" for dim in SEGMENT_DIMS
                     for key, n in sizes[dim].items() if n < MIN_SEGMENT_N})
    report.check(bool(masked), "at least one segment value is masked",
                 ", ".join(masked))

    bad_by = []
    for name in ("reasons", "selects"):
        for key, entry in docs[name].items():
            if key.startswith("_"):
                continue
            for option in entry.get("options", []):
                for dim, counts in option["by"].items():
                    for seg_key, value in counts.items():
                        should_mask = sizes[dim][seg_key] < MIN_SEGMENT_N
                        if (value == SENTINEL) != should_mask:
                            bad_by.append(f"{name}[{key}] {dim}/{seg_key}")
    report.check(not bad_by, "reasons/selects by-maps carry the same mask",
                 "; ".join(bad_by[:4]))


def check_hard_numbers(report: Report, con, docs) -> None:
    report.section("4. the ten hard numbers, cross-checked live against the db")
    likert, respondents, evidence = (docs["likert"], docs["respondents"],
                                     docs["evidence"])

    row = con.execute(
        "SELECT COUNT(*), AVG(answer_numeric + 0.0), "
        "SUM(answer_numeric + 0 <= 2), SUM(answer_numeric + 0 = 3), "
        "SUM(answer_numeric + 0 >= 4) FROM responses "
        "WHERE question_number = 71 AND answer_numeric IS NOT NULL").fetchone()
    db_n, db_mean, db_low, db_mid, db_high = row[0], r2(row[1]), row[2], row[3], row[4]
    cell = likert["71"]["overall"]
    report.check((db_n, db_mean, db_low, db_mid, db_high) ==
                 (HARD["q71_n"], HARD["q71_mean"], HARD["q71_low"],
                  HARD["q71_mid"], HARD["q71_high"]),
                 "db agrees with the prompt on Q71",
                 f"n={db_n} mean={db_mean} {db_low}/{db_mid}/{db_high}")
    report.check([cell["n"], cell["mean"], cell["c"][0] + cell["c"][1],
                  cell["c"][2], cell["c"][3] + cell["c"][4]] ==
                 [db_n, db_mean, db_low, db_mid, db_high],
                 "likert.json Q71 overall == 909 / 2.07 / 638-67-204",
                 f"n={cell['n']} mean={cell['mean']} "
                 f"{cell['c'][0] + cell['c'][1]}/{cell['c'][2]}/"
                 f"{cell['c'][3] + cell['c'][4]}")

    split = {("redacted" if row[0] else "named"): (row[1], r2(row[2]))
             for row in con.execute(
                 "SELECT p.is_redacted + 0, COUNT(*), AVG(r.answer_numeric + 0.0) "
                 "FROM responses r JOIN respondents p USING(respondent_id) "
                 "WHERE r.question_number = 71 AND r.answer_numeric IS NOT NULL "
                 "GROUP BY 1")}
    report.check(split["named"] == (HARD["q71_named_n"], HARD["q71_named_mean"])
                 and split["redacted"] == (HARD["q71_redacted_n"],
                                           HARD["q71_redacted_mean"]),
                 "db agrees with the prompt on the Q71 redaction split",
                 f"named {split['named']} redacted {split['redacted']}")
    named, redacted = likert["71"]["redaction"]["named"], likert["71"]["redaction"]["redacted"]
    effect = [row for row in respondents["redaction_effect"] if row["q"] == 71][0]
    report.check((named["n"], named["mean"]) == split["named"]
                 and (redacted["n"], redacted["mean"]) == split["redacted"]
                 and (effect["n_named"], effect["mean_named"]) == split["named"]
                 and (effect["n_redacted"], effect["mean_redacted"]) ==
                 split["redacted"],
                 "Q71 split matches in likert.json and respondents.json",
                 "418/2.37 named vs 491/1.81 redacted")

    row = con.execute(
        "SELECT COUNT(*), AVG(answer_numeric + 0.0) FROM responses "
        "WHERE question_number = 171 AND answer_numeric IS NOT NULL").fetchone()
    q171 = likert["171"]["overall"]
    report.check((row[0], r2(row[1])) == (HARD["q171_n"], HARD["q171_mean"])
                 and (q171["n"], q171["mean"]) == (row[0], r2(row[1])),
                 "Q171 == 801 / 4.58", f"n={q171['n']} mean={q171['mean']}")

    db_empirical = con.execute(
        "SELECT COUNT(DISTINCT respondent_id) FROM response_selections "
        "WHERE question_number = 138 AND is_canonical + 0 = 1 AND "
        "option_text LIKE 'Direct empirical analysis%'").fetchone()[0]
    exported = [option for option in evidence["basis"]["q138"]["options"]
                if option["text"].startswith("Direct empirical analysis")]
    report.check(db_empirical == HARD["q138_empirical"] and len(exported) == 1
                 and exported[0]["n"] == db_empirical,
                 "Q138 direct-empirical count == 27",
                 f"db={db_empirical} exported={exported[0]['n'] if exported else None}")
    flags = read_csv(DERIVED_DIR / "respondent_flags.csv")
    derived_empirical = sum(1 for row in flags
                            if int_or_zero(row["evidence_empirical"]))
    report.check(derived_empirical == HARD["q138_empirical"],
                 "P10 evidence_empirical agrees", f"{derived_empirical}")

    db_redacted = con.execute(
        "SELECT SUM(is_redacted + 0), COUNT(*) FROM respondents").fetchone()
    totals = docs["meta"]["totals"]
    report.check(db_redacted[0] == HARD["redacted_total"]
                 and totals["redacted"] == HARD["redacted_total"]
                 and totals["named"] == db_redacted[1] - HARD["redacted_total"]
                 and totals["respondents"] == db_redacted[1],
                 "redacted total == 573",
                 f"{totals['redacted']} redacted / {totals['named']} named of "
                 f"{totals['respondents']}")
    db_answers = con.execute("SELECT COUNT(*) FROM responses").fetchone()[0]
    db_questions = con.execute("SELECT COUNT(*) FROM questions").fetchone()[0]
    report.check(totals["answers"] == db_answers
                 and totals["questions"] == db_questions,
                 "meta totals answers/questions match the db",
                 f"{db_answers} answers, {db_questions} questions")


def check_orgs(report: Report, con, docs) -> None:
    report.section("5. org_index, org files and the no-name rule for redacted "
                   "respondents")
    org_index = docs["respondents"]["org_index"]
    db_named = [row[0] for row in con.execute(
        "SELECT respondent_id FROM respondents WHERE is_redacted + 0 = 0 "
        "ORDER BY respondent_id")]
    db_redacted = {row[0] for row in con.execute(
        "SELECT respondent_id FROM respondents WHERE is_redacted + 0 = 1")}
    report.check(len(org_index) == len(db_named),
                 "org_index length == named respondents",
                 f"{len(org_index)} == {len(db_named)}")
    ids = [row["id"] for row in org_index]
    report.check(ids == db_named, "org_index ids are exactly the named ones")
    report.check(all(len(row["name"]) <= INDEX_NAME_MAX for row in org_index),
                 f"org_index names are <= {INDEX_NAME_MAX} chars",
                 f"longest {max(len(row['name']) for row in org_index)}")

    files = {int(path.stem) for path in ORGS_DIR.glob("*.json")}
    report.check(files == set(ids),
                 "every org_index id has an orgs/{id}.json and no extras",
                 f"{len(files)} files")

    anchor_vector = {int(row["respondent_id"]): row["mbm_anchor_vector"]
                     for row in read_csv(DERIVED_DIR / "respondent_flags.csv")}
    bad_anchors = []
    for row in org_index:
        expected = "".join("-" if score is None else str(score)
                           for score in row["anchors"])
        if expected != (anchor_vector[row["id"]] or ""):
            bad_anchors.append(f"{row['id']}: {expected} != "
                               f"{anchor_vector[row['id']]}")
    report.check(not bad_anchors,
                 "org_index anchors match P10's mbm_anchor_vector",
                 "; ".join(bad_anchors[:3]))

    bad_shape, bad_answers = [], []
    profile_roles = {row[0] for row in con.execute(
        "SELECT question_number FROM questions WHERE role = 'profile'")}
    biggest = (0, None)
    for pid in sorted(files):
        path = ORGS_DIR / f"{pid}.json"
        size = path.stat().st_size
        biggest = max(biggest, (size, pid))
        org = json.loads(path.read_text(encoding="utf-8"))
        if set(org) != ORG_KEYS or set(org["flags"]) != ORG_FLAG_KEYS:
            bad_shape.append(f"{pid} keys")
            continue
        expected = [row[0] for row in con.execute(
            "SELECT r.question_number FROM responses r JOIN questions q "
            "USING(question_id) WHERE r.respondent_id = ? AND q.method IN "
            "('mbm','general') AND (q.role <> 'profile' OR "
            "r.question_number IN (15, 17)) ORDER BY r.question_number", (pid,))]
        got = [answer["q"] for answer in org["answers"]]
        if got != expected:
            bad_answers.append(f"{pid}: {len(got)} answers, expected "
                               f"{len(expected)}")
        for answer in org["answers"]:
            if set(answer) != ORG_ANSWER_KEYS:
                bad_shape.append(f"{pid} answer {answer['q']} keys")
                break
            if answer["q"] in profile_roles and answer["q"] not in (15, 17):
                bad_shape.append(f"{pid} carries profile question "
                                 f"{answer['q']}")
                break
    report.check(not bad_shape, "org files have exactly the contracted keys and "
                                "no identity questions", "; ".join(bad_shape[:3]))
    report.check(not bad_answers, "org answers are the MBM + general answers in "
                                  "survey order", "; ".join(bad_answers[:3]))
    report.check(biggest[0] <= ORG_BUDGET,
                 f"every orgs/*.json is <= {ORG_BUDGET // 1024} KB",
                 f"largest {biggest[0] / 1024:.1f} KB (orgs/{biggest[1]}.json)")

    names = {row[0]: row[1] for row in con.execute(
        "SELECT respondent_id, organization FROM respondents")}
    leaks = []
    clusters = docs["clusters"]
    for cluster in clusters["text_clusters"]:
        for member in cluster["named_members"]:
            if member["id"] in db_redacted:
                leaks.append(f"text cluster {cluster['hash'][:8]} names "
                             f"redacted {member['id']}")
    for cluster in clusters["vector_clusters"]:
        for pid in cluster["ids_named"]:
            if pid in db_redacted:
                leaks.append(f"vector cluster {cluster['cluster_id']} names "
                             f"redacted {pid}")
    for bloc in clusters["blocs"]:
        for member in bloc["members_named"]:
            if member["id"] in db_redacted:
                leaks.append(f"bloc {bloc['key']} names redacted {member['id']}")
    for family in clusters["entity_families"]:
        for pid in family["ids"]:
            if pid in db_redacted:
                leaks.append(f"family {family['name']} lists redacted {pid}")
    for row in docs["audit"]["rows"]:
        if row["id"] in db_redacted:
            leaks.append(f"audit row names redacted {row['id']}")
    for row in org_index:
        if row["id"] in db_redacted:
            leaks.append(f"org_index lists redacted {row['id']}")
    report.check(not leaks, "no redacted respondent is named anywhere",
                 "; ".join(leaks[:3]))
    report.check(not any(names[pid] == "Redacted" for pid in files),
                 "no orgs file belongs to a redacted respondent")


def check_picklists(report: Report, con, docs) -> None:
    report.section("6. reasons/selects/evidence picklists and the is_canonical "
                   "filter")
    bad_counts, bad_meta, bad_canonical = [], [], []
    meta_levers = {entry["q"]: entry for entry in docs["meta"]["questions"]}
    for name in ("reasons", "selects"):
        for key, entry in docs[name].items():
            if key.startswith("_"):
                continue
            number = int(key)
            if number not in meta_levers:
                bad_meta.append(f"{name}[{key}] missing from meta.questions")
            db_row = con.execute(
                "SELECT policy_lever, anchor_question, n_answered + 0, "
                "question_type, asks_for FROM questions WHERE "
                "question_number = ?", (number,)).fetchone()
            if (entry["lever"], entry["anchor"], entry["n_answered"]) != \
                    (db_row[0], db_row[1], db_row[2]):
                bad_meta.append(f"{name}[{key}] lever/anchor/n_answered")
            if number == 183:
                continue
            expected = {}
            if db_row[3] == "multi_select":
                for row in con.execute(
                    "SELECT option_text, COUNT(DISTINCT respondent_id) FROM "
                    "response_selections WHERE question_number = ? AND "
                    "is_canonical + 0 = 1 GROUP BY option_text", (number,)):
                    expected[row[0]] = row[1]
            else:
                canonical = {row[0] for row in con.execute(
                    "SELECT option_text FROM question_options WHERE "
                    "question_number = ? AND is_canonical + 0 = 1", (number,))}
                for row in con.execute(
                    "SELECT answer_text, COUNT(DISTINCT respondent_id) FROM "
                    "responses WHERE question_number = ? AND answer_text IS NOT "
                    "NULL GROUP BY answer_text", (number,)):
                    if row[0] in canonical:
                        expected[row[0]] = row[1]
            got = {option["text"]: option["n"] for option in entry["options"]}
            if got != expected:
                bad_counts.append(f"{name}[{key}] option counts")
            non_canonical = {row[0] for row in con.execute(
                "SELECT option_text FROM question_options WHERE "
                "question_number = ? AND is_canonical + 0 = 0", (number,))}
            if non_canonical & set(got):
                bad_canonical.append(f"{name}[{key}] carries write-ins")
            order = [(-option["n"], option["text"]) for option in entry["options"]]
            if order != sorted(order):
                bad_counts.append(f"{name}[{key}] options not sorted by n")
    report.check(not bad_meta, "every picklist question is in meta with the db's "
                               "lever/anchor/base", "; ".join(bad_meta[:3]))
    report.check(not bad_counts, "picklist option counts match the db and are "
                                 "sorted", "; ".join(bad_counts[:3]))
    report.check(not bad_canonical,
                 "no write-in option leaks into a picklist (Q140/Q174 included)",
                 "; ".join(bad_canonical[:3]))

    for number in (140, 174):
        entry = (docs["selects"].get(str(number))
                 or docs["reasons"].get(str(number)))
        if entry is None:
            report.check(False, f"Q{number} is exported")
            continue
        write_ins = {row[0] for row in con.execute(
            "SELECT option_text FROM question_options WHERE question_number = ? "
            "AND is_canonical + 0 = 0", (number,))}
        texts = {option["text"] for option in entry["options"]}
        report.check(bool(write_ins) and not (write_ins & texts),
                     f"Q{number} excludes its {len(write_ins)} write-in options")

    years = docs["selects"]["183"]
    db_years = Counter()
    for row in con.execute("SELECT answer_numeric FROM responses WHERE "
                           "question_number = 183 AND answer_numeric IS NOT NULL"):
        db_years[str(int(row[0]))] += 1
    report.check(years["years"] == dict(db_years)
                 and years["protest_gt_2050"] == sum(
                     count for year, count in db_years.items() if int(year) > 2050),
                 "Q183 years and protest count match the db",
                 f"{sum(db_years.values())} answers, "
                 f"{years['protest_gt_2050']} above 2050")

    evidence = docs["evidence"]
    bad_basis = []
    for key, number in (("q138", 138), ("q122", 122), ("q56", 56)):
        panel = evidence["basis"][key]
        if panel["q"] != number:
            bad_basis.append(f"{key} q")
        db_n = con.execute("SELECT n_answered + 0 FROM questions WHERE "
                           "question_number = ?", (number,)).fetchone()[0]
        if panel["n_answered"] != db_n:
            bad_basis.append(f"{key} n_answered")
        for option in panel["options"]:
            if option["pct"] != r2(100.0 * option["n"] / db_n):
                bad_basis.append(f"{key} pct for {option['text'][:20]}")
    report.check(not bad_basis, "evidence basis panels match the db",
                 "; ".join(bad_basis[:3]))


def check_quotes(report: Report, con, docs) -> None:
    report.section("7. every quote and story text is verbatim in the database")
    answer = {}

    def stored(pid: int, number: int):
        if (pid, number) not in answer:
            row = con.execute("SELECT answer_text FROM responses WHERE "
                              "respondent_id = ? AND question_number = ?",
                              (pid, number)).fetchone()
            answer[(pid, number)] = row[0] if row else None
        return answer[(pid, number)]

    bad, checked = [], 0
    quotes = docs["quotes"]
    for lever, sides in quotes.items():
        if lever.startswith("_"):
            continue
        for side in ("for", "against"):
            for quote in sides.get(side, []):
                checked += 1
                text = stored(quote["respondent_id"], quote["q"])
                if not _verbatim_in(quote["text"], text):
                    bad.append(f"{lever}/{side} respondent "
                               f"{quote['respondent_id']} Q{quote['q']}")
                if len(quote["text"]) > QUOTE_MAX:
                    bad.append(f"{lever}/{side} quote is "
                               f"{len(quote['text'])} chars")
    report.check(not bad, "curated quotes are verbatim and within the length cap",
                 f"{checked} quotes checked" if checked else
                 "quotes.json is empty (P21 not merged yet)")

    bad_stories = []
    for story in docs["evidence"]["stories"]:
        text = stored(story["respondent_id"], story["q"])
        if not text or story["quote"] not in text:
            bad_stories.append(f"{story['key']} (respondent "
                               f"{story['respondent_id']} Q{story['q']})")
        if len(story["quote"]) > QUOTE_MAX:
            bad_stories.append(f"{story['key']} is {len(story['quote'])} chars")
        if story.get("verified") is not True:
            bad_stories.append(f"{story['key']} is not marked verified")
    report.check(not bad_stories and bool(docs["evidence"]["stories"]),
                 "evidence stories are verbatim, verified and within the cap",
                 f"{len(docs['evidence']['stories'])} stories")

    previews = [cluster["preview"] for cluster in docs["clusters"]["text_clusters"]]
    report.check(all(len(preview) <= PREVIEW_MAX for preview in previews),
                 f"cluster previews are <= {PREVIEW_MAX} chars",
                 f"longest {max(len(preview) for preview in previews)}")


def check_meta(report: Report, con, docs) -> None:
    report.section("8. meta: no construct mixing, ladders present, pages and "
                   "segment vocabularies")
    meta = docs["meta"]
    questions = {entry["q"]: entry for entry in meta["questions"]}
    mixed = []
    for group in meta["constructs"]:
        constructs = {questions[number]["construct"] for number in
                      group["questions"]}
        if constructs != {group["key"]}:
            mixed.append(f"group {group['key']} holds {sorted(constructs)}")
    report.check(not mixed, "no heatmap group mixes scale constructs",
                 f"{len(meta['constructs'])} groups: " +
                 ", ".join(f"{group['key']}×{len(group['questions'])}"
                           for group in meta["constructs"]))
    grouped = [number for group in meta["constructs"]
               for number in group["questions"]]
    report.check(sorted(grouped) == sorted(int(key) for key in docs["likert"])
                 and len(grouped) == len(set(grouped)),
                 "every likert row sits in exactly one construct group",
                 f"{len(grouped)} rows")
    support = {number for group in meta["constructs"] if group["key"] == "support"
               for number in group["questions"]}
    burden = {number for group in meta["constructs"]
              if group["key"] in ("burden_relative", "cost_relative")
              for number in group["questions"]}
    report.check(not (support & burden) and support == set(ANCHORS),
                 "support anchors and burden/cost rows stay disjoint",
                 f"support {sorted(support)}")

    bad_db, bad_ladder = [], []
    for number, entry in questions.items():
        row = con.execute(
            "SELECT question_id, shorthand, label, scale_construct, "
            "scale_anchor_low, scale_anchor_high, scale_note, policy_lever, "
            "question_type, n_answered + 0 FROM questions WHERE "
            "question_number = ?", (number,)).fetchone()
        if row is None:
            bad_db.append(f"Q{number} not in the db")
            continue
        if [entry["id"], entry["shorthand"], entry["label"], entry["construct"],
                entry["anchor_low"], entry["anchor_high"], entry["scale_note"],
                entry["lever"], entry["type"], entry["n_answered"]] != list(row):
            bad_db.append(f"Q{number} codebook fields")
        if entry["type"] in ("likert_1_5", "scale_labeled", "ordinal_select"):
            db_labels = [r[0] for r in con.execute(
                "SELECT option_text FROM question_options WHERE "
                "question_number = ? AND is_canonical + 0 = 1 AND "
                "is_off_scale + 0 = 0 AND option_rank IS NOT NULL "
                "ORDER BY option_rank", (number,))]
            if entry["labels"] != db_labels:
                bad_ladder.append(f"Q{number} labels")
            db_off = [r[0] for r in con.execute(
                "SELECT option_text FROM question_options WHERE "
                "question_number = ? AND is_canonical + 0 = 1 AND "
                "(is_off_scale + 0 = 1 OR option_rank IS NULL) "
                "ORDER BY option_rank, option_text", (number,))]
            if sorted(entry["off_labels"]) != sorted(db_off):
                bad_ladder.append(f"Q{number} off_labels")
    report.check(not bad_db, "meta.questions repeats the db codebook exactly",
                 "; ".join(bad_db[:3]))
    report.check(not bad_ladder, "ordinal/labeled ladders and off-scale labels "
                                 "come from question_options",
                 "; ".join(bad_ladder[:3]))

    report.check(set(meta["segments"]) == set(SEGMENT_DIMS),
                 "meta.segments has the six contracted dimensions",
                 ", ".join(sorted(meta["segments"])))
    counts = {dim: {value["key"]: value["n"]
                    for value in meta["segments"][dim]["values"]}
              for dim in SEGMENT_DIMS}
    short = [dim for dim, values in counts.items()
             if sum(values.values()) != meta["totals"]["respondents"]]
    report.check(not short,
                 f"every dimension's sizes sum to "
                 f"{meta['totals']['respondents']} respondents",
                 f"off: {short}" if short else "all six dimensions")
    report.check(len(counts["sector"]) == 13
                 and "sector_other_grouped" in counts["sector"],
                 "sector is top 12 + sector_other_grouped",
                 f"{len(counts['sector'])} values")
    report.check(len(counts["country"]) == 11
                 and "country_other" in counts["country"],
                 "country is top 10 + country_other",
                 f"{len(counts['country'])} values")
    db_org_types = con.execute(
        "SELECT COUNT(DISTINCT organization_type) FROM respondents").fetchone()[0]
    report.check(len(counts["org_type"]) == db_org_types == 15,
                 "org_type carries all 15 slugged values")
    unpaged = [entry["q"] for entry in meta["questions"] if entry["page"] is None]
    unpaged_mbm = [number for number in unpaged if con.execute(
        "SELECT method FROM questions WHERE question_number = ?",
        (number,)).fetchone()[0] == "mbm"]
    pages = {entry["page"] for entry in meta["questions"]} - {None}
    report.check(not unpaged_mbm and len(pages) >= 9,
                 "every MBM question maps to one of the 9 proposal pages",
                 f"{len(pages)} pages; unpaged (non-MBM): "
                 f"{unpaged or 'none'}")


def check_derived(report: Report, docs) -> None:
    report.section("9. clusters and audit agree with data/derived and the db")
    clusters = docs["clusters"]
    text_rows = read_csv(DERIVED_DIR / "text_clusters.csv")
    report.check(len(clusters["text_clusters"]) == len(text_rows),
                 "text_clusters count matches data/derived",
                 f"{len(text_rows)} clusters")
    by_hash = {row["cluster_hash"]: row for row in text_rows}
    bad = []
    for cluster in clusters["text_clusters"]:
        row = by_hash.get(cluster["hash"])
        if row is None:
            bad.append(f"{cluster['hash'][:8]} unknown")
            continue
        if (cluster["n_respondents"] != int(row["n_respondents"])
                or cluster["n_redacted"] != int(row["n_redacted"])
                or len(cluster["named_members"]) != int(row["n_named"])
                or cluster["chars"] != int(row["chars"])):
            bad.append(f"{cluster['hash'][:8]} counts")
    report.check(not bad, "each text cluster's named/redacted split matches P10",
                 "; ".join(bad[:3]))

    vector_rows = read_csv(DERIVED_DIR / "vector_clusters.csv")
    report.check(len(clusters["vector_clusters"]) == len(vector_rows),
                 "vector_clusters count matches data/derived",
                 f"{len(vector_rows)} clusters")

    flags = {int(row["respondent_id"]): row for row in
             read_csv(DERIVED_DIR / "respondent_flags.csv")}
    expected_blocs = defaultdict(set)
    for pid, row in flags.items():
        for key in (row["bloc"] or "").split("|"):
            if key:
                expected_blocs[key].add(pid)
    got_blocs = {bloc["key"]: {member["id"] for member in bloc["members_named"]}
                 for bloc in clusters["blocs"]}
    bad_blocs = []
    for key, members in expected_blocs.items():
        bloc = [b for b in clusters["blocs"] if b["key"] == key]
        if not bloc:
            bad_blocs.append(f"{key} missing")
            continue
        total = len(got_blocs[key]) + bloc[0]["n_redacted"]
        if total != len(members):
            bad_blocs.append(f"{key} has {total} members, P10 says "
                             f"{len(members)}")
    report.check(not bad_blocs and set(got_blocs) == set(expected_blocs),
                 "blocs match P10's bloc column",
                 ", ".join(f"{bloc['key']}×"
                           f"{len(bloc['members_named']) + bloc['n_redacted']}"
                           for bloc in clusters["blocs"]))
    pro_hourly = [bloc for bloc in clusters["blocs"]
                  if bloc["key"] == "pro_hourly"]
    report.check(bool(pro_hourly) and pro_hourly[0]["signature"] ==
                 [5, 5, 4, 5, 5, 4, 4],
                 "the pro-hourly bloc keeps its (5,5,4,5,5,4,4) signature",
                 f"{len(pro_hourly[0]['members_named'])} named + "
                 f"{pro_hourly[0]['n_redacted']} redacted"
                 if pro_hourly else "")

    families = {family["name"]: family["n"]
                for family in clusters["entity_families"]}
    expected_families = Counter(row["entity_group"] for row in flags.values()
                                if row["entity_group"])
    report.check(families == dict(expected_families),
                 "entity families match P10", f"{len(families)} families")

    audit = docs["audit"]
    report.check(isinstance(audit["provisional"], bool),
                 "audit.json declares provisional",
                 f"provisional={audit['provisional']}")
    # audited uses audit.json's declared vocabulary; claimed is the respondent's
    # self-reported organisation type, so it uses meta's org_type slugs (the two
    # coincide only while the audit is provisional).
    vocabulary = {entry["key"] for entry in audit["vocabulary"]}
    claimed_vocab = {value["key"] for value
                     in docs["meta"]["segments"]["org_type"]["values"]}
    bad_audit = [row["id"] for row in audit["rows"]
                 if row["audited"] not in vocabulary
                 or row["claimed"] not in claimed_vocab]
    report.check(not bad_audit, "every audit row uses the declared vocabulary "
                                "(audited) and an org_type slug (claimed)",
                 f"{len(bad_audit)} offenders")
    db_claimed = {row["id"]: row["org_type"]
                  for row in docs["respondents"]["org_index"]}
    mismatched = [row["id"] for row in audit["rows"]
                  if db_claimed.get(row["id"]) != row["claimed"]]
    report.check(not mismatched,
                 "audit.claimed is the respondent's self-reported org type",
                 f"{len(mismatched)} mismatches")
    report.check(all(len(row["basis"]) <= 200 for row in audit["rows"]),
                 "audit basis strings are <= 200 chars")
    summary_total = sum(count for counts in audit["summary"].values()
                        for count in counts.values())
    report.check(summary_total == len(audit["rows"]),
                 "audit summary counts sum to the row count",
                 f"{summary_total} rows")
    if audit["provisional"]:
        report.check(all(row["claimed"] == row["audited"]
                         for row in audit["rows"]),
                     "provisional audit repeats the claimed class")
    org_index_class = {row["id"]: row["audited_class"]
                       for row in docs["respondents"]["org_index"]}
    report.check(all(org_index_class[row["id"]] == row["audited"]
                     for row in audit["rows"]),
                 "org_index.audited_class agrees with audit.json")

    domains = docs["evidence"]["citations"]["domains"]
    domain_rows = read_csv(DERIVED_DIR / "domains.csv")
    report.check(len(domains) == len(domain_rows)
                 and {d["domain"] for d in domains} ==
                 {row["domain"] for row in domain_rows},
                 "domain table matches data/derived/domains.csv",
                 f"{len(domains)} domains")


def check_budgets(report: Report) -> None:
    report.section("10. file size budgets")
    worst = []
    for path in sorted(DATA_DIR.glob("*.json")):
        size = path.stat().st_size
        worst.append((size, path.name))
        if size > FILE_BUDGET:
            report.check(False, f"{path.name} is within 500 KB",
                         f"{size / 1024:.1f} KB")
    worst.sort(reverse=True)
    report.check(all(size <= FILE_BUDGET for size, _name in worst),
                 "every top-level file is <= 500 KB",
                 f"largest {worst[0][1]} at {worst[0][0] / 1024:.1f} KB")
    total = sum(path.stat().st_size for path in ORGS_DIR.glob("*.json"))
    print(f"       orgs/ total {total / 1024 / 1024:.1f} MB across "
          f"{len(list(ORGS_DIR.glob('*.json')))} files (lazy-loaded singles)")


def main() -> int:
    if not DATA_DIR.is_dir():
        print("validate_frontend_data: frontend/data does not exist - run "
              "export_frontend.py first", file=sys.stderr)
        return 1
    con = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    report = Report()
    print(f"validate_frontend_data: checking {rel(DATA_DIR)} "
          f"against {rel(DB_PATH)}")
    try:
        docs = check_files(report)
        required = {"meta", "likert", "reasons", "selects", "evidence",
                    "respondents", "clusters", "audit", "quotes"}
        if not required.issubset(docs):
            print("\nvalidate_frontend_data: FAILED - missing or unparseable "
                  f"files: {sorted(required - set(docs))}", file=sys.stderr)
            return 1
        check_likert(report, con, docs)
        check_rollup(report, con, docs)
        check_hard_numbers(report, con, docs)
        check_orgs(report, con, docs)
        check_picklists(report, con, docs)
        check_quotes(report, con, docs)
        check_meta(report, con, docs)
        check_derived(report, docs)
        check_budgets(report)
    finally:
        con.close()

    print(f"\n{report.passed} checks passed, {len(report.failures)} failed")
    if report.failures:
        print("\nfailures:", file=sys.stderr)
        for failure in report.failures:
            print(f"  - {failure}", file=sys.stderr)
        return 1
    print("validate_frontend_data: all checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
