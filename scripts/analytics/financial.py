#!/usr/bin/env python3
"""Financial institutions and investors: cohort, stance, themes, frontend export.

    python3 scripts/analytics/financial.py export

Reads the hand-curated cohort (reference/financial_cohort.csv), the hand-coded themes
(data/derived/financial_themes.csv) and quote bank (reference/financial_quotes.csv),
re-derives the institution tier from the rule in reference/financial_codebook.md and
fails loudly if the two disagree, verifies every quote is a verbatim substring of the
stored answer, and writes frontend/data/financial.json (+ its fixture copy).

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
from export_frontend import ORG_TYPES, SECTORS  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
DB = ROOT / "data" / "scope2_consultation.sqlite"
COHORT = ROOT / "reference" / "financial_cohort.csv"
THEMES = ROOT / "data" / "derived" / "financial_themes.csv"
QUOTES = ROOT / "reference" / "financial_quotes.csv"
AUDIT = ROOT / "reference" / "org_audit.csv"
OUT = ROOT / "frontend" / "data" / "financial.json"
FIXTURE = ROOT / "frontend" / "data" / "fixtures" / "financial.json"

ORG_LABEL = {value: label for value, _slug, label in ORG_TYPES}
SECTOR_LABEL = {v: lab for v, (_slug, lab) in SECTORS.items()}
AUDIT_LABEL = {
    "academic_institution": "Academic institution", "think_tank": "Think tank",
    "ngo_civil_society": "NGO / civil society", "trade_association": "Trade association",
    "business_coalition": "Business coalition", "company": "Company", "consultancy": "Consultancy",
    "data_vendor": "Data / software vendor", "financial": "Financial institution",
    "government": "Government / public body", "registry_operator": "Registry operator",
    "standards_body": "Standards / assurance body", "individual": "Individual",
    "unverifiable": "Unverifiable", "": "Not audited (redacted)",
}
ANCHORS = [
    (71, "Hourly matching (QC4)"), (83, "Deliverability (QC5)"), (97, "SSS pro-rata limit"),
    (113, "Residual mix definition"), (124, "Fossil-based fallback"),
    (153, "Hourly-matching exemptions"), (171, "Legacy clause"),
]
ROLES = [
    ("data_user", "Investors using disclosures"),
    ("capital_allocator", "Capital providers & project finance"),
    ("own_footprint_reporter", "Reporting their own footprint"),
    ("investor_network", "Investor networks"),
    ("sector_association", "Banking & insurance associations"),
    ("intermediary", "Market intermediary"),
    ("unstated", "Role not stated"),
]
ROLE_LABEL = dict(ROLES)
THEME_LABELS = [
    ("ppa_bankability", "Hourly + deliverability fracture PPAs and project finance"),
    ("optional_not_mandatory", "“May” or “should”, not “shall”"),
    ("comparability_loss", "Revisions, exemptions or legacy reduce comparability"),
    ("emerging_market_capital", "Rules steer capital away from high-emitting grids"),
    ("additionality_gap", "Proposal should address additionality / new build"),
    ("distributed_small_loads", "Many small sites; Scope 2 immaterial for the sector"),
    ("conservative_defaults", "Conservative fallbacks protect integrity"),
    ("disclosure_over_flexibility", "Disclose every flexibility used"),
    ("regional_data_gaps", "Granular data unavailable in our region"),
    ("real_assets", "Real-estate barriers: tenants, landlords, certifications"),
    ("comparability_gain", "Revisions improve comparability for investors"),
    ("financial_reporting_spillover", "Knock-on effects: hedge accounting, loan KPIs, valuations"),
    ("dirty_grid_skeptic", "Dirtiest-grid procurement is not more ambitious"),
    ("policy_neutrality", "GHG Protocol should stay policy-neutral"),
]
LEGACY_LABELS = [
    ("full_protection", "Full protection: whole term, all instruments, transfers"),
    ("guardrails", "Guardrails: sunset, term limits, no transfer, disclosure"),
    ("uniform_date", "Uniform effective date with disaggregated disclosure"),
    ("support_unspecified", "Supports, no design detail"),
    ("oppose", "Opposes a legacy clause"),
    ("not_addressed", "Not addressed"),
]
QUOTE_THEMES = [
    ("additionality", "Additionality & incrementality"), ("impact", "A separate impact metric"),
    ("legacy_guardrails", "Legacy: guardrails"), ("legacy_full", "Legacy: full protection"),
    ("bankability", "PPAs and bankability"), ("capital_where", "Where capital should go"),
    ("footprint", "Small, scattered loads"), ("conservative", "Conservative defaults"),
    ("disclosure", "Disclosure over flexibility"), ("spillover", "Financial-reporting spillovers"),
]
PICKLISTS = [72, 74, 84, 86, 98, 100, 114, 116, 125, 127, 147, 150, 154, 156, 172, 174]
CHOICES = [146, 181, 176, 166, 169, 163, 70, 134, 136, 139, 130, 179]
DUP_PAIR = (130, 598)  # 130 duplicates 598 verbatim; excluded from theme tallies
SENT_MIN = 90


def pct(n, d):
    return round(100.0 * n / d, 1) if d else 0.0


def read_csv(p):
    with p.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def bucket(x):
    return "support" if x >= 4 else "oppose" if x <= 2 else "neutral"


def split(scores, ids):
    v = [scores[i] for i in ids if i in scores]
    c = Counter(bucket(x) for x in v)
    return {"n": len(v), "mean": round(sum(v) / len(v), 2) if v else None,
            "support": c["support"], "neutral": c["neutral"], "oppose": c["oppose"]}


def main():
    con = sqlite3.connect(DB)
    resp = {}
    for r in con.execute(
            "SELECT respondent_id, organization, organization_type, organization_type_other, sector, "
            "sector_other, is_redacted+0, responding_as, country, substantive_completion_pct+0.0, "
            "free_text_chars+0 FROM respondents"):
        resp[r[0]] = dict(zip(["org", "type", "type_other", "sector", "sector_other", "redacted",
                               "as", "country", "pct", "ft"], r[1:]))
    N = len(resp)
    audit = {int(r["respondent_id"]): r["audited_class"] for r in read_csv(AUDIT)}

    cohort = {int(r["respondent_id"]): r for r in read_csv(COHORT)}
    themes = {int(r["respondent_id"]): r for r in read_csv(THEMES)}
    quotes = read_csv(QUOTES)
    assert set(cohort) == set(themes), "cohort and themes files disagree on membership"

    # --- re-derive the institution tier from the rule --------------------------
    rule = set()
    for i, r in resp.items():
        a = audit.get(i, "")
        if r["type"] == "Financial Institution" or a == "financial" or (
                r["sector"] in ("Finance (40)", "Insurance (4030)") and r["type"] == "Company"
                and a != "individual"):
            rule.add(i)
    manual = {i for i, r in cohort.items() if r["tier"] == "institution" and r["basis"] == "manual"}
    inst = {i for i, r in cohort.items() if r["tier"] == "institution"}
    assert inst == rule | manual, f"institution tier drifted from rule: {sorted(inst ^ (rule | manual))}"
    assoc = set(cohort) - inst
    ids = inst | assoc

    # --- free text: quote verification and shared-sentence flags -----------------
    text = defaultdict(dict)
    for rid, q, t in con.execute("SELECT respondent_id, question_number+0, answer_text FROM v_free_text"):
        text[rid][int(q)] = t or ""

    def verify(rid, q, quote):
        assert quote in text[rid].get(q, ""), f"quote not verbatim: respondent {rid} Q{q}: {quote[:60]}"

    for i, r in themes.items():
        if r["quote"]:
            verify(i, int(r["quote_q"]), r["quote"])
    for r in quotes:
        verify(int(r["respondent_id"]), int(r["question_number"]), r["quote"])

    SPLIT = re.compile(r"(?<=[.!?])\s+|\n+")
    sent = defaultdict(set)
    for rid, qs in text.items():
        for t in qs.values():
            for s in SPLIT.split(t):
                k = re.sub(r"\W+", " ", s.lower()).strip()
                if len(k) >= SENT_MIN:
                    sent[k].add(rid)
    outsiders = defaultdict(set)
    pair_shared = 0
    for k, s in sent.items():
        cs = [i for i in s if i in ids]
        if not cs:
            continue
        if set(DUP_PAIR) <= s:
            pair_shared += 1
        for i in cs:
            outsiders[i].update(j for j in s if j not in ids)

    # --- scores ----------------------------------------------------------------
    score = {}
    for q, _ in ANCHORS:
        score[q] = {r[0]: float(r[1]) for r in con.execute(
            "SELECT respondent_id, answer_numeric+0.0 FROM responses WHERE question_number=? "
            "AND answer_numeric IS NOT NULL", (q,))}
    role_of = {i: cohort[i]["role"] for i in ids}
    # Every statistic below runs on distinct voices: the verbatim duplicate (130) is
    # kept in the respondent table but dropped from scale, picklist and theme tallies.
    stat_ids = ids - {DUP_PAIR[0]}
    stat_inst, stat_assoc = inst & stat_ids, assoc & stat_ids
    by_role_ids = {k: {i for i in stat_ids if role_of[i] == k} for k, _ in ROLES}

    anchors = []
    for q, label in ANCHORS:
        anchors.append({
            "q": q, "label": label,
            "all": split(score[q], resp), "cohort": split(score[q], stat_ids),
            "institutions": split(score[q], stat_inst), "associations": split(score[q], stat_assoc),
            "by_role": {k: split(score[q], v) for k, v in by_role_ids.items()},
        })

    # --- picklists and single choices -------------------------------------------
    qlabel = {int(r[0]): r[1] for r in con.execute("SELECT question_number+0, label FROM questions")}
    picklists = {}
    for q in PICKLISTS:
        allc, fc, alln, fn = Counter(), Counter(), set(), set()
        for rid, opt, canon in con.execute(
                "SELECT respondent_id, option_text, is_canonical+0 FROM response_selections WHERE question_number=?", (q,)):
            if not canon:
                continue
            allc[opt] += 1; alln.add(rid)
            if rid in stat_ids:
                fc[opt] += 1; fn.add(rid)
        picklists[str(q)] = {"label": qlabel[q], "n_all": len(alln), "n_cohort": len(fn), "options": [
            {"text": o, "all_pct": pct(n, len(alln)), "cohort_n": fc[o], "cohort_pct": pct(fc[o], len(fn))}
            for o, n in allc.most_common()]}
    choices = {}
    for q in CHOICES:
        allc, fc = Counter(), Counter()
        for rid, t in con.execute("SELECT respondent_id, answer_text FROM responses WHERE question_number=?", (q,)):
            allc[t] += 1
            if rid in stat_ids:
                fc[t] += 1
        na, nf = sum(allc.values()), sum(fc.values())
        choices[str(q)] = {"label": qlabel[q], "n_all": na, "n_cohort": nf, "options": [
            {"text": o, "all_n": n, "all_pct": pct(n, na), "cohort_n": fc[o], "cohort_pct": pct(fc[o], nf)}
            for o, n in allc.most_common()]}

    # --- themes ----------------------------------------------------------------
    tally_ids = stat_ids
    theme_rows = []
    for key, label in THEME_LABELS:
        members = {i for i in tally_ids if themes[i][key] == "1"}
        theme_rows.append({"key": key, "label": label, "n": len(members),
                           "by_role": {k: len(members & v) for k, v in by_role_ids.items()},
                           "institutions": len(members & inst), "associations": len(members & assoc)})
    legacy_rows = []
    for key, label in LEGACY_LABELS:
        members = {i for i in tally_ids if key in themes[i]["legacy_design"].split(";")}
        legacy_rows.append({"key": key, "label": label, "n": len(members),
                            "by_role": {k: len(members & v) for k, v in by_role_ids.items()}})
    add_route = dict(Counter(themes[i]["additionality_route"] for i in tally_ids if themes[i]["additionality_route"] != "na"))
    impact_rows = {s: {"n": sum(1 for i in tally_ids if themes[i]["impact_metric"] == s),
                       "by_role": {k: sum(1 for i in v if i != DUP_PAIR[0] and themes[i]["impact_metric"] == s)
                                   for k, v in by_role_ids.items()}}
                   for s in ("support", "oppose", "none")}

    # --- existing stance codes for cohort members --------------------------------
    def load(p):
        return {int(r["respondent_id"]): r for r in read_csv(ROOT / "data" / "derived" / p)}
    add, mech, imp, mbm = (load("additionality_stance.csv"), load("additionality_mechanism.csv"),
                           load("impact_stance.csv"), load("mbm_impact_stance.csv"))

    def overall_add(r):
        s = {r["add_stance"], r["inc_stance"]} - {"na"}
        if "support" in s and "oppose" not in s:
            return "support"
        if "oppose" in s and "support" not in s:
            return "oppose"
        return "mixed" if s else "neutral"
    existing = {
        "additionality": dict(Counter(overall_add(add[i]) for i in ids if i in add)),
        "additionality_coded": sum(1 for i in ids if i in add),
        "impact": dict(Counter(imp[i]["stance"] for i in ids if i in imp)),
        "impact_venue": dict(Counter(imp[i]["venue"] for i in ids if i in imp and imp[i]["stance"] in ("support", "mixed"))),
        "impact_coded": sum(1 for i in ids if i in imp),
        "mbm_system_impact": dict(Counter(mbm[i]["system_impact"] for i in ids if i in mbm)),
        "mbm_sufficiency": dict(Counter(mbm[i]["sufficiency"] for i in ids if i in mbm)),
        "mbm_consequential": dict(Counter(mbm[i]["consequential"] for i in ids if i in mbm)),
        "mbm_coded": sum(1 for i in ids if i in mbm),
    }

    # --- respondents -----------------------------------------------------------
    def descriptor(i):
        r = resp[i]
        typ = ORG_LABEL[r["type"]]
        if r["type"] == "Other (please specify below)" and r["type_other"]:
            typ = "Other"
        sec = SECTOR_LABEL[r["sector"]]
        if r["sector"] == "Other (please specify below)" and r["sector_other"]:
            sec = r["sector_other"][:30]
        who = "Redacted" if r["redacted"] else ("Individual" if r["as"] != "Organization" else "Unidentifiable")
        return f"{who} — {typ.lower()}, {sec.lower()} ({r['country']})"

    rows = []
    for i in sorted(ids):
        c, t, r = cohort[i], themes[i], resp[i]
        name = c["display_name"] if (c["display_name"] and not r["redacted"] and r["as"] == "Organization") else ""
        rows.append({
            "id": i, "tier": c["tier"], "role": c["role"], "secondary_role": c["secondary_role"],
            "name": name, "descriptor": descriptor(i), "named": bool(name), "redacted": int(r["redacted"]),
            "individual": int(r["as"] != "Organization"), "country": r["country"],
            "claimed_type": ORG_LABEL[r["type"]], "sector": SECTOR_LABEL[r["sector"]],
            "audited": AUDIT_LABEL.get(audit.get(i, ""), audit.get(i, "")),
            "completion_pct": round(r["pct"], 1), "ft_chars": r["ft"],
            "anchors": [int(score[q][i]) if i in score[q] else None for q, _ in ANCHORS],
            "themes": [k for k, _ in THEME_LABELS if t[k] == "1"],
            "legacy_design": t["legacy_design"], "impact_metric": t["impact_metric"],
            "additionality_route": t["additionality_route"],
            "q146": next((x for rid, x in con.execute(
                "SELECT respondent_id, answer_text FROM responses WHERE question_number=146 AND respondent_id=?", (i,))), ""),
            "quote": t["quote"], "quote_q": int(t["quote_q"]) if t["quote_q"] else None,
            "shared_outside": len(outsiders.get(i, ())), "duplicate_of": DUP_PAIR[1] if i == DUP_PAIR[0] else None,
            "note": c["note"],
        })
    who_of = {row["id"]: (row["name"] or row["descriptor"]) for row in rows}

    quote_bank = {k: [] for k, _ in QUOTE_THEMES}
    for q in quotes:
        i = int(q["respondent_id"])
        quote_bank[q["theme"]].append({"id": i, "who": who_of[i], "named": bool(cohort[i]["display_name"] and not resp[i]["redacted"]),
                                       "role": role_of[i], "q": int(q["question_number"]), "quote": q["quote"]})

    comp = {
        "tier": {"institutions": len(inst), "associations": len(assoc)},
        "role": [{"key": k, "label": lab, "n": len(by_role_ids[k]),
                  "institutions": len(by_role_ids[k] & inst), "associations": len(by_role_ids[k] & assoc)} for k, lab in ROLES],
        "redaction": {"redacted": sum(resp[i]["redacted"] for i in ids), "named": sum(1 for i in ids if rows[sorted(ids).index(i)]["named"]),
                      "individual_or_unidentifiable": sum(1 for i in ids if not resp[i]["redacted"] and not rows[sorted(ids).index(i)]["named"])},
        "claimed_type": dict(sorted(Counter(ORG_LABEL[resp[i]["type"]] for i in ids).items(), key=lambda kv: (-kv[1], kv[0]))),
        "audited": dict(sorted(Counter(AUDIT_LABEL.get(audit.get(i, ""), "") for i in ids).items(), key=lambda kv: (-kv[1], kv[0]))),
        "country": dict(sorted(Counter(resp[i]["country"] for i in ids).items(), key=lambda kv: (-kv[1], kv[0]))),
        "free_text_chars": sum(resp[i]["ft"] for i in ids),
        "median_completion_pct": sorted(resp[i]["pct"] for i in ids)[len(ids) // 2],
    }
    data = {
        "_comment": "Generated by scripts/analytics/financial.py export. Cohort rule and codes in "
                    "reference/financial_codebook.md; themes hand-coded in data/derived/financial_themes.csv. "
                    "Every tally (scale, picklist, theme, legacy, impact) excludes respondent 130, a verbatim duplicate of 598; the respondent table keeps it.",
        "totals": {"respondents": N, "cohort": len(ids), "tally_base": len(stat_ids),
                   "institutions": len(inst), "associations": len(assoc)},
        "composition": comp, "roles": ROLES, "anchors": anchors, "picklists": picklists, "choices": choices,
        "themes": theme_rows, "legacy_design": legacy_rows, "impact_metric": impact_rows,
        "additionality_route": add_route,
        "existing_codes": existing, "quotes": quote_bank, "quote_themes": QUOTE_THEMES,
        "theme_labels": THEME_LABELS, "legacy_labels": LEGACY_LABELS, "respondents": rows,
        "duplication": {"pair": list(DUP_PAIR), "pair_shared_sentences": pair_shared,
                        "shared_outside": {str(i): len(v) for i, v in sorted(outsiders.items()) if v}},
    }
    for p in (OUT, FIXTURE):
        p.write_text(json.dumps(data, sort_keys=True, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps({"cohort": len(ids), "institutions": len(inst), "associations": len(assoc),
                      "themes": {t["key"]: t["n"] for t in theme_rows},
                      "legacy": {t["key"]: t["n"] for t in legacy_rows}, "impact": {k: v["n"] for k, v in impact_rows.items()},
                      "pair_shared": pair_shared, "bytes": OUT.stat().st_size}, indent=1))


if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "export":
        main()
    else:
        sys.exit(__doc__)
