// ============================================================================
// integrity-page.js — Integrity & evidence (P34)
// ============================================================================
// Page module for integrity.html. Reads meta.json, integrity.json,
// respondents.json and stances.json through ECData and renders the eight
// panels PLAN.md §4 specifies for this page.
//
// House rules this file obeys:
//   * Every number on the page comes from the exported JSON, never from the
//     provisional digest in PLAN.md §3 — with one deliberate, documented
//     exception: the cross-consultation match list below, which P22 does not
//     export and which this session computed once against both databases.
//   * Stance strips, the only shared `.ec-*` components used here, are drawn
//     by ECStance. This file never hand-writes their markup. Everything else
//     on the page is page-local `.ig-*` layout owned by integrity.html.
//   * Facts, not accusations. Coordination is described, never characterized.
//     Redacted respondents are counted, never guessed at. The junk rows are
//     data-quality records.
// ============================================================================

(function() {
    'use strict';

    var esc = function(s) {
        return String(s === null || s === undefined ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    };

    function el(id) { return document.getElementById(id); }

    function pct1(part, base) {
        if (!base) return 0;
        return Math.round((part / base) * 1000 + 1e-9) / 10;
    }

    function fmtPct(v) { return (Math.round(v * 10) / 10).toFixed(1) + '%'; }

    function fmtSigned(v) {
        var r = Math.round(v * 10) / 10;
        return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toFixed(1);
    }

    function num(v) {
        return typeof v === 'number' && isFinite(v) ? v.toLocaleString('en-US') : '0';
    }

    function clip(s, n) {
        s = String(s === null || s === undefined ? '' : s);
        return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s;
    }

    function plural(n, one, many) {
        return n === 1 ? one : (many || one + 's');
    }

    // A cell is the SCELL grammar from PLAN §5; ECStance owns the readers.
    function baseOf(cell) {
        return (window.ECStance && ECStance.baseOf(cell)) ||
            (cell && typeof cell.n === 'number' ? cell.n : 0);
    }

    function empty(host, text) {
        if (host) {
            host.innerHTML = '<div class="card ec-empty">' + esc(text) + '</div>';
        }
    }

    // ========================================================================
    // CROSS-CONSULTATION MATCHES (static — not part of the P22 export)
    // ========================================================================
    // P34's guardrail: the cross-consultation join is run once, by hand,
    // read-only against BOTH databases, and its result is inlined here so the
    // page needs no second data source at runtime. The exact recipe, preserved
    // for reproducibility:
    //
    //   Databases (both opened `mode=ro`, neither modified):
    //     A = data/scope2_consultation.sqlite                      (repo root)
    //     B = electricity-consequential/data/electricity_consequential.sqlite
    //
    //   Row source, run against each database:
    //     SELECT respondent_id, name, organization, country, organization_type,
    //            is_redacted, n_free_text_answers, free_text_chars
    //       FROM respondents
    //      WHERE COALESCE(organization, '') <> '';
    //
    //   Filters applied in Python after the query:
    //     1. BOTH-NAMED RULE — drop every row with is_redacted <> 0 on either
    //        side. `is_redacted` is TEXT-typed in the Scope 2 database
    //        (PLAN gotcha 2), so the comparison casts: int(value or 0) != 0.
    //        A respondent redacted in either consultation is never matched and
    //        never listed; only the counts below acknowledge them.
    //     2. Drop B's non-analytical rows — the adjudicated exclusion set
    //        {11, 12, 14, 31, 100} from reference/exclusions.csv.
    //     3. Drop placeholder organization fields ("None", "N/A", "n/a",
    //        "anonymous", …). A shared placeholder is not a shared filer.
    //
    //   Normalized join key, applied to `organization` on both sides:
    //     strip CJK/Hangul runs (bilingual duplicates of the same name) →
    //     strip diacritics (NFKD) → drop parenthetical aliases → lowercase →
    //     drop a leading job title or department clause → cut at "on behalf
    //     of …" → collapse to [a-z0-9 ] → drop legal-form tokens
    //     (inc/ltd/llc/gmbh/plc/corp/co/pty/ag/sa/nv/bv/ab/oy/kk/group/
    //     holdings/international/…) and a leading "the" → join on single
    //     spaces. Keys shorter than 3 characters are dropped.
    //
    //   Match tiers:
    //     exact   — normalized keys identical (86 of the 89 rows below).
    //     variant — one side's key is a strict token subset of the other
    //               because that side appended a self-description or spelled
    //               out an acronym. Three pairs, each adjudicated by hand:
    //               EC 15 ↔ S2 88, EC 69 ↔ S2 467, EC 83 ↔ S2 605.
    //               Rejected at this tier: EC 107, whose free-text
    //               "organization" shares only the generic tokens "renewable
    //               energy" / "climate" with unrelated Scope 2 filers.
    //
    //   `org` is a display label. Ten of these organization fields hold a
    //   self-description, a job title or a bilingual duplicate rather than a
    //   name; for those the label was set by hand (South Pole, Ipieca, CEBA,
    //   EEI, XRB, ABEEolica, ABIAPE, TimberRock, Taiwan Digital
    //   Sustainability, and one individual filer). The join key is untouched.
    //
    //   `person: true` means the `name` field also matches once titles and
    //   punctuation are normalized — the same individual filed both, not just
    //   the same organization. `chars` is the respondent's free-text volume in
    //   this consultation, and the list is sorted by it.
    //
    // Reproduced 2026-08-05 against the databases committed on this branch.
    var CROSS = {
        // Denominators for the honest framing. All read from the same two
        // databases with the same filters.
        ec_base: 180,            // analytical base (185 raw − 4 junk − 1 superseded)
        ec_named: 105,           // named respondents in the analytical base
        ec_named_with_org: 102,  // …of those, with an organization field that is not a placeholder
        ec_redacted: 75,         // never matchable, in either direction
        s2_total: 1072,
        s2_named: 499,
        s2_redacted: 573,
        rows: [
        { org: "The NorthBridge Group", ec: 96, s2: [397], type: "Consultant", country: "US", chars: 75659, person: true },
        { org: "Tierra Climate Inc", ec: 41, s2: [247], type: "Data/analytics", country: "US", chars: 36997, person: true },
        { org: "Evergreen Renewables Inc (Ever.green)", ec: 77, s2: [517], type: "Consultant", country: "US", chars: 34010, person: true },
        { org: "Conversio Pty Ltd", ec: 3, s2: [17], type: "Consultant", country: "Australia", chars: 31615, person: true },
        { org: "The Federation of Electric Power Companies", ec: 81, s2: [544], type: "Industry group", country: "Japan", chars: 29843, person: true },
        { org: "WattTime", ec: 149, s2: [989], type: "NGO", country: "US", chars: 24590, person: false },
        { org: "TimberRock Consulting LLC", ec: 48, s2: [327], type: "Data/analytics", country: "US", chars: 24153, person: true },
        { org: "Taiwan Digital Sustainability International", ec: 13, s2: [254], type: "Consultant", country: "Taiwan", chars: 19799, person: true },
        { org: "REsurety", ec: 179, s2: [1026], type: "Data/analytics", country: "US", chars: 14795, person: true },
        { org: "Low Impact Hydropower Institute", ec: 56, s2: [402], type: "NGO", country: "US", chars: 14264, person: true },
        { org: "Clean Air Task Force", ec: 177, s2: [998], type: "NGO", country: "US", chars: 14091, person: true },
        { org: "Sustainability Roundtable Inc", ec: 39, s2: [235], type: "Consultant", country: "US", chars: 14044, person: true },
        { org: "Zettawatts", ec: 15, s2: [88], type: "Other", country: "US", chars: 12014, person: true, variant: true },
        { org: "South Pole", ec: 191, s2: [1126], type: "Consultant", country: "Sweden", chars: 11930, person: true },
        { org: "Clean Energy Buyers Association (CEBA)", ec: 154, s2: [907], type: "Other", country: "US", chars: 11487, person: true },
        { org: "3Degrees", ec: 192, s2: [1118], type: "Other", country: "US", chars: 11456, person: true },
        { org: "Singularity Energy", ec: 190, s2: [1110], type: "Data/analytics", country: "US", chars: 11443, person: true },
        { org: "Environmental Markets Association", ec: 153, s2: [926], type: "Industry group", country: "US", chars: 11353, person: true },
        { org: "ACORE", ec: 159, s2: [959], type: "NGO", country: "US", chars: 11006, person: true },
        { org: "Electricity Maps", ec: 92, s2: [276], type: "Company", country: "Denmark", chars: 10972, person: true },
        { org: "Winrock International", ec: 131, s2: [823], type: "Consultant", country: "US", chars: 10696, person: true },
        { org: "University of Edinburgh", ec: 46, s2: [248, 854], type: "Academia", country: "UK", chars: 9482, person: true },
        { org: "Edison Electric Institute (EEI)", ec: 172, s2: [995], type: "Industry group", country: "US", chars: 8792, person: true },
        { org: "Engie Impact", ec: 135, s2: [935], type: "Consultant", country: "UK", chars: 8684, person: false },
        { org: "Smart Freight Centre", ec: 120, s2: [809], type: "NGO", country: "Netherlands", chars: 8413, person: false },
        { org: "Green Strategies", ec: 158, s2: [972], type: "Consultant", country: "US", chars: 8107, person: true },
        { org: "Second Nature", ec: 143, s2: [821], type: "NGO", country: "US", chars: 8046, person: true },
        { org: "Rivian Automotive", ec: 102, s2: [646], type: "Company", country: "US", chars: 8045, person: true },
        { org: "Sphera", ec: 72, s2: [377], type: "Consultant", country: "Germany", chars: 7833, person: true },
        { org: "au Energy Holdings Corporation", ec: 108, s2: [709], type: "Energy supplier", country: "Japan", chars: 7158, person: true },
        { org: "KDDI CORPORATION", ec: 109, s2: [667], type: "Company", country: "Japan", chars: 7145, person: true },
        { org: "Kanin Energy, Inc", ec: 148, s2: [981], type: "Company", country: "US", chars: 6933, person: true },
        { org: "NZ External Reporting Board (XRB)", ec: 27, s2: [151], type: "Other", country: "New Zealand", chars: 6539, person: true },
        { org: "Center for Resource Solutions (CRS)", ec: 35, s2: [225], type: "NGO", country: "US", chars: 6358, person: true },
        { org: "Energy Peace Partners", ec: 18, s2: [95], type: "NGO", country: "US", chars: 5771, person: true },
        { org: "American Biogas Council", ec: 152, s2: [916], type: "NGO", country: "US", chars: 5390, person: true },
        { org: "SEMI", ec: 89, s2: [603], type: "Industry group", country: "Singapore", chars: 5354, person: true },
        { org: "EnergyTag Ltd", ec: 168, s2: [977], type: "NGO", country: "UK", chars: 5317, person: true },
        { org: "Boston University", ec: 136, s2: [874], type: "Academia", country: "US", chars: 5226, person: true },
        { org: "ABEEolica (Brazilian wind energy assoc.)", ec: 119, s2: [777], type: "NGO", country: "Brazil", chars: 5170, person: true },
        { org: "Google, LLC", ec: 147, s2: [634], type: "Company", country: "US", chars: 5125, person: false },
        { org: "Fundación Natura", ec: 198, s2: [1125], type: "NGO", country: "Colombia", chars: 5113, person: false },
        { org: "RENOVA, Inc", ec: 58, s2: [411], type: "Energy supplier", country: "Japan", chars: 5111, person: true },
        { org: "Ipieca", ec: 126, s2: [906], type: "Industry group", country: "UK", chars: 5013, person: true },
        { org: "Robert Letzler — individual filer", ec: 185, s2: [1086], type: "Academia", country: "US", chars: 4754, person: true },
        { org: "Engie Impact", ec: 160, s2: [935], type: "Consultant", country: "US", chars: 4636, person: true },
        { org: "WSP", ec: 94, s2: [628], type: "Consultant", country: "US", chars: 4590, person: false },
        { org: "Constellation Energy", ec: 181, s2: [982], type: "Energy supplier", country: "US", chars: 4585, person: true },
        { org: "Clean Incentive", ec: 197, s2: [1112], type: "Registry", country: "US", chars: 4167, person: true },
        { org: "LevelTen Energy, Inc", ec: 199, s2: [1140], type: "Company", country: "US", chars: 4019, person: true },
        { org: "Enocor", ec: 145, s2: [688], type: "Consultant", country: "US", chars: 3932, person: true },
        { org: "Industrial Energy Consumers of America", ec: 90, s2: [606], type: "Industry group", country: "US", chars: 3888, person: true },
        { org: "PowerOptions", ec: 76, s2: [514], type: "NGO", country: "US", chars: 3850, person: true },
        { org: "Exelon", ec: 125, s2: [663], type: "Energy supplier", country: "US", chars: 3650, person: true },
        { org: "ABIAPE (Brazilian self-producers assoc.)", ec: 183, s2: [1058], type: "Consultant", country: "Brazil", chars: 3595, person: true },
        { org: "Seneca Environmental Solutions", ec: 178, s2: [1127], type: "Company", country: "US", chars: 3576, person: true },
        { org: "The 0-Mission ApS", ec: 83, s2: [605], type: "Other", country: "Denmark", chars: 3541, person: true, variant: true },
        { org: "Action Speaks Louder", ec: 78, s2: [75, 196], type: "NGO", country: "Australia", chars: 3121, person: true },
        { org: "Workday", ec: 106, s2: [651], type: "Company", country: "US", chars: 3037, person: true },
        { org: "Clean Path Partners LLC", ec: 189, s2: [1103], type: "Consultant", country: "US", chars: 3009, person: true },
        { org: "EDF", ec: 130, s2: [791, 837], type: "Company", country: "France", chars: 2974, person: true },
        { org: "Business Council for Sustainable Energy", ec: 141, s2: [904], type: "Industry group", country: "US", chars: 2896, person: true },
        { org: "Mars", ec: 104, s2: [645], type: "Company", country: "US", chars: 2470, person: true },
        { org: "Corporate Strategy Dept., Osaka Gas Co., Ltd", ec: 68, s2: [464], type: "Company", country: "Japan", chars: 2430, person: true },
        { org: "Johns Hopkins University", ec: 99, s2: [641], type: "Academia", country: "US", chars: 2417, person: true },
        { org: "NRG Energy", ec: 180, s2: [1049], type: "Energy supplier", country: "US", chars: 2313, person: true },
        { org: "Dow", ec: 91, s2: [610], type: "Company", country: "US", chars: 2299, person: true },
        { org: "The Japan Gas Association", ec: 80, s2: [528], type: "Industry group", country: "Japan", chars: 2189, person: true },
        { org: "A Better City", ec: 111, s2: [687], type: "Other", country: "US", chars: 2134, person: true },
        { org: "Retail Industry Leaders Association (RILA)", ec: 182, s2: [1057], type: "Industry group", country: "US", chars: 2048, person: true },
        { org: "AFRICA SUB GRID LTD NIGERIA", ec: 16, s2: [91], type: "Company", country: "Nigeria", chars: 2034, person: true },
        { org: "Boston Green Ribbon Commission", ec: 163, s2: [953], type: "NGO", country: "US", chars: 1991, person: true },
        { org: "SE Advisory Services", ec: 132, s2: [875], type: "Consultant", country: "France", chars: 1900, person: true },
        { org: "VW Kraftwerk GmbH", ec: 85, s2: [570], type: "Energy supplier", country: "Germany", chars: 1782, person: true },
        { org: "ACEA (European Automobile Manufacturers' Association)", ec: 69, s2: [467], type: "Industry group", country: "Belgium", chars: 1775, person: true, variant: true },
        { org: "Volkswagen AG", ec: 84, s2: [567], type: "Company", country: "Germany", chars: 1726, person: true },
        { org: "Angeleno Group", ec: 188, s2: [1101], type: "Financial", country: "US", chars: 1456, person: true },
        { org: "daa", ec: 137, s2: [898], type: "Company", country: "Ireland", chars: 1451, person: true },
        { org: "California Retailers Association", ec: 162, s2: [956], type: "Industry group", country: "US", chars: 1381, person: true },
        { org: "esVolta", ec: 200, s2: [1148], type: "Energy supplier", country: "US", chars: 1371, person: true },
        { org: "ExxonMobil", ec: 156, s2: [943], type: "Company", country: "US", chars: 1360, person: true },
        { org: "Trio", ec: 169, s2: [978], type: "Consultant", country: "US", chars: 1272, person: true },
        { org: "Steel Dynamics, Inc", ec: 55, s2: [388], type: "Company", country: "US", chars: 1077, person: true },
        { org: "John F. Kennedy School of Government, Harvard University", ec: 49, s2: [333], type: "Academia", country: "US", chars: 890, person: true },
        { org: "Firm Clean Power Corporation", ec: 53, s2: [1023], type: "Company", country: "US", chars: 836, person: true },
        { org: "Hewlett Packard Enterprise", ec: 127, s2: [899], type: "Company", country: "US", chars: 619, person: true },
        { org: "Mt. Stonegate Green Asset Management Ltd", ec: 66, s2: [448], type: "Consultant", country: "Taiwan", chars: 341, person: true },
        { org: "Voltfox Inc", ec: 17, s2: [90], type: "Data/analytics", country: "Turkey", chars: 45, person: true },
        { org: "Vistra Corp", ec: 186, s2: [1089], type: "Energy supplier", country: "US", chars: 24, person: true },
        ]
    };

    // ========================================================================
    // Provisional banner
    // ========================================================================
    // P22 emits `"provisional": true` in meta.json when it runs with
    // --allow-missing-curation, and the audit block of integrity.json is the
    // part that lands late (it needs P20's org audit). Say so on the page
    // rather than quietly rendering a page with holes in it.
    function renderProvisional(meta, integ) {
        var host = el('provisionalBanner');
        if (!host) return;
        var provisional = !!(meta && meta.provisional);
        var audit = (integ && integ.audit) || null;
        var auditRows = (audit && audit.rows) || [];
        if (!provisional && auditRows.length) { host.innerHTML = ''; return; }

        var missing = [];
        if (!auditRows.length) missing.push('the claimed-versus-audited classification');
        if (provisional) missing.push('anything downstream of theme coding and quote curation');

        host.innerHTML =
            '<div class="insight-box ig-rail-warn" role="status">' +
            '<strong>Provisional export.</strong> This page is rendering an export ' +
            'that was generated before the full curation set landed' +
            (missing.length ? ', so ' + missing.join(' and ') + ' ' +
                (missing.length > 1 ? 'are' : 'is') + ' not shown yet' : '') +
            '. Every panel below is drawn from the export as it stands; the ' +
            'counts are real, but treat the page as incomplete rather than final.' +
            '</div>';
    }

    // ========================================================================
    // 0. The analytical base ledger — 185 → 180
    // ========================================================================
    function renderLedger(meta, integ) {
        var host = el('ledgerStats');
        if (!host) return;
        var totals = (meta && meta.totals) || {};
        var excluded = (integ && integ.excluded) || [];
        var junk = excluded.filter(function(r) { return r.reason === 'junk'; });
        var superseded = excluded.filter(function(r) { return r.reason === 'superseded'; });
        var raw = totals.respondents_raw || 0;
        var base = totals.respondents || 0;

        var cards = [
            { v: num(raw), l: 'submissions in the raw export',
              d: 'Every row the consultation platform recorded. The file is ' +
                 'committed unmodified and nothing below edits it.',
              cls: 'ig-stat-neutral' },
            { v: '−' + num(junk.length), l: plural(junk.length, 'junk / test submission'),
              d: 'Mechanically detected, then adjudicated one by one. Listed ' +
                 'in full below.', cls: 'ig-stat-drop' },
            { v: '−' + num(superseded.length),
              l: plural(superseded.length, 'superseded resubmission'),
              d: 'A filer who submitted twice. The later filing counts; the ' +
                 'earlier one is disclosed, not deleted.', cls: 'ig-stat-drop' },
            { v: num(base), l: 'respondents in the analytical base',
              d: 'The denominator behind every percentage on every other page ' +
                 'of this site.', cls: 'ig-stat-keep' }
        ];

        host.innerHTML = cards.map(function(c) {
            return '<div class="stat-card ' + c.cls + '">' +
                '<div class="stat-value">' + esc(c.v) + '</div>' +
                '<div class="stat-label">' + esc(c.l) + '</div>' +
                '<div class="ig-stat-detail">' + esc(c.d) + '</div></div>';
        }).join('');

        var arith = el('ledgerArithmetic');
        if (arith) {
            var ok = raw - junk.length - superseded.length === base;
            arith.innerHTML =
                '<span class="ig-sum">' + num(raw) + '</span> raw ' +
                '<span class="ig-sum-op">−</span> ' +
                '<span class="ig-sum">' + junk.length + '</span> junk ' +
                '<span class="ig-sum-op">−</span> ' +
                '<span class="ig-sum">' + superseded.length + '</span> superseded ' +
                '<span class="ig-sum-op">=</span> ' +
                '<span class="ig-sum ig-sum-total">' + num(base) + '</span> analytical base' +
                (ok ? '' : ' <span class="ec-tag ec-tag-none">export arithmetic ' +
                    'does not close — check validate_frontend_data.py</span>');
        }
    }

    // ========================================================================
    // 1. Junk / test respondents
    // ========================================================================
    function renderJunk(integ) {
        var host = el('junkPanel');
        if (!host) return;
        var rows = ((integ && integ.excluded) || []).filter(function(r) {
            return r.reason === 'junk';
        });
        if (!rows.length) { empty(host, 'No junk or test submissions were found.'); return; }

        var html = '<div class="ec-table-scroll"><table class="data-table ig-junk-table">' +
            '<caption class="sr-only">Submissions excluded as junk or test data, ' +
            'with the evidence recorded for each</caption><thead><tr>' +
            '<th scope="col">ID</th><th scope="col">Filer</th>' +
            '<th scope="col">Answer cells</th><th scope="col">What the record shows</th>' +
            '</tr></thead><tbody>';

        rows.forEach(function(r) {
            var name = r.name_or_redacted || 'Redacted';
            var isRedacted = /^redacted$/i.test(String(name).trim());
            html += '<tr><td class="ig-junk-id">' + esc(r.id) + '</td>' +
                '<td class="ig-junk-who">' +
                (isRedacted
                    ? '<span class="ec-tag ig-tag-redacted">redaction requested</span>'
                    : '<span class="ig-verbatim">' + esc(name) + '</span>') +
                '</td>' +
                '<td class="ig-num">' + num(r.n_cells || 0) + '</td>' +
                '<td class="ig-junk-ev"><ul class="ig-ev-list">' +
                ((r.evidence || []).map(function(e) {
                    return '<li>' + esc(e) + '</li>';
                }).join('') || '<li class="ec-tag-none">no evidence string recorded</li>') +
                '</ul></td></tr>';
        });

        html += '</tbody></table></div>';
        host.innerHTML = html;

        var count = el('junkCount');
        if (count) {
            var named = rows.filter(function(r) {
                return !/^redacted$/i.test(String(r.name_or_redacted || '').trim());
            }).length;
            count.textContent = rows.length + ' ' + plural(rows.length, 'submission') +
                ' — ' + named + ' named, ' + (rows.length - named) +
                ' redacted and adjudicated on answer content alone';
        }
    }

    // ========================================================================
    // 2. The resubmission
    // ========================================================================
    function renderResubmission(meta, integ) {
        var host = el('resubPanel');
        if (!host) return;
        var r = (integ && integ.resubmission) || null;
        if (!r || (!r.kept && !r.dropped)) {
            empty(host, 'No resubmission was found in this consultation.');
            return;
        }
        var changed = r.changed || [];
        var dropRow = ((integ && integ.excluded) || []).filter(function(x) {
            return x.reason === 'superseded' && x.id === r.dropped;
        })[0] || {};
        var who = dropRow.name_or_redacted || null;
        var whoIsRedacted = !who || /^redacted$/i.test(String(who).trim());

        var html = '<div class="ig-resub-head">' +
            '<div class="ig-resub-ids">' +
            '<span class="ig-resub-id ig-resub-id--dropped">#' + esc(r.dropped) +
            '<span class="ig-resub-role">earlier filing — excluded</span></span>' +
            '<span class="ig-resub-arrow" aria-hidden="true">→</span>' +
            '<span class="ig-resub-id ig-resub-id--kept">#' + esc(r.kept) +
            '<span class="ig-resub-role">later filing — counts</span></span>' +
            '</div>' +
            '<p class="ig-resub-who">' +
            // `name_or_redacted` carries whichever identifier the export holds
            // for the dropped row — a person for some filers, an organization
            // for others — so the sentence must not assert which it is.
            (whoIsRedacted
                ? 'Both filings carry the same redacted identity.'
                : 'Both filings come from the same filer, recorded in the export ' +
                  'as <span class="ig-verbatim">' + esc(who) + '</span>.') +
            ' Under the keep-latest rule the later submission is the one that ' +
            'counts; the earlier one is excluded from every aggregate on this ' +
            'site and disclosed here.</p></div>';

        if (!changed.length) {
            html += '<div class="card ec-empty">The export records no differing ' +
                'answers between the two filings.</div>';
        } else {
            html += '<h4 class="ig-subhead">' + changed.length + ' ' +
                plural(changed.length, 'answer') + ' differ between the two filings</h4>' +
                '<div class="ec-table-scroll">' +
                '<table class="data-table ig-diff-table">' +
                '<caption class="sr-only">Answers that changed between the ' +
                'earlier and later filing</caption><thead><tr>' +
                '<th scope="col">Question</th>' +
                '<th scope="col">Earlier filing (#' + esc(r.dropped) + ')</th>' +
                '<th scope="col">Later filing (#' + esc(r.kept) + ')</th>' +
                '</tr></thead><tbody>';
            changed.forEach(function(c) {
                var q = (window.ECData && ECData.question(meta, c.qid)) || null;
                var disp = (window.ECData && ECData.display(meta, c.qid)) || c.qid;
                html += '<tr><td class="ig-diff-q"><span class="ec-tag ec-tag-q">' +
                    esc(disp) + '</span>' +
                    (q && q.label ? '<span class="ig-diff-qlabel">' +
                        esc(clip(q.label, 90)) + '</span>' : '') + '</td>' +
                    '<td class="ig-diff-before">' + diffCell(c.before) + '</td>' +
                    '<td class="ig-diff-after">' + diffCell(c.after) + '</td></tr>';
            });
            html += '</tbody></table></div>';
        }
        host.innerHTML = html;
    }

    var DIFF_CAP = 700;
    function diffCell(v) {
        var s = v === null || v === undefined || v === '' ? null : String(v);
        if (s === null) return '<span class="ec-tag-none">not answered</span>';
        var out = '<span class="ig-verbatim">' + esc(clip(s, DIFF_CAP)) + '</span>';
        if (s.length > DIFF_CAP) {
            out += '<span class="ig-trunc">shown to ' + DIFF_CAP +
                ' of ' + num(s.length) + ' characters</span>';
        } else if (/…\s*$/.test(s)) {
            // The exporter previews long answers rather than shipping them in
            // full; say so instead of letting the ellipsis pass as the filer's.
            out += '<span class="ig-trunc">preview — the full answer is in the ' +
                'dataset, not in this export</span>';
        }
        return out;
    }

    // ========================================================================
    // 3. Entity families
    // ========================================================================
    function renderFamilies(integ) {
        var host = el('familyPanel');
        if (!host) return;
        var fams = (integ && integ.families) || [];
        if (!fams.length) {
            empty(host, 'No entity families were found — no two respondents share ' +
                'a normalized organization name.');
            return;
        }
        var html = '<div class="ig-fam-grid">' + fams.map(function(f) {
            var ids = f.ids || [];
            return '<div class="card ig-fam">' +
                '<div class="ig-fam-head">' +
                '<h4 class="ig-fam-name">' + esc(f.name || 'Unnamed family') + '</h4>' +
                '<span class="ec-tag ec-tag-family">' + (f.n || ids.length) +
                ' filings</span></div>' +
                '<p class="ig-fam-ids">Respondent ' +
                ids.map(function(i) {
                    return '<span class="ig-idchip">#' + esc(i) + '</span>';
                }).join(' ') + '</p>' +
                '<p class="ig-fam-note">Counted separately, grouped for display.</p>' +
                '</div>';
        }).join('') + '</div>';
        host.innerHTML = html;
    }

    // ========================================================================
    // 4. Template blocs, shared text, and the dedup effect
    // ========================================================================
    function renderBlocs(integ) {
        var host = el('blocPanel');
        if (!host) return;
        var blocs = (integ && integ.blocs) || [];
        if (!blocs.length) {
            empty(host, 'No response blocs were found.');
            return;
        }
        var html = '<div class="ig-bloc-grid">' + blocs.map(function(b) {
            var named = b.member_ids_named || [];
            var nRed = b.n_redacted || 0;
            var total = named.length + nRed;
            return '<div class="card ig-bloc">' +
                '<div class="ig-bloc-head">' +
                '<h4 class="ig-bloc-title">' + esc(b.label || b.key || 'Response pack') +
                '</h4>' +
                '<span class="ig-bloc-count"><span class="ig-bloc-n">' + total +
                '</span><span class="ig-bloc-n-label">' +
                plural(total, 'respondent') + '</span></span></div>' +
                '<dl class="ig-bloc-metrics">' +
                '<div><dt>Shared passages</dt><dd class="num">' +
                num(b.shared_texts || 0) + '</dd></div>' +
                '<div><dt>Named members</dt><dd class="num">' + named.length +
                '</dd></div>' +
                '<div><dt>Redacted members</dt><dd class="num">' + nRed +
                '</dd></div>' +
                // integrity.json → blocs[].n_countries (contract addition C5).
                // A bloc drawn from one country is a different object from one
                // drawn from six, and the count says so without naming it —
                // which matters, because the largest bloc's country sits inside
                // the "other" bucket of the published country split and every
                // one of its members asked to be redacted (P35 F6).
                (typeof b.n_countries === 'number'
                    ? '<div><dt>Countries represented</dt><dd class="num">' +
                      b.n_countries + '</dd></div>'
                    : '') +
                '</dl>' +
                '<div class="ig-bloc-sub">Named members</div>' +
                (named.length
                    ? '<div class="ig-chips">' + named.map(function(m) {
                        return '<span class="ec-tag ec-tag-template">#' + esc(m.id) +
                            ' ' + esc(clip(m.name || '', 40)) + '</span>';
                      }).join('') + '</div>'
                    : '<p class="ig-bloc-none">No member of this bloc filed under a ' +
                      'name.</p>') +
                (nRed
                    ? '<p class="ig-bloc-none">' + nRed + ' ' +
                      (named.length ? 'further ' : '') + plural(nRed, 'member') +
                      ' requested redaction and ' + (nRed === 1 ? 'is' : 'are') +
                      ' counted here without being named.</p>'
                    : '') +
                // Contract addition C5 read out. Deliberately silent on *which*
                // country: bloc membership is not cut by country anywhere in
                // the export, and for a pack of redacted filers naming it would
                // be new attribute disclosure about them (P35 F6). Only packs
                // above two members get the note — two people from one country
                // is not a pattern.
                (b.single_country && total > 2
                    ? '<p class="ig-bloc-none">Every member of this pack filed ' +
                      'from the same country, which makes it coordination ' +
                      'inside one jurisdiction rather than across an industry. ' +
                      'Which country is not published here, and is not ' +
                      'recoverable from anything else on this site.</p>'
                    : '') +
                '</div>';
        }).join('') + '</div>';
        host.innerHTML = html;
    }

    function renderClusters(integ) {
        var host = el('clusterPanel');
        if (!host) return;
        var cl = ((integ && integ.text_clusters) || []).slice();
        var summary = el('clusterSummary');
        if (!cl.length) {
            empty(host, 'No shared text blocks were found.');
            if (summary) summary.textContent = '';
            return;
        }
        cl.sort(function(a, b) {
            return (b.n_respondents || 0) - (a.n_respondents || 0) ||
                   (b.chars || 0) - (a.chars || 0);
        });

        if (summary) {
            var people = {};
            var maxN = 0;
            cl.forEach(function(c) {
                maxN = Math.max(maxN, c.n_respondents || 0);
                (c.named_members || []).forEach(function(m) { people[m.id] = 1; });
            });
            var nPeople = Object.keys(people).length;
            // integrity.json → text_clusters_n_respondents (contract addition
            // C3's sibling, C2). Passages overlap, so the spanned headcount is
            // not the sum of the rows and cannot be recovered from them here —
            // it used to live only in prose, which is how it drifted from 25 to
            // 26 without anyone noticing (P35 F5). The exporter owns it now.
            var spanned = integ && integ.text_clusters_n_respondents;
            summary.textContent = cl.length + ' shared ' +
                plural(cl.length, 'passage') + ' — the widest is carried by ' +
                maxN + ' ' + plural(maxN, 'respondent') + '. ' +
                (typeof spanned === 'number'
                    ? 'Across all of them ' + spanned + ' ' +
                      plural(spanned, 'respondent') + ' ' +
                      (spanned === 1 ? 'shares' : 'share') + ' text with ' +
                      'someone else, ' + nPeople + ' of them named; the rest ' +
                      'asked to be redacted and are counted, never listed.'
                    : nPeople + ' named ' + plural(nPeople, 'respondent') + ' ' +
                      (nPeople === 1 ? 'appears' : 'appear') + ' in at least ' +
                      'one; redacted members are counted within each passage ' +
                      'and cannot be totalled across them, so the number of ' +
                      'people involved is higher than that.');
        }

        var show = cl.slice(0, 12);
        var html = '<ul class="ig-cluster-list">' + show.map(function(c) {
            var named = c.named_members || [];
            return '<li class="ig-cluster">' +
                '<div class="ig-cluster-head">' +
                '<span class="ec-tag ec-tag-template">' + (c.n_respondents || 0) +
                ' ' + plural(c.n_respondents || 0, 'respondent') + '</span>' +
                '<span class="ig-cluster-meta">' + num(c.chars || 0) +
                ' characters · ' + (c.qids || []).length + ' ' +
                plural((c.qids || []).length, 'question') + '</span></div>' +
                '<blockquote class="ig-cluster-text">' +
                esc(clip(c.preview || '', 240)) + '</blockquote>' +
                '<div class="ig-cluster-foot">' +
                (c.qids || []).map(function(q) {
                    return '<span class="ec-tag ec-tag-q">' + esc(q) + '</span>';
                }).join('') +
                (named.length
                    ? '<span class="ig-cluster-members">' +
                      named.map(function(m) { return esc(clip(m.name || ('#' + m.id), 34)); })
                          .join(' · ') + '</span>'
                    : '') +
                ((c.n_redacted || 0)
                    ? '<span class="ig-cluster-members">+ ' + c.n_redacted +
                      ' redacted</span>'
                    : '') +
                '</div></li>';
        }).join('') + '</ul>';
        if (cl.length > show.length) {
            html += '<p class="ec-note">Showing the ' + show.length +
                ' most widely shared of ' + cl.length + ' passages.</p>';
        }
        host.innerHTML = html;
    }

    // The dedup effect: the same questions rendered twice, as filed and with
    // each template bloc collapsed to a single voice. Both numbers are printed
    // because the point of the panel is the size of the gap, not either figure
    // on its own.
    function renderDedup(meta, integ) {
        var rawHost = el('dedupRaw');
        var dedupHost = el('dedupDeduped');
        var readout = el('dedupReadout');
        if (!rawHost || !dedupHost) return;
        var rows = (integ && integ.dedup_effect) || [];
        if (!rows.length || !window.ECStance) {
            empty(rawHost, 'The export carries no dedup comparison.');
            dedupHost.innerHTML = '';
            if (readout) readout.innerHTML = '';
            return;
        }

        var qids = rows.map(function(r) { return r.qid; });
        var rawData = {}, dedupData = {};
        rows.forEach(function(r) {
            rawData[r.qid] = { overall: r.raw };
            dedupData[r.qid] = { overall: r.deduped };
        });

        function stripOpts(data, label) {
            return { qids: qids, stances: data, meta: meta, dim: 'overall',
                     label: label, showLinks: false, showSegments: false,
                     srTable: false };
        }
        ECStance.renderStrips(rawHost, stripOpts(rawData, 'As filed'));
        ECStance.renderStrips(dedupHost,
                              stripOpts(dedupData, 'Template-deduplicated'));

        // ECStance appends its masked-segment legend to every strip host. Both
        // hosts here are unsegmented overalls, so the note is not applicable
        // and two copies of it would be noise: drop them and let the panel's
        // own note stand. Composition only — no `.ec-*` markup is authored.
        [rawHost, dedupHost].forEach(function(h) {
            var n = h.querySelector('.ec-note-legend');
            if (n && n.parentNode) n.parentNode.removeChild(n);
        });

        if (!readout) return;
        var deltas = [];
        var lines = rows.map(function(r) {
            var q = (window.ECData && ECData.question(meta, r.qid)) || {};
            var disp = (window.ECData && ECData.display(meta, r.qid)) || r.qid;
            var opts = q.options || [];
            // Report the shift on the option the question's polarity singles
            // out; failing that, the first substantive option.
            var idx = -1;
            if (q.polarity && q.polarity.critical) {
                opts.forEach(function(o, i) {
                    if (o.key === q.polarity.critical) idx = i;
                });
            }
            if (idx < 0) {
                opts.forEach(function(o, i) { if (idx < 0 && !o.special) idx = i; });
            }
            if (idx < 0) idx = 0;
            var label = (opts[idx] && opts[idx].label) || ('option ' + (idx + 1));
            var rawN = baseOf(r.raw), dedN = baseOf(r.deduped);
            var rawC = ((r.raw || {}).c || [])[idx] || 0;
            var dedC = ((r.deduped || {}).c || [])[idx] || 0;
            var rawP = pct1(rawC, rawN), dedP = pct1(dedC, dedN);
            var delta = Math.round((dedP - rawP) * 10) / 10;
            deltas.push(Math.abs(delta));
            return '<li class="ig-delta">' +
                '<span class="ec-tag ec-tag-q">' + esc(disp) + '</span> ' +
                '<span class="ig-delta-opt">' + esc(label) + '</span> ' +
                '<span class="ig-delta-num">' + rawC + '/' + rawN + ' = ' +
                fmtPct(rawP) + '</span>' +
                '<span class="ig-delta-arrow" aria-hidden="true">→</span>' +
                '<span class="ig-delta-num">' + dedC + '/' + dedN + ' = ' +
                fmtPct(dedP) + '</span>' +
                '<span class="ec-tag ec-tag-net' +
                (delta > 0 ? ' ec-tag-net--pos' : delta < 0 ? ' ec-tag-net--neg' : '') +
                '">' + fmtSigned(delta) + ' pts</span></li>';
        }).join('');
        // The largest shift among the options reported above, in percentage
        // points — the shares themselves are percentages, the movement is not.
        var maxShift = deltas.reduce(function(m, d) { return Math.max(m, d); }, 0);
        var flips = rows.filter(function(r) {
            var rc = (r.raw || {}).c || [], dc = (r.deduped || {}).c || [];
            function lead(c) {
                var best = -1, at = -1;
                c.forEach(function(v, i) { if (v > best) { best = v; at = i; } });
                return at;
            }
            return rc.length && dc.length && lead(rc) !== lead(dc);
        }).length;
        readout.innerHTML = '<ul class="ig-delta-list">' + lines + '</ul>' +
            '<p class="ec-note">Collapsing every bloc to one voice moves these ' +
            'headline shares by at most <strong>' +
            (Math.round(maxShift * 10) / 10).toFixed(1) + ' percentage points</strong>, ' +
            'and changes which answer leads on ' +
            (flips ? flips + ' of ' + rows.length + ' of them' : 'none of them') +
            '. The blocs are small relative to the base, so the direction of each ' +
            'result survives the adjustment — which is the reason to publish both ' +
            'numbers rather than pick one.</p>';
    }

    // ========================================================================
    // 5. Redaction
    // ========================================================================
    function renderRedactionRate(meta) {
        var host = el('redactionRate');
        if (!host) return;
        var t = (meta && meta.totals) || {};
        var named = t.named || 0, redacted = t.redacted || 0;
        var base = named + redacted || t.respondents || 0;
        if (!base) { empty(host, 'No redaction totals in the export.'); return; }
        var share = pct1(redacted, base);
        host.innerHTML =
            '<div class="ig-rate">' +
            '<div class="ig-rate-figure">' + fmtPct(share) + '</div>' +
            '<div class="ig-rate-body">' +
            '<p class="ig-rate-lede"><strong>' + num(redacted) + '</strong> of the ' +
            '<strong>' + num(base) + '</strong> respondents in the analytical base ' +
            'asked for their identity to be withheld. <strong>' + num(named) +
            '</strong> filed under a name.</p>' +
            '<p class="ig-rate-note">Redaction is a choice the consultation ' +
            'offered and it carries no implication about the quality or the ' +
            'motive of a submission. Redacted respondents are counted in every ' +
            'total on this site and named in none of them.</p>' +
            '</div></div>';
    }

    function renderRedactionGradient(respondents) {
        var host = el('redactionGradient');
        if (!host) return;
        var block = ((respondents || {}).distributions || {}).org_type_x_redaction;
        var rows = (block && block.rows) || [];
        if (!rows.length) {
            empty(host, 'The export carries no organization-type × redaction table.');
            return;
        }
        var sorted = rows.slice().sort(function(a, b) {
            return pct1(b.redacted || 0, b.total || 1) - pct1(a.redacted || 0, a.total || 1);
        });
        var html = '<div class="ec-table-scroll">' +
            '<table class="data-table ig-grad-table">' +
            '<caption class="sr-only">Share of each organization type that ' +
            'requested redaction</caption><thead><tr>' +
            '<th scope="col">Organization type</th><th scope="col">Named</th>' +
            '<th scope="col">Redacted</th><th scope="col">Total</th>' +
            '<th scope="col">Redacted share</th></tr></thead><tbody>';
        sorted.forEach(function(r) {
            var total = r.total || ((r.named || 0) + (r.redacted || 0));
            var share = pct1(r.redacted || 0, total);
            html += '<tr><th scope="row">' + esc(r.label || r.key) + '</th>' +
                '<td class="ig-num">' + num(r.named || 0) + '</td>' +
                '<td class="ig-num">' + num(r.redacted || 0) + '</td>' +
                '<td class="ig-num">' + num(total) + '</td>' +
                '<td class="ig-share"><span class="ig-share-track">' +
                '<span class="ig-share-fill" style="width:' + share + '%"></span>' +
                '</span><span class="ig-share-val">' + fmtPct(share) + '</span></td>' +
                '</tr>';
        });
        html += '</tbody></table></div>' +
            '<p class="ec-note">Shares are of each type’s own total, and the ' +
            'smaller types carry small denominators — read the counts, not just ' +
            'the bars.</p>';
        host.innerHTML = html;
    }

    // Named-vs-redacted stance skew. stances.json already carries the
    // `redaction` split for every stance question, so the shared strip
    // renderer draws it directly. respondents.json's `redaction_effect` is the
    // fallback for an export that omits the dimension.
    function renderRedactionSkew(meta, stances, respondents) {
        var host = el('redactionSkew');
        if (!host || !window.ECStance) return;
        var data = null, qids = [];

        if (stances) {
            qids = Object.keys(stances).filter(function(q) {
                return ((stances[q] || {}).by || {}).redaction;
            });
            if (qids.length) data = stances;
        }
        if (!data) {
            var eff = (respondents || {}).redaction_effect || [];
            if (eff.length) {
                data = {};
                eff.forEach(function(r) {
                    var c = [];
                    var nA = (r.named || {}).c || [], nB = (r.redacted || {}).c || [];
                    var len = Math.max(nA.length, nB.length);
                    for (var i = 0; i < len; i++) c.push((nA[i] || 0) + (nB[i] || 0));
                    data[r.qid] = {
                        overall: { c: c, n: baseOf(r.named) + baseOf(r.redacted) },
                        by: { redaction: { named: r.named, redacted: r.redacted } }
                    };
                });
                qids = eff.map(function(r) { return r.qid; });
            }
        }
        if (!data || !qids.length) {
            empty(host, 'The export carries no named-versus-redacted split.');
            return;
        }
        // Survey order, so the strips read the way the questionnaire did.
        var order = ((meta && meta.questions) || []).map(function(q) { return q.qid; });
        qids.sort(function(a, b) {
            var ia = order.indexOf(a), ib = order.indexOf(b);
            return (ia < 0 ? 1e6 : ia) - (ib < 0 ? 1e6 : ib);
        });

        ECStance.renderStrips(host, {
            qids: qids, stances: data, meta: meta, dim: 'redaction',
            label: 'Stance by redaction', showLinks: false
        });
    }

    // ========================================================================
    // 6. The evidence base
    // ========================================================================
    // An answer that is only "N/A" (or an equivalent placeholder) is a
    // response to the evidence question but not a piece of evidence. Counted
    // separately rather than dropped.
    var NA_RE = /^\s*(n\/?a\.?|none\.?|no\.?|nil\.?|not applicable\.?|-+)\s*$/i;

    function renderQ52(integ, meta) {
        var host = el('q52Panel');
        if (!host) return;
        var rows = (((integ || {}).citations) || {}).q52 || [];
        var summary = el('q52Summary');
        if (!rows.length) {
            empty(host, 'The export carries no answers to the evidence question.');
            if (summary) summary.textContent = '';
            return;
        }
        var na = rows.filter(function(r) { return NA_RE.test(r.preview || ''); });
        var substantive = rows.length - na.length;

        if (summary) {
            summary.innerHTML = '<strong>' + rows.length + '</strong> respondents ' +
                'answered the consultation’s own evidence question' +
                (na.length
                    ? ', <strong>' + na.length + '</strong> of them with nothing more ' +
                      'than “N/A” or an equivalent — leaving <strong>' +
                      substantive + '</strong> substantive ' +
                      plural(substantive, 'pointer') + ' to supporting research'
                    : '') + '.';
        }

        var html = '<div class="ec-table-scroll">' +
            '<table class="data-table ig-q52-table">' +
            '<caption class="sr-only">Answers to the supporting-research ' +
            'question</caption><thead><tr><th scope="col">Respondent</th>' +
            '<th scope="col">What they pointed to</th></tr></thead><tbody>';
        rows.forEach(function(r) {
            var isNa = NA_RE.test(r.preview || '');
            html += '<tr' + (isNa ? ' class="ig-q52-na"' : '') + '>' +
                '<td class="ig-q52-who">' + esc(r.attribution || ('#' + r.respondent_id)) +
                '</td><td class="ig-q52-text">' +
                (isNa
                    ? '<span class="ec-tag ec-tag-special">no evidence offered</span> ' +
                      '<span class="ig-verbatim">' + esc(clip(r.preview || '', 60)) + '</span>'
                    : '<span class="ig-verbatim">' + esc(clip(r.preview || '', 300)) + '</span>') +
                '</td></tr>';
        });
        html += '</tbody></table></div>';
        host.innerHTML = html;
    }

    function rateTable(rows, label, dimKey, labelMap) {
        if (!rows || !rows.length) return '';
        var sorted = rows.slice().sort(function(a, b) {
            return (b.pct || 0) - (a.pct || 0);
        });
        var html = '<div class="ig-rate-block"><h4 class="ig-subhead">' +
            esc(label) + '</h4>' +
            '<table class="data-table ig-cite-table">' +
            '<caption class="sr-only">Share of respondents citing a source, by ' +
            esc(label) + '</caption>' +
            '<thead><tr><th scope="col">Group</th><th scope="col">Citing</th>' +
            '<th scope="col">Of</th><th scope="col">Share</th></tr></thead><tbody>';
        sorted.forEach(function(r) {
            var lbl = r.label || (labelMap && labelMap[r.key]) ||
                (window.ECSegments && dimKey && ECSegments.valueLabel(dimKey, r.key)) ||
                r.key;
            var pct = r.pct !== undefined && r.pct !== null
                ? r.pct : pct1(r.citing || 0, r.n || 0);
            html += '<tr><th scope="row">' + esc(lbl) + '</th>' +
                '<td class="ig-num">' + num(r.citing || 0) + '</td>' +
                '<td class="ig-num">' + num(r.n || 0) + '</td>' +
                '<td class="ig-share"><span class="ig-share-track">' +
                '<span class="ig-share-fill" style="width:' +
                Math.min(100, pct) + '%"></span></span>' +
                '<span class="ig-share-val">' + fmtPct(pct) + '</span></td></tr>';
        });
        return html + '</tbody></table></div>';
    }

    function renderCitations(integ, meta) {
        var host = el('citationPanel');
        if (!host) return;
        var c = ((integ || {}).citations) || {};
        var byOrg = c.by_org_type || [];
        var byRed = c.by_redaction || [];
        var byQ19 = c.by_stance_q19 || [];
        if (!byOrg.length && !byRed.length && !byQ19.length) {
            empty(host, 'The export carries no citation-mining results.');
            return;
        }
        var q19 = (window.ECData && ECData.question(meta, 'Q019')) || null;
        var q19Labels = {};
        ((q19 && q19.options) || []).forEach(function(o) { q19Labels[o.key] = o.label; });
        host.innerHTML = '<div class="ig-rate-grid">' +
            rateTable(byOrg, 'By organization type', 'org_type_5') +
            rateTable(byRed, 'By redaction', 'redaction') +
            rateTable(byQ19, 'By answer to the formula question', null, q19Labels) +
            '</div>';

        // The asymmetry, stated whichever way the data falls.
        var read = el('citationReadout');
        if (!read) return;
        if (byQ19.length < 2) { read.innerHTML = ''; return; }
        var ranked = byQ19.slice().sort(function(a, b) {
            var pa = a.pct !== undefined ? a.pct : pct1(a.citing || 0, a.n || 0);
            var pb = b.pct !== undefined ? b.pct : pct1(b.citing || 0, b.n || 0);
            return pb - pa;
        });
        var top = ranked[0], bot = ranked[ranked.length - 1];
        function lbl(r) {
            var q = (window.ECData && ECData.question(meta, 'Q019')) || null;
            var found = null;
            ((q && q.options) || []).forEach(function(o) {
                if (o.key === r.key) found = o.label;
            });
            return found || r.label || r.key;
        }
        function p(r) {
            return r.pct !== undefined && r.pct !== null
                ? r.pct : pct1(r.citing || 0, r.n || 0);
        }
        var gap = Math.round((p(top) - p(bot)) * 10) / 10;
        var tmpl = (c.template_citation_blocks || []).length;
        read.innerHTML =
            '<div class="insight-glass ig-readout">' +
            '<strong>Who did the homework.</strong> Respondents answering ' +
            '<em>' + esc(lbl(top)) + '</em> cited a source ' +
            (gap === 0 ? 'at the same rate as' : 'more often than') +
            ' those answering <em>' + esc(lbl(bot)) + '</em> — ' +
            fmtPct(p(top)) + ' of ' + num(top.n || 0) + ' against ' +
            fmtPct(p(bot)) + ' of ' + num(bot.n || 0) +
            (gap === 0 ? '' : ', a gap of ' + fmtSigned(gap) + ' points') + '. ' +
            'At these bases that is a description of the record, not a ' +
            'measure of who is right' +
            (tmpl
                ? ', and it is inflated on both sides by shared text: ' + tmpl + ' ' +
                  plural(tmpl, 'citation block') + ' below ' +
                  (tmpl === 1 ? 'appears' : 'appear') + ' in more than one ' +
                  'submission, so the same reference can be counted several times'
                : '') + '.</div>';
    }

    function renderDomains(integ) {
        var host = el('domainPanel');
        if (!host) return;
        var rows = (((integ || {}).citations) || {}).domains || [];
        if (!rows.length) {
            empty(host, 'No classifiable link domains were found in the free text.');
            return;
        }
        var sorted = rows.slice().sort(function(a, b) {
            return (b.count || 0) - (a.count || 0);
        });
        var total = sorted.reduce(function(s, r) { return s + (r.count || 0); }, 0);
        var html = '<div class="ec-table-scroll">' +
            '<table class="data-table ig-domain-table">' +
            '<caption class="sr-only">Link domains found in free-text answers, ' +
            'with their classification</caption><thead><tr>' +
            '<th scope="col">Domain</th><th scope="col">Class</th>' +
            '<th scope="col">Mentions</th><th scope="col">Respondents</th>' +
            '</tr></thead><tbody>';
        sorted.forEach(function(r) {
            html += '<tr><th scope="row" class="ig-domain">' + esc(r.domain) + '</th>' +
                '<td><span class="ec-tag ec-tag-theme">' +
                esc(String(r.class || 'unclassified').replace(/_/g, ' ')) +
                '</span></td>' +
                '<td class="ig-num">' + num(r.count || 0) + '</td>' +
                '<td class="ig-num">' + (r.n_respondents === undefined
                    ? '<span class="ec-tag-none">—</span>'
                    : num(r.n_respondents)) + '</td></tr>';
        });
        html += '</tbody></table></div>' +
            '<p class="ec-note">' + num(total) + ' link ' + plural(total, 'mention') +
            ' across ' + sorted.length + ' ' + plural(sorted.length, 'domain') +
            '. Mentions and respondents are counted separately: a domain named ' +
            'repeatedly by one filer is not the same as one named once by many. ' +
            'Classification describes what a source <em>is</em> — a journal, a ' +
            'government lab, a body with a position in this debate — not whether ' +
            'the claim it supports is sound.</p>';
        host.innerHTML = html;
    }

    function renderTemplateCitations(integ) {
        var host = el('templateCitePanel');
        if (!host) return;
        var rows = (((integ || {}).citations) || {}).template_citation_blocks || [];
        if (!rows.length) {
            empty(host, 'No citation appears inside a shared text block.');
            return;
        }
        host.innerHTML = '<ul class="ig-cluster-list">' + rows.map(function(r) {
            return '<li class="ig-cluster">' +
                '<div class="ig-cluster-head">' +
                '<span class="ec-tag ec-tag-template">' + (r.n_respondents || 0) +
                ' ' + plural(r.n_respondents || 0, 'respondent') + '</span>' +
                '<span class="ig-cluster-meta">' +
                (r.domains || []).map(function(d) { return esc(d); }).join(' · ') +
                '</span></div>' +
                '<blockquote class="ig-cluster-text">' +
                esc(clip(r.preview || '', 240)) + '</blockquote></li>';
        }).join('') + '</ul>' +
            '<p class="ec-note">A citation inside shared text is one reference ' +
            'reaching the consultation several times. Counting citing respondents ' +
            'and counting distinct arguments are different measurements, and only ' +
            'the first is reported above.</p>';
    }

    // ========================================================================
    // 7. Cross-consultation panel
    // ========================================================================
    function renderCross() {
        var host = el('crossPanel');
        var summary = el('crossSummary');
        if (!host) return;
        var rows = CROSS.rows || [];

        // P34's rule: fewer than five solid matches and this becomes a note,
        // not a table. Do not pad.
        if (rows.length < 5) {
            host.innerHTML = '<div class="insight-box ig-rail-info">' +
                '<strong>Too few matches to tabulate.</strong> The join found ' +
                rows.length + ' ' + plural(rows.length, 'organization') +
                ' named in both consultations — too few to read anything into, ' +
                'so no table is drawn.</div>';
            if (summary) summary.textContent = '';
            return;
        }

        var same = rows.filter(function(r) { return r.person; }).length;
        var share = pct1(rows.length, CROSS.ec_named_with_org);

        if (summary) {
            summary.innerHTML =
                '<strong>' + rows.length + '</strong> of the <strong>' +
                CROSS.ec_named_with_org + '</strong> named respondents in this ' +
                'consultation’s analytical base whose organization field ' +
                'carries an actual name — <strong>' + fmtPct(share) + '</strong> ' +
                'of them — also filed, under a name, in the Scope 2 consultation. ' +
                'In <strong>' + same + '</strong> of those ' + rows.length +
                ' cases the individual who signed the two filings is the same person.';
        }

        var html = '<div class="ec-table-scroll">' +
            '<table class="data-table ig-cross-table">' +
            '<caption class="sr-only">Organizations named in both the ' +
            'electricity-sector consequential consultation and the Scope 2 ' +
            'consultation</caption><thead><tr>' +
            '<th scope="col">Organization</th><th scope="col">Type</th>' +
            '<th scope="col">Country</th>' +
            '<th scope="col">This consultation</th>' +
            '<th scope="col">Scope 2</th>' +
            '<th scope="col">Free text here</th></tr></thead><tbody>';
        rows.forEach(function(r) {
            html += '<tr><th scope="row" class="ig-cross-org">' + esc(r.org) +
                (r.person
                    ? ' <span class="ec-tag ec-tag-family" title="The name field ' +
                      'matches too, not just the organization">same filer</span>'
                    : '') +
                (r.variant
                    ? ' <span class="ec-tag ec-tag-special" title="Matched after ' +
                      'one side’s organization field was reduced to the name ' +
                      'inside it">variant match</span>'
                    : '') +
                '</th>' +
                '<td class="ig-cross-type">' + esc(r.type) + '</td>' +
                '<td class="ig-cross-country">' + esc(r.country) + '</td>' +
                '<td class="ig-num"><span class="ig-idchip">#' + r.ec + '</span></td>' +
                '<td class="ig-num">' + r.s2.map(function(i) {
                    return '<span class="ig-idchip">#' + i + '</span>';
                }).join(' ') + '</td>' +
                '<td class="ig-num">' + num(r.chars) + '</td></tr>';
        });
        html += '</tbody></table></div>';
        host.innerHTML = html;

        var caveat = el('crossCaveat');
        if (caveat) {
            var multi = rows.filter(function(r) { return r.s2.length > 1; }).length;
            caveat.innerHTML =
                'Both-named rule: a respondent appears above only if they filed ' +
                'under a name in <em>both</em> consultations. The <strong>' +
                CROSS.ec_redacted + '</strong> redacted respondents in this ' +
                'consultation’s base and the <strong>' + num(CROSS.s2_redacted) +
                '</strong> in Scope 2’s are unmatchable in either direction, ' +
                'so the real overlap is larger than the table and cannot be ' +
                'measured. Matching is on organization, not on identity' +
                (multi
                    ? ': ' + multi + ' ' + plural(multi, 'organization') + ' filed ' +
                      'more than once in Scope 2 and ' +
                      (multi === 1 ? 'carries' : 'carry') + ' more than one identifier'
                    : '') +
                '. Neither hub deep-links an individual profile — profiles open ' +
                'as expandable rows inside each site’s respondent browser — so ' +
                'the two links below open the browsers, where the identifiers in ' +
                'this table can be searched.';
        }
    }

    // ========================================================================
    // Boot
    // ========================================================================
    function boot() {
        // meta + integrity are the page's spine: fail loudly without them.
        // respondents + stances only garnish two panels, so a missing file
        // degrades those panels instead of blanking the page.
        renderCross();   // static; never blocked by the export

        ECData.loadAll(['meta', 'integrity']).then(function(d) {
            var meta = d.meta, integ = d.integrity;
            if (window.ECSegments) ECSegments.init(meta);

            renderProvisional(meta, integ);
            renderLedger(meta, integ);
            renderJunk(integ);
            renderResubmission(meta, integ);
            renderFamilies(integ);
            renderBlocs(integ);
            renderClusters(integ);
            renderDedup(meta, integ);
            renderRedactionRate(meta);
            renderQ52(integ, meta);
            renderCitations(integ, meta);
            renderDomains(integ);
            renderTemplateCitations(integ);

            return ECData.loadOptional(['respondents', 'stances']).then(function(o) {
                renderRedactionGradient(o.respondents);
                renderRedactionSkew(meta, o.stances, o.respondents);
            });
        }).catch(function(err) {
            ECData.errorPanel('#integrityError', err, {
                title: 'The integrity export could not be loaded'
            });
            if (window.console && console.error) console.error(err);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
