#!/usr/bin/env python3
"""Standard Supply Service (SSS): theme-coding inputs and frontend export.

    python3 scripts/analytics/sss.py snippets OUT_DIR
        Write every respondent's SSS free text (Q99-Q112, each answer capped) plus
        passages (±400 chars) mentioning SSS / standard supply in any other answer,
        as JSON batches for hand coding against reference/sss_codebook.md.

    python3 scripts/analytics/sss.py export
        Join the coded themes (data/derived/sss_themes.csv) to Q97-Q109 answers and
        respondent profiles and write frontend/data/sss.json (+ fixture copy).

Standard library only. Reruns are byte-identical.
"""
from __future__ import annotations

import csv
import json
import re
import sqlite3
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from export_frontend import COUNTRY_TOP_N, MIN_SEGMENT_N, ORG_TYPES, truncate  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
DB = ROOT / "data" / "scope2_consultation.sqlite"
CODED = ROOT / "data" / "derived" / "sss_themes.csv"
OUT = ROOT / "frontend" / "data" / "sss.json"
FIXTURE = ROOT / "frontend" / "data" / "fixtures" / "sss.json"
NAMES = ROOT / "reference" / "additionality_org_names.csv"  # hand-cleaned display names
SSS_NAMES = ROOT / "reference" / "sss_org_names.csv"        # additions for this page

SSS_QS = ("Q099", "Q101", "Q102", "Q103", "Q105", "Q106", "Q108", "Q110", "Q111", "Q112")
MENTION = re.compile(r"\bSSS\b|standard[- ]supply", re.I)
EMPTY = re.compile(r"^\W*(n/?a|na|none|no|nil|无|-+|no comments?|not applicable|no opinion|"
                   r"we have chosen not to answer this question|n/a,? see .{0,40})\W*$", re.I)
CAP = 3000
N_BATCHES = 8

CHALLENGES = ["definition", "data", "market_fit", "comparability", "double_count",
              "cost_allocation", "burden", "interaction"]
PRINCIPLE = ["crowd_out", "blurs_lbm", "not_customer_claim", "regional_windfall", "too_weak"]
REMEDIES = ["phase_in", "disclose", "self_estimate", "optional", "vintage", "registry_first",
            "guidance", "drop"]
THEMES = CHALLENGES + PRINCIPLE + REMEDIES


def substantive(t: str) -> bool:
    return bool(t) and len(t.strip()) >= 15 and not EMPTY.match(t.strip())


def corpus(con):
    """respondent -> list of {q, text}: SSS answers plus SSS passages elsewhere."""
    per = defaultdict(list)
    for rid, q, t in con.execute("SELECT respondent_id, question_id, answer_text FROM v_free_text "
                                 "ORDER BY respondent_id, question_id"):
        if not substantive(t):
            continue
        if q in SSS_QS:
            per[rid].append({"q": q, "text": t[:CAP]})
            continue
        spans = []
        for m in MENTION.finditer(t):
            s, e = max(0, m.start() - 400), min(len(t), m.end() + 400)
            if spans and s <= spans[-1][1]:
                spans[-1][1] = e
            else:
                spans.append([s, e])
        for s, e in spans:
            per[rid].append({"q": q, "text": t[s:e]})
    return per


def cmd_snippets(out_dir: Path) -> None:
    con = sqlite3.connect(DB)
    per = corpus(con)
    ids = sorted(per)
    out_dir.mkdir(parents=True, exist_ok=True)
    size = -(-len(ids) // N_BATCHES)
    for b in range(N_BATCHES):
        chunk = [{"respondent_id": i, "snippets": per[i]} for i in ids[b * size:(b + 1) * size]]
        (out_dir / f"b{b}.json").write_text(json.dumps(chunk, indent=1, ensure_ascii=False))
    print(f"{len(ids)} respondents -> {out_dir}")


ORG_LABEL = {value: label for value, _slug, label in ORG_TYPES}
SHARED_MIN = 3   # an answer shared verbatim (first 200 chars) by this many respondents = shared wording
Q100_PRINCIPLE = ("Markets should self-determine", "All contractual instruments")


def bucket(x):
    if x is None:
        return "none"
    return "support" if x >= 4 else "oppose" if x <= 2 else "neutral"


def pct(n, d):
    return round(100.0 * n / d, 1) if d else 0.0


def cmd_export() -> None:
    con = sqlite3.connect(DB)
    resp = {r[0]: {"org": r[1], "redacted": int(r[2]), "name": r[3], "country": r[4], "as": r[5]}
            for r in con.execute("SELECT respondent_id, organization_type, is_redacted, organization, "
                                 "country, responding_as FROM respondents")}
    N = len(resp)

    def scores(q):
        return {r[0]: float(r[1]) for r in con.execute(
            "SELECT respondent_id, answer_numeric FROM responses WHERE question_id=? "
            "AND answer_numeric IS NOT NULL", (q,))}

    q97, q71, q83 = scores("Q097"), scores("Q071"), scores("Q083")
    st = {i: bucket(x) for i, x in q97.items()}
    STANCES = ("support", "neutral", "oppose")

    def split(ids):
        c = Counter(st[i] for i in ids if i in st)
        return {"answered": sum(c.values()), **{k: c.get(k, 0) for k in STANCES}}

    sel = defaultdict(lambda: defaultdict(set))
    for rid, q, opt in con.execute("SELECT respondent_id, question_id, option_text FROM response_selections "
                                   "WHERE question_id IN ('Q098','Q100','Q104','Q109') AND is_canonical=1"):
        sel[q][opt].add(rid)
    q107 = {r[0]: r[1] for r in con.execute(
        "SELECT respondent_id, answer_text FROM responses WHERE question_id='Q107'")}

    def options(q):
        base = set().union(*sel[q].values())
        rows = [{"option": o, "n": len(ids), "pct": pct(len(ids), len(base)), **split(ids),
                 "no_q97": len(ids - set(st))} for o, ids in sel[q].items()]
        rows.sort(key=lambda r: (-r["n"], r["option"]))
        return {"base": len(base), "rows": rows}

    q100_base = set().union(*sel["Q100"].values())
    principle_ids = {i for o, ids in sel["Q100"].items() if o.startswith(Q100_PRINCIPLE) for i in ids}
    feas_ids = {i for o, ids in sel["Q100"].items() if not o.startswith(Q100_PRINCIPLE + ("Other",)) for i in ids}

    # --- coded free text -----------------------------------------------------
    coded = {int(r["respondent_id"]): r for r in csv.DictReader(CODED.open(encoding="utf-8"))}
    per = corpus(con)
    assert set(coded) == set(per), "coded file out of sync with corpus"
    first = defaultdict(set)
    for rid, items in per.items():
        for it in items:
            if it["q"] in SSS_QS and len(it["text"]) >= 120:
                first[re.sub(r"\W+", " ", it["text"][:200].lower()).strip()].add(rid)
    shared = {i for ids in first.values() if len(ids) >= SHARED_MIN for i in ids}

    substantive_ids = {i for i, r in coded.items() if r["text_stance"] != "neutral" or any(r[t] == "1" for t in THEMES)}
    has = {t: {i for i, r in coded.items() if r[t] == "1"} for t in THEMES}

    def theme_rows(keys):
        out = []
        for t in keys:
            ids = has[t]
            c = Counter(coded[i]["text_stance"] for i in ids)
            out.append({"key": t, "n": len(ids), "pct": pct(len(ids), len(substantive_ids)),
                        "by_text": {k: c.get(k, 0) for k in ("support", "conditional", "oppose", "neutral")},
                        "by_q97": split(ids), "shared": len(ids & shared)})
        return out

    text_stance = Counter(r["text_stance"] for r in coded.values())

    # --- segments --------------------------------------------------------------
    def dim(label_of, top_n=None, other="Other"):
        totals = Counter(label_of(i) for i in st)
        ordered = sorted(totals.items(), key=lambda kv: (-kv[1], kv[0]))
        keep = {k for k, n in (ordered[:top_n] if top_n else ordered) if n >= MIN_SEGMENT_N}
        rows = []
        for value in [k for k, _ in ordered if k in keep] + [other]:
            members = {i for i in resp if (label_of(i) if label_of(i) in keep else other) == value}
            s = split(members)
            if not s["answered"]:
                continue
            row = {"label": value, **s}
            m = members & substantive_ids
            row["coded"] = len(m)
            for t in THEMES:
                row[t] = len(m & has[t])
            rows.append(row)
        return rows

    segments = {
        "org_type": dim(lambda i: ORG_LABEL[resp[i]["org"]], other="Smaller types"),
        "country": dim(lambda i: resp[i]["country"], COUNTRY_TOP_N, "Other countries"),
    }

    # --- SSS vs the rest of the package --------------------------------------
    def cross(other):
        c = Counter((bucket(other.get(i)), st[i]) for i in st if i in other)
        return {a: {b: c.get((a, b), 0) for b in STANCES} for a in STANCES}

    # --- names ---------------------------------------------------------------
    overrides = {}
    for f in (NAMES, SSS_NAMES):
        if f.exists():
            overrides.update({int(r["respondent_id"]): r["display_name"] for r in csv.DictReader(f.open(encoding="utf-8"))})

    def display_name(i):
        if i in overrides:
            return overrides[i]
        name = resp[i]["name"] or ""
        if ": " in name and len(name) > 80:
            name = name.split(": ", 1)[0]
        return truncate(name, 80)

    def nameable(i):
        return not resp[i]["redacted"] and resp[i]["as"] == "Organization" and bool(display_name(i))

    named = []
    for i in sorted(coded):
        if not nameable(i) or i not in substantive_ids:
            continue
        r = coded[i]
        named.append({"id": i, "name": display_name(i), "org_type": ORG_LABEL[resp[i]["org"]],
                      "country": resp[i]["country"], "q97": int(q97[i]) if i in q97 else None,
                      "text_stance": r["text_stance"], "themes": [t for t in THEMES if r[t] == "1"],
                      "quote": r["quote"].strip()})

    def quotes(ids, limit=6):
        rows = {}
        for i in sorted(ids):
            q = coded[i]["quote"].strip(" \"'•-\n")
            if len(q) < 25:
                continue
            k = re.sub(r"\W+", " ", q.lower()).strip()[:60]
            row = rows.setdefault(k, {"quote": q, "orgs": [], "n_unnamed": 0, "n": 0})
            row["n"] += 1
            if nameable(i):
                row["orgs"].append(display_name(i))
            else:
                row["n_unnamed"] += 1
        out = [r for r in rows.values() if r["orgs"]]
        for r in out:
            r["orgs"] = sorted(set(r["orgs"]))
        out.sort(key=lambda r: (-r["n"], r["orgs"][0]))
        return out[:limit]

    data = {
        "_comment": "Generated by scripts/analytics/sss.py export. Q97 support = 4-5, oppose = 1-2. Themes are "
                    "hand-coded from free text (reference/sss_codebook.md).",
        "totals": {"respondents": N, "q97_answered": len(st), "coded": len(coded), "substantive": len(substantive_ids),
                   "shared_wording": len(shared & substantive_ids)},
        "q97": {**split(st), "hist": [sum(1 for x in q97.values() if int(x) == k) for k in range(1, 6)]},
        "q100": {**options("Q100"), "by_q97": split(q100_base),
                 "supporters_with_concerns": len(q100_base & {i for i in st if st[i] == "support"}),
                 "feasibility_only": split(feas_ids - principle_ids), "principle": split(principle_ids)},
        "q98": options("Q098"),
        "q104": options("Q104"),
        "q109": options("Q109"),
        "q107": {a: split({i for i, v in q107.items() if v == a}) | {"n": sum(1 for v in q107.values() if v == a)}
                 for a in ("Yes", "No", "Unsure")},
        "text_stance": {k: text_stance.get(k, 0) for k in ("support", "conditional", "oppose", "neutral")},
        "themes": {"challenges": theme_rows(CHALLENGES), "principle": theme_rows(PRINCIPLE),
                   "remedies": theme_rows(REMEDIES)},
        "segments": segments,
        "package": {"hourly": cross(q71), "deliverability": cross(q83)},
        "named": named,
        "quotes": {t: quotes(has[t]) for t in THEMES},
        "confidence": dict(sorted(Counter(r["confidence"] for r in coded.values()).items())),
    }
    for p in (OUT, FIXTURE):
        p.write_text(json.dumps(data, sort_keys=True, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(json.dumps({k: data[k] for k in ("totals", "q97", "text_stance")}, indent=1))


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "snippets":
        cmd_snippets(Path(sys.argv[2]))
    elif len(sys.argv) == 2 and sys.argv[1] == "export":
        cmd_export()
    else:
        sys.exit(__doc__)
