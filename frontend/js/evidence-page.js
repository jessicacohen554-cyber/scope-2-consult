// ============================================================================
// S2Evidence - Research & Evidence Integrity page (evidence.html)
// ============================================================================
// Site-specific module (not an upstream design-system file).
//
// Consumes `evidence.json` (PLAN §5) plus `clusters.json` for the
// template-propagation panel. Every panel renders its own base (n) and keeps a
// "what this can't tell you" footnote next to the number, because the survey
// instrument itself cannot separate peer-reviewed work from grey literature
// (PLAN §3.7) — so every signal on this page is weaker than it looks:
//
//   * the basis questions are SELF-DECLARED and unverified;
//   * the citation flag is a STRING MATCH (url/doi/et al./peer-review/.pdf),
//     which says nothing about whether a source was read or supports the claim;
//   * a linked domain is a HOST, not a document — advocacy PDFs live on
//     government servers and preprints live on repository servers.
//
// Shape drift: the exported contract puts `citations.by_redaction` /
// `citations.by_stance_q71` in the list-of-rows shape used by `by_org_type`
// (see evidence.json `_comment`), while the P11 fixtures use the `{key: {...}}`
// object shorthand from PLAN §5. Both are accepted here so `?fixtures=1` works.
//
// Colors come only from chart-colors.js constants and CSS custom properties.
// ============================================================================

(function () {
    'use strict';

    var R = function () { return window.RESOURCE_COLORS || {}; };
    var S = function () { return window.SEMANTIC_COLORS || {}; };
    var alpha = function (c, a) {
        return window.withAlpha ? window.withAlpha(c, a) : c;
    };

    // ---- Q158 exemption-evidence coding ------------------------------------
    // NOT part of the JSON contract. P21 coded all 297 free-text answers to
    // Q158 into evidence-type buckets and committed the result to
    // data/derived/q158_evidence_coding.csv, which sits outside the served
    // frontend/ root — evidence.json does not carry it and this page may not
    // touch the exporter, so the aggregate is inlined verbatim with its
    // provenance on the panel. Codes are not mutually exclusive (798 code
    // assignments over 297 respondents, 1–5 codes each).
    var Q158 = {
        source: 'data/derived/q158_evidence_coding.csv',
        n: 297,
        any_hard_cite: 24,          // respondents coded cites_study OR cites_own_data
        codes: [
            { text: 'Feasibility argument (cannot be done yet)', n: 222, pct: 74.7 },
            { text: 'Cost argument', n: 163, pct: 54.9 },
            { text: 'Data-access argument (no hourly data)', n: 148, pct: 49.8 },
            { text: 'SME / equity argument', n: 122, pct: 41.1 },
            { text: 'Asserts evidence exists, supplies none', n: 67, pct: 22.6 },
            { text: 'Other', n: 35, pct: 11.8 },
            { text: 'Anecdote only', n: 16, pct: 5.4 },
            { text: 'Cites a study', n: 16, pct: 5.4 },
            { text: 'Cites own data / analysis', n: 9, pct: 3.0 }
        ]
    };

    // ---- Vocabulary ---------------------------------------------------------
    var BASIS_QS = [
        { key: 'q138', tab: 'Q138 · MBM', multi: true,
          blurb: 'Q138 — basis for the MBM usefulness assessment (multi-select).' },
        { key: 'q56', tab: 'Q56 · LBM', multi: false,
          blurb: 'Q56 — the same question asked about the location-based method (single-select comparator).' },
        { key: 'q122', tab: 'Q122 · Registry readiness', multi: false,
          blurb: 'Q122 — basis for judging whether registries are ready (single-select).' }
    ];

    // Basis options ranked hardest → softest evidence, so one color assignment
    // reads the same way across all three questions.
    var BASIS_TIERS = [
        { key: 'empirical',   match: /direct empirical/i,          label: 'Direct empirical analysis',  token: 'wind' },
        { key: 'pilot',       match: /pilot\/production/i,          label: 'Pilot/production use',       token: 'wind' },
        { key: 'operational', match: /operational experience/i,     label: 'Operational experience',     token: 'hydro' },
        { key: 'vendor',      match: /operator\/vendor/i,           label: 'Operator/vendor commitments', token: 'hydro' },
        { key: 'roadmap',     match: /public roadmap/i,             label: 'Public roadmap/docs',        token: 'nuclear' },
        { key: 'judgment',    match: /professional judgment/i,      label: 'Professional judgment',      token: 'nuclear' },
        { key: 'awareness',   match: /general awareness/i,          label: 'General awareness',          token: 'solar' },
        { key: 'other',       match: /^other/i,                     label: 'Other (specify)',            token: 'gap' },
        { key: 'declined',    match: /prefer not to say/i,          label: 'Prefer not to say',          token: 'gap' }
    ];

    var STANCES = [
        { key: 'oppose',  label: 'Oppose',  color: function () { return S().negative; } },
        { key: 'neutral', label: 'Neutral', color: function () { return S().muted; } },
        { key: 'support', label: 'Support', color: function () { return S().positive; } }
    ];

    var DOMAIN_CLASSES = [
        { key: 'peer_reviewed',             label: 'Peer-reviewed journal host', token: 'nuclear' },
        { key: 'peer_reviewed_or_preprint', label: 'Preprint / repository',      token: 'hydro' },
        { key: 'government',                label: 'Government / public body',   token: 'wind' },
        { key: 'standard_setter',           label: 'Standard-setter',            token: 'ccs' },
        { key: 'advocacy',                  label: 'Advocacy / industry',        token: 'solar' },
        { key: 'data_vendor',               label: 'Data vendor',                token: 'battery' },
        { key: 'shortener',                 label: 'Shortener (unverifiable)',   token: 'storage' },
        { key: 'other',                     label: 'Other / unclassified',       token: 'gap' }
    ];

    // ---- Small helpers ------------------------------------------------------
    function esc(s) {
        return String(s === null || s === undefined ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function byId(id) { return document.getElementById(id); }

    function setText(id, value) {
        var el = byId(id);
        if (el) el.textContent = value;
    }

    function setHtml(id, html) {
        var el = byId(id);
        if (el) el.innerHTML = html;
    }

    function isMasked(v) { return v === '<5' || v === null || v === undefined; }

    function num(v) {
        if (isMasked(v)) return '<5';
        return Number(v).toLocaleString('en-US');
    }

    // Exported percentages are 2dp, and binary floats round the wrong way at
    // the .x5 boundary (46.15 → "46.1"), so nudge before fixing the decimals.
    function pct(v, digits) {
        if (v === null || v === undefined || isNaN(v)) return '—';
        var d = digits === undefined ? 1 : digits;
        var scale = Math.pow(10, d);
        return (Math.round((Number(v) + Number.EPSILON) * scale) / scale)
            .toFixed(d) + '%';
    }

    function share(part, whole, digits) {
        if (!whole) return '—';
        return pct(100 * part / whole, digits);
    }

    function tierFor(text) {
        for (var i = 0; i < BASIS_TIERS.length; i++) {
            if (BASIS_TIERS[i].match.test(String(text || ''))) return BASIS_TIERS[i];
        }
        return { key: 'unknown', label: String(text || ''), token: 'gap' };
    }

    function shortBasis(text) { return tierFor(text).label; }

    function classMeta(key) {
        for (var i = 0; i < DOMAIN_CLASSES.length; i++) {
            if (DOMAIN_CLASSES[i].key === key) return DOMAIN_CLASSES[i];
        }
        return { key: key, label: String(key || 'unknown').replace(/_/g, ' '), token: 'gap' };
    }

    function classColor(key) { return R()[classMeta(key).token] || S().muted; }

    function reducedMotion() {
        return !!(window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    // Chart.js clips over-wide category labels instead of shortening them, so
    // budget characters against canvas width and wrap onto at most two lines.
    function wrapLabel(text, budget) {
        text = String(text === null || text === undefined ? '' : text).trim();
        if (text.length <= budget) return text;
        var words = text.split(/\s+/), lines = [], cur = '';
        for (var i = 0; i < words.length; i++) {
            var next = cur ? cur + ' ' + words[i] : words[i];
            if (next.length <= budget) { cur = next; continue; }
            if (cur) lines.push(cur);
            cur = words[i];
            if (lines.length >= 2) { cur = ''; break; }
        }
        if (cur && lines.length < 2) lines.push(cur);
        if (!lines.length) lines.push(text.slice(0, budget));
        if (lines.join(' ').length < text.replace(/\s+/g, ' ').length) {
            lines[lines.length - 1] = lines[lines.length - 1] + '…';
        }
        return lines;
    }

    function axisLabels(canvas, texts, shareOfWidth) {
        var width = (canvas && canvas.clientWidth) ||
            (canvas && canvas.parentNode && canvas.parentNode.clientWidth) || 480;
        var budget = Math.max(12, Math.floor(width * (shareOfWidth || 0.36) / 6.6));
        return texts.map(function (t) { return wrapLabel(t, budget); });
    }

    function destroyChart(canvas) {
        if (window.Chart && Chart.getChart) {
            var prev = Chart.getChart(canvas);
            if (prev) prev.destroy();
        }
    }

    function chartMissing(canvas, what) {
        var host = canvas && canvas.parentNode;
        if (host) {
            host.innerHTML = '<div class="card s2-error" role="alert">' +
                '<div class="s2-error-title">Chart library unavailable</div>' +
                '<p class="s2-error-hint">Chart.js did not load, so the ' +
                esc(what) + ' cannot be drawn.</p></div>';
        }
        return null;
    }

    function baseOpts(extra) {
        var o = {
            responsive: true,
            maintainAspectRatio: false,
            animation: reducedMotion() ? false : undefined
        };
        Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; });
        return o;
    }

    // Dashed reference line on the value axis of a horizontal bar chart.
    function refLine(value, label) {
        return {
            id: 'evRefLine',
            afterDatasetsDraw: function (chart) {
                if (value === null || value === undefined || isNaN(value)) return;
                var x = chart.scales.x, area = chart.chartArea, ctx = chart.ctx;
                if (!x || !area) return;
                var px = x.getPixelForValue(value);
                ctx.save();
                ctx.strokeStyle = S().muted;
                ctx.setLineDash([4, 4]);
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(px, area.top);
                ctx.lineTo(px, area.bottom);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = S().muted;
                ctx.font = '600 10px ' + (Chart.defaults.font.family || 'sans-serif');
                ctx.textAlign = px > (area.left + area.right) / 2 ? 'right' : 'left';
                ctx.textBaseline = 'top';
                ctx.fillText(label, px + (ctx.textAlign === 'right' ? -4 : 4), area.top + 2);
                ctx.restore();
            }
        };
    }

    function table(head, rows, opts) {
        opts = opts || {};
        var html = '<table class="data-table' +
            (opts.wide ? ' ev-table-wide' : '') + '">';
        if (opts.caption) html += '<caption class="sr-only">' + esc(opts.caption) + '</caption>';
        html += '<thead><tr>' + head.map(function (h) {
            return '<th scope="col">' + esc(h) + '</th>';
        }).join('') + '</tr></thead><tbody>' + rows.map(function (r) {
            return '<tr>' + r.map(function (cell, i) {
                var isNum = i > 0 && !(cell && cell.raw);
                var text = (cell && cell.raw !== undefined) ? cell.raw : esc(cell);
                var cls = (cell && cell.cls) ? cell.cls : (isNum ? 'num' : '');
                var tag = i === 0 ? 'th' : 'td';
                var scope = i === 0 ? ' scope="row"' : '';
                return '<' + tag + scope + (cls ? ' class="' + cls + '"' : '') + '>' +
                    text + '</' + tag + '>';
            }).join('') + '</tr>';
        }).join('') + '</tbody></table>';
        return html;
    }

    function raw(html, cls) { return { raw: html, cls: cls || '' }; }

    // Toggle group wiring: one `.toggle-btn-group` of buttons carrying data-val.
    function wireToggle(el, onPick) {
        if (!el) return;
        el.addEventListener('click', function (ev) {
            var btn = ev.target.closest ? ev.target.closest('button[data-val]') : null;
            if (!btn || !el.contains(btn)) return;
            Array.prototype.forEach.call(el.querySelectorAll('button[data-val]'),
                function (b) {
                    var on = b === btn;
                    b.classList.toggle('active', on);
                    b.setAttribute('aria-pressed', on ? 'true' : 'false');
                });
            onPick(btn.getAttribute('data-val'));
        });
    }

    // ---- Shape normalizers --------------------------------------------------
    // Accepts [{key,label,n,citing,pct}] or {key: {n,citing,pct}}.
    function segRows(value) {
        if (!value) return [];
        if (Array.isArray(value)) {
            return value.map(function (r) {
                return {
                    key: r.key,
                    label: r.label || labelForKey(r.key),
                    n: r.n, citing: r.citing, pct: r.pct
                };
            });
        }
        return Object.keys(value).map(function (k) {
            var r = value[k] || {};
            return {
                key: k, label: r.label || labelForKey(k),
                n: r.n, citing: r.citing, pct: r.pct
            };
        });
    }

    function labelForKey(key) {
        var quotes = window.S2Quotes;
        if (quotes && quotes.ORG_LABELS && quotes.ORG_LABELS[key]) {
            return quotes.ORG_LABELS[key];
        }
        var fixed = {
            named: 'Named', redacted: 'Redacted',
            oppose: 'Oppose', neutral: 'Neutral', support: 'Support'
        };
        if (fixed[key]) return fixed[key];
        return String(key || '').replace(/_/g, ' ');
    }

    function rate(row) {
        if (isMasked(row.n) || isMasked(row.citing)) return null;
        if (row.pct !== null && row.pct !== undefined) return row.pct;
        return row.n ? 100 * row.citing / row.n : 0;
    }

    // ========================================================================
    // Panel 1 — evidence-basis distributions (Q138 / Q56 / Q122)
    // ========================================================================
    function initBasis(ev) {
        var basis = ev.basis || {};
        var host = byId('basisTable');
        var canvas = byId('chartBasis');
        var available = BASIS_QS.filter(function (q) { return basis[q.key]; });

        if (!available.length) {
            if (host) host.innerHTML = '<div class="card s2-empty">' +
                'evidence.json carries no <code>basis</code> block.</div>';
            return;
        }

        var group = byId('basisToggle');
        if (group) {
            group.innerHTML = available.map(function (q, i) {
                return '<button type="button" data-val="' + q.key + '"' +
                    (i === 0 ? ' class="active" aria-pressed="true"' : ' aria-pressed="false"') +
                    '>' + esc(q.tab) + '</button>';
            }).join('');
            wireToggle(group, draw);
        }

        function draw(key) {
            var spec = available.filter(function (q) { return q.key === key; })[0] ||
                available[0];
            var b = basis[spec.key] || {};
            var options = (b.options || []).slice();
            var base = b.n_answered || 0;
            var selections = options.reduce(function (a, o) { return a + (o.n || 0); }, 0);

            setText('basisBase', 'base: n = ' + num(base) + ' respondents answered ' +
                spec.key.toUpperCase());
            setText('basisLabel', b.label || spec.blurb);
            setText('basisBlurb', spec.blurb);

            var multiChip = byId('basisMultiChip');
            if (multiChip) {
                multiChip.hidden = !spec.multi;
                if (spec.multi) {
                    multiChip.textContent = 'multi-select · ' + num(selections) +
                        ' selections from ' + num(base) + ' respondents';
                }
            }

            if (window.S2Viz && canvas) {
                window.S2Viz.renderOptionBars(canvas, options, {
                    n_answered: base,
                    color: R().hydro,
                    datasetLabel: '% of respondents who answered',
                    labelShare: 0.4
                });
            } else if (canvas) {
                chartMissing(canvas, 'basis distribution');
            }

            if (host) {
                var rows = options.slice().sort(function (a, b2) {
                    return (b2.n || 0) - (a.n || 0);
                }).map(function (o) {
                    var t = tierFor(o.text);
                    return [
                        o.text,
                        num(o.n),
                        pct(o.pct !== undefined ? o.pct : (base ? 100 * o.n / base : 0)),
                        raw('<span class="s2-tag">' + esc(t.label) + '</span>')
                    ];
                });
                host.innerHTML = table(
                    ['Declared basis', 'n', '% of answered', 'Tier'], rows,
                    { caption: (b.label || spec.tab) + ' — declared basis, n = ' + base }
                );
            }

            var note = byId('basisNote');
            if (note) {
                note.textContent = spec.multi
                    ? 'What this can\'t tell you: respondents could pick several bases, so the ' +
                      'shares sum past 100% and there is no way to see which basis actually drove ' +
                      'the answer — and nothing here is verified against any analysis.'
                    : 'What this can\'t tell you: a single declared basis is self-reported and ' +
                      'unverified — "professional judgment" may rest on deep experience or on none, ' +
                      'and the survey never asks which literature was read.';
            }
        }

        draw(available[0].key);
    }

    // ========================================================================
    // Panel 2 — basis × stance
    // ========================================================================
    function initBasisStance(ev) {
        var basis = ev.basis || {};
        var canvas = byId('chartBasisStance');
        var host = byId('basisStanceTable');
        var available = BASIS_QS.filter(function (q) {
            return basis[q.key] && basis[q.key].by_stance_q71;
        });

        if (!available.length) {
            if (host) host.innerHTML = '<div class="card s2-empty">' +
                'No <code>by_stance_q71</code> crossing in evidence.json.</div>';
            return;
        }

        var group = byId('basisStanceToggle');
        if (group) {
            group.innerHTML = available.map(function (q, i) {
                return '<button type="button" data-val="' + q.key + '"' +
                    (i === 0 ? ' class="active" aria-pressed="true"' : ' aria-pressed="false"') +
                    '>' + esc(q.tab) + '</button>';
            }).join('');
            wireToggle(group, draw);
        }

        function draw(key) {
            var spec = available.filter(function (q) { return q.key === key; })[0] ||
                available[0];
            var b = basis[spec.key] || {};
            var cross = b.by_stance_q71 || {};
            var options = (b.options || []).map(function (o) { return o.text; });

            // Column totals per stance = selections (multi) or respondents (single).
            var colTotal = {};
            STANCES.forEach(function (s) {
                var d = cross[s.key] || {};
                colTotal[s.key] = Object.keys(d).reduce(function (a, k) {
                    return a + (d[k] || 0);
                }, 0);
            });
            var grand = STANCES.reduce(function (a, s) { return a + colTotal[s.key]; }, 0);

            var unit = spec.multi ? 'selections' : 'respondents';
            setText('basisStanceBase', 'base: ' + num(grand) + ' ' +
                (spec.multi ? 'basis selections from respondents' : 'respondents') +
                ' answering both ' + spec.key.toUpperCase() +
                ' and Q71 · Oppose ' + num(colTotal.oppose) +
                ' · Neutral ' + num(colTotal.neutral) +
                ' · Support ' + num(colTotal.support));

            var labels = axisLabels(canvas, options.map(shortBasis), 0.4);
            if (!window.Chart) {
                if (canvas) chartMissing(canvas, 'basis-by-stance chart');
            } else if (canvas) {
                destroyChart(canvas);
                new Chart(canvas, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: STANCES.map(function (s) {
                            var c = s.color();
                            return {
                                label: s.label + ' (n=' + num(colTotal[s.key]) + ')',
                                data: options.map(function (o) {
                                    var v = (cross[s.key] || {})[o] || 0;
                                    return colTotal[s.key]
                                        ? Math.round(1000 * v / colTotal[s.key]) / 10 : 0;
                                }),
                                counts: options.map(function (o) {
                                    return (cross[s.key] || {})[o] || 0;
                                }),
                                backgroundColor: alpha(c, 0.72),
                                borderColor: c,
                                borderWidth: 1.5,
                                borderRadius: 3
                            };
                        })
                    },
                    options: baseOpts({
                        indexAxis: 'y',
                        scales: {
                            x: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: '% of that group\'s ' + unit
                                },
                                ticks: {
                                    callback: function (v) { return v + '%'; }
                                }
                            },
                            y: { grid: { display: false }, ticks: { autoSkip: false } }
                        },
                        plugins: {
                            legend: { display: true, position: 'bottom' },
                            tooltip: {
                                callbacks: {
                                    label: function (ctx) {
                                        var n = (ctx.dataset.counts || [])[ctx.dataIndex];
                                        return ctx.dataset.label.replace(/ \(n=.*\)$/, '') +
                                            ': ' + ctx.parsed.x + '% (n=' + n + ')';
                                    }
                                }
                            }
                        }
                    })
                });
            }

            if (host) {
                var rows = options.map(function (o) {
                    var counts = STANCES.map(function (s) {
                        return (cross[s.key] || {})[o] || 0;
                    });
                    var tot = counts.reduce(function (a, v) { return a + v; }, 0);
                    var cells = [shortBasis(o)];
                    STANCES.forEach(function (s, i) {
                        cells.push(num(counts[i]) + ' · ' +
                            share(counts[i], colTotal[s.key]));
                    });
                    cells.push(num(tot));
                    cells.push(share(counts[0], tot) + ' / ' + share(counts[2], tot));
                    return cells;
                });
                host.innerHTML = table(
                    ['Declared basis', 'Oppose n · share of group',
                     'Neutral n · share of group', 'Support n · share of group',
                     'Total', 'Of total: oppose / support'],
                    rows,
                    { wide: true, caption: 'Declared basis by Q71 stance bucket' }
                );
            }

            // Computed read-out: does either side claim more empirical grounding?
            var hard = options.filter(function (o) {
                var t = tierFor(o).key;
                return t === 'empirical' || t === 'pilot';
            })[0];
            var readout = byId('basisStanceReadout');
            if (readout && hard) {
                var op = (cross.oppose || {})[hard] || 0;
                var su = (cross.support || {})[hard] || 0;
                var opShare = colTotal.oppose ? 100 * op / colTotal.oppose : 0;
                var suShare = colTotal.support ? 100 * su / colTotal.support : 0;
                var gap = Math.abs(suShare - opShare);
                var lead = suShare > opShare ? 'Supporters' : 'Opponents';
                var opsSpan = options.filter(function (o) {
                    return tierFor(o).key === 'operational';
                })[0];
                var extra = '';
                if (opsSpan) {
                    var oOp = share((cross.oppose || {})[opsSpan] || 0, colTotal.oppose);
                    var oSu = share((cross.support || {})[opsSpan] || 0, colTotal.support);
                    extra = ' Operational experience is where the two sides do differ: ' +
                        (spec.multi
                            ? oSu + ' of supporters\' selections against ' + oOp + ' of opponents\'.'
                            : oSu + ' of supporters against ' + oOp + ' of opponents.');
                }
                var claim = spec.multi
                    ? esc(shortBasis(hard).toLowerCase()) + ' accounts for ' + pct(opShare) +
                      ' of opponents\' basis selections and ' + pct(suShare) + ' of supporters\''
                    : esc(shortBasis(hard).toLowerCase()) + ' is the declared basis for ' +
                      pct(opShare) + ' of opponents and ' + pct(suShare) + ' of supporters';
                readout.innerHTML = '<strong>Neither camp did much measuring.</strong> ' +
                    'On ' + esc(spec.key.toUpperCase()) + ', ' + claim + ' — ' +
                    esc(lead.toLowerCase()) + ' lead by ' + gap.toFixed(1) +
                    ' percentage points, on bases of ' + num(colTotal.oppose) + ' and ' +
                    num(colTotal.support) + '.' + extra;
            }

            var note = byId('basisStanceNote');
            if (note) {
                note.textContent = spec.multi
                    ? 'What this can\'t tell you: Q138 is multi-select, so the denominator is ' +
                      'selections, not people — no per-respondent rate can be recovered from the ' +
                      'export, and a respondent who ticked four boxes counts four times.'
                    : 'What this can\'t tell you: stance buckets come from Q71 (hourly matching) ' +
                      'alone, so a respondent who opposes hourly matching but backs the rest of ' +
                      'the package sits in "oppose" here.';
            }
        }

        draw(available[0].key);
    }

    // ========================================================================
    // Panel 3 — citation rates by org type, redaction, stance
    // ========================================================================
    function initCitations(ev) {
        var c = ev.citations || {};
        var orgRows = segRows(c.by_org_type);
        var redRows = segRows(c.by_redaction);
        var stanceRows = segRows(c.by_stance_q71);

        var totalN = 0, totalCiting = 0;
        redRows.forEach(function (r) {
            if (!isMasked(r.n)) totalN += r.n;
            if (!isMasked(r.citing)) totalCiting += r.citing;
        });
        var overall = totalN ? 100 * totalCiting / totalN : null;

        setText('citeOverall', overall === null ? '—' : pct(overall));
        setText('citeOverallSub', num(totalCiting) + ' of ' + num(totalN) + ' respondents');

        // --- by org type
        var shown = orgRows.filter(function (r) { return rate(r) !== null; })
            .sort(function (a, b) { return rate(b) - rate(a); });
        var masked = orgRows.filter(function (r) { return rate(r) === null; });

        setText('citeOrgBase', 'base: ' + num(totalN) + ' respondents across ' +
            shown.length + ' org types' +
            (masked.length ? ' · ' + masked.length + ' masked at n<5' : ''));

        var orgCanvas = byId('chartCiteOrg');
        if (orgCanvas && !window.Chart) {
            chartMissing(orgCanvas, 'citation-rate chart');
        } else if (orgCanvas && shown.length) {
            destroyChart(orgCanvas);
            new Chart(orgCanvas, {
                type: 'bar',
                data: {
                    labels: axisLabels(orgCanvas, shown.map(function (r) {
                        return r.label;
                    }), 0.4),
                    datasets: [{
                        label: '% of the group with a citation signal',
                        data: shown.map(function (r) { return Math.round(10 * rate(r)) / 10; }),
                        counts: shown.map(function (r) {
                            return r.citing + ' of ' + r.n;
                        }),
                        backgroundColor: shown.map(function (r) {
                            return alpha(rate(r) >= (overall || 0) ? R().hydro : S().muted, 0.7);
                        }),
                        borderColor: shown.map(function (r) {
                            return rate(r) >= (overall || 0) ? R().hydro : S().muted;
                        }),
                        borderWidth: 1.5,
                        borderRadius: 3
                    }]
                },
                options: baseOpts({
                    indexAxis: 'y',
                    layout: { padding: { right: 12 } },
                    scales: {
                        x: {
                            beginAtZero: true,
                            ticks: { callback: function (v) { return v + '%'; } }
                        },
                        y: { grid: { display: false }, ticks: { autoSkip: false } }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function (ctx) {
                                    return ctx.parsed.x + '% (' +
                                        (ctx.dataset.counts || [])[ctx.dataIndex] + ')';
                                }
                            }
                        }
                    }
                }),
                plugins: overall === null ? [] :
                    [refLine(Math.round(10 * overall) / 10,
                        'all respondents ' + pct(overall))]
            });
        }

        var orgTable = byId('citeOrgTable');
        if (orgTable) {
            orgTable.innerHTML = table(
                ['Org type', 'Respondents', 'With citation signal', 'Rate'],
                orgRows.slice().sort(function (a, b) {
                    var ra = rate(a), rb = rate(b);
                    if (ra === null && rb === null) return 0;
                    if (ra === null) return 1;
                    if (rb === null) return -1;
                    return rb - ra;
                }).map(function (r) {
                    return [r.label, num(r.n), num(r.citing),
                            rate(r) === null ? 'masked' : pct(rate(r))];
                }),
                { caption: 'Citation-signal rate by organisation type' }
            );
        }

        // --- redaction + stance (small charts)
        smallRateChart('chartCiteRedaction', redRows, function (r) {
            return r.key === 'named' ? R().nuclear : S().muted;
        });
        smallRateChart('chartCiteStance', stanceRows, function (r) {
            var st = STANCES.filter(function (s) { return s.key === r.key; })[0];
            return st ? st.color() : S().muted;
        });

        var named = redRows.filter(function (r) { return r.key === 'named'; })[0];
        var redacted = redRows.filter(function (r) { return r.key === 'redacted'; })[0];
        if (named && redacted && rate(named) !== null && rate(redacted) !== null) {
            setText('citeRedactionBase', 'base: named ' + num(named.n) +
                ' · redacted ' + num(redacted.n));
            var mult = rate(redacted) ? rate(named) / rate(redacted) : null;
            setHtml('citeRedactionReadout',
                'Named respondents carry a citation signal ' +
                '<strong>' + (mult ? mult.toFixed(1) + '×' : '—') + '</strong> as often as ' +
                'redacted ones (' + pct(rate(named)) + ' vs ' + pct(rate(redacted)) + ').');
        }

        var sup = stanceRows.filter(function (r) { return r.key === 'support'; })[0];
        var opp = stanceRows.filter(function (r) { return r.key === 'oppose'; })[0];
        if (sup && opp && rate(sup) !== null && rate(opp) !== null) {
            var stanceN = stanceRows.reduce(function (a, r) {
                return a + (isMasked(r.n) ? 0 : r.n);
            }, 0);
            setText('citeStanceBase', 'base: ' + num(stanceN) +
                ' respondents who answered Q71');
            var sMult = rate(opp) ? rate(sup) / rate(opp) : null;
            setHtml('citeStanceReadout',
                'Supporters of hourly matching cite ' +
                '<strong>' + (sMult ? sMult.toFixed(1) + '×' : '—') + '</strong> as often as ' +
                'opponents (' + pct(rate(sup)) + ' vs ' + pct(rate(opp)) + ') — the ' +
                'louder side of the consultation is not the better-sourced one.');
        }
    }

    function smallRateChart(id, rows, colorFor) {
        var canvas = byId(id);
        if (!canvas) return;
        var usable = rows.filter(function (r) { return rate(r) !== null; });
        if (!window.Chart) { chartMissing(canvas, 'citation-rate chart'); return; }
        if (!usable.length) {
            var host = canvas.parentNode;
            if (host) host.innerHTML = '<div class="card s2-empty">No unmasked groups.</div>';
            return;
        }
        destroyChart(canvas);
        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: usable.map(function (r) { return r.label; }),
                datasets: [{
                    label: '% with a citation signal',
                    data: usable.map(function (r) { return Math.round(10 * rate(r)) / 10; }),
                    counts: usable.map(function (r) { return r.citing + ' of ' + r.n; }),
                    backgroundColor: usable.map(function (r) {
                        return alpha(colorFor(r), 0.72);
                    }),
                    borderColor: usable.map(colorFor),
                    borderWidth: 1.5,
                    borderRadius: 3,
                    maxBarThickness: 64
                }]
            },
            options: baseOpts({
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: function (v) { return v + '%'; } }
                    },
                    x: { grid: { display: false } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) {
                                return ctx.parsed.y + '% (' +
                                    (ctx.dataset.counts || [])[ctx.dataIndex] + ')';
                            }
                        }
                    }
                }
            })
        });
    }

    // ========================================================================
    // Panel 4 — linked domains by class
    // ========================================================================
    function initDomains(ev) {
        var domains = (ev.citations && ev.citations.domains) || [];
        if (!domains.length) {
            setHtml('domainClassTable', '<div class="card s2-empty">' +
                'No <code>domains</code> array in evidence.json.</div>');
            return;
        }

        var hasRespondents = domains.some(function (d) {
            return d.n_respondents !== undefined && d.n_respondents !== null;
        });

        var agg = {};
        var totalLinks = 0, totalDomains = 0;
        domains.forEach(function (d) {
            var k = d['class'] || 'other';
            if (!agg[k]) agg[k] = { key: k, domains: 0, links: 0, respondents: 0 };
            agg[k].domains += 1;
            agg[k].links += d.count || 0;
            agg[k].respondents += d.n_respondents || 0;
            totalLinks += d.count || 0;
            totalDomains += 1;
        });

        var classRows = DOMAIN_CLASSES.map(function (m) { return agg[m.key]; })
            .filter(Boolean)
            .concat(Object.keys(agg).filter(function (k) {
                return !DOMAIN_CLASSES.some(function (m) { return m.key === k; });
            }).map(function (k) { return agg[k]; }))
            .sort(function (a, b) { return b.links - a.links; });

        setText('domainBase', 'base: ' + num(totalDomains) + ' distinct hosts · ' +
            num(totalLinks) + ' free-text answers linking them');

        // Class roll-up chart
        var canvas = byId('chartDomainClass');
        if (canvas && !window.Chart) {
            chartMissing(canvas, 'domain-class chart');
        } else if (canvas) {
            destroyChart(canvas);
            new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: axisLabels(canvas, classRows.map(function (r) {
                        return classMeta(r.key).label;
                    }), 0.42),
                    datasets: [{
                        label: 'Answers linking a host in this class',
                        data: classRows.map(function (r) { return r.links; }),
                        meta: classRows.map(function (r) {
                            return r.domains + ' host' + (r.domains === 1 ? '' : 's');
                        }),
                        backgroundColor: classRows.map(function (r) {
                            return alpha(classColor(r.key), 0.72);
                        }),
                        borderColor: classRows.map(function (r) { return classColor(r.key); }),
                        borderWidth: 1.5,
                        borderRadius: 3
                    }]
                },
                options: baseOpts({
                    indexAxis: 'y',
                    scales: {
                        x: { beginAtZero: true, title: { display: true, text: 'Answers linking a host in this class' } },
                        y: { grid: { display: false }, ticks: { autoSkip: false } }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function (ctx) {
                                    return ctx.parsed.x + ' answers · ' +
                                        (ctx.dataset.meta || [])[ctx.dataIndex];
                                }
                            }
                        }
                    }
                })
            });
        }

        setHtml('domainClassTable', table(
            hasRespondents
                ? ['Host class', 'Distinct hosts', 'Answers linking', 'Respondent-links', '% of answers']
                : ['Host class', 'Distinct hosts', 'Answers linking', '% of answers'],
            classRows.map(function (r) {
                var cells = [classMeta(r.key).label, num(r.domains), num(r.links)];
                if (hasRespondents) cells.push(num(r.respondents));
                cells.push(share(r.links, totalLinks));
                return cells;
            }),
            { caption: 'Linked hosts grouped by class' }
        ));

        // Per-class domain table with a filter
        var filter = byId('domainFilter');
        var CAP = 40;
        if (filter) {
            filter.innerHTML = ['<button type="button" data-val="all" class="active" ' +
                'aria-pressed="true">All</button>'].concat(
                classRows.map(function (r) {
                    return '<button type="button" data-val="' + esc(r.key) +
                        '" aria-pressed="false">' + esc(classMeta(r.key).label) +
                        ' (' + r.domains + ')</button>';
                })).join('');
            wireToggle(filter, drawDomains);
        }

        function drawDomains(which) {
            var list = domains.slice().filter(function (d) {
                return which === 'all' || (d['class'] || 'other') === which;
            }).sort(function (a, b) { return (b.count || 0) - (a.count || 0); });
            var total = list.length;
            var capped = list.slice(0, CAP);

            setHtml('domainTable', table(
                hasRespondents
                    ? ['Host', 'Class', 'Answers', 'Respondents', 'Answers per respondent']
                    : ['Host', 'Class', 'Answers'],
                capped.map(function (d) {
                    var cells = [
                        d.domain,
                        raw('<span class="s2-tag">' +
                            esc(classMeta(d['class']).label) + '</span>'),
                        num(d.count)
                    ];
                    if (hasRespondents) {
                        cells.push(num(d.n_respondents));
                        cells.push(d.n_respondents
                            ? (d.count / d.n_respondents).toFixed(1) : '—');
                    }
                    return cells;
                }),
                { wide: hasRespondents, caption: 'Linked hosts' }
            ));
            setText('domainStatus', 'Showing ' + capped.length + ' of ' + total +
                (which === 'all' ? ' hosts' : ' hosts in this class') +
                ', ordered by answers linking them.');
        }

        drawDomains('all');

        // Computed read-out: advocacy vs peer-reviewed hosts.
        var adv = agg.advocacy, peer = agg.peer_reviewed,
            pre = agg.peer_reviewed_or_preprint, sh = agg.shortener;
        var readout = byId('domainReadout');
        if (readout && adv && peer) {
            var parts = ['<strong>Advocacy hosts outnumber peer-reviewed ones.</strong> ' +
                'Advocacy and industry sites account for ' + num(adv.links) +
                ' linking answers across ' + num(adv.domains) + ' hosts, against ' +
                num(peer.links) + ' answers across ' + num(peer.domains) +
                ' peer-reviewed journal hosts.'];
            if (pre) {
                parts.push('A further ' + num(pre.links) + ' answers point at ' +
                    num(pre.domains) + ' preprint or repository hosts (SSRN, Zenodo, arXiv) — ' +
                    'adding those to the journal total overtakes advocacy, but a repository ' +
                    'link is not evidence of peer review, which is exactly the distinction ' +
                    'the survey never asked for.');
            }
            if (sh) {
                parts.push('And ' + num(sh.links) + ' answers hide their source behind a ' +
                    'link shortener' + (hasRespondents ? ' (up to ' + num(sh.respondents) +
                    ' respondents)' : '') + ': unverifiable without resolving each URL.');
            }
            readout.innerHTML = parts.join(' ');
        }

        if (!hasRespondents) {
            var note = byId('domainDegraded');
            if (note) {
                note.hidden = false;
                note.textContent = 'This dataset omits domains[].n_respondents, so the ' +
                    'repeat-linking columns are hidden.';
            }
        }
    }

    // ========================================================================
    // Panel 5 — template-propagated citations
    // ========================================================================
    function initTemplates(ev, clusters) {
        var blocks = (ev.citations && ev.citations.template_citation_blocks) || [];
        var host = byId('templateTable');
        if (!blocks.length) {
            if (host) host.innerHTML = '<div class="card s2-empty">' +
                'No <code>template_citation_blocks</code> in evidence.json.</div>';
            return;
        }

        var byHash = {};
        ((clusters && clusters.text_clusters) || []).forEach(function (c) {
            byHash[c.hash] = c;
        });
        var joined = clusters ? blocks.filter(function (b) {
            return byHash[b.hash];
        }).length : 0;

        var memberships = 0, namedIds = {}, redactedSeats = 0, maxRedacted = 0;
        var rows = blocks.slice().sort(function (a, b) {
            return (b.n_respondents || 0) - (a.n_respondents || 0);
        }).map(function (b) {
            var c = byHash[b.hash] || {};
            var named = (c.named_members || []).map(function (m) { return m.id; });
            named.forEach(function (id) { namedIds[id] = true; });
            memberships += b.n_respondents || 0;
            redactedSeats += c.n_redacted || 0;
            maxRedacted = Math.max(maxRedacted, c.n_redacted || 0);
            return [
                raw('<span class="s2-tag s2-tag-template">' +
                    esc(String(b.hash).slice(0, 8)) + '</span>'),
                num(b.n_respondents),
                c.named_members ? num(named.length) : '—',
                c.n_redacted === undefined ? '—' : num(c.n_redacted),
                c.questions ? c.questions.map(function (q) { return 'Q' + q; }).join(', ') : '—',
                raw('<span class="ev-preview">' + esc(b.preview || '') + '</span>', 'ev-preview-cell')
            ];
        });

        var copies = memberships - blocks.length;
        setText('templateBase', 'base: ' + blocks.length +
            ' duplicated citation-bearing texts · ' + num(memberships) + ' submissions' +
            (clusters ? ' · ' + joined + '/' + blocks.length +
                ' joined to clusters.json for membership' : ''));
        setText('templateCopyPct', memberships ? share(copies, memberships, 0) : '—');
        setText('templateCopyDesc', num(copies) + ' of ' + num(memberships) +
            ' citation-bearing template submissions are copies');

        if (host) {
            host.innerHTML = table(
                ['Block', 'Respondents', 'Named', 'Redacted', 'Questions', 'Opening words'],
                rows,
                { wide: true, caption: 'Duplicated citation-bearing texts' }
            );
        }

        // Headline recompute, with and without dedup.
        var red = segRows((ev.citations || {}).by_redaction);
        var named = red.filter(function (r) { return r.key === 'named'; })[0];
        var redacted = red.filter(function (r) { return r.key === 'redacted'; })[0];
        var nNamedBlockMembers = Object.keys(namedIds).length;
        var dedupHost = byId('templateDedupTable');

        if (dedupHost && named && redacted && !isMasked(named.n)) {
            var allN = named.n + redacted.n;
            var allCiting = named.citing + redacted.citing;
            var namedFloor = named.citing - nNamedBlockMembers;
            var rowsD = [
                ['All respondents, as reported', num(allCiting), num(allN),
                 share(allCiting, allN)],
                ['Named respondents, as reported', num(named.citing), num(named.n),
                 share(named.citing, named.n)],
                ['Named respondents, template-carried citations removed',
                 num(namedFloor), num(named.n), share(namedFloor, named.n)]
            ];
            if (clusters && redactedSeats) {
                var lo = allCiting - nNamedBlockMembers - redactedSeats;
                var hi = allCiting - nNamedBlockMembers - maxRedacted;
                rowsD.push(['All respondents, template-carried citations removed',
                    num(lo) + '–' + num(hi), num(allN),
                    share(lo, allN) + '–' + share(hi, allN)]);
            }
            dedupHost.innerHTML = table(
                ['Headline', 'With a citation signal', 'Base', 'Rate'], rowsD,
                { wide: true, caption: 'Citation rate with and without template dedup' }
            );

            setHtml('templateDedupReadout',
                'Strip the ' + nNamedBlockMembers + ' named respondents whose citation ' +
                'arrives inside circulated text and the named citation rate falls from ' +
                '<strong>' + share(named.citing, named.n) + '</strong> to <strong>' +
                share(namedFloor, named.n) + '</strong>. The redacted side cannot be ' +
                'deduplicated at all — the export gives counts, not ids, for its ' +
                num(redactedSeats) + ' block seats — so the all-respondent figure is a ' +
                'range, not a point.');
        }

        if (clusters && joined < blocks.length) {
            var deg = byId('templateDegraded');
            if (deg) {
                deg.hidden = false;
                deg.textContent = (blocks.length - joined) + ' of ' + blocks.length +
                    ' blocks have no matching hash in clusters.json, so their named/redacted ' +
                    'split shows as “—”.';
            }
        }
    }

    function templatesUnavailable(err) {
        var deg = byId('templateDegraded');
        if (deg) {
            deg.hidden = false;
            deg.textContent = 'clusters.json did not load (' +
                ((err && err.message) || 'unknown error') + '), so block membership and ' +
                'the dedup recompute are unavailable.';
        }
        var dedup = byId('templateDedupTable');
        if (dedup) {
            dedup.innerHTML = '<div class="card s2-empty">Needs clusters.json.</div>';
        }
    }

    // ========================================================================
    // Panel 6 — "who did the homework"
    // ========================================================================
    function initHomework(ev) {
        var basis = ev.basis || {};
        var host = byId('homeworkTable');
        if (!host) return;

        var q138 = basis.q138 || {}, q56 = basis.q56 || {}, q122 = basis.q122 || {};
        var cross = q138.by_stance_q71 || {};

        // Stance mix of everyone who answered Q71, for comparison.
        var stanceRows = segRows((ev.citations || {}).by_stance_q71);
        var stanceBase = stanceRows.reduce(function (a, r) {
            return a + (isMasked(r.n) ? 0 : r.n);
        }, 0);

        function optionN(b, tierKey) {
            var hit = (b.options || []).filter(function (o) {
                return tierFor(o.text).key === tierKey;
            })[0];
            return hit || null;
        }

        var TIERS = [
            { key: 'empirical',   label: 'Direct empirical analysis' },
            { key: 'operational', label: 'Operational experience' },
            { key: 'judgment',    label: 'Professional judgment + literature' },
            { key: 'awareness',   label: 'General awareness, no analysis' }
        ];

        // Stance mix is read from the question the option belongs to, so the
        // Q122 row is crossed with Q122's own by_stance_q71 block.
        function stanceCounts(basisObj, optionText) {
            var x = (basisObj && basisObj.by_stance_q71) || {};
            return STANCES.map(function (s) {
                return optionText ? ((x[s.key] || {})[optionText] || 0) : 0;
            });
        }

        function mixRow(label, o138, o56, counts) {
            var known = counts.reduce(function (a, v) { return a + v; }, 0);
            return [
                label,
                o138 ? num(o138.n) + ' · ' + pct(o138.pct) : '—',
                o56 ? num(o56.n) + ' · ' + pct(o56.pct) : '—',
                num(known),
                share(counts[0], known) + ' / ' + share(counts[1], known) +
                    ' / ' + share(counts[2], known)
            ];
        }

        var rows = TIERS.map(function (t) {
            var o138 = optionN(q138, t.key), o56 = optionN(q56, t.key);
            var text = o138 ? o138.text : (o56 ? o56.text : null);
            return mixRow(t.label, o138, o56,
                stanceCounts(o138 ? q138 : q56, text));
        });

        var pilot = optionN(q122, 'pilot');
        if (pilot) {
            rows.push(mixRow('Registry pilot/production use (Q122, n=' +
                num(q122.n_answered || 0) + ')', null, null,
                stanceCounts(q122, pilot.text)));
        }

        if (stanceBase) {
            rows.push([
                raw('<em>Everyone who answered Q71 (reference)</em>'),
                '—', '—', num(stanceBase),
                stanceRows.map(function (k) { return k; }).length
                    ? ['oppose', 'neutral', 'support'].map(function (k) {
                        var r = stanceRows.filter(function (x) { return x.key === k; })[0];
                        return r && !isMasked(r.n) ? share(r.n, stanceBase) : '—';
                    }).join(' / ')
                    : '—'
            ]);
        }

        host.innerHTML = table(
            ['Declared basis', 'Q138 MBM: n · % of 365', 'Q56 LBM: n · % of 408',
             'n with a Q71 stance', 'Oppose / neutral / support'],
            rows, { wide: true, caption: 'Who did the homework, and how they lean' }
        );

        setText('homeworkBase', 'base: Q138 n = ' + num(q138.n_answered || 0) +
            ' · Q56 n = ' + num(q56.n_answered || 0) +
            ' · Q122 n = ' + num(q122.n_answered || 0));

        var emp = optionN(q138, 'empirical');
        var ops = optionN(q138, 'operational');
        if (emp) {
            var empCounts = STANCES.map(function (s) {
                return (cross[s.key] || {})[emp.text] || 0;
            });
            var empKnown = empCounts.reduce(function (a, v) { return a + v; }, 0);
            var refOpp = stanceRows.filter(function (r) { return r.key === 'oppose'; })[0];
            var opsLine = '';
            if (ops) {
                var opsCounts = STANCES.map(function (s) {
                    return (cross[s.key] || {})[ops.text] || 0;
                });
                var opsKnown = opsCounts.reduce(function (a, v) { return a + v; }, 0);
                opsLine = ' Operational experience tilts a little further toward ' +
                    'supporters (' + num(opsCounts[2]) + ' of ' + num(opsKnown) +
                    ' with a known stance, ' + share(opsCounts[2], opsKnown) + ').';
            }
            // Whether the empirical claimants lean differently from everyone
            // else is a computed comparison, not a fixed claim.
            var empOppShare = empKnown ? 100 * empCounts[0] / empKnown : null;
            var refOppShare = (refOpp && stanceBase && !isMasked(refOpp.n))
                ? 100 * refOpp.n / stanceBase : null;
            var verdict = '';
            if (empOppShare !== null && refOppShare !== null) {
                var diff = empOppShare - refOppShare;
                verdict = Math.abs(diff) < 5
                    ? '<strong>Doing the homework did not move anyone.</strong>'
                    : '<strong>Empirical claimants lean ' + Math.abs(diff).toFixed(1) +
                      ' percentage points more toward ' +
                      (diff > 0 ? 'opposition' : 'support') +
                      ' than the consultation as a whole.</strong>';
            }
            setHtml('homeworkReadout',
                'The ' + num(emp.n) + ' respondents claiming direct empirical analysis ' +
                'break ' + share(empCounts[0], empKnown) + ' oppose / ' +
                share(empCounts[2], empKnown) + ' support — next to ' +
                (refOppShare === null ? '—' : pct(refOppShare)) +
                ' oppose across all ' + num(stanceBase) + ' Q71 answers. ' +
                verdict + opsLine);
        }
    }

    // ========================================================================
    // Panel 7 — notable evidence stories
    // ========================================================================
    function initStories(ev) {
        var stories = (ev.stories || []).filter(function (s) { return s && s.quote; });
        var featureHost = byId('storyFeature');
        var gridHost = byId('storyGrid');
        setText('storyBase', 'base: ' + stories.length +
            ' verified verbatim passages, selected by hand');

        if (!stories.length) {
            if (gridHost) gridHost.innerHTML = '<div class="card s2-empty">' +
                'No <code>stories</code> in evidence.json.</div>';
            return;
        }

        function toQuote(s) {
            var redacted = /^redacted/i.test(String(s.attribution || ''));
            return {
                text: s.quote,
                q: s.q,
                respondent_id: s.respondent_id,
                attribution: s.attribution || (redacted ? 'Redacted' : 'Unattributed'),
                redacted: redacted,
                template_cluster: null
            };
        }

        function block(story) {
            var wrap = document.createElement('div');
            wrap.className = 'ev-story scroll-reveal';
            var h = document.createElement('h4');
            h.className = 's2-quote-heading';
            h.textContent = story.title || 'Evidence story';
            wrap.appendChild(h);
            var slot = document.createElement('div');
            wrap.appendChild(slot);
            if (window.S2Quotes) {
                window.S2Quotes.render(slot, [toQuote(story)]);
            } else {
                slot.innerHTML = '<figure class="card s2-quote">' +
                    '<blockquote class="s2-quote-text">' + esc(story.quote) +
                    '</blockquote><figcaption class="s2-quote-foot">' +
                    '<span class="s2-quote-org">' + esc(story.attribution || '') +
                    '</span></figcaption></figure>';
            }
            return wrap;
        }

        var rest = stories.slice();
        if (featureHost) {
            featureHost.innerHTML = '';
            featureHost.appendChild(block(rest.shift()));
        }
        if (gridHost) {
            gridHost.innerHTML = '';
            rest.forEach(function (s) { gridHost.appendChild(block(s)); });
        }
    }

    // ========================================================================
    // Panel 8 — Q158 coded exemption evidence (static aggregate, see Q158 above)
    // ========================================================================
    function initQ158() {
        var canvas = byId('chartQ158');
        if (canvas && window.S2Viz) {
            window.S2Viz.renderOptionBars(canvas, Q158.codes, {
                n_answered: Q158.n,
                color: R().solar,
                datasetLabel: '% of the 297 coded answers',
                labelShare: 0.42,
                sort: false
            });
        } else if (canvas) {
            chartMissing(canvas, 'Q158 coding chart');
        }

        setText('q158Base', 'base: n = ' + num(Q158.n) +
            ' free-text answers to Q158, all coded');
        setText('q158HardPct', share(Q158.any_hard_cite, Q158.n));
        setHtml('q158Readout',
            'Of ' + num(Q158.n) + ' answers asked for the evidence behind an exemption, ' +
            '<strong>' + share(Q158.any_hard_cite, Q158.n) + '</strong> (' +
            num(Q158.any_hard_cite) + ') point to a study or their own data. ' +
            'The case is made instead on feasibility (' + pct(Q158.codes[0].pct) +
            '), cost (' + pct(Q158.codes[1].pct) + ') and data access (' +
            pct(Q158.codes[2].pct) + '); ' + pct(Q158.codes[4].pct) +
            ' assert that evidence exists without supplying any.');
        setText('q158Source', Q158.source);

        setHtml('q158Table', table(
            ['Code', 'Respondents', '% of 297'],
            Q158.codes.map(function (c) { return [c.text, num(c.n), pct(c.pct)]; }),
            { caption: 'Q158 exemption-evidence codes' }
        ));
    }

    // ========================================================================
    // Boot
    // ========================================================================
    function boot() {
        if (!window.S2Data) {
            var host = byId('basisTable');
            if (host) host.innerHTML = '<div class="card s2-error" role="alert">' +
                '<div class="s2-error-title">Loader missing</div>' +
                '<p class="s2-error-hint">js/data-loader.js did not load.</p></div>';
            return;
        }

        S2Data.load('evidence').then(function (ev) {
            initBasis(ev);
            initBasisStance(ev);
            initCitations(ev);
            initDomains(ev);
            initHomework(ev);
            initStories(ev);

            // clusters.json only feeds panel 5; a failure there must not take
            // the rest of the page down with it.
            return S2Data.load('clusters').then(function (clusters) {
                initTemplates(ev, clusters);
            }, function (err) {
                initTemplates(ev, null);
                templatesUnavailable(err);
                if (window.console && console.warn) {
                    console.warn('evidence.html: clusters.json unavailable', err);
                }
            });
        }).catch(function (err) {
            ['basisTable', 'basisStanceTable', 'citeOrgTable', 'domainClassTable',
             'templateTable', 'homeworkTable', 'storyGrid'].forEach(function (id) {
                var el = byId(id);
                if (el) S2Data.errorPanel(el, err);
            });
            if (window.console && console.error) console.error(err);
        });

        initQ158();     // static aggregate, no fetch
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
