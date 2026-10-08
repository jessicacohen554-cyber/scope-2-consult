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

        var c = d.confidence, tot = c.high + c.medium + c.low;
        set('confNote', pct(c.high, tot) + ' high, ' + pct(c.medium, tot) + ' medium, ' + pct(c.low, tot) + ' low');
    }

    document.addEventListener('DOMContentLoaded', function () {
        S2Data.load('additionality').then(render).catch(function (err) {
            S2Data.errorPanel(document.getElementById('stanceTable'), err);
        });
    });
})();
