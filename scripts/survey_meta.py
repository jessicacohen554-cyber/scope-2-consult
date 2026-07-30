"""Interpretation layer for the GHG Protocol Scope 2 public consultation survey.

Everything in this module is *editorial*: it is our reading of what each question
asks and how its answer scale should be interpreted. It is kept separate from
``build_dataset.py`` (which is purely mechanical) so that disagreements about
interpretation can be resolved by editing one file.

Question numbers are the survey's own numbering as it appears in the raw column
headers ("18.Please provide any feedback..." -> question 18). Numbers 1, 2 and 7
are absent from the published export.
"""

# ---------------------------------------------------------------------------
# Topic sections
# ---------------------------------------------------------------------------
# (first_q, last_q, order, section label)
# Derived by reading the questions in order; the published consultation document
# uses its own section numbering (e.g. question 159 refers to "section 5.3.1"),
# which is not reproduced in the raw export.
SECTIONS = [
    (3, 17, 1, "Respondent profile"),
    (18, 18, 2, "Scope 2 definition"),
    (19, 20, 3, "LBM and MBM definitions"),
    (21, 22, 4, "Purposes of the location-based and market-based methods"),
    (23, 34, 5, "LBM emission factor hierarchy"),
    (35, 43, 6, "Definition of 'accessible'"),
    (44, 51, 7, "LBM requirement: most precise accessible emission factor"),
    (52, 56, 8, "LBM decision-usefulness and comparability"),
    (57, 61, 9, "LBM hourly data availability"),
    (62, 68, 10, "LBM cost, effort and readiness"),
    (69, 70, 11, "Deliverable market boundary and exemption threshold preferences"),
    (71, 76, 12, "MBM Quality Criterion 4: hourly matching"),
    (77, 82, 13, "MBM Quality Criterion 4: cost and effort"),
    (83, 91, 14, "MBM Quality Criterion 5: deliverability"),
    (92, 96, 15, "MBM Quality Criterion 5: cost and effort"),
    (97, 112, 16, "Standard Supply Service (SSS)"),
    (113, 123, 17, "Residual mix emission factors"),
    (124, 129, 18, "Fossil-based fallback emission factor"),
    (130, 133, 19, "Feasibility measures"),
    (134, 138, 20, "MBM decision-usefulness and comparability"),
    (139, 141, 21, "Procurement cost impacts"),
    (142, 145, 22, "Financial reporting (IFRS/GAAP) impacts"),
    (146, 151, 23, "Separate impact metric outside scope 2"),
    (152, 152, 24, "Overall balance of revisions"),
    (153, 170, 25, "Exemptions to hourly matching"),
    (171, 180, 26, "Legacy clause"),
    (181, 183, 27, "Transition approach"),
]


def section_for(qnum):
    for lo, hi, order, label in SECTIONS:
        if lo <= qnum <= hi:
            return order, label
    return None, None


# ---------------------------------------------------------------------------
# Scale semantics
# ---------------------------------------------------------------------------
# The single most important thing in this file. The survey reuses a bare 1-5 box
# for three different constructs whose directions do NOT agree:
#
#   * support           -> 5 means "strongly supports the proposal"
#   * burden_relative   -> 3 means "same as today", 5 means "much more costly",
#                          i.e. a high score is a complaint, not endorsement
#   * impact_magnitude  -> 5 means "large knock-on impact", also not endorsement
#
# Never pool these into one mean. `scale_construct` exists so that a filter on
# construct is the natural way to aggregate.
#
# qnum -> (construct, low_anchor, high_anchor, note)
SCALES = {
    23: ("support", "1 = does not support", "5 = strongly supports",
         "Support for the updated LBM emission factor hierarchy."),
    35: ("support", "1 = does not support", "5 = strongly supports",
         "Support for the new definition of 'accessible'."),
    44: ("support", "1 = does not support", "5 = strongly supports",
         "Support for requiring the most precise accessible LBM emission factor."),
    71: ("support", "1 = does not support", "5 = strongly supports",
         "Support for Quality Criterion 4 (hourly matching)."),
    83: ("support", "1 = does not support", "5 = strongly supports",
         "Support for Quality Criterion 5 (deliverability)."),
    97: ("support", "1 = does not support", "5 = strongly supports",
         "Support for the Standard Supply Service guidance and pro-rata limit."),
    113: ("support", "1 = does not support", "5 = strongly supports",
          "Support for the updated residual mix emission factor definition."),
    124: ("support", "1 = does not support", "5 = strongly supports",
          "Support for the fossil-based fallback emission factor requirement."),
    153: ("support", "1 = does not support", "5 = strongly supports",
          "Support for allowing exemptions to hourly matching."),
    171: ("support", "1 = does not support", "5 = strongly supports",
          "Support for introducing a Legacy Clause."),

    78: ("burden_relative", "1 = much less effort", "5 = much more effort",
         "Internal administrative effort of hourly matching. 3 is explicitly "
         "anchored to the respondent's CURRENT level of effort, so 5 is a cost "
         "complaint and not a measure of support."),
    79: ("burden_relative", "1 = much lower cost", "5 = much higher cost",
         "External service cost of hourly matching. 3 is anchored to the "
         "respondent's current external cost."),
    92: ("burden_relative", "1 = much less effort", "5 = much more effort",
         "Internal administrative effort of the deliverability requirement. "
         "3 is anchored to the respondent's current level of effort."),
    93: ("burden_relative", "1 = much lower cost", "5 = much higher cost",
         "External service cost of the deliverability requirement. 3 is anchored "
         "to the respondent's current external cost."),
    139: ("cost_relative", "1 = much lower price", "5 = much higher price",
          "Procurement price for hourly-matched, deliverable EACs/PPAs. 3 is "
          "anchored to the respondent's current sourcing strategy."),

    142: ("impact_magnitude", "1 = no material impact", "5 = high material impact",
          "Magnitude of IFRS/GAAP financial-reporting impact. Not a support scale."),
    179: ("impact_magnitude", "1 = no material implications", "5 = high material implications",
          "Magnitude of implications for climate-related financial risk disclosure "
          "users. Not a support scale."),

    62: ("effort_labeled", "1 - Minimal effort", "5 - High effort",
         "Incremental preparer cost/effort for the LBM revisions. "
         "'Not applicable (not a preparer)' is off-scale and left null."),
    118: ("readiness_labeled", "1 - Far from ready", "5 - Largely ready",
          "Registry/data-provider readiness to publish residual mix factors. "
          "'Insufficient basis to assess' is off-scale and left null."),
    130: ("sufficiency_labeled", "1 - Insufficient", "5 - Highly sufficient",
          "Whether the proposed feasibility measures are sufficient. "
          "'No basis to assess' is off-scale and left null."),
}

# Options that carry no scale position and must not be coerced to a number.
OFF_SCALE = {
    "not applicable", "not applicable (not a preparer)", "n/a", "na",
    "unsure", "unknown", "insufficient basis to assess", "no basis to assess",
    "not sure / no basis to assess", "prefer not to say", "no opinion",
    "don't know", "dont know",
}


# ---------------------------------------------------------------------------
# Ordinal (non-Likert) option ladders
# ---------------------------------------------------------------------------
# Ordered categoricals whose options imply a rank. Keyed by a normalised option
# string; value is the rank. Options absent from a ladder get a null rank.
SHARE_BANDS = {
    "0%": 0, "1-25%": 1, "26-50%": 2, "51-75%": 3, "76-100%": 4,
}
IMPROVEMENT = {
    "no meaningful improvement (unlikely to change decisions/interpretations)": 0,
    "no meaningful improvement (unlikely to change comparability/interpretations)": 0,
    "minor improvement (noticeable but unlikely to change decisions)": 1,
    "minor improvement (noticeable but unlikely to change comparability)": 1,
    "moderate improvement (could change some decisions/assessments)": 2,
    "moderate improvement (could change some comparability/assessments)": 2,
    "substantial improvement (likely to change decisions benchmarks)": 3,
    "substantial improvement (likely to change comparability benchmarks)": 3,
}
LEAD_TIME = {
    "<12 months": 1, "12-24 months": 2, "24-36 months": 3, ">36 months": 4,
}
READY_YEAR = {
    "earlier than reporting year 2027 (already aligned)": 0,
    "reporting year 2027 (inventory prepared in 2028)": 1,
    "reporting year 2028 (inventory prepared in 2029)": 2,
    "reporting year 2029 (inventory prepared in 2030)": 3,
    "reporting year 2030 (inventory prepared in 2031) or later": 4,
    "later than reporting year 2030": 5,
}
GWH_THRESHOLD = {"5 gwhs": 1, "10 gwhs": 2, "50 gwhs": 3}

# qnum -> ladder
ORDINAL_LADDERS = {
    52: IMPROVEMENT, 54: IMPROVEMENT, 134: IMPROVEMENT, 136: IMPROVEMENT,
    57: SHARE_BANDS, 59: SHARE_BANDS, 77: SHARE_BANDS,
    120: LEAD_TIME, 121: LEAD_TIME,
    67: READY_YEAR,
    70: GWH_THRESHOLD,
}

# Per-question caveats worth surfacing next to the data.
NOTES = {
    4: "Free-text name. Populated only for respondents who did not request redaction.",
    5: "Free-text organisational affiliation; not a controlled vocabulary. Some "
       "respondents pasted long descriptions rather than an organisation name.",
    67: "Options 'Reporting year 2030 (inventory prepared in 2031) or later' and "
        "'Later than Reporting year 2030' overlap; ranks 4 and 5 are assigned in "
        "that order but the distinction is ambiguous as worded.",
    70: "Asked of all respondents, ahead of the exemption design questions in "
        "section 25; question 159 asks respondents to revisit this choice.",
    118: "Two responses were stored as JSON-ish literals (e.g. '[\"4 - Mostly ready\"]') "
         "and are normalised to the plain option label.",
    159: "References the threshold chosen in question 70.",
    183: "Free-text year entry, not a picklist. Values above 2050 (including 2099) "
         "appear to be protest or sentinel answers rather than genuine dates.",
}

# Standard "escape" choices that this survey offers on picklists. They can be
# selected by very few respondents and would otherwise fall below the frequency
# cutoff used to tell offered options apart from typed-in write-ins. Matched
# case-insensitively against a whole selection.
#
# Deliberately excluded: "None", "N/A", "NA". Those appear in the write-in tail of
# questions 63, 140 and 174 as dismissals respondents typed into an "Other" box,
# and are indistinguishable from an offered option by string alone. They are left
# classified as write-ins; `question_options.is_canonical` is the flag to revisit
# if you disagree.
STANDARD_OPTIONS = {
    "prefer not to say",
    "none of the above",
    "none of the above (please explain)",
    "unsure",
    "not applicable",
    "no basis to assess",
    "insufficient basis to assess",
}
