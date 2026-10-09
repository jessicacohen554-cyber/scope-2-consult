// ============================================================================
// Standard Supply Service: feasibility & opposition page
// ============================================================================
// Site-specific module. Renders data/sss.json (written by
// scripts/analytics/sss.py export).
// ============================================================================

(function () {
    'use strict';

    var S = function () { return SEMANTIC_COLORS; };

    var THEME_LABEL = {
        definition: 'Unclear what qualifies',
        data: 'No supplier data or registry',
        market_fit: 'Does not fit our market',
        comparability: 'Uneven across regions',
        double_count: 'Overlap with EACs / residual mix',
        cost_allocation: 'Who pays ≠ who claims',
        burden: 'Complexity and audit burden',
        interaction: 'Compounds with hourly / deliverability',
        crowd_out: 'Crowds out voluntary procurement',
        blurs_lbm: 'Blurs location- and market-based',
        not_customer_claim: 'Not the customer\'s to claim',
        regional_windfall: 'Windfall for clean-grid regions',
        too_weak: 'Too weak as incrementality test',
        phase_in: 'Phase in / transition',
        disclose: 'Disclose SSS separately',
        self_estimate: 'Let reporters estimate their share',
        optional: 'Make SSS claims optional',
        vintage: 'Asset-age rule',
        registry_first: 'Registry before claims',
        guidance: 'Region-specific guidance',
        drop: 'Drop SSS'
    };
    var TEXT_STANCE = [
        { k: 'support', label: 'Supports SSS', color: function () { return S().positive; } },
        { k: 'conditional', label: 'Conditional', color: function () { return S().warning; } },
        { k: 'oppose', label: 'Opposes SSS', color: function () { return S().negative; } },
        { k: 'neutral', label: 'No stance', color: function () { return withAlpha(S().muted, 0.5); } }
    ];
    var Q97_PARTS = [
        { k: 'support', label: 'Support (4–5)', color: function () { return S().positive; } },
        { k: 'neutral', label: 'Neutral (3)', color: function () { return S().muted; } },
        { k: 'oppose', label: 'Oppose (1–2)', color: function () { return S().negative; } }
    ];

    function pct(n, d) { return d ? (100 * n / d).toFixed(1) + '%' : '—'; }
    function pct0(n, d) { return d ? Math.round(100 * n / d) + '%' : '—'; }
    function esc(s) {
        return String(s).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }
    function set(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; }

    function hbar(id, labels, datasets, opts) {
        opts = opts || {};
        return new Chart(document.getElementById(id), {
            type: 'bar',
            data: { labels: labels, datasets: datasets },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: opts.legend !== false, position: 'bottom' },
                    tooltip: { callbacks: { label: opts.label } }
                },
                scales: {
                    x: { stacked: !!opts.stacked, max: opts.max, beginAtZero: true,
                         ticks: { callback: opts.tick || function (v) { return v; } } },
                    y: { stacked: !!opts.stacked }
                }
            }
        });
    }

    // 100%-stacked bar of Q97 stance for a list of {label, answered, support, neutral, oppose}
    function stanceBars(id, rows) {
        return hbar(id, rows.map(function (r) { return r.label + ' (n=' + r.answered + ')'; }),
            Q97_PARTS.map(function (p) {
                return {
                    label: p.label, backgroundColor: p.color(),
                    data: rows.map(function (r) { return +(100 * r[p.k] / r.answered).toFixed(1); }),
                    _n: rows.map(function (r) { return r[p.k]; })
                };
            }), {
                stacked: true, max: 100,
                tick: function (v) { return v + '%'; },
                label: function (c) { return c.dataset.label + ': ' + c.dataset._n[c.dataIndex] + ' (' + c.parsed.x + '%)'; }
            });
    }

    function toggles(id, options, onPick) {
        var el = document.getElementById(id);
        el.innerHTML = '';
        options.forEach(function (o, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.textContent = o.label;
            b.classList.toggle('active', i === 0);
            b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
            b.addEventListener('click', function () {
                Array.prototype.forEach.call(el.children, function (x) {
                    x.classList.remove('active');
                    x.setAttribute('aria-pressed', 'false');
                });
                b.classList.add('active');
                b.setAttribute('aria-pressed', 'true');
                onPick(o.key);
            });
            el.appendChild(b);
        });
    }

    // --- Headline ----------------------------------------------------------
    function renderStats(d) {
        var q = d.q97;
        set('statQ97', pct0(q.support, q.answered) + ' <span class="s2-note">support · ' + pct0(q.oppose, q.answered) + ' oppose</span>');
        set('statQ97sub', q.support + ' support, ' + q.neutral + ' neutral, ' + q.oppose + ' oppose of ' + q.answered + ' who answered Q97');
        set('statConcern', d.q100.supporters_with_concerns + ' <span class="s2-note">of ' + q.support + ' · ' +
            pct(d.q100.supporters_with_concerns, q.support) + '</span>');
        var feas = d.themes.challenges.filter(function (t) { return t.key === 'definition'; })[0];
        set('statDef', feas.n + ' <span class="s2-note">of ' + d.totals.substantive + ' · ' + pct(feas.n, d.totals.substantive) + '</span>');
        var jp = d.segments.country.filter(function (r) { return r.label === 'Japan'; })[0];
        if (jp) set('statJapan', pct0(jp.oppose, jp.answered) + ' <span class="s2-note">oppose · n=' + jp.answered + '</span>');
    }

    // --- Who opposes ---------------------------------------------------------
    function renderSegments(d) {
        var chart = null;
        function draw(k) {
            if (chart) chart.destroy();
            var rows = d.segments[k].slice().sort(function (a, b) { return b.oppose / b.answered - a.oppose / a.answered; });
            chart = stanceBars('chartSeg', rows);
        }
        toggles('segDim', [{ key: 'org_type', label: 'Organisation type' }, { key: 'country', label: 'Country' }], draw);
        draw('org_type');
    }

    // --- SSS vs the package ------------------------------------------------
    function renderPackage(d) {
        var h = d.package.hourly, names = { support: 'Support hourly matching', neutral: 'Neutral on hourly matching', oppose: 'Oppose hourly matching' };
        stanceBars('chartPackage', ['support', 'neutral', 'oppose'].map(function (k) {
            var r = h[k];
            return { label: names[k], answered: r.support + r.neutral + r.oppose, support: r.support, neutral: r.neutral, oppose: r.oppose };
        }));
    }

    // --- Q100: concerns ticked, by Q97 stance --------------------------------
    var Q100_SHORT = {
        'Unclear rules/definition of SSS': 'Unclear rules / definition',
        'Concern of regionally applicable challenges to implementation': 'Regional implementation challenges',
        'Unclear how partial subsidies affect SSS classification': 'Partial subsidies unclear',
        'Markets should self-determine how resources that fall under SSS are allocated to customers': 'Markets should self-determine allocation',
        'All contractual instruments should be eligible for voluntary procurement.': 'All instruments should stay eligible',
        'Other (please explain)': 'Other'
    };
    function renderQ100(d) {
        var rows = d.q100.rows;
        hbar('chartQ100', rows.map(function (r) { return (Q100_SHORT[r.option] || r.option) + ' (' + r.n + ')'; }),
            Q97_PARTS.map(function (p) {
                return { label: 'Q97 ' + p.label.toLowerCase(), backgroundColor: p.color(), data: rows.map(function (r) { return r[p.k]; }) };
            }).concat([{ label: 'Skipped Q97', backgroundColor: withAlpha(S().muted, 0.3), data: rows.map(function (r) { return r.no_q97; }) }]), {
                stacked: true,
                label: function (c) { return c.dataset.label + ': ' + c.parsed.x; }
            });
    }

    // --- Coded themes --------------------------------------------------------
    function themeChart(id, rows) {
        rows = rows.slice().sort(function (a, b) { return b.n - a.n; });
        hbar(id, rows.map(function (r) { return THEME_LABEL[r.key] + ' (' + r.n + ')'; }),
            TEXT_STANCE.map(function (p) {
                return { label: p.label, backgroundColor: p.color(), data: rows.map(function (r) { return r.by_text[p.k]; }) };
            }), {
                stacked: true,
                label: function (c) { return c.dataset.label + ': ' + c.parsed.x; }
            });
    }

    // --- Registry gap: Q107 + Q109 -----------------------------------------
    function renderRegistry(d) {
        stanceBars('chartQ107', ['Yes', 'No', 'Unsure'].map(function (k) {
            var r = d.q107[k];
            return { label: k, answered: r.answered, support: r.support, neutral: r.neutral, oppose: r.oppose };
        }));
        var rows = d.q109.rows.filter(function (r) { return !/^Other/.test(r.option); });
        hbar('chartQ109', rows.map(function (r) { return r.option.replace(/\s*\(.*\)$/, ''); }), [{
            label: 'Respondents', backgroundColor: S().info, data: rows.map(function (r) { return r.pct; }),
            _n: rows.map(function (r) { return r.n; })
        }], {
            legend: false, max: 100,
            tick: function (v) { return v + '%'; },
            label: function (c) { return c.dataset._n[c.dataIndex] + ' (' + c.parsed.x + '% of ' + d.q109.base + ')'; }
        });
    }

    // --- Who raises what: theme × segment table -----------------------------
    function renderMatrix(d) {
        var keys = ['definition', 'data', 'market_fit', 'comparability', 'double_count', 'cost_allocation', 'crowd_out', 'blurs_lbm', 'not_customer_claim'];
        function draw(dim) {
            var rows = d.segments[dim].filter(function (r) { return r.coded >= 8; });
            var head = '<tr><th>Segment</th><th class="ss-num">Coded</th>' + keys.map(function (k) { return '<th class="ss-num">' + esc(THEME_LABEL[k]) + '</th>'; }).join('') + '</tr>';
            var body = rows.map(function (r) {
                return '<tr><td><strong>' + esc(r.label) + '</strong></td><td class="ss-num">' + r.coded + '</td>' + keys.map(function (k) {
                    var p = r.coded ? r[k] / r.coded : 0;
                    return '<td class="ss-num" style="background:' + withAlpha(S().info, Math.min(0.75, p * 1.1)) + '" title="' + r[k] + ' of ' + r.coded + '">' + Math.round(100 * p) + '%</td>';
                }).join('') + '</tr>';
            }).join('');
            set('matrix', '<table class="data-table ss-matrix"><thead>' + head + '</thead><tbody>' + body + '</tbody></table>');
        }
        toggles('matrixDim', [{ key: 'country', label: 'Country' }, { key: 'org_type', label: 'Organisation type' }], draw);
        draw('country');
    }

    // --- Who said what -----------------------------------------------------
    function renderQuotes(d) {
        var keys = ['definition', 'data', 'market_fit', 'comparability', 'double_count', 'cost_allocation', 'crowd_out', 'blurs_lbm', 'not_customer_claim', 'too_weak'];
        var tabs = keys.filter(function (k) { return (d.quotes[k] || []).length; }).map(function (k) { return { key: k, label: THEME_LABEL[k] }; });
        function draw(k) {
            var list = d.quotes[k] || [];
            if (!list.length) { set('quoteList', '<p class="s2-empty">No named organisations in this group.</p>'); return; }
            set('quoteList', list.map(function (q) {
                var who = q.orgs.map(esc).join(', ');
                if (q.n_unnamed) who += ' <span>+ ' + q.n_unnamed + ' unnamed</span>';
                return '<div class="ss-quote-card"><p class="ss-quote-text">“' + esc(q.quote) + '”</p>' +
                    '<p class="ss-quote-who"><strong>' + who + '</strong>' +
                    (q.n > 1 ? ' · same wording from ' + q.n + ' respondents' : '') + '</p></div>';
            }).join(''));
        }
        toggles('quoteTabs', tabs, draw);
        draw(tabs[0].key);
    }

    // --- Organisations -----------------------------------------------------
    function renderOrgs(d) {
        var filters = [
            { key: 'oppose', label: 'Oppose' },
            { key: 'conditional', label: 'Conditional' },
            { key: 'support', label: 'Support' },
            { key: 'all', label: 'All' }
        ];
        var state = { f: 'oppose', q: '' };
        function draw() {
            var list = d.named.filter(function (o) { return state.f === 'all' || o.text_stance === state.f; })
                .filter(function (o) {
                    return !state.q || (o.name + ' ' + o.country + ' ' + o.org_type).toLowerCase().indexOf(state.q) !== -1;
                }).sort(function (a, b) { return a.name.localeCompare(b.name); });
            set('orgCount', list.length + ' named organisation' + (list.length === 1 ? '' : 's'));
            if (!list.length) { set('orgTable', '<p class="s2-empty">No organisations match.</p>'); return; }
            set('orgTable', '<table class="data-table"><thead><tr><th>Organisation</th><th>Type</th><th>Country</th><th class="ss-num">Q97</th><th>Concerns raised</th></tr></thead><tbody>' +
                list.map(function (o) {
                    var th = o.themes.filter(function (t) { return d.themes.remedies.every(function (r) { return r.key !== t; }); });
                    return '<tr><td><strong>' + esc(o.name) + '</strong></td><td>' + esc(o.org_type) + '</td><td>' +
                        esc(o.country) + '</td><td class="ss-num">' + (o.q97 == null ? '—' : o.q97) + '</td><td>' +
                        esc(th.map(function (t) { return THEME_LABEL[t]; }).join(' · ')) + '</td></tr>';
                }).join('') + '</tbody></table>');
        }
        toggles('orgFilter', filters, function (k) { state.f = k; draw(); });
        document.getElementById('orgSearch').addEventListener('input', function (e) {
            state.q = e.target.value.trim().toLowerCase(); draw();
        });
        draw();
    }

    function render(d) {
        renderStats(d);
        renderSegments(d);
        renderPackage(d);
        renderQ100(d);
        themeChart('chartChallenges', d.themes.challenges);
        themeChart('chartPrinciple', d.themes.principle);
        renderRegistry(d);
        themeChart('chartRemedies', d.themes.remedies);
        renderMatrix(d);
        renderQuotes(d);
        renderOrgs(d);
    }

    document.addEventListener('DOMContentLoaded', function () {
        S2Data.load('sss').then(render).catch(function (err) {
            S2Data.errorPanel(document.getElementById('quoteList'), err);
        });
    });
})();
