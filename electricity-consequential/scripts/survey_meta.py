"""Interpretation layer for the GHG Protocol Electricity-Sector Consequential
Methods public consultation survey.

Everything in this module is *editorial*: it is our reading of what each question
asks, which answers sit on a ladder and in which direction, and which answers are
escape hatches that must never be averaged. It is kept separate from
``build_dataset.py`` (which is purely mechanical) so that disagreements about
interpretation can be resolved by editing one file. The separation is inherited
from the Scope 2 hub at the repo root and is deliberate.

Question numbers are the survey's own numbering as it appears in the raw column
headers ("19. Referencing Section 6.1..." -> question 19). Numbers 1, 2, 7 and 8
are absent from the published export. Question 26 is a nine-row matrix and is
carried as sub-numbered questions 26.1-26.9.

Seeded by P01. P02 finalises: the topic/category vocabularies, the polarity map,
the per-question notes, and every row of reference/question_labels.csv.
"""

# ---------------------------------------------------------------------------
# Topic sections
# ---------------------------------------------------------------------------
# (first_q, last_q, order, section label)
# Unlike the Scope 2 export, this survey's sections line up with the published
# consultation document, so the section boundaries are the document's own:
# section 5 general feedback, 6 formula (6.1 TWG subgroup approach),
# 7 additionality, 8 marginal emission rates, 9 weighting.
SECTIONS = [
    (3, 17, 1, "Respondent profile"),
    (18, 18, 2, "General feedback on consequential methods"),
    (19, 25, 3, "Quantification formula and scope"),
    (26, 34, 4, "Additionality tests"),
    (35, 46, 5, "Marginal emission rates"),
    (47, 52, 6, "Build and operating margin weighting"),
]


def section_for(qnum):
    for lo, hi, order, label in SECTIONS:
        if lo <= qnum <= hi:
            return order, label
    return None, None


# ---------------------------------------------------------------------------
# The additionality matrix (question 26)
# ---------------------------------------------------------------------------
# The single most important reading in this file. Question 26 asks, for each of
# nine additionality tests, whether it should be Required / Optional / Not
# required. That is a **stringency** ladder, not a sentiment scale: "Required" is
# not approval and "Not required" is not disapproval. Anything that colours these
# answers with a support ramp is misreading them - see PLAN.md gotcha 5.
MATRIX_CONSTRUCT = "stringency"
MATRIX_QNUM = 26
MATRIX_LADDER = {
    "required": 3,
    "optional": 2,
    "not required": 1,
}
MATRIX_LEVELS = [  # ordered high -> low stringency, for display
    ("required", "Required"),
    ("optional", "Optional"),
    ("not_required", "Not required"),
]

# ---------------------------------------------------------------------------
# Ordered (non-matrix) option ladders
# ---------------------------------------------------------------------------
# Questions 43 and 45 ask for the *maximum appropriate* granularity, so their
# options run coarse -> fine. Rank 1 is the coarsest. The direction is editorial:
# nothing in the export says that "Nodal" is finer than "Zonal".
SPATIAL_GRANULARITY = {
    "country": 1,
    "grid region": 2,
    "balancing area": 3,
    "zonal": 4,
    "nodal": 5,
}
TEMPORAL_GRANULARITY = {
    "annual": 1,
    "monthly": 2,
    "hourly": 3,
    "sub-hourly": 4,
}

# qnum -> ladder
ORDINAL_LADDERS = {
    43: SPATIAL_GRANULARITY,
    45: TEMPORAL_GRANULARITY,
}

# ---------------------------------------------------------------------------
# Special options
# ---------------------------------------------------------------------------
# Escape hatches and "none of it" answers. They are real answers and are counted
# and displayed as their own segments, but they carry no position on any ladder
# and must never be netted into an approval or requiredness figure
# (PLAN.md gotcha 6). Matched case-insensitively against a whole selection via
# build_dataset.norm_key, and flagged as question_options.is_special.
SPECIAL_OPTIONS = {
    "unsure",
    "unsure, depends on details",
    "none",
    "none are appropriate",
    "all are feasible",
    "none (no tests are feasible)",
    "not applicable",
    "n/a",
    "na",
    "other or n/a (please specify)",
}

# Standard "escape" choices offered on this survey's picklists. They can be
# selected by very few respondents and would otherwise fall below the frequency
# cutoff that separates offered options from typed-in write-ins. This survey
# routes its write-ins to separate free-text questions (30, 42, 51) rather than
# into an "Other" box on the picklists, so in practice every selection string in
# the export is an offered option and this set only guards the tail.
STANDARD_OPTIONS = {
    "none",
    "none are appropriate",
    "none (no tests are feasible)",
    "all are feasible",
    "unsure",
    "not applicable",
    "n/a",
}

# ---------------------------------------------------------------------------
# Polarity
# ---------------------------------------------------------------------------
# For the binary and three-way stance questions, which answer is the *critical*
# one - i.e. the answer that reads as "the proposal as drafted does not work".
# Renderers use this to decide which end of the support ramp an option gets.
# Note question 19: the critical answer is "No", so a naive "Yes = green" mapping
# inverts the consultation's headline finding.
#
# P01 seeds this from the question wording; P02 confirms it against the
# consultation document and fills in the remainder.
POLARITY = {
    19: {"critical": "No", "supportive": "Yes"},
    21: {"critical": "No", "supportive": "Yes"},
    24: {"critical": "Reported once for the lifetime of the project",
         "supportive": "Reported each year"},
    31: {"critical": "No", "supportive": "Yes"},
    33: {"critical": "No", "supportive": "Yes"},
}

# ---------------------------------------------------------------------------
# Free-text truncation
# ---------------------------------------------------------------------------
# The survey tool cut long answers off at 4,000 characters. Measured on the
# *source* cell before whitespace normalisation, this survey's answer lengths
# have a clean cliff: 18 answers land in [3,990, 4,000] and the next longest is
# 3,986. TRUNCATION_BAND is that cliff, and is editorial - it is a judgement
# about where the tool's cap stops and a respondent's own full stop begins.
TEXT_LIMIT = 4000
TRUNCATION_BAND = 10

# Per-question caveats worth surfacing next to the data. P02 fills this out; the
# entries here are the ones the build itself depends on being understood.
NOTES = {
    5: "Free-text organisational affiliation; not a controlled vocabulary. One "
       "respondent pasted a 1,255-character description rather than a name. "
       "Join on respondent_id, never on this string.",
    26: "Asked as a nine-row matrix. Carried as questions 26.1-26.9 with "
        "question_ids Q026_1..Q026_9. The Required/Optional/Not required ladder "
        "is stringency, not sentiment.",
    28: "The export stores this as a semicolon-delimited multi-select; the "
        "question wording does not say so. 'None (no tests are feasible)' is a "
        "special option, not a test.",
    43: "'Maximum appropriate' granularity, so the ladder runs coarse to fine "
        "and a low rank is not a low opinion.",
    45: "'Maximum appropriate' granularity; see question 43.",
    47: "Approaches judged appropriate. 'Unsure' and 'None are appropriate' are "
        "special options and are excluded from any net figure.",
    49: "Approaches judged NOT feasible - the mirror of 47 and the reason the "
        "two must never share a denominator. 'All are feasible' is a special "
        "option meaning the opposite of a selection.",
    52: "The consultation's own evidence question. 36 answers, of which several "
        "are 'N/A' as free text rather than as an offered option.",
}

# The malformed header the parser has to tolerate, recorded so that a future
# reader does not "fix" it in the raw export.
HEADER_QUIRKS = {
    "26.6 Posititve list": "Missing the second period and misspells 'Positive'. "
                           "Parsed as question 26.6 regardless.",
}


# ---------------------------------------------------------------------------
# Question labels
# ---------------------------------------------------------------------------
# reference/question_labels.csv is hand-curated: one row per question column
# carrying a shorthand slug, a human-readable label, and the grouping axes that
# are deliberately orthogonal to one another and to `section`:
#
#   topic                 which part of the consultation the question belongs to:
#                         profile / general / formula / additionality /
#                         emission_rates / weighting. Survey order and document
#                         order agree here, so topic is close to section, but it
#                         is the axis pages are built from.
#   doc_section           the published consultation document's own section
#                         number ("6.1", "7", "8.2"). The pointer back to the
#                         text a question is asking about.
#   category/subcategory  what the question interrogates - the cross-cutting
#                         concern. Cuts across topics, so that (say) feasibility
#                         questions scattered over three sections collect.
#   asks_for              what shape the answer takes.
#
# Nothing here is derived from the raw export; it is all editorial, which is why
# it lives in a file that can be corrected by hand rather than in
# build_dataset.py.
LABELS_FILE = "reference/question_labels.csv"

LABEL_FIELDS = ("shorthand", "label", "topic", "doc_section", "category",
                "subcategory", "asks_for", "notes")

# --- closed vocabularies ---------------------------------------------------
# A value outside these is a typo until argued otherwise, so load_labels()
# rejects it rather than letting a one-off slug into a column people group by.

TOPICS = {"profile", "general", "formula", "additionality", "emission_rates",
          "weighting"}

# P01 ships a mechanically generated stub of question_labels.csv so the build can
# run before P02 exists. The stub cannot know the editorial axes, so it writes
# the placeholder below. P02 replaces every row and then flips this to False,
# which turns the placeholder into a hard error.
PROVISIONAL_LABEL_VALUE = "tbd"
ALLOW_PROVISIONAL_LABELS = True

# Minimal starter set. P02 designs the real cross-cutting concern vocabulary
# (PLAN.md section 6, P02) and replaces this wholesale; it is kept small on
# purpose so that an unreviewed category cannot slip through looking finished.
CATEGORIES = {"resp_profile"}

# The answer shapes this survey actually uses. Unlike the categories, this
# vocabulary is settled: it is derived from the question wording, not from a
# reading of intent.
ASKS_FOR = {
    "stance",              # binary / three-way position questions
    "matrix_rating",       # the 26.x Required/Optional/Not required rows
    "feasibility_pick",    # question 28
    "method_pick",         # the appropriate / not-appropriate methodology lists
    "design_preference",   # the granularity ladders
    "rationale",           # why-you-answered-that follow-ups
    "elaboration",         # open-ended additional context on a prior answer
    "evidence",            # question 52
    "respondent_attribute",
    "open_feedback",       # substantive primaries with no stance above them
}

# Topics that a question's own section already determines, pinned so the two
# columns cannot drift apart once P02 starts editing rows by hand.
SECTION_IMPLIES_TOPIC = {
    1: "profile", 2: "general", 3: "formula", 4: "additionality",
    5: "emission_rates", 6: "weighting",
}

SHORTHAND_MAX_LEN = 40


def load_labels(root):
    """Read and check reference/question_labels.csv -> {question_id: {...}}.

    Fails loudly, because a silently missing label would show up as an empty
    cell in questions.csv long after the join. Checked here rather than in
    build_dataset.py so that the rules travel with the vocabulary they police.
    """
    import csv
    import re

    path = root / LABELS_FILE
    if not path.exists():
        raise SystemExit(f"missing hand-curated label file: {path}")

    with path.open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    provisional = 0
    labels, seen_shorthand, problems = {}, {}, []
    for row in rows:
        qid = row["question_id"].strip()
        sh = row["shorthand"].strip()

        if not re.fullmatch(r"[a-z][a-z0-9_]*", sh):
            problems.append(f"{qid}: shorthand {sh!r} is not snake_case")
        if len(sh) > SHORTHAND_MAX_LEN:
            problems.append(
                f"{qid}: shorthand {sh!r} is {len(sh)} chars, limit is "
                f"{SHORTHAND_MAX_LEN}")
        if sh in seen_shorthand:
            problems.append(
                f"{qid}: shorthand {sh!r} already used by {seen_shorthand[sh]}")
        seen_shorthand[sh] = qid

        def check(field, vocabulary):
            value = row[field].strip()
            if value == PROVISIONAL_LABEL_VALUE:
                if ALLOW_PROVISIONAL_LABELS:
                    return True
                problems.append(
                    f"{qid}: {field} is still the P01 placeholder "
                    f"{PROVISIONAL_LABEL_VALUE!r}")
                return False
            if value not in vocabulary:
                problems.append(
                    f"{qid}: {field} {value!r} not in the closed vocabulary")
                return False
            return False

        provisional += check("topic", TOPICS)
        provisional += check("category", CATEGORIES)
        check("asks_for", ASKS_FOR)

        for field in ("label", "doc_section", "subcategory"):
            if not row[field].strip():
                problems.append(f"{qid}: {field} is empty")

        if qid in labels:
            problems.append(f"{qid}: duplicated row")
        labels[qid] = {
            "shorthand": sh,
            "label": row["label"].strip(),
            "topic": row["topic"].strip(),
            "doc_section": row["doc_section"].strip(),
            "category": row["category"].strip(),
            "subcategory": row["subcategory"].strip(),
            "asks_for": row["asks_for"].strip(),
            "label_notes": row["notes"].strip(),
        }

    if problems:
        raise SystemExit(
            f"{path.name}: {len(problems)} problem(s)\n  "
            + "\n  ".join(problems))
    if provisional:
        print(f"  NOTE: {provisional} label field(s) still carry the P01 "
              f"placeholder {PROVISIONAL_LABEL_VALUE!r} - P02 replaces them")
    return labels
