# Stance codebook: additionality / incrementality (GHG Protocol Scope 2 consultation)

Context: the GHG Protocol proposed revising the market-based method (MBM) for Scope 2 — hourly matching, deliverability (market boundaries), legacy clause, etc. The survey never asked about additionality directly; every mention is unprompted. You are coding each RESPONDENT's stance toward the CONCEPT of additionality / incrementality (does procurement cause NEW clean generation / emission reductions that would not otherwise happen), NOT their stance on hourly matching.

Key trap: many respondents oppose hourly matching AND argue additionality matters ("annual PPAs drive more additional capacity than 24/7 does"). That respondent SUPPORTS additionality as a value. Conversely some argue "additionality is a project-accounting / consequential concept and has no place in an attributional inventory" — that is OPPOSE.

For each respondent, code each concept they mention (concepts field: A = additionality wording, I = incrementality wording). If a concept was not mentioned, code it `na`.

stance values:
- support   — treats additionality/incrementality as something that matters and that Scope 2 accounting / procurement claims should require, reward, recognise, incentivise, or be judged against (incl. criticising a proposal for failing to deliver additionality, or saying their own procurement is valuable because it is additional).
- oppose    — says it should NOT be a requirement/criterion of Scope 2 inventory, is irrelevant/inappropriate for attributional accounting, is unmeasurable/unworkable as a test, or that the GHGP should not pursue it.
- mixed     — clearly both (e.g. values it but explicitly says it must not be in the inventory; code that `mixed` and set venue=separate).
- neutral   — mentions it descriptively, cites others, asks a question, or passing reference with no evaluable stance.


Also record: confidence (high/medium/low); quote = ≤25 words verbatim from the snippet that best justifies the stance.

Judge from the respondent's own voice. Be conservative: if unclear, use neutral with low confidence rather than guessing. Do not infer stance from organisation type.

## Provenance

Applied once to all 269 respondents matched by `scripts/analytics/additionality.py`
(passages of ±500 characters around each match), in six batches, by AI coders reading
each respondent's passages; output in `data/derived/additionality_stance.csv`. A
`venue` field (inventory vs separate disclosure) was also coded but dropped: identical
sentences received different venue codes, so it was not reliable. Spot-checked by
hand: all 13 `oppose` respondents and a random 13 `support`/`mixed`. No second-coder
agreement statistic was computed.
