#!/usr/bin/env python3
"""Emissions impact / causality: mention detection, stance-coding inputs, frontend export.

The survey asks one closed question on impact (Q146: would a separate impact
metric outside scope 2 change your view?) with gated follow-ups (Q147-Q151).
Everything else is unprompted free text. Two steps:

    python3 scripts/analytics/impact.py snippets OUT_DIR
        Find respondents whose free text uses the impact family of terms and
        write their passages (±350 chars around each match) as JSON batches for
        coding against reference/impact_codebook.md. Respondents whose passages
        are identical (shared templates) are written once as one unit.

    python3 scripts/analytics/impact.py export
        Join the coded stances (data/derived/impact_stance.csv) to Q146-Q150,
        Q71/Q83, the additionality stances and respondent profiles, and write
        frontend/data/impact.json (+ its fixture copy).

    python3 scripts/analytics/impact.py merge OUT_DIR
        Expand the coders' per-unit CSVs (OUT_DIR/out_b*.csv) to one row per
        respondent in data/derived/impact_stance.csv.

Mention families
----------------
impact        "emissions / climate / carbon / decarbonization / real-world / grid /
              system / environmental / GHG impact", "impact metric / accounting /
              method / -based / claims / reporting", "impactful". Bare "impact" never
              matches: the survey's own "integrity, impact and feasibility" criterion
              is echoed in hundreds of answers and says nothing about measuring it.
causal        causal / causality / causation, "would not otherwise".
consequential consequential, avoided emissions, marginal emissions / emission rates,
              emissionality.
additional    additionality / non-additional / incrementality.

Standard library only. Reruns are byte-identical.
"""
from __future__ import annotations

import csv
import hashlib
import json
import re
import sqlite3
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from additionality import NAMES, ORG_LABEL, camp, overall  # noqa: E402
from export_frontend import (COUNTRY_TOP_N, MIN_SEGMENT_N,  # noqa: E402
                             SECTOR_TOP_N, SECTORS, truncate)

ROOT = Path(__file__).resolve().parents[2]
DB = ROOT / "data" / "scope2_consultation.sqlite"
CODED = ROOT / "data" / "derived" / "impact_stance.csv"
ADD_CODED = ROOT / "data" / "derived" / "additionality_stance.csv"
OVERRIDES = ROOT / "reference" / "impact_overrides.csv"  # consistency pass over shared templates
OUT = ROOT / "frontend" / "data" / "impact.json"
FIXTURE = ROOT / "frontend" / "data" / "fixtures" / "impact.json"

_Q = r"(?:emissions?|climate|carbon|decarboni[sz]ation|real[- ]world|grid|system|environmental|ghg|abatement|mitigation)"
PATTERNS = {
    "impact": [re.compile(r"\b%s\s+impacts?\b" % _Q, re.I),
               re.compile(r"\bimpact[- ](?:based|accounting|claims?|metrics?|reporting|methods?|methodology|"
                          r"disclosures?|measurement|quantification)\b", re.I),
               re.compile(r"\bimpactful\b", re.I)],
    "causal": [re.compile(r"\bcaus(?:al|ality|ation|ally)\b", re.I),
               re.compile(r"would\s*(?:n['o]t|not)\s+otherwise\b", re.I)],
    "consequential": [re.compile(r"\bconsequential\b", re.I),
                      re.compile(r"\bavoided\s+emissions?\b", re.I),
                      re.compile(r"\bmarginal\s+(?:emissions?|emission\s+(?:rates?|factors?)|abatement|carbon|intensit)", re.I),
                      re.compile(r"\bemissionality\b", re.I)],
    "additional": [re.compile(r"\b(?:non-?)?additionalit(?:y|ies)\b|\bnon-?additional\b", re.I),
                   re.compile(r"\bincrementalit(?:y|ies)\b", re.I)],
}
FAMILIES = list(PATTERNS)
IMPACT_QS = ("Q148", "Q149", "Q151")  # free text that answers the impact-metric questions
WINDOW = 350
CAP = 7000          # chars of passage text per respondent sent to coders
N_BATCHES = 8
Q146_KEY = {"Yes": "yes", "Somewhat": "somewhat", "No": "no",
            "I do not support the development of impact metrics outside the scope 2 inventory.": "oppose_outside"}


def free_text(con):
    return con.execute("SELECT respondent_id, question_id, answer_text FROM v_free_text").fetchall()


def matches(text: str):
    """Yield (family, start, end) for every mention in text."""
    for fam, pats in PATTERNS.items():
        for p in pats:
            for m in p.finditer(text or ""):
                yield fam, m.start(), m.end()


def passages(con):
    """respondent -> list of {q, families, text}, impact-question answers first."""
    per = defaultdict(list)
    for rid, q, t in free_text(con):
        spans = sorted((max(0, s - WINDOW), min(len(t), e + WINDOW), f) for f, s, e in matches(t))
        merged = []
        for s, e, f in spans:
            if merged and s <= merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], e)
                merged[-1][2].add(f)
            else:
                merged.append([s, e, {f}])
        for s, e, fs in merged:
            per[rid].append({"q": q, "families": ",".join(sorted(fs)), "text": t[s:e]})
    for rid in per:
        per[rid].sort(key=lambda p: (p["q"] not in IMPACT_QS, p["q"]))
    return per


def cmd_snippets(out_dir: Path) -> None:
    con = sqlite3.connect(DB)
    per = passages(con)
    units = {}  # passage hash -> unit
    for rid in sorted(per):
        kept, n = [], 0
        for p in per[rid]:
            if n >= CAP:
                break
            kept.append({**p, "text": p["text"][:CAP - n]})
            n += len(kept[-1]["text"])
        key = hashlib.sha1(json.dumps([p["text"] for p in kept]).encode()).hexdigest()
        unit = units.setdefault(key, {"unit": f"u{len(units) + 1:03d}", "respondent_ids": [], "snippets": kept})
        unit["respondent_ids"].append(rid)
    out_dir.mkdir(parents=True, exist_ok=True)
    ordered = list(units.values())
    size = -(-len(ordered) // N_BATCHES)
    for b in range(N_BATCHES):
        chunk = ordered[b * size:(b + 1) * size]
        (out_dir / f"b{b}.json").write_text(json.dumps(chunk, indent=1, ensure_ascii=False))
    print(f"{len(per)} respondents, {len(units)} distinct units -> {out_dir}")


def pct(n, d):
    return round(100.0 * n / d, 1) if d else 0.0


def cmd_export() -> None:
    con = sqlite3.connect(DB)
    resp = {r[0]: {"org": r[1], "redacted": int(r[2]), "name": r[3], "country": r[4],
                   "sector": r[5], "as": r[6]} for r in
            con.execute("SELECT respondent_id, organization_type, is_redacted, organization, country, "
                        "sector, responding_as FROM respondents")}
    N = len(resp)
    rows = free_text(con)
    texts = defaultdict(list)
    fam_of = defaultdict(set)
    for rid, _q, t in rows:
        texts[rid].append(t or "")
        for f, _s, _e in matches(t):
            fam_of[rid].add(f)

    coded = {int(r["respondent_id"]): r for r in csv.DictReader(CODED.open())}
    assert set(coded) == set(fam_of), "coded file out of sync with mention patterns"
    for i, r in coded.items():
        if r["quote"]:
            assert any(r["quote"] in t for t in texts[i]), f"quote for {i} is not verbatim"

    stance = {i: r["stance"] for i, r in coded.items()}
    STANCES = ("support", "mixed", "oppose", "neutral")
    sup = {i for i, s in stance.items() if s == "support"}
    opp = {i for i, s in stance.items() if s == "oppose"}
    mixed = {i for i, s in stance.items() if s == "mixed"}

    def counts(ids, field, values):
        c = Counter(coded[i][field] for i in ids)
        return {v: c.get(v, 0) for v in values}

    score = {}
    for q in ("Q071", "Q083"):
        score[q] = {r[0]: float(r[1]) for r in con.execute(
            "SELECT respondent_id, answer_numeric FROM responses WHERE question_id=? AND answer_numeric IS NOT NULL", (q,))}
    camp_of = {i: camp(score["Q071"].get(i), score["Q083"].get(i)) for i in resp}
    CAMPS = ("pro_both", "split", "skipped", "anti_both")

    q146 = {r[0]: Q146_KEY[r[1]] for r in con.execute(
        "SELECT respondent_id, answer_text FROM responses WHERE question_id='Q146'")}
    Q146_VALUES = ("yes", "somewhat", "no", "oppose_outside")

    def q146_split(ids):
        c = Counter(q146[i] for i in ids if i in q146)
        return {"answered": sum(c.values()), **{v: c.get(v, 0) for v in Q146_VALUES}}

    def picks(q, gate):
        out = Counter()
        for rid, opt in con.execute("SELECT respondent_id, option_text FROM response_selections "
                                    "WHERE question_id=? AND is_canonical=1", (q,)):
            if q146.get(rid) in gate:
                out[opt] += 1
        n = sum(1 for i in q146 if q146[i] in gate)
        return {"n": n, "options": [{"text": k, "n": v} for k, v in sorted(out.items(), key=lambda kv: (-kv[1], kv[0]))]}

    add = {int(r["respondent_id"]): overall(r) for r in csv.DictReader(ADD_CODED.open())}
    overlap = sorted(set(add) & set(coded))
    agree = Counter((add[i], stance[i]) for i in overlap)

    data = {
        "_comment": "Generated by scripts/analytics/impact.py export. Stances are AI-coded against "
                    "reference/impact_codebook.md; hourly = Q71, deliverability = Q83, support = 4-5. "
                    "Q146 = would a separate impact metric outside scope 2 change your view.",
        "totals": {"respondents": N, "with_free_text": len(texts), "q146_answered": len(q146)},
        "mentions": {**{f: sum(1 for i in fam_of if f in fam_of[i]) for f in FAMILIES},
                     "any": len(fam_of),
                     "beyond_additional": sum(1 for i in fam_of if fam_of[i] - {"additional"})},
        "stance": {"all": counts(coded, "stance", STANCES),
                   **{f: counts([i for i in coded if f in fam_of[i]], "stance", STANCES) for f in FAMILIES}},
        "confidence": dict(sorted(Counter(r["confidence"] for r in coded.values()).items())),
        "venue": {"support": counts(sup, "venue", ("inventory", "separate", "both", "unspecified")),
                  "mixed": counts(mixed, "venue", ("inventory", "separate", "both", "unspecified"))},
        "form": counts(sup | mixed, "form", ("marginal", "additionality", "avoided", "general")),
        "oppose_reason": {"oppose": counts(opp, "oppose_reason", ("method", "attributional", "greenwash", "diverts", "other")),
                          "mixed": counts(mixed, "oppose_reason", ("method", "attributional", "greenwash", "diverts", "other", "na"))},
        "camps": {g: {c: sum(1 for i in ids if camp_of[i] == c) for c in CAMPS} for g, ids in (
            ("support", sup), ("inventory", {i for i in sup if coded[i]["venue"] in ("inventory", "both")}),
            ("separate", {i for i in sup if coded[i]["venue"] == "separate"}),
            ("oppose", opp), ("all", set(resp)))},
        "q146": {"all": q146_split(resp),
                 **{"camp_" + c: q146_split({i for i in resp if camp_of[i] == c}) for c in CAMPS},
                 **{"stance_" + s: q146_split({i for i in coded if stance[i] == s}) for s in STANCES},
                 "not_coded": q146_split(set(resp) - set(coded))},
        "q146_by_venue": {v: q146_split({i for i in sup if coded[i]["venue"] == v})
                          for v in ("inventory", "both", "separate", "unspecified")},
        "q147": picks("Q147", {"yes", "somewhat"}),
        "q150": picks("Q150", {"oppose_outside"}),
        "additionality_overlap": {"n": len(overlap),
                                  "cells": [{"additionality": a, "impact": b, "n": n}
                                            for (a, b), n in sorted(agree.items())]},
    }

    # --- demographics ----------------------------------------------------------
    groups = {"support": sup, "inventory": {i for i in sup if coded[i]["venue"] in ("inventory", "both")},
              "separate": {i for i in sup if coded[i]["venue"] == "separate"}, "oppose": opp,
              "q146_yes": {i for i in q146 if q146[i] in ("yes", "somewhat")},
              "q146_oppose": {i for i in q146 if q146[i] == "oppose_outside"}}

    def dim(label_of, top_n=None, other="Other"):
        totals = Counter(label_of(i) for i in resp)
        ordered = sorted(totals.items(), key=lambda kv: (-kv[1], kv[0]))
        keep = {k for k, n in (ordered[:top_n] if top_n else ordered) if n >= MIN_SEGMENT_N}
        lab = {i: (label_of(i) if label_of(i) in keep else other) for i in resp}
        out = []
        for value in [k for k, _ in ordered if k in keep] + ([other] if other in lab.values() else []):
            members = {i for i in resp if lab[i] == value}
            out.append({"label": value, "n": len(members), **{g: len(members & ids) for g, ids in groups.items()}})
        return out

    sector_label = {v: lab for v, (_slug, lab) in SECTORS.items()}
    data["demographics"] = {
        "org_type": dim(lambda i: ORG_LABEL[resp[i]["org"]], other="Smaller types"),
        "country": dim(lambda i: resp[i]["country"], COUNTRY_TOP_N, "Other countries"),
        "sector": dim(lambda i: sector_label[resp[i]["sector"]], SECTOR_TOP_N, "Other sectors"),
    }

    # --- named organisations and attributed quotes ----------------------------
    overrides = {int(r["respondent_id"]): r["display_name"] for r in csv.DictReader(NAMES.open())}

    def display_name(i):
        if i in overrides:
            return overrides[i]
        name = resp[i]["name"] or ""
        if ": " in name and len(name) > 80:
            name = name.split(": ", 1)[0]
        return truncate(name, 80)

    def nameable(i):
        return not resp[i]["redacted"] and resp[i]["as"] == "Organization" and bool(display_name(i))

    data["named"] = [{"id": i, "name": display_name(i), "org_type": ORG_LABEL[resp[i]["org"]],
                      "country": resp[i]["country"], "stance": stance[i], "venue": coded[i]["venue"],
                      "form": coded[i]["form"], "oppose_reason": coded[i]["oppose_reason"],
                      "camp": camp_of[i], "q146": q146.get(i, "")}
                     for i in sorted(sup | opp | mixed) if nameable(i)]
    data["unnamed"] = {k: {"redacted": sum(resp[i]["redacted"] for i in ids),
                           "individual": sum(1 for i in ids if not resp[i]["redacted"] and resp[i]["as"] != "Organization"),
                           "unidentifiable": sum(1 for i in ids if not resp[i]["redacted"] and resp[i]["as"] == "Organization"
                                                 and not display_name(i))}
                       for k, ids in (("support", sup), ("oppose", opp), ("mixed", mixed))}

    def named_quotes(ids, limit=8):
        out = {}
        for i in sorted(ids):
            q = coded[i]["quote"].strip()
            if not q:
                continue
            k = re.sub(r"\W+", " ", q.lower()).strip()[:60]
            row = out.setdefault(k, {"quote": q, "orgs": [], "n_unnamed": 0, "n": 0})
            row["n"] += 1
            if nameable(i):
                row["orgs"].append(display_name(i))
            else:
                row["n_unnamed"] += 1
        res = [r for r in out.values() if r["orgs"]]
        for r in res:
            r["orgs"] = sorted(set(r["orgs"]))
        res.sort(key=lambda r: (-r["n"], r["orgs"][0]))
        return res[:limit]

    data["quotes"] = {"inventory": named_quotes(groups["inventory"]),
                      "separate": named_quotes(groups["separate"]),
                      "oppose": named_quotes(opp),
                      "mixed": named_quotes(mixed)}

    for p in (OUT, FIXTURE):
        p.write_text(json.dumps(data, sort_keys=True, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(json.dumps({k: data[k] for k in ("mentions", "stance", "venue")}, indent=1))


def cmd_merge(in_dir: Path) -> None:
    """Expand coder output (one row per unit) to data/derived/impact_stance.csv (one row per respondent)."""
    units = {}
    for f in sorted(in_dir.glob("b*.json")):
        for u in json.loads(f.read_text()):
            units[u["unit"]] = u
    out = []
    for f in sorted(in_dir.glob("out_b*.csv")):
        for r in csv.DictReader(f.open()):
            u = units[r["unit"]]
            fams = sorted({x for s in u["snippets"] for x in s["families"].split(",")})
            for rid in u["respondent_ids"]:
                out.append({"respondent_id": rid, "unit": r["unit"], "families": ",".join(fams),
                            **{k: r[k].strip() for k in ("stance", "venue", "form", "oppose_reason", "confidence", "quote")}})
    assert len({r["unit"] for r in out}) == len(units), "missing units in coder output"
    # Shared templates get one code; quotes are re-anchored to the stored text
    # (coders normalise line breaks and curly quotes).
    rules = list(csv.DictReader(OVERRIDES.open()))
    con = sqlite3.connect(DB)
    texts = defaultdict(list)
    for rid, _q, t in free_text(con):
        texts[rid].append(t or "")
    for r in out:
        for rule in rules:
            if r["quote"].startswith(rule["quote_prefix"]):
                r.update({k: rule[k] for k in ("stance", "venue", "form", "oppose_reason")})
        if r["quote"] and not any(r["quote"] in t for t in texts[r["respondent_id"]]):
            pat = r"\s+".join(re.escape(w).replace("'", "['’]") for w in r["quote"].split())
            hit = next((m.group(0) for t in texts[r["respondent_id"]] for m in [re.search(pat, t)] if m), None)
            assert hit, f"quote for {r['respondent_id']} not found in their answers"
            r["quote"] = hit
    out.sort(key=lambda r: r["respondent_id"])
    with CODED.open("w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(out[0]))
        w.writeheader()
        w.writerows(out)
    print(f"{len(out)} respondents -> {CODED}")


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "snippets":
        cmd_snippets(Path(sys.argv[2]))
    elif len(sys.argv) >= 3 and sys.argv[1] == "merge":
        cmd_merge(Path(sys.argv[2]))
    elif len(sys.argv) == 2 and sys.argv[1] == "export":
        cmd_export()
    else:
        sys.exit(__doc__)
