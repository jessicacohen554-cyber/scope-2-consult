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

    // meta.matrix.tests[].label reads "Requiredness of the regulatory test" —
    // right for a question label, far too long for a chart point or a phone-width
    // row header, where nine of them collide into an unreadable stack (P35 F11).
    // The prefix and the trailing "test" are the same on every row and carry no
    // information once the axis title says "net requiredness".
    function shortLabel(label) {
        return String(label || '')
            .replace(/^requiredness of the\s+/i, '')
            .replace(/\s+test$/i, '')
            .trim() || String(label || '');
    }

    function netRequiredness(cell, levels) {
        var s = S();
        if (!cell || s.isMasked(cell) || s.isEmpty(cell)) return null;
        var n = s.baseOf(cell);
        var c = cell.c || [];
        if (!n || c.length < 2) return null;
        var hi = c[0] || 0;
        var lo = c[levels.length ? levels.length - 1 : c.length - 1] || 0;
        // Pre-rounded: round each share to 1dp, then subtract, so the number
        // matches what the two cells on the row print. See matrix.json's
        // exporter-computed net_pct, which this must agree with by construction.
        return s.pct1(hi, n) - s.pct1(lo, n);
    }

    // Contract addition C1: for the overall view the exporter's net_pct is the
    // authority and is used verbatim. Segment cells have no exported net, so
    // they fall back to the same arithmetic the exporter runs. Before C1 three
    // places computed this independently and the plan disagreed with all of
    // them on two of the nine rows (P35 F4).
    function netOf(entry, cell, levels, isOverall) {
        if (isOverall && entry && typeof entry.net_pct === 'number') {
            return entry.net_pct;
        }
        return netRequiredness(cell, levels);
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
            var isOverall = segValue === 'overall';
            var cell = isOverall
                ? entry.overall
                : (((entry.by || {})[dimKey] || {})[segValue] || null);
            return {
                qid: t.qid,
                key: t.key,
                label: t.label,
                short: shortLabel(t.label),
                n: t.n,
                entry: entry,
                cell: cell,
                net: netOf(entry, cell, levels, isOverall),
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
            var thin = s.isThin(cell, maskN);
            // The net column is the sort key, and below the narrow breakpoint
            // it is the first thing to fall off the scroll port — with no
            // affordance, because page-level overflow stays zero (P35 F10).
            // So the net rides in the row header too, and CSS shows exactly one
            // of the two copies. This is P35's option B: three data columns fit
            // 328 px with no scroll, and the sort key stays beside the label it
            // sorts. Emitting both and choosing in CSS keeps the breakpoint in
            // one place — the stylesheet — instead of duplicating it in JS.
            var netTag = '<span class="ec-tag ec-tag-stringency">' +
                (r.net === null ? '—' : s.fmtSigned(r.net)) + '</span>';
            html += '<div class="ec-mx-row" role="row">' +
                '<div class="ec-mx-rowhead" role="rowheader">' +
                '<span class="ec-mx-testname">' + esc(r.short) + '</span>' +
                '<span class="ec-mx-rowmeta">' +
                '<span class="ec-mx-rowhead-net" aria-hidden="true">net ' +
                (r.net === null ? '—' : s.fmtSigned(r.net)) + '</span>' +
                '<span class="ec-base-chip">n=' + n +
                (thin ? ' · counts only' : '') + '</span>' +
                '</span></div>';

            var srRow = [r.short];
            if (!cell || s.isEmpty(cell)) {
                levels.forEach(function() {
                    html += '<div class="ec-mx-cell ec-mx-cell--empty" ' +
                        'role="gridcell" aria-label="' + esc(r.short) +
                        ': not answered."><span aria-hidden="true">·</span></div>';
                    srRow.push('no data');
                });
            } else if (s.isMasked(cell, maskN)) {
                levels.forEach(function() {
                    html += '<div class="ec-mx-cell ec-mx-cell--masked" ' +
                        'role="gridcell" aria-label="' + esc(r.short) +
                        ': suppressed, fewer than ' + maskN + ' respondents."></div>';
                    srRow.push('suppressed (n<' + maskN + ')');
                });
            } else {
                levels.forEach(function(lv, i) {
                    var v = (cell.c || [])[i] || 0;
                    var p = s.pct1(v, n);
                    var sw = s.tint(STRINGENCY_POLE,
                                    ALPHA_MIN + (ALPHA_MAX - ALPHA_MIN) * (p / 100));
                    // Under THIN_N the count leads and the percentage is not
                    // printed at all (contract C3) — at n=7 a percentage claims
                    // a precision the cell does not have.
                    html += '<div class="ec-mx-cell ec-mx-cell--data' +
                        (thin ? ' ec-mx-cell--thin' : '') + '" ' +
                        'role="gridcell" tabindex="0" data-ec-pop data-qid="' +
                        esc(r.qid) + '" data-level="' + esc(lv.key) + '" ' +
                        'style="background:' + sw.bg + ';color:' + sw.fg +
                        '" aria-label="' + esc(r.short + ' — ' + lv.label + ': ' +
                            (thin ? s.fmtOf(v, n) + ' respondents'
                                  : s.fmtPct(p) + ', ' + v + ' of ' + n +
                                    ' respondents') +
                            '. Activate for the segment split.') + '">' +
                        '<span class="ec-mx-val">' +
                        (thin ? v : Math.round(p) + '%') + '</span>' +
                        '<span class="ec-mx-sub">' +
                        (thin ? 'of ' + n : v) + '</span></div>';
                    srRow.push(thin ? s.fmtOf(v, n)
                                    : s.fmtPct(p) + ' (' + v + ' of ' + n + ')');
                });
            }

            var net = r.net;
            html += '<div class="ec-mx-cell ec-mx-cell--net" role="gridcell" ' +
                'aria-label="' + esc(r.short + ' net requiredness ' +
                    (net === null ? 'unavailable' : s.fmtSigned(net) + ' points')) +
                '">' + netTag + '</div>';
            srRow.push(net === null ? '—' : s.fmtSigned(net));
            srRows.push(srRow);
            html += '</div>';
        });

        html += '</div></div>';
        html += '<p class="ec-note ec-note-legend"><span class="ec-swatch-seq" ' +
            'aria-hidden="true"></span> Sequential ramp: darker means a larger ' +
            'share of that test’s respondents chose that level. This is a ' +
            'stringency scale, not a support scale &mdash; no answer here is ' +
            'agreement or disagreement. Rows are sorted by net requiredness ' +
            '(%' + esc(levels[0].label) + ' &minus; %' +
            esc(levels[levels.length - 1].label) + '), shown in the ' +
            '<span class="ec-tag ec-tag-stringency">net</span> column and, on ' +
            'narrow screens, beside each test name.</p>' +
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
            var thin = s.isThin(cell, maskN);
            var bar;
            if (!cell || s.isEmpty(cell)) {
                bar = '<span class="ec-mini-bar ec-mini-bar--empty"></span>';
            } else if (s.isMasked(cell, maskN)) {
                bar = '<span class="ec-mini-bar ec-mini-bar--masked"></span>';
            } else {
                bar = '<span class="ec-mini-bar" data-ec-pop data-qid="' +
                    esc(r.qid) + '" data-level="" tabindex="0" role="button" ' +
                    'aria-label="' + esc(r.short + ': ' + (cell.c || []).map(
                        function(v, i) {
                            return (levels[i] || {}).label + ' ' + v;
                        }).join(', ') + '; n=' + n +
                        '. Activate for the segment split.') + '">' +
                    (cell.c || []).map(function(v, i) {
                        if (!v) return '';
                        return '<span class="ec-mini-seg" style="width:' +
                            s.pct1(v, n) + '%;background:' + swatches[i].bg +
                            '" title="' + esc((levels[i] || {}).label + ' — ' +
                            (thin ? s.fmtOf(v, n)
                                  : v + ' (' + s.fmtPct(s.pct1(v, n)) + ')')) +
                            '"></span>';
                    }).join('') + '</span>';
            }
            return '<div class="ec-mini-row">' +
                '<span class="ec-mini-label">' + esc(r.short) + '</span>' + bar +
                '<span class="ec-tag ec-tag-stringency">' +
                (r.net === null ? '—' : s.fmtSigned(r.net)) + '</span>' +
                '<span class="ec-base-chip">n=' + n +
                (thin ? ' · counts only' : '') + '</span></div>';
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
                    return [r.short].concat(cells).concat([String(n),
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
            return s.chartMissing(canvas, 'the required-vs-feasible cross');
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
        // Short labels, not "Requiredness of the financial analysis test" ×9.
        var labels = data.map(function(r) { return r.short; });
        var xs = data.map(function(r) { return r.feasibility.n || 0; });
        var xMax = Math.max.apply(null, xs.concat([1]));

        // Three of the nine tests sit within 1.5 points of each other on the y
        // axis (positive list / financial analysis / contractual-tenor, PLAN
        // §3.3) and their labels drew straight through one another; three more
        // ran off the right edge of the canvas (P35 F11). Two fixes, both here:
        // the x axis is padded past the largest pick count so a right-hand label
        // has somewhere to live, and any label closer than one line-height to
        // one already drawn is nudged vertically and gets a leader dash.
        function overlaps(a, b) {
            return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
        }

        var pointLabels = {
            id: 'ecPointLabels',
            afterDatasetsDraw: function(chart) {
                var ctx = chart.ctx;
                var set = chart.getDatasetMeta(0);
                var area = chart.chartArea;
                var narrow = (area.right - area.left) < 420;
                var fontPx = narrow ? 10 : 11;
                var lineH = fontPx + 3;
                var gap = 8;
                ctx.save();
                ctx.font = '600 ' + fontPx + 'px ' + (s.token('--font-data') ||
                    Chart.defaults.font.family);
                ctx.fillStyle = s.token('--text-muted') || '';
                ctx.strokeStyle = s.token('--border') || '';
                ctx.lineWidth = 1;
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'left';

                // Points are also obstacles: a label that lands on another
                // test's marker is as unreadable as one on another label.
                var placed = set.data.map(function(pt) {
                    return { x0: pt.x - 7, x1: pt.x + 7,
                             y0: pt.y - 7, y1: pt.y + 7 };
                });

                // Place the outliers first (largest |net|), so the crowded
                // optional-middle trio - three tests inside 1.5 points of each
                // other - does the yielding rather than the rows that carry the
                // headline. Within the cluster, top-down.
                var order = set.data.map(function(pt, i) { return i; })
                    .sort(function(a, b) { return set.data[a].y - set.data[b].y; });

                order.forEach(function(i) {
                    var pt = set.data[i];
                    var w = ctx.measureText(labels[i]).width;
                    var best = null;
                    // Candidate anchors, cheapest first: beside the point at
                    // its own height, then beside it stepping away, then
                    // centred above or below. The first that hits nothing and
                    // stays on canvas wins.
                    var anchors = [];
                    for (var step = 0; step <= 6; step++) {
                        for (var s2 = 0; s2 < (step ? 2 : 1); s2++) {
                            var dy = step * lineH * (s2 ? -1 : 1);
                            anchors.push([pt.x + gap, dy, false]);
                            anchors.push([pt.x - gap - w, dy, true]);
                            if (step) {
                                anchors.push([pt.x - w / 2, dy, false]);
                            }
                        }
                    }
                    anchors.some(function(a) {
                        var x = a[0];
                        var y = pt.y + a[1];
                        if (x < area.left || x + w > area.right) return false;
                        if (y - lineH / 2 < area.top ||
                            y + lineH / 2 > area.bottom) return false;
                        var box = { x0: x - 2, x1: x + w + 2,
                                    y0: y - lineH / 2, y1: y + lineH / 2 };
                        if (placed.some(function(p) {
                            return overlaps(box, p);
                        })) return false;
                        best = { x: x, y: y, box: box, left: a[2] };
                        return true;
                    });
                    if (!best) return;   // sr-table still carries every row
                    placed.push(best.box);
                    if (Math.abs(best.y - pt.y) > 1.5) {
                        var centred = Math.abs(best.x + w / 2 - pt.x) < gap;
                        ctx.beginPath();
                        ctx.moveTo(pt.x + (centred ? 0 : best.left ? -4 : 4),
                                   pt.y + (centred
                                       ? (best.y > pt.y ? 5 : -5) : 0));
                        ctx.lineTo(centred ? pt.x
                                           : best.left ? best.x + w + 2
                                                       : best.x - 2,
                                   best.y + (centred
                                       ? (best.y > pt.y ? -lineH / 2
                                                        : lineH / 2) : 0));
                        ctx.stroke();
                    }
                    ctx.fillText(labels[i], best.x, best.y);
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
                // The right padding is the label gutter. It used to be a flat
                // 120 px, which is wider than a 390 px canvas can spare and
                // still not enough for "performance standard" at 1440 px.
                layout: { padding: { right: 12 } },
                scales: {
                    x: {
                        beginAtZero: true,
                        // Room for the label of the right-most point. A quarter
                        // of the range clears the longest short label at every
                        // width the site renders at.
                        suggestedMax: Math.ceil(xMax * 1.28),
                        title: {
                            display: true,
                            text: 'Called feasible — picks out of ' + feasBase +
                                ' who answered'
                        }
                    },
                    y: {
                        // Headroom top and bottom so a nudged label at either
                        // extreme stays inside the plot area.
                        grace: '12%',
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
                    return [r.short, String(r.feasibility.n || 0),
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
