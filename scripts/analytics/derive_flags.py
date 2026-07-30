#!/usr/bin/env python3
"""Derive respondent-level coordination, citation and evidence-basis flags.

Reads ``data/scope2_consultation.sqlite`` (the only input) and writes five
deterministic, rerunnable tables into ``data/derived/``:

    respondent_flags.csv   one row per respondent (all 1,072)
    text_clusters.csv      verbatim free-text strings shared by >= 3 respondents
    vector_clusters.csv    respondents sharing byte-identical scale-answer vectors
    citations.csv          one row per free-text answer carrying a citation signal
    domains.csv            linked domains with a curated classification

Nothing under ``data/`` other than ``data/derived/`` is touched, and no
redacted respondent's name or organization is ever emitted.

Standard library only: no pandas, no sqlite3 CLI. SQLite columns in this
database are TEXT-typed, so every numeric comparison casts explicitly.

Derived-field definitions
-------------------------
Text clusters
    Free text is normalized as lowercase -> all whitespace runs collapsed to a
    single space -> stripped, then hashed with sha1. A *cluster* is a
    normalized string of >= 200 characters shared by >= 3 distinct
    respondents. A respondent posting the same string to several questions
    counts once.

is_template_response
    Set when a respondent shares clustered text with >= 3 *other* respondents
    (counted across all their clusters, deduplicated by respondent).
    PLAN.md is internally inconsistent here: Sec. 3.5 describes the population as
    "share >= 1 verbatim >= 200-char answer with >= 2 others" and reports ~154
    respondents, while Sec. 6 specifies a ">= 3 clustered strings" threshold. On
    the shipped data those rules give 177 and 106 respondents respectively;
    neither lands on the ~154 the digest reports nor inside the 140-170 band
    the P10 prompt asserts. Sharing with >= 3 others reproduces the digest
    (155) and keeps Sec. 6's threshold of 3, so it is the rule implemented here.
    ``n_shared_texts`` reports the raw count of distinct clustered strings.

Vector clusters
    A respondent's scale vector is the sorted tuple of (question_number,
    answer_numeric) over every scale question they answered (the 20 questions
    in ``v_scale_answers``: likert_1_5 plus scale_labeled). Respondents whose
    full vectors are byte-identical and at least 10 items long form a cluster.

Blocs
    Hardcoded as definitions in ``BLOC_DEFS`` below and resolved against the
    data at run time; ``--verify`` re-checks every expected size. A respondent
    can belong to more than one bloc (the Greek cluster sits inside the
    pro-hourly bloc), so ``bloc`` is pipe-joined in BLOC_DEFS order, narrowest
    first, and ``bloc.split("|")[0]`` is the respondent's primary bloc.

Citations
    Eight regex signals: url, doi, etal, peer_review, pdf, preprint, journal,
    paren_year. ``citations.csv`` records answers matching any signal;
    ``has_citation`` and ``n_citation_answers`` count only the seven *hard*
    signals (``HARD_SIGNALS``) -- a bare "(2024)" is too weak to call a
    citation on its own, matching how PLAN.md Sec. 3.7 counts them.

Usage
-----
    python3 scripts/analytics/derive_flags.py [--verify]
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
DB_PATH = REPO_ROOT / "data" / "scope2_consultation.sqlite"
OUT_DIR = REPO_ROOT / "data" / "derived"

# --- thresholds -------------------------------------------------------------

MIN_CLUSTER_CHARS = 200      # a shared string must be this long to count
MIN_CLUSTER_MEMBERS = 3      # ...and shared by at least this many respondents
MIN_TEMPLATE_CO_SHARERS = 3  # ...and you need this many co-sharers to be flagged
MIN_VECTOR_LENGTH = 10       # scale answers needed before an identical vector counts
PREVIEW_CHARS = 240

# The seven MBM stance anchors, in the order used by ``mbm_anchor_vector``.
ANCHOR_QUESTIONS = (71, 83, 97, 113, 124, 153, 171)

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
# codes that appear in this dataset's links need to be listed.
MULTI_LABEL_SUFFIXES = frozenset(
    """
    co.uk org.uk ac.uk gov.uk net.uk sch.uk me.uk
    com.au net.au org.au edu.au gov.au
    co.jp or.jp ne.jp ac.jp go.jp lg.jp
    com.cn org.cn net.cn gov.cn edu.cn ac.cn
    co.kr or.kr go.kr re.kr ac.kr
    co.in org.in net.in gov.in ac.in
    com.br org.br gov.br edu.br
    co.za org.za gov.za ac.za
    co.nz org.nz govt.nz ac.nz
    com.tw org.tw gov.tw edu.tw
    com.sg org.sg gov.sg edu.sg
    com.mx gob.mx com.ar gob.es
    """.split()
)

# --- curated domain classification -----------------------------------------

DOMAIN_CLASS = {}


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
)
_register(
    "peer_reviewed_or_preprint",
    "ssrn.com", "arxiv.org", "zenodo.org", "biorxiv.org", "osf.io",
    "preprints.org",
)
_register(
    "advocacy",
    "energytag.org", "cebuyers.org", "zerogrid.org", "resource-solutions.org",
    "theclimategroup.org", "matched.energy", "scopetrue.org", "watttime.org",
    "wemeanbusinesscoalition.org", "cdp.net", "rmi.org",
    "transitionzero.org", "bellona.org", "asyousow.org", "ceres.org",
    "climategroup.org", "renewable-ei.org", "wbcsd.org", "eurelectric.org",
    "solarpowereurope.org", "windeurope.org", "beyondfossilfuels.org",
    "breakthroughinstitute.org", "cleanenergybuyers.org", "nrdc.org",
)
# PLAN.md Sec. 5 expects a data-vendor class in the frontend domain table even
# though the P10 class list omits it; commercial energy-data and marketplace
# platforms land here rather than in advocacy.
_register(
    "data_vendor",
    "electricitymaps.com", "leveltenenergy.com", "granularenergy.com",
    "flexidao.com", "ecoinvent.org", "reconnect.energy", "singularity.energy",
)
_register(
    "government",
    "iea.org", "neso.energy", "nrel.gov", "lbnl.gov", "federalregister.gov",
    "europa.eu", "eia.gov", "epa.gov", "energy.gov", "irena.org", "ipcc.ch",
    "unfccc.int", "ofgem.gov.uk", "nationalgrideso.com",
)
_register("standard_setter", "ghgprotocol.org", "sciencebasedtargets.org", "iso.org")
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
)

# --- entity families (curated name patterns, PLAN.md Sec. 3.6) --------------
# Ordered; the first match wins, and ``--verify`` asserts a respondent never
# matches two families.

ENTITY_FAMILIES = (
    # Luxshare filed under both Latin and Chinese trading names. PLAN.md Sec. 3.6
    # counts 9 (the Latin-script spellings only); the CJK pattern picks up three
    # further group companies, so this family resolves to 12 -- see the module
    # report and the P10 handover notes.
    ("luxshare", re.compile(r"luxshare|立讯", re.I)),
    # Avary Holding (ex-Zhen Ding / FPC) and its named subsidiaries.
    ("avary", re.compile(
        r"avary|honghengsheng|hong\s*heng\s*sheng|hong\s*qi\s*sheng|"
        r"qing\s*ding|zhen\s*ding|臻鼎", re.I)),
    ("engie", re.compile(r"\bengie\b", re.I)),
    ("edf", re.compile(r"\bedf\b|electricit[eé] de france", re.I)),
    ("rio_tinto", re.compile(r"rio\s+tinto", re.I)),
    ("deloitte", re.compile(r"deloitte", re.I)),
    ("edinburgh", re.compile(r"university of edinburgh", re.I)),
    # Case-sensitive: a lowercase "mit" is the German preposition.
    ("mit", re.compile(r"\bMIT\b|[Mm]assachusetts [Ii]nstitute")),
    ("action_speaks_louder", re.compile(r"action speaks louder", re.I)),
)

EXPECTED_FAMILY_SIZES = {
    "luxshare": 12,  # PLAN.md Sec. 3.6 says 9 (Latin-script spellings only)
    "avary": 5,
    "engie": 3,
    "edf": 2,
    "rio_tinto": 2,
    "deloitte": 2,
    "edinburgh": 2,
    "mit": 2,
    "action_speaks_louder": 2,
}

# --- bloc definitions (hardcoded, verified against the data at run time) ----
# rule is (kind, argument):
#   anchor_signature  -- respondents whose 7-anchor vector equals the string
#   vector_cluster    -- the identical-scale-vector cluster containing seed id
#   entity_family     -- every member of a curated entity family
#   name_patterns     -- respondents whose organization matches any pattern
#   text_component    -- respondents from the seed's country linked to the seed
#                        by >= N shared clustered texts (transitively), for
#                        blocs whose members are all redacted
BLOC_DEFS = (
    ("avary", "Avary / FPC supply chain", ("vector_cluster", 375), 6),
    ("semi", "SEMI and member companies", ("vector_cluster", 603), 6),
    ("luxshare", "Luxshare factory filings", ("entity_family", "luxshare"), 12),
    ("eiga_siga", "EIGA / SIGA industrial gases",
     ("name_patterns", (r"european industrial gases association|\beiga\b",
                        r"\bsiga\b|swedish industrial gases")), 2),
    ("greece", "Greek industrial cluster", ("vector_cluster", 421), 4),
    ("korea", "Korean shared-response cluster", ("text_component", (255, 15)), 3),
    ("fepc_tepco", "FEPC / TEPCO",
     ("name_patterns", (r"federation of electric power|\bfepc\b",
                        r"tepco|tokyo electric power")), 2),
    ("euro_certificate", "European certificate-market cluster",
     ("name_patterns", (r"recs energy certificate",
                        r"eurelectric|union of the electricity industry",
                        r"finnish energy",
                        r"\bsamorka\b",
                        r"ecs switzerland",
                        r"\bfortum\b",
                        r"\bhafslund\b",
                        r"\blandsvirkjun\b",
                        r"\bon power\b",
                        r"bkw energie",
                        r"\brepower\b",
                        r"\becohz\b",
                        r"caely renewables",
                        r"stichting milieukeur",
                        r"tetra pak")), 15),
    ("pro_hourly", "Pro-hourly-matching bloc", ("anchor_signature", "5545544"), 22),
)

WHITESPACE_RE = re.compile(r"\s+")


# --- helpers ----------------------------------------------------------------


def normalize_text(text: str | None) -> str:
    """Lowercase, collapse whitespace runs to one space, strip."""
    return WHITESPACE_RE.sub(" ", (text or "").lower()).strip()


def sha1(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()


def registrable_domain(url: str) -> str:
    """Reduce a matched URL to its registrable domain, or "" if unusable."""
    host = re.sub(r"^https?://", "", url, flags=re.I)
    host = host.split("/")[0].split("?")[0].split("#")[0]
    host = host.split("@")[-1].split(":")[0].lower().strip(".,;:!'\"")
    if not host or "." not in host or host.replace(".", "").isdigit():
        return ""
    labels = [label for label in host.split(".") if label]
    if len(labels) < 2:
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
        "SELECT respondent_id, organization, country, organization_type, "
        "       is_redacted+0 AS is_redacted "
        "FROM respondents ORDER BY respondent_id+0"
    ).fetchall()
    return {
        int(r["respondent_id"]): {
            "organization": r["organization"] or "",
            "country": r["country"] or "",
            "organization_type": r["organization_type"] or "",
            "is_redacted": int(r["is_redacted"]),
        }
        for r in rows
    }


def load_free_text(con: sqlite3.Connection) -> list[tuple[int, int, str]]:
    rows = con.execute(
        "SELECT respondent_id, question_number, answer_text FROM v_free_text "
        "ORDER BY respondent_id+0, question_number+0"
    ).fetchall()
    return [
        (int(r["respondent_id"]), int(r["question_number"]), r["answer_text"] or "")
        for r in rows
    ]


def build_text_clusters(free_text, respondents):
    """Normalized strings >= 200 chars shared by >= 3 respondents."""
    members = defaultdict(set)      # hash -> respondent ids
    questions = defaultdict(set)    # hash -> question numbers
    text_of = {}                    # hash -> normalized text

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


def build_vector_clusters(con: sqlite3.Connection, respondents):
    """Respondents sharing a byte-identical scale-answer vector of length >= 10.

    ``v_scale_answers`` covers every likert_1_5 and scale_labeled question (20
    of them) and never carries a NULL ``answer_numeric``; off-scale picks such
    as "Unsure" are absent by construction.
    """
    vectors = defaultdict(list)
    rows = con.execute(
        "SELECT respondent_id, question_number, answer_numeric FROM v_scale_answers "
        "WHERE answer_numeric IS NOT NULL "
        "ORDER BY respondent_id+0, question_number+0"
    ).fetchall()
    for row in rows:
        vectors[int(row["respondent_id"])].append(
            (int(row["question_number"]), float(row["answer_numeric"]))
        )

    grouped = defaultdict(list)
    for respondent_id, pairs in vectors.items():
        grouped[tuple(sorted(pairs))].append(respondent_id)

    clusters = []
    for vector, ids in grouped.items():
        if len(ids) < 2 or len(vector) < MIN_VECTOR_LENGTH:
            continue
        clusters.append({"members": set(ids), "length": len(vector)})
    clusters.sort(
        key=lambda c: (-len(c["members"]), -c["length"], min(c["members"]))
    )
    for index, cluster in enumerate(clusters, start=1):
        cluster["id"] = f"vc{index:02d}"
        cluster["named"] = [
            i for i in sorted(cluster["members"])
            if not respondents[i]["is_redacted"]
        ]
    return clusters


def build_anchor_vectors(con: sqlite3.Connection):
    """respondent -> 7-character stance signature, '-' where unanswered."""
    placeholders = ",".join(str(q) for q in ANCHOR_QUESTIONS)
    answers = defaultdict(dict)
    rows = con.execute(
        "SELECT respondent_id, question_number, answer_numeric FROM v_scale_answers "
        f"WHERE question_number+0 IN ({placeholders}) AND answer_numeric IS NOT NULL"
    ).fetchall()
    for row in rows:
        answers[int(row["respondent_id"])][int(row["question_number"])] = int(
            float(row["answer_numeric"])
        )
    return {
        respondent_id: "".join(
            str(scores[q]) if q in scores else "-" for q in ANCHOR_QUESTIONS
        )
        for respondent_id, scores in answers.items()
    }


def assign_entity_families(respondents):
    """respondent -> entity_group, for named respondents only."""
    families = {}
    overlaps = []
    for respondent_id in sorted(respondents):
        profile = respondents[respondent_id]
        if profile["is_redacted"]:
            continue
        matched = [
            key for key, pattern in ENTITY_FAMILIES
            if pattern.search(profile["organization"])
        ]
        if matched:
            families[respondent_id] = matched[0]
            if len(matched) > 1:
                overlaps.append((respondent_id, matched))
    return families, overlaps


def resolve_bloc(rule, context):
    """Turn one BLOC_DEFS rule into a concrete member set."""
    kind, argument = rule
    if kind == "anchor_signature":
        return {
            respondent_id
            for respondent_id, signature in context["anchor_vectors"].items()
            if signature == argument
        }
    if kind == "vector_cluster":
        for cluster in context["vector_clusters"]:
            if argument in cluster["members"]:
                return set(cluster["members"])
        return set()
    if kind == "entity_family":
        return {
            respondent_id
            for respondent_id, family in context["entity_families"].items()
            if family == argument
        }
    if kind == "name_patterns":
        members = set()
        for raw in argument:
            pattern = re.compile(raw, re.I)
            members |= {
                respondent_id
                for respondent_id, profile in context["respondents"].items()
                if not profile["is_redacted"]
                and pattern.search(profile["organization"])
            }
        return members
    if kind == "text_component":
        seed, min_shared = argument
        return text_component(
            seed, min_shared, context["clusters"], context["respondents"]
        )
    raise ValueError(f"unknown bloc rule kind: {kind}")


def text_component(seed: int, min_shared: int, clusters, respondents):
    """Respondents transitively linked to ``seed`` by >= min_shared shared texts.

    Used for blocs whose members are all redacted, where no name pattern can
    reach them: coordination is visible only in the verbatim overlap. The walk
    is confined to the seed's country, because these are national clusters and
    the templates themselves travel further -- the Korean trio shares 15+
    verbatim answers with the SEMI bloc, so an unconstrained walk merges the
    two.
    """
    country = respondents[seed]["country"]
    in_scope = {i for i, p in respondents.items() if p["country"] == country}
    pair_counts = Counter()
    for cluster in clusters:
        ids = sorted(cluster["members"] & in_scope)
        for i, left in enumerate(ids):
            for right in ids[i + 1:]:
                pair_counts[(left, right)] += 1

    neighbours = defaultdict(set)
    for (left, right), count in pair_counts.items():
        if count >= min_shared:
            neighbours[left].add(right)
            neighbours[right].add(left)

    component, frontier = {seed}, [seed]
    while frontier:
        current = frontier.pop()
        for neighbour in sorted(neighbours[current]):
            if neighbour not in component:
                component.add(neighbour)
                frontier.append(neighbour)
    return component


def mine_citations(free_text):
    """Per-answer signals, per-respondent rollups, and per-domain tallies."""
    answer_rows = []
    hard_answers = Counter()
    url_counts = Counter()
    domains_by_respondent = defaultdict(set)
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
            domains_by_respondent[respondent_id].add(domain)
            domain_answers[domain].add((respondent_id, question_number))
            domain_respondents[domain].add(respondent_id)

    answer_rows.sort(key=lambda r: (r[0], r[1]))
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
        key=lambda r: (-r[1], -r[2], r[0]),
    )
    return {
        "answer_rows": answer_rows,
        "hard_answers": hard_answers,
        "url_counts": url_counts,
        "domains_by_respondent": domains_by_respondent,
        "domain_rows": domain_rows,
    }


def load_evidence_basis(con: sqlite3.Connection):
    """Q138 multi-select evidence claims and the Q122 single-select basis."""
    empirical, operational, general = set(), set(), set()
    rows = con.execute(
        "SELECT respondent_id, option_text FROM response_selections "
        "WHERE question_number+0 = 138 AND is_canonical+0 = 1"
    ).fetchall()
    for row in rows:
        respondent_id = int(row["respondent_id"])
        option = (row["option_text"] or "").lower()
        if option.startswith("direct empirical analysis"):
            empirical.add(respondent_id)
        elif option.startswith("operational experience"):
            operational.add(respondent_id)
        elif option.startswith("general awareness"):
            general.add(respondent_id)
    # "General awareness" only counts as *only* when no stronger claim is made.
    general_only = general - empirical - operational

    basis = {}
    rows = con.execute(
        "SELECT respondent_id, answer_text FROM responses "
        "WHERE question_number+0 = 122 AND answer_text IS NOT NULL AND answer_text <> ''"
    ).fetchall()
    for row in rows:
        basis[int(row["respondent_id"])] = slugify(row["answer_text"])
    return empirical, operational, general_only, basis


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", (text or "").lower()).strip("_")


# --- assembly ---------------------------------------------------------------


def build(con: sqlite3.Connection) -> dict:
    respondents = load_respondents(con)
    free_text = load_free_text(con)

    clusters = build_text_clusters(free_text, respondents)
    n_shared, co_sharers = summarize_sharing(clusters)
    vector_clusters = build_vector_clusters(con, respondents)
    anchor_vectors = build_anchor_vectors(con)
    entity_families, family_overlaps = assign_entity_families(respondents)

    context = {
        "respondents": respondents,
        "clusters": clusters,
        "vector_clusters": vector_clusters,
        "anchor_vectors": anchor_vectors,
        "entity_families": entity_families,
    }
    blocs = {}
    for key, label, rule, expected in BLOC_DEFS:
        blocs[key] = {
            "label": label,
            "expected": expected,
            "members": resolve_bloc(rule, context),
        }
    bloc_of = defaultdict(list)
    for key, _label, _rule, _expected in BLOC_DEFS:
        for respondent_id in sorted(blocs[key]["members"]):
            bloc_of[respondent_id].append(key)

    vector_cluster_of = {}
    for cluster in vector_clusters:
        for respondent_id in cluster["members"]:
            vector_cluster_of[respondent_id] = cluster["id"]

    citations = mine_citations(free_text)
    empirical, operational, general_only, readiness_basis = load_evidence_basis(con)

    flag_rows = []
    for respondent_id in sorted(respondents):
        hard = citations["hard_answers"].get(respondent_id, 0)
        flag_rows.append([
            respondent_id,
            int(len(co_sharers.get(respondent_id, ())) >= MIN_TEMPLATE_CO_SHARERS),
            n_shared.get(respondent_id, 0),
            entity_families.get(respondent_id, ""),
            "|".join(bloc_of.get(respondent_id, ())),
            vector_cluster_of.get(respondent_id, ""),
            anchor_vectors.get(respondent_id, "-------"),
            int(hard > 0),
            hard,
            citations["url_counts"].get(respondent_id, 0),
            "|".join(sorted(citations["domains_by_respondent"].get(respondent_id, ()))),
            int(respondent_id in empirical),
            int(respondent_id in operational),
            int(respondent_id in general_only),
            readiness_basis.get(respondent_id, ""),
        ])

    return {
        "respondents": respondents,
        "flag_rows": flag_rows,
        "clusters": clusters,
        "vector_clusters": vector_clusters,
        "blocs": blocs,
        "citations": citations,
        "entity_families": entity_families,
        "family_overlaps": family_overlaps,
        "co_sharers": co_sharers,
        "anchor_vectors": anchor_vectors,
    }


FLAG_HEADER = [
    "respondent_id", "is_template_response", "n_shared_texts", "entity_group",
    "bloc", "vector_cluster_id", "mbm_anchor_vector", "has_citation",
    "n_citation_answers", "n_urls", "domains", "evidence_empirical",
    "evidence_operational", "evidence_general_only", "readiness_basis",
]


def write_outputs(result: dict) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    respondents = result["respondents"]

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
        OUT_DIR / "vector_clusters.csv",
        ["cluster_id", "n_respondents", "vector_length", "member_ids", "named_members"],
        [
            [
                cluster["id"], len(cluster["members"]), cluster["length"],
                join_ids(cluster["members"]),
                # Redacted members are counted, never named. Organization is
                # uncontrolled free text, so collapse and truncate it.
                "|".join(
                    WHITESPACE_RE.sub(" ", respondents[i]["organization"])
                    .replace("|", "/").strip()[:80]
                    for i in cluster["named"]
                ),
            ]
            for cluster in result["vector_clusters"]
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


def verify(result: dict) -> list[str]:
    """Cross-check the resolved data against the hardcoded expectations."""
    problems = []
    respondents = result["respondents"]

    if len(result["flag_rows"]) != len(respondents):
        problems.append("respondent_flags row count != respondents table")

    for respondent_id, matched in result["family_overlaps"]:
        problems.append(
            f"respondent {respondent_id} matches several entity families: {matched}"
        )

    sizes = Counter(result["entity_families"].values())
    for family, expected in sorted(EXPECTED_FAMILY_SIZES.items()):
        if sizes.get(family, 0) != expected:
            problems.append(
                f"entity family {family}: expected {expected}, got {sizes.get(family, 0)}"
            )

    for key, _label, _rule, expected in BLOC_DEFS:
        actual = len(result["blocs"][key]["members"])
        if actual != expected:
            problems.append(f"bloc {key}: expected {expected} members, got {actual}")

    # No redacted organization may leak into a named-members column.
    for cluster in result["vector_clusters"]:
        for respondent_id in cluster["named"]:
            if respondents[respondent_id]["is_redacted"]:
                problems.append(f"redacted respondent {respondent_id} named in {cluster['id']}")
    return problems


def report(result: dict) -> None:
    flags = result["flag_rows"]
    index = {name: i for i, name in enumerate(FLAG_HEADER)}
    template = sum(row[index["is_template_response"]] for row in flags)
    citing = sum(row[index["has_citation"]] for row in flags)

    print(f"respondents               {len(flags)}")
    print(f"text clusters             {len(result['clusters'])}")
    print(f"template respondents      {template}")
    print(f"vector clusters           {len(result['vector_clusters'])}")
    print(f"citation respondents      {citing}")
    print(f"citation answers          {len(result['citations']['answer_rows'])}")
    print(f"linked domains            {len(result['citations']['domain_rows'])}")
    print("blocs:")
    for key, label, _rule, _expected in BLOC_DEFS:
        bloc = result["blocs"][key]
        members = bloc["members"]
        redacted = sum(1 for i in members if result["respondents"][i]["is_redacted"])
        print(f"  {key:12s} n={len(members):3d} (named {len(members) - redacted}, "
              f"redacted {redacted})  {label}")
    print("entity families:")
    for family, count in sorted(Counter(result["entity_families"].values()).items()):
        print(f"  {family:22s} {count}")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--verify", action="store_true",
                        help="fail if a bloc or entity family misses its expected size")
    args = parser.parse_args(argv)

    if not DB_PATH.exists():
        print(f"database not found: {DB_PATH}", file=sys.stderr)
        return 2

    con = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    try:
        result = build(con)
    finally:
        con.close()

    write_outputs(result)
    report(result)

    problems = verify(result)
    if problems:
        print("\nverification problems:", file=sys.stderr)
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        if args.verify:
            return 1
    else:
        print("\nverification: all bloc and entity-family sizes as expected")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
