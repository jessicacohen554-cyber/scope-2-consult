#!/usr/bin/env python3
"""Additionality / incrementality: mention detection, stance-coding inputs, frontend export.

The survey never asks about additionality or incrementality, so every mention is
unprompted free text. Two steps:

    python3 scripts/analytics/additionality.py snippets OUT_DIR
        Find respondents whose free text uses either concept and write their
        passages (±500 chars around each match) as JSON batches for hand coding
        against reference/additionality_codebook.md.

    python3 scripts/analytics/additionality.py export
        Join the hand-coded stances (data/derived/additionality_stance.csv) and
        mechanisms (data/derived/additionality_mechanism.csv) to the Q71 (hourly
        matching) and Q83 (deliverability) scores and respondent profiles, and
        write frontend/data/additionality.json (+ its fixture copy).

Respondents who never used either concept are not classified: the page reports
nothing about their view of additionality or incrementality.

Mention patterns
----------------
Additionality: the word itself ("additionality", "non-additional") or
"additional" + new clean supply ("additional renewable capacity", "additional
generation"). Incrementality: "incrementality" or "incremental" + clean supply
or emission reductions. Bare "additional" ("additional comments") and
"incremental cost" never match.

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
from export_frontend import (COUNTRY_TOP_N, MIN_SEGMENT_N, ORG_TYPES,  # noqa: E402
                             SECTOR_TOP_N, SECTORS, truncate)

ROOT = Path(__file__).resolve().parents[2]
DB = ROOT / "data" / "scope2_consultation.sqlite"
CODED = ROOT / "data" / "derived" / "additionality_stance.csv"
MECH = ROOT / "data" / "derived" / "additionality_mechanism.csv"
AUDIT = ROOT / "reference" / "org_audit.csv"
NAMES = ROOT / "reference" / "additionality_org_names.csv"  # hand-cleaned display names
OUT = ROOT / "frontend" / "data" / "additionality.json"
FIXTURE = ROOT / "frontend" / "data" / "fixtures" / "additionality.json"

_OBJ = (r"(?:new\s+)?(?:clean|renewable|carbon[- ]free|zero[- ]carbon|low[- ]carbon|green)\s*"
        r"(?:energy\s+|electricity\s+|power\s+)?"
        r"(?:generation|capacity|supply|projects?|resources?|deployment|build|assets)")
_GEN = r"(?:new\s+)?(?:generation|deployment|build|projects?|capacity)"
PATTERNS = {
    "A": [re.compile(r"\b(?:non-?)?additionalit(?:y|ies)\b|\bnon-?additional\b", re.I),
          re.compile(r"\badditional\s+(?:%s|%s)" % (_OBJ, _GEN), re.I)],
    "I": [re.compile(r"\bincrementalit(?:y|ies)\b", re.I),
          re.compile(r"\bincremental\s+(?:%s|%s|emissions?\s+(?:reduction|impact)s?)" % (_OBJ, _GEN), re.I)],
}
SHARED_MIN = 3  # a mention sentence shared verbatim by this many respondents = shared wording

ORG_LABEL = {value: label for value, _slug, label in ORG_TYPES}
AUDIT_LABEL = {
    "academic_institution": "Academic institution", "think_tank": "Think tank",
    "ngo_civil_society": "NGO / civil society", "trade_association": "Trade association",
    "business_coalition": "Business coalition", "company": "Company", "consultancy": "Consultancy",
    "data_vendor": "Data / software vendor", "financial": "Financial institution",
    "government": "Government / public body", "registry_operator": "Registry operator",
    "standards_body": "Standards / assurance body", "individual": "Individual",
    "unverifiable": "Unverifiable",
}


def free_text(con):
    return con.execute("SELECT respondent_id, question_id, answer_text FROM v_free_text").fetchall()


def matches(text: str):
    """Yield (concept, start, end) for every mention in text."""
    for concept, pats in PATTERNS.items():
        for p in pats:
            for m in p.finditer(text or ""):
                yield concept, m.start(), m.end()


def cmd_snippets(out_dir: Path) -> None:
    con = sqlite3.connect(DB)
    per = defaultdict(list)
    for rid, q, t in free_text(con):
        spans = sorted((max(0, s - 500), min(len(t), e + 400), c) for c, s, e in matches(t))
        merged = []
        for s, e, c in spans:
            if merged and s <= merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], e)
                merged[-1][2].add(c)
            else:
                merged.append([s, e, {c}])
        for s, e, cs in merged:
            per[rid].append({"q": q, "concepts": "".join(sorted(cs)), "text": t[s:e]})
    out_dir.mkdir(parents=True, exist_ok=True)
    ids = sorted(per)
    size = -(-len(ids) // 6)
    for b in range(6):
        chunk = [{"respondent_id": i, "snippets": per[i]} for i in ids[b * size:(b + 1) * size]]
        (out_dir / f"b{b}.json").write_text(json.dumps(chunk, indent=1, ensure_ascii=False))
    print(f"{len(ids)} respondents -> {out_dir}")


def overall(r) -> str:
    s = {r["add_stance"], r["inc_stance"]} - {"na"}
    if "support" in s and "oppose" not in s:
        return "support"
    if "oppose" in s and "support" not in s:
        return "oppose"
    if "mixed" in s or {"support", "oppose"} <= s:
        return "mixed"
    return "neutral"


def bucket(x) -> str:
    if x is None:
        return "none"
    return "support" if x >= 4 else "oppose" if x <= 2 else "neutral"


def camp(h, d) -> str:
    bh, bd = bucket(h), bucket(d)
    if bh == bd == "support":
        return "pro_both"
    if bh == bd == "oppose":
        return "anti_both"
    if "none" in (bh, bd):
        return "skipped"
    return "split"


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
    n_free = len({r[0] for r in rows})

    mention = defaultdict(set)          # concept -> respondent ids
    sentences = defaultdict(set)        # normalised mention sentence -> respondent ids
    sent_of = defaultdict(set)          # respondent -> their mention sentences
    for rid, _q, t in rows:
        for c, s, e in matches(t):
            mention[c].add(rid)
            a = max(t.rfind(". ", 0, s), t.rfind("\n", 0, s)) + 1
            b = min([x for x in (t.find(". ", e), t.find("\n", e)) if x != -1] or [len(t)])
            key = re.sub(r"\W+", " ", t[a:b].lower()).strip()
            sentences[key].add(rid)
            sent_of[rid].add(key)
    shared = {rid for rid, ks in sent_of.items() if any(len(sentences[k]) >= SHARED_MIN for k in ks)}

    coded = {int(r["respondent_id"]): r for r in csv.DictReader(CODED.open())}
    assert set(coded) == mention["A"] | mention["I"], "coded file out of sync with mention patterns"

    score = {}
    for q in ("Q071", "Q083"):
        score[q] = {r[0]: float(r[1]) for r in con.execute(
            "SELECT respondent_id, answer_numeric FROM responses WHERE question_id=? AND answer_numeric IS NOT NULL", (q,))}
    both_scored = set(score["Q071"]) & set(score["Q083"])
    pro_hd = {i for i in both_scored if score["Q071"][i] >= 4 and score["Q083"][i] >= 4}

    def stance_counts(field):
        c = Counter(r[field] for r in coded.values() if r[field] != "na")
        return {k: c.get(k, 0) for k in ("support", "oppose", "mixed", "neutral")}

    sup = {"A": {i for i, r in coded.items() if r["add_stance"] == "support"},
           "I": {i for i, r in coded.items() if r["inc_stance"] == "support"},
           "E": {i for i, r in coded.items() if overall(r) == "support"}}
    all3 = sup["E"] & pro_hd

    def camps(ids):
        c = Counter(camp(score["Q071"].get(i), score["Q083"].get(i)) for i in ids)
        return {k: c.get(k, 0) for k in ("pro_both", "anti_both", "split", "skipped")}

    def q71_hist(ids):
        c = Counter(int(score["Q071"][i]) for i in ids if i in score["Q071"])
        return [c.get(k, 0) for k in range(1, 6)]

    def orgs(ids):
        c = Counter(ORG_LABEL[resp[i]["org"]] for i in ids)
        return dict(sorted(c.items(), key=lambda kv: (-kv[1], kv[0])))

    anti = sup["E"] & {i for i in both_scored if score["Q071"][i] <= 2 and score["Q083"][i] <= 2}

    data = {
        "_comment": "Generated by scripts/analytics/additionality.py export. Stances are hand-coded "
                    "(reference/additionality_codebook.md); hourly = Q71, deliverability = Q83, support = 4-5.",
        "totals": {"respondents": N, "with_free_text": n_free, "scored_q71_q83": len(both_scored),
                   "pro_hourly_and_deliverability": len(pro_hd)},
        "mentions": {"additionality": len(mention["A"]), "incrementality": len(mention["I"]),
                     "both": len(mention["A"] & mention["I"]), "either": len(mention["A"] | mention["I"])},
        "stance": {"additionality": stance_counts("add_stance"),
                   "incrementality": stance_counts("inc_stance"),
                   "either": {k: sum(1 for r in coded.values() if overall(r) == k)
                              for k in ("support", "oppose", "mixed", "neutral")}},
        "supporters": {"additionality": len(sup["A"]), "incrementality": len(sup["I"]), "either": len(sup["E"])},
        "camps": {"additionality": camps(sup["A"]), "incrementality": camps(sup["I"]), "either": camps(sup["E"])},
        "q71_hist": {"additionality": q71_hist(sup["A"]), "incrementality": q71_hist(sup["I"])},
        "all_three": {"n": len(all3), "pct_total": pct(len(all3), N), "pct_scored": pct(len(all3), len(both_scored)),
                      "pct_pro_hd": pct(len(all3), len(pro_hd)),
                      "via_additionality": len(all3 & sup["A"]), "via_incrementality": len(all3 & sup["I"]),
                      "shared_wording": len(all3 & shared), "redacted": sum(resp[i]["redacted"] for i in all3)},
        "orgs": {"all_three": orgs(all3), "support_concept_anti_both": orgs(anti)},
        "confidence": dict(sorted(Counter(r["confidence"] for r in coded.values()).items())),
    }
    # --- mechanism: SSS as the incrementality test vs a required asset-age test
    mech = {int(r["respondent_id"]): r for r in csv.DictReader(MECH.open())} if MECH.exists() else {}
    if mech:
        assert set(mech) == sup["E"], "mechanism file out of sync with supporters"

    def mech_counts(ids):
        out = {"sss_supports": 0, "sss_prefers_other": 0, "age_required": 0, "age_considered": 0,
               "sss_and_age_required": 0, "sss_only": 0, "age_required_only": 0, "neither": 0}
        for i in ids:
            m = mech[i]
            s_ok, a_req = m["sss"] == "supports", m["age"] == "required"
            out["sss_supports"] += s_ok
            out["sss_prefers_other"] += m["sss"] == "prefers_other"
            out["age_required"] += a_req
            out["age_considered"] += m["age"] == "considered"
            out["sss_and_age_required"] += s_ok and a_req
            out["sss_only"] += s_ok and not a_req
            out["age_required_only"] += a_req and not s_ok
            out["neither"] += not s_ok and not a_req
        return out

    if mech:
        data_mech = {"either": mech_counts(sup["E"]), "all_three": mech_counts(all3),
                     "anti_both": mech_counts(anti), "n_supporters": len(sup["E"])}
    else:
        data_mech = None

    # --- demographics: who voiced support, by segment ------------------------
    oppose_ids = {i for i, r in coded.items() if overall(r) == "oppose"}
    groups = {"either": sup["E"], "additionality": sup["A"], "incrementality": sup["I"],
              "all_three": all3, "oppose": oppose_ids}
    if mech:
        groups["sss"] = {i for i in sup["E"] if mech[i]["sss"] == "supports"}
        groups["age_required"] = {i for i in sup["E"] if mech[i]["age"] == "required"}
        groups["stronger"] = {i for i in sup["E"] if mech[i]["sss"] == "prefers_other"}

    def dim(label_of, top_n=None, other="Other"):
        totals = Counter(label_of(i) for i in resp)
        ordered = sorted(totals.items(), key=lambda kv: (-kv[1], kv[0]))
        keep = {k for k, n in (ordered[:top_n] if top_n else ordered) if n >= MIN_SEGMENT_N}
        lab = {i: (label_of(i) if label_of(i) in keep else other) for i in resp}
        rows = []
        for value in [k for k, _ in ordered if k in keep] + ([other] if other in lab.values() else []):
            members = {i for i in resp if lab[i] == value}
            rows.append({"label": value, "n": len(members),
                         **{g: len(members & ids) for g, ids in groups.items()}})
        return rows

    sector_label = {v: lab for v, (_slug, lab) in SECTORS.items()}
    demographics = {
        "org_type": dim(lambda i: ORG_LABEL[resp[i]["org"]], other="Smaller types"),
        "country": dim(lambda i: resp[i]["country"], COUNTRY_TOP_N, "Other countries"),
        "sector": dim(lambda i: sector_label[resp[i]["sector"]], SECTOR_TOP_N, "Other sectors"),
        "responding_as": dim(lambda i: resp[i]["as"]),
        "redaction": dim(lambda i: "Redacted" if resp[i]["redacted"] else "Named"),
    }

    # --- named organisations -------------------------------------------------
    audit = {int(r["respondent_id"]): r["audited_class"] for r in csv.DictReader(AUDIT.open())}

    overrides = {int(r["respondent_id"]): r["display_name"] for r in csv.DictReader(NAMES.open())}

    def display_name(i):
        if i in overrides:
            return overrides[i]  # "" = organisation not identifiable from the entry
        name = resp[i]["name"] or ""
        if ": " in name and len(name) > 80:
            name = name.split(": ", 1)[0]
        return truncate(name, 80)

    named = []
    for i in sorted(sup["E"] | oppose_ids):
        if resp[i]["redacted"] or resp[i]["as"] != "Organization" or not display_name(i):
            continue
        r = coded[i]
        named.append({
            "id": i, "name": display_name(i), "org_type": ORG_LABEL[resp[i]["org"]],
            "audited": AUDIT_LABEL.get(audit.get(i, ""), ""), "country": resp[i]["country"],
            "stance": "oppose" if i in oppose_ids else "support",
            "concepts": "".join(c for c, f in (("A", "add_stance"), ("I", "inc_stance")) if r[f] == ("oppose" if i in oppose_ids else "support")),
            "camp": camp(score["Q071"].get(i), score["Q083"].get(i)),
            "sss": mech[i]["sss"] if i in mech else "", "age": mech[i]["age"] if i in mech else "",
            "quote": (mech[i]["quote"] if i in mech and mech[i]["quote"] else r["quote"]).strip(),
        })
    unnamed = {k: {"redacted": sum(resp[i]["redacted"] for i in ids),
                   "individual": sum(1 for i in ids if not resp[i]["redacted"] and resp[i]["as"] != "Organization"),
                   "unidentifiable": sum(1 for i in ids if not resp[i]["redacted"] and resp[i]["as"] == "Organization"
                                         and not display_name(i))}
               for k, ids in (("support", sup["E"]), ("oppose", oppose_ids))}

    # --- quotes, attributed: one row per distinct passage, naming every named
    # organisation that used it; redacted and individual filers are only counted.
    def named_quotes(ids, field_of, limit=8):
        rows = {}
        for i in sorted(ids):
            q = field_of(i).strip(" •●▪-*\n")
            if not q:
                continue
            k = re.sub(r"\W+", " ", re.sub(r"^[A-Za-z ]{1,20}:\s+", "", q).lower()).strip()[:60]
            row = rows.setdefault(k, {"quote": q, "orgs": [], "n_unnamed": 0, "n": 0})
            row["n"] += 1
            if resp[i]["redacted"] or resp[i]["as"] != "Organization" or not display_name(i):
                row["n_unnamed"] += 1
            else:
                row["orgs"].append(display_name(i))
        out = [r for r in rows.values() if r["orgs"]]
        for r in out:
            r["orgs"] = sorted(set(r["orgs"]))
        out.sort(key=lambda r: (-r["n"], r["orgs"][0]))
        return out[:limit]

    texts = defaultdict(list)
    for rid, _q, t in rows:
        texts[rid].append(t or "")

    SPLIT = re.compile(r"(?<!\be\.g)(?<!\bi\.e)(?<=[.!?])\s+|\n\s*\n|\n\s*[•●▪\-*]\s*")

    def sentence(i, *pats):
        """Shortest verbatim sentence by respondent i matching every pattern."""
        best = ""
        for t in texts[i]:
            for sent in SPLIT.split(t):
                sent = re.sub(r"\s+", " ", sent).strip(" •●▪-*")
                if 40 <= len(sent) <= 320 and not re.match(r"see\b", sent, re.I) and all(re.search(p, sent, re.I) for p in pats):
                    if not best or len(sent) < len(best):
                        best = sent
        return best

    def first(*options):
        return next((o for o in options if o), "")

    SSS_RE, INC_RE = r"\bSSS\b|standard supply", r"incremental|additional"
    AGE_RE = r"\bage\b|vintage|\bCOD\b|commission|years? old|new[- ]build"
    WANT_RE = r"should|must|requir|only|implement|exclude|critical|essential|necessary|support"
    MORE_RE = (r"not as impactful|alternative incrementality|stronger|not a proxy|not addressed|even better|"
               r"in place of|go(?:es)? further|not go far|insufficient|backstop|challenges")
    stance_q = lambda i: coded[i]["quote"]
    more_q = lambda i: first(sentence(i, MORE_RE, SSS_RE), sentence(i, MORE_RE, INC_RE), mech[i]["quote"])
    sss_q = lambda i: first(sentence(i, SSS_RE, INC_RE, WANT_RE), sentence(i, SSS_RE, INC_RE), mech[i]["quote"])
    age_q = lambda i: first(sentence(i, AGE_RE, WANT_RE),
                            mech[i]["quote"] if re.search(AGE_RE, mech[i]["quote"], re.I) else "",
                            sentence(i, AGE_RE), mech[i]["quote"])
    data["quotes"] = {
        "all_three": named_quotes(all3, stance_q),
        "anti_both": named_quotes(anti, stance_q),
        "oppose": named_quotes(oppose_ids, stance_q),
    }
    if mech:
        data["quotes"]["sss"] = named_quotes({i for i in sup["E"] if mech[i]["sss"] == "supports"}, sss_q)
        data["quotes"]["stronger"] = named_quotes({i for i in sup["E"] if mech[i]["sss"] == "prefers_other"}, more_q)
        data["quotes"]["age_required"] = named_quotes({i for i in sup["E"] if mech[i]["age"] == "required"}, age_q)

    data["mechanism"] = data_mech
    data["demographics"] = demographics
    data["named"] = named
    data["unnamed"] = unnamed

    for p in (OUT, FIXTURE):
        p.write_text(json.dumps(data, sort_keys=True, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(json.dumps({k: data[k] for k in ("mentions", "supporters", "all_three")}, indent=1))


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "snippets":
        cmd_snippets(Path(sys.argv[2]))
    elif len(sys.argv) == 2 and sys.argv[1] == "export":
        cmd_export()
    else:
        sys.exit(__doc__)
