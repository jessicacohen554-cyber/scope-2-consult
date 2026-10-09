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
    function esc(s) {
        return String(s).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }
    function set(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; }
    function stat(n, N) { return n + ' <span class="s2-note">· ' + pct(n, N) + '</span>'; }

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
        var N = d.totals.respondents, m = d.mechanism.either;
        set('statSupport', stat(d.supporters.either, N));
        set('statAll3', stat(d.all_three.n, N));
        var q = d.q97.all, sn = q.support + q.neutral;
        set('statQ97', stat(sn, q.answered));
        set('statQ97n', q.answered);
        set('statQ97sub', pct(sn, N) + ' of all ' + N.toLocaleString('en-US') + ' respondents · ' +
            q.support + ' supported, ' + q.neutral + ' neutral, ' + q.oppose + ' opposed');
        set('statSss', stat(m.sss_supports, N));
        set('statMore', stat(m.sss_prefers_other, N));
    }

    // --- Same goal, opposite camps -----------------------------------------
    function renderCamps(d) {
        var camps = [
            { k: 'pro_both', label: 'Support both', color: S().positive },
            { k: 'split', label: 'Mixed', color: S().muted },
            { k: 'skipped', label: 'Skipped', color: R().gap },
            { k: 'anti_both', label: 'Oppose both', color: S().negative }
        ];
        var rows = ['either', 'additionality', 'incrementality'];
        hbar('chartCamps', [
            'All supporters (' + d.supporters.either + ')',
            '"Additionality" supporters (' + d.supporters.additionality + ')',
            '"Incrementality" supporters (' + d.supporters.incrementality + ')'
        ], camps.map(function (c) {
            return {
                label: c.label, backgroundColor: c.color,
                data: rows.map(function (r) { return +(100 * d.camps[r][c.k] / d.supporters[r]).toFixed(1); }),
                _n: rows.map(function (r) { return d.camps[r][c.k]; })
            };
        }), {
            stacked: true, max: 100,
            tick: function (v) { return v + '%'; },
            label: function (c) { return c.dataset.label + ': ' + c.dataset._n[c.dataIndex] + ' (' + c.parsed.x + '%)'; }
        });
    }

    // --- Which test --------------------------------------------------------
    function renderTest(d) {
        var e = d.mechanism.either, a = d.mechanism.all_three;
        var labels = ['SSS as the test', 'Further than SSS', 'Required asset-age test'];
        var keys = ['sss_supports', 'sss_prefers_other', 'age_required'];
        hbar('chartTest', labels, [
            { label: 'Also support hourly matching + deliverability', backgroundColor: S().positive,
              data: keys.map(function (k) { return a[k]; }) },
            { label: 'Other supporters', backgroundColor: withAlpha(S().muted, 0.5),
              data: keys.map(function (k) { return e[k] - a[k]; }) }
        ], {
            stacked: true,
            label: function (c) { return c.dataset.label + ': ' + c.parsed.x; }
        });
    }

    // --- SSS support (Q97) ---------------------------------------------------
    function renderQ97(d) {
        var q = d.q97;
        var rows = [
            ['All respondents', q.all],
            ['All additionality / incrementality supporters', q.either],
            ['…of whom support all three', q.all_three],
            ['…of whom do not', q.not_all_three]
        ];
        var parts = [
            { k: 'support', label: 'Support', color: S().positive },
            { k: 'neutral', label: 'Neutral', color: S().muted },
            { k: 'oppose', label: 'Oppose', color: S().negative }
        ];
        hbar('chartQ97', rows.map(function (r) { return r[0] + ' (n=' + r[1].answered + ')'; }), parts.map(function (p) {
            return {
                label: p.label, backgroundColor: p.color,
                data: rows.map(function (r) { return +(100 * r[1][p.k] / r[1].answered).toFixed(1); }),
                _n: rows.map(function (r) { return r[1][p.k]; })
            };
        }), {
            stacked: true, max: 100,
            tick: function (v) { return v + '%'; },
            label: function (c) { return c.dataset.label + ': ' + c.dataset._n[c.dataIndex] + ' (' + c.parsed.x + '%)'; }
        });
    }

    // --- Who said what -----------------------------------------------------
    function renderQuotes(d) {
        var tabs = [
            { key: 'sss', label: 'Back SSS' },
            { key: 'stronger', label: 'Further than SSS' },
            { key: 'age_required', label: 'Required age test' },
            { key: 'oppose', label: 'Oppose additionality' }
        ];
        function draw(k) {
            var list = d.quotes[k] || [];
            if (!list.length) { set('quoteList', '<p class="s2-empty">No named organisations in this group.</p>'); return; }
            set('quoteList', list.map(function (q) {
                var who = q.orgs.map(esc).join(', ');
                if (q.n_unnamed) who += ' <span>+ ' + q.n_unnamed + ' unnamed</span>';
                return '<div class="ad-quote-card"><p class="ad-quote-text">“' + esc(q.quote) + '”</p>' +
                    '<p class="ad-quote-who"><strong>' + who + '</strong>' +
                    (q.n > 1 ? ' · same wording from ' + q.n + ' respondents' : '') + '</p></div>';
            }).join(''));
        }
        toggles('quoteTabs', tabs, draw);
        draw('sss');
    }

    // --- Who they are ------------------------------------------------------
    function renderDemographics(d) {
        var groups = [
            { key: 'all_three', label: 'All three' },
            { key: 'sss', label: 'Back SSS' },
            { key: 'stronger', label: 'Further than SSS' },
            { key: 'age_required', label: 'Required age test' },
            { key: 'either', label: 'All supporters' }
        ];
        var dims = [
            { key: 'org_type', label: 'Organisation type' },
            { key: 'country', label: 'Country' },
            { key: 'sector', label: 'Sector' }
        ];
        var state = { g: 'all_three', dim: 'org_type' }, chart = null;
        function draw() {
            var rows = d.demographics[state.dim].filter(function (r) { return r[state.g] > 0; })
                .sort(function (x, y) { return y[state.g] - x[state.g]; });
            if (chart) chart.destroy();
            chart = hbar('chartDemo', rows.map(function (r) { return r.label; }), [{
                label: 'Respondents',
                data: rows.map(function (r) { return r[state.g]; }),
                backgroundColor: S().positive
            }], {
                legend: false,
                label: function (c) { var r = rows[c.dataIndex]; return r[state.g] + ' (' + pct(r[state.g], r.n) + ' of all ' + r.n + ' in this segment)'; }
            });
        }
        toggles('demoGroup', groups, function (k) { state.g = k; draw(); });
        toggles('demoDim', dims, function (k) { state.dim = k; draw(); });
        draw();
    }

    // --- Organisations -----------------------------------------------------
    function position(o) {
        if (o.stance === 'oppose') return 'Opposes additionality / incrementality';
        var parts = [];
        parts.push({ pro_both: 'Supports all three', anti_both: 'Opposes hourly + deliverability',
                     split: 'Mixed on hourly + deliverability', skipped: 'Supports concept' }[o.camp]);
        if (o.sss === 'supports') parts.push('backs SSS');
        if (o.sss === 'prefers_other') parts.push('further than SSS');
        if (o.age === 'required') parts.push('required age test');
        return parts.join(' · ');
    }

    function renderOrgs(d) {
        var filters = [
            { key: 'all3', label: 'Support all three' },
            { key: 'sss', label: 'Back SSS' },
            { key: 'more', label: 'Further than SSS' },
            { key: 'age', label: 'Required age test' },
            { key: 'support', label: 'All supporters' },
            { key: 'oppose', label: 'Oppose' }
        ];
        var test = {
            all3: function (o) { return o.stance === 'support' && o.camp === 'pro_both'; },
            sss: function (o) { return o.stance === 'support' && o.sss === 'supports'; },
            more: function (o) { return o.stance === 'support' && o.sss === 'prefers_other'; },
            age: function (o) { return o.stance === 'support' && o.age === 'required'; },
            support: function (o) { return o.stance === 'support'; },
            oppose: function (o) { return o.stance === 'oppose'; }
        };
        var state = { f: 'all3', q: '' };
        function draw() {
            var list = d.named.filter(test[state.f]).filter(function (o) {
                return !state.q || (o.name + ' ' + o.country + ' ' + o.org_type).toLowerCase().indexOf(state.q) !== -1;
            }).sort(function (a, b) { return a.name.localeCompare(b.name); });
            set('orgCount', list.length + ' named organisation' + (list.length === 1 ? '' : 's'));
            if (!list.length) { set('orgTable', '<p class="s2-empty">No organisations match.</p>'); return; }
            set('orgTable', '<table class="data-table"><thead><tr><th>Organisation</th><th>Type</th><th>Country</th><th>Position</th></tr></thead><tbody>' +
                list.map(function (o) {
                    return '<tr><td><strong>' + esc(o.name) + '</strong></td><td>' + esc(o.org_type) + '</td><td>' +
                        esc(o.country) + '</td><td>' + esc(position(o)) + '</td></tr>';
                }).join('') + '</tbody></table>');
        }
        toggles('orgFilter', filters, function (k) { state.f = k; draw(); });
        document.getElementById('orgSearch').addEventListener('input', function (e) {
            state.q = e.target.value.trim().toLowerCase(); draw();
        });
        var u = d.unnamed.support;
        set('orgUnnamed', 'Not named: ' + u.redacted + ' redacted, ' + u.individual + ' individual and ' + u.unidentifiable +
            ' unidentifiable supporters; ' + d.unnamed.oppose.redacted + ' redacted opponents.');
        draw();
    }

    function render(d) {
        renderStats(d);
        renderCamps(d);
        renderTest(d);
        renderQ97(d);
        renderQuotes(d);
        renderDemographics(d);
        renderOrgs(d);
    }

    document.addEventListener('DOMContentLoaded', function () {
        S2Data.load('additionality').then(render).catch(function (err) {
            S2Data.errorPanel(document.getElementById('quoteList'), err);
        });
    });
})();
