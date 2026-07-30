// ============================================================================
// S2Viz - likert heatmap, diverging stacked bars, and option bars
// ============================================================================
// Site-specific module (not an upstream design-system file).
//
//   S2Viz.renderHeatmap(el, {questions, cells, segment, metric, ...})
//   S2Viz.renderDivergingBar(canvas, rows, opts)
//   S2Viz.renderOptionBars(canvas, options, opts)
//   S2Viz.srTable(el, {caption, head, rows})
//
// Contract shapes come from plans/mbm-dashboard/PLAN.md §5:
//   CELL = {c:[n1..nL], off:<off-scale n>, n:<scored>, mean:<2dp>}
//   masked CELL = {n:<5} with no `c` / `mean` (privacy/noise guard)
//
// SCALE DIRECTION IS NOT UNIVERSAL. Never pool constructs and never paint a
// burden/cost row with the support ramp — `support` runs 1=oppose→5=support,
// while `burden_relative`/`cost_relative` anchor 3 to "same as today" and treat
// 5 as a complaint. Ramp families below encode that; colors are read from the
// design tokens at runtime, so no hex is hardcoded anywhere in this file.
// ============================================================================

(function() {
    'use strict';

    // --- Construct → ramp family --------------------------------------------
    var FAMILIES = {
        support: {
            key: 'support',
            diverging: true,
            posToken: '--green-text',
            negToken: '--red-text',
            group: 'Stance',
            badge: '5 = supports',
            lowLabel: 'oppose (bottom two)',
            midLabel: 'neutral (middle)',
            highLabel: 'support (top two)'
        },
        complaint: {
            key: 'complaint',
            diverging: true,
            posToken: '--amber-text',
            negToken: '--hydro-text',
            group: 'Cost & burden vs today',
            badge: '3 = same as today · 5 = much more',
            lowLabel: 'less than today (bottom two)',
            midLabel: 'same as today (middle)',
            highLabel: 'more than today (top two)'
        },
        magnitude: {
            key: 'magnitude',
            diverging: false,
            posToken: '--hydro-text',
            negToken: '--hydro-text',
            group: 'Labeled scales',
            badge: '5 = high',
            lowLabel: 'low (bottom two)',
            midLabel: 'middle',
            highLabel: 'high (top two)'
        },
        ladder: {
            key: 'ladder',
            diverging: false,
            posToken: '--nuclear-text',
            negToken: '--nuclear-text',
            group: 'Ordinal ladders',
            badge: 'ordered rungs — not a 1–5 scale',
            lowLabel: 'lowest rung',
            midLabel: 'middle rungs',
            highLabel: 'highest rung'
        }
    };

    var CONSTRUCTS = {
        support:            { family: 'support',   group: 'Stance — support for the proposal' },
        burden_relative:    { family: 'complaint', group: 'Burden relative to today' },
        cost_relative:      { family: 'complaint', group: 'Cost relative to today' },
        impact_magnitude:   { family: 'magnitude', group: 'Impact magnitude' },
        readiness_labeled:  { family: 'magnitude', group: 'Readiness (labeled scale)' },
        sufficiency_labeled:{ family: 'magnitude', group: 'Sufficiency (labeled scale)' },
        ordinal:            { family: 'ladder',    group: 'Ordinal ladders' }
    };

    var METRICS = [
        { key: 'support', label: '% support (4–5)', kind: 'pct' },
        { key: 'oppose',  label: '% oppose (1–2)',  kind: 'pct' },
        { key: 'mean',    label: 'Mean',            kind: 'mean' },
        { key: 'net',     label: 'Net (support − oppose)', kind: 'net' }
    ];

    var ALPHA_MIN = 0.07;
    var ALPHA_MAX = 0.85;   // capped so the dark text token keeps ≥4.5:1

    function familyFor(construct) {
        var spec = CONSTRUCTS[construct];
        return FAMILIES[(spec && spec.family) || 'magnitude'];
    }

    function groupLabel(construct) {
        var spec = CONSTRUCTS[construct];
        if (spec) return spec.group;
        return construct ? construct.replace(/_/g, ' ') : 'Other scales';
    }

    // --- Small helpers -------------------------------------------------------
    function esc(s) {
        return String(s === null || s === undefined ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function node(t) {
        if (typeof t === 'string') {
            return t.charAt(0) === '#' ? document.getElementById(t.slice(1))
                                       : document.querySelector(t);
        }
        return t || null;
    }

    function sum(a) {
        return (a || []).reduce(function(x, y) { return x + (y || 0); }, 0);
    }

    function reducedMotion() {
        return window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // --- Token-derived color math -------------------------------------------
    // Values come from CSS custom properties (design tokens), never literals.
    var TOKENS = {};
    function token(name) {
        if (!(name in TOKENS)) {
            var v = '';
            try {
                v = getComputedStyle(document.documentElement)
                    .getPropertyValue(name).trim();
            } catch (e) { v = ''; }
            TOKENS[name] = v;
        }
        return TOKENS[name];
    }

    function parseColor(str) {
        if (!str) return null;
        str = String(str).trim();
        var m = /^#([0-9a-f]{3})$/i.exec(str);
        if (m) {
            return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16),
                    parseInt(m[1][2] + m[1][2], 16)];
        }
        m = /^#([0-9a-f]{6})$/i.exec(str);
        if (m) {
            return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16),
                    parseInt(m[1].slice(4, 6), 16)];
        }
        m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(str);
        if (m) return [+m[1], +m[2], +m[3]];
        return null;
    }

    function mix(fg, bg, alpha) {
        return [0, 1, 2].map(function(i) {
            return Math.round(bg[i] + (fg[i] - bg[i]) * alpha);
        });
    }

    function relLum(rgb) {
        var c = rgb.map(function(v) {
            v = v / 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    }

    function contrast(a, b) {
        var la = relLum(a), lb = relLum(b);
        return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    }

    function rgbCss(rgb) {
        return 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
    }

    // Pick the token text color with the best contrast on this cell background.
    function pickText(bg) {
        var cands = [parseColor(token('--text-primary')) || [0, 0, 0],
                     parseColor(token('--bg-page-white')) || [255, 255, 255]];
        var best = cands[0], bestRatio = 0;
        cands.forEach(function(c) {
            var r = contrast(c, bg);
            if (r > bestRatio) { bestRatio = r; best = c; }
        });
        return { color: rgbCss(best), ratio: bestRatio };
    }

    // t in [-1, 1] (diverging) or [0, 1] (sequential) → inline style string.
    function tintStyle(t, fam) {
        var base = parseColor(token('--bg-card')) || [255, 255, 255];
        var poleToken = (fam.diverging && t < 0) ? fam.negToken : fam.posToken;
        var pole = parseColor(token(poleToken));
        if (!pole) return '';                 // no tokens available: stay plain
        var mag = Math.min(1, Math.abs(t));
        var alpha = ALPHA_MIN + (ALPHA_MAX - ALPHA_MIN) * mag;
        var bg = mix(pole, base, alpha);
        var text = pickText(bg);
        return 'background:' + rgbCss(bg) + ';color:' + text.color + ';';
    }

    // --- Metric computation --------------------------------------------------
    // Bottom/top ends are single rungs for ordinal ladders and for any scale
    // shorter than four rungs (where 1–2 and 4–5 would overlap); two rungs
    // otherwise, matching the PLAN §5 formula (c1+c2)/n and (c4+c5)/n.
    function endWidth(fam, len) {
        return (fam.key === 'ladder' || len < 4) ? 1 : 2;
    }

    function shares(cell, fam) {
        var c = cell.c || [];
        var len = c.length;
        var n = cell.n || sum(c);
        if (!n || !len) return null;
        var w = endWidth(fam, len);
        var lo = sum(c.slice(0, w)) / n;
        var hi = sum(c.slice(len - w)) / n;
        var mid = 1 - lo - hi;
        var mean = (cell.mean !== undefined && cell.mean !== null)
            ? cell.mean
            : c.reduce(function(acc, v, i) { return acc + (i + 1) * v; }, 0) / n;
        return { lo: lo, mid: Math.max(0, mid), hi: hi, mean: mean, n: n, len: len, w: w };
    }

    function isMasked(cell, maskN) {
        if (!cell) return false;
        if (!cell.c) return true;                         // {n:<5} sentinel
        if (cell.n === '<5') return true;                 // string sentinel form
        var n = cell.n === undefined ? sum(cell.c) : cell.n;
        return typeof n === 'number' && n < maskN;
    }

    // → {ok, value, kind, text, t}
    function metricValue(cell, metric, fam) {
        var s = cell ? shares(cell, fam) : null;
        if (!s) return { ok: false };
        var mid = (1 + s.len) / 2;
        var value, kind, t;
        if (metric === 'oppose') {
            value = s.lo; kind = 'pct';
            t = fam.diverging ? -value : value;
        } else if (metric === 'mean') {
            value = s.mean; kind = 'mean';
            t = fam.diverging ? (value - mid) / (mid - 1)
                              : (value - 1) / (s.len - 1);
        } else if (metric === 'net') {
            value = s.hi - s.lo; kind = 'net';
            t = fam.diverging ? value : Math.abs(value);
        } else {
            value = s.hi; kind = 'pct';
            t = value;
        }
        return { ok: true, value: value, kind: kind, t: t, shares: s };
    }

    function formatMetric(value, kind) {
        if (kind === 'mean') return value.toFixed(2);
        if (kind === 'net') {
            var pts = Math.round(value * 100);
            return (pts > 0 ? '+' : pts < 0 ? '−' : '') + Math.abs(pts);
        }
        return Math.round(value * 100) + '%';
    }

    function metricWord(metric, fam) {
        if (metric === 'oppose') return fam.lowLabel;
        if (metric === 'support') return fam.highLabel;
        if (metric === 'mean') return 'mean score';
        return 'net (' + fam.highLabel + ' minus ' + fam.lowLabel + ')';
    }

    function rungLabels(q, len) {
        if (q && q.labels && q.labels.length === len) return q.labels.slice();
        var out = [];
        for (var i = 1; i <= len; i++) out.push(String(i));
        if (q && q.anchor_low && out.length) out[0] = q.anchor_low;
        if (q && q.anchor_high && out.length) out[out.length - 1] = q.anchor_high;
        return out;
    }

    function offScaleLabel(q) {
        if (q && q.off_scale_labels && q.off_scale_labels.length) {
            return q.off_scale_labels.join(' / ');
        }
        return 'Off-scale';
    }

    // --- Screen-reader data table -------------------------------------------
    function srTable(target, spec) {
        var el = node(target);
        if (!el) return null;
        spec = spec || {};
        var html = '<table class="sr-only s2-sr-table">';
        if (spec.caption) html += '<caption>' + esc(spec.caption) + '</caption>';
        if (spec.head) {
            html += '<thead><tr>' + spec.head.map(function(h) {
                return '<th scope="col">' + esc(h) + '</th>';
            }).join('') + '</tr></thead>';
        }
        html += '<tbody>' + (spec.rows || []).map(function(row) {
            return '<tr>' + row.map(function(cellText, i) {
                return i === 0 ? '<th scope="row">' + esc(cellText) + '</th>'
                               : '<td>' + esc(cellText) + '</td>';
            }).join('') + '</tr>';
        }).join('') + '</tbody></table>';
        el.innerHTML = html;
        return el;
    }

    // Append (or reuse) an sr-only table sibling for a chart canvas.
    function chartSrTable(canvas, spec) {
        var host = canvas.parentNode;
        if (!host) return;
        var id = (canvas.id || 'chart') + '-srtable';
        var holder = document.getElementById(id);
        if (!holder) {
            holder = document.createElement('div');
            holder.id = id;
            host.appendChild(holder);
        }
        srTable(holder, spec);
    }

    // --- Popover -------------------------------------------------------------
    var popover = null;
    var popoverOwner = null;

    function ensurePopover() {
        if (popover) return popover;
        popover = document.createElement('div');
        popover.className = 's2-popover';
        popover.setAttribute('role', 'dialog');
        popover.setAttribute('aria-label', 'Response distribution');
        popover.hidden = true;
        popover.addEventListener('click', function(ev) {
            if (ev.target.closest('[data-s2-close]')) closePopover();
        });
        document.body.appendChild(popover);

        document.addEventListener('keydown', function(ev) {
            if (ev.key === 'Escape' && !popover.hidden) closePopover();
        });
        document.addEventListener('click', function(ev) {
            if (popover.hidden) return;
            if (popover.contains(ev.target)) return;
            if (ev.target.closest('.s2-cell')) return;
            closePopover();
        }, true);
        // Track the cell rather than closing: focusing the popover can itself
        // scroll the page, and a close-on-scroll handler would eat the open.
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return popover;
    }

    function place() {
        if (!popover || popover.hidden || !popoverOwner) return;
        var r = popoverOwner.getBoundingClientRect();
        var pw = popover.offsetWidth, ph = popover.offsetHeight;
        var left = window.pageXOffset + r.left + r.width / 2 - pw / 2;
        var top = window.pageYOffset + r.bottom + 8;
        var maxLeft = window.pageXOffset + document.documentElement.clientWidth - pw - 8;
        left = Math.max(window.pageXOffset + 8, Math.min(left, maxLeft));
        if (r.bottom + ph + 16 > document.documentElement.clientHeight) {
            top = window.pageYOffset + r.top - ph - 8;
        }
        popover.style.left = Math.round(left) + 'px';
        popover.style.top = Math.round(Math.max(window.pageYOffset + 8, top)) + 'px';
    }

    function closePopover() {
        if (!popover || popover.hidden) return;
        popover.hidden = true;
        if (popoverOwner && popoverOwner.focus) {
            var owner = popoverOwner;
            popoverOwner = null;
            owner.focus();
        }
        popoverOwner = null;
    }

    function popoverHtml(q, cell, colLabel, fam, pageBase) {
        var s = shares(cell, fam);
        var labels = rungLabels(q, (cell.c || []).length);
        var maxC = Math.max.apply(null, (cell.c || [0]));
        var rows = (cell.c || []).map(function(v, i) {
            var pct = s && s.n ? Math.round(1000 * v / s.n) / 10 : 0;
            var w = maxC ? Math.round(100 * v / maxC) : 0;
            return '<li class="s2-dist-row">' +
                '<span class="s2-dist-label">' + esc(labels[i]) + '</span>' +
                '<span class="s2-dist-bar" aria-hidden="true">' +
                '<span class="s2-dist-fill" style="width:' + w + '%"></span></span>' +
                '<span class="s2-dist-n">' + v + '</span>' +
                '<span class="s2-dist-pct">' + pct.toFixed(1) + '%</span></li>';
        }).join('');

        var html = '<button type="button" class="s2-popover-close" data-s2-close ' +
            'aria-label="Close">&times;</button>' +
            '<div class="s2-popover-kicker">Q' + esc(q.q) + ' · ' + esc(colLabel) + '</div>' +
            '<div class="s2-popover-title">' + esc(q.label) + '</div>' +
            '<ul class="s2-dist">' + rows + '</ul>' +
            '<div class="s2-popover-meta">' +
            '<span><strong>n</strong> ' + (s ? s.n : 0) + ' scored</span>' +
            (s ? '<span><strong>mean</strong> ' + s.mean.toFixed(2) + '</span>' : '') +
            '<span><strong>' + esc(offScaleLabel(q)) + '</strong> ' +
            (cell.off || 0) + '</span>' +
            '</div>';
        if (q.scale_note) {
            html += '<p class="s2-popover-note">' + esc(q.scale_note) + '</p>';
        }
        if (q.page) {
            var what = /^proposals\//.test(q.page) ? 'proposal' : 'related';
            html += '<a class="s2-popover-link" href="' + esc((pageBase || '') + q.page) +
                '">Open the ' + what + ' page &rarr;</a>';
        }
        return html;
    }

    function openPopover(cellEl, q, cell, colLabel, fam, pageBase) {
        var pop = ensurePopover();
        pop.innerHTML = popoverHtml(q, cell, colLabel, fam, pageBase);
        pop.hidden = false;
        popoverOwner = cellEl;
        place();
        var close = pop.querySelector('.s2-popover-close');
        if (close) close.focus({ preventScroll: true });
    }

    // --- Heatmap -------------------------------------------------------------
    // renderHeatmap(el, {questions, cells, segment, metric, minN, maskN,
    //                    pageBase, label, srTable})
    //   questions : meta.json `questions` (rows without a `construct` are skipped)
    //   cells     : likert.json
    //   segment   : dim key ('org_type', 'overall', …) or {dim, values:[{key,label,n}]}
    function renderHeatmap(target, opts) {
        var el = node(target);
        if (!el) return null;
        opts = opts || {};
        var metric = opts.metric || 'support';
        var maskN = opts.maskN === undefined ? 5 : opts.maskN;
        var minN = opts.minN === undefined ? 0 : opts.minN;
        var cells = opts.cells || {};
        var pageBase = opts.pageBase || '';

        var questions = (opts.questions || []).filter(function(q) {
            return q && q.construct;
        });

        // Resolve columns.
        var segment = opts.segment || 'overall';
        var dimKey = typeof segment === 'string' ? segment : (segment.dim || 'overall');
        var columns;
        if (dimKey === 'overall') {
            columns = [{ key: 'overall', label: opts.overallLabel || 'All respondents' }];
        } else if (typeof segment !== 'string' && segment.values) {
            columns = segment.values.slice();
        } else if (window.S2Segments && S2Segments.values(dimKey).length) {
            columns = S2Segments.values(dimKey);
        } else {
            var seen = {};
            questions.forEach(function(q) {
                var byDim = (cells[String(q.q)] || {})[dimKey] || {};
                Object.keys(byDim).forEach(function(k) { seen[k] = true; });
            });
            columns = Object.keys(seen).map(function(k) { return { key: k, label: k }; });
        }

        // Column base sizes: the segment's own n, else the largest cell n.
        columns = columns.map(function(col) {
            var base = col.n;
            if (base === undefined) {
                base = 0;
                questions.forEach(function(q) {
                    var cell = cellFor(cells, q, dimKey, col.key);
                    var n = cell && typeof cell.n === 'number' ? cell.n : 0;
                    if (n > base) base = n;
                });
            }
            return { key: col.key, label: col.label || col.key, n: base };
        });

        var hidden = columns.filter(function(c) { return minN && c.n < minN; });
        if (minN) {
            columns = columns.filter(function(c) { return c.n >= minN; });
        }

        if (!questions.length || !columns.length) {
            el.innerHTML = '<div class="card s2-empty">No rows to show' +
                (hidden.length ? ' — every segment falls below the n≥' + minN +
                                 ' threshold.' : '.') + '</div>';
            return { el: el, columns: columns, rows: questions };
        }

        // Group rows by construct, preserving first-appearance order.
        var groups = [];
        var byConstruct = {};
        questions.forEach(function(q) {
            if (!byConstruct[q.construct]) {
                byConstruct[q.construct] = { construct: q.construct, rows: [] };
                groups.push(byConstruct[q.construct]);
            }
            byConstruct[q.construct].rows.push(q);
        });

        var html = '<div class="s2-heatmap" role="grid" style="--s2-cols:' +
            columns.length + '" aria-label="' +
            esc(opts.label || 'Likert heatmap by segment') + '">';

        // Header row.
        html += '<div class="s2-hm-row s2-hm-headrow" role="row">' +
            '<div class="s2-hm-corner" role="columnheader">Question</div>';
        columns.forEach(function(col) {
            html += '<div class="s2-hm-colhead" role="columnheader">' +
                '<span class="s2-hm-colname">' + esc(col.label) + '</span>' +
                '<span class="s2-base-chip">n=' + (col.n || 0) + '</span></div>';
        });
        html += '</div>';

        var srRows = [];

        groups.forEach(function(group) {
            var fam = familyFor(group.construct);
            var badge = group.rows[0].anchor_high || fam.badge;
            html += '<div class="s2-hm-row s2-hm-grouprow" role="row">' +
                '<div class="s2-hm-grouphead" role="columnheader" ' +
                'aria-colindex="1">' +
                '<span class="s2-hm-groupname">' + esc(groupLabel(group.construct)) +
                '</span><span class="s2-dir-badge s2-dir-' + fam.key + '">' +
                esc(badge) + '</span></div></div>';

            group.rows.forEach(function(q) {
                html += '<div class="s2-hm-row" role="row">' +
                    '<div class="s2-hm-rowhead" role="rowheader">' +
                    '<span class="s2-hm-qnum">Q' + esc(q.q) + '</span>' +
                    '<span class="s2-hm-qlabel">' + esc(q.label) + '</span></div>';

                var srRow = ['Q' + q.q + ' ' + q.label];
                columns.forEach(function(col) {
                    var cell = cellFor(cells, q, dimKey, col.key);
                    var out = renderCell(q, cell, col, fam, metric, maskN);
                    html += out.html;
                    srRow.push(out.srText);
                });
                srRows.push(srRow);
                html += '</div>';
            });
        });

        html += '</div>';

        var wrap = '<div class="s2-heatmap-wrap">' + html + '</div>';
        if (hidden.length) {
            wrap += '<p class="s2-note">Hidden for small base size (n&lt;' + minN +
                '): ' + esc(hidden.map(function(c) {
                    return c.label + ' (n=' + c.n + ')';
                }).join(', ')) + '.</p>';
        }
        wrap += '<p class="s2-note s2-note-legend"><span class="s2-swatch-hatch" ' +
            'aria-hidden="true"></span> hatched = fewer than ' + maskN +
            ' respondents; the value is suppressed, not zero.</p>';
        wrap += '<div id="' + (el.id || 'heatmap') + '-srtable"></div>';
        el.innerHTML = wrap;

        if (opts.srTable !== false) {
            srTable(document.getElementById((el.id || 'heatmap') + '-srtable'), {
                caption: (opts.label || 'Likert heatmap') + ' — ' +
                    metricLabel(metric) + ' by ' +
                    (dimKey === 'overall' ? 'all respondents' : dimKey),
                head: ['Question'].concat(columns.map(function(c) {
                    return c.label + ' (n=' + (c.n || 0) + ')';
                })),
                rows: srRows
            });
        }

        wireCells(el, questions, cells, dimKey, columns, maskN, pageBase);

        return { el: el, columns: columns, rows: questions, hidden: hidden };
    }

    function metricLabel(metric) {
        var found = null;
        METRICS.forEach(function(m) { if (m.key === metric) found = m; });
        return found ? found.label : metric;
    }

    function cellFor(cells, q, dimKey, colKey) {
        var byQ = cells[String(q.q)];
        if (!byQ) return null;
        if (dimKey === 'overall') return byQ.overall || null;
        var byDim = byQ[dimKey];
        return byDim ? (byDim[colKey] || null) : null;
    }

    function renderCell(q, cell, col, fam, metric, maskN) {
        var aria, cls = 's2-cell', style = '', inner, srText;

        if (!cell) {
            cls += ' s2-cell--empty';
            aria = q.label + ' — ' + col.label + ': not answered by this segment.';
            inner = '<span class="s2-cell-val" aria-hidden="true">·</span>';
            srText = 'no data';
        } else if (isMasked(cell, maskN)) {
            cls += ' s2-cell--masked';
            var mn = cell.n === undefined ? '<' + maskN : cell.n;
            aria = q.label + ' — ' + col.label + ': suppressed, fewer than ' + maskN +
                ' respondents (n=' + mn + ').';
            inner = '<span class="sr-only">suppressed (n&lt;' + maskN + ')</span>';
            srText = 'suppressed (n<' + maskN + ')';
        } else {
            var mv = metricValue(cell, metric, fam);
            if (!mv.ok) {
                cls += ' s2-cell--empty';
                aria = q.label + ' — ' + col.label + ': no scored answers.';
                inner = '<span class="s2-cell-val" aria-hidden="true">·</span>';
                srText = 'no scored answers';
            } else {
                var text = formatMetric(mv.value, mv.kind);
                style = tintStyle(mv.t, fam);
                cls += ' s2-cell--data';
                var s = mv.shares;
                aria = q.label + ' — ' + col.label + ': ' + text + ' ' +
                    metricWord(metric, fam) + '. Distribution ' +
                    (cell.c || []).join(', ') + ' across ' + s.len +
                    ' rungs; n=' + s.n + ' scored, mean ' + s.mean.toFixed(2) +
                    ', ' + (cell.off || 0) + ' off-scale. ' +
                    'Activate for the full distribution.';
                inner = '<span class="s2-cell-val">' + esc(text) + '</span>';
                srText = text + ' (n=' + s.n + ')';
            }
        }

        var interactive = cls.indexOf('s2-cell--data') >= 0;
        return {
            html: '<div class="' + cls + '" role="gridcell"' +
                (interactive ? ' tabindex="0"' : '') +
                ' data-q="' + esc(q.q) + '" data-col="' + esc(col.key) + '"' +
                ' aria-label="' + esc(aria) + '"' +
                (style ? ' style="' + style + '"' : '') + '>' + inner + '</div>',
            srText: srText
        };
    }

    // Listeners are attached once per container and read the latest render
    // context off the element, so repeated renders never stack handlers.
    function wireCells(el, questions, cells, dimKey, columns, maskN, pageBase) {
        var qByNum = {};
        questions.forEach(function(q) { qByNum[String(q.q)] = q; });
        var colByKey = {};
        columns.forEach(function(c) { colByKey[c.key] = c; });
        el.s2HeatmapCtx = {
            qByNum: qByNum, colByKey: colByKey, cells: cells,
            dimKey: dimKey, maskN: maskN, pageBase: pageBase
        };
        if (el.s2HeatmapWired) return;
        el.s2HeatmapWired = true;

        function activate(cellEl) {
            var ctx = el.s2HeatmapCtx;
            var q = ctx.qByNum[cellEl.getAttribute('data-q')];
            var col = ctx.colByKey[cellEl.getAttribute('data-col')];
            if (!q || !col) return;
            var cell = cellFor(ctx.cells, q, ctx.dimKey, col.key);
            if (!cell || isMasked(cell, ctx.maskN)) return;
            openPopover(cellEl, q, cell, col.label, familyFor(q.construct),
                        ctx.pageBase);
        }

        el.addEventListener('click', function(ev) {
            var cellEl = ev.target.closest('.s2-cell--data');
            if (cellEl && el.contains(cellEl)) activate(cellEl);
        });
        el.addEventListener('keydown', function(ev) {
            if (ev.key !== 'Enter' && ev.key !== ' ') return;
            var cellEl = ev.target.closest('.s2-cell--data');
            if (!cellEl || !el.contains(cellEl)) return;
            ev.preventDefault();
            activate(cellEl);
        });
    }

    // --- Chart.js helpers ----------------------------------------------------
    function chartMissing(canvas, what) {
        var host = canvas && canvas.parentNode;
        if (host) {
            host.innerHTML = '<div class="card s2-error" role="alert">' +
                '<div class="s2-error-title">Chart library unavailable</div>' +
                '<p class="s2-error-hint">Chart.js did not load, so the ' +
                esc(what) + ' cannot be drawn. Check the pinned ' +
                '<code>chart.umd.min.js</code> tag in the page head.</p></div>';
        }
        return null;
    }

    function reset(canvas) {
        if (window.Chart && Chart.getChart) {
            var prev = Chart.getChart(canvas);
            if (prev) prev.destroy();
        }
    }

    // Chart.js clips a category label that is wider than its axis allowance
    // instead of shortening it, so budget characters against the canvas width
    // and wrap onto at most `maxLines` (an array tick label is multi-line).
    // The untruncated text still reaches the tooltip and the sr-only table.
    function wrapLabel(text, budget, maxLines) {
        text = String(text === null || text === undefined ? '' : text).trim();
        if (text.length <= budget) return text;
        var words = text.split(/\s+/);
        var lines = [], cur = '';
        for (var i = 0; i < words.length; i++) {
            var candidate = cur ? cur + ' ' + words[i] : words[i];
            if (candidate.length <= budget) {
                cur = candidate;
            } else {
                if (cur) lines.push(cur);
                cur = words[i];
                if (lines.length >= maxLines) { cur = ''; break; }
            }
        }
        if (cur && lines.length < maxLines) lines.push(cur);
        if (lines.join(' ').length < text.replace(/\s+/g, ' ').length) {
            var last = lines[lines.length - 1] || '';
            lines[lines.length - 1] = last.slice(0, Math.max(1, budget - 1)) + '…';
        }
        lines = lines.map(function(l) {
            return l.length > budget ? l.slice(0, budget - 1) + '…' : l;
        });
        return lines.length === 1 ? lines[0] : lines;
    }

    function axisLabels(canvas, texts, opts) {
        opts = opts || {};
        var host = canvas.parentNode;
        var width = canvas.clientWidth || (host && host.clientWidth) || 480;
        var budget = opts.budget ||
            Math.max(12, Math.floor(width * (opts.share || 0.34) / 6.6));
        var maxLines = opts.maxLines || 2;
        return texts.map(function(t) { return wrapLabel(t, budget, maxLines); });
    }

    function baseOptions(extra) {
        var o = {
            responsive: true,
            maintainAspectRatio: false,
            animation: reducedMotion() ? false : undefined
        };
        Object.keys(extra || {}).forEach(function(k) { o[k] = extra[k]; });
        return o;
    }

    // Palette per ramp family, sourced from chart-colors.js constants.
    function chartPalette(fam) {
        var S = window.SEMANTIC_COLORS || {};
        var R = window.RESOURCE_COLORS || {};
        if (fam.key === 'complaint') {
            return { low: R.hydro, mid: S.muted, high: R.solar, highBorder: R.geothermal };
        }
        if (fam.key === 'support') {
            return { low: S.negative, mid: S.muted, high: S.positive };
        }
        return { low: R.nuclear, mid: S.muted, high: R.hydro };
    }

    // --- Diverging stacked bar ----------------------------------------------
    // rows: [{label, cell, question}] — `question` supplies each row's construct.
    // Dataset colors are chart-level, so keep one construct family per chart:
    // a burden row must never end up under the support ramp's legend.
    function renderDivergingBar(target, rows, opts) {
        var canvas = node(target);
        if (!canvas) return null;
        opts = opts || {};
        if (!window.Chart) return chartMissing(canvas, 'diverging stacked bar');
        reset(canvas);

        var usable = (rows || []).filter(function(r) {
            return r && r.cell && r.cell.c && (r.cell.n || sum(r.cell.c));
        });
        if (!usable.length) {
            var host = canvas.parentNode;
            if (host) host.innerHTML = '<div class="card s2-empty">' +
                'No scored answers to chart for this selection.</div>';
            return null;
        }

        var fam = familyFor(opts.construct ||
            (usable[0].question && usable[0].question.construct) || 'support');
        var pal = chartPalette(fam);
        var withA = window.withAlpha || function(c) { return c; };

        var labels = [], lo = [], midL = [], midR = [], hi = [], meta = [];
        usable.forEach(function(r) {
            var f = r.question ? familyFor(r.question.construct) : fam;
            var s = shares(r.cell, f);
            labels.push(r.label || (r.question ? 'Q' + r.question.q : ''));
            lo.push(-(s.lo * 100));
            midL.push(-(s.mid * 100) / 2);
            midR.push((s.mid * 100) / 2);
            hi.push(s.hi * 100);
            meta.push({ s: s, cell: r.cell, fam: f });
        });

        function ds(label, data, color, border, hidden) {
            return {
                label: label,
                data: data,
                backgroundColor: withA(color, 0.78),
                borderColor: border || color,
                borderWidth: 1,
                borderRadius: 2,
                stack: 'likert',
                s2Hidden: !!hidden
            };
        }

        var chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: axisLabels(canvas, labels, { share: opts.labelShare || 0.36 }),
                datasets: [
                    ds(cap(fam.lowLabel), lo, pal.low),
                    ds(cap(fam.midLabel), midL, pal.mid),
                    ds(cap(fam.midLabel), midR, pal.mid, null, true),
                    ds(cap(fam.highLabel), hi, pal.high, pal.highBorder)
                ]
            },
            options: baseOptions({
                indexAxis: 'y',
                scales: {
                    x: {
                        stacked: true,
                        min: -100,
                        max: 100,
                        title: { display: true, text: '% of scored answers' },
                        ticks: {
                            callback: function(v) { return Math.abs(v) + '%'; }
                        }
                    },
                    y: { stacked: true, ticks: { autoSkip: false } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: function(items) {
                                return labels[items[0].dataIndex];
                            },
                            label: function(ctx) {
                                var m = meta[ctx.dataIndex];
                                var v = Math.abs(ctx.parsed.x);
                                var part = ctx.datasetIndex === 0 ? m.s.lo
                                    : ctx.datasetIndex === 3 ? m.s.hi : m.s.mid;
                                return ctx.dataset.label + ': ' +
                                    Math.round(part * 100) + '% (' +
                                    Math.round(part * m.s.n) + ' of ' + m.s.n + ')' +
                                    (ctx.datasetIndex === 1 || ctx.datasetIndex === 2
                                        ? ' — drawn split either side of zero'
                                        : ' [' + v.toFixed(1) + '% plotted]');
                            },
                            afterBody: function(items) {
                                var m = meta[items[0].dataIndex];
                                return 'mean ' + m.s.mean.toFixed(2) + ' · n=' + m.s.n +
                                    ' scored · ' + (m.cell.off || 0) + ' off-scale';
                            }
                        }
                    }
                }
            })
        });

        if (opts.legend && window.buildLegendFromChart) {
            buildLegendFromChart(node(opts.legend), chart, {
                filter: function(dset) { return !dset.s2Hidden; }
            });
        }

        if (opts.srTable !== false) {
            chartSrTable(canvas, {
                caption: opts.label || 'Distribution of responses, oppose to support',
                head: ['Question', cap(fam.lowLabel), cap(fam.midLabel),
                       cap(fam.highLabel), 'n scored', 'Mean', 'Off-scale'],
                rows: usable.map(function(r, i) {
                    var m = meta[i];
                    return [labels[i],
                            Math.round(m.s.lo * 100) + '%',
                            Math.round(m.s.mid * 100) + '%',
                            Math.round(m.s.hi * 100) + '%',
                            String(m.s.n), m.s.mean.toFixed(2),
                            String(m.cell.off || 0)];
                })
            });
        }

        return chart;
    }

    function cap(s) {
        return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
    }

    // --- Option bars (reason picklists) -------------------------------------
    // options: [{text, n, pct}] from reasons.json / selects.json / evidence.json
    function renderOptionBars(target, options, opts) {
        var canvas = node(target);
        if (!canvas) return null;
        opts = opts || {};
        if (!window.Chart) return chartMissing(canvas, 'option bars');
        reset(canvas);

        var base = opts.n_answered || opts.base || 0;
        var rows = (options || []).slice().filter(Boolean);
        if (opts.sort !== false) {
            rows.sort(function(a, b) { return (b.n || 0) - (a.n || 0); });
        }
        if (opts.limit) rows = rows.slice(0, opts.limit);
        if (!rows.length) {
            var host = canvas.parentNode;
            if (host) host.innerHTML = '<div class="card s2-empty">' +
                'No options to chart.</div>';
            return null;
        }

        var S = window.SEMANTIC_COLORS || {};
        var R = window.RESOURCE_COLORS || {};
        var color = opts.color ||
            (opts.side === 'for' ? S.positive
             : opts.side === 'against' ? S.negative
             : R.hydro);
        var withA = window.withAlpha || function(c) { return c; };

        var labels = axisLabels(canvas, rows.map(function(o) {
            return String(o.text || '');
        }), { share: opts.labelShare || 0.34, maxLines: opts.maxLines || 2 });
        var pcts = rows.map(function(o) {
            if (o.pct !== undefined && o.pct !== null) return o.pct;
            return base ? Math.round(1000 * (o.n || 0) / base) / 10 : 0;
        });

        // Local plugin: count label at the end of each bar. Colors come from
        // Chart defaults / design tokens, never a literal.
        var countLabels = {
            id: 's2CountLabels',
            afterDatasetsDraw: function(chart) {
                var ctx = chart.ctx;
                var metaSet = chart.getDatasetMeta(0);
                ctx.save();
                ctx.font = '600 11px ' +
                    (token('--font-data') || Chart.defaults.font.family);
                ctx.fillStyle = token('--text-muted') || S.muted || '';
                ctx.textBaseline = 'middle';
                metaSet.data.forEach(function(bar, i) {
                    var n = rows[i] && rows[i].n;
                    if (n === undefined || n === null) return;
                    ctx.fillText('n=' + n, bar.x + 6, bar.y);
                });
                ctx.restore();
            }
        };

        return new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: opts.datasetLabel || '% of respondents who answered',
                    data: pcts,
                    backgroundColor: withA(color, 0.7),
                    borderColor: color,
                    borderWidth: 1.5,
                    borderRadius: 3
                }]
            },
            options: baseOptions({
                indexAxis: 'y',
                layout: { padding: { right: 44 } },
                scales: {
                    x: {
                        beginAtZero: true,
                        suggestedMax: 100,
                        title: {
                            display: true,
                            text: '% of the ' + (base || 'n') + ' who answered'
                        },
                        ticks: { callback: function(v) { return v + '%'; } }
                    },
                    y: { ticks: { autoSkip: false } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: function(items) {
                                return String(rows[items[0].dataIndex].text || '');
                            },
                            label: function(ctx) {
                                var o = rows[ctx.dataIndex];
                                return (o.n !== undefined ? o.n + ' respondents · ' : '') +
                                    pcts[ctx.dataIndex] + '% of ' + (base || 'answered');
                            }
                        }
                    }
                }
            }),
            plugins: [countLabels]
        });
    }

    // Chart-independent helper for the option-bar sr table.
    function optionSrTable(target, options, opts) {
        opts = opts || {};
        return srTable(target, {
            caption: opts.caption || 'Options by share of respondents who answered',
            head: ['Option', 'n', '% of answered'],
            rows: (options || []).map(function(o) {
                return [String(o.text || ''), String(o.n === undefined ? '' : o.n),
                        (o.pct === undefined ? '' : o.pct + '%')];
            })
        });
    }

    window.S2Viz = {
        renderHeatmap: renderHeatmap,
        renderDivergingBar: renderDivergingBar,
        renderOptionBars: renderOptionBars,
        srTable: srTable,
        optionSrTable: optionSrTable,
        closePopover: closePopover,
        metricOptions: function() {
            return METRICS.map(function(m) { return { key: m.key, label: m.label }; });
        },
        metricLabel: metricLabel,
        familyFor: familyFor,
        groupLabel: groupLabel,
        shares: shares,
        isMasked: isMasked,
        metricValue: metricValue,
        formatMetric: formatMetric,
        CONSTRUCTS: CONSTRUCTS,
        FAMILIES: FAMILIES,
        METRICS: METRICS
    };
})();
