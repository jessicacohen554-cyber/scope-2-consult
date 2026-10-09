// ============================================================================
// Emissions impact page
// ============================================================================
// Site-specific module. Renders data/impact.json (written by
// scripts/analytics/impact.py export).
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
                    y: { stacked: !!opts.stacked, ticks: { autoSkip: false } }
                }
            }
        });
    }

    // Stacked 100% bars: rows = [[label, {key: n}]], parts = [{k, label, color}].
    function share(id, rows, parts) {
        return hbar(id, rows.map(function (r) {
            var n = parts.reduce(function (s, p) { return s + (r[1][p.k] || 0); }, 0);
            return r[0] + ' (n=' + n + ')';
        }), parts.map(function (p) {
            return {
                label: p.label, backgroundColor: p.color,
                data: rows.map(function (r) {
                    var n = parts.reduce(function (s, q) { return s + (r[1][q.k] || 0); }, 0);
                    return n ? +(100 * (r[1][p.k] || 0) / n).toFixed(1) : 0;
                }),
                _n: rows.map(function (r) { return r[1][p.k] || 0; })
            };
        }), {
            stacked: true, max: 100,
            tick: function (v) { return v + '%'; },
            label: function (c) { return c.dataset.label + ': ' + c.dataset._n[c.dataIndex] + ' (' + c.parsed.x + '%)'; }
        });
    }

    // Chart.js draws an array label as stacked lines.
    function wrap(text, width) {
        var lines = [''];
        text.split(' ').forEach(function (w) {
            var last = lines[lines.length - 1];
            if (last && (last + ' ' + w).length > width) lines.push(w);
            else lines[lines.length - 1] = last ? last + ' ' + w : w;
        });
        return lines;
    }

    function counts(id, labels, values, color) {
        return hbar(id, labels, [{ label: 'Respondents', data: values, backgroundColor: color }], {
            legend: false, label: function (c) { return c.parsed.x + ' respondents'; }
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

    var Q146_PARTS = function () {
        return [
            { k: 'yes', label: 'Yes', color: S().positive },
            { k: 'somewhat', label: 'Somewhat', color: withAlpha(S().positive, 0.5) },
            { k: 'no', label: 'No', color: S().muted },
            { k: 'oppose_outside', label: 'Oppose outside scope 2', color: S().negative }
        ];
    };

    // --- Headline ----------------------------------------------------------
    function renderStats(d) {
        var N = d.totals.respondents, st = d.stance.all, q = d.q146.all, v = d.venue.support;
        set('statMention', stat(d.mentions.any, N));
        set('statSupport', stat(st.support, N));
        set('statSupportSub', (v.inventory + v.both) + ' want it inside scope 2 · ' + v.separate +
            ' beside it · ' + v.unspecified + ' not said');
        set('statOppose', stat(st.oppose, N));
        set('statMixed', st.mixed);
        set('statQYes', stat(q.yes + q.somewhat, q.answered));
        set('statQNo', stat(q.no, q.answered));
        set('statQOpp', stat(q.oppose_outside, q.answered));
        set('statQn', q.answered);
    }

    // --- In brief (numbers from the data, wording fixed) -------------------
    function renderBrief(d) {
        var N = d.totals.respondents, st = d.stance.all, v = d.venue.support, q = d.q146;
        var c = d.camps, inv = v.inventory + v.both, oppN = st.oppose;
        var notCoded = q.not_coded.oppose_outside;
        var items = [
            '<strong>Raised by more than half.</strong> ' + d.mentions.any + ' respondents (' + pct(d.mentions.any, N) +
                ') used impact, causal, consequential or additionality language in free text.',
            '<strong>Support outweighs opposition five to one, but many take no position.</strong> ' + st.support + ' support measuring or rewarding real-world impact, ' +
                oppN + ' oppose it and ' + st.mixed + ' are mixed. The other ' + st.neutral + ' mostly use "climate impact" only as a yardstick for a proposal.',
            '<strong>Supporters split evenly on where impact belongs.</strong> ' + inv + ' want it inside the scope 2 inventory or its claims, ' + v.separate +
                ' want a separate metric beside it, and ' + v.unspecified + ' do not say.',
            '<strong>"Inside scope 2" is mostly the camp that opposes hourly matching.</strong> ' + c.inventory.anti_both + ' of the ' + inv +
                ' oppose both hourly matching and deliverability; ' + c.inventory.pro_both + ' support both.',
            '<strong>Opposition comes mainly from hourly-matching supporters.</strong> ' + c.oppose.pro_both + ' of the ' + oppN +
                ' opponents support both hourly matching and deliverability, often through a shared passage saying no impact method yet meets integrity, impact and feasibility.',
            '<strong>Q146 is a poor read on the concept.</strong> "No" (would not change my view) is not opposition: ' + q.stance_support.no +
                ' coded supporters answered it. Of the ' + q.all.oppose_outside + ' who chose "do not support impact metrics outside scope 2", ' +
                notCoded + ' did not raise the topic in free text.',
            '<strong>Opponents doubt the measurement more than the goal.</strong> ' + d.oppose_reason.oppose.method + ' of ' + oppN +
                ' cite no agreed or auditable method. In Q150 the top reasons are no agreed methodology (' + d.q150.options[0].n + ') and auditability (' + d.q150.options[1].n + ').'
        ];
        set('briefList', items.map(function (t) { return '<li>' + t + '</li>'; }).join(''));
    }

    // --- Q146 by camp --------------------------------------------------------
    function renderQ146(d) {
        var q = d.q146;
        share('chartQ146', [
            ['All answerers', q.all],
            ['Support hourly + deliverability', q.camp_pro_both],
            ['Mixed', q.camp_split],
            ['Oppose hourly + deliverability', q.camp_anti_both]
        ], Q146_PARTS());
    }

    // --- What Q146 hides -----------------------------------------------------
    function renderHides(d) {
        var q = d.q146;
        share('chartHides', [
            ['Coded support', q.stance_support],
            ['Coded mixed', q.stance_mixed],
            ['Coded neutral', q.stance_neutral],
            ['Coded oppose', q.stance_oppose],
            ['Did not raise the topic', q.not_coded]
        ], Q146_PARTS());
        var bv = d.q146_by_venue;
        set('hidesNote', '"No" means the metric would not change the respondent\'s view of the revisions, not that they oppose impact metrics. ' +
            'The ' + q.stance_support.oppose_outside + ' coded supporters who chose "oppose outside scope 2" are mostly ones who want impact inside it (' +
            (bv.inventory.oppose_outside + bv.both.oppose_outside) + ').');
    }

    // --- Survey reasons --------------------------------------------------------
    function renderReasons(d) {
        function draw(id, noteId, block, color, gate) {
            var opts = block.options.filter(function (o) { return !/^Other/.test(o.text); });
            counts(id, opts.map(function (o) { return wrap(o.text, 34); }),
                opts.map(function (o) { return o.n; }), color);
            set(noteId, 'Respondents who answered ' + gate + ' (' + block.n + '); pick any. "Other" omitted.');
        }
        draw('chartQ147', 'q147Note', d.q147, S().positive, '"yes" or "somewhat"');
        draw('chartQ150', 'q150Note', d.q150, S().negative, '"do not support outside scope 2"');
    }

    // --- Where: venue x camp -------------------------------------------------
    function renderWhere(d) {
        var c = d.camps;
        var unspecified = {};
        ['pro_both', 'split', 'skipped', 'anti_both'].forEach(function (k) {
            unspecified[k] = c.support[k] - c.inventory[k] - c.separate[k];
        });
        share('chartWhere', [
            ['Inside scope 2', c.inventory],
            ['Beside it (separate metric)', c.separate],
            ['Not said', unspecified],
            ['Coded opponents', c.oppose]
        ], [
            { k: 'pro_both', label: 'Support hourly + deliverability', color: S().positive },
            { k: 'split', label: 'Mixed', color: S().muted },
            { k: 'skipped', label: 'Skipped', color: R().gap },
            { k: 'anti_both', label: 'Oppose both', color: S().negative }
        ]);
    }

    function renderForm(d) {
        var f = d.form, o = d.oppose_reason.oppose;
        counts('chartForm', ['Marginal / emissionality', 'Additional / new capacity', 'Avoided emissions / consequential', 'General'],
            [f.marginal, f.additionality, f.avoided, f.general], S().positive);
        counts('chartWhy', ['No agreed or auditable method', 'Does not belong in attributional accounting', 'Greenwashing', 'Diverts from hourly / deliverable', 'Other'],
            [o.method, o.attributional, o.greenwash, o.diverts, o.other], S().negative);
    }

    // --- Who said what -----------------------------------------------------
    function renderQuotes(d) {
        var tabs = [
            { key: 'inventory', label: 'Inside scope 2' },
            { key: 'separate', label: 'Separate metric' },
            { key: 'mixed', label: 'Mixed' },
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
        draw('inventory');
    }

    // --- Who they are ------------------------------------------------------
    function renderDemographics(d) {
        var groups = [
            { key: 'support', label: 'All supporters' },
            { key: 'inventory', label: 'Inside scope 2' },
            { key: 'separate', label: 'Separate metric' },
            { key: 'oppose', label: 'Oppose' },
            { key: 'q146_yes', label: 'Q146 yes / somewhat' },
            { key: 'q146_oppose', label: 'Q146 oppose outside' }
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
                backgroundColor: state.g === 'oppose' || state.g === 'q146_oppose' ? S().negative : S().positive
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
    var VENUE = { inventory: 'inside scope 2', both: 'inside scope 2 and separate', separate: 'separate metric', unspecified: '' };
    var REASON = { method: 'no agreed method', attributional: 'not attributional', greenwash: 'greenwashing',
                   diverts: 'diverts from hourly', other: '' };
    var CAMP = { pro_both: 'supports hourly + deliverability', anti_both: 'opposes hourly + deliverability',
                 split: 'mixed on hourly + deliverability', skipped: '' };

    function position(o) {
        var parts = [{ support: 'Supports', oppose: 'Opposes', mixed: 'Mixed' }[o.stance]];
        if (o.stance !== 'oppose' && VENUE[o.venue]) parts.push(VENUE[o.venue]);
        if (o.stance !== 'support' && REASON[o.oppose_reason]) parts.push(REASON[o.oppose_reason]);
        if (CAMP[o.camp]) parts.push(CAMP[o.camp]);
        return parts.join(' · ');
    }

    function renderOrgs(d) {
        var filters = [
            { key: 'inventory', label: 'Inside scope 2' },
            { key: 'separate', label: 'Separate metric' },
            { key: 'support', label: 'All supporters' },
            { key: 'mixed', label: 'Mixed' },
            { key: 'oppose', label: 'Oppose' }
        ];
        var test = {
            inventory: function (o) { return o.stance === 'support' && (o.venue === 'inventory' || o.venue === 'both'); },
            separate: function (o) { return o.stance === 'support' && o.venue === 'separate'; },
            support: function (o) { return o.stance === 'support'; },
            mixed: function (o) { return o.stance === 'mixed'; },
            oppose: function (o) { return o.stance === 'oppose'; }
        };
        var state = { f: 'inventory', q: '' };
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
        var u = d.unnamed;
        set('orgUnnamed', 'Not named: ' + u.support.redacted + ' redacted, ' + u.support.individual + ' individual and ' + u.support.unidentifiable +
            ' unidentifiable supporters; ' + (u.oppose.redacted + u.oppose.individual + u.oppose.unidentifiable) + ' opponents and ' +
            (u.mixed.redacted + u.mixed.individual + u.mixed.unidentifiable) + ' mixed.');
        draw();
    }

    function renderOverlap(d) {
        var o = d.additionality_overlap, same = 0, flip = 0;
        o.cells.forEach(function (c) {
            if (c.additionality === c.impact) same += c.n;
            if ((c.additionality === 'support' && c.impact === 'oppose') || (c.additionality === 'oppose' && c.impact === 'support')) flip += c.n;
        });
        set('overlapNote', o.n + ' respondents coded in both; same stance for ' + same + ', opposite stances for ' + flip);
    }

    function render(d) {
        renderStats(d);
        renderBrief(d);
        renderQ146(d);
        renderHides(d);
        renderReasons(d);
        renderWhere(d);
        renderForm(d);
        renderQuotes(d);
        renderDemographics(d);
        renderOrgs(d);
        renderOverlap(d);
    }

    document.addEventListener('DOMContentLoaded', function () {
        S2Data.load('impact').then(render).catch(function (err) {
            S2Data.errorPanel(document.getElementById('quoteList'), err);
        });
    });
})();
