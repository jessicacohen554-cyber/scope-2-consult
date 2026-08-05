// ============================================================================
// ECMatrix - the additionality stringency matrix (Q26.1–26.9) and its variants
// ============================================================================
// Site-specific module (not an upstream design-system file). Depends on
// ECStance for the shared token-color, popover and sr-table machinery.
//
//   ECMatrix.renderHeatmap(el, {meta, matrix, dim, segValue, ...})  // 9 × 3
//   ECMatrix.renderMini(el, {meta, matrix, ...})                    // strips
//   ECMatrix.renderCross(canvas, {meta, matrix, ...})               // Q26 × Q28
//   ECMatrix.rows(meta, matrix, opts)                               // sorted data
//
// Contract shapes (PLAN §5):
//   meta.matrix   = {levels:[{key,label}], tests:[{qid, key, label, n}]}
//   matrix.json   = {tests:{"<qid>": {overall: SCELL(3), by:{...}}},
//                    feasibility:{n, per_test:{"<test key>": {n, by:{...}}},
//                                 specials:{none_feasible:{n}}}}
//
// Note the deliberate asymmetry, straight from PLAN §5: `matrix.tests` is keyed
// by **qid** while `feasibility.per_test` is keyed by **test key**. The join
// runs through `meta.matrix.tests`, which carries both.
//
// PLAN gotcha 5 is the whole point of this file existing separately from the
// stance strips: required > optional > not_required is an ordered STRINGENCY
// scale, not sentiment. It is painted with a sequential indigo ramp and must
// never borrow the green/red support ramp.
// ============================================================================

(function() {
    'use strict';

    var STRINGENCY_POLE = '--nuclear';
    var ALPHA_MIN = 0.07;
    var ALPHA_MAX = 0.85;   // capped so the dark text token keeps ≥4.5:1

    function esc(s) {
        return (window.ECData ? ECData.escapeHtml(s)
            : String(s === null || s === undefined ? '' : s));
    }

    function node(t) {
        if (typeof t === 'string') {
            return t.charAt(0) === '#' ? document.getElementById(t.slice(1))
                                       : document.querySelector(t);
        }
        return t || null;
    }

    function S() { return window.ECStance; }

    // --- Row assembly --------------------------------------------------------
    // Net requiredness = %(most stringent level) − %(least stringent level),
    // i.e. the first and last entries of meta.matrix.levels. The exporter is
    // required to emit `levels` in descending stringency order for that reason.
    function levelsOf(meta) {
        return ((meta && meta.matrix && meta.matrix.levels) || []).slice();
    }

    function netRequiredness(cell, levels) {
        var s = S();
        if (!cell || s.isMasked(cell) || s.isEmpty(cell)) return null;
        var n = s.baseOf(cell);
        var c = cell.c || [];
        if (!n || c.length < 2) return null;
        var hi = c[0] || 0;
        var lo = c[levels.length ? levels.length - 1 : c.length - 1] || 0;
        return s.pct1(hi, n) - s.pct1(lo, n);
    }

    // Returns [{qid, key, label, n, cell, net, feasibility}] sorted by net desc.
    function rows(meta, matrix, opts) {
        opts = opts || {};
        var s = S();
        var levels = levelsOf(meta);
        var tests = ((meta && meta.matrix && meta.matrix.tests) || []).slice();
        var byQid = (matrix && matrix.tests) || {};
        var feas = ((matrix && matrix.feasibility) || {}).per_test || {};
        var dimKey = opts.dim || 'overall';
        var segValue = opts.segValue || 'overall';

        var out = tests.map(function(t) {
            var entry = byQid[t.qid] || {};
            var cell = segValue === 'overall'
                ? entry.overall
                : (((entry.by || {})[dimKey] || {})[segValue] || null);
            return {
                qid: t.qid,
                key: t.key,
                label: t.label,
                n: t.n,
                entry: entry,
                cell: cell,
                net: netRequiredness(cell, levels),
                feasibility: feas[t.key] || null
            };
        }).filter(function(r) { return opts.keepEmpty || r.cell; });

        if (opts.sort !== false) {
            out.sort(function(a, b) {
                var an = a.net === null ? -Infinity : a.net;
                var bn = b.net === null ? -Infinity : b.net;
                if (bn !== an) return bn - an;
                return String(a.label).localeCompare(String(b.label));
            });
        }
        // Keep the two masked/empty edge cases out of the arithmetic but on
        // screen, so a suppressed segment reads as suppressed rather than last.
        void s;
        return out;
    }

    // --- 9 × 3 heatmap -------------------------------------------------------
    function renderHeatmap(target, opts) {
        var el = node(target);
        if (!el) return null;
        opts = opts || {};
        var s = S();
        var meta = opts.meta || {};
        var matrix = opts.matrix || {};
        var maskN = opts.maskN === undefined ? 5 : opts.maskN;
        var dimKey = opts.dim || 'overall';
        var segValue = opts.segValue || 'overall';
        var levels = levelsOf(meta);
        var data = rows(meta, matrix, opts);

        if (!levels.length || !data.length) {
            el.innerHTML = '<div class="card ec-empty">The additionality matrix is ' +
                'not in this export yet.</div>';
            return null;
        }

        var segLabel = segValue === 'overall'
            ? 'All respondents'
            : ((window.ECSegments && ECSegments.valueLabel(dimKey, segValue)) || segValue);

        var html = '<div class="ec-matrix-wrap"><div class="ec-matrix" role="grid" ' +
            'style="--ec-cols:' + levels.length + '" aria-label="' +
            esc(opts.label || 'Additionality tests by required level') + ' — ' +
            esc(segLabel) + '">';

        html += '<div class="ec-mx-row ec-mx-headrow" role="row">' +
            '<div class="ec-mx-corner" role="columnheader">Additionality test</div>';
        levels.forEach(function(lv) {
            html += '<div class="ec-mx-colhead" role="columnheader">' +
                '<span class="ec-mx-colname">' + esc(lv.label) + '</span></div>';
        });
        html += '<div class="ec-mx-colhead ec-mx-colhead--net" role="columnheader">' +
            '<span class="ec-mx-colname">Net requiredness</span>' +
            '<span class="ec-base-chip">%' + esc(levels[0].label) + ' − %' +
            esc(levels[levels.length - 1].label) + '</span></div></div>';

        var srRows = [];

        data.forEach(function(r) {
            var cell = r.cell;
            var n = s.baseOf(cell);
            html += '<div class="ec-mx-row" role="row">' +
                '<div class="ec-mx-rowhead" role="rowheader">' +
                '<span class="ec-mx-testname">' + esc(r.label) + '</span>' +
                '<span class="ec-base-chip">n=' + n + '</span></div>';

            var srRow = [r.label];
            if (!cell || s.isEmpty(cell)) {
                levels.forEach(function() {
                    html += '<div class="ec-mx-cell ec-mx-cell--empty" ' +
                        'role="gridcell" aria-label="' + esc(r.label) +
                        ': not answered."><span aria-hidden="true">·</span></div>';
                    srRow.push('no data');
                });
            } else if (s.isMasked(cell, maskN)) {
                levels.forEach(function() {
                    html += '<div class="ec-mx-cell ec-mx-cell--masked" ' +
                        'role="gridcell" aria-label="' + esc(r.label) +
                        ': suppressed, fewer than ' + maskN + ' respondents."></div>';
                    srRow.push('suppressed (n<' + maskN + ')');
                });
            } else {
                levels.forEach(function(lv, i) {
                    var v = (cell.c || [])[i] || 0;
                    var p = s.pct1(v, n);
                    var sw = s.tint(STRINGENCY_POLE,
                                    ALPHA_MIN + (ALPHA_MAX - ALPHA_MIN) * (p / 100));
                    html += '<div class="ec-mx-cell ec-mx-cell--data" ' +
                        'role="gridcell" tabindex="0" data-ec-pop data-qid="' +
                        esc(r.qid) + '" data-level="' + esc(lv.key) + '" ' +
                        'style="background:' + sw.bg + ';color:' + sw.fg +
                        '" aria-label="' + esc(r.label + ' — ' + lv.label + ': ' +
                            s.fmtPct(p) + ', ' + v + ' of ' + n +
                            ' respondents. Activate for the segment split.') + '">' +
                        '<span class="ec-mx-val">' + Math.round(p) + '%</span>' +
                        '<span class="ec-mx-sub">' + v + '</span></div>';
                    srRow.push(s.fmtPct(p) + ' (' + v + ' of ' + n + ')');
                });
            }

            var net = r.net;
            html += '<div class="ec-mx-cell ec-mx-cell--net" role="gridcell" ' +
                'aria-label="' + esc(r.label + ' net requiredness ' +
                    (net === null ? 'unavailable' : s.fmtSigned(net) + ' points')) +
                '"><span class="ec-tag ec-tag-stringency">' +
                (net === null ? '—' : s.fmtSigned(net)) + '</span></div>';
            srRow.push(net === null ? '—' : s.fmtSigned(net));
            srRows.push(srRow);
            html += '</div>';
        });

        html += '</div></div>';
        html += '<p class="ec-note ec-note-legend"><span class="ec-swatch-seq" ' +
            'aria-hidden="true"></span> Sequential ramp: darker means a larger ' +
            'share of that test’s respondents chose that level. This is a ' +
            'stringency scale, not a support scale &mdash; no answer here is ' +
            'agreement or disagreement.</p>' +
            '<div class="ec-srtable-slot"></div>';
        el.innerHTML = html;

        if (opts.srTable !== false) {
            s.srTable(el.querySelector('.ec-srtable-slot'), {
                caption: (opts.label || 'Additionality tests') +
                    ' — share choosing each level, ' + segLabel,
                head: ['Test'].concat(levels.map(function(l) { return l.label; }))
                    .concat(['Net requiredness (pts)']),
                rows: srRows
            });
        }

        wire(el, { meta: meta, matrix: matrix, levels: levels, dimKey: dimKey,
                   segValue: segValue, maskN: maskN, pageBase: opts.pageBase || '' });
        return { el: el, rows: data, levels: levels };
    }

    // --- Mini matrix (Decision Board) ---------------------------------------
    // One 100%-stacked stringency strip per test, sorted by net requiredness.
    function renderMini(target, opts) {
        var el = node(target);
        if (!el) return null;
        opts = opts || {};
        var s = S();
        var meta = opts.meta || {};
        var matrix = opts.matrix || {};
        var maskN = opts.maskN === undefined ? 5 : opts.maskN;
        var levels = levelsOf(meta);
        var data = rows(meta, matrix, opts);

        if (!levels.length || !data.length) {
            el.innerHTML = '<div class="card ec-empty">The additionality matrix is ' +
                'not in this export yet.</div>';
            return null;
        }

        var swatches = levels.map(function(lv, i) {
            var span = levels.length > 1 ? 1 - (i / (levels.length - 1)) : 1;
            return s.tint(STRINGENCY_POLE, 0.18 + 0.62 * span);
        });

        var html = '<div class="ec-mini">' + data.map(function(r) {
            var cell = r.cell;
            var n = s.baseOf(cell);
            var bar;
            if (!cell || s.isEmpty(cell)) {
                bar = '<span class="ec-mini-bar ec-mini-bar--empty"></span>';
            } else if (s.isMasked(cell, maskN)) {
                bar = '<span class="ec-mini-bar ec-mini-bar--masked"></span>';
            } else {
                bar = '<span class="ec-mini-bar" data-ec-pop data-qid="' +
                    esc(r.qid) + '" data-level="" tabindex="0" role="button" ' +
                    'aria-label="' + esc(r.label + ': ' + (cell.c || []).map(
                        function(v, i) {
                            return (levels[i] || {}).label + ' ' + v;
                        }).join(', ') + '; n=' + n +
                        '. Activate for the segment split.') + '">' +
                    (cell.c || []).map(function(v, i) {
                        if (!v) return '';
                        return '<span class="ec-mini-seg" style="width:' +
                            s.pct1(v, n) + '%;background:' + swatches[i].bg +
                            '" title="' + esc((levels[i] || {}).label + ' — ' + v +
                            ' (' + s.fmtPct(s.pct1(v, n)) + ')') + '"></span>';
                    }).join('') + '</span>';
            }
            return '<div class="ec-mini-row">' +
                '<span class="ec-mini-label">' + esc(r.label) + '</span>' + bar +
                '<span class="ec-tag ec-tag-stringency">' +
                (r.net === null ? '—' : s.fmtSigned(r.net)) + '</span>' +
                '<span class="ec-base-chip">n=' + n + '</span></div>';
        }).join('') + '</div>' +
            '<ul class="ec-strip-legend">' + levels.map(function(lv, i) {
                return '<li class="ec-strip-legend-item">' +
                    '<span class="ec-legend-dot" aria-hidden="true" style="background:' +
                    swatches[i].bg + '"></span>' + esc(lv.label) + '</li>';
            }).join('') + '</ul>';

        if (opts.link) {
            html += '<a class="ec-strip-link" href="' + esc(opts.link) +
                '">Open the full 9 &times; 3 matrix &rarr;</a>';
        }
        html += '<div class="ec-srtable-slot"></div>';
        el.innerHTML = html;

        if (opts.srTable !== false) {
            s.srTable(el.querySelector('.ec-srtable-slot'), {
                caption: 'Additionality tests, sorted by net requiredness',
                head: ['Test'].concat(levels.map(function(l) { return l.label; }))
                    .concat(['n', 'Net (pts)']),
                rows: data.map(function(r) {
                    var n = s.baseOf(r.cell);
                    var cells = levels.map(function(lv, i) {
                        if (!r.cell || s.isMasked(r.cell, maskN) || s.isEmpty(r.cell)) {
                            return '—';
                        }
                        return String((r.cell.c || [])[i] || 0);
                    });
                    return [r.label].concat(cells).concat([String(n),
                        r.net === null ? '—' : s.fmtSigned(r.net)]);
                })
            });
        }

        wire(el, { meta: meta, matrix: matrix, levels: levels,
                   dimKey: opts.dim || 'overall', segValue: opts.segValue || 'overall',
                   maskN: maskN, pageBase: opts.pageBase || '' });
        return { el: el, rows: data, levels: levels };
    }

    // --- Required vs feasible cross (Chart.js) -------------------------------
    // x = Q28 feasibility picks, y = Q26 net requiredness. The one canvas chart
    // in this hub's component layer; everything else is DOM so it stays legible
    // at any width and prints its own numbers.
    function renderCross(target, opts) {
        var canvas = node(target);
        if (!canvas) return null;
        opts = opts || {};
        var s = S();
        var meta = opts.meta || {};
        var matrix = opts.matrix || {};
        var data = rows(meta, matrix, opts).filter(function(r) {
            return r.net !== null && r.feasibility;
        });

        if (!window.Chart) {
            var host = canvas.parentNode;
            if (host) {
                host.innerHTML = '<div class="card ec-error" role="alert">' +
                    '<div class="ec-error-title">Chart library unavailable</div>' +
                    '<p class="ec-error-hint">Chart.js did not load, so the ' +
                    'required-vs-feasible cross cannot be drawn. Check the pinned ' +
                    '<code>chart.umd.min.js</code> tag in the page head.</p></div>';
            }
            return null;
        }
        if (window.Chart.getChart) {
            var prev = Chart.getChart(canvas);
            if (prev) prev.destroy();
        }
        if (!data.length) {
            var h2 = canvas.parentNode;
            if (h2) h2.innerHTML = '<div class="card ec-empty">Feasibility picks ' +
                'are not in this export yet.</div>';
            return null;
        }

        // Chart color from chart-colors.js, falling back to the design token
        // it mirrors. No hex literal lives in this file.
        var color = (window.RESOURCE_COLORS || {}).nuclear ||
            s.token(STRINGENCY_POLE);
        var withA = window.withAlpha || function(c) { return c; };
        var feasBase = ((matrix.feasibility || {}).n) || 0;
        var labels = data.map(function(r) { return r.label; });

        var pointLabels = {
            id: 'ecPointLabels',
            afterDatasetsDraw: function(chart) {
                var ctx = chart.ctx;
                var set = chart.getDatasetMeta(0);
                ctx.save();
                ctx.font = '600 11px ' + (s.token('--font-data') ||
                    Chart.defaults.font.family);
                ctx.fillStyle = s.token('--text-muted') || '';
                ctx.textBaseline = 'middle';
                set.data.forEach(function(pt, i) {
                    ctx.fillText(labels[i], pt.x + 8, pt.y);
                });
                ctx.restore();
            }
        };

        var chart = new Chart(canvas, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Additionality tests',
                    data: data.map(function(r) {
                        return { x: r.feasibility.n || 0, y: r.net };
                    }),
                    backgroundColor: withA(color, 0.7),
                    borderColor: color,
                    borderWidth: 1.5,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: (window.matchMedia &&
                    window.matchMedia('(prefers-reduced-motion: reduce)').matches)
                    ? false : undefined,
                layout: { padding: { right: 120 } },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Called feasible — picks out of ' + feasBase +
                                ' who answered'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Net requiredness (% required − % not required)'
                        },
                        ticks: {
                            callback: function(v) { return s.fmtSigned(v); }
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: function(items) {
                                return labels[items[0].dataIndex];
                            },
                            label: function(ctx) {
                                var r = data[ctx.dataIndex];
                                return [
                                    'feasible: ' + (r.feasibility.n || 0) + ' of ' +
                                        feasBase,
                                    'net requiredness: ' + s.fmtSigned(r.net) + ' pts',
                                    'matrix base: n=' + s.baseOf(r.cell)
                                ];
                            }
                        }
                    }
                }
            },
            plugins: [pointLabels]
        });

        var noneN = (((matrix.feasibility || {}).specials || {}).none_feasible || {}).n;
        var holder = canvas.parentNode &&
            canvas.parentNode.parentNode &&
            canvas.parentNode.parentNode.querySelector('.ec-srtable-slot');
        if (holder && opts.srTable !== false) {
            s.srTable(holder, {
                caption: 'Additionality tests — feasibility picks against net ' +
                    'requiredness' + (noneN !== undefined
                        ? '; ' + noneN + ' respondents said no test is feasible' : ''),
                head: ['Test', 'Feasible picks', 'Net requiredness (pts)', 'Matrix n'],
                rows: data.map(function(r) {
                    return [r.label, String(r.feasibility.n || 0),
                            s.fmtSigned(r.net), String(s.baseOf(r.cell))];
                })
            });
        }
        return chart;
    }

    // --- Popover wiring ------------------------------------------------------
    function wire(el, ctx) {
        el.ecMatrixCtx = ctx;
        if (el.ecMatrixWired) return;
        el.ecMatrixWired = true;

        function activate(cellEl) {
            var c = el.ecMatrixCtx;
            var s = S();
            var qid = cellEl.getAttribute('data-qid');
            var entry = (c.matrix.tests || {})[qid];
            if (!entry) return;
            var test = null;
            ((c.meta.matrix || {}).tests || []).forEach(function(t) {
                if (t.qid === qid) test = t;
            });
            var cell = c.segValue === 'overall'
                ? entry.overall
                : (((entry.by || {})[c.dimKey] || {})[c.segValue] || null);
            if (!cell || s.isMasked(cell, c.maskN) || s.isEmpty(cell)) return;

            var levels = c.levels;
            var swatches = levels.map(function(lv, i) {
                var span = levels.length > 1 ? 1 - (i / (levels.length - 1)) : 1;
                return s.tint(STRINGENCY_POLE, 0.18 + 0.62 * span);
            });
            var net = netRequiredness(cell, levels);

            var html = '<div class="ec-popover-kicker">' +
                esc((window.ECData && ECData.display(c.meta, qid)) || qid) +
                ' · additionality test</div>' +
                '<div class="ec-popover-title">' +
                esc(test ? test.label : qid) + '</div>' +
                s.distHtml(cell, levels, swatches) +
                '<div class="ec-popover-meta"><span><strong>n</strong> ' +
                s.baseOf(cell) + ' rated this test</span>' +
                '<span><strong>net requiredness</strong> ' +
                (net === null ? '—' : s.fmtSigned(net)) + ' pts</span></div>';

            if (c.dimKey !== 'overall') {
                html += s.segTableHtml((entry.by || {})[c.dimKey], c.dimKey,
                                       levels, c.maskN);
            }
            html += '<p class="ec-popover-note">Required / optional / not required ' +
                'is a stringency ladder. A respondent who calls a test ' +
                '&ldquo;not required&rdquo; is not opposing additionality.</p>';
            s.openPopover(cellEl, html);
        }

        el.addEventListener('click', function(ev) {
            var cellEl = ev.target.closest('[data-ec-pop]');
            if (cellEl && el.contains(cellEl)) activate(cellEl);
        });
        el.addEventListener('keydown', function(ev) {
            if (ev.key !== 'Enter' && ev.key !== ' ') return;
            var cellEl = ev.target.closest('[data-ec-pop]');
            if (!cellEl || !el.contains(cellEl)) return;
            ev.preventDefault();
            activate(cellEl);
        });
    }

    window.ECMatrix = {
        renderHeatmap: renderHeatmap,
        renderMini: renderMini,
        renderCross: renderCross,
        rows: rows,
        netRequiredness: netRequiredness,
        levels: levelsOf,
        STRINGENCY_POLE: STRINGENCY_POLE
    };
})();
