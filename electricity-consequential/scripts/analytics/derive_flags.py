#!/usr/bin/env python3
"""Derive respondent-level integrity, coordination and evidence flags.

Reads ``data/electricity_consequential.sqlite`` (the only input) and writes
four deterministic, rerunnable tables into ``data/derived/``:

    respondent_flags.csv   one row per respondent (all 185)
    text_clusters.csv      normalized free-text strings shared by >= 2 respondents
    citations.csv          one row per free-text answer carrying a citation signal
    domains.csv            linked domains with a curated classification

Nothing under ``data/`` other than ``data/derived/`` is touched. This module
emits **candidates only**: ``respondents.csv``, the SQLite database and
``reference/`` are never modified. P20 adjudicates the candidates into
``reference/exclusions.csv`` and P22 enforces the analytical base at export.

No redacted respondent's name or organization is ever emitted. Redacted
respondents appear as ids and counts only. (The one place redacted content
surfaces is ``junk_evidence`` for id 12, whose answers are all the single
letter "e" -- an answer body, carrying no identity.)

Standard library only: no pandas, no sqlite3 CLI. SQLite columns in this
database are TEXT-typed, so every numeric comparison casts explicitly with
``+0``. Questions are keyed on ``question_number`` / ``question_id``, never on
``shorthand`` (P02 rewrites shorthands in parallel with this prompt).

Derived-field definitions
-------------------------
Free-text scope
    Every derivation below reads ``v_free_text`` **excluding ``role =
    'profile'``** -- that is, excluding Q4 (name) and Q5 (organizational
    affiliation). Those two columns are identity fields rather than answers,
    and they are redaction-substituted ("Redacted") for 77 respondents, so
    counting them would both distort the junk denominators and invite a
    privacy leak. Everything else (``free_text_primary``, ``comment``,
    ``other_specify``) counts. This scope reproduces PLAN.md Sec. 3.5's stated
    junk denominators exactly: 15 answers for id 11, 24 for id 12, 10 for id 14.

Junk candidates
    An answer is *gibberish* when it is shorter than ``JUNK_MAX_CHARS`` (20)
    **and** any of: it collapses to a single repeated alphanumeric character
    ("e", "aaaa"); its vowel-to-letter ratio is below ``JUNK_VOWEL_RATIO``; it
    contains a run of >= 3 keys adjacent on one QWERTY row ("asdf", "sdf" in
    "sdfaes"). A respondent is a junk candidate when at least
    ``JUNK_MIN_SHARE`` (50%) of their in-scope free-text answers are gibberish.
    ``junk_evidence`` holds up to ``JUNK_EVIDENCE_MAX`` (6) sample strings,
    pipe-joined.

    **Deviation from the P10 prompt, flagged:** the prompt specifies a vowel
    ratio of < 0.2. On this record 0.2 flags 8 of id 11's 15 answers; PLAN.md
    Sec. 3.5 reports 12/15. A threshold of 0.30 combined with the keyboard-run
    rule reproduces all three of the digest's stated fractions exactly
    (11: 12/15, 12: 24/24, 14: 9/10), so 0.30 is the value implemented. Nobody
    else in the record is flagged at either threshold except id 31 (below).

    **Deviation from the expected result set, flagged loudly:** PLAN.md
    Sec. 3.5 and the P10 prompt both expect exactly {11, 12, 14}. This rule
    also flags **id 31** -- redacted, Algeria, whose six free-text answers are
    "aaa", "aaaaa", "aaaa", "aaaa", "aaaaaa", "aaaaaa" (6/6) and who
    straight-lines all nine additionality matrix rows as "Optional". It is a
    test submission by any reading, and it sits in the same
    alphabetically-first-country run as ids 11 (Afghanistan), 12 and 14
    (Algeria). It is emitted as a fourth candidate for P20 to adjudicate; no
    rule that keeps {11, 12, 14} can honestly exclude it.

Resubmissions
    Two respondents sharing a normalized, non-placeholder ``name``. The lower
    id is marked superseded (keep-latest policy, PLAN.md gotcha 4).
    ``resubmission_of`` records the counterpart id at both ends: on a
    superseded row it is the surviving submission, on a surviving row it is
    the submission it replaces.

Entity families
    Two or more respondents sharing a normalized, non-placeholder
    ``organization`` -- different people filing under one organization, which
    is an entity family and *not* a duplicate (both members count).
    Placeholder affiliations ("n/a", "none", "self", "individual", ...) are
    guarded out, as is the redaction substitute "Redacted".

Text clusters
    Free text is normalized as lowercase -> whitespace runs collapsed to a
    single space -> stripped, then hashed with sha1. A *cluster* is a
    normalized string of >= ``MIN_CLUSTER_CHARS`` (200) characters shared by
    >= ``MIN_CLUSTER_MEMBERS`` (2) distinct respondents. The Scope 2 threshold
    was 3; at n=185 pairs matter (PLAN.md Sec. 6). A respondent posting the
    same string to several questions counts once.

is_template_respondent / template_bloc
    ``is_template_respondent`` is set for any member of any cluster; at a
    2-member threshold "shares a long verbatim passage with someone" is
    exactly the claim being made, so no further co-sharer count is imposed.
    A *bloc* is a connected component over the graph whose edges join
    respondents sharing >= ``MIN_BLOC_SHARED_CLUSTERS`` (2) distinct clusters.

    **Deviation from the P10 prompt, flagged:** the prompt specifies ">= 3
    clusters with the same partners". On this record that threshold destroys
    the very bloc the prompt names: the ``policy_insights_pack`` members share
    exactly 2 clusters with one another, so a >= 3 rule returns no
    policy-insights bloc at all. A >= 2 rule returns both named packs at the
    sizes PLAN.md Sec. 3.5 states (5 and 4 members).

    **Deviation from the digest's membership, flagged:** PLAN.md Sec. 3.5
    lists the 5-member pack as {43, 45, 60, 79, 82}. The data says
    {43, 47, 60, 79, 82}: respondent **47** shares both pack texts, while
    respondent **45** shares only the 788-char Q18/Q20 passage and not the
    218-char Q23 passage. 45 is a single-cluster peripheral sharer (still
    ``is_template_respondent = 1``), 47 is a core member. The digest appears
    to have transposed 45 for 47.

Citations
    Eight regex signals: url, doi, etal, peer_review, pdf, preprint, journal,
    paren_year. ``citations.csv`` records answers matching any signal;
    ``has_citation`` and ``n_citation_answers`` count only the seven *hard*
    signals (``HARD_SIGNALS``) -- a bare "(2024)" is too weak to call a
    citation on its own. ``n_urls`` counts URL matches, not distinct domains.

Domain classification
    ``DOMAIN_CLASS`` is the Scope 2 map, re-pointed at the domains this record
    actually links and extended per the P10 prompt (marginalimpactmethod.org,
    Brazilian ONS/MCTI/SEEG sources, watttime, electricitymaps, government
    suffixes). Three classes are added to the ported vocabulary because this
    record's evidence base needs them: ``research`` (universities and
    non-commercial research institutes -- .edu, EPRI), ``consultancy``
    (professional-services and advisory firms, which supply a visible share of
    this consultation's links) and ``media`` (trade press). Unmapped -> other.

stance_fingerprint
    Five characters, one per question, in the order Q19, Q21, Q24, Q31, Q33;
    "-" where unanswered. The encoding is an explicit per-question map rather
    than "first letter of the answer" because Q24's two options both begin
    with "R" ("Reported each year" / "Reported once for the lifetime of the
    project"), which a first-letter rule would collapse:

        Q19 formula appropriate      Y = Yes            N = No
        Q21 include secondary effects Y = Yes           N = No
        Q24 reporting period         E = each year      L = project lifetime
        Q31 regional differences     Y = Yes  N = No    U = Unsure, depends
        Q33 rigor varies by claim    Y = Yes            N = No

    So "NYEYY" reads: formula not appropriate, include secondary effects,
    report each year, regional differences yes, rigor varies yes.

Usage
-----
    python3 electricity-consequential/scripts/analytics/derive_flags.py [--verify]
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import re
import sqlite3
import sys
from collections import Counter, defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DB_PATH = REPO_ROOT / "data" / "electricity_consequential.sqlite"
OUT_DIR = REPO_ROOT / "data" / "derived"

# --- thresholds -------------------------------------------------------------

MIN_CLUSTER_CHARS = 200         # a shared string must be this long to count
MIN_CLUSTER_MEMBERS = 2         # ...and shared by at least this many respondents
MIN_BLOC_SHARED_CLUSTERS = 2    # edge weight needed to join two bloc members
PREVIEW_CHARS = 240

JUNK_MAX_CHARS = 20             # only short answers can be gibberish
JUNK_VOWEL_RATIO = 0.30         # vowels / letters below this reads as mash
JUNK_MIN_SHARE = 0.5            # share of in-scope answers that must be gibberish
JUNK_EVIDENCE_MAX = 6           # sample strings kept in junk_evidence

# --- stance fingerprint -----------------------------------------------------
# (question_number, {verbatim answer: character}); see the module docstring.

FINGERPRINT_QUESTIONS = (
    (19, {"Yes": "Y", "No": "N"}),
    (21, {"Yes": "Y", "No": "N"}),
    (24, {"Reported each year": "E",
          "Reported once for the lifetime of the project": "L"}),
    (31, {"Yes": "Y", "No": "N", "Unsure, depends on details": "U"}),
    (33, {"Yes": "Y", "No": "N"}),
)
FINGERPRINT_BLANK = "-" * len(FINGERPRINT_QUESTIONS)

# --- placeholder guards -----------------------------------------------------
# Normalized name/organization values that are not identities: they must never
# form a resubmission pair or an entity family. "redacted" is the P01
# substitute written for every respondent who asked not to be named.

PLACEHOLDER_VALUES = frozenset({
    "", "-", "--", ".", "..", "/", "n/a", "n/a.", "na", "n.a.", "n.a",
    "none", "no", "nil", "null", "redacted", "not provided", "not applicable",
    "self", "individual", "private", "anonymous", "confidential", "x", "xx",
    "test", "asdf",
})

# --- citation signals -------------------------------------------------------

SIGNAL_PATTERNS = (
    ("url", re.compile(r'(?:https?://|www\.)[^\s<>"\')\]]+', re.I)),
    ("doi", re.compile(r"\b(?:doi:\s*|https?://(?:dx\.)?doi\.org/)10\.\d{4,9}/\S+", re.I)),
    ("etal", re.compile(r"\bet\.?\s+al\b\.?", re.I)),
    ("peer_review", re.compile(r"peer[-\s]?review", re.I)),
    ("pdf", re.compile(r"\.pdf\b", re.I)),
    ("preprint", re.compile(r"\b(?:arxiv|ssrn|zenodo|biorxiv|preprint)\b", re.I)),
    ("journal", re.compile(r"\bjournals?\b", re.I)),
    ("paren_year", re.compile(r"\((?:[^()]{0,40}?,\s*)?(?:19|20)\d{2}[a-z]?\)")),
)
# paren_year alone is a weak signal and is excluded from ``has_citation``.
HARD_SIGNALS = frozenset(
    {"url", "doi", "etal", "peer_review", "pdf", "preprint", "journal"}
)

URL_RE = SIGNAL_PATTERNS[0][1]

# Second-level suffixes that are really public suffixes, so the registrable
# domain keeps three labels (``bbc.co.uk``, not ``co.uk``). Only the country
# codes that plausibly appear in this dataset's links need to be listed.
MULTI_LABEL_SUFFIXES = frozenset(
    """
    co.uk org.uk ac.uk gov.uk net.uk sch.uk me.uk
    com.au net.au org.au edu.au gov.au
    co.jp or.jp ne.jp ac.jp go.jp lg.jp
    com.cn org.cn net.cn gov.cn edu.cn ac.cn
    co.kr or.kr go.kr re.kr ac.kr
    co.in org.in net.in gov.in ac.in
    com.br org.br gov.br edu.br net.br eco.br
    co.za org.za gov.za ac.za
    co.nz org.nz govt.nz ac.nz
    com.tw org.tw gov.tw edu.tw
    com.sg org.sg gov.sg edu.sg
    com.mx gob.mx com.ar gob.es
    """.split()
)

# --- curated domain classification -----------------------------------------

DOMAIN_CLASS: dict[str, str] = {}


def _register(cls: str, *domains: str) -> None:
    for domain in domains:
        DOMAIN_CLASS[domain] = cls


_register(
    "peer_reviewed",
    "sciencedirect.com", "nature.com", "cell.com", "pnas.org", "doi.org",
    "springer.com", "springeropen.com", "link.springer.com", "wiley.com",
    "tandfonline.com", "iop.org", "iopscience.org", "acs.org", "oup.com",
    "cambridge.org", "sciencemag.org", "science.org", "mdpi.com",
    "researchgate.net", "jstor.org", "sagepub.com", "aeaweb.org",
    "frontiersin.org", "scitepress.org",
)
_register(
    "peer_reviewed_or_preprint",
    "ssrn.com", "arxiv.org", "zenodo.org", "biorxiv.org", "osf.io",
    "preprints.org",
)
# Universities and non-commercial research institutes. Added to the ported
# vocabulary: this record links four universities plus EPRI, and folding them
# into "other" would understate the evidence base on the integrity page.
_register(
    "research",
    "epri.com", "fraunhofer.de", "eprg.group.cam.ac.uk",
)
_register(
    "advocacy",
    "energytag.org", "cebuyers.org", "cebi.org", "zerogrid.org",
    "resource-solutions.org", "theclimategroup.org", "matched.energy",
    "scopetrue.org", "watttime.org", "wemeanbusinesscoalition.org", "cdp.net",
    "rmi.org", "transitionzero.org", "bellona.org", "asyousow.org",
    "ceres.org", "climategroup.org", "renewable-ei.org", "wbcsd.org",
    "eurelectric.org", "solarpowereurope.org", "windeurope.org",
    "beyondfossilfuels.org", "breakthroughinstitute.org",
    "cleanenergybuyers.org", "nrdc.org", "ucs.org", "catf.us", "wri.org",
    "energypeacepartners.com", "fcarchitects.org", "ess-consortium.org",
    "emissionsfirst.com",
    # The Marginal Impact Method initiative site: the single most-linked
    # domain in this record (32 links from 17 respondents), a methodology
    # promoted by a coalition rather than a standards body.
    "marginalimpactmethod.org",
    # Brazilian sources named in the Q52 evidence answers (ids 151, 183).
    "seeg.eco.br", "observatoriodoclima.eco.br",
)
# Commercial energy-data, MRV and marketplace platforms.
_register(
    "data_vendor",
    "electricitymaps.com", "leveltenenergy.com", "granularenergy.com",
    "flexidao.com", "ecoinvent.org", "reconnect.energy", "singularity.energy",
    "resurety.com", "ever.green", "veraci-t.org",
)
_register(
    "government",
    "iea.org", "neso.energy", "nrel.gov", "lbnl.gov", "federalregister.gov",
    "europa.eu", "eia.gov", "epa.gov", "energy.gov", "irena.org", "ipcc.ch",
    "unfccc.int", "ofgem.gov.uk", "nationalgrideso.com",
    # Brazilian system-operator and ministry sources named at Q52.
    "ons.org.br", "epe.gov.br", "mcti.gov.br", "mctic.gov.br",
)
_register(
    "standard_setter",
    "ghgprotocol.org", "sciencebasedtargets.org", "iso.org",
    "tcr-us.com", "climateactiontransparency.org", "granular-foundation.org",
    "lowimpacthydro.org",
)
# Professional-services and advisory firms. Added to the ported vocabulary:
# consultancies are a large respondent bloc here and their own publications
# are a distinct evidence category from peer review or advocacy.
_register(
    "consultancy",
    "mckinsey.com", "icf.com", "baringa.com", "3degreesinc.com",
    "gridstrategiesllc.com", "greenstrategies.com", "wsgr.com",
    "deloitte.com", "pwc.com", "ey.com", "kpmg.com",
)
_register("media", "ft.com", "utilitydive.com", "bloomberg.com", "reuters.com")
_register(
    "shortener",
    "tinyurl.com", "bit.ly", "t.co", "lnkd.in", "shorturl.at", "rb.gy",
    "ow.ly", "buff.ly", "goo.gl",
)

# Suffix rules applied when a domain is not in the explicit map above.
CLASS_BY_SUFFIX = (
    (".gov", "government"),
    (".mil", "government"),
    (".int", "government"),
    (".gov.uk", "government"),
    (".gov.au", "government"),
    (".gov.br", "government"),
    (".gov.cn", "government"),
    (".gov.in", "government"),
    (".gov.sg", "government"),
    (".gov.tw", "government"),
    (".gov.za", "government"),
    (".govt.nz", "government"),
    (".go.jp", "government"),
    (".go.kr", "government"),
    (".gouv.fr", "government"),
    (".gob.mx", "government"),
    (".gc.ca", "government"),
    (".edu", "research"),
    (".ac.uk", "research"),
    (".edu.au", "research"),
    (".ac.jp", "research"),
    (".ac.kr", "research"),
    (".edu.br", "research"),
)

DOMAIN_CLASSES = frozenset(
    set(DOMAIN_CLASS.values()) | {cls for _suffix, cls in CLASS_BY_SUFFIX} | {"other"}
)

# --- curated blocs ----------------------------------------------------------
# Resolved against the data at run time: a component must match the member set
# exactly or ``--verify`` fails. Components with no curated name are keyed
# ``pack_<smallest member id>``, which is stable across runs.

BLOC_DEFS = (
    ("policy_insights_pack",
     "\"consequential accounting may provide useful insights\" response pack",
     frozenset({43, 47, 60, 79, 82})),
    ("bullet_pack",
     "Bullet-formatted full response pack (Q18-Q44)",
     frozenset({51, 86, 89, 117})),
)

# --- frozen expectations (PLAN.md Sec. 3.5; checked by --verify and the tests)

EXPECTED_RESPONDENTS = 185
# {11, 12, 14} is PLAN.md's list; 31 is this module's additional finding.
EXPECTED_JUNK = frozenset({11, 12, 14, 31})
PLAN_EXPECTED_JUNK = frozenset({11, 12, 14})
EXPECTED_RESUBMISSIONS = ((100, 151),)
EXPECTED_FAMILIES = {"engie_impact": frozenset({135, 160})}
MIN_EXPECTED_CLUSTERS = 35
EXPECTED_Q52_ANSWERS = 36

WHITESPACE_RE = re.compile(r"\s+")
NON_ALNUM_RE = re.compile(r"[^0-9a-z]")
SLUG_RE = re.compile(r"[^a-z0-9]+")

# QWERTY rows, used by the keyboard-mash test.
KEYBOARD_ROWS = ("qwertyuiop", "asdfghjkl", "zxcvbnm")
KEY_POSITION = {
    key: (row_index, column)
    for row_index, row in enumerate(KEYBOARD_ROWS)
    for column, key in enumerate(row)
}
MIN_KEYBOARD_RUN = 3


# --- helpers ----------------------------------------------------------------


def normalize_text(text: str | None) -> str:
    """Lowercase, collapse whitespace runs to one space, strip."""
    return WHITESPACE_RE.sub(" ", (text or "").lower()).strip()


def sha1(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()


def slugify(text: str) -> str:
    return SLUG_RE.sub("_", (text or "").lower()).strip("_")


def is_placeholder(value: str | None) -> bool:
    """True when a normalized name/organization carries no identity."""
    return normalize_text(value) in PLACEHOLDER_VALUES


def vowel_ratio(text: str) -> float:
    letters = [c for c in text.lower() if c.isalpha()]
    if not letters:
        return 0.0
    return sum(c in "aeiou" for c in letters) / len(letters)


def is_single_repeated_character(text: str) -> bool:
    """True for "e", "aaaa", "1111" -- one alphanumeric character, repeated."""
    stripped = NON_ALNUM_RE.sub("", text.lower())
    return bool(stripped) and len(set(stripped)) == 1


def has_keyboard_run(text: str) -> bool:
    """True when >= MIN_KEYBOARD_RUN keys adjacent on one QWERTY row appear in
    sequence, forwards or backwards ("asdf", "sdf" inside "sdfaes")."""
    letters = re.sub(r"[^a-z]", "", text.lower())
    run = 1
    for left, right in zip(letters, letters[1:]):
        if left in KEY_POSITION and right in KEY_POSITION:
            (row_l, col_l), (row_r, col_r) = KEY_POSITION[left], KEY_POSITION[right]
            if row_l == row_r and abs(col_l - col_r) == 1:
                run += 1
                if run >= MIN_KEYBOARD_RUN:
                    return True
                continue
        run = 1
    return False


def is_gibberish(text: str) -> bool:
    """See the module docstring: short, and mashed by one of three tests."""
    candidate = (text or "").strip()
    if not candidate or len(candidate) >= JUNK_MAX_CHARS:
        return False
    return (
        is_single_repeated_character(candidate)
        or vowel_ratio(candidate) < JUNK_VOWEL_RATIO
        or has_keyboard_run(candidate)
    )


def registrable_domain(url: str) -> str:
    """Reduce a matched URL to its registrable domain, or "" if unusable."""
    host = re.sub(r"^https?://", "", url, flags=re.I)
    host = host.split("/")[0].split("?")[0].split("#")[0]
    host = host.split("@")[-1].split(":")[0].lower().strip(".,;:!'\"")
    host = re.sub(r"^www\.", "", host)
    if not host or "." not in host or host.replace(".", "").isdigit():
        return ""
    labels = [label for label in host.split(".") if label]
    if len(labels) < 2:
        return ""
    # Free text is capped at 4,000 characters, so links can be cut mid-host
    # ("www.emissionsfi"). A truncated tail is not a TLD: require a plausible
    # one rather than minting a domain out of the fragment.
    tld = labels[-1]
    if not tld.isalpha() or not 2 <= len(tld) <= 24:
        return ""
    candidate = ".".join(labels[-2:])
    if candidate in MULTI_LABEL_SUFFIXES and len(labels) >= 3:
        candidate = ".".join(labels[-3:])
    return candidate


def classify_domain(domain: str) -> str:
    if domain in DOMAIN_CLASS:
        return DOMAIN_CLASS[domain]
    for suffix, cls in CLASS_BY_SUFFIX:
        if domain.endswith(suffix):
            return cls
    return "other"


def signals_for(text: str) -> list[str]:
    """Citation signals present in one answer, in SIGNAL_PATTERNS order."""
    return [name for name, pattern in SIGNAL_PATTERNS if pattern.search(text)]


def write_csv(path: Path, header, rows) -> None:
    """Write LF-terminated, unquoted-where-possible CSV deterministically."""
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(header)
        writer.writerows(rows)


def join_ids(ids) -> str:
    return "|".join(str(i) for i in sorted(ids))


# --- extraction -------------------------------------------------------------


def load_respondents(con: sqlite3.Connection) -> dict[int, dict]:
    """respondent_id -> profile. ``is_redacted`` is TEXT, so cast with +0."""
    rows = con.execute(
        "SELECT respondent_id, name, organization, country, organization_type, "
        "       is_redacted+0 AS is_redacted "
        "FROM respondents ORDER BY respondent_id+0"
    ).fetchall()
    return {
        int(row["respondent_id"]): {
            "name": row["name"] or "",
            "organization": row["organization"] or "",
            "country": row["country"] or "",
            "organization_type": row["organization_type"] or "",
            "is_redacted": int(row["is_redacted"]),
        }
        for row in rows
    }


def load_free_text(con: sqlite3.Connection) -> list[tuple[int, int, str]]:
    """Answered free text, excluding the profile identity columns Q4 and Q5."""
    rows = con.execute(
        "SELECT respondent_id, question_number, answer_text FROM v_free_text "
        "WHERE role <> 'profile' AND answer_text IS NOT NULL "
        "ORDER BY respondent_id+0, question_number+0"
    ).fetchall()
    return [
        (int(row["respondent_id"]), int(row["question_number"]), row["answer_text"])
        for row in rows
    ]


def detect_junk(free_text, respondents):
    """respondent -> (n_gibberish, n_answers, evidence samples)."""
    per_respondent = defaultdict(list)
    for respondent_id, _question_number, answer_text in free_text:
        per_respondent[respondent_id].append(answer_text)

    candidates = {}
    for respondent_id in sorted(respondents):
        answers = per_respondent.get(respondent_id, [])
        if not answers:
            continue
        gibberish = [a for a in answers if is_gibberish(a)]
        if len(gibberish) / len(answers) < JUNK_MIN_SHARE:
            continue
        evidence = [
            WHITESPACE_RE.sub(" ", a).strip()[:60]
            for a in gibberish[:JUNK_EVIDENCE_MAX]
        ]
        candidates[respondent_id] = (len(gibberish), len(answers), evidence)
    return candidates


def detect_resubmissions(respondents):
    """superseded id -> surviving id, for repeated non-placeholder names."""
    by_name = defaultdict(list)
    for respondent_id in sorted(respondents):
        name = respondents[respondent_id]["name"]
        if is_placeholder(name):
            continue
        by_name[normalize_text(name)].append(respondent_id)

    superseded, counterpart = {}, {}
    for ids in by_name.values():
        if len(ids) < 2:
            continue
        # Keep-latest: every submission but the highest id is superseded.
        survivor = ids[-1]
        for earlier in ids[:-1]:
            superseded[earlier] = survivor
            counterpart[earlier] = survivor
        counterpart[survivor] = ids[-2]
    return superseded, counterpart


def assign_entity_families(respondents):
    """respondent -> family key, for repeated non-placeholder organizations."""
    by_org = defaultdict(list)
    for respondent_id in sorted(respondents):
        organization = respondents[respondent_id]["organization"]
        if is_placeholder(organization):
            continue
        by_org[normalize_text(organization)].append(respondent_id)

    families = {}
    for organization, ids in by_org.items():
        if len(ids) < 2:
            continue
        key = slugify(organization)[:40]
        for respondent_id in ids:
            families[respondent_id] = key
    return families


def build_text_clusters(free_text, respondents):
    """Normalized strings >= MIN_CLUSTER_CHARS shared by >= MIN_CLUSTER_MEMBERS."""
    members = defaultdict(set)      # hash -> respondent ids
    questions = defaultdict(set)    # hash -> question numbers
    text_of: dict[str, str] = {}    # hash -> normalized text

    for respondent_id, question_number, answer_text in free_text:
        normalized = normalize_text(answer_text)
        if len(normalized) < MIN_CLUSTER_CHARS:
            continue
        digest = sha1(normalized)
        members[digest].add(respondent_id)
        questions[digest].add(question_number)
        text_of.setdefault(digest, normalized)

    clusters = []
    for digest, ids in members.items():
        if len(ids) < MIN_CLUSTER_MEMBERS:
            continue
        text = text_of[digest]
        named = sum(1 for i in ids if not respondents[i]["is_redacted"])
        clusters.append({
            "hash": digest,
            "members": ids,
            "questions": questions[digest],
            "chars": len(text),
            "preview": text[:PREVIEW_CHARS],
            "n_named": named,
            "n_redacted": len(ids) - named,
            "has_citation": int(any(s in HARD_SIGNALS for s in signals_for(text))),
        })
    # Biggest, then longest, then hash: stable across runs.
    clusters.sort(key=lambda c: (-len(c["members"]), -c["chars"], c["hash"]))
    return clusters


def summarize_sharing(clusters):
    """respondent -> (# clustered strings, # distinct co-sharing respondents)."""
    n_shared = Counter()
    co_sharers = defaultdict(set)
    for cluster in clusters:
        ids = cluster["members"]
        for respondent_id in ids:
            n_shared[respondent_id] += 1
            co_sharers[respondent_id] |= ids - {respondent_id}
    return n_shared, co_sharers


def build_blocs(clusters):
    """Connected components over pairs sharing >= MIN_BLOC_SHARED_CLUSTERS."""
    pair_counts = Counter()
    for cluster in clusters:
        ids = sorted(cluster["members"])
        for index, left in enumerate(ids):
            for right in ids[index + 1:]:
                pair_counts[(left, right)] += 1

    neighbours = defaultdict(set)
    for (left, right), count in pair_counts.items():
        if count >= MIN_BLOC_SHARED_CLUSTERS:
            neighbours[left].add(right)
            neighbours[right].add(left)

    components, seen = [], set()
    for node in sorted(neighbours):
        if node in seen:
            continue
        component, frontier = {node}, [node]
        while frontier:
            current = frontier.pop()
            for neighbour in sorted(neighbours[current]):
                if neighbour not in component:
                    component.add(neighbour)
                    frontier.append(neighbour)
        seen |= component
        components.append(component)

    curated = {frozenset(ids): (key, label) for key, label, ids in BLOC_DEFS}
    blocs = {}
    for component in components:
        key, label = curated.get(
            frozenset(component),
            (f"pack_{min(component)}", f"Shared-text pack seeded at id {min(component)}"),
        )
        blocs[key] = {"label": label, "members": set(component)}
    return blocs, pair_counts


def build_stance_fingerprints(con: sqlite3.Connection):
    """respondent -> 5-character stance signature, '-' where unanswered."""
    numbers = ",".join(str(number) for number, _ in FINGERPRINT_QUESTIONS)
    answers = defaultdict(dict)
    rows = con.execute(
        "SELECT respondent_id, question_number, answer_text FROM responses "
        f"WHERE question_number+0 IN ({numbers}) AND sub_number IS NULL "
        "  AND answer_text IS NOT NULL AND answer_text <> ''"
    ).fetchall()
    for row in rows:
        answers[int(row["respondent_id"])][int(row["question_number"])] = row["answer_text"]

    unmapped = []
    fingerprints = {}
    for respondent_id, per_question in answers.items():
        characters = []
        for number, encoding in FINGERPRINT_QUESTIONS:
            answer = per_question.get(number)
            if answer is None:
                characters.append("-")
                continue
            if answer not in encoding:
                unmapped.append((respondent_id, number, answer))
                characters.append("?")
                continue
            characters.append(encoding[answer])
        fingerprints[respondent_id] = "".join(characters)
    return fingerprints, unmapped


def mine_citations(free_text):
    """Per-answer signals, per-respondent rollups, and per-domain tallies."""
    answer_rows = []
    hard_answers = Counter()
    url_counts = Counter()
    domain_answers = defaultdict(set)
    domain_respondents = defaultdict(set)

    for respondent_id, question_number, answer_text in free_text:
        found = signals_for(answer_text)
        if found:
            answer_rows.append((respondent_id, question_number, "|".join(found)))
            if any(s in HARD_SIGNALS for s in found):
                hard_answers[respondent_id] += 1
        for match in URL_RE.findall(answer_text):
            domain = registrable_domain(match)
            if not domain:
                continue
            url_counts[respondent_id] += 1
            domain_answers[domain].add((respondent_id, question_number))
            domain_respondents[domain].add(respondent_id)

    answer_rows.sort(key=lambda row: (row[0], row[1]))
    domain_rows = sorted(
        (
            (
                domain,
                len(domain_answers[domain]),
                len(domain_respondents[domain]),
                classify_domain(domain),
            )
            for domain in domain_answers
        ),
        key=lambda row: (-row[1], -row[2], row[0]),
    )
    return {
        "answer_rows": answer_rows,
        "hard_answers": hard_answers,
        "url_counts": url_counts,
        "domain_rows": domain_rows,
    }


# --- assembly ---------------------------------------------------------------


FLAG_HEADER = [
    "respondent_id", "is_junk_candidate", "junk_evidence",
    "is_resubmission_superseded", "resubmission_of", "entity_family",
    "is_template_respondent", "n_shared_texts", "template_bloc",
    "has_citation", "n_citation_answers", "n_urls", "stance_fingerprint",
]


def build(con: sqlite3.Connection) -> dict:
    respondents = load_respondents(con)
    free_text = load_free_text(con)

    junk = detect_junk(free_text, respondents)
    superseded, counterpart = detect_resubmissions(respondents)
    families = assign_entity_families(respondents)

    clusters = build_text_clusters(free_text, respondents)
    n_shared, co_sharers = summarize_sharing(clusters)
    blocs, pair_counts = build_blocs(clusters)
    bloc_of = {}
    for key in sorted(blocs):
        for respondent_id in blocs[key]["members"]:
            bloc_of[respondent_id] = key

    fingerprints, unmapped_answers = build_stance_fingerprints(con)
    citations = mine_citations(free_text)

    flag_rows = []
    for respondent_id in sorted(respondents):
        evidence = junk.get(respondent_id)
        hard = citations["hard_answers"].get(respondent_id, 0)
        shared = n_shared.get(respondent_id, 0)
        flag_rows.append([
            respondent_id,
            int(respondent_id in junk),
            "|".join(evidence[2]) if evidence else "",
            int(respondent_id in superseded),
            counterpart.get(respondent_id, ""),
            families.get(respondent_id, ""),
            int(shared > 0),
            shared,
            bloc_of.get(respondent_id, ""),
            int(hard > 0),
            hard,
            citations["url_counts"].get(respondent_id, 0),
            fingerprints.get(respondent_id, FINGERPRINT_BLANK),
        ])

    return {
        "respondents": respondents,
        "free_text": free_text,
        "flag_rows": flag_rows,
        "junk": junk,
        "superseded": superseded,
        "families": families,
        "clusters": clusters,
        "co_sharers": co_sharers,
        "blocs": blocs,
        "pair_counts": pair_counts,
        "fingerprints": fingerprints,
        "unmapped_answers": unmapped_answers,
        "citations": citations,
    }


def write_outputs(result: dict) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    write_csv(OUT_DIR / "respondent_flags.csv", FLAG_HEADER, result["flag_rows"])

    write_csv(
        OUT_DIR / "text_clusters.csv",
        ["cluster_hash", "n_respondents", "n_named", "n_redacted", "chars",
         "question_numbers", "preview_240", "has_citation", "member_ids"],
        [
            [
                cluster["hash"], len(cluster["members"]), cluster["n_named"],
                cluster["n_redacted"], cluster["chars"],
                join_ids(cluster["questions"]), cluster["preview"],
                cluster["has_citation"], join_ids(cluster["members"]),
            ]
            for cluster in result["clusters"]
        ],
    )

    write_csv(
        OUT_DIR / "citations.csv",
        ["respondent_id", "question_number", "signals"],
        result["citations"]["answer_rows"],
    )

    write_csv(
        OUT_DIR / "domains.csv",
        ["domain", "n_answers", "n_respondents", "class"],
        result["citations"]["domain_rows"],
    )


# --- verification & reporting ----------------------------------------------


def verify(con: sqlite3.Connection, result: dict) -> list[str]:
    """Cross-check the resolved data against the frozen expectations."""
    problems = []
    respondents = result["respondents"]

    if len(result["flag_rows"]) != EXPECTED_RESPONDENTS:
        problems.append(
            f"respondent_flags has {len(result['flag_rows'])} rows, "
            f"expected {EXPECTED_RESPONDENTS}"
        )
    if len(respondents) != len(result["flag_rows"]):
        problems.append("respondent_flags row count != respondents table")

    junk_ids = frozenset(result["junk"])
    if not PLAN_EXPECTED_JUNK <= junk_ids:
        problems.append(
            f"junk candidates miss PLAN.md's set: {sorted(PLAN_EXPECTED_JUNK - junk_ids)}"
        )
    if junk_ids != EXPECTED_JUNK:
        problems.append(
            f"junk candidates {sorted(junk_ids)}, expected {sorted(EXPECTED_JUNK)}"
        )

    pairs = tuple(sorted(result["superseded"].items()))
    if pairs != EXPECTED_RESUBMISSIONS:
        problems.append(f"resubmissions {pairs}, expected {EXPECTED_RESUBMISSIONS}")

    by_family = defaultdict(set)
    for respondent_id, key in result["families"].items():
        by_family[key].add(respondent_id)
    for key, expected in sorted(EXPECTED_FAMILIES.items()):
        if by_family.get(key, set()) != set(expected):
            problems.append(
                f"entity family {key}: got {sorted(by_family.get(key, ()))}, "
                f"expected {sorted(expected)}"
            )

    if len(result["clusters"]) < MIN_EXPECTED_CLUSTERS:
        problems.append(
            f"{len(result['clusters'])} text clusters, expected >= {MIN_EXPECTED_CLUSTERS}"
        )

    for key, label, expected in BLOC_DEFS:
        actual = result["blocs"].get(key, {}).get("members", set())
        if actual != set(expected):
            problems.append(
                f"bloc {key}: got {sorted(actual)}, expected {sorted(expected)}"
            )

    q52 = con.execute(
        "SELECT COUNT(*) FROM v_free_text WHERE question_number+0 = 52"
    ).fetchone()[0]
    if q52 != EXPECTED_Q52_ANSWERS:
        problems.append(f"Q52 answers {q52}, expected {EXPECTED_Q52_ANSWERS}")

    for respondent_id, number, answer in result["unmapped_answers"]:
        problems.append(
            f"respondent {respondent_id} Q{number}: answer {answer!r} is not in "
            "FINGERPRINT_QUESTIONS"
        )

    # Privacy: nothing derived may carry a redacted respondent's identity.
    for row in result["flag_rows"]:
        respondent_id = row[0]
        if respondents[respondent_id]["is_redacted"] and row[5]:
            problems.append(
                f"redacted respondent {respondent_id} carries entity_family {row[5]!r}"
            )
    for domain, _answers, _resp, cls in result["citations"]["domain_rows"]:
        if cls not in DOMAIN_CLASSES:
            problems.append(f"domain {domain} has unknown class {cls!r}")
    return problems


def report(result: dict) -> None:
    index = {name: i for i, name in enumerate(FLAG_HEADER)}
    flags = result["flag_rows"]
    respondents = result["respondents"]

    template = sum(row[index["is_template_respondent"]] for row in flags)
    citing = sum(row[index["has_citation"]] for row in flags)

    print(f"respondents               {len(flags)}")
    print(f"junk candidates           {len(result['junk'])}")
    print(f"superseded resubmissions  {len(result['superseded'])}")
    print(f"entity families           {len(set(result['families'].values()))}")
    print(f"text clusters             {len(result['clusters'])}")
    print(f"template respondents      {template}")
    print(f"blocs                     {len(result['blocs'])}")
    print(f"citation respondents      {citing}")
    print(f"citation answers          {len(result['citations']['answer_rows'])}")
    print(f"linked domains            {len(result['citations']['domain_rows'])}")

    print("\njunk candidates:")
    for respondent_id in sorted(result["junk"]):
        n_gibberish, n_answers, evidence = result["junk"][respondent_id]
        marker = "" if respondent_id in PLAN_EXPECTED_JUNK else "  [NOT IN PLAN.md]"
        print(f"  id {respondent_id:<4d} {n_gibberish}/{n_answers} gibberish{marker}")
        print(f"           {' | '.join(evidence)}")

    print("\nresubmissions (superseded -> kept):")
    for earlier, survivor in sorted(result["superseded"].items()):
        print(f"  {earlier} -> {survivor}")

    print("\nentity families:")
    by_family = defaultdict(set)
    for respondent_id, key in result["families"].items():
        by_family[key].add(respondent_id)
    for key in sorted(by_family):
        print(f"  {key:24s} {sorted(by_family[key])}")

    print("\nblocs:")
    for key in sorted(result["blocs"]):
        bloc = result["blocs"][key]
        members = sorted(bloc["members"])
        redacted = sum(1 for i in members if respondents[i]["is_redacted"])
        print(f"  {key:22s} n={len(members):2d} (named {len(members) - redacted}, "
              f"redacted {redacted})  {members}")
        print(f"    {bloc['label']}")

    print("\ndomain classes:")
    by_class = Counter()
    domains_by_class = Counter()
    for _domain, n_answers, _n_resp, cls in result["citations"]["domain_rows"]:
        by_class[cls] += n_answers
        domains_by_class[cls] += 1
    for cls in sorted(by_class, key=lambda c: (-by_class[c], c)):
        print(f"  {cls:26s} {domains_by_class[cls]:3d} domains  "
              f"{by_class[cls]:3d} answers")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--verify", action="store_true",
                        help="exit non-zero if any frozen expectation is missed")
    args = parser.parse_args(argv)

    if not DB_PATH.exists():
        print(f"database not found: {DB_PATH}", file=sys.stderr)
        return 2

    con = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    try:
        result = build(con)
        problems = verify(con, result)
    finally:
        con.close()

    write_outputs(result)
    report(result)

    if problems:
        print("\nverification problems:", file=sys.stderr)
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        if args.verify:
            return 1
    else:
        print("\nverification: every frozen expectation met")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
