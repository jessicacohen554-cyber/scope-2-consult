#!/usr/bin/env python3
"""Impact in the market-based method: coding inputs, merge and frontend export.

Separates two ideas the impact and additionality pages blur:

  * system impact: the scope 2 MBM itself should drive real emissions
    reductions on the grid (incrementality, additionality, causal tests, new
    build / asset age, market scarcity, emissionality ...), and whether the
    proposal (hourly + deliverability + SSS) goes far enough on it;
  * consequential / marginal accounting: a separate method, and whether it
    should displace the attributional MBM, sit inside scope 2, or outside it.

    python3 scripts/analytics/mbm_impact.py snippets OUT_DIR
        Respondents who use any umbrella term, plus everyone who answered Q152
        (the survey's "balance integrity, impact and feasibility" question).
        Passages ±400 chars around each match plus the full Q152 answer,
        written as JSON batches for coding against
        reference/mbm_impact_codebook.md.

    python3 scripts/analytics/mbm_impact.py merge OUT_DIR
        Coder CSVs (OUT_DIR/out_b*.csv) -> data/derived/mbm_impact_stance.csv.

    python3 scripts/analytics/mbm_impact.py export
        -> frontend/data/mbm_impact.json (+ fixture copy).

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
import additionality  # noqa: E402
import impact  # noqa: E402
from additionality import NAMES, ORG_LABEL, camp, overall  # noqa: E402
from export_frontend import (COUNTRY_TOP_N, MIN_SEGMENT_N,  # noqa: E402
                             SECTOR_TOP_N, SECTORS, truncate)

ROOT = Path(__file__).resolve().parents[2]
DB = ROOT / "data" / "scope2_consultation.sqlite"
CODED = ROOT / "data" / "derived" / "mbm_impact_stance.csv"
OVERRIDES = ROOT / "reference" / "mbm_impact_overrides.csv"
OUT = ROOT / "frontend" / "data" / "mbm_impact.json"
FIXTURE = ROOT / "frontend" / "data" / "fixtures" / "mbm_impact.json"

EXTRA = {
    "scarcity": re.compile(r"\bscarc(?:ity|e)\b", re.I),
    "newness": re.compile(r"\bnew[- ]?build\b|\bnewness\b|\bvintage\b|\basset[- ]age\b|\bcommissioning date\b|"
                          r"\bnew(?:ly)?[- ]built\b|\bnew (?:clean|renewable) (?:capacity|projects?|generation)\b", re.I),
    "drive": re.compile(r"\b(?:drive|drives|driving|spur|stimulat\w*|catalyz\w*|incentivi[sz]\w*|unlock\w*)\s+"
                        r"(?:new|additional|incremental|real)\b", re.I),
    "real_reductions": re.compile(r"\breal(?:[- ]world)?\s+(?:emissions?\s+)?(?:reductions?|decarboni[sz]ation|abatement)\b|"
                                  r"\bactual\s+emissions?\s+reductions?\b", re.I),
    "sss_incr": re.compile(r"(?:\bSSS\b|standard supply)[^.]{0,200}(?:increment|additional|impact|new[- ]build|vintage|\bage\b)|"
                           r"(?:increment|additional|impact|new[- ]build|vintage|\bage\b)[^.]{0,200}(?:\bSSS\b|standard supply)", re.I),
}
WINDOW = 400
CAP = 9000
N_BATCHES = 10
Q152 = "Q152"


def matches(text):
    for f, s, e in impact.matches(text):
        yield f, s, e
    for c, s, e in additionality.matches(text):
        yield "additional", s, e
    for k, p in EXTRA.items():
        for m in p.finditer(text or ""):
            yield k, m.start(), m.end()


def cmd_snippets(out_dir: Path) -> None:
    con = sqlite3.connect(DB)
    per = defaultdict(list)
    q152 = {}
    for rid, q, t in con.execute("SELECT respondent_id, question_id, answer_text FROM v_free_text"):
        t = t or ""
        if q == Q152:
            q152[rid] = t
            continue
        spans = sorted((max(0, s - WINDOW), min(len(t), e + WINDOW)) for _f, s, e in matches(t))
        merged = []
        for s, e in spans:
            if merged and s <= merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], e)
            else:
                merged.append([s, e])
        for s, e in merged:
            per[rid].append({"q": q, "text": t[s:e]})
    termed = set(per)
    ids = sorted(termed | {i for i, t in q152.items() if t.strip()})
    units = []
    for rid in ids:
        kept = [{"q": Q152, "text": q152[rid]}] if q152.get(rid, "").strip() else []
        n = len(kept[0]["text"]) if kept else 0
        for p in sorted(per[rid], key=lambda p: p["q"]):
            if n >= CAP:
                break
            kept.append({**p, "text": p["text"][:CAP - n]})
            n += len(kept[-1]["text"])
        units.append({"respondent_id": rid, "snippets": kept})
    out_dir.mkdir(parents=True, exist_ok=True)
    size = -(-len(units) // N_BATCHES)
    for b in range(N_BATCHES):
        (out_dir / f"b{b}.json").write_text(json.dumps(units[b * size:(b + 1) * size], indent=1, ensure_ascii=False))
    print(f"{len(units)} respondents ({len(termed)} by term, {len(q152)} Q152) -> {out_dir}")


FIELDS = ("system_impact", "beyond_sss", "sufficiency", "consequential", "mechanisms", "confidence", "quote")


def cmd_merge(in_dir: Path) -> None:
    con = sqlite3.connect(DB)
    texts = defaultdict(list)
    for rid, _q, t in con.execute("SELECT respondent_id, question_id, answer_text FROM v_free_text"):
        texts[rid].append(t or "")
    expected = {u["respondent_id"] for f in in_dir.glob("b*.json") for u in json.loads(f.read_text())}
    rules = list(csv.DictReader(OVERRIDES.open())) if OVERRIDES.exists() else []
    out = {}
    for f in sorted(in_dir.glob("out_b*.csv")):
        for r in csv.DictReader(f.open()):
            rid = int(r["respondent_id"])
            row = {"respondent_id": rid, **{k: (r.get(k) or "").strip() for k in FIELDS}}
            row["mechanisms"] = ";".join(sorted(m for m in re.split(r"[;,\s]+", row["mechanisms"]) if m))
            for rule in rules:
                if rule["quote_prefix"] and row["quote"].startswith(rule["quote_prefix"]):
                    row.update({k: rule[k] for k in FIELDS if rule.get(k)})
            q = row["quote"]
            if q and not any(q in t for t in texts[rid]):
                pat = r"\s+".join(re.escape(w).replace("'", "['’]").replace('"', '["“”]') for w in q.split())
                hit = next((m.group(0) for t in texts[rid] for m in [re.search(pat, t)] if m), None)
                row["quote"] = hit or ""
            out[rid] = row
    missing = expected - set(out)
    assert not missing, f"missing respondents in coder output: {sorted(missing)[:10]}"
    with CODED.open("w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=["respondent_id", *FIELDS])
        w.writeheader()
        w.writerows(out[i] for i in sorted(out))
    print(f"{len(out)} respondents -> {CODED}")


def pct(n, d):
    return round(100.0 * n / d, 1) if d else 0.0


def cmd_export() -> None:
    con = sqlite3.connect(DB)
    resp = {r[0]: {"org": r[1], "redacted": int(r[2]), "name": r[3], "country": r[4],
                   "sector": r[5], "as": r[6]} for r in
            con.execute("SELECT respondent_id, organization_type, is_redacted, organization, country, "
                        "sector, responding_as FROM respondents")}
    N = len(resp)
    texts = defaultdict(list)
    termed = set()
    for rid, q, t in con.execute("SELECT respondent_id, question_id, answer_text FROM v_free_text"):
        texts[rid].append(t or "")
        if any(True for _ in matches(t)):
            termed.add(rid)
    coded = {int(r["respondent_id"]): r for r in csv.DictReader(CODED.open())}
    for i, r in coded.items():
        assert not r["quote"] or any(r["quote"] in t for t in texts[i]), f"quote for {i} is not verbatim"

    def scores(q):
        return {r[0]: float(r[1]) for r in con.execute(
            "SELECT respondent_id, answer_numeric FROM responses WHERE question_id=? AND answer_numeric IS NOT NULL", (q,))}
    h, d, q97 = scores("Q071"), scores("Q083"), scores("Q097")
    camp_of = {i: camp(h.get(i), d.get(i)) for i in resp}
    CAMPS = ("pro_both", "split", "skipped", "anti_both")

    def by_camp(ids):
        c = Counter(camp_of[i] for i in ids)
        return {k: c.get(k, 0) for k in CAMPS}

    def q97_split(ids):
        v = [q97[i] for i in ids if i in q97]
        return {"answered": len(v), "support": sum(x >= 4 for x in v),
                "neutral": sum(x == 3 for x in v), "oppose": sum(x <= 2 for x in v)}

    def where(field, *vals):
        return {i for i, r in coded.items() if r[field] in vals}

    support = where("system_impact", "support_mbm")
    mixed = where("system_impact", "mixed")
    sep_only = where("system_impact", "separate_only")
    oppose = where("system_impact", "oppose")
    explicit = {i for i in support if coded[i]["beyond_sss"] == "explicit"}
    implicit = {i for i in support if coded[i]["beyond_sss"] == "implicit"}
    sss_enough = {i for i in support if coded[i]["beyond_sss"] == "sss_enough"}
    cons_pos = where("consequential", "displace", "inside_option", "separate")
    concept_any = support | mixed | sep_only | cons_pos

    def counts(ids, field, vals):
        c = Counter(coded[i][field] for i in ids)
        return {v: c.get(v, 0) for v in vals}

    SUFF = ("not_far_enough", "wrong_direction", "far_enough", "too_far", "not_addressed")
    CONS = ("displace", "inside_option", "separate", "oppose", "not_addressed")
    STANCE = ("support_mbm", "mixed", "separate_only", "oppose", "neutral")
    BEYOND = ("explicit", "implicit", "sss_enough", "not_addressed")
    MECH = ("scarcity", "additionality_test", "asset_age", "sss", "marginal", "causal", "other")

    def mech_counts(ids):
        c = Counter(m for i in ids for m in coded[i]["mechanisms"].split(";") if m)
        return {m: c.get(m, 0) for m in MECH}

    add_codes = {int(r["respondent_id"]): overall(r) for r in csv.DictReader(additionality.CODED.open())}
    imp_codes = {int(r["respondent_id"]): r["stance"] for r in csv.DictReader(impact.CODED.open())}

    def xtab(other):
        ids = sorted(set(other) & set(coded))
        c = Counter((other[i], coded[i]["system_impact"]) for i in ids)
        return {"n": len(ids), "cells": [{"prior": a, "now": b, "n": n} for (a, b), n in sorted(c.items())]}

    groups = {
        "support": support, "explicit": explicit, "beyond": explicit | implicit,
        "not_far_enough": where("sufficiency", "not_far_enough"),
        "wrong_direction": where("sufficiency", "wrong_direction"),
        "far_enough": where("sufficiency", "far_enough"),
        "displace": where("consequential", "displace"), "oppose": oppose,
    }

    data = {
        "_comment": "Generated by scripts/analytics/mbm_impact.py export. AI-coded against "
                    "reference/mbm_impact_codebook.md. Hourly = Q71, deliverability = Q83, SSS = Q97; support = 4-5.",
        "totals": {"respondents": N, "coded": len(coded), "by_term": len(termed),
                   "q152_only": len(set(coded) - termed)},
        "funnel": {"referenced": len(termed), "support_mbm": len(support),
                   "beyond_sss_explicit": len(explicit), "beyond_sss_implicit": len(implicit),
                   "sss_enough": len(sss_enough)},
        "stance": counts(coded, "system_impact", STANCE),
        "beyond_sss": counts(support, "beyond_sss", BEYOND),
        "sufficiency": {"all": counts(coded, "sufficiency", SUFF),
                        "support_mbm": counts(support, "sufficiency", SUFF)},
        "consequential": {"all": counts(coded, "consequential", CONS),
                          "support_mbm": counts(support, "consequential", CONS)},
        "aggregate": {"concept_any": len(concept_any), "support_mbm": len(support), "mixed": len(mixed),
                      "separate_only": len(sep_only),
                      "consequential_only": len(cons_pos - support - mixed - sep_only)},
        "mechanisms": {"support_mbm": mech_counts(support), "explicit": mech_counts(explicit)},
        "camps": {"all": by_camp(resp), "referenced": by_camp(termed), **{g: by_camp(ids) for g, ids in groups.items()},
                  "implicit": by_camp(implicit), "sss_enough": by_camp(sss_enough)},
        "q97": {"all": q97_split(resp), "support": q97_split(support), "explicit": q97_split(explicit),
                "far_enough": q97_split(groups["far_enough"]), "not_far_enough": q97_split(groups["not_far_enough"])},
        "suff_by_camp": {s: by_camp(where("sufficiency", s)) for s in SUFF if s != "not_addressed"},
        "cons_by_camp": {c: by_camp(where("consequential", c)) for c in CONS if c != "not_addressed"},
        "crosscheck": {"additionality": xtab(add_codes), "impact": xtab(imp_codes)},
        "confidence": dict(sorted(Counter(r["confidence"] for r in coded.values()).items())),
    }

    def dim(label_of, top_n=None, other="Other"):
        totals = Counter(label_of(i) for i in resp)
        ordered = sorted(totals.items(), key=lambda kv: (-kv[1], kv[0]))
        keep = {k for k, n in (ordered[:top_n] if top_n else ordered) if n >= MIN_SEGMENT_N}
        lab = {i: (label_of(i) if label_of(i) in keep else other) for i in resp}
        rows = []
        for value in [k for k, _ in ordered if k in keep] + ([other] if other in lab.values() else []):
            members = {i for i in resp if lab[i] == value}
            rows.append({"label": value, "n": len(members), **{g: len(members & ids) for g, ids in groups.items()}})
        return rows

    sector_label = {v: lab for v, (_slug, lab) in SECTORS.items()}
    data["demographics"] = {
        "org_type": dim(lambda i: ORG_LABEL[resp[i]["org"]], other="Smaller types"),
        "country": dim(lambda i: resp[i]["country"], COUNTRY_TOP_N, "Other countries"),
        "sector": dim(lambda i: sector_label[resp[i]["sector"]], SECTOR_TOP_N, "Other sectors"),
    }

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

    shown = support | mixed | sep_only | oppose | where("consequential", "displace", "inside_option")
    data["named"] = [{"id": i, "name": display_name(i), "org_type": ORG_LABEL[resp[i]["org"]],
                      "country": resp[i]["country"], "camp": camp_of[i],
                      **{k: coded[i][k] for k in ("system_impact", "beyond_sss", "sufficiency", "consequential")}}
                     for i in sorted(shown) if nameable(i)]
    data["unnamed"] = {g: sum(1 for i in ids if not nameable(i)) for g, ids in
                       (("support", support), ("oppose", oppose), ("shown", shown))}

    def named_quotes(ids, limit=8):
        rows = {}
        for i in sorted(ids):
            q = coded[i]["quote"].strip()
            if not q:
                continue
            k = re.sub(r"\W+", " ", q.lower()).strip()[:60]
            row = rows.setdefault(k, {"quote": q, "orgs": [], "n_unnamed": 0, "n": 0})
            row["n"] += 1
            if nameable(i):
                row["orgs"].append(display_name(i))
            else:
                row["n_unnamed"] += 1
        res = [r for r in rows.values() if r["orgs"]]
        for r in res:
            r["orgs"] = sorted(set(r["orgs"]))
        res.sort(key=lambda r: (-r["n"], r["orgs"][0]))
        return res[:limit]

    data["quotes"] = {"not_far_enough": named_quotes(groups["not_far_enough"]),
                      "far_enough": named_quotes(groups["far_enough"]),
                      "wrong_direction": named_quotes(groups["wrong_direction"]),
                      "explicit": named_quotes(explicit),
                      "displace": named_quotes(groups["displace"]),
                      "oppose": named_quotes(oppose)}

    for p in (OUT, FIXTURE):
        p.write_text(json.dumps(data, sort_keys=True, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(json.dumps({k: data[k] for k in ("funnel", "stance", "sufficiency", "consequential", "aggregate")}, indent=1))


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "snippets":
        cmd_snippets(Path(sys.argv[2]))
    elif len(sys.argv) >= 3 and sys.argv[1] == "merge":
        cmd_merge(Path(sys.argv[2]))
    elif len(sys.argv) == 2 and sys.argv[1] == "export":
        cmd_export()
    else:
        sys.exit(__doc__)
