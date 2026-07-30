#!/usr/bin/env python3
"""Acceptance tests for reference/org_audit.csv (P20 organization legitimacy audit).

Stdlib only (no pytest, no pandas, no sqlite3 CLI). Run from the repo root:

    python3 scripts/analytics/test_org_audit.py

Exits 0 when every check passes, 1 otherwise, printing one line per check.

Remember that SQLite columns in this dataset are TEXT-typed: `is_redacted` must be
compared as `is_redacted+0`, never summed directly.
"""
import csv
import os
import sqlite3
import sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AUDIT = os.path.join(REPO, 'reference', 'org_audit.csv')
DB = os.path.join(REPO, 'data', 'scope2_consultation.sqlite')

FIELDS = ['respondent_id', 'organization_verbatim', 'claimed',
          'audited_class', 'confidence', 'basis']

# Closed vocabulary — PLAN.md section 6. Nothing outside this list may appear.
VOCABULARY = {
    'academic_institution', 'think_tank', 'ngo_civil_society', 'trade_association',
    'business_coalition', 'company', 'consultancy', 'data_vendor', 'financial',
    'government', 'registry_operator', 'standards_body', 'individual',
    'unverifiable', 'placeholder',
}
CONFIDENCES = {'high', 'medium', 'low'}

# Classes that mean "this is a trade, business or professional membership body".
TRADE_OR_BUSINESS = {'trade_association', 'business_coalition'}

CLAIMED_NGO = 'Non-profit organization/NGO/civil society'
CLAIMED_ACADEMIA = 'Academia/research'

# Spot fixtures: rows whose classification the audit must not silently drift on.
# Each entry is (respondent_id, organization substring, expected audited_class).
SPOT_FIXTURES = [
    (977, 'EnergyTag', 'standards_body'),       # UK 'Ltd' that publishes the hourly-certificate standard
    (498, 'Breakthrough Institute', 'think_tank'),
    (527, 'Baker Hughes', 'company'),           # filed as "Industry group"
    (854, 'University of Edinburgh', 'academic_institution'),
    (830, 'WBCSD', 'business_coalition'),
    (924, 'ABRACE', 'trade_association'),       # "only its member companies do"
    (1108, 'Aquilo Energy GmbH', 'company'),    # filed as "Academia/research"
    (1094, 'University of California', 'academic_institution'),  # filed as "Government institution"
    (989, 'WattTime', 'data_vendor'),
    (1086, 'energy economist', 'individual'),   # a pasted CV, filed as "Academia/research"
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


def main():
    with open(AUDIT, newline='', encoding='utf-8') as fh:
        reader = csv.DictReader(fh)
        header = reader.fieldnames
        rows = list(reader)

    con = sqlite3.connect(DB)
    named = {r[0] for r in con.execute(
        'select respondent_id from respondents where is_redacted+0 = 0')}
    redacted = {r[0] for r in con.execute(
        'select respondent_id from respondents where is_redacted+0 = 1')}
    claimed_db = {r[0]: r[1] for r in con.execute(
        'select respondent_id, organization_type from respondents where is_redacted+0 = 0')}
    con.close()

    print('reference/org_audit.csv: %d rows, %d named respondents in db' % (len(rows), len(named)))

    # --- structure -------------------------------------------------------
    check(header == FIELDS, 'header is exactly %s' % FIELDS, repr(header))

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
    empty_org = [r['respondent_id'] for r in rows if not r['organization_verbatim'].strip()]
    check(not empty_org, 'every row has a non-empty organization_verbatim',
          'empty: %s' % empty_org[:12])

    # --- claimed matches the database -----------------------------------
    mismatched = [r['respondent_id'] for r in rows
                  if r['claimed'] != claimed_db[int(r['respondent_id'])]]
    check(not mismatched, "claimed reproduces respondents.organization_type verbatim",
          'mismatched: %s' % mismatched[:12])

    # --- the headline findings PLAN.md section 3.6 predicts --------------
    ngo = [r for r in rows if r['claimed'] == CLAIMED_NGO]
    ngo_reclass = [r for r in ngo if r['audited_class'] in TRADE_OR_BUSINESS]
    check(len(ngo_reclass) >= 20,
          'at least 20 self-declared NGOs audited as trade/business bodies',
          'only %d of %d' % (len(ngo_reclass), len(ngo)))

    academia = [r for r in rows if r['claimed'] == CLAIMED_ACADEMIA]
    acad_reclass = [r for r in academia if r['audited_class'] != 'academic_institution']
    check(len(acad_reclass) >= 8,
          'at least 8 self-declared academics audited as non-academic',
          'only %d of %d' % (len(acad_reclass), len(academia)))

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

    print('\n%d checks, %d failures' % (checks, len(failures)))
    if failures:
        for f in failures:
            print('  - %s' % f)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
