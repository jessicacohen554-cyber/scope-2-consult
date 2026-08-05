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

Seeded by P01; finalised by P02. The hand-labelled codebook is
reference/question_labels.csv; every vocabulary it may use is closed here, and
``load_labels()`` rejects anything outside them at build time.
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
#
# The matrix stem and the construct definitions live only in the consultation
# document's section 7.2 preamble, not in the export headers: "required"
# means a mandatory test all projects must pass; "optional" means a test a
# project may choose to use to demonstrate additionality. The frame is a
# framework "designed to assess additionality for renewable energy projects" -
# the matrix is scoped to renewables, not to electricity projects in general.
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
# nothing in the export says that "Nodal" is finer than "Zonal". A ceiling is
# not a preference - answering "Nodal" says finer-than-nodal is never warranted,
# not that nodal resolution is demanded.
SPATIAL_GRANULARITY = {
    "country": 1,
    "grid region": 2,
    "balancing area": 3,
    "zonal": 4,
    "nodal": 5,
}
# The consultation document also offers "Daily" between Monthly and Hourly
# (section 8.3, question 45, option c). No respondent selected it - or the
# online form dropped it - so it is absent from the export and the ladder
# skips from monthly to hourly. If a "daily" answer ever appears, add it here
# with the intermediate rank; until then an unmatched answer fails validation
# loudly rather than being silently unranked.
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

# Human-readable anchors for the ordinal ladders, exported alongside the data so
# a chart never has to guess which end of the scale is which.
ORDINAL_ANCHORS = {
    43: {"low": "1 = coarsest (Country)", "high": "5 = finest (Nodal)"},
    45: {"low": "1 = coarsest (Annual)", "high": "4 = finest (Sub-hourly)"},
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
#
# Polarity here is PROPOSAL-RELATIVE, judged against what the consultation
# document actually drafts, not against the yes/no surface of the wording:
#
#   19  The drafted proposal is the TWG subgroup formula itself; "No" rejects
#       it. A naive Yes=green mapping is right here, but only by coincidence.
#   21  Document section 6.1 states the subgroup approach "does not consider
#       secondary effects". The draft is primary-only, so "Yes" (consider
#       secondary effects too) is the answer that pushes against the proposal.
#       P01 seeded critical="No" from the wording alone; the document overrules
#       it, and P02 corrected the direction. Do not "fix" it back.
#   24  Section 6.1 drafts each-year reporting ("recommends limiting the
#       analysis to the reporting year period only and suggests reporting these
#       impacts each year"); the Guidelines' lifetime approach is the displaced
#       alternative. "Reported once for the lifetime" is therefore critical.
#   31  The document drafts no position on regional tailoring of additionality
#       tests - section 7 asks openly. No answer is anti-proposal; entry is
#       None, meaning: judged, and judged to have no polarity. Render neutral.
#   33  Same: no drafted position on rigor-by-claim-type. None by judgment.
#
# A None entry is a documented judgment, not a gap - the coverage check in
# validate_dataset.py asserts every single_select stance question appears here.
POLARITY = {
    19: {"critical": "No", "supportive": "Yes"},
    21: {"critical": "Yes", "supportive": "No"},
    24: {"critical": "Reported once for the lifetime of the project",
         "supportive": "Reported each year"},
    31: None,
    33: None,
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

# Per-question caveats worth surfacing next to the data. These are the
# data-handling caveats (how an answer is stored, which base to divide by,
# which options are escapes); the wording-level hazards live in the notes
# column of reference/question_labels.csv and land in questions.csv as
# label_notes. Both columns are carried so neither layer crowds out the other.
NOTES = {
    3: "\"This information\" refers to the identity fields collected before "
       "it; the consultation document's anonymity paragraph defines the "
       "redactable set (name, organizational affiliation, jurisdiction). "
       "Drives is_redacted.",
    5: "Free-text organisational affiliation; not a controlled vocabulary. One "
       "respondent pasted a 1,255-character description rather than a name. "
       "Join on respondent_id, never on this string.",
    18: "The export header is truncated mid-parenthesis; the document "
        "completes it '(e.g., feasibility, data needs, costs, comparability, "
        "clarity of claims)'.",
    19: "The document version carries a scoping parenthetical the survey "
        "omits: judge the formula's structure, save methodological detail for "
        "later sections. Critical answer is No.",
    21: "The drafted approach is primary-effects-only (document section 6.1), "
        "so Yes is the answer that pushes against the proposal. Polarity is "
        "proposal-relative.",
    24: "Section 6.1 drafts each-year reporting, so the lifetime option is "
        "the critical answer.",
    26: "Asked as a nine-row matrix. Carried as questions 26.1-26.9 with "
        "question_ids Q026_1..Q026_9. The Required/Optional/Not required ladder "
        "is stringency, not sentiment. The stem and the construct definitions "
        "live only in the document's section 7.2 preamble; scope is renewable "
        "energy projects.",
    28: "The export stores this as a semicolon-delimited multi-select; the "
        "question wording does not say so. 'None (no tests are feasible)' is a "
        "special option, not a test.",
    30: "A substantive primary despite the follow-up-like boilerplate inside "
        "its second sentence; the role rules anchor at the start of the "
        "wording for exactly this question.",
    41: "'These models' reaches back over both the 8.1 and 8.2 methodology "
        "families, so answers cannot be assigned to operating or build margin "
        "alone.",
    43: "'Maximum appropriate' granularity, so the ladder runs coarse to fine "
        "and a low rank is not a low opinion.",
    45: "'Maximum appropriate' granularity; see question 43. The document "
        "offers 'Daily' but no respondent selected it, so the export and the "
        "ladder skip it.",
    47: "Approaches judged appropriate. 'Unsure' and 'None are appropriate' are "
        "special options and are excluded from any net figure.",
    49: "Approaches judged NOT FEASIBLE - a different construct from 47's "
        "appropriateness, and the reason the two must never share a "
        "denominator. 'All are feasible' is a special option meaning the "
        "opposite of a selection.",
    52: "The consultation's own evidence question. 36 answers, of which several "
        "are 'N/A' as free text rather than as an offered option.",
}

# Malformed or defective headers the parser has to tolerate, recorded so that a
# future reader does not "fix" them in the raw export.
HEADER_QUIRKS = {
    "26.6 Posititve list": "Missing the second period and misspells 'Positive'. "
                           "Parsed as question 26.6 regardless.",
    "26.4. Barrier Test": "Capital T, unlike the lowercase 'test' on its "
                          "siblings.",
    "18. What potential benefits...": "Header text is cut off mid-parenthesis "
                                      "in the export; the full wording is in "
                                      "the consultation document.",
    "16. What is your organization's sector?": "Says 'GCIS codes' where the "
                                               "classification is GICS.",
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
#   doc_section           the published consultation document's own subsection
#                         that DEFINES what the question interrogates - the
#                         pointer back to the text a reader should open. The
#                         questions are physically printed in the "Questions
#                         for public consultation" subsections (6.2, 7.2, 8.3,
#                         9.2); doc_section instead points at the background:
#                         6.1 the TWG subgroup formula (questions 19-25), 7.1
#                         the additionality tests (26-34), 8.1 operating-margin
#                         methodologies (35-37), 8.2 build-margin methodologies
#                         (38-40), 8 for the cross-cutting emission-rate
#                         questions (41-46), 9.1 the weighting approaches
#                         (47-52), 5 general feedback (18), n/a for profile.
#   category/subcategory  what the question interrogates - the cross-cutting
#                         concern. Cuts across topics, so that (say) the
#                         feasibility questions in two different sections
#                         collect under one key.
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

# P01 shipped a mechanically generated stub of question_labels.csv so the build
# could run before P02 existed; the stub marked every editorial field with the
# placeholder below. P02 replaced every row, and the flag is now False: a
# placeholder anywhere in the file is a hard error, permanently.
PROVISIONAL_LABEL_VALUE = "tbd"
ALLOW_PROVISIONAL_LABELS = False

# The cross-cutting concern vocabulary. Orthogonal to topic by design: a
# category may concentrate in one topic (regional_variation exists only in the
# additionality section), but the axis answers "what is being interrogated",
# not "where in the survey".
#
#   resp_profile           who is answering.
#   overall_assessment     the enterprise as a whole - benefits, challenges,
#                          unintended consequences (question 18).
#   quantification_design  the shape of the reported number: formula structure,
#                          the effects boundary, the reporting period, and the
#                          spatial/temporal resolution ceilings. Spans the
#                          formula and emission-rates topics.
#   additionality_design   which tests belong in the framework, why, and what
#                          is missing from it.
#   feasibility_and_data   whether tests and approaches can be implemented in
#                          practice. Spans additionality (28, 29) and
#                          weighting (49, 50).
#   method_choice          which quantification methodologies, approaches and
#                          metrics are fit for use. Spans emission_rates
#                          (35-42) and weighting (47, 48, 51).
#   regional_variation     whether the rules should differ by region (31, 32).
#   claims_and_rigor       whether rigor should scale with the claim being
#                          made (33, 34).
#   evidence               supporting research and documentation (52).
CATEGORIES = {
    "resp_profile",
    "overall_assessment",
    "quantification_design",
    "additionality_design",
    "feasibility_and_data",
    "method_choice",
    "regional_variation",
    "claims_and_rigor",
    "evidence",
}

# Every subcategory belongs to exactly one category; load_labels() enforces the
# pairing so the two columns cannot contradict each other.
CATEGORY_SUBCATS = {
    "resp_profile": {"identity_and_consent", "geography", "resp_capacity",
                     "inv_involvement", "org_classification"},
    "overall_assessment": {"benefits_and_risks"},
    "quantification_design": {"formula_structure", "effects_boundary",
                              "reporting_period", "spatial_granularity",
                              "temporal_granularity"},
    "additionality_design": {"test_requiredness", "missing_tests"},
    "feasibility_and_data": {"test_feasibility", "weighting_feasibility"},
    "method_choice": {"om_methods", "bm_methods", "method_applicability",
                      "alt_metrics", "weighting_methods"},
    "regional_variation": {"regional_tests"},
    "claims_and_rigor": {"claim_tiering"},
    "evidence": {"supporting_research"},
}
SUBCATEGORIES = frozenset().union(*CATEGORY_SUBCATS.values())

# The answer shapes this survey actually uses. Unlike the categories, this
# vocabulary is settled: it is derived from the question wording, not from a
# reading of intent.
#
# The rationale/elaboration line is drawn on the wording's referent: rationale
# when the follow-up points back at *your answer* ("please explain your answer
# to question 19", "provide context regarding your answer to question 43"),
# elaboration when it points at the *subject* ("additional context or
# information on which tests are or are not feasible").
ASKS_FOR = {
    "stance",              # binary / three-way position questions (19, 21, 24, 31, 33)
    "matrix_rating",       # the 26.x Required/Optional/Not required rows
    "feasibility_pick",    # feasible-to-implement picks: 28 and 49 (49 asks
                           # NOT-feasible; same construct, inverted)
    "method_pick",         # the appropriate / not-appropriate methodology
                           # lists (35, 36, 38, 39) and the appropriate
                           # weighting approaches (47)
    "design_preference",   # the granularity ladders (43, 45)
    "rationale",           # why-you-answered-that follow-ups
    "elaboration",         # open-ended additional context on a subject
    "evidence",            # question 52
    "respondent_attribute",
    "open_feedback",       # substantive primaries with no stance above them
}

# The consultation document subsections a question may point at (see the
# doc_section semantics above). "n/a" is the profile block, which the document
# does not contain.
DOC_SECTIONS = {"n/a", "5", "6.1", "7.1", "8", "8.1", "8.2", "9.1"}

# Questions whose notes field in reference/question_labels.csv must not be
# empty: each carries a wording defect or interpretive hazard that the codebook
# is required to disclose (the 26.6 typo, 28's unstated multi-select-ness, the
# 43/45 ceiling framing, the 47/49 construct asymmetry, the 21/24 polarity
# bases, 52's dual role, the unenforced conditional filters on 22/23/32/34...).
REQUIRED_NOTES = {
    "Q018", "Q019", "Q021", "Q022", "Q023", "Q024", "Q026_6", "Q028", "Q031",
    "Q032", "Q033", "Q034", "Q035", "Q036", "Q043", "Q045", "Q047", "Q049",
    "Q052",
}

# Topics that a question's own section already determines, pinned so the two
# columns cannot drift apart once the rows are edited by hand.
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
        if re.search(r"\d", sh):
            # The ID columns already carry the number; a number inside the slug
            # is either redundant or, worse, wrong after a renumbering.
            problems.append(f"{qid}: shorthand {sh!r} contains a digit")
        if len(sh) > SHORTHAND_MAX_LEN:
            problems.append(
                f"{qid}: shorthand {sh!r} is {len(sh)} chars, limit is "
                f"{SHORTHAND_MAX_LEN}")
        if sh in seen_shorthand:
            problems.append(
                f"{qid}: shorthand {sh!r} already used by {seen_shorthand[sh]}")
        seen_shorthand[sh] = qid

        # The join keys are immutable; the qid must agree with the number and
        # sub-number columns beside it.
        m = re.fullmatch(r"Q(\d{3})(?:_(\d))?", qid)
        if not m:
            problems.append(f"{qid}: question_id is not Qnnn or Qnnn_s")
        else:
            want_num, want_sub = int(m.group(1)), m.group(2) or ""
            if row["question_number"].strip() != str(want_num):
                problems.append(
                    f"{qid}: question_number {row['question_number']!r} "
                    f"disagrees with the id")
            if row["sub_number"].strip() != want_sub:
                problems.append(
                    f"{qid}: sub_number {row['sub_number']!r} disagrees with "
                    f"the id")

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
        provisional += check("subcategory", SUBCATEGORIES)
        check("asks_for", ASKS_FOR)
        check("doc_section", DOC_SECTIONS)

        cat, sub = row["category"].strip(), row["subcategory"].strip()
        if cat in CATEGORY_SUBCATS and sub not in (
                CATEGORY_SUBCATS[cat] | {PROVISIONAL_LABEL_VALUE}):
            problems.append(
                f"{qid}: subcategory {sub!r} does not belong to category "
                f"{cat!r}")

        for field in ("label", "doc_section", "subcategory"):
            if not row[field].strip():
                problems.append(f"{qid}: {field} is empty")
        if qid in REQUIRED_NOTES and not row["notes"].strip():
            problems.append(
                f"{qid}: notes is empty but this question carries a disclosed "
                f"wording hazard (see survey_meta.REQUIRED_NOTES)")

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
