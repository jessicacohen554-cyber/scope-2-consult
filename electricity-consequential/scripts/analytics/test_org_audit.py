#!/usr/bin/env python3
"""Acceptance tests for the P20 curation files.

    reference/org_audit.csv   — audited organizational class for every named respondent
    reference/exclusions.csv  — the adjudicated analytical-base ruling (185 -> 180)

Stdlib only (no pytest, no pandas, no sqlite3 CLI). Run from the repo root:

    python3 electricity-consequential/scripts/analytics/test_org_audit.py

Exits 0 when every check passes, 1 otherwise, printing one line per check.

Remember that SQLite columns in this dataset are TEXT-typed: `is_redacted` must be
compared as `is_redacted+0`, never summed directly.
"""
import csv
import os
import re
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
HUB = os.path.dirname(os.path.dirname(HERE))          # electricity-consequential/
AUDIT = os.path.join(HUB, 'reference', 'org_audit.csv')
EXCLUSIONS = os.path.join(HUB, 'reference', 'exclusions.csv')
DB = os.path.join(HUB, 'data', 'electricity_consequential.sqlite')

AUDIT_FIELDS = ['respondent_id', 'organization_verbatim', 'claimed',
                'audited_class', 'confidence', 'basis']
EXCLUSION_FIELDS = ['respondent_id', 'exclusion_reason', 'evidence']

# Closed vocabulary — PLAN.md section 6 (Scope 2's 15 values + `test_junk`).
VOCABULARY = {
    'academic_institution', 'think_tank', 'ngo_civil_society', 'trade_association',
    'business_coalition', 'company', 'consultancy', 'data_vendor', 'financial',
    'government', 'registry_operator', 'standards_body', 'individual',
    'unverifiable', 'placeholder', 'test_junk',
}
CONFIDENCES = {'high', 'medium', 'low'}
EXCLUSION_REASONS = {'junk', 'superseded'}

# Classes that mean "this is a trade, business or professional membership body".
TRADE_OR_BUSINESS = {'trade_association', 'business_coalition'}

CLAIMED_NGO = 'Non-profit organization/NGO/civil society'
CLAIMED_CONSULTANT = 'Consultant supporting organizations with GHG inventories/strategies'

# The adjudicated analytical base. {11, 12, 14} junk and {100} superseded are the
# provisional set PLAN.md section 3.5 predicted; 31 is this audit's deviation — a
# redacted respondent whose six free-text answers are all runs of the letter 'a'.
EXPECTED_JUNK = {11, 12, 14, 31}
EXPECTED_SUPERSEDED = {100}
RESUBMISSION_KEPT = 151
ANALYTICAL_BASE = 180

# Spot fixtures: rows whose classification the audit must not silently drift on.
# Each entry is (respondent_id, organization substring, expected audited_class).
SPOT_FIXTURES = [
    (3, 'Conversio Pty Ltd', 'consultancy'),        # states it prepares client responses
    (27, 'External Reporting Board (XRB)', 'standards_body'),   # filed as "Other"
    (89, 'SEMI', 'trade_association'),              # filed as "Industry group"
    (77, 'Ever.green', 'company'),                  # filed as "Consultant"
    (154, 'Clean Energy Buyers Association', 'business_coalition'),
    (131, 'Winrock International', 'ngo_civil_society'),   # filed as "Consultant"; Q11 says NGO
    (133, 'Environmental Resources Trust', 'registry_operator'),  # filed as NGO; runs ACR/ART
    (183, 'ABIAPE', 'trade_association'),           # filed as "Consultant"
    (185, 'energy economist', 'individual'),        # a pasted CV, filed as "Academia/research"
    (155, 'N/A', 'think_tank'),                     # EPRI; org field is a placeholder
    (11, 'fgnzn', 'test_junk'),
    (14, 'asdf', 'test_junk'),
    (46, 'University of Edinburgh', 'academic_institution'),
    (168, 'EnergyTag Ltd', 'standards_body'),       # 'Ltd' filed as NGO
    (149, 'WattTime', 'data_vendor'),               # filed as NGO
]

failures = []
checks = 0


def check(ok, label, detail=''):
    global checks
    checks += 1
    if ok:
        print('  ok   %s' % label)
    else:
        print('  FAIL %s%s' % (label, (' — ' + detail) if detail else ''))
        failures.append(label)


def norm_ws(s):
    return re.sub(r'\s+', ' ', s or '').strip()


def is_substantive(text):
    """True when a free-text answer reads as prose rather than filler or mash."""
    t = (text or '').strip()
    if len(t) < 20 or re.match(r'^\s*(n/?a|none)\.?\s*$', t, re.I):
        return False
    words = {w.lower() for w in re.findall(r'[A-Za-z]{3,}', t)}
    if len(words) < 4:
        return False
    letters = re.sub(r'[^A-Za-z]', '', t)
    vowels = sum(1 for c in letters.lower() if c in 'aeiouy')
    return bool(letters) and vowels / len(letters) >= 0.2


def main():
    with open(AUDIT, newline='', encoding='utf-8') as fh:
        reader = csv.DictReader(fh)
        audit_header = reader.fieldnames
        rows = list(reader)

    with open(EXCLUSIONS, newline='', encoding='utf-8') as fh:
        reader = csv.DictReader(fh)
        excl_header = reader.fieldnames
        excl = list(reader)

    con = sqlite3.connect(DB)
    named = {r[0] for r in con.execute(
        'select respondent_id from respondents where is_redacted+0 = 0')}
    redacted = {r[0] for r in con.execute(
        'select respondent_id from respondents where is_redacted+0 = 1')}
    org_db = {r[0]: r[1] for r in con.execute(
        'select respondent_id, organization from respondents where is_redacted+0 = 0')}
    claimed_db = {r[0]: r[1] for r in con.execute(
        'select respondent_id, organization_type from respondents where is_redacted+0 = 0')}
    n_respondents = con.execute('select count(*) from respondents').fetchone()[0]
    # Every free-text answer of each excluded-as-junk respondent, for the evidence checks.
    junk_text = {}
    for rid in EXPECTED_JUNK:
        junk_text[rid] = [t for (t,) in con.execute(
            "select r.answer_text from responses r join questions q using(question_id) "
            "where r.respondent_id = ? and q.question_type = 'free_text'", (rid,))]
    resub_cells = {}
    for rid in (100, RESUBMISSION_KEPT):
        resub_cells[rid] = {q: t for q, t in con.execute(
            'select question_id, answer_text from responses where respondent_id = ?', (rid,))}
    con.close()

    print('reference/org_audit.csv: %d rows, %d named respondents in db' % (len(rows), len(named)))
    print('reference/exclusions.csv: %d rows, %d respondents in db\n' % (len(excl), n_respondents))

    # === org_audit.csv ===================================================
    print('org_audit.csv')

    # --- structure -------------------------------------------------------
    check(audit_header == AUDIT_FIELDS, 'header is exactly %s' % AUDIT_FIELDS, repr(audit_header))

    ids = [r['respondent_id'] for r in rows]
    check(all(i.isdigit() for i in ids), 'every respondent_id is an integer')
    audit_ids = [int(i) for i in ids]
    check(len(set(audit_ids)) == len(audit_ids), 'no duplicate respondent_id rows')
    check(audit_ids == sorted(audit_ids), 'rows are sorted by respondent_id')

    # --- coverage --------------------------------------------------------
    missing = sorted(named - set(audit_ids))
    check(not missing, 'all %d named respondents are present' % len(named),
          'missing %s' % missing[:12])
    check(len(rows) == len(named), 'row count equals the named-respondent count',
          '%d != %d' % (len(rows), len(named)))

    # --- redaction guard -------------------------------------------------
    leaked = sorted(set(audit_ids) & redacted)
    check(not leaked, 'no redacted respondent appears', 'leaked %s' % leaked[:12])
    unknown = sorted(set(audit_ids) - named - redacted)
    check(not unknown, 'no unknown respondent_id', 'unknown %s' % unknown[:12])

    # --- closed vocabulary ----------------------------------------------
    bad_class = sorted({r['audited_class'] for r in rows} - VOCABULARY)
    check(not bad_class, 'audited_class stays inside the closed vocabulary',
          'out of vocab: %s' % bad_class)
    bad_conf = sorted({r['confidence'] for r in rows} - CONFIDENCES)
    check(not bad_conf, 'confidence is high/medium/low', 'bad: %s' % bad_conf)

    # --- basis field (this feeds a public-facing table) ------------------
    long_basis = [r['respondent_id'] for r in rows if len(r['basis']) > 200]
    check(not long_basis, 'every basis is <= 200 chars', 'too long: %s' % long_basis[:12])
    empty_basis = [r['respondent_id'] for r in rows if not r['basis'].strip()]
    check(not empty_basis, 'every row has a non-empty basis', 'empty: %s' % empty_basis[:12])
    unwrapped = [r['respondent_id'] for r in rows if norm_ws(r['basis']) != r['basis']]
    check(not unwrapped, 'basis strings are single-line and whitespace-normalized',
          'ragged: %s' % unwrapped[:12])
    empty_org = [r['respondent_id'] for r in rows if not r['organization_verbatim'].strip()]
    check(not empty_org, 'every row has a non-empty organization_verbatim',
          'empty: %s' % empty_org[:12])

    # --- the profile columns reproduce the database ----------------------
    mismatched = [r['respondent_id'] for r in rows
                  if r['claimed'] != claimed_db[int(r['respondent_id'])]]
    check(not mismatched, 'claimed reproduces respondents.organization_type verbatim',
          'mismatched: %s' % mismatched[:12])
    org_drift = [r['respondent_id'] for r in rows
                 if r['organization_verbatim'] != norm_ws(org_db[int(r['respondent_id'])])]
    check(not org_drift,
          'organization_verbatim reproduces respondents.organization (newlines collapsed)',
          'drifted: %s' % org_drift[:12])

    # --- the reclassification patterns PLAN.md section 6 predicts --------
    ngo = [r for r in rows if r['claimed'] == CLAIMED_NGO]
    ngo_reclass = [r for r in ngo if r['audited_class'] in TRADE_OR_BUSINESS]
    check(len(ngo_reclass) >= 5,
          'at least 5 self-declared NGOs audited as trade/business bodies',
          'only %d of %d' % (len(ngo_reclass), len(ngo)))
    ngo_moved = [r for r in ngo if r['audited_class'] != 'ngo_civil_society']
    check(len(ngo_moved) >= 10,
          'at least 10 self-declared NGOs audited as something other than an NGO',
          'only %d of %d' % (len(ngo_moved), len(ngo)))

    consultants = [r for r in rows if r['claimed'] == CLAIMED_CONSULTANT]
    cons_reclass = [r for r in consultants if r['audited_class'] != 'consultancy']
    check(len(cons_reclass) >= 5,
          'at least 5 self-declared consultants audited as something else',
          'only %d of %d' % (len(cons_reclass), len(consultants)))

    # Junk respondents are named, so they must carry the test_junk class here and
    # must be the only rows that do.
    junk_rows = {int(r['respondent_id']) for r in rows if r['audited_class'] == 'test_junk'}
    check(junk_rows == (EXPECTED_JUNK & named),
          'test_junk rows are exactly the named junk respondents %s' % sorted(EXPECTED_JUNK & named),
          'got %s' % sorted(junk_rows))

    # --- spot fixtures ---------------------------------------------------
    by_id = {int(r['respondent_id']): r for r in rows}
    for rid, org_substr, expected in SPOT_FIXTURES:
        row = by_id.get(rid)
        if row is None:
            check(False, 'fixture %d (%s)' % (rid, org_substr), 'row absent')
            continue
        ok = (org_substr.lower() in row['organization_verbatim'].lower()
              and row['audited_class'] == expected)
        check(ok, 'fixture %d %s -> %s' % (rid, org_substr, expected),
              'got organization=%r audited_class=%r'
              % (row['organization_verbatim'][:60], row['audited_class']))

    # === exclusions.csv ==================================================
    print('\nexclusions.csv')

    check(excl_header == EXCLUSION_FIELDS,
          'header is exactly %s' % EXCLUSION_FIELDS, repr(excl_header))

    excl_ids_raw = [r['respondent_id'] for r in excl]
    check(all(i.isdigit() for i in excl_ids_raw), 'every respondent_id is an integer')
    excl_ids = [int(i) for i in excl_ids_raw]
    check(len(set(excl_ids)) == len(excl_ids), 'no duplicate respondent_id rows')
    check(excl_ids == sorted(excl_ids), 'rows are sorted by respondent_id')

    all_ids = named | redacted
    check(not (set(excl_ids) - all_ids), 'every excluded id exists in the dataset',
          'unknown %s' % sorted(set(excl_ids) - all_ids))

    bad_reason = sorted({r['exclusion_reason'] for r in excl} - EXCLUSION_REASONS)
    check(not bad_reason, 'exclusion_reason is junk/superseded', 'bad: %s' % bad_reason)

    empty_ev = [r['respondent_id'] for r in excl if not r['evidence'].strip()]
    check(not empty_ev, 'every row has non-empty evidence', 'empty: %s' % empty_ev[:12])
    ragged_ev = [r['respondent_id'] for r in excl if norm_ws(r['evidence']) != r['evidence']]
    check(not ragged_ev, 'evidence strings are single-line and whitespace-normalized',
          'ragged: %s' % ragged_ev[:12])

    junk = {int(r['respondent_id']) for r in excl if r['exclusion_reason'] == 'junk'}
    superseded = {int(r['respondent_id']) for r in excl if r['exclusion_reason'] == 'superseded'}
    check(junk == EXPECTED_JUNK, 'junk ruling is %s' % sorted(EXPECTED_JUNK),
          'got %s' % sorted(junk))
    check(superseded == EXPECTED_SUPERSEDED,
          'superseded ruling is %s' % sorted(EXPECTED_SUPERSEDED), 'got %s' % sorted(superseded))
    check(RESUBMISSION_KEPT not in (junk | superseded),
          'the kept resubmission (ID %d) is not excluded' % RESUBMISSION_KEPT)
    check(n_respondents - len(excl) == ANALYTICAL_BASE,
          'analytical base is %d (%d raw - %d excluded)'
          % (ANALYTICAL_BASE, n_respondents, len(excl)),
          'got %d' % (n_respondents - len(excl)))

    # --- the evidence has to actually hold in the database ---------------
    for rid in sorted(EXPECTED_JUNK):
        texts = [t for t in junk_text[rid] if (t or '').strip()]
        # A junk row has no free-text answer that is both long enough and word-like:
        # real prose carries several distinct 3+ letter words and a normal vowel share,
        # which repeated-token mash ('asdf. asdf asdfasdfasdf ...') never does.
        substantive = [t for t in texts if is_substantive(t)]
        check(texts and not substantive,
              'junk %d: all %d free-text answers are non-substantive' % (rid, len(texts)),
              'substantive answers present: %r' % [t[:40] for t in substantive[:3]])

    # ID 12 and ID 31 are redacted: they may only be adjudicated on answer content.
    for rid in sorted(EXPECTED_JUNK & redacted):
        row = next(r for r in excl if int(r['respondent_id']) == rid)
        check('redacted' in row['evidence'].lower() and 'answer content' in row['evidence'].lower(),
              'redacted junk %d: evidence states it was adjudicated on answer content alone' % rid,
              row['evidence'][:120])
    check(not (EXPECTED_JUNK & redacted) - {12, 31},
          'the only redacted junk respondents are 12 and 31',
          'also %s' % sorted((EXPECTED_JUNK & redacted) - {12, 31}))

    # The superseded ruling: 151 must answer every question 100 answered.
    a, b = resub_cells[100], resub_cells[RESUBMISSION_KEPT]
    check(set(a) <= set(b),
          'ID %d answers every question ID 100 answered' % RESUBMISSION_KEPT,
          'only in 100: %s' % sorted(set(a) - set(b)))
    check(len(b) > len(a),
          'ID %d is the fuller submission (%d cells vs %d)' % (RESUBMISSION_KEPT, len(b), len(a)))

    print('\n%d checks, %d failures' % (checks, len(failures)))
    if failures:
        for f in failures:
            print('  - %s' % f)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
