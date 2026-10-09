// ============================================================================
// Impact in the market-based method page
// ============================================================================
// Site-specific module. Renders data/mbm_impact.json (written by
// scripts/analytics/mbm_impact.py export).
// ============================================================================

(function () {
    'use strict';

    var S = function () { return SEMANTIC_COLORS; };
    var R = function () { return RESOURCE_COLORS; };
    var CAMPS = ['pro_both', 'split', 'skipped', 'anti_both'];

    function pct(n, d) { return d ? (100 * n / d).toFixed(1) + '%' : '—'; }
    function esc(s) {
        return String(s).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }
    function set(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; }
    function stat(n, N) { return n + ' <span class="s2-note">· ' + pct(n, N) + '</span>'; }
    function sum(o) { return CAMPS.reduce(function (s, k) { return s + (o[k] || 0); }, 0); }

    function campSets() {
        return [
            { k: 'pro_both', label: 'Support hourly + deliverability', color: S().positive },
            { k: 'split', label: 'Mixed', color: S().muted },
            { k: 'skipped', label: 'Skipped one', color: R().gap },
            { k: 'anti_both', label: 'Oppose both', color: S().negative }
        ];
    }

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
                    y: { stacked: !!opts.stacked, ticks: { autoSkip: false } }
                }
            }
        });
    }

    // Stacked count bars: rows = [[label, campCounts]], coloured by camp.
    function campBars(id, rows, N) {
        return hbar(id, rows.map(function (r) { return r[0] + ' (' + sum(r[1]) + ')'; }), campSets().map(function (c) {
            return { label: c.label, backgroundColor: c.color, data: rows.map(function (r) { return r[1][c.k] || 0; }) };
        }), {
            stacked: true,
            label: function (c) {
                var tot = sum(rows[c.dataIndex][1]);
                return c.dataset.label + ': ' + c.parsed.x + ' (' + pct(c.parsed.x, tot) + ' of row' + (N ? ', ' + pct(c.parsed.x, N) + ' of all' : '') + ')';
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
        var N = d.totals.respondents, f = d.funnel, s = d.sufficiency.all;
        set('statRef', stat(f.referenced, N));
        set('statSupport', stat(f.support_mbm, N));
        set('statSupportSub', '+ ' + f.support_implied + ' more where support is implied, not stated');
        set('statExplicit', stat(f.beyond_sss_explicit, N));
        set('statExplicitSub', pct(f.beyond_sss_explicit, f.support_mbm) + ' of explicit supporters · ' + f.sss_enough +
            ' treat SSS as enough · ' + f.beyond_sss_implicit + ' ask for a different impact test without naming SSS');
        set('statShort', stat(s.not_far_enough, N));
        set('statEnough', stat(s.far_enough, N));
        set('statWrong', stat(s.wrong_direction, N));
    }

    // --- In brief ------------------------------------------------------------
    function renderBrief(d) {
        var N = d.totals.respondents, f = d.funnel, s = d.sufficiency.all, c = d.camps, k = d.consequential.all, a = d.aggregate;
        var sc = d.suff_by_camp;
        var items = [
            '<strong>' + f.referenced + ' (' + pct(f.referenced, N) + ') referenced system impact; ' + f.support_mbm + ' (' + pct(f.support_mbm, N) +
                ') explicitly want the market-based method to deliver it.</strong> Another ' + f.support_implied + ' imply it without saying so. Of the ' +
                f.support_mbm + ', ' + c.support.anti_both + ' oppose both hourly matching and deliverability and ' + c.support.pro_both + ' support both: the goal is shared across camps, the route is not.',
            '<strong>Only ' + f.beyond_sss_explicit + ' (' + pct(f.beyond_sss_explicit, N) + ' of all) explicitly say SSS is not enough.</strong> ' +
                c.explicit.pro_both + ' of them support hourly matching and deliverability; most want an asset-age or newness test on top. ' +
                f.sss_enough + ' supporters present SSS as the incrementality test and ask for nothing more.',
            '<strong>"Not far enough" ' + s.not_far_enough + ' vs "far enough" ' + s.far_enough + '.</strong> "Far enough" is almost entirely the pro-hourly camp (' +
                sc.far_enough.pro_both + ' of ' + s.far_enough + '); so is most of "not far enough" (' + sc.not_far_enough.pro_both + ').',
            '<strong>The largest group rejects the route, not the goal: ' + s.wrong_direction + ' say the proposal fails on impact.</strong> ' + sc.wrong_direction.anti_both +
                ' of them oppose hourly and deliverability and want impact through other means (annual matching with additionality, emissionality, investment anywhere). ' +
                s.too_far + ' say impact is not the MBM\'s job.',
            '<strong>Replacing the attributional MBM with consequential accounting: ' + k.displace + ' (' + pct(k.displace, N) + ').</strong> ' +
                k.inside_option + ' want a consequential option inside scope 2 alongside it, ' + k.separate + ' a separate metric outside it, and ' + k.oppose + ' oppose consequential metrics.',
            '<strong>Total support for impact in any form: ' + a.concept_any + ' (' + pct(a.concept_any, N) + ').</strong> Explicit in the MBM ' + a.support_mbm +
                ', implied ' + a.support_implied + ', mixed ' + a.mixed + ', separate metric only ' + a.separate_only + ', consequential metric with no MBM position ' + a.consequential_only + '.'
        ];
        set('briefList', items.map(function (t) { return '<li>' + t + '</li>'; }).join(''));
    }

    // --- Funnel --------------------------------------------------------------
    function renderFunnel(d) {
        var c = d.camps;
        campBars('chartFunnel', [
            ['All respondents', c.all],
            ['Referenced system impact', c.referenced],
            ['Explicitly support it in the MBM', c.support],
            ['…and explicitly say SSS is not enough', c.explicit]
        ], d.totals.respondents);
    }

    // --- Far enough ----------------------------------------------------------
    function renderSufficiency(d) {
        var s = d.suff_by_camp;
        campBars('chartSuff', [
            ['Not far enough (needs more)', s.not_far_enough],
            ['Fails on impact; different approach', s.wrong_direction],
            ['Far enough as proposed', s.far_enough],
            ['Too far: impact is not the MBM\'s job', s.too_far]
        ], d.totals.respondents);
        var q = d.q97;
        set('suffNote', document.getElementById('suffNote').innerHTML + ' SSS (Q97) support: ' + pct(q.not_far_enough.support, q.not_far_enough.answered) +
            ' of "not far enough" and ' + pct(q.far_enough.support, q.far_enough.answered) + ' of "far enough" respondents who answered it.');
    }

    // --- Mechanisms ----------------------------------------------------------
    function renderMech(d) {
        var keys = ['scarcity', 'additionality_test', 'asset_age', 'sss', 'marginal', 'causal'];
        var labels = ['Market scarcity (hourly + deliverability)', 'Additionality test', 'Asset age / new build', 'SSS as incrementality', 'Marginal emissions / emissionality', 'Causal link'];
        var m = d.mechanisms;
        hbar('chartMech', labels, [
            { label: 'Say SSS is not enough', backgroundColor: S().positive, data: keys.map(function (k) { return m.explicit[k]; }) },
            { label: 'Other supporters', backgroundColor: withAlpha(S().positive, 0.45), data: keys.map(function (k) { return m.support_mbm[k] - m.explicit[k]; }) }
        ], { stacked: true, label: function (c) { return c.dataset.label + ': ' + c.parsed.x; } });
    }

    // --- Consequential -------------------------------------------------------
    function renderCons(d) {
        var c = d.cons_by_camp;
        campBars('chartCons', [
            ['Replace the attributional MBM', c.displace],
            ['Option inside scope 2', c.inside_option],
            ['Separate metric outside scope 2', c.separate],
            ['Oppose consequential metrics', c.oppose]
        ], d.totals.respondents);
    }

    // --- Aggregate -----------------------------------------------------------
    function renderAgg(d) {
        var a = d.aggregate, st = d.stance;
        hbar('chartAgg', ['Support impact (any form)', 'Oppose impact in the MBM'], [
            { label: 'In the MBM, explicit', backgroundColor: S().positive, data: [a.support_mbm, 0] },
            { label: 'In the MBM, implied', backgroundColor: withAlpha(S().positive, 0.7), data: [a.support_implied, 0] },
            { label: 'Mixed', backgroundColor: S().muted, data: [a.mixed, 0] },
            { label: 'Separate metric only', backgroundColor: withAlpha(S().positive, 0.5), data: [a.separate_only, 0] },
            { label: 'Consequential metric, no MBM position', backgroundColor: withAlpha(S().positive, 0.25), data: [a.consequential_only, 0] },
            { label: 'Oppose', backgroundColor: S().negative, data: [0, st.oppose] }
        ], { stacked: true, label: function (c) { return c.dataset.label + ': ' + c.parsed.x; } });
        set('aggNote', 'Support, not language: ' + a.concept_any + ' of ' + d.totals.respondents + ' (' + pct(a.concept_any, d.totals.respondents) +
            ') support impact in some form; ' + st.oppose + ' oppose it in the MBM. ' + st.neutral + ' of the ' + d.totals.coded + ' respondents read took no position.');
    }

    // --- Quotes ----------------------------------------------------------------
    function renderQuotes(d) {
        var tabs = [
            { key: 'not_far_enough', label: 'Not far enough' },
            { key: 'far_enough', label: 'Far enough' },
            { key: 'wrong_direction', label: 'Different approach' },
            { key: 'explicit', label: 'More than SSS' },
            { key: 'displace', label: 'Replace MBM' },
            { key: 'oppose', label: 'Oppose' }
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
        draw('not_far_enough');
    }

    // --- Who they are ------------------------------------------------------
    function renderDemographics(d) {
        var groups = [
            { key: 'support', label: 'Support in MBM' },
            { key: 'explicit', label: 'More than SSS' },
            { key: 'not_far_enough', label: 'Not far enough' },
            { key: 'far_enough', label: 'Far enough' },
            { key: 'wrong_direction', label: 'Different approach' },
            { key: 'displace', label: 'Replace MBM' },
            { key: 'oppose', label: 'Oppose' }
        ];
        var dims = [
            { key: 'org_type', label: 'Organisation type' },
            { key: 'country', label: 'Country' },
            { key: 'sector', label: 'Sector' }
        ];
        var state = { g: 'support', dim: 'org_type' }, chart = null;
        function draw() {
            var rows = d.demographics[state.dim].filter(function (r) { return r[state.g] > 0; })
                .sort(function (x, y) { return y[state.g] - x[state.g]; });
            if (chart) chart.destroy();
            chart = hbar('chartDemo', rows.map(function (r) { return r.label; }), [{
                label: 'Respondents',
                data: rows.map(function (r) { return r[state.g]; }),
                backgroundColor: state.g === 'oppose' ? S().negative : S().positive
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
    var STANCE = { support_mbm: 'Impact in MBM', separate_only: 'Impact only outside scope 2', oppose: 'Opposes impact in MBM', mixed: 'Mixed', neutral: '' };
    var BEYOND = { explicit: 'more than SSS', implicit: 'more than proposal', sss_enough: 'SSS is enough' };
    var SUFF = { not_far_enough: 'proposal not far enough', far_enough: 'proposal far enough', wrong_direction: 'different approach', too_far: 'proposal too far' };
    var CONS = { displace: 'replace MBM with consequential', inside_option: 'consequential option in scope 2', separate: 'separate metric', oppose: 'no consequential metric' };
    var CAMP = { pro_both: 'supports hourly + deliverability', anti_both: 'opposes hourly + deliverability', split: 'mixed on hourly + deliverability', skipped: '' };

    function position(o) {
        return [STANCE[o.system_impact], BEYOND[o.beyond_sss], SUFF[o.sufficiency], CONS[o.consequential], CAMP[o.camp]]
            .filter(Boolean).join(' · ');
    }

    function renderOrgs(d) {
        var filters = [
            { key: 'support', label: 'Impact in MBM' },
            { key: 'explicit', label: 'More than SSS' },
            { key: 'not_far', label: 'Not far enough' },
            { key: 'far', label: 'Far enough' },
            { key: 'wrong', label: 'Different approach' },
            { key: 'displace', label: 'Replace MBM' },
            { key: 'oppose', label: 'Oppose' }
        ];
        var test = {
            support: function (o) { return o.system_impact === 'support_mbm'; },
            explicit: function (o) { return o.beyond_sss === 'explicit'; },
            not_far: function (o) { return o.sufficiency === 'not_far_enough'; },
            far: function (o) { return o.sufficiency === 'far_enough'; },
            wrong: function (o) { return o.sufficiency === 'wrong_direction'; },
            displace: function (o) { return o.consequential === 'displace'; },
            oppose: function (o) { return o.system_impact === 'oppose'; }
        };
        var state = { f: 'support', q: '' };
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
        set('orgUnnamed', 'Not named: ' + d.unnamed.support + ' supporters and ' + d.unnamed.oppose + ' opponents who are redacted, individuals or unidentifiable.');
        draw();
    }

    function renderXcheck(d) {
        function agree(x, prior) {
            var n = 0;
            x.cells.forEach(function (c) {
                if (c.prior === prior && (c.now === 'support_mbm' || c.now === 'mixed' || c.now === 'separate_only')) n += c.n;
            });
            return n;
        }
        var A = d.crosscheck.additionality, I = d.crosscheck.impact;
        var aSup = A.cells.filter(function (c) { return c.prior === 'support'; }).reduce(function (s, c) { return s + c.n; }, 0);
        var iSup = I.cells.filter(function (c) { return c.prior === 'support'; }).reduce(function (s, c) { return s + c.n; }, 0);
        set('xcheckNote', agree(A, 'support') + ' of ' + aSup + ' additionality-page supporters and ' + agree(I, 'support') + ' of ' + iSup +
            ' impact-page supporters are again coded as supporting impact here');
    }

    function render(d) {
        renderStats(d);
        renderBrief(d);
        renderFunnel(d);
        renderSufficiency(d);
        renderMech(d);
        renderCons(d);
        renderAgg(d);
        renderQuotes(d);
        renderDemographics(d);
        renderOrgs(d);
        renderXcheck(d);
    }

    document.addEventListener('DOMContentLoaded', function () {
        S2Data.load('mbm_impact').then(render).catch(function (err) {
            S2Data.errorPanel(document.getElementById('quoteList'), err);
        });
    });
})();
