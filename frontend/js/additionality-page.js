// ============================================================================
// Additionality & incrementality page
// ============================================================================
// Site-specific module. Renders data/additionality.json (written by
// scripts/analytics/additionality.py export).
// ============================================================================

(function () {
    'use strict';

    var S = function () { return SEMANTIC_COLORS; };
    var R = function () { return RESOURCE_COLORS; };

    function pct(n, d) { return d ? (100 * n / d).toFixed(1) + '%' : '—'; }
    function fmt(n) { return n.toLocaleString('en-US'); }
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
                    legend: { position: 'bottom' },
                    tooltip: { callbacks: { label: opts.label } }
                },
                scales: {
                    x: {
                        stacked: !!opts.stacked,
                        max: opts.max,
                        beginAtZero: true,
                        ticks: { callback: opts.tick || function (v) { return v; } }
                    },
                    y: { stacked: !!opts.stacked }
                }
            }
        });
    }

    function render(d) {
        var N = d.totals.respondents;

        set('statMention', fmt(d.mentions.either) + ' · ' + pct(d.mentions.either, N));
        set('statSupport', fmt(d.stance.either.support) + ' · ' + pct(d.stance.either.support, N));
        set('statOppose', fmt(d.stance.either.oppose) + ' · ' + pct(d.stance.either.oppose, N));
        set('statAll3', fmt(d.all_three.n) + ' · ' + d.all_three.pct_total.toFixed(1) + '%');
        set('calloutAll3', fmt(d.all_three.n) + ' &middot; ' + d.all_three.pct_total.toFixed(1) + '%');

        // --- Mentioned vs stance ---------------------------------------------
        var keys = ['additionality', 'incrementality', 'either'];
        var names = ['Additionality', 'Incrementality', 'Either concept'];
        var mentioned = [d.mentions.additionality, d.mentions.incrementality, d.mentions.either];
        var sup = keys.map(function (k) { return d.stance[k].support; });
        var opp = keys.map(function (k) { return d.stance[k].oppose; });
        var toPct = function (arr) { return arr.map(function (n) { return +(100 * n / N).toFixed(1); }); };
        var counts = { Mentioned: mentioned, Supportive: sup, Opposed: opp };
        hbar('chartStance', names, [
            { label: 'Mentioned', data: toPct(mentioned), backgroundColor: withAlpha(R().hydro, 0.35), borderColor: R().hydro, borderWidth: 1 },
            { label: 'Supportive', data: toPct(sup), backgroundColor: S().positive },
            { label: 'Opposed', data: toPct(opp), backgroundColor: S().negative }
        ], {
            tick: function (v) { return v + '%'; },
            label: function (c) {
                return c.dataset.label + ': ' + fmt(counts[c.dataset.label][c.dataIndex]) + ' (' + c.parsed.x + '%)';
            }
        });

        var rows = keys.map(function (k, i) {
            var s = d.stance[k];
            return '<tr><td>' + names[i] + '</td>' +
                '<td class="ad-num">' + fmt(mentioned[i]) + '</td>' +
                ['support', 'oppose', 'mixed', 'neutral'].map(function (x) {
                    return '<td class="ad-num">' + fmt(s[x]) + ' <span class="s2-note">(' + pct(s[x], N) + ')</span></td>';
                }).join('') + '</tr>';
        }).join('');
        set('stanceTable', '<table class="data-table ad-table"><thead><tr><th>Concept</th><th class="ad-num">Mentioned</th>' +
            '<th class="ad-num">Support</th><th class="ad-num">Oppose</th><th class="ad-num">Mixed</th><th class="ad-num">Neutral</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table>');

        // --- Camps (100% stacked) -------------------------------------------
        var campKeys = [
            { k: 'pro_both', label: 'Support both', color: S().positive },
            { k: 'split', label: 'Split / neutral', color: S().muted },
            { k: 'skipped', label: 'Skipped Q71 or Q83', color: R().gap },
            { k: 'anti_both', label: 'Oppose both', color: S().negative }
        ];
        var campRows = ['additionality', 'incrementality'];
        var campNames = ['Additionality supporters (n=' + d.supporters.additionality + ')',
                         'Incrementality supporters (n=' + d.supporters.incrementality + ')'];
        hbar('chartCamps', campNames, campKeys.map(function (c) {
            return {
                label: c.label,
                backgroundColor: c.color,
                data: campRows.map(function (r) { return +(100 * d.camps[r][c.k] / d.supporters[r]).toFixed(1); }),
                _n: campRows.map(function (r) { return d.camps[r][c.k]; })
            };
        }), {
            stacked: true, max: 100,
            tick: function (v) { return v + '%'; },
            label: function (c) { return c.dataset.label + ': ' + c.dataset._n[c.dataIndex] + ' (' + c.parsed.x + '%)'; }
        });

        // --- Q71 histogram ---------------------------------------------------
        new Chart(document.getElementById('chartQ71'), {
            type: 'bar',
            data: {
                labels: ['1 · no support', '2', '3', '4', '5 · strong support'],
                datasets: [
                    { label: 'Additionality supporters', data: d.q71_hist.additionality, backgroundColor: R().solar },
                    { label: 'Incrementality supporters', data: d.q71_hist.incrementality, backgroundColor: R().nuclear }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: { y: { beginAtZero: true, title: { display: true, text: 'Respondents' } } }
            }
        });

        // --- Funnel ----------------------------------------------------------
        var steps = [
            ['All respondents', N],
            ['Scored both Q71 and Q83', d.totals.scored_q71_q83],
            ['Support hourly + deliverability', d.totals.pro_hourly_and_deliverability],
            ['…and support additionality or incrementality', d.all_three.n]
        ];
        var funnel = hbar('chartFunnel', steps.map(function (s) { return s[0]; }), [{
            label: 'Respondents',
            data: steps.map(function (s) { return s[1]; }),
            backgroundColor: [withAlpha(R().hydro, 0.25), withAlpha(R().hydro, 0.45), withAlpha(S().positive, 0.6), S().positive]
        }], {
            label: function (c) { return fmt(c.parsed.x) + ' (' + pct(c.parsed.x, N) + ' of all)'; }
        });
        funnel.options.plugins.legend.display = false;
        funnel.update();
        set('funnelNote', 'Of the ' + d.all_three.n + ': ' + d.all_three.via_incrementality + ' support incrementality, ' +
            d.all_three.via_additionality + ' support additionality (some both). ' + d.all_three.shared_wording +
            ' share a mention sentence verbatim with at least two other respondents. ' + d.all_three.redacted + ' are redacted.');

        // --- Org types -------------------------------------------------------
        var a = d.orgs.all_three, b = d.orgs.support_concept_anti_both;
        var na = Object.values(a).reduce(function (x, y) { return x + y; }, 0);
        var nb = Object.values(b).reduce(function (x, y) { return x + y; }, 0);
        var types = Object.keys(Object.assign({}, a, b)).sort(function (x, y) {
            return ((b[y] || 0) / nb + (a[y] || 0) / na) - ((b[x] || 0) / nb + (a[x] || 0) / na);
        });
        hbar('chartOrgs', types, [
            { label: 'Support all three (n=' + na + ')', backgroundColor: S().positive, _n: types.map(function (t) { return a[t] || 0; }),
              data: types.map(function (t) { return +(100 * (a[t] || 0) / na).toFixed(1); }) },
            { label: 'Support concept, oppose both (n=' + nb + ')', backgroundColor: S().negative, _n: types.map(function (t) { return b[t] || 0; }),
              data: types.map(function (t) { return +(100 * (b[t] || 0) / nb).toFixed(1); }) }
        ], {
            tick: function (v) { return v + '%'; },
            label: function (c) { return c.dataset.label + ': ' + c.dataset._n[c.dataIndex] + ' (' + c.parsed.x + '%)'; }
        });

        // --- Quotes ----------------------------------------------------------
        function quoteTable(list) {
            if (!list.length) return '<p class="s2-empty">None.</p>';
            return '<table class="data-table ad-table"><thead><tr><th>Passage</th><th>Org type</th><th class="ad-num">Same wording</th></tr></thead><tbody>' +
                list.map(function (q) {
                    return '<tr><td class="ad-quote">“' + esc(q.quote) + '”</td><td>' + esc(q.org) +
                        '</td><td class="ad-num">' + (q.n_same > 1 ? q.n_same : '—') + '</td></tr>';
                }).join('') + '</tbody></table>';
        }
        set('quotesAll3', quoteTable(d.quotes.all_three));
        set('quotesAnti', quoteTable(d.quotes.anti_both));
        set('quotesOppose', quoteTable(d.quotes.oppose));

        renderMechanism(d);
        renderDemographics(d);
        renderOrgs(d);

        var c = d.confidence, tot = c.high + c.medium + c.low;
        set('confNote', pct(c.high, tot) + ' high, ' + pct(c.medium, tot) + ' medium, ' + pct(c.low, tot) + ' low');
    }

    function toggles(id, options, onPick) {
        var el = document.getElementById(id);
        el.innerHTML = '';
        options.forEach(function (o, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.textContent = o.label;
            if (i === 0) b.classList.add('active');
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

    var CAMP_LABEL = { pro_both: 'Supports both', anti_both: 'Opposes both', split: 'Split / neutral', skipped: 'Skipped' };
    var SSS_LABEL = { supports: 'SSS as the test', prefers_other: 'Wants stronger than SSS', oppose: 'Opposes SSS', none: '' };
    var AGE_LABEL = { required: 'Required', considered: 'Considered', oppose: 'Opposes', none: '' };

    function renderMechanism(d) {
        var m = d.mechanism;
        if (!m) { set('mechTable', '<p class="s2-empty">Mechanism coding not available.</p>'); return; }
        var groups = [
            ['either', 'All supporters (n=' + m.n_supporters + ')'],
            ['all_three', 'Support all three (n=' + d.all_three.n + ')'],
            ['anti_both', 'Support concept, oppose both (n=' + Object.values(d.orgs.support_concept_anti_both).reduce(function (a, b) { return a + b; }, 0) + ')']
        ];
        var series = [
            { k: 'sss_supports', label: 'SSS as the incrementality test', color: R().nuclear },
            { k: 'age_required', label: 'Age / vintage test, required', color: R().solar },
            { k: 'age_considered', label: 'Age / vintage test, considered', color: withAlpha(R().solar, 0.4) },
            { k: 'sss_prefers_other', label: 'Wants stronger than SSS', color: withAlpha(R().nuclear, 0.4) }
        ];
        hbar('chartMech', groups.map(function (g) { return g[1]; }), series.map(function (s) {
            return { label: s.label, backgroundColor: s.color, data: groups.map(function (g) { return m[g[0]][s.k]; }) };
        }), { label: function (c) { return c.dataset.label + ': ' + c.parsed.x; } });

        var e = m.either, a = m.all_three, N = d.totals.respondents;
        var row = function (label, k) {
            return '<tr><td>' + label + '</td><td class="ad-num">' + e[k] + '</td><td class="ad-num">' + pct(e[k], N) +
                '</td><td class="ad-num">' + a[k] + '</td></tr>';
        };
        set('mechTable', '<table class="data-table"><thead><tr><th>Position</th><th class="ad-num">Supporters</th>' +
            '<th class="ad-num">% of 1,072</th><th class="ad-num">Of the all-three group</th></tr></thead><tbody>' +
            row('SSS as the incrementality test', 'sss_supports') +
            row('Required asset age / vintage test', 'age_required') +
            row('Both of the above', 'sss_and_age_required') +
            row('SSS only (no required age test)', 'sss_only') +
            row('Required age test only (not SSS)', 'age_required_only') +
            row('Age test suggested, not required', 'age_considered') +
            row('Want something stronger than SSS', 'sss_prefers_other') +
            '</tbody></table>');
        set('mechReadout', '<strong>' + e.sss_supports + '</strong> supporters (' + pct(e.sss_supports, N) +
            ') back SSS as the incrementality test; <strong>' + e.age_required + '</strong> (' + pct(e.age_required, N) +
            ') specifically want a required asset age or vintage test; ' + e.sss_and_age_required + ' want both. A further ' +
            e.age_considered + ' suggest an age test without asking for it to be required.');
    }

    function renderDemographics(d) {
        var groups = [
            { key: 'either', label: 'Support either' },
            { key: 'additionality', label: 'Additionality' },
            { key: 'incrementality', label: 'Incrementality' },
            { key: 'all_three', label: 'All three' }
        ];
        if (d.mechanism) {
            groups.push({ key: 'sss', label: 'SSS as test' }, { key: 'age_required', label: 'Required age test' });
        }
        groups.push({ key: 'oppose', label: 'Oppose' });
        var dims = [
            { key: 'org_type', label: 'Organisation type' },
            { key: 'country', label: 'Country' },
            { key: 'sector', label: 'Sector' },
            { key: 'responding_as', label: 'Responding as' },
            { key: 'redaction', label: 'Named / redacted' }
        ];
        var state = { g: 'either', dim: 'org_type' }, chart = null;
        function draw() {
            var rows = d.demographics[state.dim].slice().sort(function (x, y) { return y[state.g] - x[state.g] || y.n - x.n; });
            var total = rows.reduce(function (s, r) { return s + r[state.g]; }, 0);
            var g = groups.filter(function (x) { return x.key === state.g; })[0];
            if (chart) chart.destroy();
            chart = hbar('chartDemo', rows.map(function (r) { return r.label; }), [{
                label: g.label + ' (n=' + total + ')',
                data: rows.map(function (r) { return r[state.g]; }),
                backgroundColor: state.g === 'oppose' ? S().negative : S().positive
            }], { label: function (c) {
                var r = rows[c.dataIndex];
                return r[state.g] + ' of ' + r.n + ' in segment (' + pct(r[state.g], r.n) + ')';
            } });
            chart.options.plugins.legend.display = false;
            chart.update();
            set('demoTable', '<table class="data-table ad-table"><thead><tr><th>Segment</th><th class="ad-num">Respondents</th>' +
                '<th class="ad-num">In group</th><th class="ad-num">Share of group</th><th class="ad-num">Share of segment</th></tr></thead><tbody>' +
                rows.map(function (r) {
                    return '<tr><td>' + esc(r.label) + '</td><td class="ad-num">' + fmt(r.n) + '</td><td class="ad-num">' + r[state.g] +
                        '</td><td class="ad-num">' + pct(r[state.g], total) + '</td><td class="ad-num">' + pct(r[state.g], r.n) + '</td></tr>';
                }).join('') + '</tbody></table>');
        }
        toggles('demoGroup', groups, function (k) { state.g = k; draw(); });
        toggles('demoDim', dims, function (k) { state.dim = k; draw(); });
        draw();
    }

    function renderOrgs(d) {
        var filters = [
            { key: 'support', label: 'All supporters' },
            { key: 'all3', label: 'Support all three' },
            { key: 'sss', label: 'SSS as test' },
            { key: 'age', label: 'Required age test' },
            { key: 'oppose', label: 'Oppose' }
        ];
        if (!d.mechanism) filters = filters.filter(function (f) { return f.key !== 'sss' && f.key !== 'age'; });
        var state = { f: 'support', q: '' };
        function keep(o) {
            if (state.f === 'oppose') { if (o.stance !== 'oppose') return false; }
            else if (o.stance !== 'support') return false;
            if (state.f === 'all3' && o.camp !== 'pro_both') return false;
            if (state.f === 'sss' && o.sss !== 'supports') return false;
            if (state.f === 'age' && o.age !== 'required') return false;
            if (state.q) {
                var hay = (o.name + ' ' + o.country + ' ' + o.org_type + ' ' + o.audited).toLowerCase();
                if (hay.indexOf(state.q) === -1) return false;
            }
            return true;
        }
        function draw() {
            var list = d.named.filter(keep).sort(function (a, b) { return a.name.localeCompare(b.name); });
            set('orgCount', list.length + ' named organisation' + (list.length === 1 ? '' : 's') + ' shown.');
            if (!list.length) { set('orgTable', '<p class="s2-empty">No organisations match.</p>'); return; }
            set('orgTable', '<table class="data-table ad-table"><thead><tr><th>Organisation</th><th>Type (declared · audited)</th>' +
                '<th>Country</th><th>Concept</th><th>Hourly + deliverability</th><th>SSS</th><th>Age test</th><th>In their words</th></tr></thead><tbody>' +
                list.map(function (o) {
                    return '<tr><td><strong>' + esc(o.name) + '</strong></td><td>' + esc(o.org_type) + (o.audited ? ' · ' + esc(o.audited) : '') +
                        '</td><td>' + esc(o.country) + '</td><td>' + o.concepts.replace('A', 'Additionality ').replace('I', 'Incrementality').trim().replace(' ', ' + ') +
                        '</td><td>' + CAMP_LABEL[o.camp] + '</td><td>' + (SSS_LABEL[o.sss] || '—') + '</td><td>' + (AGE_LABEL[o.age] || '—') +
                        '</td><td class="ad-quote">“' + esc(o.quote) + '”</td></tr>';
                }).join('') + '</tbody></table>');
        }
        toggles('orgFilter', filters, function (k) { state.f = k; draw(); });
        document.getElementById('orgSearch').addEventListener('input', function (e) {
            state.q = e.target.value.trim().toLowerCase(); draw();
        });
        var u = d.unnamed;
        set('orgUnnamed', 'Not listed: ' + u.support.redacted + ' redacted and ' + u.support.individual +
            ' individual supporters; ' + u.oppose.redacted + ' redacted and ' + u.oppose.individual + ' individual opponents.');
        draw();
    }

    document.addEventListener('DOMContentLoaded', function () {
        S2Data.load('additionality').then(render).catch(function (err) {
            S2Data.errorPanel(document.getElementById('stanceTable'), err);
        });
    });
})();
