#!/usr/bin/env python3
"""Validate ``frontend/data/*.json`` against the database and the contract.

Every check re-derives its expectation from
``data/electricity_consequential.sqlite`` (or from ``data/derived/`` and
``reference/``) rather than trusting the export, so this script fails when the
exporter is wrong, when the exporter's inputs change under it, or when someone
hand-edits the JSON. It prints one line per check and exits non-zero if any
check fails. Every Wave 3+ prompt runs it in acceptance.

Check groups (PLAN.md Sec. 5 / prompt P22 "Validator")
    1  canonical bytes - files parse, keys are sorted, a trailing newline is
       present, and a fresh export into a temp directory is byte-identical
    2  SCELL arithmetic - every cell of stances, matrix, feasibility, the
       scoreboards and redaction_effect recomputed from the db, counts sum to
       n, segment cells sum to overall, option order matches meta
    3  mask placement - the "<5" sentinel appears for exactly the segment
       values under MIN_SEGMENT_N respondents, and nowhere else
    4  the hard numbers on the analytical base - frozen literals, recomputed
       from the db, and compared to the JSON; all three must agree
    5  the exclusion invariant - no excluded respondent anywhere outside
       integrity.json, no redacted respondent named anywhere, org files ==
       org_index exactly
    6  quotes - verbatim (elision-aware), within the length cap, no excluded or
       redacted-named respondent, template badges correct
    7  themes - taxonomy closure, n_dedup <= n <= n_texts, share_pct, and the
       gotcha-4 filter (ID 31's six pre-ruling rows must not reach the counts)
    8  meta coverage - every substantive question present, every Sec. 4 page
       covered, option vocabularies match question_options, polarity declared
    9  size budgets - every file <= 300 KB, every orgs file <= 150 KB

Standard library only. Usage:

    python3 scripts/analytics/validate_frontend_data.py
"""

from __future__ import annotations

import csv
import json
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from collections import Counter, defaultdict
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
HUB_ROOT = SCRIPT_DIR.parents[1]
DB_PATH = HUB_ROOT / "data" / "electricity_consequential.sqlite"
DERIVED_DIR = HUB_ROOT / "data" / "derived"
REFERENCE_DIR = HUB_ROOT / "reference"
DATA_DIR = HUB_ROOT / "frontend" / "data"
ORGS_DIR = DATA_DIR / "orgs"
EXPORTER = SCRIPT_DIR / "export_frontend.py"

sys.path.insert(0, str(SCRIPT_DIR))
import export_frontend  # noqa: E402  (sibling module, path set above)

EXPORTER_OPTIONS = export_frontend.OPTIONS

FILE_BUDGET = 300 * 1024
ORG_BUDGET = 150 * 1024
MIN_SEGMENT_N = 5
THIN_CELL_N = 10
SENTINEL = "<5"
QUOTE_MAX = 600
PREVIEW_MAX = 240
INDEX_NAME_MAX = 80
BASIS_MAX = 200

FILES = ("meta", "stances", "matrix", "scoreboard", "themes", "quotes",
         "respondents", "integrity")

SEGMENT_DIMS = ("country_4", "org_type_5", "redaction", "responding_as")

STANCE_QIDS = ("Q019", "Q021", "Q024", "Q031", "Q033", "Q043", "Q045")
MATRIX_QIDS = tuple(f"Q026_{n}" for n in range(1, 10))

# --- the frozen analytical-base figures -------------------------------------
# These replace PLAN Sec. 3's raw-base digest. Each is asserted three ways:
# as the literal below, as recomputed from the database on the analytical base,
# and as it appears in the exported JSON. A change in any one of the three is a
# failure, so nobody can quietly move a headline number.

BASE_TOTALS = {"respondents_raw": 185, "respondents": 180, "named": 105,
               "redacted": 75, "questions": 43}

# qid -> (n, [counts in meta option order])
HARD_STANCES = {
    "Q019": (129, [48, 81]),                    # yes, no
    "Q021": (106, [56, 50]),                    # yes, no
    "Q024": (99, [80, 19]),                     # each_year, lifetime
    "Q031": (98, [37, 32, 29]),                 # yes, unsure, no
    "Q033": (75, [42, 33]),                     # yes, no
    "Q043": (77, [21, 18, 15, 3, 20]),          # country..nodal (coarse->fine)
    "Q045": (78, [31, 3, 30, 14]),              # annual..sub-hourly
}

# qid -> (n, required, optional, not_required, net requiredness %R-%N in 1dp)
# The nets are the *pre-rounded* convention - round each share to 1dp, then
# subtract - which is the one the site displays and PLAN Sec. 3.3 declares
# binding. This table used to freeze the round-the-difference convention, which
# moves regulatory to +47.1 and barrier to -27.6; those two numbers appear
# nowhere on the site and the plan forbids quoting them (P35 F4). Since P42 the
# exporter owns the field (matrix.json net_pct, contract addition C1) and this
# table is the third-party check on it.
HARD_MATRIX = {
    "Q026_1": (104, 66, 21, 17, 47.2),          # regulatory
    "Q026_2": (102, 49, 30, 23, 25.5),          # timing
    "Q026_3": (104, 16, 57, 31, -14.4),         # financial analysis
    "Q026_4": (98, 13, 45, 40, -27.5),          # barrier
    "Q026_5": (100, 21, 32, 47, -26.0),         # common practice
    "Q026_6": (102, 16, 56, 30, -13.7),         # positive list
    "Q026_7": (98, 12, 37, 49, -37.8),          # performance standard
    "Q026_8": (99, 22, 40, 37, -15.2),          # contractual/tenor
    "Q026_9": (96, 8, 35, 53, -46.9),           # first-of-its-kind
}

HARD_FEASIBILITY_N = 95
HARD_FEASIBILITY = {
    "regulatory": 78, "timing": 71, "positive_list": 58,
    "contractual_tenor": 47, "financial_analysis": 44,
    "performance_standard": 42, "common_practice": 39, "first_of_kind": 35,
    "barrier": 30,
}
HARD_FEASIBILITY_SPECIALS = {"none_feasible": 10}

# board -> (base_app, base_not, {option key: (app n, not n)}, {special: (side, n)})
HARD_SCOREBOARDS = {
    "om": (66, 54, {
        "sced_locational": (47, 10), "statistical": (44, 10),
        "sced_fuel_on_margin": (40, 11), "scenario_modeling": (25, 25),
        "heat_rate_lmp": (23, 23), "capacity_factor": (19, 31),
        "difference_based": (18, 28),
    }, {("none", "app"): 7, ("none", "not"): 9}),
    "bm": (66, 55, {
        "recent_capacity_additions": (47, 9),
        "capacity_expansion_modeling": (29, 26),
        "policy_scenario": (25, 29), "average_emission_rate": (17, 38),
    }, {("none", "app"): 7, ("none", "not"): 5}),
    "weighting": (64, 54, {
        "ghgp_grid_connected": (29, 8), "cdm_tool07": (18, 9),
        "default_5050": (16, 8), "intervention_lifecycle": (13, 15),
        "resource_adequacy": (9, 17),
    }, {("unsure", "app"): 14, ("unsure", "not"): 20,
        ("none_appropriate", "app"): 9, ("all_feasible", "not"): 15}),
}

# The attrition spine of PLAN Sec. 3.1, on the analytical base.
HARD_ATTRITION = {"Q018": 160, "Q019": 129, "Q021": 106, "Q024": 99,
                  "Q035": 66, "Q043": 77, "Q047": 64, "Q052": 34}

# Segment sizes on the analytical base (PLAN Sec. 5's closed vocabulary).
HARD_SEGMENTS = {
    "org_type_5": {"company": 60, "consultant": 25, "ngo": 21,
                   "industry_group": 17, "other": 57},
    "country_4": {"us": 104, "uk": 12, "jp": 8, "other": 56},
    "redaction": {"named": 105, "redacted": 75},
    "responding_as": {"organization": 159, "individual": 21},
}

# Manager ruling, Wave 1: exclusions.csv is authoritative and final.
HARD_EXCLUSIONS = {11: "junk", 12: "junk", 14: "junk", 31: "junk",
                   100: "superseded"}
HARD_NAMED_EXCLUDED = {11, 14, 100}
# ID 31 was theme-coded before the exclusion ruling landed; those rows must not
# reach themes.json (manager note b).
HARD_PRERULING_CODED_ID = 31
HARD_PRERULING_CODED_ROWS = 6

HARD_BLOCS = {"policy_insights_pack": {43, 47, 60, 79, 82},
              "bullet_pack": {51, 86, 89, 117}}
HARD_FAMILIES = {"engie_impact": [135, 160]}
# 38 clusters spanning 26 distinct analytical-base respondents - 23 bloc members
# plus three peripheral single-cluster sharers (45, 110, 173). PLAN Sec. 3.5
# said 25 until P35 recounted it (F5); it is a published field now (C2).
HARD_CLUSTER_RESPONDENTS = 26
HARD_RESUBMISSION = (100, 151)


def r1(value):
    if value is None:
        return None
    return float(Decimal(repr(float(value))).quantize(Decimal("0.1"),
                                                      rounding=ROUND_HALF_UP))


def pct(count, base):
    return r1(100.0 * count / base) if base else None


def rel(path: Path) -> str:
    try:
        return str(path.relative_to(HUB_ROOT))
    except ValueError:
        return str(path)


def read_csv(path: Path) -> list[dict]:
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def int_or_zero(value) -> int:
    try:
        return int(str(value).strip() or 0)
    except ValueError:
        return 0


def verbatim_in(text, stored) -> bool:
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
        return bool(ok)

    def section(self, title: str) -> None:
        print(f"\n{title}")


# --- shared re-derivation ----------------------------------------------------


class Truth:
    """The analytical base, rebuilt from the database and the curation inputs.

    Nothing here reads frontend/data - that is the point.
    """

    def __init__(self, con):
        self.con = con
        self.exclusions = {int(row["respondent_id"]): row["exclusion_reason"]
                           for row in
                           read_csv(REFERENCE_DIR / "exclusions.csv")}
        self.people = {row["respondent_id"]: dict(row) for row in con.execute(
            "SELECT respondent_id, organization, country, responding_as, "
            "organization_type, sector, is_redacted + 0 AS is_redacted, "
            "n_substantive_answered + 0 AS nsub, free_text_chars + 0 AS ft "
            "FROM respondents")}
        self.base = sorted(pid for pid in self.people
                           if pid not in self.exclusions)
        self.base_set = set(self.base)
        self.redacted = {pid for pid, row in self.people.items()
                         if row["is_redacted"]}
        self.named_base = [pid for pid in self.base if pid not in self.redacted]

        self.answers: dict[str, dict[int, str]] = defaultdict(dict)
        for row in con.execute(
            "SELECT respondent_id, question_id, answer_text FROM responses "
            "WHERE answer_text IS NOT NULL"
        ):
            if row["respondent_id"] in self.base_set:
                self.answers[row["question_id"]][row["respondent_id"]] = \
                    row["answer_text"]

        self.picks: dict[str, dict[str, set[int]]] = defaultdict(
            lambda: defaultdict(set))
        self.pickers: dict[str, set[int]] = defaultdict(set)
        for row in con.execute("SELECT respondent_id, question_id, option_text "
                               "FROM response_selections"):
            if row["respondent_id"] not in self.base_set:
                continue
            self.picks[row["question_id"]][row["option_text"]].add(
                row["respondent_id"])
            self.pickers[row["question_id"]].add(row["respondent_id"])

        self.questions = {row["question_id"]: dict(row) for row in con.execute(
            "SELECT question_id, question_number, display, shorthand, label, "
            "topic, doc_section, asks_for, question_type FROM questions "
            "WHERE question_number >= 18")}

        self.flags = {int(row["respondent_id"]): row
                      for row in read_csv(DERIVED_DIR / "respondent_flags.csv")}

    def segment_of(self, meta) -> dict[str, dict[int, str]]:
        """respondent_id -> segment key, rebuilt from the db.

        The slug spelling comes from meta's closed vocabulary; the *membership*
        rule is re-derived here, so a mis-grouped respondent fails check 2.
        """
        org_group = {}
        for pid, row in self.people.items():
            value = row["organization_type"]
            if value == "Company":
                org_group[pid] = "company"
            elif value.startswith("Consultant"):
                org_group[pid] = "consultant"
            elif value.startswith("Non-profit"):
                org_group[pid] = "ngo"
            elif value == "Industry group":
                org_group[pid] = "industry_group"
            else:
                org_group[pid] = "other"
        country = {}
        for pid, row in self.people.items():
            country[pid] = {"United States": "us", "United Kingdom": "uk",
                            "Japan": "jp"}.get(row["country"], "other")
        return {
            "org_type_5": org_group,
            "country_4": country,
            "redaction": {pid: ("redacted" if pid in self.redacted else "named")
                          for pid in self.people},
            "responding_as": {pid: row["responding_as"].lower()
                              for pid, row in self.people.items()},
            "_meta_keys": {dim: [value["key"]
                                 for value in meta["segments"][dim]["values"]]
                           for dim in SEGMENT_DIMS},
        }

    def keyed(self, qid: str) -> dict[int, str]:
        """respondent_id -> option key, straight off the stored answer text."""
        table = text_to_key(qid)
        return {pid: table[text]
                for pid, text in self.answers.get(qid, {}).items()
                if text in table}

    def picks_by_key(self, qid: str) -> dict[str, set[int]]:
        table = text_to_key(qid)
        return {table[text]: ids
                for text, ids in self.picks.get(qid, {}).items()
                if text in table}


def text_to_key(qid: str) -> dict[str, str]:
    """The declared answer-text -> option-key table for one question.

    Mapping a stored answer string onto a JSON key is a *naming* decision, not
    a data fact, so it is read from the exporter's declared vocabulary rather
    than guessed. Check 8 independently asserts that the declaration is a
    bijection onto ``question_options`` for every exported question, so a key
    that names the wrong option cannot hide here.
    """
    return {text: key for text, key, _label, _special in EXPORTER_OPTIONS[qid]}


def scell(counts: Counter, order) -> dict:
    values = [counts.get(key, 0) for key in order]
    return {"c": values, "n": sum(values)}


# --- 1. canonical bytes ------------------------------------------------------


def check_files(report: Report) -> dict:
    report.section("1. canonical bytes: files parse, keys sorted, trailing "
                   "newline, and a fresh export is byte-identical")
    docs = {}
    for name in FILES:
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
    report.check(ORGS_DIR.is_dir(), "orgs/ exists")

    with tempfile.TemporaryDirectory() as tmp:
        result = subprocess.run(
            [sys.executable, str(EXPORTER), "--out-dir", tmp],
            capture_output=True, text=True)
        if not report.check(result.returncode == 0,
                            "a fresh export run succeeds",
                            (result.stderr or "").strip()[-200:]):
            shutil.rmtree(tmp, ignore_errors=True)
            return docs
        shipped = sorted(p.relative_to(DATA_DIR).as_posix()
                         for p in DATA_DIR.rglob("*.json"))
        rebuilt = sorted(p.relative_to(Path(tmp)).as_posix()
                         for p in Path(tmp).rglob("*.json"))
        # frontend/data/fixtures/ is P11's lane, not an exporter output.
        shipped = [name for name in shipped
                   if not name.startswith("fixtures/")]
        report.check(shipped == rebuilt,
                     "a rerun produces exactly the same file set",
                     f"{len(shipped)} files")
        differing = [name for name in shipped
                     if (DATA_DIR / name).read_bytes()
                     != (Path(tmp) / name).read_bytes()]
        report.check(not differing,
                     "every file is byte-identical on rerun (deterministic "
                     "serialization, generated date from the manifest)",
                     f"differing: {differing[:4]}" if differing
                     else f"{len(shipped)} files")
    return docs


# --- 2. SCELL arithmetic -----------------------------------------------------


def option_keys(meta, qid):
    question = next((q for q in meta["questions"] if q["qid"] == qid), None)
    if question is None:
        raise SystemExit(f"validate_frontend_data: {qid} missing from meta")
    return [option["key"] for option in question["options"]], question["options"]


def check_cells(report: Report, truth: Truth, docs) -> None:
    report.section("2. SCELL arithmetic: every cell recomputed from the "
                   "database, overall and by segment")
    meta = docs["meta"]
    of = truth.segment_of(meta)
    sizes = {dim: {value["key"]: value["n"]
                   for value in meta["segments"][dim]["values"]}
             for dim in SEGMENT_DIMS}

    def compare_segmented(entry, keyed, order, where, problems):
        expect = scell(Counter(keyed.values()), order)
        if entry["overall"] != expect:
            problems.append(f"{where} overall {entry['overall']} != {expect}")
        if set(entry["by"]) != set(SEGMENT_DIMS):
            problems.append(f"{where} dims {sorted(entry['by'])}")
            return
        for dim in SEGMENT_DIMS:
            cells = entry["by"][dim]
            if set(cells) != set(sizes[dim]):
                problems.append(f"{where} {dim} keys differ from meta")
                continue
            rolled = 0
            for key, cell in cells.items():
                want = scell(Counter(value for pid, value in keyed.items()
                                     if of[dim][pid] == key), order)
                # Two independent reasons to mask: the segment value is small
                # overall, or this particular cell is (contract addition C3).
                # Either way the roll-up still has to account for the people
                # behind the sentinel, so it uses the recomputed truth.
                hidden = (sizes[dim][key] < MIN_SEGMENT_N
                          or want["n"] < MIN_SEGMENT_N)
                if hidden:
                    if cell != {"n": SENTINEL}:
                        problems.append(f"{where} {dim}/{key} should be masked "
                                        f"(cell n={want['n']}, segment "
                                        f"n={sizes[dim][key]}) but is {cell}")
                    rolled += want["n"]
                    continue
                thin = cell.pop("thin", None)
                if cell != want:
                    problems.append(f"{where} {dim}/{key} {cell} != {want}")
                if sum(cell.get("c", [])) != cell.get("n"):
                    problems.append(f"{where} {dim}/{key} does not sum to n")
                if bool(thin) != (want["n"] < THIN_CELL_N):
                    problems.append(f"{where} {dim}/{key} thin={thin!r} at "
                                    f"n={want['n']} (threshold {THIN_CELL_N})")
                if thin is not None:
                    cell["thin"] = thin
                rolled += cell["n"]
            if rolled != entry["overall"]["n"]:
                problems.append(f"{where} {dim} rolls up to {rolled} "
                                f"!= {entry['overall']['n']}")

    problems: list[str] = []
    for qid in STANCE_QIDS:
        order, _options = option_keys(meta, qid)
        compare_segmented(docs["stances"][qid], truth.keyed(qid),
                          order, f"stances[{qid}]", problems)
    report.check(not problems, "stances.json cells match the db and roll up",
                 "; ".join(problems[:3]))

    problems = []
    for qid in MATRIX_QIDS:
        order, _options = option_keys(meta, qid)
        compare_segmented(docs["matrix"]["tests"][qid],
                          truth.keyed(qid), order,
                          f"matrix.tests[{qid}]", problems)
    report.check(not problems, "matrix.json test cells match the db and roll up",
                 "; ".join(problems[:3]))

    problems = []
    for qid in STANCE_QIDS:
        order, _options = option_keys(meta, qid)
        keyed = truth.keyed(qid)
        row = next(r for r in docs["respondents"]["redaction_effect"]
                   if r["qid"] == qid)
        for side, want_ids in (("named", lambda p: p not in truth.redacted),
                               ("redacted", lambda p: p in truth.redacted)):
            want = scell(Counter(value for pid, value in keyed.items()
                                 if want_ids(pid)), order)
            if row[side] != want:
                problems.append(f"redaction_effect[{qid}].{side}")
        if row["named"]["n"] + row["redacted"]["n"] != \
                docs["stances"][qid]["overall"]["n"]:
            problems.append(f"redaction_effect[{qid}] does not sum to overall")
    report.check(not problems,
                 "respondents.redaction_effect matches the db and sums to the "
                 "stance overall", "; ".join(problems[:3]))

    # Contract addition C4, same shape and the same three-way assertion as
    # redaction_effect above: db == json, and the two sides sum to the base.
    problems = []
    country_of = truth.segment_of(meta)["country_4"]
    for qid in STANCE_QIDS:
        order, _options = option_keys(meta, qid)
        keyed = truth.keyed(qid)
        row = next(r for r in docs["respondents"]["country_effect"]
                   if r["qid"] == qid)
        for side, want_ids in (("us", lambda p: country_of[p] == "us"),
                               ("non_us", lambda p: country_of[p] != "us")):
            want = scell(Counter(value for pid, value in keyed.items()
                                 if want_ids(pid)), order)
            if row[side] != want:
                problems.append(f"country_effect[{qid}].{side} {row[side]} "
                                f"!= {want}")
        if row["us"]["n"] + row["non_us"]["n"] != \
                docs["stances"][qid]["overall"]["n"]:
            problems.append(f"country_effect[{qid}] does not sum to overall")
    if [r["qid"] for r in docs["respondents"]["country_effect"]] != \
            list(STANCE_QIDS):
        problems.append("country_effect does not cover the stance questions "
                        "in order")
    report.check(not problems,
                 "respondents.country_effect matches the db and sums to the "
                 "stance overall (contract C4)",
                 "; ".join(problems[:3]) if problems else
                 "Q19 US 54N/74 (73.0%) vs non-US 27/55 (49.1%) · "
                 "Q24 US 53/55 (96.4%) vs non-US 27/44 (61.4%)")

    problems = []
    picks_by_key = truth.picks_by_key("Q028")
    feasibility = docs["matrix"]["feasibility"]
    if feasibility["n"] != len(truth.pickers["Q028"]):
        problems.append(f"feasibility n {feasibility['n']} != "
                        f"{len(truth.pickers['Q028'])}")
    for key, cell in feasibility["per_test"].items():
        problems += pick_problems(cell, picks_by_key.get(key, set()), of, sizes,
                                  f"feasibility[{key}]")
    for key, cell in feasibility["specials"].items():
        if cell["n"] != len(picks_by_key.get(key, set())):
            problems.append(f"feasibility special {key}")
    report.check(not problems, "matrix.json feasibility picks match the db",
                 "; ".join(problems[:3]))

    problems = []
    for board_key, board in docs["scoreboard"].items():
        spec = meta["scoreboards"][board_key]
        if board["base_app"] != len(truth.pickers[spec["q_app"]]):
            problems.append(f"{board_key} base_app")
        if board["base_not"] != len(truth.pickers[spec["q_not"]]):
            problems.append(f"{board_key} base_not")
        for side, qid in (("app", spec["q_app"]),
                          ("not", spec["q_not"])):
            by_key = truth.picks_by_key(qid)
            for row in board["options"]:
                problems += pick_problems(row[side], by_key.get(row["key"],
                                                               set()),
                                          of, sizes,
                                          f"{board_key}[{row['key']}].{side}")
            for special in board["specials"]:
                if special["side"] != side:
                    continue
                if special["n"] != len(by_key.get(special["key"], set())):
                    problems.append(f"{board_key} special {special['key']}/"
                                    f"{side}")
        for row in board["options"]:
            want = r1((pct(row["app"]["n"], board["base_app"]) or 0.0)
                      - (pct(row["not"]["n"], board["base_not"]) or 0.0))
            if row["net_pct"] != want:
                problems.append(f"{board_key}[{row['key']}] net_pct "
                                f"{row['net_pct']} != {want}")
        order = [(-row["net_pct"], row["key"]) for row in board["options"]]
        if order != sorted(order):
            problems.append(f"{board_key} options are not sorted by net_pct")
    report.check(not problems,
                 "scoreboard.json picks, own-base nets (gotcha 7) and ordering "
                 "match the db", "; ".join(problems[:3]))

    specials_netted = []
    for board_key, board in docs["scoreboard"].items():
        special_keys = {special["key"] for special in board["specials"]}
        for row in board["options"]:
            if row["key"] in special_keys:
                specials_netted.append(f"{board_key}/{row['key']}")
    report.check(not specials_netted,
                 "no special option is netted into a scoreboard (gotcha 6)",
                 "; ".join(specials_netted[:3]))


def pick_problems(cell, ids, of, sizes, where) -> list[str]:
    problems = []
    if cell["n"] != len(ids):
        problems.append(f"{where} n {cell['n']} != {len(ids)}")
    if set(cell["by"]) != set(SEGMENT_DIMS):
        problems.append(f"{where} dims {sorted(cell['by'])}")
        return problems
    for dim in SEGMENT_DIMS:
        for key, value in cell["by"][dim].items():
            if sizes[dim][key] < MIN_SEGMENT_N:
                continue
            want = sum(1 for pid in ids if of[dim][pid] == key)
            if value["n"] != want:
                problems.append(f"{where} {dim}/{key} {value['n']} != {want}")
    return problems


# --- 3. mask placement -------------------------------------------------------


def walk_cells(obj, path=""):
    """Yield (path, cell) for every dict that looks like a contract cell."""
    if isinstance(obj, dict):
        if "n" in obj and (set(obj) <= {"n", "c", "by", "thin"}):
            yield path, obj
        for key, value in obj.items():
            yield from walk_cells(value, f"{path}.{key}")
    elif isinstance(obj, list):
        for index, value in enumerate(obj):
            yield from walk_cells(value, f"{path}[{index}]")


def check_mask(report: Report, docs) -> None:
    report.section("3. mask placement: the \"<5\" sentinel lands on exactly the "
                   "under-5 segment values and under-5 cells")
    meta = docs["meta"]
    sizes = {dim: {value["key"]: value["n"]
                   for value in meta["segments"][dim]["values"]}
             for dim in SEGMENT_DIMS}
    due = sorted(f"{dim}/{key}" for dim in SEGMENT_DIMS
                 for key, n in sizes[dim].items() if n < MIN_SEGMENT_N)

    # A small segment value must be masked everywhere it appears. A cell inside
    # a *large* segment value may also be masked - that is contract addition C3
    # firing on the cell's own n - and section 2 is what proves those land on
    # exactly the right cells, since only it recomputes from the database.
    wrong, leaked, cell_level, thin_wrong = [], [], [], []
    for name in ("stances", "matrix", "scoreboard"):
        for path, cell in walk_cells(docs[name], name):
            parts = path.split(".")
            if len(parts) < 3:
                continue
            dim, key = parts[-2], parts[-1]
            if dim not in SEGMENT_DIMS or key not in sizes[dim]:
                continue
            masked = cell.get("n") == SENTINEL
            if sizes[dim][key] < MIN_SEGMENT_N and not masked:
                wrong.append(f"{path} unmasked, segment n={sizes[dim][key]}")
            if masked:
                if set(cell) != {"n"}:
                    leaked.append(path)
                if sizes[dim][key] >= MIN_SEGMENT_N:
                    cell_level.append(path)
            elif "c" in cell:
                thin = bool(cell.get("thin"))
                if thin != (cell["n"] < THIN_CELL_N):
                    thin_wrong.append(f"{path} thin={thin} n={cell['n']}")
    report.check(not wrong,
                 f"every under-{MIN_SEGMENT_N} segment value is masked wherever "
                 "it appears",
                 "; ".join(wrong[:4]) if wrong else
                 (f"masked: {', '.join(due)}" if due else
                  "no segment value falls under 5 on the analytical base"))
    report.check(not leaked, "no masked cell carries counts alongside the "
                             "sentinel", "; ".join(leaked[:4]))
    report.check(True,
                 f"cell-level under-{MIN_SEGMENT_N} masks (contract C3) - "
                 "section 2 checks each against the db",
                 f"{len(cell_level)} cells: "
                 f"{', '.join(p.split('.', 1)[1] for p in cell_level[:6])}"
                 if cell_level else "none")
    report.check(not thin_wrong,
                 f"the thin-n flag marks exactly the cells with "
                 f"{MIN_SEGMENT_N} <= n < {THIN_CELL_N}",
                 "; ".join(thin_wrong[:4]))
    report.check(all(value["n"] >= 0 for dim in SEGMENT_DIMS
                     for value in meta["segments"][dim]["values"]),
                 "meta.segments publishes true segment sizes (base chips)",
                 "; ".join(f"{dim}={sum(sizes[dim].values())}"
                           for dim in sorted(SEGMENT_DIMS)))


# --- 4. hard numbers ---------------------------------------------------------


def check_hard_numbers(report: Report, truth: Truth, docs) -> None:
    report.section("4. the analytical-base hard numbers: frozen literal == "
                   "recomputed from the db == exported JSON")
    meta = docs["meta"]

    exclusions = {pid: reason for pid, reason in truth.exclusions.items()}
    report.check(exclusions == HARD_EXCLUSIONS,
                 "reference/exclusions.csv is the adjudicated set "
                 "{11,12,14,31 junk; 100 superseded}",
                 f"{sorted(exclusions)}")
    totals = meta["totals"]
    db_named = len(truth.named_base)
    report.check(totals["respondents_raw"] == len(truth.people)
                 == BASE_TOTALS["respondents_raw"]
                 and totals["respondents"] == len(truth.base)
                 == BASE_TOTALS["respondents"]
                 and totals["named"] == db_named == BASE_TOTALS["named"]
                 and totals["redacted"] == len(truth.base) - db_named
                 == BASE_TOTALS["redacted"],
                 "totals: 185 raw -> 180 analytical (105 named / 75 redacted)",
                 f"{totals['respondents']} of {totals['respondents_raw']}, "
                 f"{totals['named']} named")

    problems = []
    for dim, expected in HARD_SEGMENTS.items():
        got = {value["key"]: value["n"]
               for value in meta["segments"][dim]["values"]}
        if got != expected:
            problems.append(f"{dim}: {got} != {expected}")
        if sum(got.values()) != len(truth.base):
            problems.append(f"{dim} does not sum to the base")
    report.check(not problems, "segment sizes on the analytical base",
                 "; ".join(problems[:2]) if problems else
                 "org_type_5 60/25/21/17/57 · country_4 104/12/8/56 · "
                 "redaction 105/75 · responding_as 159/21")

    problems = []
    for qid, (want_n, want_c) in HARD_STANCES.items():
        order, _options = option_keys(meta, qid)
        db = scell(Counter(truth.keyed(qid).values()), order)
        if db != {"c": want_c, "n": want_n}:
            problems.append(f"{qid} db {db} != frozen {want_c}/{want_n}")
        if docs["stances"][qid]["overall"] != db:
            problems.append(f"{qid} json != db")
    report.check(not problems,
                 "Q19/21/24/31/33/43/45 overalls",
                 "; ".join(problems[:3]) if problems else
                 "Q19 48Y/81N (n=129) · Q21 56Y/50N (106) · Q24 80/19 (99) · "
                 "Q31 37/32/29 (98) · Q33 42/33 (75) · Q43 n=77 · Q45 n=78")

    problems = []
    for qid, (want_n, req, opt, notreq, net) in HARD_MATRIX.items():
        order, _options = option_keys(meta, qid)
        db = scell(Counter(truth.keyed(qid).values()), order)
        if db != {"c": [req, opt, notreq], "n": want_n}:
            problems.append(f"{qid} db {db} != frozen")
        if docs["matrix"]["tests"][qid]["overall"] != db:
            problems.append(f"{qid} json != db")
        # Net requiredness is the difference of the two *displayed* 1dp
        # percentages, so a reader can reproduce it from the row on screen -
        # the same rule the scoreboards use, where the two sides have different
        # bases and no other rule is even available. Rounding the difference
        # instead moves regulatory and barrier by 0.1pp away from the site.
        db_net = r1(r1(100.0 * req / want_n) - r1(100.0 * notreq / want_n))
        if db_net != net:
            problems.append(f"{qid} net requiredness {db_net} != {net}")
        if docs["matrix"]["tests"][qid].get("net_pct") != net:
            problems.append(
                f"{qid} matrix.json net_pct "
                f"{docs['matrix']['tests'][qid].get('net_pct')} != {net}")
    report.check(not problems, "the 9 additionality matrix rows (PLAN Sec. 3.3), "
                               "including the exported net_pct (contract C1)",
                 "; ".join(problems[:3]) if problems else
                 "regulatory +47.2 … first-of-its-kind -46.9, pre-rounded "
                 "convention, one authoritative field")

    problems = []
    by_key = {key: len(ids) for key, ids in truth.picks_by_key("Q028").items()}
    if len(truth.pickers["Q028"]) != HARD_FEASIBILITY_N:
        problems.append(f"Q28 base {len(truth.pickers['Q028'])}")
    if docs["matrix"]["feasibility"]["n"] != HARD_FEASIBILITY_N:
        problems.append("Q28 base in json")
    for key, want in {**HARD_FEASIBILITY, **HARD_FEASIBILITY_SPECIALS}.items():
        if by_key.get(key) != want:
            problems.append(f"Q28 {key} db {by_key.get(key)} != {want}")
    for key, want in HARD_FEASIBILITY.items():
        if docs["matrix"]["feasibility"]["per_test"][key]["n"] != want:
            problems.append(f"Q28 {key} json")
    for key, want in HARD_FEASIBILITY_SPECIALS.items():
        if docs["matrix"]["feasibility"]["specials"][key]["n"] != want:
            problems.append(f"Q28 special {key} json")
    report.check(not problems, "Q28 feasibility picks (n=95)",
                 "; ".join(problems[:3]) if problems else
                 "regulatory 78 · timing 71 · … · barrier 30 · none 10")

    problems = []
    for board_key, (base_app, base_not, options, specials) in \
            HARD_SCOREBOARDS.items():
        board = docs["scoreboard"][board_key]
        spec = meta["scoreboards"][board_key]
        if (len(truth.pickers[spec["q_app"]]),
                len(truth.pickers[spec["q_not"]])) != (base_app, base_not):
            problems.append(f"{board_key} db bases")
        if (board["base_app"], board["base_not"]) != (base_app, base_not):
            problems.append(f"{board_key} json bases")
        for row in board["options"]:
            want = options.get(row["key"])
            if want is None:
                problems.append(f"{board_key} unexpected option {row['key']}")
            elif (row["app"]["n"], row["not"]["n"]) != want:
                problems.append(f"{board_key}/{row['key']} "
                                f"{(row['app']['n'], row['not']['n'])} != {want}")
        got_specials = {(s["key"], s["side"]): s["n"] for s in board["specials"]}
        if got_specials != specials:
            problems.append(f"{board_key} specials {got_specials} != {specials}")
    report.check(not problems, "the three scoreboards (PLAN Sec. 3.4)",
                 "; ".join(problems[:3]) if problems else
                 "OM 66/54 · BM 66/55 · weighting 64/54, own-base nets")

    problems = []
    attrition = {row["qid"]: row["n"] for row in docs["respondents"]["attrition"]}
    for qid, want in HARD_ATTRITION.items():
        db = len(truth.answers.get(qid, {}))
        if db != want:
            problems.append(f"{qid} db {db} != {want}")
        if attrition.get(qid) != want:
            problems.append(f"{qid} json {attrition.get(qid)} != {want}")
    ordered = [row["n"] for row in docs["respondents"]["attrition"]]
    report.check(not problems, "the attrition spine on the analytical base",
                 "; ".join(problems[:3]) if problems else
                 f"Q18 160 → Q19 129 → Q21 106 → Q24 99 → Q35 66 → Q52 34 "
                 f"({len(ordered)} questions)")

    problems = []
    for qid in truth.questions:
        entry = next((q for q in meta["questions"] if q["qid"] == qid), None)
        if entry is None:
            problems.append(f"{qid} missing from meta")
            continue
        if entry["n_answered"] != len(truth.answers.get(qid, {})):
            problems.append(f"{qid} n_answered {entry['n_answered']} != "
                            f"{len(truth.answers.get(qid, {}))}")
    report.check(not problems,
                 "every meta.n_answered is the analytical-base count, not the "
                 "db's raw n_answered", "; ".join(problems[:3]))
    report.check(totals["questions"] == len(meta["questions"])
                 == len(truth.questions) == BASE_TOTALS["questions"],
                 "meta.totals.questions is the substantive codebook size",
                 f"{totals['questions']} questions (34 numbered + 9 matrix)")

    long_previews = [
        f"{where}: {len(text)} chars"
        for where, text in
        [(f"cluster {c['hash'][:8]}", c["preview"])
         for c in docs["integrity"]["text_clusters"]]
        + [(f"q52 r{row['respondent_id']}", row["preview"])
           for row in docs["integrity"]["citations"]["q52"]]
        + [(f"resubmission {row['qid']} {side}", row[side])
           for row in docs["integrity"]["resubmission"]["changed"]
           for side in ("before", "after")]
        + [(f"template block {b['hash'][:8]}", b["preview"])
           for b in docs["integrity"]["citations"]["template_citation_blocks"]]
        if len(text) > PREVIEW_MAX]
    report.check(not long_previews,
                 f"every preview is <= {PREVIEW_MAX} chars",
                 "; ".join(long_previews[:3]))


# --- 5. the exclusion invariant ---------------------------------------------


ID_KEYS = {"id", "respondent_id", "kept", "dropped"}
ID_LIST_KEYS = {"ids", "member_ids", "members"}


def walk_ids(obj, path=""):
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key in ID_KEYS and isinstance(value, int):
                yield f"{path}.{key}", value
            elif key in ID_LIST_KEYS and isinstance(value, list):
                for item in value:
                    if isinstance(item, int):
                        yield f"{path}.{key}", item
            yield from walk_ids(value, f"{path}.{key}")
    elif isinstance(obj, list):
        for index, value in enumerate(obj):
            yield from walk_ids(value, f"{path}[{index}]")


def check_exclusion_invariant(report: Report, truth: Truth, docs) -> None:
    report.section("5. the exclusion invariant, org coverage and the "
                   "no-redacted-names rule")
    excluded = set(truth.exclusions)
    leaks = []
    for name in FILES:
        if name == "integrity":
            continue
        for path, value in walk_ids(docs[name], name):
            if value in excluded:
                leaks.append(f"{path} = {value}")
    report.check(not leaks,
                 "no excluded respondent id appears outside integrity.json",
                 "; ".join(leaks[:4]) if leaks else
                 f"excluded {sorted(excluded)} confined to integrity.json")

    org_index = docs["respondents"]["org_index"]
    ids = [row["id"] for row in org_index]
    report.check(ids == truth.named_base,
                 "org_index is exactly the named analytical-base respondents",
                 f"{len(ids)} rows (expected {len(truth.named_base)})")
    files = {int(path.stem) for path in ORGS_DIR.glob("*.json")}
    report.check(files == set(ids),
                 "every org_index id has an orgs/{id}.json and there are no "
                 "extras", f"{len(files)} files")
    report.check(not (files & truth.redacted) and not (files & excluded),
                 "no org file belongs to a redacted or excluded respondent")
    report.check(all(len(row["name"]) <= INDEX_NAME_MAX for row in org_index),
                 f"org_index names are <= {INDEX_NAME_MAX} chars",
                 f"longest {max(len(row['name']) for row in org_index)}")

    # The organization-type distribution is published at the respondent's own
    # declared granularity and tail-grouped like sector_top. Re-derive it from
    # the raw verbatim strings - never from the exporter's vocabulary table, so
    # a bug in that table cannot validate itself. Matching on the
    # (named, redacted, total) triple keeps this check free of a duplicated
    # 13-row label list: the numbers are what must be right.
    raw_named, raw_redacted = Counter(), Counter()
    for pid in truth.base:
        value = truth.people[pid]["organization_type"]
        (raw_redacted if pid in truth.redacted else raw_named)[value] += 1
    raw_total = {value: raw_named[value] + raw_redacted[value]
                 for value in set(raw_named) | set(raw_redacted)}
    big = {value for value, n in raw_total.items() if n >= MIN_SEGMENT_N}
    small = {value for value, n in raw_total.items() if n < MIN_SEGMENT_N}

    dist = docs["respondents"]["distributions"]["org_type_x_redaction"]
    rows = dist["rows"]
    typed = [row for row in rows if row["key"] != "tail"]
    tails = [row for row in rows if row["key"] == "tail"]
    totals = [row["total"] for row in typed]
    problems = []
    if any(row["named"] + row["redacted"] != row["total"] for row in rows):
        problems.append("a row's named + redacted does not equal its total")
    if sum(row["total"] for row in rows) != len(truth.base):
        problems.append(f"rows sum to {sum(row['total'] for row in rows)}, "
                        f"not the {len(truth.base)} analytical base")
    if any(row["total"] < MIN_SEGMENT_N for row in rows):
        problems.append("a published row sits under the disclosure threshold")
    if totals != sorted(totals, reverse=True):
        problems.append("type rows are not ranked largest first")
    want = sorted((raw_named[v], raw_redacted[v], raw_total[v]) for v in big)
    got = sorted((row["named"], row["redacted"], row["total"]) for row in typed)
    if want != got:
        problems.append(f"per-type splits {got} != db {want}")
    if len(tails) != (1 if small else 0):
        problems.append(f"{len(small)} sub-threshold types but {len(tails)} "
                        "tail rows")
    for row in tails:
        if (row["named"], row["redacted"], row["total"]) != (
                sum(raw_named[v] for v in small),
                sum(raw_redacted[v] for v in small),
                sum(raw_total[v] for v in small)):
            problems.append("the tail row does not aggregate exactly the "
                            "sub-threshold types")
        if f"({len(small)})" not in row["label"]:
            problems.append(f"tail label {row['label']!r} does not declare the "
                            f"{len(small)} types it groups")
    if dist["total"] != {"named": len(truth.named_base),
                         "redacted": len(truth.base) - len(truth.named_base)}:
        problems.append("the total block disagrees with the analytical base")
    report.check(not problems,
                 "org_type_x_redaction gives every self-declared type at or "
                 f"above {MIN_SEGMENT_N} its own row and groups the rest",
                 "; ".join(problems[:3]) if problems else
                 f"{len(typed)} types on their own row + {len(small)} grouped "
                 f"into one tail of {sum(raw_total[v] for v in small)}")

    named_leaks = []
    integrity = docs["integrity"]
    for cluster in integrity["text_clusters"]:
        for member in cluster["named_members"]:
            if member["id"] in truth.redacted:
                named_leaks.append(f"cluster {cluster['hash'][:8]}")
        if len(cluster["named_members"]) != cluster["n_named"]:
            named_leaks.append(f"cluster {cluster['hash'][:8]} n_named")
    for bloc in integrity["blocs"]:
        for member in bloc["member_ids_named"]:
            if member["id"] in truth.redacted:
                named_leaks.append(f"bloc {bloc['key']}")
    for row in integrity["audit"].get("rows", []):
        if row["id"] in truth.redacted:
            named_leaks.append(f"audit row {row['id']}")
    for family in integrity["families"]:
        for pid in family["ids"]:
            if pid in truth.redacted:
                named_leaks.append(f"family {family['name']}")
    for topic, sides in docs["quotes"].items():
        for side, quotes in sides.items():
            for quote in quotes:
                if quote["redacted"] and \
                        not str(quote["attribution"]).startswith("Redacted"):
                    named_leaks.append(f"quote {topic}/{side}")
    report.check(not named_leaks, "no redacted respondent is named anywhere",
                 "; ".join(named_leaks[:4]))

    report.check(not any("Redacted" == row["name"] for row in org_index),
                 "no org_index row is the literal placeholder name")

    excluded_rows = {row["id"]: row["reason"] for row in integrity["excluded"]}
    report.check(excluded_rows == HARD_EXCLUSIONS,
                 "integrity.excluded carries all five excluded respondents "
                 "with their adjudicated reason", f"{sorted(excluded_rows)}")
    named_excluded = {row["id"] for row in integrity["excluded"]
                      if row["name_or_redacted"] != "Redacted"}
    report.check(named_excluded == HARD_NAMED_EXCLUDED,
                 "the named excluded are {11, 14, 100}; 12 and 31 stay "
                 "redacted", f"{sorted(named_excluded)}")
    report.check((integrity["resubmission"]["dropped"],
                  integrity["resubmission"]["kept"]) == HARD_RESUBMISSION,
                 "the resubmission is 100 -> 151",
                 f"{len(integrity['resubmission']['changed'])} changed cells")

    blocs = {bloc["key"]: {member["id"]
                           for member in bloc["member_ids_named"]}
             for bloc in integrity["blocs"]}
    sizes = {bloc["key"]: len(bloc["member_ids_named"]) + bloc["n_redacted"]
             for bloc in integrity["blocs"]}
    derived = defaultdict(set)
    for pid in truth.base:
        key = truth.flags[pid]["template_bloc"]
        if key:
            derived[key].add(pid)
    problems = []
    for key, members in derived.items():
        if sizes.get(key) != len(members):
            problems.append(f"{key} has {sizes.get(key)}, P10 says "
                            f"{len(members)}")
        if blocs.get(key, set()) - (members - truth.redacted):
            problems.append(f"{key} names a non-member")
    for key, members in HARD_BLOCS.items():
        if derived.get(key) != members:
            problems.append(f"{key} membership {sorted(derived.get(key, []))} "
                            f"!= {sorted(members)}")
    report.check(not problems,
                 "blocs match data/derived, incl. the corrected 5-member "
                 "policy_insights_pack {43,47,60,79,82}",
                 "; ".join(problems[:3]) if problems else
                 ", ".join(f"{key}×{sizes[key]}" for key in sorted(sizes)))

    # Contract addition C5: the country *count* per bloc, never the country.
    # The largest bloc's country sits inside the country_4 "other" bucket and
    # all five members are redacted, so publishing the name would be fresh
    # attribute disclosure (P35 F6). The count carries the finding safely.
    problems = []
    country_of = {pid: row["country"] for pid, row in truth.people.items()}
    for bloc in integrity["blocs"]:
        members = derived.get(bloc["key"], set())
        want = len({country_of[pid] for pid in members if pid in country_of})
        if bloc.get("n_countries") != want:
            problems.append(f"{bloc['key']} n_countries "
                            f"{bloc.get('n_countries')} != {want}")
        if bloc.get("single_country") is not (want == 1):
            problems.append(f"{bloc['key']} single_country disagrees with "
                            f"n_countries={want}")
    single = [b["key"] for b in integrity["blocs"] if b.get("single_country")]
    report.check(not problems,
                 "blocs carry a country count, not a country name (contract C5)",
                 "; ".join(problems[:3]) if problems else
                 f"single-country blocs: {', '.join(sorted(single))}")

    # Contract addition C2: clusters overlap, so the spanned headcount is not
    # the sum of the rows and has to be published rather than inferred.
    spanned = len({pid for row in read_csv(DERIVED_DIR / "text_clusters.csv")
                   for pid in (int(part) for part
                               in row["member_ids"].split("|") if part)
                   if pid in truth.base})
    report.check(integrity.get("text_clusters_n_respondents") == spanned
                 == HARD_CLUSTER_RESPONDENTS,
                 f"text_clusters_n_respondents == {HARD_CLUSTER_RESPONDENTS} "
                 "distinct respondents (contract C2)",
                 f"json {integrity.get('text_clusters_n_respondents')} · "
                 f"data/derived {spanned} · "
                 f"{len(integrity['text_clusters'])} clusters")

    families = {family["name"]: family["ids"] for family in integrity["families"]}
    report.check(families == HARD_FAMILIES,
                 "entity families match P10 (Engie Impact 135/160)",
                 f"{families}")


# --- 6. quotes ---------------------------------------------------------------


def check_quotes(report: Report, truth: Truth, docs) -> None:
    report.section("6. quotes: verbatim, capped, attributed safely, badged")
    quotes = docs["quotes"]
    if not quotes:
        report.check(True, "quotes.json is empty (--allow-missing-curation)")
        return
    cluster_of = {}
    for row in read_csv(DERIVED_DIR / "text_clusters.csv"):
        members = {int(part) for part in row["member_ids"].split("|") if part}
        for number in (int(p) for p in row["question_numbers"].split("|") if p):
            for pid in members:
                cluster_of.setdefault((pid, f"Q{number:03d}"),
                                      row["cluster_hash"])

    bad, checked = [], 0
    org_type_keys = {value["key"] for value
                     in docs["meta"]["segments"]["org_type_5"]["values"]}
    taxonomy = {entry["key"] for entry in docs["themes"].get("taxonomy", [])}
    for topic, sides in quotes.items():
        if set(sides) != {"for", "against", "context"}:
            bad.append(f"{topic} sides {sorted(sides)}")
        for side, entries in sides.items():
            for quote in entries:
                checked += 1
                where = f"{topic}/{side} r{quote['respondent_id']} {quote['qid']}"
                pid, qid = quote["respondent_id"], quote["qid"]
                if pid not in truth.base_set:
                    bad.append(f"{where}: outside the analytical base")
                    continue
                stored = truth.answers.get(qid, {}).get(pid)
                if not verbatim_in(quote["text"], stored):
                    bad.append(f"{where}: not verbatim")
                if len(quote["text"]) > QUOTE_MAX:
                    bad.append(f"{where}: {len(quote['text'])} chars")
                if quote["redacted"] != (pid in truth.redacted):
                    bad.append(f"{where}: redaction flag wrong")
                if quote["org_type"] not in org_type_keys:
                    bad.append(f"{where}: org_type {quote['org_type']} is not "
                               "an org_type_5 key")
                if taxonomy and set(quote["themes"]) - taxonomy:
                    bad.append(f"{where}: themes outside the taxonomy")
                badge = quote.get("template_cluster")
                if badge is not None and cluster_of.get((pid, qid)) != badge:
                    bad.append(f"{where}: template badge {badge} is not this "
                               "answer's cluster")
                if badge is None and cluster_of.get((pid, qid)) is not None:
                    bad.append(f"{where}: missing template badge")
    report.check(not bad,
                 "every curated quote is verbatim, capped, base-only, "
                 "org_type_5-keyed and correctly badged",
                 "; ".join(bad[:3]) if bad else f"{checked} quotes checked")


# --- 7. themes ---------------------------------------------------------------


def check_themes(report: Report, truth: Truth, docs) -> None:
    report.section("7. themes: taxonomy closure, dedup ordering, and the "
                   "gotcha-4 exclusion filter")
    themes = docs["themes"]
    if not themes:
        report.check(True, "themes.json is empty (--allow-missing-curation)")
        return
    taxonomy = {entry["key"] for entry in themes["taxonomy"]}
    report.check(all(set(entry) == {"key", "label", "definition", "polarity"}
                     and entry["polarity"] in
                     ("concern", "support", "design", "neutral")
                     for entry in themes["taxonomy"]),
                 "taxonomy entries carry key/label/definition/polarity",
                 f"{len(taxonomy)} themes")

    filtered = defaultdict(lambda: defaultdict(set))
    preruling = 0
    excluded_coders = set()
    for row in read_csv(REFERENCE_DIR / "coded_themes.csv"):
        pid = int(row["respondent_id"])
        qid = f"Q{int(row['question_number']):03d}"
        if pid == HARD_PRERULING_CODED_ID:
            preruling += 1
        keys = [key for key in (row["theme_keys"] or "").split("|")
                if key and key != "uncodeable"]
        if pid not in truth.base_set and keys:
            excluded_coders.add(pid)
        for key in keys:
            if pid in truth.base_set:
                filtered[qid][key].add(pid)
    report.check(preruling == HARD_PRERULING_CODED_ROWS,
                 f"coded_themes.csv still carries ID {HARD_PRERULING_CODED_ID}'s "
                 f"{HARD_PRERULING_CODED_ROWS} pre-ruling rows (the exporter "
                 "filters them; the reference file is P21's and untouched)",
                 f"{preruling} rows")
    report.check(not excluded_coders,
                 "no excluded respondent contributes a theme code to any "
                 "count (manager note b)",
                 f"offenders {sorted(excluded_coders)}" if excluded_coders else
                 f"ID {HARD_PRERULING_CODED_ID}'s {HARD_PRERULING_CODED_ROWS} "
                 "rows are all `uncodeable`, so the filter's numeric effect on "
                 "themes.json is nil; it still removes them from n_coded and "
                 "the db base already excludes them from n_texts")

    problems, matched_filtered = [], 0
    for qid, block in themes["by_question"].items():
        n_texts = len(truth.answers.get(qid, {}))
        if block["n_texts"] != n_texts:
            problems.append(f"{qid} n_texts {block['n_texts']} != {n_texts}")
        if not block["n_coded"] <= block["n_texts"]:
            problems.append(f"{qid} n_coded > n_texts")
        got = {theme["key"]: theme["n"] for theme in block["themes"]}
        want = {key: len(ids) for key, ids in filtered[qid].items()}
        if got == want:
            matched_filtered += 1
        else:
            problems.append(f"{qid} counts != base-filtered coded_themes")
        for theme in block["themes"]:
            if theme["key"] not in taxonomy:
                problems.append(f"{qid}/{theme['key']} outside the taxonomy")
            if not theme["n_dedup"] <= theme["n"] <= block["n_texts"]:
                problems.append(f"{qid}/{theme['key']} n_dedup <= n <= n_texts")
            if theme["share_pct"] != pct(theme["n"], block["n_texts"]):
                problems.append(f"{qid}/{theme['key']} share_pct")
        order = [(-theme["n"], theme["key"]) for theme in block["themes"]]
        if order != sorted(order):
            problems.append(f"{qid} themes not sorted by n")
    report.check(not problems,
                 "per-question theme counts, dedup ordering and share_pct "
                 "re-derived from coded_themes.csv",
                 "; ".join(problems[:3]) if problems else
                 f"{matched_filtered} questions")


# --- 8. meta coverage --------------------------------------------------------


def check_meta(report: Report, truth: Truth, docs) -> None:
    report.section("8. meta coverage: questions, pages, option vocabularies, "
                   "polarity")
    meta = docs["meta"]
    entries = {entry["qid"]: entry for entry in meta["questions"]}
    report.check(set(entries) == set(truth.questions),
                 "meta.questions covers every substantive question and no "
                 "profile question",
                 f"{len(entries)} questions "
                 f"(missing {sorted(set(truth.questions) - set(entries))[:3]})")

    problems = []
    for qid, entry in entries.items():
        row = truth.questions[qid]
        for field in ("display", "shorthand", "label", "topic", "doc_section",
                      "asks_for"):
            if entry[field] != row[field]:
                problems.append(f"{qid}.{field}")
        if entry["type"] != row["question_type"]:
            problems.append(f"{qid}.type {entry['type']} != "
                            f"{row['question_type']}")
    report.check(not problems, "meta.questions repeats the db codebook exactly",
                 "; ".join(problems[:4]))

    pages = Counter(entry["page"] for entry in entries.values())
    report.check(None not in pages and len(pages) == 4,
                 "every question maps to one of the four Sec. 4 topic pages",
                 ", ".join(f"{page.split('/')[-1]}×{count}"
                           for page, count in sorted(pages.items())))

    problems = []
    for qid, entry in entries.items():
        db_texts = {row[0] for row in truth.con.execute(
            "SELECT option_text FROM question_options WHERE question_id = ?",
            (qid,))}
        declared = EXPORTER_OPTIONS.get(qid, ())
        if not db_texts:
            if entry["options"] or declared:
                problems.append(f"{qid} has options the db does not")
            continue
        # The declared vocabulary must be a bijection onto question_options:
        # same texts, no duplicate texts, no duplicate keys. This is what makes
        # it safe for the count checks above to key answers through it.
        declared_texts = [text for text, _k, _l, _s in declared]
        declared_keys = [key for _t, key, _l, _s in declared]
        if set(declared_texts) != db_texts:
            problems.append(
                f"{qid} declared vocabulary != question_options "
                f"(missing {sorted(db_texts - set(declared_texts))[:2]}, "
                f"extra {sorted(set(declared_texts) - db_texts)[:2]})")
            continue
        if len(set(declared_texts)) != len(declared_texts) or \
                len(set(declared_keys)) != len(declared_keys):
            problems.append(f"{qid} vocabulary is not one-for-one")
            continue
        if [option["key"] for option in entry["options"]] != declared_keys:
            problems.append(f"{qid} meta options differ from the declaration")
    report.check(not problems,
                 "every exported option vocabulary is a bijection onto "
                 "question_options (so the option keys cannot mis-name a "
                 "count)", "; ".join(problems[:3]))

    db_specials = {(row[0], row[1]) for row in truth.con.execute(
        "SELECT question_id, option_text FROM question_options "
        "WHERE is_special + 0 = 1")}
    problems = []
    for qid, entry in entries.items():
        flagged = {option["label"] for option in entry["options"]
                   if option.get("special")}
        want = {text for question_id, text in db_specials if question_id == qid}
        if len(flagged) != len(want):
            problems.append(f"{qid}: {len(flagged)} specials, db flags "
                            f"{len(want)}")
    report.check(not problems,
                 "special options (gotcha 6) are flagged exactly as "
                 "question_options.is_special does", "; ".join(problems[:3]))

    polarity = {qid: entry.get("polarity") for qid, entry in entries.items()
                if entry.get("polarity")}
    report.check(set(polarity) == {"Q019", "Q021", "Q024"}
                 and polarity["Q019"]["critical"] == "no"
                 and polarity["Q021"]["critical"] == "yes"
                 and polarity["Q024"]["critical"] == "lifetime",
                 "polarity is declared for exactly the three questions the "
                 "document takes a position on (Q31/Q33 judged neutral)",
                 ", ".join(f"{qid}:{value['critical']}"
                           for qid, value in sorted(polarity.items())))

    problems = []
    for qid in MATRIX_QIDS:
        ranks = [option.get("rank") for option in entries[qid]["options"]]
        if ranks != [3, 2, 1]:
            problems.append(f"{qid} ranks {ranks}")
    for qid, width in (("Q043", 5), ("Q045", 4)):
        ranks = [option.get("rank") for option in entries[qid]["options"]]
        if ranks != list(range(1, width + 1)):
            problems.append(f"{qid} ranks {ranks}")
    report.check(not problems,
                 "the stringency ladder is 3/2/1 and the granularity ladders "
                 "run coarse -> fine (gotcha 5)", "; ".join(problems[:3]))

    tests = meta["matrix"]["tests"]
    report.check([test["qid"] for test in tests] == list(MATRIX_QIDS)
                 and all(test["n"] == len(truth.answers.get(test["qid"], {}))
                         for test in tests),
                 "meta.matrix registers the nine tests with base-filtered n",
                 f"{len(tests)} tests")
    report.check(set(meta["scoreboards"]) == {"om", "bm", "weighting"}
                 and set(docs["scoreboard"]) == {"om", "bm", "weighting"},
                 "meta.scoreboards and scoreboard.json agree on the three "
                 "boards")
    report.check(meta["provisional"] is False
                 and meta["provisional_base"] is False,
                 "this export is neither curation-provisional nor "
                 "provisional-base")

    audit_problems = []
    audit = docs["integrity"]["audit"]
    audited = {row["id"]: row["audited"] for row in audit["rows"]}
    vocabulary = {entry["key"] for entry in audit["vocabulary"]}
    csv_rows = {int(row["respondent_id"]): row["audited_class"]
                for row in read_csv(REFERENCE_DIR / "org_audit.csv")}
    if set(audited) != set(truth.named_base):
        audit_problems.append("audit rows != named analytical base")
    for pid, klass in audited.items():
        if csv_rows.get(pid) != klass:
            audit_problems.append(f"{pid} audited class != org_audit.csv")
        if klass not in vocabulary:
            audit_problems.append(f"{pid} class outside the declared vocabulary")
    if any(len(row["basis"]) > BASIS_MAX for row in audit["rows"]):
        audit_problems.append("a basis string exceeds 200 chars")
    if audit["summary"]["n_rows"] != len(audit["rows"]) or \
            audit["summary"]["n_matching"] + audit["summary"]["n_diverging"] \
            != len(audit["rows"]):
        audit_problems.append("summary does not sum to the row count")
    if sum(row["n"] for row in audit["summary"]["by_class"]) != \
            len(audit["rows"]):
        audit_problems.append("by_class does not sum to the row count")
    index_class = {row["id"]: row["audited_class"]
                   for row in docs["respondents"]["org_index"]}
    if any(index_class[pid] != klass for pid, klass in audited.items()):
        audit_problems.append("org_index.audited_class disagrees with the audit")
    report.check(not audit_problems,
                 "the audit block covers the 105 named base respondents and "
                 "agrees with org_audit.csv and org_index",
                 "; ".join(audit_problems[:3]) if audit_problems else
                 f"{len(audited)} rows, "
                 f"{audit['summary']['n_diverging']} diverging")


def check_org_files(report: Report, truth: Truth, docs) -> None:
    report.section("8b. org profiles: shape, answer coverage, survey order")
    org_keys = {"id", "name", "org_type", "audited_class", "audit_basis",
                "sector", "country", "responding_as", "flags", "answers"}
    answer_keys = {"qid", "display", "shorthand", "label", "type", "text",
                   "selections"}
    flag_keys = {"template", "family", "cites", "citation_count"}
    survey_order = [row[0] for row in truth.con.execute(
        "SELECT question_id FROM questions WHERE question_number >= 18 "
        "ORDER BY question_number, sub_number")]
    position = {qid: index for index, qid in enumerate(survey_order)}

    problems = []
    for pid in truth.named_base:
        org = json.loads((ORGS_DIR / f"{pid}.json").read_text(encoding="utf-8"))
        if set(org) != org_keys or set(org["flags"]) != flag_keys:
            problems.append(f"{pid} keys")
            continue
        qids = [answer["qid"] for answer in org["answers"]]
        expected = [qid for qid in survey_order
                    if pid in truth.answers.get(qid, {})]
        if qids != expected:
            problems.append(f"{pid}: {len(qids)} answers, expected "
                            f"{len(expected)}")
        if qids != sorted(qids, key=lambda qid: position[qid]):
            problems.append(f"{pid} answers out of survey order")
        for answer in org["answers"]:
            if set(answer) != answer_keys:
                problems.append(f"{pid} answer {answer['qid']} keys")
                break
            free_text = answer["type"] == "free_text"
            if free_text and (answer["text"] is None or answer["selections"]):
                problems.append(f"{pid} {answer['qid']} free text shape")
                break
            if not free_text and (answer["text"] is not None
                                  or not answer["selections"]):
                problems.append(f"{pid} {answer['qid']} choice shape")
                break
    report.check(not problems,
                 "every org profile carries its answers in survey order with "
                 "the contracted keys",
                 "; ".join(problems[:3]) if problems else
                 f"{len(truth.named_base)} profiles")

    index = {row["id"]: row for row in docs["respondents"]["org_index"]}
    problems = []
    for pid, row in index.items():
        fingerprint = row["fingerprint"]
        expected = truth.flags[pid]["stance_fingerprint"]
        got = "".join(
            "-" if fingerprint[field] is None
            else fingerprint[field][0].upper()
            for field in ("q19", "q21", "q24", "q31", "q33"))
        if got != (expected or ""):
            problems.append(f"{pid}: {got} != P10 {expected}")
    report.check(not problems,
                 "org_index fingerprints agree with P10's stance_fingerprint",
                 "; ".join(problems[:3]) if problems
                 else f"{len(index)} rows")


# --- 9. budgets --------------------------------------------------------------


def check_budgets(report: Report) -> None:
    report.section("9. size budgets")
    sizes = [(path.stat().st_size, path.name)
             for path in sorted(DATA_DIR.glob("*.json"))]
    sizes.sort(reverse=True)
    report.check(all(size <= FILE_BUDGET for size, _name in sizes),
                 f"every top-level file is <= {FILE_BUDGET // 1024} KB",
                 f"largest {sizes[0][1]} at {sizes[0][0] / 1024:.1f} KB")
    org_sizes = [(path.stat().st_size, path.name)
                 for path in ORGS_DIR.glob("*.json")]
    org_sizes.sort(reverse=True)
    report.check(all(size <= ORG_BUDGET for size, _name in org_sizes),
                 f"every orgs/*.json is <= {ORG_BUDGET // 1024} KB",
                 f"largest orgs/{org_sizes[0][1]} at "
                 f"{org_sizes[0][0] / 1024:.1f} KB")
    print(f"       orgs/ total {sum(s for s, _n in org_sizes) / 1024:.1f} KB "
          f"across {len(org_sizes)} lazy-loaded files")


def main() -> int:
    if not DATA_DIR.is_dir():
        print("validate_frontend_data: frontend/data does not exist - run "
              "export_frontend.py first", file=sys.stderr)
        return 1
    con = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    report = Report()
    print(f"validate_frontend_data: checking {rel(DATA_DIR)} against "
          f"{rel(DB_PATH)} on the analytical base from "
          f"{rel(REFERENCE_DIR / 'exclusions.csv')}")
    try:
        docs = check_files(report)
        if not set(FILES).issubset(docs):
            print("\nvalidate_frontend_data: FAILED - missing or unparseable "
                  f"files: {sorted(set(FILES) - set(docs))}", file=sys.stderr)
            return 1
        truth = Truth(con)
        check_cells(report, truth, docs)
        check_mask(report, docs)
        check_hard_numbers(report, truth, docs)
        check_exclusion_invariant(report, truth, docs)
        check_quotes(report, truth, docs)
        check_themes(report, truth, docs)
        check_meta(report, truth, docs)
        check_org_files(report, truth, docs)
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
