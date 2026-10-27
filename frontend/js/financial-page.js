// ============================================================================
// Financial institutions & investors page
// ============================================================================
// Site-specific module. Renders data/financial.json (written by
// scripts/analytics/financial.py export).
//
// COLOR CONTRACT: stance = SEMANTIC_COLORS positive / muted / negative;
// roles = RESOURCE_COLORS (hydro, nuclear, solar, wind, ldes, gap) read at
// runtime so no hex literal appears in this file.
// ============================================================================

(function () {
    'use strict';

    var S = function () { return SEMANTIC_COLORS; };
    var R = function () { return RESOURCE_COLORS; };
    var ANCHOR_Q = [71, 83, 97, 113, 124, 153, 171];
    var ROLE_ORDER = ['data_user', 'capital_allocator', 'own_footprint_reporter', 'investor_network', 'sector_association', 'other'];
    var ROLE_SHORT = {
        data_user: 'Investors using disclosures', capital_allocator: 'Capital providers',
        own_footprint_reporter: 'Own-footprint reporters', investor_network: 'Investor networks',
        sector_association: 'Banking & insurance bodies', intermediary: 'Market intermediary',
        unstated: 'Role not stated', other: 'Intermediary / not stated'
    };
    function roleColor(k) {
        return { data_user: R().hydro, capital_allocator: R().nuclear, own_footprint_reporter: R().solar,
                 investor_network: R().wind, sector_association: R().ldes, other: R().gap,
                 intermediary: R().gap, unstated: R().gap }[k];
    }

    function pct(n, d) { return d ? (100 * n / d).toFixed(1) + '%' : '—'; }
    function pct0(n, d) { return d ? Math.round(100 * n / d) + '%' : '—'; }
    function esc(s) {
        return String(s === null || s === undefined ? '' : s).replace(/[&<>"]/g, function (c) {
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
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: opts.legend !== false, position: 'bottom' },
                    tooltip: { callbacks: { label: opts.label } }
                },
                scales: {
                    x: { stacked: !!opts.stacked, max: opts.max, beginAtZero: true,
                         ticks: { precision: 0, callback: opts.tick || function (v) { return v; } } },
                    y: { stacked: !!opts.stacked, ticks: { autoSkip: false } }
                }
            }
        });
    }

    function toggles(id, options, onPick, initial) {
        var el = document.getElementById(id);
        el.innerHTML = '';
        options.forEach(function (o, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.textContent = o.label;
            var on = initial ? o.key === initial : i === 0;
            b.classList.toggle('active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
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

    // Stacked 100% stance bars. rows = [[label, {n, support, neutral, oppose, mean}]]
    function stanceBars(id, rows) {
        var parts = [
            { k: 'support', label: 'Support (4–5)', color: S().positive },
            { k: 'neutral', label: 'Neutral (3)', color: S().muted },
            { k: 'oppose', label: 'Oppose (1–2)', color: S().negative }
        ];
        return hbar(id, rows.map(function (r) { return r[0] + ' (n=' + r[1].n + ')'; }), parts.map(function (p) {
            return {
                label: p.label, backgroundColor: p.color,
                data: rows.map(function (r) { return r[1].n ? +(100 * r[1][p.k] / r[1].n).toFixed(1) : 0; }),
                _rows: rows
            };
        }), {
            stacked: true, max: 100, tick: function (v) { return v + '%'; },
            label: function (c) {
                var r = c.dataset._rows[c.dataIndex][1];
                return c.dataset.label + ': ' + r[c.dataset.label.split(' ')[0].toLowerCase()] + ' of ' + r.n +
                    ' (' + c.parsed.x + '%) · mean ' + r.mean;
            }
        });
    }

    // Merge small roles into "other" for charting.
    function roleRows(byRole, minN) {
        var rows = [], other = null;
        ROLE_ORDER.slice(0, 5).forEach(function (k) {
            var s = byRole[k];
            if (s && s.n >= minN) rows.push([ROLE_SHORT[k], s, k]);
        });
        ['intermediary', 'unstated'].concat(ROLE_ORDER.slice(0, 5).filter(function (k) { return byRole[k] && byRole[k].n < minN; }))
            .forEach(function (k) {
                var s = byRole[k];
                if (!s || !s.n) return;
                if (!other) other = { n: 0, support: 0, neutral: 0, oppose: 0, _sum: 0 };
                other.n += s.n; other.support += s.support; other.neutral += s.neutral; other.oppose += s.oppose;
                other._sum += (s.mean || 0) * s.n;
            });
        if (other) { other.mean = (other._sum / other.n).toFixed(2); rows.push(['Other roles (pooled)', other, 'other']); }
        return rows;
    }

    // --- Headline ------------------------------------------------------------
    function renderStats(d) {
        var N = d.totals.cohort, c = d.composition;
        set('statCohort', N);
        set('statTiers', d.totals.institutions + ' institutions, ' + d.totals.associations + ' associations');
        set('statRedacted', stat(c.redaction.redacted, N));
        set('statNamed', c.redaction.named);
        var h = d.anchors[0], l = d.anchors[6];
        set('statHourly', h.cohort.support + ' of ' + h.cohort.n + ' <span class="s2-note">· ' + pct(h.cohort.support, h.cohort.n) + '</span>');
        set('statHourlyAll', pct(h.all.support, h.all.n));
        set('statLegacy', l.cohort.support + ' of ' + l.cohort.n + ' <span class="s2-note">· ' + pct(l.cohort.support, l.cohort.n) + '</span>');
        set('statLegacyAll', pct(l.all.support, l.all.n));
    }

    // --- Three voices ----------------------------------------------------------
    function renderVoices(d) {
        var chart = null;
        function draw(q) {
            var a = d.anchors.filter(function (x) { return x.q === q; })[0];
            if (chart) chart.destroy();
            chart = stanceBars('chartVoices', roleRows(a.by_role, 3));
        }
        toggles('voiceQ', d.anchors.map(function (a) { return { key: a.q, label: 'Q' + a.q + ' ' + a.label }; }), draw);
        draw(71);
        set('roleDefs', d.composition.role.filter(function (r) { return r.n; }).map(function (r) {
            return '<div><span class="fi-def-n" style="color:' + roleColor(r.key) + '">' + r.n + '</span><h3>' + esc(r.label) + '</h3>' +
                '<p>' + {
                    data_user: 'Speak as investors or analysts who use companies’ Scope 2 disclosures for benchmarking, targets and engagement.',
                    capital_allocator: 'Speak as financiers, fund managers or lenders of clean-energy assets and the PPAs that back them.',
                    own_footprint_reporter: 'Speak as reporters of their own Scope 2: offices, branches, leased buildings, often across many jurisdictions.',
                    investor_network: 'Membership bodies for asset owners and managers.',
                    sector_association: 'Banking and insurance industry associations.',
                    intermediary: 'Environmental-commodity trader filing as a financial institution.',
                    unstated: 'Gave scale answers or short comments without describing their role.'
                }[r.key] + '</p></div>';
        }).join(''));
    }

    // --- Seven anchors -------------------------------------------------------
    function renderAnchors(d) {
        var rows = [];
        d.anchors.forEach(function (a) {
            rows.push(['Q' + a.q + ' ' + a.label + ' — cohort', a.cohort]);
            rows.push(['Q' + a.q + ' — all respondents', a.all]);
        });
        stanceBars('chartAnchors', rows);
    }

    // --- Themes ----------------------------------------------------------------
    function roleStack(id, items, keyOf, valueOf, label) {
        var groups = ROLE_ORDER.map(function (k) { return { key: k, label: ROLE_SHORT[k], color: roleColor(k) }; });
        function val(item, k) {
            var b = valueOf(item);
            return k === 'other' ? (b.intermediary || 0) + (b.unstated || 0) : (b[k] || 0);
        }
        return hbar(id, items.map(function (t) { return keyOf(t) + ' (' + t.n + ')'; }), groups.map(function (g) {
            return { label: g.label, backgroundColor: g.color, data: items.map(function (t) { return val(t, g.key); }) };
        }), { stacked: true, label: function (c) { return c.dataset.label + ': ' + c.parsed.x; } });
    }

    function renderThemes(d) {
        var items = d.themes.filter(function (t) { return t.n; }).sort(function (a, b) { return b.n - a.n; });
        roleStack('chartThemes', items, function (t) { return t.label; }, function (t) { return t.by_role; });
    }

    // --- Additionality -------------------------------------------------------
    function renderAdditionality(d) {
        var t = d.themes.filter(function (x) { return x.key === 'additionality_gap'; })[0];
        var rows = ROLE_ORDER.map(function (k) {
            var n = k === 'other' ? (t.by_role.intermediary || 0) + (t.by_role.unstated || 0) : (t.by_role[k] || 0);
            var base = d.composition.role.filter(function (r) { return k === 'other' ? (r.key === 'intermediary' || r.key === 'unstated') : r.key === k; })
                .reduce(function (s, r) { return s + r.n; }, 0);
            if (k === 'data_user') base -= 1; // duplicate filing excluded from tallies
            return { k: k, n: n, base: base };
        }).filter(function (r) { return r.base; });
        hbar('chartAddRole', rows.map(function (r) { return ROLE_SHORT[r.k]; }), [{
            label: 'Raised additionality or incrementality', backgroundColor: rows.map(function (r) { return roleColor(r.k); }),
            data: rows.map(function (r) { return r.n; })
        }], { legend: false, label: function (c) { var r = rows[c.dataIndex]; return r.n + ' of ' + r.base + ' in this role'; } });
        set('addNote', t.n + ' of ' + d.totals.tally_base + ' distinct voices (' + pct(t.n, d.totals.tally_base) +
            ') raised it; the whole survey’s rate is 25.1%. No cohort member argued against the concept.');
        var ar = d.additionality_route;
        set('addInventory', (ar.inventory || 0) + (ar.both ? ' <span class="s2-note">+ ' + ar.both + ' both</span>' : ''));
        set('addChannel', (ar.channel || 0) + (ar.both ? ' <span class="s2-note">+ ' + ar.both + ' both</span>' : ''));
        set('addExisting', d.existing_codes.additionality_coded);
    }

    // --- Impact metric -------------------------------------------------------
    function choiceBars(id, choice, order, colors, note) {
        var opts = order.map(function (o) {
            return choice.options.filter(function (x) { return x.text.indexOf(o.match) === 0; })[0] || { cohort_n: 0, cohort_pct: 0, all_pct: 0, all_n: 0 };
        });
        hbar(id, ['Cohort (n=' + choice.n_cohort + ')', 'All respondents (n=' + choice.n_all + ')'], order.map(function (o, i) {
            return { label: o.label, backgroundColor: colors[i], data: [opts[i].cohort_pct, opts[i].all_pct], _o: opts[i] };
        }), {
            stacked: true, max: 100, tick: function (v) { return v + '%'; },
            label: function (c) { var o = c.dataset._o; return c.dataset.label + ': ' + (c.dataIndex ? o.all_n : o.cohort_n) + ' (' + c.parsed.x + '%)'; }
        });
        if (note) set(note.id, note.text(opts));
    }

    function renderImpact(d) {
        var q = d.choices['146'];
        choiceBars('chartQ146', q, [
            { match: 'Yes', label: 'Yes' }, { match: 'Somewhat', label: 'Somewhat' }, { match: 'No', label: 'No' },
            { match: 'I do not support', label: 'Do not support impact metrics' }
        ], [S().positive, withAlpha(S().positive, 0.5), S().muted, S().negative], {
            id: 'q146Note', text: function (o) {
                return 'Yes or somewhat: ' + (o[0].cohort_n + o[1].cohort_n) + ' of ' + q.n_cohort + ' in the cohort (' +
                    pct(o[0].cohort_n + o[1].cohort_n, q.n_cohort) + ') against ' + (o[0].all_pct + o[1].all_pct).toFixed(1) +
                    '% overall. Outright rejection: ' + o[3].cohort_pct + '% against ' + o[3].all_pct + '%.';
            }
        });
        var im = d.impact_metric;
        var groups = [{ k: 'support', label: 'Wants a separate impact metric', color: S().positive },
                      { k: 'oppose', label: 'Rejects one', color: S().negative },
                      { k: 'none', label: 'Did not take a position in text', color: R().gap }];
        var rows = ROLE_ORDER.filter(function (k) { return k !== 'other'; }).map(function (k) {
            return { k: k, label: ROLE_SHORT[k], vals: groups.map(function (g) { return im[g.k].by_role[k] || 0; }) };
        }).filter(function (r) { return r.vals.reduce(function (s, v) { return s + v; }, 0); });
        hbar('chartImpactRole', rows.map(function (r) { return r.label; }), groups.map(function (g, i) {
            return { label: g.label, backgroundColor: g.color, data: rows.map(function (r) { return r.vals[i]; }) };
        }), { stacked: true, label: function (c) { return c.dataset.label + ': ' + c.parsed.x; } });
        var ex = d.existing_codes;
        set('impactNote', im.support.n + ' voices want a separate consequential or impact metric and ' + im.oppose.n + ' reject one. The site’s ' +
            '<a href="impact.html">impact coder</a> reached ' + ex.impact_coded + ' cohort members and placed ' + (ex.impact_venue.separate || 0) +
            ' supporters outside the inventory against ' + (ex.impact_venue.inventory || 0) + ' inside it.');
    }

    // --- Legacy --------------------------------------------------------------
    function renderLegacy(d) {
        var items = d.legacy_design.filter(function (t) { return t.n; });
        var shortLabel = { full_protection: 'Full protection', guardrails: 'Guardrails', uniform_date: 'Uniform date / parallel reporting',
                           support_unspecified: 'Supports, no design detail', oppose: 'Opposes a legacy clause', not_addressed: 'Not addressed' };
        roleStack('chartLegacy', items, function (t) { return shortLabel[t.key] || t.label; }, function (t) { return t.by_role; });
        var q = d.choices['181'];
        choiceBars('chartQ181', q, [
            { match: 'Legacy clause', label: 'Legacy clause' }, { match: 'Uniform effective date', label: 'Uniform effective date + disaggregated disclosure' },
            { match: 'Other', label: 'Other (incl. parallel reporting)' }
        ], [S().info, S().positive, S().muted], {
            id: 'q181Note', text: function (o) {
                return 'A uniform effective date or an alternative draws ' + (o[1].cohort_n + o[2].cohort_n) + ' of ' + q.n_cohort + ' cohort answers (' +
                    pct(o[1].cohort_n + o[2].cohort_n, q.n_cohort) + ') against ' + (o[1].all_pct + o[2].all_pct).toFixed(1) + '% overall.';
            }
        });
        set('legacyAsks', [
            ['Full protection', 'full_protection', 'Whole original term (no cap), every instrument type including unbundled certificates, legacy status survives transfer or novation, renewals and extensions covered, protection at the asset level across re-contracting cycles. Banking bodies, insurers, reporters with virtual PPAs, a fund manager.'],
            ['Guardrails', 'guardrails', 'Minimum original term (one investor says 10 years), a sunset or 2–3 year cap, no unbundled certificates, no resale, extensions treated as new contracts, limits on contracting between consultation and cutoff, mandatory side-by-side results with and without legacy treatment. Investors using disclosures, investor networks, an impact investor.'],
            ['Uniform date or parallel reporting', 'uniform_date', 'Apply the new criteria to everyone from one date with disaggregated disclosure, or let reporters show a second “legacy treatment” figure for a transition period while targets use the new method. PGIM, Nordea, First Sentier, Just Share.']
        ].map(function (x) {
            var n = d.legacy_design.filter(function (t) { return t.key === x[1]; })[0].n;
            return '<div><span class="fi-def-n">' + n + '</span><h3>' + x[0] + '</h3><p>' + x[2] + '</p></div>';
        }).join(''));
    }

    // --- Quotes ----------------------------------------------------------------
    function renderQuotes(d) {
        function draw(k) {
            var list = d.quotes[k] || [];
            if (!list.length) { set('quoteList', '<p class="s2-empty">No quotes in this theme.</p>'); return; }
            set('quoteList', list.map(function (q) {
                return '<div class="fi-quote-card" style="border-left-color:' + roleColor(q.role) + '"><p class="fi-quote-text">“' + esc(q.quote) + '”</p>' +
                    '<p class="fi-quote-who"><strong>' + esc(q.who) + '</strong><span class="fi-role-chip">' + esc(ROLE_SHORT[q.role]) + '</span> · Q' + q.q + '</p></div>';
            }).join(''));
        }
        toggles('quoteTabs', d.quote_themes.map(function (t) { return { key: t[0], label: t[1] }; }), draw);
        draw(d.quote_themes[0][0]);
    }

    // --- Respondent table --------------------------------------------------------
    function cell(v) {
        if (v === null || v === undefined) return '<td class="fi-num"><span class="s2-note">·</span></td>';
        var color = v >= 4 ? S().positive : v <= 2 ? S().negative : S().muted;
        return '<td class="fi-num"><span class="fi-cell" style="background:' + withAlpha(color, 0.18) + ';color:' + color + '">' + v + '</span></td>';
    }
    var LEGACY_SHORT = { full_protection: 'Full protection', guardrails: 'Guardrails', uniform_date: 'Uniform date',
                         support_unspecified: 'Supports', oppose: 'Opposes', not_addressed: '—' };
    function renderRespondents(d) {
        var labelOf = {};
        d.theme_labels.forEach(function (t) { labelOf[t[0]] = t[1]; });
        var filters = [{ key: 'all', label: 'All ' + d.totals.cohort }].concat(
            d.composition.role.filter(function (r) { return r.n; }).map(function (r) { return { key: r.key, label: ROLE_SHORT[r.key] + ' (' + r.n + ')' }; }));
        var state = { f: 'all', q: '' };
        function draw() {
            var list = d.respondents.filter(function (r) { return state.f === 'all' || r.role === state.f; }).filter(function (r) {
                if (!state.q) return true;
                var hay = (r.name + ' ' + r.descriptor + ' ' + r.country + ' ' + r.claimed_type + ' ' + r.themes.map(function (t) { return labelOf[t]; }).join(' ') + ' ' + r.note).toLowerCase();
                return hay.indexOf(state.q) !== -1;
            }).sort(function (a, b) {
                if (a.named !== b.named) return a.named ? -1 : 1;
                return (a.name || a.descriptor).localeCompare(b.name || b.descriptor);
            });
            set('respCount', list.length + ' respondent' + (list.length === 1 ? '' : 's') + ' shown · ' +
                list.filter(function (r) { return r.named; }).length + ' named');
            if (!list.length) { set('respTable', '<p class="s2-empty">No respondents match.</p>'); return; }
            var head = '<thead><tr><th>Who</th><th>Role</th><th>Claimed type · audited</th><th>Country</th>' +
                ANCHOR_Q.map(function (q) { return '<th class="fi-num">Q' + q + '</th>'; }).join('') +
                '<th class="fi-num">Themes</th><th>Legacy</th><th>Impact metric</th><th class="fi-num">Shared text</th></tr></thead>';
            var body = list.map(function (r) {
                var who = r.named ? '<strong>' + esc(r.name) + '</strong>' : '<span>' + esc(r.descriptor) + '</span>';
                var legacy = r.legacy_design.split(';').map(function (k) { return LEGACY_SHORT[k] || k; }).join(' + ');
                var impact = { support: 'Wants one', oppose: 'Rejects', none: '—' }[r.impact_metric];
                return '<tr class="fi-row" data-id="' + r.id + '" tabindex="0"><td>' + who + (r.duplicate_of ? ' <span class="fi-role-chip">duplicate of ' + r.duplicate_of + '</span>' : '') + '</td>' +
                    '<td><span class="fi-role-chip" style="margin-left:0;border-left:3px solid ' + roleColor(r.role) + '">' + esc(ROLE_SHORT[r.role]) + '</span></td>' +
                    '<td>' + esc(r.claimed_type) + ' · ' + esc(r.audited) + '</td><td>' + esc(r.country) + '</td>' +
                    r.anchors.map(cell).join('') +
                    '<td class="fi-num">' + r.themes.length + '</td><td>' + esc(legacy) + '</td><td>' + impact + '</td>' +
                    '<td class="fi-num">' + (r.shared_outside || '') + '</td></tr>' +
                    '<tr class="fi-detail" data-for="' + r.id + '" hidden><td colspan="' + (8 + ANCHOR_Q.length) + '"><div class="fi-detail-grid">' +
                    '<div><strong>Quote' + (r.quote_q ? ' (Q' + r.quote_q + ')' : '') + ':</strong> ' + (r.quote ? '“' + esc(r.quote) + '”' : '<span class="s2-note">no free text</span>') + '</div>' +
                    '<div><strong>Themes:</strong> ' + (r.themes.length ? r.themes.map(function (t) { return esc(labelOf[t]); }).join('; ') : '<span class="s2-note">none coded</span>') +
                    '<br><strong>Q146:</strong> ' + (r.q146 ? esc(r.q146) : '<span class="s2-note">not answered</span>') +
                    '<br><strong>Sector:</strong> ' + esc(r.sector) + ' · <strong>completed</strong> ' + r.completion_pct + '% of the survey' +
                    (r.note ? '<br><strong>Note:</strong> ' + esc(r.note) : '') + '</div></div></td></tr>';
            }).join('');
            set('respTable', '<table class="data-table">' + head + '<tbody>' + body + '</tbody></table>');
            document.querySelectorAll('#respTable tr.fi-row').forEach(function (tr) {
                function toggle() {
                    var det = document.querySelector('#respTable tr.fi-detail[data-for="' + tr.getAttribute('data-id') + '"]');
                    if (det) det.hidden = !det.hidden;
                }
                tr.addEventListener('click', toggle);
                tr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
            });
        }
        toggles('respRole', filters, function (k) { state.f = k; draw(); });
        document.getElementById('respSearch').addEventListener('input', function (e) { state.q = e.target.value.trim().toLowerCase(); draw(); });
        draw();
    }

    function render(d) {
        renderStats(d);
        renderVoices(d);
        renderAnchors(d);
        renderThemes(d);
        renderAdditionality(d);
        renderImpact(d);
        renderLegacy(d);
        renderQuotes(d);
        renderRespondents(d);
    }

    document.addEventListener('DOMContentLoaded', function () {
        S2Data.load('financial').then(render).catch(function (err) {
            S2Data.errorPanel(document.getElementById('respTable'), err);
        });
    });
})();
