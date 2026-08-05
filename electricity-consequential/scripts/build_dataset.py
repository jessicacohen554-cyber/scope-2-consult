#!/usr/bin/env python3
"""Reshape the GHG Protocol Electricity-Sector Consequential Methods public
consultation raw export into a tidy, queryable dataset.

Input : Electricity-Sector-ConsequentialMethodsPublicConsultationFeedback-RawData-2026.07.29.xlsx
        (sheet "Raw Data", A1:BE186 = header + 185 respondents x 56 question columns)
Output: data/*.csv, data/electricity_consequential.sqlite, data/manifest.json

Every answer stays attached to its respondent ID; nothing is dropped or
truncated. Interpretation (sections, the additionality ladder, granularity
ladders, special options, polarity) lives in survey_meta.py. This module is
mechanical: it detects shape, joins the hand-curated labels, and reshapes.

The build is deterministic - rerunning it produces byte-identical outputs.

Usage:  python3 electricity-consequential/scripts/build_dataset.py
"""
from __future__ import annotations

import csv
import json
import re
import sqlite3
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

import openpyxl

sys.path.insert(0, str(Path(__file__).resolve().parent))
import survey_meta as meta  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / ("Electricity-Sector-ConsequentialMethodsPublic"
              "ConsultationFeedback-RawData-2026.07.29.xlsx")
OUT = ROOT / "data"
SHEET = "Raw Data"
DB_NAME = "electricity_consequential.sqlite"

# Multi-select cells are semicolon-delimited with a trailing delimiter. A part is
# treated as one of the offered options if enough respondents picked it; the rest
# are retained as write-ins so no text is lost.
CANONICAL_MIN_SHARE = 0.05
OTHER_PAT = re.compile(
    r"^other\b|\(please (specify|explain|describe)\)|\(describe\)|\(explain\)", re.I)


# ---------------------------------------------------------------------------
# text normalisation
# ---------------------------------------------------------------------------
def norm_text(value) -> str:
    """Collapse the export's assorted invisible whitespace without changing meaning.

    The raw file carries NBSP, narrow NBSP, thin space, ideographic space, BOM,
    zero-width space and zero-width joiner - a side effect of respondents pasting
    from Word and of the survey tool's own encoding. Left alone they split
    otherwise-identical option labels into distinct strings. 844 of this export's
    cells are changed by this pass, and the multi-select option labels are the
    reason it has to run before anything is matched: the raw strings carry
    trailing and doubled spaces ("SCED - locational  ;").
    """
    if value is None:
        return ""
    s = str(value)
    out = []
    for ch in s:
        cat = unicodedata.category(ch)
        if cat == "Cf":  # zero-width / formatting: drop entirely
            continue
        if cat == "Zs" and ch != " ":  # any other space separator -> plain space
            out.append(" ")
            continue
        out.append(ch)
    s = "".join(out)
    s = s.replace("\r\n", "\n").replace("\r", "\n")
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    s = re.sub(r" *\n *", "\n", s)
    # A couple of cells were stored as JSON-ish literals: ["4 - Mostly ready"]
    m = re.fullmatch(r'\["(.*)"\]', s.strip())
    if m:
        s = m.group(1)
    return s.strip()


def norm_key(s: str) -> str:
    """Loose key for matching option labels against the ladders in survey_meta."""
    s = norm_text(s).lower()
    s = s.replace("–", "-").replace("—", "-").replace("−", "-")
    s = s.replace("’", "'").replace("‘", "'")
    return re.sub(r"\s+", " ", s).strip(" .")


# ---------------------------------------------------------------------------
# question metadata derivation
# ---------------------------------------------------------------------------
# "19. Referencing..." -> (19, None); "26.1. Regulatory test" -> (26, 1).
# The optional second period is what makes the malformed header "26.6 Posititve
# list" parse the same as its eight well-formed siblings.
HEADER_PAT = re.compile(r"^\s*(\d{1,3})(?:\.(\d))?\.?\s")

# Follow-on questions are recognised from the boilerplate that OPENS them, not
# from boilerplate anywhere in the wording. Question 30 ("Please list any
# additionality tests not already included here... Please explain why each test
# should be considered.") is the reason: it is a substantive primary that happens
# to contain a follow-up's phrasing in its second sentence. Each entry is
# (role, pattern, condition, parent_group) where parent_group, when set, names
# the capture holding the explicit parent question number.
ROLE_RULES = [
    ("other_specify",
     re.compile(r'if you (?:selected|answered)\s*["“‘\']?\s*other\b', re.I),
     "", None),
    ("comment",
     re.compile(r'if you answered\s*["“‘\']?\s*(yes|no)\s*'
                r'["”’\']?\s*to question\s*(\d{1,3})', re.I),
     1, 2),
    ("comment",
     re.compile(r"if you selected any of these approaches", re.I),
     "selected", None),
    ("comment",
     re.compile(r"please explain your answer to question\s*(\d{1,3})", re.I),
     "", 1),
    ("comment",
     re.compile(r"please provide context regarding your answer to question\s*(\d{1,3})",
                re.I),
     "", 1),
    ("comment",
     re.compile(r"please provide (?:any )?(?:additional )?"
                r"(?:comments?|context|explanations?|further details|"
                r"additional explanation)", re.I),
     "", None),
    ("comment",
     re.compile(r"for the additionality tests you selected.*?please provide commentary",
                re.I),
     "selected", None),
]

REF_PAT = re.compile(r"question[s]?\s*(\d{1,3})(?:\s*(?:[-–&,]|and|to)\s*(\d{1,3}))?",
                     re.I)
Q_SHORT_PAT = re.compile(r"\bQ\.?\s?(\d{1,3})\b")

# The survey numbers its questions 3..52 (1, 2, 7 and 8 are absent from the
# export), so a reference outside that range is a section number or a stray
# figure, not a cross-reference.
REF_MIN, REF_MAX = 3, 52


def classify_role(qnum: int, text: str, is_free: bool) -> tuple[str, str, int | None]:
    """-> (role, condition, explicit parent question number or None).

    `text` is the question wording with its leading number stripped, because the
    rules are anchored to the start of the question.
    """
    for role, pat, cond_spec, parent_group in ROLE_RULES:
        m = pat.match(text)
        if not m:
            continue
        condition = (m.group(cond_spec).lower()
                     if isinstance(cond_spec, int) else cond_spec)
        parent = int(m.group(parent_group)) if parent_group else None
        return role, condition, parent
    if REF_MIN <= qnum <= 17:
        return "profile", "", None
    return ("free_text_primary" if is_free else "primary"), "", None


def extract_refs(text: str, self_num: int) -> list[int]:
    refs: set[int] = set()
    for m in REF_PAT.finditer(text):
        a = int(m.group(1))
        b = int(m.group(2)) if m.group(2) else None
        if b and 0 < b - a <= 12:
            refs.update(range(a, b + 1))
        else:
            refs.add(a)
            if b:
                refs.add(b)
    for m in Q_SHORT_PAT.finditer(text):
        refs.add(int(m.group(1)))
    refs.discard(self_num)
    return sorted(r for r in refs if REF_MIN <= r <= REF_MAX)


# ---------------------------------------------------------------------------
# load
# ---------------------------------------------------------------------------
def load_grid():
    """-> header, normalised rows, and the SOURCE length of every cell.

    The source lengths are kept because whether an answer hit the survey tool's
    4,000-character cap is a fact about the raw cell, and norm_text shortens
    cells by up to 20 characters.
    """
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    ws = wb[SHEET]
    it = ws.iter_rows(values_only=True)
    header = [norm_text(h) for h in next(it)]
    rows, raw_lens = [], []
    for r in it:
        vals = [norm_text(v) for v in r]
        if any(vals):
            rows.append(vals)
            raw_lens.append([0 if v is None else len(str(v)) for v in r])
    wb.close()
    return header, rows, raw_lens


def main() -> None:
    OUT.mkdir(exist_ok=True)
    header, rows, raw_lens = load_grid()
    n_resp = len(rows)
    print(f"loaded {n_resp} respondents x {len(header)} columns")

    # ---------------- pass 1: shape of each column ----------------
    cols = []  # dicts, one per column
    for idx, h in enumerate(header):
        vals = [r[idx] for r in rows]
        filled = [v for v in vals if v]
        m = HEADER_PAT.match(h)
        qnum = int(m.group(1)) if m else None
        sub = int(m.group(2)) if (m and m.group(2)) else None

        ends_semi = sum(1 for v in filled if v.endswith(";"))
        is_multi = bool(filled) and ends_semi >= 0.9 * len(filled)

        parts = Counter()
        if is_multi:
            for v in filled:
                for p in v.split(";"):
                    p = p.strip()
                    if p:
                        parts[p] += 1
        whole = Counter(filled)
        maxlen = max((len(v) for v in filled), default=0)
        # Single-select: no delimiter, all answers short, and answers repeat.
        # The length test does most of the work; the repeat test additionally
        # keeps question 4 (name) out - its answers are short but almost all
        # distinct - and lets in the larger picklists: country (28 values),
        # sector (24), organisation type (13).
        is_single = (
            (not is_multi) and bool(filled) and maxlen <= 320
            and (len(whole) <= 12 or len(whole) / len(filled) <= 0.35)
        )
        is_free = not (is_multi or is_single) and qnum is not None

        cols.append(dict(
            col_index=idx + 1, header=h, qnum=qnum, sub=sub,
            values=vals, filled=filled, raw_lens=[r[idx] for r in raw_lens],
            is_multi=is_multi, is_single=is_single, is_free=is_free,
            parts=parts, whole=whole, maxlen=maxlen,
        ))

    id_col = cols[0]
    assert id_col["header"] == "ID", id_col["header"]
    resp_ids = [int(v) for v in id_col["values"]]
    assert len(set(resp_ids)) == n_resp, "respondent IDs are not unique"

    qcols = [c for c in cols if c["qnum"] is not None]
    # Question 26 is a matrix, so its nine columns share a major number. Only the
    # profile questions are looked up by major number, and those are unique.
    by_major = {c["qnum"]: c for c in qcols if c["sub"] is None}
    for c in qcols:
        c["question_id"] = (f"Q{c['qnum']:03d}" if c["sub"] is None
                            else f"Q{c['qnum']:03d}_{c['sub']}")
        c["display"] = (f"Q{c['qnum']}" if c["sub"] is None
                        else f"Q{c['qnum']}.{c['sub']}")

    # ---------------- hand-curated question labels ----------------
    # Left join by question_id, but a miss on either side is an error rather
    # than a null: an unlabelled question would surface as blank cells in
    # questions.csv long after the fact, and a label for a question that is not
    # in the export means the file has drifted from the source. The vocabulary
    # and its rules live in survey_meta; this is only the join.
    labels = meta.load_labels(ROOT)
    qids = {c["question_id"] for c in qcols}
    missing, extra = sorted(qids - set(labels)), sorted(set(labels) - qids)
    if missing or extra:
        raise SystemExit(
            f"{meta.LABELS_FILE}: label coverage mismatch\n"
            + (f"  unlabelled questions ({len(missing)}): "
               f"{', '.join(missing)}\n" if missing else "")
            + (f"  labels for questions absent from the export ({len(extra)}): "
               f"{', '.join(extra)}\n" if extra else ""))
    print(f"joined {len(labels)} question labels")

    # ---------------- pass 2: question type + interpretation ----------------
    for c in qcols:
        qnum, h = c["qnum"], c["header"]
        c["text"] = HEADER_PAT.sub("", h, count=1).strip()
        order, label = meta.section_for(qnum)
        c["section_order"], c["section"] = order, label
        c["role"], c["condition"], c["explicit_parent"] = classify_role(
            qnum, c["text"], c["is_free"])
        c["refs"] = extract_refs(h, qnum)

        ladder = meta.ORDINAL_LADDERS.get(qnum)
        if c["sub"] is not None:
            c["qtype"] = "matrix_rating"
            ladder = meta.MATRIX_LADDER
        elif c["is_multi"]:
            c["qtype"] = "multi_select"
        elif ladder:
            c["qtype"] = "ordinal_select"
        elif c["is_single"]:
            c["qtype"] = "single_select"
        else:
            c["qtype"] = "free_text"

        c["construct"] = (meta.MATRIX_CONSTRUCT if c["qtype"] == "matrix_rating"
                          else "ordinal" if c["qtype"] == "ordinal_select" else "")
        c["note"] = meta.NOTES.get(qnum, "")
        c["ladder"] = ladder
        c["labels"] = labels[c["question_id"]]

    # topic is the axis the pages are built from, and section is survey order;
    # where the label file disagrees with the survey's own ordering it is the
    # label file that is wrong.
    drift = [f'{c["question_id"]}: topic {c["labels"]["topic"]!r} but section '
             f'{c["section_order"]} implies '
             f'{meta.SECTION_IMPLIES_TOPIC[c["section_order"]]!r}'
             for c in qcols
             if c["labels"]["topic"] != meta.PROVISIONAL_LABEL_VALUE
             and c["labels"]["topic"] != meta.SECTION_IMPLIES_TOPIC[c["section_order"]]]
    if drift:
        raise SystemExit(f"{meta.LABELS_FILE}: topic/section drift\n  "
                         + "\n  ".join(drift))

    # parent / anchor: what a follow-on question hangs off.
    ordered = sorted(qcols, key=lambda c: (c["qnum"], c["sub"] or 0))
    FOLLOW_ON = {"other_specify", "comment"}
    for i, c in enumerate(ordered):
        parent = anchor = None
        if c["role"] in FOLLOW_ON:
            if c["explicit_parent"] is not None:
                parent = c["explicit_parent"]
            else:
                explicit = [r for r in c["refs"] if r < c["qnum"] and r in by_major]
                parent = max(explicit) if explicit else (
                    ordered[i - 1]["qnum"] if i > 0 else None)
            for prev in reversed(ordered[:i]):
                if (prev["role"] in ("primary", "free_text_primary", "profile")
                        and prev["section_order"] == c["section_order"]):
                    anchor = prev["qnum"]
                    break
        elif c["role"] in ("primary", "free_text_primary"):
            anchor = c["qnum"]
        c["parent_qnum"], c["anchor_qnum"] = parent, anchor

    # ---------------- pass 3: option catalogue ----------------
    option_rows = []
    for c in qcols:
        if c["is_multi"]:
            n = len(c["filled"])
            cutoff = max(3, CANONICAL_MIN_SHARE * n)
            for opt, cnt in c["parts"].most_common():
                key = norm_key(opt)
                is_other = bool(OTHER_PAT.search(opt))
                canonical = (
                    cnt >= cutoff
                    or (is_other and len(opt) <= 60)
                    or key in meta.STANDARD_OPTIONS
                )
                option_rows.append(dict(
                    question_id=c["question_id"], question_number=c["qnum"],
                    sub_number=c["sub"] or "", option_text=opt, option_rank="",
                    is_canonical=int(canonical), is_other_option=int(is_other),
                    is_special=int(key in meta.SPECIAL_OPTIONS), n_selected=cnt,
                    pct_of_answered=round(100.0 * cnt / n, 2) if n else 0.0,
                ))
        elif c["qtype"] in ("single_select", "ordinal_select", "matrix_rating"):
            n = len(c["filled"])
            for opt, cnt in c["whole"].most_common():
                key = norm_key(opt)
                # A special option carries no position on the ladder, so it is
                # left unranked even where the ladder happens to name it.
                special = key in meta.SPECIAL_OPTIONS
                rank = "" if special else (
                    c["ladder"][key] if (c["ladder"] and key in c["ladder"]) else "")
                option_rows.append(dict(
                    question_id=c["question_id"], question_number=c["qnum"],
                    sub_number=c["sub"] or "", option_text=opt, option_rank=rank,
                    is_canonical=1, is_other_option=int(bool(OTHER_PAT.search(opt))),
                    is_special=int(special), n_selected=cnt,
                    pct_of_answered=round(100.0 * cnt / n, 2) if n else 0.0,
                ))
    canonical_opts = {
        (o["question_id"], o["option_text"]) for o in option_rows if o["is_canonical"]
    }
    special_opts = {
        (o["question_id"], o["option_text"]) for o in option_rows if o["is_special"]
    }
    # Derived rather than hand-maintained, so the flags cannot drift from the data.
    write_in_counts = Counter()
    borderline = Counter()
    for o in option_rows:
        if not o["is_canonical"]:
            write_in_counts[o["question_id"]] += o["n_selected"]
            borderline[o["question_id"]] = max(
                borderline[o["question_id"]], o["n_selected"])
    rank_lookup = {
        (o["question_id"], o["option_text"]): o["option_rank"] for o in option_rows
    }

    # ---------------- pass 4: long responses + exploded selections ----------
    long_rows, sel_rows = [], []
    per_resp = defaultdict(lambda: dict(answered=0, free_text=0, chars=0, selections=0))

    for ri, rid in enumerate(resp_ids):
        for c in qcols:
            raw = c["values"][ri]
            if not raw:
                continue
            qid, qnum = c["question_id"], c["qnum"]
            stats = per_resp[rid]
            stats["answered"] += 1

            numeric = ""
            n_sel = ""
            if c["is_multi"]:
                picked = [p.strip() for p in raw.split(";") if p.strip()]
                n_sel = len(picked)
                stats["selections"] += n_sel
                for si, opt in enumerate(picked, 1):
                    sel_rows.append(dict(
                        respondent_id=rid, question_id=qid, question_number=qnum,
                        selection_index=si, option_text=opt,
                        is_canonical=int((qid, opt) in canonical_opts),
                        is_special=int((qid, opt) in special_opts),
                    ))
            else:
                r = rank_lookup.get((qid, raw), "")
                numeric = r if r != "" else ""

            is_text = c["qtype"] == "free_text"
            if is_text:
                stats["free_text"] += 1
                stats["chars"] += len(raw)

            lab = c["labels"]
            long_rows.append(dict(
                respondent_id=rid, question_id=qid, question_number=qnum,
                sub_number=c["sub"] or "", display=c["display"],
                section_order=c["section_order"], section=c["section"],
                # Carried at answer grain, not just on the codebook, so that a
                # discrete answer can be grouped by shorthand, topic, concern or
                # answer type without joining back to questions.
                shorthand=lab["shorthand"], topic=lab["topic"],
                doc_section=lab["doc_section"], category=lab["category"],
                asks_for=lab["asks_for"],
                question_type=c["qtype"], role=c["role"], construct=c["construct"],
                answer_text=raw, answer_numeric=numeric, n_selected=n_sel,
                char_count=len(raw) if is_text else "",
                word_count=len(raw.split()) if is_text else "",
                likely_truncated=int(
                    is_text
                    and c["raw_lens"][ri] >= meta.TEXT_LIMIT - meta.TRUNCATION_BAND),
            ))

    # ---------------- respondents ----------------
    # Questions 7 and 8 of the Scope 2 profile block (newsletter opt-in) are not
    # in this export, so this survey's profile is 13 fields, not 14.
    PROFILE = {
        3: "redaction_requested", 4: "name", 5: "organization", 6: "country",
        9: "responding_as", 10: "has_ghg_inventory",
        11: "has_ghg_inventory_other", 12: "involved_in_inventory",
        13: "involved_in_inventory_other", 14: "organization_type",
        15: "organization_type_other", 16: "sector", 17: "sector_other",
    }
    n_answerable = len(qcols) - len(PROFILE)

    def attribution(row):
        """Label withheld identities instead of leaving them null.

        Requesting redaction is itself a finding worth counting, so the two
        reasons a name can be missing are kept distinct: 'Redacted' means the
        respondent asked for redaction (question 3), 'Not provided' means they
        did not ask but left the field empty anyway.
        """
        redacted = row["redaction_requested"] == "Yes"
        for field in ("name", "organization"):
            if not row[field]:
                row[field] = "Redacted" if redacted else "Not provided"
        return int(redacted)

    resp_rows = []
    for ri, rid in enumerate(resp_ids):
        row = {"respondent_id": rid}
        for qnum, field in PROFILE.items():
            row[field] = by_major[qnum]["values"][ri] if qnum in by_major else ""
        s = per_resp[rid]
        substantive = s["answered"] - sum(
            1 for qnum in PROFILE if qnum in by_major and by_major[qnum]["values"][ri])
        row["is_redacted"] = attribution(row)
        # Adjudicated downstream: P10 proposes junk / superseded candidates, P20
        # adjudicates into reference/exclusions.csv, P22 enforces the analytical
        # base. The columns exist from day one so nothing has to migrate.
        row["is_excluded"] = 0
        row["exclusion_reason"] = ""
        row.update(
            n_questions_answered=s["answered"],
            n_substantive_answered=substantive,
            substantive_completion_pct=round(100.0 * substantive / n_answerable, 1),
            n_free_text_answers=s["free_text"],
            free_text_chars=s["chars"],
            n_multi_select_selections=s["selections"],
        )
        resp_rows.append(row)

    # ---------------- questions codebook ----------------
    q_rows = []
    for c in ordered:
        n = len(c["filled"])
        n_opts = len([o for o in option_rows
                      if o["question_id"] == c["question_id"] and o["is_canonical"]])
        lab = c["labels"]
        q_rows.append(dict(
            question_id=c["question_id"], question_number=c["qnum"],
            sub_number=c["sub"] or "", display=c["display"],
            column_index=c["col_index"],
            section_order=c["section_order"], section=c["section"],
            shorthand=lab["shorthand"], label=lab["label"],
            topic=lab["topic"], doc_section=lab["doc_section"],
            category=lab["category"], subcategory=lab["subcategory"],
            asks_for=lab["asks_for"],
            question_type=c["qtype"], role=c["role"], construct=c["construct"],
            condition=c["condition"],
            parent_question=c["parent_qnum"] or "",
            anchor_question=c["anchor_qnum"] or "",
            references_questions=",".join(str(r) for r in c["refs"]),
            n_answered=n, response_rate_pct=round(100.0 * n / n_resp, 1),
            n_options=n_opts if n_opts else "",
            n_write_in_selections=write_in_counts.get(c["question_id"], 0),
            # Set where a string classified as a write-in was nonetheless picked
            # by 5+ respondents, i.e. the offered-option call is worth eyeballing.
            review_option_split=int(borderline.get(c["question_id"], 0) >= 5),
            max_answer_chars=c["maxlen"],
            question_text=c["text"], question_text_short=c["text"][:120],
            notes=c["note"], label_notes=lab["label_notes"],
        ))

    # ---------------- wide table ----------------
    wide_fields = (["respondent_id"]
                   + [PROFILE[q] for q in sorted(PROFILE) if q in by_major]
                   + ["is_redacted", "is_excluded"])
    numeric_qs = [c for c in ordered
                  if c["qtype"] in ("ordinal_select", "matrix_rating")]
    body_qs = [c for c in ordered if not (c["sub"] is None and c["qnum"] in PROFILE)]
    for c in body_qs:
        wide_fields.append(c["question_id"])
        if c in numeric_qs:
            wide_fields.append(c["question_id"] + "_num")
    wide_rows = []
    for ri, rid in enumerate(resp_ids):
        row = {"respondent_id": rid}
        for qnum in sorted(PROFILE):
            if qnum in by_major:
                row[PROFILE[qnum]] = by_major[qnum]["values"][ri]
        row["is_redacted"] = attribution(row)
        row["is_excluded"] = 0
        for c in body_qs:
            raw = c["values"][ri]
            row[c["question_id"]] = raw
            if c in numeric_qs:
                row[c["question_id"] + "_num"] = rank_lookup.get(
                    (c["question_id"], raw), "") if raw else ""
        wide_rows.append(row)

    # ---------------- write CSVs ----------------
    def write_csv(name, rows_, fields):
        path = OUT / name
        with path.open("w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=fields, extrasaction="raise")
            w.writeheader()
            w.writerows(rows_)
        print(f"  {name}: {len(rows_)} rows x {len(fields)} cols")

    print("writing CSVs")
    write_csv("questions.csv", q_rows, list(q_rows[0]))
    write_csv("question_options.csv", option_rows, list(option_rows[0]))
    write_csv("respondents.csv", resp_rows, list(resp_rows[0]))
    write_csv("responses_long.csv", long_rows, list(long_rows[0]))
    write_csv("response_selections.csv", sel_rows, list(sel_rows[0]))
    write_csv("responses_wide.csv", wide_rows, wide_fields)

    # ---------------- SQLite ----------------
    db_path = OUT / DB_NAME
    if db_path.exists():
        db_path.unlink()
    con = sqlite3.connect(db_path)
    con.executescript("""
    CREATE TABLE questions (
      question_id TEXT PRIMARY KEY, question_number INTEGER, sub_number INTEGER,
      display TEXT, column_index INTEGER,
      section_order INTEGER, section TEXT,
      shorthand TEXT, label TEXT, topic TEXT, doc_section TEXT,
      category TEXT, subcategory TEXT, asks_for TEXT,
      question_type TEXT, role TEXT, construct TEXT, condition TEXT,
      parent_question INTEGER, anchor_question INTEGER,
      references_questions TEXT, n_answered INTEGER, response_rate_pct REAL,
      n_options INTEGER, n_write_in_selections INTEGER, review_option_split INTEGER,
      max_answer_chars INTEGER,
      question_text TEXT, question_text_short TEXT, notes TEXT,
      label_notes TEXT);
    CREATE TABLE question_options (
      question_id TEXT, question_number INTEGER, sub_number INTEGER,
      option_text TEXT, option_rank INTEGER, is_canonical INTEGER,
      is_other_option INTEGER, is_special INTEGER, n_selected INTEGER,
      pct_of_answered REAL);
    CREATE TABLE responses (
      respondent_id INTEGER, question_id TEXT, question_number INTEGER,
      sub_number INTEGER, display TEXT,
      section_order INTEGER, section TEXT,
      shorthand TEXT, topic TEXT, doc_section TEXT, category TEXT,
      asks_for TEXT,
      question_type TEXT, role TEXT, construct TEXT,
      answer_text TEXT, answer_numeric REAL, n_selected INTEGER,
      char_count INTEGER, word_count INTEGER, likely_truncated INTEGER);
    CREATE TABLE response_selections (
      respondent_id INTEGER, question_id TEXT, question_number INTEGER,
      selection_index INTEGER, option_text TEXT, is_canonical INTEGER,
      is_special INTEGER);
    """)
    # respondents table: build columns from the dict keys. is_redacted and
    # is_excluded are declared INTEGER so that SUM() over them means what it
    # looks like it means.
    rfields = list(resp_rows[0])
    int_fields = {"respondent_id", "is_redacted", "is_excluded"}
    con.execute("CREATE TABLE respondents (%s)" % ", ".join(
        f'"{k}" {"INTEGER" if (k in int_fields or k.startswith("n_") or k.endswith("_chars")) else "TEXT"}'
        + (" PRIMARY KEY" if k == "respondent_id" else "")
        for k in rfields))

    def insert(table, rows_, fields):
        con.executemany(
            f'INSERT INTO {table} ({",".join(chr(34)+f+chr(34) for f in fields)}) '
            f'VALUES ({",".join("?" * len(fields))})',
            [tuple(None if r.get(f) == "" else r.get(f) for f in fields) for r in rows_])

    insert("questions", q_rows, list(q_rows[0]))
    insert("question_options", option_rows, list(option_rows[0]))
    insert("respondents", resp_rows, rfields)
    insert("responses", long_rows, list(long_rows[0]))
    insert("response_selections", sel_rows, list(sel_rows[0]))

    con.executescript("""
    CREATE INDEX ix_resp_q   ON responses(question_id);
    CREATE INDEX ix_resp_n   ON responses(question_number);
    CREATE INDEX ix_resp_r   ON responses(respondent_id);
    CREATE INDEX ix_resp_top ON responses(topic);
    CREATE INDEX ix_resp_sh  ON responses(shorthand);
    CREATE INDEX ix_resp_ask ON responses(asks_for);
    CREATE INDEX ix_sel_q    ON response_selections(question_id);
    CREATE INDEX ix_sel_r    ON response_selections(respondent_id);

    -- Every closed-choice answer with its respondent's profile and the
    -- question's meaning. One row per respondent x question: the labels are
    -- here to group discrete answers by, not to aggregate them away. Matrix
    -- rows are included, which is why answer_rank is a stringency position and
    -- not a score - never average across question_type.
    CREATE VIEW v_stance_answers AS
    SELECT r.respondent_id, r.question_number, r.sub_number, q.question_id,
           q.display, q.shorthand, q.label, q.topic, q.doc_section,
           q.category, q.asks_for, q.section, q.question_type, q.construct,
           q.question_text_short, r.answer_text, r.answer_numeric AS answer_rank,
           p.country, p.responding_as, p.organization_type, p.sector,
           p.organization, p.is_redacted, p.is_excluded
    FROM responses r
    JOIN questions q USING(question_id)
    JOIN respondents p ON p.respondent_id = r.respondent_id
    WHERE q.question_type IN ('single_select','ordinal_select','matrix_rating');

    -- One row per closed-choice question: how many answered, how many landed on
    -- a ranked (non-special) option, and the mean ladder position where a
    -- ladder exists. Binary stance questions have no ladder, so mean_rank is
    -- deliberately null for them rather than a fabricated 0/1 mean.
    CREATE VIEW v_stance_summary AS
    SELECT q.question_id, q.question_number, q.sub_number, q.display,
           q.shorthand, q.label, q.topic, q.doc_section, q.category,
           q.asks_for, q.section, q.question_type, q.construct,
           q.question_text_short,
           COUNT(r.answer_text)    AS n_answered,
           COUNT(r.answer_numeric) AS n_ranked,
           ROUND(AVG(r.answer_numeric), 2) AS mean_rank
    FROM questions q LEFT JOIN responses r USING(question_id)
    WHERE q.question_type IN ('single_select','ordinal_select','matrix_rating')
    GROUP BY q.question_id
    ORDER BY q.question_number, q.sub_number;

    -- Option frequencies for the multi-select questions, with profile joins
    -- available. One row per option ticked per respondent. is_special marks the
    -- escape hatches ("None", "Unsure", "All are feasible") that must never be
    -- netted into an approval figure.
    CREATE VIEW v_selections AS
    SELECT s.respondent_id, s.question_number, s.question_id, q.display,
           q.shorthand, q.label, q.topic, q.doc_section, q.category,
           q.asks_for, q.section,
           q.question_text_short, s.option_text, s.is_canonical, s.is_special,
           p.country, p.responding_as, p.organization_type, p.sector,
           p.is_redacted, p.is_excluded
    FROM response_selections s
    JOIN questions q USING(question_id)
    JOIN respondents p ON p.respondent_id = s.respondent_id;

    -- Drill-down tree: a substantive question with the follow-ups hanging off
    -- it. Shorthands on both sides, so the boilerplate follow-ups
    -- ("Please explain your answer to question 19") are readable without their
    -- parent's wording. `condition` says which answer to the parent the
    -- follow-up was addressed to, where the survey said so. Question 26 is a
    -- matrix, so it has no single row to anchor to; its first row (26.1) stands
    -- in for the whole matrix, which is what makes question 27 - the commentary
    -- on the matrix - reachable from the tree.
    CREATE VIEW v_question_tree AS
    SELECT a.question_number AS anchor_number, a.display AS anchor_display,
           a.shorthand AS anchor_shorthand, a.label AS anchor_label,
           a.question_text_short AS anchor_text,
           a.topic, a.doc_section, a.category, a.section,
           c.question_number, c.sub_number, c.question_id, c.display,
           c.shorthand, c.label, c.asks_for, c.role, c.condition,
           c.parent_question, c.question_type, c.n_answered,
           c.question_text_short
    FROM questions c JOIN questions a ON a.question_number = c.anchor_question
                                     AND (a.sub_number IS NULL OR a.sub_number = 1)
    ORDER BY a.question_number, c.question_number, c.sub_number;

    -- How many answers of each type each respondent gave. Counts only; the
    -- discrete answers stay in `responses`, which this groups rather than
    -- replaces, so any cell here drills back to named respondents.
    CREATE VIEW v_answer_types AS
    SELECT r.respondent_id, q.topic, q.category, q.asks_for, q.question_type,
           COUNT(*)                             AS n_answers,
           COUNT(r.answer_numeric)              AS n_ranked,
           SUM(COALESCE(r.n_selected, 0))       AS n_selections,
           SUM(COALESCE(r.char_count, 0))       AS free_text_chars
    FROM responses r JOIN questions q USING(question_id)
    GROUP BY r.respondent_id, q.topic, q.category, q.asks_for, q.question_type;

    -- Every distinct answer to a choice question with how many respondents gave
    -- it, keyed by shorthand rather than by wording. option_rank is null for
    -- special options by construction.
    CREATE VIEW v_option_counts AS
    SELECT q.question_number, q.sub_number, q.question_id, q.display,
           q.shorthand, q.label, q.topic, q.doc_section, q.category,
           q.asks_for, q.question_type,
           o.option_text, o.option_rank, o.is_canonical, o.is_other_option,
           o.is_special, o.n_selected, o.pct_of_answered, q.n_answered
    FROM question_options o JOIN questions q USING(question_id)
    ORDER BY q.question_number, q.sub_number, o.n_selected DESC;

    -- Redaction as a finding in its own right: does withholding identity travel
    -- with who the respondent is, how much they wrote, or how they answered?
    CREATE VIEW v_redaction_profile AS
    SELECT is_redacted, responding_as, organization_type,
           COUNT(*) AS n_respondents,
           ROUND(AVG(substantive_completion_pct), 1) AS mean_completion_pct,
           ROUND(AVG(free_text_chars)) AS mean_free_text_chars,
           ROUND(AVG(n_free_text_answers), 1) AS mean_free_text_answers
    FROM respondents
    GROUP BY is_redacted, responding_as, organization_type;

    -- Each closed-choice answer split by whether identity was withheld. Counts,
    -- not means: these are stances and ladders, and averaging "Yes"/"No" would
    -- be meaningless. This is the view the named-vs-redacted skew is read from.
    CREATE VIEW v_stance_by_redaction AS
    SELECT question_number, sub_number, question_id, display, shorthand, label,
           topic, question_type, answer_text,
           SUM(is_redacted = 0) AS n_named,
           SUM(is_redacted = 1) AS n_redacted,
           COUNT(*)             AS n_total
    FROM v_stance_answers
    GROUP BY question_id, answer_text
    ORDER BY question_number, sub_number, n_total DESC;

    -- All free text for a respondent, in survey order.
    CREATE VIEW v_free_text AS
    SELECT r.respondent_id, r.question_number, q.question_id, q.display,
           q.shorthand, q.label, q.topic, q.doc_section, q.category,
           q.asks_for, q.section, q.role,
           q.question_text_short, r.char_count, r.word_count, r.likely_truncated,
           r.answer_text
    FROM responses r JOIN questions q USING(question_id)
    WHERE q.question_type = 'free_text';
    """)
    con.commit()
    con.close()
    print(f"  {DB_NAME}: {db_path.stat().st_size/1e6:.1f} MB")

    # ---------------- manifest ----------------
    # `source_date` is taken from the export's own filename, never from the
    # filesystem: everything downstream stamps its output with it, and a wall
    # clock would make the build non-deterministic.
    m = re.search(r"(\d{4})\.(\d{2})\.(\d{2})", SRC.name)
    profile_ids = {f"Q{q:03d}" for q in PROFILE}
    manifest = dict(
        source_file=SRC.name, sheet=SHEET,
        source_date=f"{m.group(1)}-{m.group(2)}-{m.group(3)}" if m else "",
        respondents=n_resp,
        respondent_id_range=[min(resp_ids), max(resp_ids)],
        questions=len(qcols),
        profile_questions=len(PROFILE),
        substantive_questions=len(qcols) - len(PROFILE),
        matrix_questions=sum(1 for c in qcols if c["sub"] is not None),
        raw_columns=len(header),
        question_numbers_absent_from_export=[
            q for q in range(1, REF_MAX + 1)
            if q not in {c["qnum"] for c in qcols}],
        rows=dict(responses_long=len(long_rows), response_selections=len(sel_rows),
                  question_options=len(option_rows), respondents=len(resp_rows),
                  responses_wide=len(wide_rows)),
        question_types=dict(sorted(Counter(c["qtype"] for c in ordered).items())),
        roles=dict(sorted(Counter(c["role"] for c in ordered).items())),
        labelled_questions=len(labels),
        topics=dict(sorted(Counter(c["labels"]["topic"] for c in ordered).items())),
        categories=dict(sorted(Counter(c["labels"]["category"] for c in ordered).items())),
        asks_for=dict(sorted(Counter(c["labels"]["asks_for"] for c in ordered).items())),
        subcategories=len({c["labels"]["subcategory"] for c in ordered}),
        constructs=dict(sorted(Counter(c["construct"] for c in ordered if c["construct"]).items())),
        answer_cells=len(long_rows),
        # "Substantive" everywhere in this dataset means: not one of the 13
        # profile columns. The four "If you selected 'Other,' please specify"
        # boxes are profile columns even though their role is other_specify, and
        # the headline free-text figure excludes them.
        free_text_answers=sum(1 for r in long_rows if r["question_type"] == "free_text"),
        substantive_free_text_answers=sum(
            1 for r in long_rows
            if r["question_type"] == "free_text" and r["question_number"] not in PROFILE),
        free_text_chars=sum(r["char_count"] for r in long_rows if r["char_count"] != ""),
        substantive_free_text_chars=sum(
            r["char_count"] for r in long_rows
            if r["char_count"] != "" and r["question_number"] not in PROFILE),
        truncated_free_text_answers=sum(r["likely_truncated"] for r in long_rows),
        truncated_substantive_free_text_answers=sum(
            r["likely_truncated"] for r in long_rows
            if r["question_number"] not in PROFILE),
        redacted_respondents=sum(r["is_redacted"] for r in resp_rows),
        named_respondents=sum(1 for r in resp_rows if not r["is_redacted"]),
        excluded_respondents=sum(r["is_excluded"] for r in resp_rows),
        non_canonical_selections=sum(1 for s in sel_rows if not s["is_canonical"]),
        special_selections=sum(1 for s in sel_rows if s["is_special"]),
        profile_question_ids=sorted(profile_ids),
    )
    (OUT / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("  manifest.json")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
