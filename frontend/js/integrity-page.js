// ============================================================================
// integrity-page.js — renderer for integrity.html (Legitimacy audit & coalitions)
// ============================================================================
// Site-specific module (not an upstream design-system file).
//
// Reads the P22 contract files described in plans/mbm-dashboard/PLAN.md §5:
//   audit.json        claimed -> audited classification, per-row basis
//   clusters.json     text clusters, vector clusters, blocs, entity families
//   respondents.json  org_index (named respondents, 7-anchor vectors, flags)
//   likert.json       per-question distributions by segment
//   meta.json         segment vocabularies and labels
//
// Every number rendered here is computed from those files at load time — no
// figure is hardcoded in this module. Where a figure cannot be derived from the
// published JSON (see PROVENANCE below) the page says so in visible text rather
// than substituting an estimate.
//
// PROVENANCE NOTES (rendered as page footnotes, not silent):
//  * audit.json rows carry no `confidence` field even though
//    reference/org_audit.csv does. The drill table renders the column when a
//    future export adds it, and otherwise states that it is not published.
//  * The 155 template respondents include 65 redacted filings that cannot be
//    enumerated from clusters.json (redacted members are counts, never ids).
//    The page therefore reports the 90 named ones as the enumerable subset and
//    labels the population figure's source.
//
// Tone contract for anything this module writes into the DOM: statements of
// fact traceable to the JSON, symmetric scrutiny of every bloc, no motive
// adjectives, and redacted respondents counted but never named or guessed.
// ============================================================================

(function() {
    'use strict';

    var esc = window.S2Data ? window.S2Data.escapeHtml : function(s) { return String(s); };

    // --- The seven MBM support anchors, in survey order --------------------
    // `kind` splits the two halves of the headline shape: five proposals that
    // add a requirement, two that let a reporter out of one.
    var ANCHORS = [
        { q: 71,  label: 'QC4 hourly matching',        kind: 'requirement' },
        { q: 83,  label: 'QC5 deliverability',         kind: 'requirement' },
        { q: 97,  label: 'SSS pro-rata limit',         kind: 'requirement' },
        { q: 113, label: 'Residual-mix definition',    kind: 'requirement' },
        { q: 124, label: 'Fossil-based fallback',      kind: 'requirement' },
        { q: 153, label: 'Hourly-matching exemptions', kind: 'flexibility' },
        { q: 171, label: 'Legacy clause',              kind: 'flexibility' }
    ];
    var ANCHOR_QS = ANCHORS.map(function(a) { return a.q; });

    // --- Audited-class groupings used by the two NGO stat cards ------------
    // Deliberately kept as two separate destinations. A certification body or a
    // think tank is not an industry group, so the two counts are reported side
    // by side and never added together.
    var NGO_BUSINESS_INTEREST = ['trade_association', 'business_coalition', 'company',
                                 'consultancy', 'data_vendor'];
    var NGO_FINER_NONPROFIT   = ['standards_body', 'think_tank'];

    // --- Claim -> audited equivalence -------------------------------------
    // Which audited class is the direct counterpart of a self-selected
    // org_type. Used only to drive the drill table's "reclassified only"
    // filter and the matrix diagonal; the mapping is printed on the page so a
    // reader can check the judgement rather than take it on trust. `null` = the
    // claimed type has no single counterpart, so no row is called reclassified.
    var EQUIVALENT = {
        academia:          'academic_institution',
        company:           'company',
        consultant:        'consultancy',
        data_analytics:    'data_vendor',
        energy_supplier:   'company',
        financial:         'financial',
        ghg_program:       'standards_body',
        government:        'government',
        grid_operator:     'company',
        industry_group:    'trade_association',
        intl_agency:       'government',
        ngo:               'ngo_civil_society',
        other:             null,
        registry_operator: 'registry_operator',
        verification:      'standards_body'
    };

    // Neutral, factual one-liners for the shared interest of each bloc. Each
    // states what the members have in common as a matter of record (sector,
    // supply chain, jurisdiction, trade-body relationship) and nothing about
    // intent. Blocs not listed fall back to a generated line.
    var BLOC_INTEREST = {
        pro_hourly:  'Members work on hourly certificate standards, granular-matching software, ' +
                     'clean-firm generation and climate research — activities whose scope grows if ' +
                     'hourly matching becomes mandatory.',
        luxshare:    'Twelve filings from plants and subsidiaries of one electronics contract ' +
                     'manufacturer, ten of them in China, filed as separate respondents.',
        avary:       'Printed-circuit-board plants in the Avary / Foxconn Technology Group supply ' +
                     'chain, filing from China and India.',
        semi:        'A semiconductor-industry trade association and companies in its membership, ' +
                     'all reporting large purchased-electricity loads.',
        greece:      'Greek industrial respondents; this cluster sits inside the pro-hourly bloc, ' +
                     'so its filings are counted in both cards.',
        korea:       'Three filings from a Korean shared-response cluster. All three are redacted, ' +
                     'so no member is named and none is inferred here.',
        eiga_siga:   'The European and Swedish industrial-gases associations — a regional body and ' +
                     'its national counterpart in the same sector.',
        fepc_tepco:  'The Japanese electric-power federation and one of its member utilities.'
    };

    // ------------------------------------------------------------------
    // Small helpers
    // ------------------------------------------------------------------
    function node(t) { return typeof t === 'string' ? document.getElementById(t) : t; }

    function num(n) { return Number(n).toLocaleString('en-US'); }

    function pct(part, whole, dp) {
        if (!whole) return '—';
        return (100 * part / whole).toFixed(dp === undefined ? 1 : dp) + '%';
    }

    function labelMap(meta, dim) {
        var out = {};
        var seg = meta && meta.segments && meta.segments[dim];
        (seg && seg.values ? seg.values : []).forEach(function(v) { out[v.key] = v.label; });
        return out;
    }

    // Prefer the label vocabulary, fall back to a de-slugged key so an
    // unexpected class never renders as an empty cell.
    function labelFor(map, key, fallbackMap) {
        if (map && map[key]) return map[key];
        if (fallbackMap && fallbackMap[key]) return fallbackMap[key];
        return String(key || '—').replace(/_/g, ' ').replace(/^./, function(c) {
            return c.toUpperCase();
        });
    }

    // audit.summary is `claimed -> audited -> count`; PLAN §5 also allows it
    // nested under `claimed_x_audited` (the shape the fixtures use).
    function summaryOf(audit) {
        var s = (audit && audit.summary) || {};
        return s.claimed_x_audited ? s.claimed_x_audited : s;
    }

    function sumVals(o) {
        var t = 0;
        Object.keys(o || {}).forEach(function(k) { t += o[k]; });
        return t;
    }

    // 7-anchor signature strip. Reuses the .s2-spark component from site.css so
    // bloc cards and the org browser draw identical bars. `null` = the members
    // do not agree at that position (or nobody answered) and is drawn hatched.
    function sparkStrip(vals, opts) {
        opts = opts || {};
        var bars = ANCHORS.map(function(a, i) {
            var v = vals && vals[i] !== undefined ? vals[i] : null;
            if (v === null || v === undefined || v === '-' || v === '') {
                return '<span class="s2-spark-bar s2-spark-na" title="Q' + a.q + ' ' +
                    esc(a.label) + ': ' + esc(opts.naTitle || 'no shared value') + '"></span>';
            }
            var lvl = Math.max(1, Math.min(5, Math.round(Number(v))));
            return '<span class="s2-spark-bar s2-spark-' + lvl + '" style="--s2-spark-h:' +
                Math.round(100 * lvl / 5) + '%" title="Q' + a.q + ' ' + esc(a.label) +
                ': ' + lvl + ' of 5"></span>';
        }).join('');
        var read = ANCHORS.map(function(a, i) {
            var v = vals && vals[i] !== undefined && vals[i] !== null ? vals[i] : null;
            return 'Q' + a.q + ' ' + a.label + ' ' + (v === null ? 'no shared value' : v + ' of 5');
        }).join('; ');
        return '<span class="s2-spark ip-sig-strip" aria-hidden="true">' + bars + '</span>' +
            '<span class="sr-only">' + esc(read) + '</span>';
    }

    function chip(text, cls, title) {
        return '<span class="s2-tag ' + (cls || '') + '"' +
            (title ? ' title="' + esc(title) + '"' : '') + '>' + esc(text) + '</span>';
    }

    // Segment labels carry a "(46 values)" style parenthetical that is useful in
    // a legend and too long inside a chip. Trim it for chips only; the full label
    // stays in the chip's title attribute.
    function compact(label) {
        return String(label).replace(/\s*\(\d+\s+values?\)/, '');
    }

    // ------------------------------------------------------------------
    // Provisional banner (audit.json may land before P20 verifies it)
    // ------------------------------------------------------------------
    function renderProvisional(el, audit) {
        el = node(el);
        if (!el) return;
        if (!audit || audit.provisional !== true) { el.innerHTML = ''; return; }
        el.innerHTML =
            '<div class="insight-box insight-warn" role="status">' +
            '<strong>Provisional audit.</strong> <code>audit.json</code> carries ' +
            '<code>"provisional": true</code>: the classifications below are the exporter\'s ' +
            'first pass and have not been verified row by row. Counts and named examples on ' +
            'this page will change when the verified audit lands.' +
            '</div>';
    }

    // ------------------------------------------------------------------
    // Panel 1a — lead stat cards
    // ------------------------------------------------------------------
    function renderLeadStats(el, audit, meta) {
        el = node(el);
        if (!el) return;
        var sm = summaryOf(audit);
        var ngo = sm.ngo || {};
        var ngoTotal = sumVals(ngo);
        var business = 0, finer = 0;
        NGO_BUSINESS_INTEREST.forEach(function(k) { business += ngo[k] || 0; });
        NGO_FINER_NONPROFIT.forEach(function(k) { finer += ngo[k] || 0; });

        var ac = sm.academia || {};
        var acTotal = sumVals(ac);
        var acNotAcademic = acTotal - (ac.academic_institution || 0);

        // "0 of 0" is meaningless — say so instead (hit by the tiny fixtures).
        function ratio(part, whole) { return whole ? part + ' of ' + whole : 'no rows'; }

        var aLabels = labelMap(meta, 'audited_class');
        var bizList = NGO_BUSINESS_INTEREST.filter(function(k) { return ngo[k]; })
            .map(function(k) { return labelFor(aLabels, k) + ' ' + ngo[k]; }).join(' · ');
        var finerList = NGO_FINER_NONPROFIT.filter(function(k) { return ngo[k]; })
            .map(function(k) { return labelFor(aLabels, k) + ' ' + ngo[k]; }).join(' · ');

        var cards = [
            {
                value: ratio(business, ngoTotal),
                label: 'Named “NGO/nonprofit” filings audited into business-interest classes',
                detail: bizList || 'none',
                accent: 'ip-stat-business'
            },
            {
                value: ratio(finer, ngoTotal),
                label: 'Named “NGO/nonprofit” filings audited into finer nonprofit classes',
                detail: finerList || 'none',
                accent: 'ip-stat-nonprofit'
            },
            {
                value: ratio(acNotAcademic, acTotal),
                label: 'Named “academia/research” filings that are not academic institutions',
                detail: Object.keys(ac).filter(function(k) { return k !== 'academic_institution'; })
                    .sort().map(function(k) { return labelFor(aLabels, k) + ' ' + ac[k]; })
                    .join(' · ') || 'none',
                accent: 'ip-stat-neutral'
            },
            {
                value: ratio(ngo.ngo_civil_society || 0, ngoTotal),
                label: 'Named “NGO/nonprofit” filings the audit left as NGO / civil society',
                detail: 'Claim checked and held',
                accent: 'ip-stat-neutral'
            }
        ];

        el.innerHTML = cards.map(function(c) {
            return '<div class="stat-card scroll-reveal ' + c.accent + '">' +
                '<div class="stat-value">' + esc(c.value) + '</div>' +
                '<div class="stat-label">' + c.label + '</div>' +
                '<div class="ip-stat-detail">' + esc(c.detail) + '</div>' +
                '</div>';
        }).join('');

        // The instruction that governs these cards, stated on the page itself.
        var warn = document.getElementById('ngoSumWarning');
        if (warn) {
            warn.innerHTML =
                '<strong>These two counts are not one number.</strong> ' +
                business + ' of the ' + ngoTotal + ' named “NGO/nonprofit” filings were audited ' +
                'into classes whose members or customers are businesses (' + esc(bizList) + '). ' +
                'A further ' + finer + ' were audited into <em>other nonprofit</em> classes ' +
                '(' + esc(finerList) + ') — a standards body or a think tank is a different kind ' +
                'of organisation from an industry group, not a milder version of one. Adding the ' +
                'two would assert something the audit does not: that all ' + (business + finer) +
                ' are business-interest filings. They are reported separately for that reason.';
        }
    }

    // ------------------------------------------------------------------
    // Panel 1b — claimed × audited matrix
    // ------------------------------------------------------------------
    function renderMatrix(el, audit, meta) {
        el = node(el);
        if (!el) return;
        var sm = summaryOf(audit);
        var oLabels = labelMap(meta, 'org_type');
        var aLabels = labelMap(meta, 'audited_class');

        // Columns: every audited class that actually occurs, ordered by the
        // meta vocabulary first (stable), then any extras alphabetically.
        var order = Object.keys(aLabels);
        var present = {};
        Object.keys(sm).forEach(function(cm) {
            Object.keys(sm[cm]).forEach(function(a) { present[a] = true; });
        });
        var cols = order.filter(function(k) { return present[k]; });
        Object.keys(present).sort().forEach(function(k) {
            if (cols.indexOf(k) < 0) cols.push(k);
        });

        // Rows: claimed org types, largest first.
        var rows = Object.keys(sm).sort(function(a, b) {
            return sumVals(sm[b]) - sumVals(sm[a]) || a.localeCompare(b);
        });

        var colTotals = {}, grand = 0;
        rows.forEach(function(r) {
            cols.forEach(function(c) {
                colTotals[c] = (colTotals[c] || 0) + (sm[r][c] || 0);
                grand += sm[r][c] || 0;
            });
        });

        var head = '<tr><th class="ip-mx-corner" scope="col">Claimed org type ' +
            '<span class="ip-mx-arrow">→</span> audited class</th>' +
            cols.map(function(c) {
                return '<th class="ip-mx-colhead" scope="col"><span class="ip-mx-colname">' +
                    esc(labelFor(aLabels, c)) + '</span></th>';
            }).join('') +
            '<th class="ip-mx-colhead ip-mx-total" scope="col"><span class="ip-mx-colname">' +
            'Filings</span></th></tr>';

        var body = rows.map(function(r) {
            var rowTotal = sumVals(sm[r]);
            var cells = cols.map(function(c) {
                var n = sm[r][c] || 0;
                var same = EQUIVALENT[r] === c;
                var cls = 'ip-mx-cell' + (n ? '' : ' ip-mx-cell--zero') +
                    (same && n ? ' ip-mx-cell--held' : '') +
                    (!same && n && EQUIVALENT[r] !== null ? ' ip-mx-cell--moved' : '');
                // Shade by share of the claimed row so a reader can see where a
                // claim mostly lands without reading every number.
                var share = rowTotal ? n / rowTotal : 0;
                var style = n ? ' style="--ip-mx-a:' + (0.06 + 0.5 * share).toFixed(3) + '"' : '';
                return '<td class="' + cls + '"' + style + ' aria-label="' +
                    esc(labelFor(oLabels, r)) + ' claimed, audited as ' +
                    esc(labelFor(aLabels, c)) + ': ' + n + ' of ' + rowTotal + '">' +
                    (n ? n : '<span class="ip-mx-dash">·</span>') + '</td>';
            }).join('');
            return '<tr><th class="ip-mx-rowhead" scope="row">' + esc(labelFor(oLabels, r)) +
                '</th>' + cells + '<td class="ip-mx-cell ip-mx-total num">' + rowTotal +
                '</td></tr>';
        }).join('');

        var foot = '<tr><th class="ip-mx-rowhead ip-mx-total" scope="row">All named filings</th>' +
            cols.map(function(c) {
                return '<td class="ip-mx-cell ip-mx-total num">' + (colTotals[c] || 0) + '</td>';
            }).join('') +
            '<td class="ip-mx-cell ip-mx-total num">' + grand + '</td></tr>';

        el.innerHTML =
            '<div class="s2-table-scroll ip-mx-scroll">' +
            '<table class="data-table ip-matrix">' +
            '<caption class="sr-only">Self-selected organisation type against audited ' +
            'class, ' + grand + ' named filings</caption>' +
            '<thead>' + head + '</thead><tbody>' + body + '</tbody><tfoot>' + foot +
            '</tfoot></table></div>';

        var legend = document.getElementById('matrixLegend');
        if (legend) {
            legend.innerHTML =
                '<span class="legend-item"><span class="legend-dot ip-dot-held"></span>' +
                'Audited class is the direct counterpart of the claim</span>' +
                '<span class="legend-item"><span class="legend-dot ip-dot-moved"></span>' +
                'Audited class differs from that counterpart</span>' +
                '<span class="legend-item"><span class="legend-dot ip-dot-nomap"></span>' +
                '“Other” has no single counterpart, so no cell in that row is called a change' +
                '</span>';
        }
    }

    // ------------------------------------------------------------------
    // Panel 1c — drill table over the audited rows
    // ------------------------------------------------------------------
    var DRILL = { rows: [], view: [], shown: 0, page: 40, hasConfidence: false };

    function renderDrill(cfg, audit, meta) {
        var host = node(cfg.host);
        if (!host) return;
        var oLabels = labelMap(meta, 'org_type');
        var aLabels = labelMap(meta, 'audited_class');
        var rows = (audit && audit.rows) || [];

        DRILL.hasConfidence = rows.some(function(r) { return !!r.confidence; });
        DRILL.rows = rows.map(function(r) {
            var eq = EQUIVALENT[r.claimed];
            return {
                id: r.id,
                name: r.name || '',
                claimed: r.claimed,
                claimedLabel: labelFor(oLabels, r.claimed),
                audited: r.audited,
                auditedLabel: labelFor(aLabels, r.audited),
                confidence: r.confidence || '',
                basis: r.basis || '',
                moved: eq !== null && eq !== undefined && eq !== r.audited
            };
        });

        // Filter controls, built from the classes actually present.
        var claimedOpts = uniqueSorted(DRILL.rows, 'claimed', 'claimedLabel');
        var auditedOpts = uniqueSorted(DRILL.rows, 'audited', 'auditedLabel');
        var controls = node(cfg.controls);
        if (controls) {
            controls.innerHTML =
                '<div class="s2-control"><label class="s2-control-label" for="drillSearch">' +
                'Search organisation or basis</label>' +
                '<input class="s2-input" id="drillSearch" type="search" ' +
                'placeholder="e.g. association, Ltd, registry" autocomplete="off"></div>' +
                '<div class="s2-control"><label class="s2-control-label" for="drillClaimed">' +
                'Claimed type</label><select class="s2-select" id="drillClaimed">' +
                '<option value="">All claimed types</option>' + claimedOpts + '</select></div>' +
                '<div class="s2-control"><label class="s2-control-label" for="drillAudited">' +
                'Audited class</label><select class="s2-select" id="drillAudited">' +
                '<option value="">All audited classes</option>' + auditedOpts + '</select></div>' +
                '<div class="s2-control"><span class="s2-control-label">Rows</span>' +
                '<div class="toggle-btn-group" role="group" aria-label="Which rows to list">' +
                '<button type="button" id="drillMoved" class="active" aria-pressed="true">' +
                'Reclassified only</button>' +
                '<button type="button" id="drillAll" aria-pressed="false">All named filings' +
                '</button></div></div>';

            ['drillSearch', 'drillClaimed', 'drillAudited'].forEach(function(id) {
                var elx = document.getElementById(id);
                if (elx) elx.addEventListener('input', function() { applyDrill(cfg); });
            });
            var mv = document.getElementById('drillMoved');
            var al = document.getElementById('drillAll');
            if (mv && al) {
                mv.addEventListener('click', function() { setMovedOnly(cfg, true); });
                al.addEventListener('click', function() { setMovedOnly(cfg, false); });
            }
        }

        DRILL.movedOnly = true;
        applyDrill(cfg);
    }

    function uniqueSorted(rows, key, labelKey) {
        var seen = {};
        rows.forEach(function(r) { seen[r[key]] = r[labelKey]; });
        return Object.keys(seen).sort(function(a, b) {
            return String(seen[a]).localeCompare(String(seen[b]));
        }).map(function(k) {
            return '<option value="' + esc(k) + '">' + esc(seen[k]) + '</option>';
        }).join('');
    }

    function setMovedOnly(cfg, on) {
        DRILL.movedOnly = on;
        var mv = document.getElementById('drillMoved');
        var al = document.getElementById('drillAll');
        if (mv) { mv.classList.toggle('active', on); mv.setAttribute('aria-pressed', String(on)); }
        if (al) { al.classList.toggle('active', !on); al.setAttribute('aria-pressed', String(!on)); }
        applyDrill(cfg);
    }

    function applyDrill(cfg) {
        var q = (document.getElementById('drillSearch') || {}).value || '';
        var cSel = (document.getElementById('drillClaimed') || {}).value || '';
        var aSel = (document.getElementById('drillAudited') || {}).value || '';
        var needle = q.trim().toLowerCase();

        DRILL.view = DRILL.rows.filter(function(r) {
            if (DRILL.movedOnly && !r.moved) return false;
            if (cSel && r.claimed !== cSel) return false;
            if (aSel && r.audited !== aSel) return false;
            if (needle && (r.name + ' ' + r.basis).toLowerCase().indexOf(needle) < 0) return false;
            return true;
        }).sort(function(a, b) {
            return a.claimedLabel.localeCompare(b.claimedLabel) ||
                a.auditedLabel.localeCompare(b.auditedLabel) ||
                a.name.localeCompare(b.name);
        });
        DRILL.shown = Math.min(DRILL.page, DRILL.view.length);
        paintDrill(cfg);
    }

    function paintDrill(cfg) {
        var host = node(cfg.host);
        if (!host) return;
        var showConf = DRILL.hasConfidence;

        if (!DRILL.view.length) {
            host.innerHTML = '<p class="s2-empty">No named filing matches these filters.</p>';
            setStatus(cfg, 0);
            setMore(cfg);
            return;
        }

        var head = '<tr><th scope="col">Organisation (as filed)</th>' +
            '<th scope="col">Claimed</th><th scope="col">Audited</th>' +
            (showConf ? '<th scope="col">Confidence</th>' : '') +
            '<th scope="col">Basis for the audited class</th></tr>';

        var body = DRILL.view.slice(0, DRILL.shown).map(function(r) {
            return '<tr>' +
                '<td class="ip-drill-name">' + esc(r.name) +
                (r.moved ? '' : ' ' + chip('claim held', 'ip-tag-held',
                    'Audited class is the direct counterpart of the claim')) + '</td>' +
                '<td class="ip-drill-claimed">' + esc(r.claimedLabel) + '</td>' +
                '<td class="ip-drill-audited">' + esc(r.auditedLabel) + '</td>' +
                (showConf ? '<td class="ip-drill-conf">' +
                    chip(r.confidence, 'ip-conf-' + esc(r.confidence)) + '</td>' : '') +
                '<td class="ip-drill-basis">' + esc(r.basis) + '</td>' +
                '</tr>';
        }).join('');

        host.innerHTML =
            '<div class="s2-table-scroll"><table class="data-table ip-drill-table">' +
            '<caption class="sr-only">Named filings with their claimed organisation type, ' +
            'audited class and the basis recorded for it</caption>' +
            '<thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
        setStatus(cfg, DRILL.view.length);
        setMore(cfg);
    }

    function setStatus(cfg, total) {
        var s = node(cfg.status);
        if (!s) return;
        var scope = DRILL.movedOnly
            ? 'filings whose audited class differs from the counterpart of their claim'
            : 'named filings';
        s.textContent = 'Showing ' + Math.min(DRILL.shown, total) + ' of ' + total + ' ' +
            scope + ' (' + DRILL.rows.length + ' named filings audited in total).';
    }

    function setMore(cfg) {
        var m = node(cfg.more);
        if (!m) return;
        if (DRILL.shown >= DRILL.view.length) { m.innerHTML = ''; return; }
        var left = DRILL.view.length - DRILL.shown;
        m.innerHTML = '<button type="button" class="btn-pill" id="drillMore">Show ' +
            Math.min(DRILL.page, left) + ' more</button>';
        var b = document.getElementById('drillMore');
        if (b) b.addEventListener('click', function() {
            DRILL.shown = Math.min(DRILL.shown + DRILL.page, DRILL.view.length);
            paintDrill(cfg);
            var tbl = node(cfg.host);
            var rows = tbl ? tbl.querySelectorAll('tbody tr') : [];
            if (rows.length) rows[Math.max(0, DRILL.shown - DRILL.page)].scrollIntoView(
                { block: 'center', behavior: 'auto' });
        });
    }

    function renderDrillNote(el) {
        el = node(el);
        if (!el) return;
        var pairs = Object.keys(EQUIVALENT).sort().map(function(k) {
            return k.replace(/_/g, ' ') + ' → ' +
                (EQUIVALENT[k] === null ? 'no counterpart' : EQUIVALENT[k].replace(/_/g, ' '));
        }).join('; ');
        el.innerHTML =
            '<strong>How “reclassified” is defined here.</strong> A filing counts as reclassified ' +
            'when its audited class is not the direct counterpart of the type it selected. The ' +
            'mapping is fixed and printed here so the filter can be checked: ' + esc(pairs) + '. ' +
            '“Other” has no counterpart, so nothing claimed as Other is called a change. ' +
            (DRILL.hasConfidence ? '' :
                '<br><strong>Confidence is not published.</strong> The audit source ' +
                '(<code>reference/org_audit.csv</code>) records a high/medium/low confidence per ' +
                'row, but the exported <code>audit.json</code> contract in PLAN §5 does not carry ' +
                'the field, so this table cannot show it. The column appears automatically if a ' +
                'later export adds <code>confidence</code> to each row.');
    }

    // ------------------------------------------------------------------
    // Panel 2 — coordinated blocs
    // ------------------------------------------------------------------
    function sigArray(sig) {
        // blocs use a 7-length array with nulls; vector_clusters use either an
        // array or a string like "5545544" / "11---55".
        if (Array.isArray(sig)) return sig;
        if (typeof sig === 'string') {
            return sig.split('').map(function(c) { return c === '-' ? null : Number(c); });
        }
        return [];
    }

    function sigKey(sig) {
        return sigArray(sig).map(function(v) {
            return v === null || v === undefined ? '-' : v;
        }).join('');
    }

    // Link a bloc to identical-vector clusters only when the cluster's named
    // members are a subset of the bloc's named members. A signature match alone
    // is not treated as evidence of the same group.
    function vectorRunsFor(bloc, clusters) {
        var ids = {};
        (bloc.members_named || []).forEach(function(m) { ids[m.id] = true; });
        if (!Object.keys(ids).length) return [];
        return (clusters.vector_clusters || []).filter(function(vc) {
            var named = vc.ids_named || [];
            return named.length && named.every(function(i) { return ids[i]; });
        }).sort(function(a, b) { return (b.length || 0) - (a.length || 0); });
    }

    function renderBlocs(el, clusters, audit, meta) {
        el = node(el);
        if (!el) return;
        var blocs = (clusters && clusters.blocs) || [];
        if (!blocs.length) {
            el.innerHTML = '<p class="s2-empty">clusters.json lists no blocs.</p>';
            return;
        }
        var aLabels = labelMap(meta, 'audited_class');
        var auditById = {};
        ((audit && audit.rows) || []).forEach(function(r) { auditById[r.id] = r; });

        // Largest bloc first; every bloc gets the same fields and the same
        // treatment regardless of which way its signature points.
        var sorted = blocs.slice().sort(function(a, b) {
            return size(b) - size(a) || String(a.key).localeCompare(String(b.key));
        });

        el.innerHTML = sorted.map(function(b) {
            var named = b.members_named || [];
            var red = b.n_redacted || 0;
            var total = named.length + red;
            var sig = sigArray(b.signature);
            var agreed = sig.filter(function(v) { return v !== null && v !== undefined; }).length;
            var runs = vectorRunsFor(b, clusters);

            // Audited-class mix of the named members — the factual answer to
            // "what do these filings have in common", straight from audit.json.
            var mix = {};
            named.forEach(function(m) {
                var row = auditById[m.id];
                if (row) mix[row.audited] = (mix[row.audited] || 0) + 1;
            });
            var mixChips = Object.keys(mix).sort(function(x, y) {
                return mix[y] - mix[x] || x.localeCompare(y);
            }).map(function(k) {
                return chip(labelFor(aLabels, k) + ' ' + mix[k], 'ip-tag-class',
                    'Audited class of ' + mix[k] + ' named member(s)');
            }).join('');

            var memberChips = named.map(function(m) {
                return chip(m.name, 'ip-tag-member', 'Respondent ' + m.id);
            }).join('') + (red ? chip('+' + red + ' redacted', 'ip-tag-redacted',
                red + ' member(s) withheld their identity and are counted, not named') : '');

            var runText = runs.length
                ? runs.map(function(r) {
                    return (r.length || 0) + ' items' +
                        (r.cluster_id ? ' (' + r.cluster_id + ')' : '');
                  }).join(' · ')
                : 'none matched by member id';

            return '<article class="card ip-bloc scroll-reveal">' +
                '<header class="ip-bloc-head">' +
                '<h3 class="ip-bloc-title">' + esc(b.label || b.key) + '</h3>' +
                chip(b.key, 's2-tag-bloc', 'clusters.json bloc key') +
                '</header>' +

                '<div class="ip-bloc-count"><span class="ip-bloc-n">' + total + '</span>' +
                '<span class="ip-bloc-n-label">filings — ' + named.length + ' named' +
                (red ? ', +' + red + ' redacted' : '') + '</span></div>' +

                '<div class="ip-sig">' +
                '<div class="ip-sig-label">Shared 7-anchor signature</div>' +
                sparkStrip(sig, { naTitle: 'members do not share one value' }) +
                '<div class="ip-sig-read">' + agreed + ' of 7 anchors identical across ' +
                'members' + (agreed < 7 ? '; hatched bars are anchors where they differ or ' +
                'did not all answer' : '') + '</div>' +
                '</div>' +

                '<dl class="ip-bloc-metrics">' +
                '<div><dt>Shared verbatim texts</dt><dd class="num">' +
                (b.shared_texts === undefined ? '—' : b.shared_texts) + '</dd></div>' +
                '<div><dt>Identical-vector run</dt><dd>' + esc(runText) + '</dd></div>' +
                '</dl>' +

                '<div class="ip-bloc-block"><div class="ip-bloc-sub">Members</div>' +
                '<div class="ip-chips">' + (memberChips ||
                    '<span class="s2-tag-none">No named members</span>') + '</div></div>' +

                (mixChips ? '<div class="ip-bloc-block"><div class="ip-bloc-sub">Audited ' +
                    'classes of the named members</div><div class="ip-chips">' + mixChips +
                    '</div></div>' : '') +

                '<p class="ip-bloc-interest">' + esc(BLOC_INTEREST[b.key] ||
                    ('Members share ' + (b.shared_texts || 0) + ' clustered verbatim texts and ' +
                     agreed + ' of 7 identical anchor answers.')) + '</p>' +
                '</article>';
        }).join('');

        function size(b) { return (b.members_named || []).length + (b.n_redacted || 0); }
    }

    function renderBlocLegend(el) {
        el = node(el);
        if (!el) return;
        el.innerHTML = ANCHORS.map(function(a, i) {
            return '<span class="legend-item ip-anchor-key"><span class="ip-anchor-i">' +
                (i + 1) + '</span>Q' + a.q + ' ' + esc(a.label) +
                '<span class="ip-anchor-kind ip-anchor-' + a.kind + '">' +
                (a.kind === 'requirement' ? 'requirement' : 'flexibility') + '</span></span>';
        }).join('');
    }

    // ------------------------------------------------------------------
    // Panel 3 — template prevalence
    // ------------------------------------------------------------------
    function renderTemplateStats(el, clusters, respondents, meta) {
        el = node(el);
        if (!el) return;
        var tc = (clusters && clusters.text_clusters) || [];
        var oi = (respondents && respondents.org_index) || [];
        var namedTemplate = oi.filter(function(r) { return r.template; }).length;
        var totalResp = (meta && meta.totals && meta.totals.respondents) || 0;
        var namedTotal = (meta && meta.totals && meta.totals.named) || oi.length;
        var largest = tc.reduce(function(m, c) {
            return Math.max(m, c.n_respondents || 0);
        }, 0);
        var memberships = tc.reduce(function(t, c) { return t + (c.n_respondents || 0); }, 0);

        var cards = [
            { v: num(namedTemplate) + ' of ' + num(namedTotal),
              l: 'Named respondents sharing verbatim text with others',
              d: pct(namedTemplate, namedTotal) + ' of named filings' },
            { v: num(tc.length),
              l: 'Distinct shared strings of 200+ characters',
              d: num(memberships) + ' cluster memberships across them' },
            { v: num(largest),
              l: 'Respondents in the largest single shared string',
              d: 'One answer, filed verbatim ' + largest + ' times' },
            { v: num(totalResp),
              l: 'Filings in the consultation',
              d: 'The denominator for every share on this page' }
        ];
        el.innerHTML = cards.map(function(c) {
            return '<div class="stat-card scroll-reveal ip-stat-neutral">' +
                '<div class="stat-value">' + esc(c.v) + '</div>' +
                '<div class="stat-label">' + c.l + '</div>' +
                '<div class="ip-stat-detail">' + esc(c.d) + '</div></div>';
        }).join('');

        var note = document.getElementById('templatePopulationNote');
        if (note) {
            note.innerHTML =
                '<strong>Why the named figure is the one shown.</strong> ' +
                num(namedTemplate) + ' of the ' + num(namedTotal) + ' named filings ' +
                '(' + pct(namedTemplate, namedTotal) + ') carry the template flag in ' +
                '<code>respondents.json</code>, and each of them can be listed. The ' +
                'population figure computed over all ' + num(totalResp) + ' filings in ' +
                '<code>data/derived/respondent_flags.csv</code> is 155 (' +
                pct(155, totalResp) + '); the 65 that are not in the named count are redacted, ' +
                'and <code>clusters.json</code> publishes redacted cluster members as counts ' +
                'only, so they cannot be enumerated or identified here.';
        }
    }

    function renderClusterTable(el, clusters, meta) {
        el = node(el);
        if (!el) return;
        var tc = ((clusters && clusters.text_clusters) || []).slice();
        if (!tc.length) {
            el.innerHTML = '<p class="s2-empty">clusters.json lists no shared strings.</p>';
            return;
        }
        var qLabels = {};
        ((meta && meta.questions) || []).forEach(function(q) {
            qLabels[q.q] = q.label || q.shorthand || '';
        });
        tc.sort(function(a, b) {
            return (b.n_respondents || 0) - (a.n_respondents || 0) ||
                (b.chars || 0) - (a.chars || 0);
        });
        var top = tc.slice(0, 12);

        var body = top.map(function(c) {
            var qs = (c.questions || []).map(function(q) {
                return chip('Q' + q, 's2-tag-q', qLabels[q] || '');
            }).join('') || '<span class="s2-tag-none">—</span>';
            return '<tr>' +
                '<td class="ip-cl-q">' + qs + '</td>' +
                '<td class="num">' + (c.n_respondents || 0) + '</td>' +
                '<td class="num">' + (c.named_members || []).length + '</td>' +
                '<td class="num">' + (c.n_redacted || 0) + '</td>' +
                '<td class="num">' + num(c.chars || 0) + '</td>' +
                '<td class="ip-cl-preview">' + esc(c.preview || '') + '</td>' +
                '</tr>';
        }).join('');

        el.innerHTML =
            '<div class="s2-table-scroll"><table class="data-table ip-cluster-table">' +
            '<caption class="sr-only">The twelve most widely shared verbatim strings</caption>' +
            '<thead><tr><th scope="col">Question</th><th scope="col">Filings</th>' +
            '<th scope="col">Named</th><th scope="col">Redacted</th>' +
            '<th scope="col">Characters</th><th scope="col">Opening of the shared text ' +
            '(normalised)</th></tr></thead><tbody>' + body + '</tbody></table></div>';

        var note = document.getElementById('clusterTableNote');
        if (note) {
            note.textContent = 'The 12 largest of ' + tc.length + ' shared strings. Previews ' +
                'are the normalised text stored in clusters.json (lower-cased, whitespace ' +
                'collapsed), truncated by the exporter.';
        }
    }

    // Q71 oppose share, computed three ways. The published figure covers every
    // filing; the two dedup figures can only be computed over named filings,
    // because a redacted respondent's own answers are not published per row.
    function renderDedup(el, respondents, likert) {
        el = node(el);
        if (!el) return;
        var cell = likert && likert['71'] && likert['71'].overall;
        var oi = (respondents && respondents.org_index) || [];
        var answered = oi.filter(function(r) {
            return r.anchors && r.anchors[0] !== null && r.anchors[0] !== undefined;
        });
        if (!answered.length) {
            el.innerHTML = '<p class="s2-empty">No named Q71 answers in respondents.json.</p>';
            return;
        }

        var namedOppose = answered.filter(function(r) { return r.anchors[0] <= 2; }).length;

        // One vote per entity family or bloc; everyone else counts once.
        var groups = {};
        answered.forEach(function(r) {
            var k = r.entity_group ? 'E:' + r.entity_group
                  : (r.bloc ? 'B:' + r.bloc : 'I:' + r.id);
            (groups[k] = groups[k] || []).push(r);
        });
        var keys = Object.keys(groups);
        var dedupOppose = 0;
        keys.forEach(function(k) {
            var v = groups[k];
            var opp = v.filter(function(r) { return r.anchors[0] <= 2; }).length;
            if (opp / v.length > 0.5) dedupOppose += 1;
        });
        var collapsed = keys.filter(function(k) { return groups[k].length > 1; });

        var pubOppose = cell ? (cell.c[0] + cell.c[1]) : null;
        var pubN = cell ? cell.n : null;

        var bars = [
            { key: 'published', label: 'As published — every filing that answered Q71',
              part: pubOppose, whole: pubN,
              note: 'The headline figure. No dedup is possible over this base.' },
            { key: 'named', label: 'Named filings only, one vote per filing',
              part: namedOppose, whole: answered.length,
              note: 'Named respondents oppose Q71 less than the consultation as a whole.' },
            { key: 'dedup', label: 'Named filings, one vote per entity family or bloc',
              part: dedupOppose, whole: keys.length,
              note: collapsed.length + ' group(s) collapsed ' + answered.length + ' filings ' +
                    'into ' + keys.length + ' votes.' }
        ];

        var maxPct = 100;
        el.innerHTML = bars.map(function(b) {
            if (b.part === null || !b.whole) {
                return '<div class="ip-dedup-row"><div class="ip-dedup-label">' + b.label +
                    '</div><div class="ip-dedup-track"><span class="s2-empty">not available' +
                    '</span></div></div>';
            }
            var p = 100 * b.part / b.whole;
            return '<div class="ip-dedup-row ip-dedup-' + b.key + '">' +
                '<div class="ip-dedup-label">' + b.label + '</div>' +
                '<div class="ip-dedup-track">' +
                '<div class="ip-dedup-fill" style="width:' + (p / maxPct * 100).toFixed(2) +
                '%"></div>' +
                '<span class="ip-dedup-val">' + p.toFixed(1) + '%</span>' +
                '</div>' +
                '<div class="ip-dedup-sub">' + b.part + ' of ' + b.whole + ' oppose (1–2). ' +
                esc(b.note) + '</div>' +
                '</div>';
        }).join('');

        var deltaEl = document.getElementById('dedupDelta');
        if (deltaEl) {
            var before = 100 * namedOppose / answered.length;
            var after = 100 * dedupOppose / keys.length;
            var d = after - before;
            var sign = d > 0 ? '+' : (d < 0 ? '−' : '±');
            deltaEl.innerHTML =
                '<div class="ip-delta-figure">' + sign + Math.abs(d).toFixed(1) +
                '<span class="ip-delta-unit">pp</span></div>' +
                '<div class="ip-delta-desc">Change in the Q71 oppose share when every entity ' +
                'family and bloc among named respondents counts once</div>' +
                '<div class="ip-delta-sub">' + before.toFixed(1) + '% → ' + after.toFixed(1) +
                '%. Collapsing duplicate filings does not rescue either side: the largest ' +
                'coordinated group at the supportive end and the largest entity family at the ' +
                'opposing end both shrink to one vote, and they nearly cancel.</div>';
        }

        // How many collapsed groups were not unanimous — computed, not asserted.
        var split = collapsed.filter(function(k) {
            var vals = groups[k].map(function(r) { return r.anchors[0]; });
            return vals.some(function(v) { return v !== vals[0]; });
        });

        var note = document.getElementById('dedupNote');
        if (note) {
            note.innerHTML =
                '<strong>What the dedup can and cannot reach.</strong> The two deduplicated ' +
                'figures cover the ' + answered.length + ' named filings that answered Q71. ' +
                'Redacted filings — ' + (pubN ? (pubN - answered.length) : 'the remainder') +
                ' of the ' + (pubN ? num(pubN) : '') + ' Q71 answers — are published only in ' +
                'aggregate, so they cannot be collapsed by family or bloc. The dedup effect on ' +
                'the published ' + (pubN ? pct(pubOppose, pubN) : '') + ' is therefore not ' +
                'measurable from this data, and no estimate of it is offered here. Groups are ' +
                'collapsed to the majority answer inside the group; ' +
                (split.length === 0
                    ? 'every collapsed group answered Q71 unanimously.'
                    : split.length + ' of the ' + collapsed.length + ' collapsed groups were ' +
                      'not unanimous (' + esc(split.map(function(k) {
                          return k.slice(2).replace(/_/g, ' ') + ': ' +
                              groups[k].map(function(r) { return r.anchors[0]; }).join('/');
                      }).join('; ')) + ').');
        }

        var listEl = document.getElementById('dedupGroups');
        if (listEl) {
            listEl.innerHTML = collapsed.sort(function(a, b) {
                return groups[b].length - groups[a].length;
            }).map(function(k) {
                var v = groups[k];
                var vals = v.map(function(r) { return r.anchors[0]; });
                var opp = vals.filter(function(x) { return x <= 2; }).length;
                return '<tr><td>' + chip(k.slice(0, 1) === 'E' ? 'family' : 'bloc',
                        k.slice(0, 1) === 'E' ? 's2-tag-family' : 's2-tag-bloc') + ' ' +
                    esc(k.slice(2).replace(/_/g, ' ')) + '</td>' +
                    '<td class="num">' + v.length + '</td>' +
                    '<td class="num">' + vals.join(', ') + '</td>' +
                    '<td>' + (opp > v.length / 2 ? 'oppose' : 'support') + '</td></tr>';
            }).join('');
        }
    }

    // ------------------------------------------------------------------
    // Panel 4 — the commercial fingerprint, presented symmetrically
    // ------------------------------------------------------------------
    var FP_SERIES = [
        { key: 'data_analytics', colorKey: 'hydro' },
        { key: 'company',        colorKey: 'solar' },
        { key: 'industry_group', colorKey: 'ldes'  }
    ];

    function fpMeans(likert, dim, key) {
        return ANCHOR_QS.map(function(q) {
            var c = likert[String(q)] && likert[String(q)][dim] &&
                    likert[String(q)][dim][key];
            return c && c.mean !== undefined ? c.mean : null;
        });
    }

    function fpNs(likert, dim, key) {
        return ANCHOR_QS.map(function(q) {
            var c = likert[String(q)] && likert[String(q)][dim] &&
                    likert[String(q)][dim][key];
            return c && c.n !== undefined ? c.n : null;
        });
    }

    function renderFingerprint(cfg, likert, meta) {
        var oLabels = labelMap(meta, 'org_type');
        var aLabels = labelMap(meta, 'audited_class');

        // `overall` is a bare CELL, not a keyed segment — read it directly.
        var overall = ANCHOR_QS.map(function(q) {
            var c = likert[String(q)] && likert[String(q)].overall;
            return c && c.mean !== undefined ? c.mean : null;
        });

        // --- chart ---
        var canvas = node(cfg.canvas);
        if (canvas && window.Chart) {
            var datasets = FP_SERIES.map(function(s) {
                var color = RESOURCE_COLORS[s.colorKey];
                return {
                    label: labelFor(oLabels, s.key),
                    data: fpMeans(likert, 'org_type', s.key),
                    borderColor: color,
                    backgroundColor: withAlpha(color, 0.12),
                    pointBackgroundColor: color,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 2.5,
                    tension: 0.25,
                    fill: false,
                    spanGaps: true
                };
            });
            datasets.push({
                label: 'All respondents',
                data: overall,
                borderColor: SEMANTIC_COLORS.muted,
                backgroundColor: withAlpha(SEMANTIC_COLORS.muted, 0.1),
                pointRadius: 0,
                borderWidth: 1.5,
                borderDash: [5, 4],
                tension: 0.25,
                fill: false,
                spanGaps: true
            });

            new Chart(canvas, {
                type: 'line',
                data: {
                    labels: ANCHORS.map(function(a) { return 'Q' + a.q + ' ' + a.label; }),
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    layout: { padding: { left: 6, right: 10, bottom: 4 } },
                    scales: {
                        y: {
                            min: 1, max: 5,
                            ticks: { stepSize: 1 },
                            title: { display: true, text: 'Mean support (1–5)' }
                        },
                        x: {
                            ticks: {
                                autoSkip: false,
                                maxRotation: 30,
                                minRotation: 30,
                                // Two short lines beat one long rotated label.
                                callback: function(_v, i) {
                                    return ['Q' + ANCHORS[i].q, ANCHORS[i].label];
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: { display: true, position: 'bottom' },
                        tooltip: {
                            callbacks: {
                                afterBody: function(items) {
                                    var i = items[0].dataIndex;
                                    return ANCHORS[i].kind === 'requirement'
                                        ? 'Adds a requirement'
                                        : 'Relaxes a requirement';
                                }
                            }
                        }
                    }
                }
            });
        }

        // --- accessible table behind the chart, plus the mirrored readouts ---
        var tbl = node(cfg.table);
        if (tbl) {
            var seriesRows = FP_SERIES.concat([{ key: null }]).map(function(s) {
                var label = s.key ? labelFor(oLabels, s.key) : 'All respondents';
                var means = s.key ? fpMeans(likert, 'org_type', s.key) : overall;
                var ns = s.key ? fpNs(likert, 'org_type', s.key)
                       : ANCHOR_QS.map(function(q) {
                           var c = likert[String(q)] && likert[String(q)].overall;
                           return c ? c.n : null;
                         });
                return '<tr><th scope="row">' + esc(label) + '</th>' +
                    means.map(function(m, i) {
                        return '<td class="num">' + (m === null ? '—' : m.toFixed(2)) +
                            '<span class="ip-fp-n">n=' + (ns[i] === null ? '—' : ns[i]) +
                            '</span></td>';
                    }).join('') + '</tr>';
            }).join('');
            tbl.innerHTML =
                '<div class="s2-table-scroll"><table class="data-table ip-fp-table">' +
                '<caption class="sr-only">Mean support for each of the seven MBM anchors by ' +
                'self-selected organisation type</caption>' +
                '<thead><tr><th scope="col">Organisation type</th>' +
                ANCHORS.map(function(a) {
                    return '<th scope="col">Q' + a.q + '<span class="ip-fp-qlabel">' +
                        esc(a.label) + '</span><span class="ip-fp-kind ip-anchor-' + a.kind +
                        '">' + (a.kind === 'requirement' ? 'requirement' : 'flexibility') +
                        '</span></th>';
                }).join('') + '</tr></thead><tbody>' + seriesRows + '</tbody></table></div>';
        }

        // --- the two mirrored halves ---
        var mirror = node(cfg.mirror);
        if (mirror) {
            var dv = fpMeans(likert, 'org_type', 'data_analytics');
            var dvN = fpNs(likert, 'org_type', 'data_analytics');
            var co = fpMeans(likert, 'org_type', 'company');
            var coN = fpNs(likert, 'org_type', 'company');
            var ig = fpMeans(likert, 'org_type', 'industry_group');
            var igN = fpNs(likert, 'org_type', 'industry_group');
            var dvA = fpMeans(likert, 'audited_class', 'data_vendor');
            var coA = fpMeans(likert, 'audited_class', 'company');

            mirror.innerHTML =
                side({
                    cls: 'ip-mirror-a',
                    title: labelFor(oLabels, 'data_analytics'),
                    lede: 'Sells the tooling that hourly matching would require.',
                    hi: [
                        { l: 'Q71 hourly matching', v: dv[0], n: dvN[0] },
                        { l: 'Q83 deliverability',  v: dv[1], n: dvN[1] }
                    ],
                    lo: [
                        { l: 'Q153 exemptions',     v: dv[5], n: dvN[5] },
                        { l: 'Q171 legacy clause',  v: dv[6], n: dvN[6] }
                    ],
                    read: 'The only organisation type that supports the two matching ' +
                          'requirements while being cooler than average on the two ways out of ' +
                          'them. Audited as ' + labelFor(aLabels, 'data_vendor') + ' the shape ' +
                          'holds: ' + fmt(dvA[0]) + ' on Q71, ' + fmt(dvA[5]) + ' on Q153, ' +
                          fmt(dvA[6]) + ' on Q171.'
                }) +
                side({
                    cls: 'ip-mirror-b',
                    title: labelFor(oLabels, 'company') + ' · ' + labelFor(oLabels, 'industry_group'),
                    lede: 'Would buy that tooling, and holds existing certificate claims.',
                    series: 'companies',
                    series2: 'industry groups',
                    hi: [
                        { l: 'Q153 exemptions',    v: co[5], n: coN[5], v2: ig[5], n2: igN[5] },
                        { l: 'Q171 legacy clause', v: co[6], n: coN[6], v2: ig[6], n2: igN[6] }
                    ],
                    lo: [
                        { l: 'Q71 hourly matching', v: co[0], n: coN[0], v2: ig[0], n2: igN[0] },
                        { l: 'Q83 deliverability',  v: co[1], n: coN[1], v2: ig[1], n2: igN[1] }
                    ],
                    read: 'The exact mirror: the two requirements rejected, the two escape ' +
                          'hatches embraced. Audited as ' + labelFor(aLabels, 'company') +
                          ' the shape holds: ' + fmt(coA[0]) + ' on Q71, ' + fmt(coA[5]) +
                          ' on Q153, ' + fmt(coA[6]) + ' on Q171.'
                });
        }

        var note = node(cfg.note);
        if (note) {
            var dvn = fpNs(likert, 'org_type', 'data_analytics');
            note.innerHTML =
                '<strong>Read symmetrically.</strong> Both patterns track commercial interest, ' +
                'and neither is evidence that the position is wrong. A vendor supporting a ' +
                'requirement it would be paid to meet and a reporter opposing a requirement it ' +
                'would pay to meet are the same kind of fact about incentives, reported the ' +
                'same way here. Neither figure says whether hourly matching improves Scope 2 ' +
                'accounting; that question is settled by evidence, not by who benefits. ' +
                '<strong>Small n:</strong> the data/analytics column rests on ' +
                Math.min.apply(null, dvn.filter(function(x) { return x !== null; })) + '–' +
                Math.max.apply(null, dvn.filter(function(x) { return x !== null; })) +
                ' answers per anchor against ' +
                num(Math.max.apply(null, fpNs(likert, 'org_type', 'company')
                    .filter(function(x) { return x !== null; }))) +
                ' for companies, so its means move on a handful of responses.';
        }

        function fmt(v) { return v === null || v === undefined ? '—' : Number(v).toFixed(2); }

        function side(o) {
            function rows(list, dir) {
                return list.map(function(r) {
                    // When a card covers two org types, name both series so the
                    // headline number is never ambiguous about whose it is.
                    var who = o.series ? ' <em>' + esc(o.series) + '</em>' : '';
                    var second = r.v2 !== undefined
                        ? '<span class="ip-mirror-second">' + fmt(r.v2) + ' <em>' +
                          esc(o.series2 || 'industry groups') + '</em> (n=' +
                          (r.n2 === null ? '—' : r.n2) + ')</span>' : '';
                    return '<li class="ip-mirror-item ip-mirror-' + dir + '">' +
                        '<span class="ip-mirror-metric">' + fmt(r.v) + '</span>' +
                        '<span class="ip-mirror-metric-label">' + esc(r.l) + who +
                        ' <em>(n=' + (r.n === null ? '—' : r.n) + ')</em></span>' +
                        second + '</li>';
                }).join('');
            }
            return '<div class="card ip-mirror-card ' + o.cls + ' scroll-reveal">' +
                '<h3 class="ip-mirror-title">' + esc(o.title) + '</h3>' +
                '<p class="ip-mirror-lede">' + esc(o.lede) + '</p>' +
                '<div class="ip-mirror-group"><div class="ip-bloc-sub">Most supportive of</div>' +
                '<ul class="ip-mirror-list">' + rows(o.hi, 'hi') + '</ul></div>' +
                '<div class="ip-mirror-group"><div class="ip-bloc-sub">Least supportive of</div>' +
                '<ul class="ip-mirror-list">' + rows(o.lo, 'lo') + '</ul></div>' +
                '<p class="ip-mirror-read">' + o.read + '</p>' +
                '</div>';
        }
    }

    // ------------------------------------------------------------------
    // Panel 5 — entity families
    // ------------------------------------------------------------------
    function renderFamilies(cfg, clusters, respondents, meta) {
        var fams = ((clusters && clusters.entity_families) || []).slice();
        var oi = (respondents && respondents.org_index) || [];
        var byId = {};
        oi.forEach(function(r) { byId[r.id] = r; });
        var aLabels = labelMap(meta, 'audited_class');
        var cLabels = labelMap(meta, 'country');
        var totalResp = (meta && meta.totals && meta.totals.respondents) || 0;

        var filings = fams.reduce(function(t, f) { return t + (f.n || 0); }, 0);
        var surplus = filings - fams.length;

        var head = node(cfg.callout);
        if (head) {
            head.innerHTML =
                '<div class="emphasis-big">' + num(totalResp) + ' ≠ ' + num(totalResp) + '</div>' +
                '<div class="emphasis-desc">' + num(totalResp) + ' filings are not ' +
                num(totalResp) + ' independent entities</div>' +
                '<div class="emphasis-sub">Among named respondents alone, ' + filings +
                ' filings come from ' + fams.length + ' parent organisations — ' + surplus +
                ' fewer distinct entities than the filing count implies. One electronics group ' +
                'filed ' + (fams.length ? Math.max.apply(null, fams.map(function(f) {
                    return f.n || 0;
                })) : 0) + ' times. Redacted filings cannot be grouped at all, so the true ' +
                'number of distinct entities behind ' + num(totalResp) + ' filings is lower ' +
                'than any figure on this page.</div>';
        }

        var tbl = node(cfg.table);
        if (tbl) {
            if (!fams.length) {
                tbl.innerHTML = '<p class="s2-empty">clusters.json lists no entity families.</p>';
            } else {
                fams.sort(function(a, b) {
                    return (b.n || 0) - (a.n || 0) || String(a.name).localeCompare(String(b.name));
                });
                var body = fams.map(function(f) {
                    var members = (f.ids || []).map(function(i) { return byId[i]; })
                        .filter(Boolean);
                    var names = members.map(function(m) {
                        return chip(m.name, 'ip-tag-member', 'Respondent ' + m.id);
                    }).join('');
                    var missing = (f.ids || []).length - members.length;
                    var classes = {};
                    members.forEach(function(m) {
                        classes[m.audited_class] = (classes[m.audited_class] || 0) + 1;
                    });
                    var countries = {};
                    members.forEach(function(m) {
                        countries[m.country] = (countries[m.country] || 0) + 1;
                    });
                    return '<tr>' +
                        '<td class="ip-fam-name">' +
                        esc(String(f.name).replace(/_/g, ' ')) + '</td>' +
                        '<td class="num">' + (f.n || 0) + '</td>' +
                        '<td>' + Object.keys(classes).sort(function(x, y) {
                            return classes[y] - classes[x];
                        }).map(function(k) {
                            return chip(labelFor(aLabels, k) + ' ' + classes[k], 'ip-tag-class');
                        }).join('') + '</td>' +
                        '<td>' + Object.keys(countries).sort(function(x, y) {
                            return countries[y] - countries[x];
                        }).map(function(k) {
                            var full = labelFor(cLabels, k);
                            return chip(compact(full) + ' ' + countries[k], 'ip-tag-geo', full);
                        }).join('') + '</td>' +
                        '<td class="ip-fam-members">' + names +
                        (missing > 0 ? chip('+' + missing + ' not in the org index',
                            's2-tag-none') : '') + '</td>' +
                        '</tr>';
                }).join('');
                tbl.innerHTML =
                    '<div class="s2-table-scroll"><table class="data-table ip-fam-table">' +
                    '<caption class="sr-only">Named respondents grouped into entity ' +
                    'families</caption>' +
                    '<thead><tr><th scope="col">Family</th><th scope="col">Filings</th>' +
                    '<th scope="col">Audited classes</th><th scope="col">Countries</th>' +
                    '<th scope="col">Filed as</th></tr></thead><tbody>' + body +
                    '</tbody></table></div>';
            }
        }

        var note = node(cfg.note);
        if (note) {
            // Families where every named filing carries the same organisation
            // string — a repeated name, which the data shows and nothing more.
            var sameName = fams.filter(function(f) {
                var ms = (f.ids || []).map(function(i) { return byId[i]; }).filter(Boolean);
                return ms.length > 1 && ms.every(function(m) { return m.name === ms[0].name; });
            }).map(function(f) { return String(f.name).replace(/_/g, ' '); });

            note.innerHTML =
                'Families are the curated name map in ' +
                '<code>scripts/analytics/derive_flags.py</code>, published in ' +
                '<code>clusters.json</code>. Filing separately is normal and permitted — a ' +
                'subsidiary with its own load and its own inventory has its own view. The point ' +
                'is arithmetic, not conduct: counts of filings are not counts of organisations, ' +
                'and any “N respondents said X” claim has to say which it means. ' +
                (sameName.length
                    ? sameName.length + ' famil' + (sameName.length === 1 ? 'y' : 'ies') +
                      ' here (' + esc(sameName.join(', ')) + ') filed more than once under an ' +
                      'identical organisation name.'
                    : 'No family here filed twice under an identical organisation name.');
        }
    }

    // ------------------------------------------------------------------
    // Boot
    // ------------------------------------------------------------------
    function clearLoading(text) {
        Array.prototype.forEach.call(
            document.querySelectorAll('.s2-loading'),
            function(n) {
                if (text) { n.textContent = text; n.classList.remove('s2-loading'); n.className += ' s2-empty'; }
                else if (n.parentNode) { n.parentNode.removeChild(n); }
            });
    }

    function boot() {
        var errHost = document.getElementById('integrityError');
        S2Data.withData(errHost, ['audit', 'clusters', 'respondents', 'likert', 'meta'],
            function(d) {
                renderProvisional('provisionalBanner', d.audit);

                renderLeadStats('leadStats', d.audit, d.meta);
                renderMatrix('matrixPanel', d.audit, d.meta);
                renderDrill({
                    host: 'drillTable', controls: 'drillControls',
                    status: 'drillStatus', more: 'drillMore'
                }, d.audit, d.meta);
                renderDrillNote('drillNote');

                renderBlocLegend('blocLegend');
                renderBlocs('blocGrid', d.clusters, d.audit, d.meta);

                renderTemplateStats('templateStats', d.clusters, d.respondents, d.meta);
                renderClusterTable('clusterTable', d.clusters, d.meta);
                renderDedup('dedupChart', d.respondents, d.likert);

                renderFingerprint({
                    canvas: 'fingerprintChart', table: 'fingerprintTable',
                    mirror: 'fingerprintMirror', note: 'fingerprintNote'
                }, d.likert, d.meta);

                renderFamilies({
                    callout: 'familyCallout', table: 'familyTable', note: 'familyNote'
                }, d.clusters, d.respondents, d.meta);

                // scroll-observer.js already watches for injected .scroll-reveal
                // nodes via MutationObserver, so nothing to re-arm here. Any
                // loading placeholder still standing belongs to a container that
                // rendered nothing — clear it so no spinner text is left behind.
                clearLoading(null);
            })
            // withData() has already rendered the visible error panel and
            // re-thrown. Turn the remaining "Loading…" lines into a matching
            // message so no panel is left claiming work is still in progress.
            .catch(function() {
                clearLoading('Not loaded — see the error above.');
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
