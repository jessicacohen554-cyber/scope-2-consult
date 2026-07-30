// ============================================================================
// heatmap-page.js — the Likert Explorer (frontend/heatmap.html)
// ============================================================================
// Site-specific page module (P30). Everything it draws comes from the shared
// P11 components — S2Data, S2Segments, S2Viz — plus the P22 exports described
// in plans/mbm-dashboard/PLAN.md §5. No shared JS or CSS is edited here.
//
// Local workarounds for shared-component gaps are all marked `GAP (P42)` so the
// polish pass can promote them into js/likert-viz.js, js/segments.js or
// styles/site.css:
//
//   1. likert-viz reads `off_scale_labels`; the exporter emits `off_labels`.
//      Aliased per row so the popover can name "Unsure" / "Unknown" / …
//   2. The heatmap's group badge is taken from the group's first row
//      `anchor_high`, which drops the construct-level anchoring that matters
//      most ("3 = same as today"). meta.constructs[].badge is written into that
//      field instead.
//   3. likert-viz has no notion of "this metric does not apply to this
//      construct", so the ordinal ladders are greyed to n/a here (DOM pass +
//      .hm-cell-na in the page's own <style>) under % support / % oppose / net.
//      Their cells stay clickable: the popover is the only place the rung
//      distribution and the off-scale count exist.
//   4. Ordinal means in likert.json follow each question's own answer_numeric
//      coding — Q70/Q120/Q121 are 1-based, Q77/Q134/Q136 are 0-based ("0%" and
//      "No meaningful improvement" score 0) — so two rows of the same group
//      would carry means on different bases (Q120 3.19 beside Q134 0.82). Every
//      ordinal cell mean is recomputed here as the mean rung index with
//      1 = first rung. Counts, n and off-scale totals are never touched.
//      Lane D should either normalise this or publish a `mean_base` per row.
//   5. S2Viz.renderDivergingBar replaces the canvas's parent with an "empty"
//      card when a selection has nothing to chart, which destroys the canvas
//      for good; the canvas is re-created before each draw.
//   6. S2Segments has no <select> control, and a 15-value .toggle-btn-group
//      overflows every viewport, so the segment-value picker is a local
//      <select class="s2-select"> wired through S2Segments.set() (URL state and
//      the segmentchange event still come from the shared module).
// ============================================================================

(function () {
    'use strict';

    var FILES = ['meta', 'likert'];

    var MASK_N = 5;         // exporter's privacy/noise floor — cells below it are hatched
    var SMALL_N = 15;       // "hide n<15 segments" threshold (PLAN §4)
    var DEF_DIM = 'org_type';
    var DEF_METRIC = 'support';

    // Metrics that read a top-two / bottom-two share. Meaningless on a ladder.
    var PCT_METRICS = { support: true, oppose: true, net: true };

    // Constructs whose middle rung is anchored to "same as today" (gotcha 4).
    var RELATIVE = { burden_relative: true, cost_relative: true };

    var D = {};             // loaded contract files
    var ROWS = [];          // heatmap rows: enriched copies of meta.questions
    var CELLS = {};         // likert.json with ordinal means normalised (gap 4)
    var ANCHORS = [];       // the seven support anchors, in survey order
    var ORDINAL = [];       // ordinal rows, for the n/a + ladder-tooltip pass
    var BADGES = {};        // construct key -> direction badge
    var segSelect = null;   // the local <select> handle

    // --- Small helpers -------------------------------------------------------

    function esc(s) {
        return S2Data.escapeHtml(s);
    }

    function el(id) {
        return document.getElementById(id);
    }

    function fmtInt(n) {
        return String(n === null || n === undefined ? '' : n)
            .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function fmtPct(x, dp) {
        return (x * 100).toFixed(dp === undefined ? 0 : dp) + '%';
    }

    function text(id, value) {
        var node = el(id);
        if (node) node.textContent = value;
    }

    // likert.json accessor. Mirrors likert-viz's internal cellFor().
    function cellFor(q, dimKey, colKey) {
        var byQ = CELLS[String(q.q)];
        if (!byQ) return null;
        if (dimKey === 'overall') return byQ.overall || null;
        var byDim = byQ[dimKey];
        return byDim ? (byDim[colKey] || null) : null;
    }

    function sharesOf(q, cell) {
        if (!cell || !cell.c) return null;
        return S2Viz.shares(cell, S2Viz.familyFor(q.construct));
    }

    function rowByQ(number) {
        var found = null;
        ROWS.forEach(function (r) { if (r.q === number) found = r; });
        return found;
    }

    // Wrap a label onto at most `maxLines` lines of `budget` characters. Chart.js
    // renders an array tick label as multiple lines; nothing is dropped.
    function wrapWords(t, budget, maxLines) {
        var words = String(t || '').trim().split(/\s+/);
        var lines = [];
        var cur = '';
        words.forEach(function (w) {
            var candidate = cur ? cur + ' ' + w : w;
            if (candidate.length <= budget || !cur) {
                cur = candidate;
            } else {
                lines.push(cur);
                cur = w;
            }
        });
        if (cur) lines.push(cur);
        if (lines.length > maxLines) {
            lines = lines.slice(0, maxLines);
            lines[maxLines - 1] = lines[maxLines - 1].slice(0, budget - 1) + '…';
        }
        return lines;
    }

    // --- View state (all of it lives in the URL, via S2Segments) --------------

    function currentDim() {
        var want = S2Segments.get('dim', DEF_DIM);
        var ok = false;
        S2Segments.dims().forEach(function (d) { if (d.key === want) ok = true; });
        return ok ? want : DEF_DIM;
    }

    function currentMetric() {
        var want = S2Segments.get('metric', DEF_METRIC);
        var ok = false;
        S2Viz.METRICS.forEach(function (m) { if (m.key === want) ok = true; });
        return ok ? want : DEF_METRIC;
    }

    function currentSeg() {
        var want = S2Segments.get('seg', 'overall');
        if (want === 'overall') return 'overall';
        var ok = false;
        S2Segments.values(currentDim()).forEach(function (v) {
            if (v.key === want) ok = true;
        });
        return ok ? want : 'overall';
    }

    function dimLabel(key) {
        var d = S2Segments.dim(key);
        return d ? d.label : key;
    }

    function segLabel() {
        var seg = currentSeg();
        return seg === 'overall'
            ? 'all respondents'
            : S2Segments.valueLabel(currentDim(), seg);
    }

    // --- Data preparation ----------------------------------------------------

    // Group order: meta.constructs is the exporter's canonical order (stance
    // first, ordinal ladders last). Fall back to likert-viz's own order when the
    // file predates that addition (the P11 fixtures do).
    function constructOrder(meta) {
        var order = [];
        (meta.constructs || []).forEach(function (c) {
            if (c && c.key) order.push(c.key);
        });
        if (!order.length) order = Object.keys(S2Viz.CONSTRUCTS);
        return order;
    }

    function constructBadges(meta) {
        var out = {};
        (meta.constructs || []).forEach(function (c) {
            if (c && c.key && c.badge) out[c.key] = c.badge;
        });
        return out;
    }

    // One heatmap row per scale/ordinal question, enriched for the shared
    // renderer (gaps 1 and 2) without mutating the loaded JSON.
    function buildRows(meta) {
        var order = constructOrder(meta);
        BADGES = constructBadges(meta);

        var rows = (meta.questions || []).filter(function (q) {
            return q && q.construct;
        }).map(function (q) {
            var row = {};
            Object.keys(q).forEach(function (k) { row[k] = q[k]; });

            // GAP 1 — popover off-scale label.
            if (!row.off_scale_labels && q.off_labels && q.off_labels.length) {
                row.off_scale_labels = q.off_labels.slice();
            }

            // Bare numeric ladders read better with the anchor wording on the
            // ends, and the two "relative" constructs need their middle rung
            // spelled out wherever a number is shown.
            if (q.labels && q.labels.length) {
                var labels = q.labels.slice();
                var bare = labels.every(function (l) {
                    return /^\d+$/.test(String(l));
                });
                if (bare) {
                    if (q.anchor_low) labels[0] = q.anchor_low;
                    if (q.anchor_high) labels[labels.length - 1] = q.anchor_high;
                    if (labels.length === 5 && RELATIVE[q.construct]) {
                        labels[2] = '3 = same as today';
                    }
                    row.labels = labels;
                }
            }

            // GAP 2 — construct-level direction badge. meta.constructs when the
            // export carries it, else the ramp family's own badge, which still
            // states the direction the scale runs in.
            row.anchor_high = BADGES[q.construct] ||
                S2Viz.familyFor(q.construct).badge;

            return row;
        });

        rows.sort(function (a, b) {
            var ia = order.indexOf(a.construct);
            var ib = order.indexOf(b.construct);
            if (ia < 0) ia = order.length;
            if (ib < 0) ib = order.length;
            if (ia !== ib) return ia - ib;
            return a.q - b.q;
        });

        return rows;
    }

    // GAP 4 — one mean convention for the whole ordinal group.
    function meanRung(c, n) {
        if (!c || !c.length || !n) return null;
        var total = 0;
        for (var i = 0; i < c.length; i++) total += (i + 1) * (c[i] || 0);
        return Math.round(100 * total / n) / 100;
    }

    function normaliseCell(cell) {
        if (!cell || !cell.c) return cell;                 // {n:"<5"} sentinel
        var n = typeof cell.n === 'number' ? cell.n : null;
        var m = meanRung(cell.c, n);
        if (m === null || m === cell.mean) return cell;
        var copy = {};
        Object.keys(cell).forEach(function (k) { copy[k] = cell[k]; });
        copy.mean = m;
        return copy;
    }

    function normaliseCells(likert, rows) {
        var out = {};
        Object.keys(likert).forEach(function (k) { out[k] = likert[k]; });

        rows.forEach(function (q) {
            if (q.construct !== 'ordinal') return;
            var byQ = likert[String(q.q)];
            if (!byQ) return;
            var copy = {};
            Object.keys(byQ).forEach(function (dim) {
                if (dim === 'overall') {
                    copy[dim] = normaliseCell(byQ[dim]);
                    return;
                }
                var vals = {};
                Object.keys(byQ[dim] || {}).forEach(function (key) {
                    vals[key] = normaliseCell(byQ[dim][key]);
                });
                copy[dim] = vals;
            });
            out[String(q.q)] = copy;
        });

        return out;
    }

    // --- Controls ------------------------------------------------------------

    function metricOptions() {
        var titles = {
            support: 'Share of scored answers in the row’s top two rungs. ' +
                'Support in the stance group; "more than today" on the burden ' +
                'and cost rows.',
            oppose: 'Share of scored answers in the row’s bottom two rungs.',
            mean: 'Mean on the row’s own scale. Never comparable across ' +
                'constructs.',
            net: 'Top-two share minus bottom-two share, in percentage points.'
        };
        return S2Viz.metricOptions().map(function (m) {
            return {
                key: m.key,
                label: m.key === 'net' ? 'Net' : m.label,
                title: titles[m.key] || m.label
            };
        });
    }

    // GAP 6 — segment-value picker. A <select> because org_type alone has 15
    // values; state still goes through S2Segments so the URL stays shareable.
    function buildSegSelect() {
        var host = el('segSelect');
        if (!host) return;

        var dim = currentDim();
        var current = currentSeg();
        var values = S2Segments.values(dim);
        var total = (D.meta.totals && D.meta.totals.respondents) || 0;

        var html = '<span class="s2-control-label" id="segSelectLabel">Bars show</span>' +
            '<select class="s2-select" id="segSelectInput" ' +
            'aria-labelledby="segSelectLabel">' +
            '<option value="overall"' + (current === 'overall' ? ' selected' : '') +
            '>All respondents' + (total ? ' (n=' + fmtInt(total) + ')' : '') +
            '</option>';
        values.forEach(function (v) {
            html += '<option value="' + esc(v.key) + '"' +
                (v.key === current ? ' selected' : '') + '>' +
                esc(v.label) + (v.n === undefined ? '' : ' (n=' + fmtInt(v.n) + ')') +
                '</option>';
        });
        html += '</select>';

        host.innerHTML = html;
        host.classList.add('s2-control', 's2-field');

        var input = el('segSelectInput');
        input.addEventListener('change', function () {
            var value = input.value;
            // `null` clears the parameter, which keeps the default out of the URL.
            S2Segments.set('seg', value === 'overall' ? null : value, { el: host });
        });
        segSelect = input;
    }

    function buildControls() {
        S2Segments.dimToggle('#dimToggle', {
            label: 'Segment (columns)',
            def: DEF_DIM
        });
        S2Segments.toggle('#metricToggle', {
            param: 'metric',
            label: 'Metric',
            options: metricOptions(),
            def: DEF_METRIC
        });
        S2Segments.switchToggle('#smallToggle', {
            param: 'hidesmall',
            label: 'Segments with n<' + SMALL_N,
            onLabel: 'Hidden',
            offLabel: 'Shown',
            def: false
        });
        buildSegSelect();
    }

    // --- Heatmap -------------------------------------------------------------

    function drawHeatmap() {
        var dim = currentDim();
        var metric = currentMetric();
        var hideSmall = S2Segments.getBool('hidesmall', false);

        var result = S2Viz.renderHeatmap('#heatmap', {
            questions: ROWS,
            cells: CELLS,
            segment: dim,
            metric: metric,
            maskN: MASK_N,
            minN: hideSmall ? SMALL_N : 0,
            label: 'MBM scale and ordinal questions by ' + dimLabel(dim),
            srTable: false          // built below, so ordinal n/a is reflected
        });
        if (!result) return;

        var columns = result.columns || [];
        markOrdinalRows(el('heatmap'), metric, columns);
        writeHeatmapSrTable(columns, dim, metric);
        writeHeatmapNotes(metric);
    }

    // GAP 3 — grey the ordinal ladders out under the share metrics, and give
    // every ladder row its rung list as a tooltip.
    function markOrdinalRows(host, metric, columns) {
        if (!host) return;
        var grid = host.querySelector('.s2-heatmap');
        if (!grid) return;

        var colLabel = {};
        columns.forEach(function (c) { colLabel[c.key] = c.label; });
        var blank = !!PCT_METRICS[metric];

        ORDINAL.forEach(function (row) {
            var cells = grid.querySelectorAll('.s2-cell[data-q="' + row.q + '"]');
            if (!cells.length) return;

            var head = cells[0].parentNode
                ? cells[0].parentNode.querySelector('.s2-hm-rowhead')
                : null;
            if (head && row.labels && row.labels.length) {
                var ladder = row.labels.map(function (l, i) {
                    return (i + 1) + '. ' + l;
                }).join('  ·  ');
                var off = (row.off_scale_labels || []).join(' / ');
                var tip = 'Ladder: ' + ladder +
                    (off ? '  ·  off-scale: ' + off : '');
                head.setAttribute('title', tip);
                if (!head.querySelector('.hm-ladder-sr')) {
                    var sr = document.createElement('span');
                    sr.className = 'sr-only hm-ladder-sr';
                    sr.textContent = ' ' + tip;
                    head.appendChild(sr);
                }
            }

            if (!blank) return;

            for (var i = 0; i < cells.length; i++) {
                var cell = cells[i];
                if (cell.className.indexOf('s2-cell--data') < 0) continue;
                var key = cell.getAttribute('data-col');
                cell.removeAttribute('style');        // drop the ramp tint
                cell.classList.add('hm-cell-na');
                cell.innerHTML = '<span class="s2-cell-val">n/a</span>';
                cell.setAttribute('aria-label', row.label + ' — ' +
                    (colLabel[key] || key) + ': not applicable. This is an ' +
                    'ordinal ladder of ' + (row.labels || []).length +
                    ' rungs, so it has no 1–5 support share. Activate for ' +
                    'the rung distribution and the off-scale count.');
            }
        });
    }

    // The renderer's own sr-only table would report a share for the ladders, so
    // it is switched off above and rebuilt here from the exported helpers.
    function writeHeatmapSrTable(columns, dim, metric) {
        var host = el('heatmap-srtable');
        if (!host) return;

        var rows = ROWS.map(function (q) {
            var row = ['Q' + q.q + ' ' + q.label];
            columns.forEach(function (col) {
                row.push(srCellText(q, cellFor(q, dim, col.key), metric));
            });
            return row;
        });

        S2Viz.srTable(host, {
            caption: 'MBM scale and ordinal questions — ' +
                S2Viz.metricLabel(metric) + ' by ' + dimLabel(dim) +
                '. Ordinal ladders report n/a where the metric does not apply.',
            head: ['Question'].concat(columns.map(function (c) {
                return c.label + ' (n=' + (c.n || 0) + ')';
            })),
            rows: rows
        });
    }

    function srCellText(q, cell, metric) {
        if (!cell) return 'no data';
        if (S2Viz.isMasked(cell, MASK_N)) return 'suppressed (n<' + MASK_N + ')';
        if (q.construct === 'ordinal' && PCT_METRICS[metric]) {
            return 'n/a (ordinal ladder)';
        }
        var mv = S2Viz.metricValue(cell, metric, S2Viz.familyFor(q.construct));
        if (!mv.ok) return 'no scored answers';
        return S2Viz.formatMetric(mv.value, mv.kind) + ' (n=' + mv.shares.n + ')';
    }

    function writeHeatmapNotes(metric) {
        var host = el('heatmapNotes');
        if (!host) return;

        var metricNote = {
            support: 'The share metrics are read within each row’s own ' +
                'construct: the top two rungs mean support in the stance group, ' +
                '“more than today” on the amber burden and cost rows, ' +
                'and “high” on the labeled scales.',
            oppose: 'The share metrics are read within each row’s own ' +
                'construct: the bottom two rungs mean opposition in the stance ' +
                'group, “less than today” on the amber burden and cost ' +
                'rows, and “low” on the labeled scales.',
            mean: 'Means sit on each row’s own scale and never travel ' +
                'between groups — 4.74 on a burden row is a cost complaint, ' +
                '4.58 on a stance row is near-consensus support.',
            net: 'Net is the top-two share minus the bottom-two share, in ' +
                'percentage points on each row’s own scale, so a negative ' +
                'net on a burden row means “less effort than today”.'
        }[metric] || '';

        var ladderNote = PCT_METRICS[metric]
            ? 'The ' + ORDINAL.length + ' ordinal ladders have no 1–5 ' +
              'support scale, so the share metrics are greyed to n/a there. ' +
              'Their cells still open: the popover is where the rung ' +
              'distribution, the off-scale count and the proposal link live.'
            : 'Ordinal means are mean rung positions (1 = first rung) on ladders ' +
              'of ' + ladderRange() + ' rungs, recomputed from the published ' +
              'counts so the group shares one convention.' + unevenRungs() +
              ' Compare them down a row, never across the group and never ' +
              'against a 1–5 mean.';

        host.innerHTML =
            '<p class="s2-note">' + esc(baseNote()) + '</p>' +
            '<p class="s2-note">' + esc(metricNote) + '</p>' +
            '<p class="s2-note">' + esc(ladderNote) + '</p>' +
            '<p class="s2-note">' + esc(offScaleNote()) + '</p>';
    }

    // A rung mean is a position on the ladder and not a quantity: the shortest
    // ladder on the page makes that concrete.
    function unevenRungs() {
        var shortest = null;
        ORDINAL.forEach(function (r) {
            var labels = r.labels || [];
            if (!labels.length || labels.length > 4) return;
            var size = labels.join(', ').length;
            if (size > 40) return;
            if (!shortest || size < shortest.size) {
                shortest = { row: r, size: size };
            }
        });
        if (!shortest) return '';
        return ' The rungs are ordered but not evenly spaced — Q' +
            shortest.row.q + '’s are ' + shortest.row.labels.join(', ') +
            ' — so a rung mean locates the answers on the ladder rather than ' +
            'measuring a quantity.';
    }

    function ladderRange() {
        var lens = ORDINAL.map(function (r) {
            return (r.labels || []).length;
        }).filter(Boolean);
        if (!lens.length) return '3 to 5';
        var min = Math.min.apply(null, lens);
        var max = Math.max.apply(null, lens);
        return min === max ? String(min) : min + ' to ' + max;
    }

    function baseNote() {
        var ns = ROWS.map(function (r) { return r.n_answered; })
            .filter(function (n) { return typeof n === 'number' && n > 0; });
        var span = ns.length
            ? fmtInt(Math.min.apply(null, ns)) + ' to ' +
              fmtInt(Math.max.apply(null, ns)) + ' answers'
            : 'very different numbers of answers';
        return 'Column chips carry the segment’s respondent base; each cell ' +
            'carries its own n, and these rows range from ' + span + '. Read ' +
            'down a column freely, across rows only with both bases in view.';
    }

    function offScaleNote() {
        var worst = null;
        ROWS.forEach(function (q) {
            var cell = cellFor(q, 'overall');
            if (!cell || !cell.c || !cell.off) return;
            var share = cell.off / (cell.off + (cell.n || 0));
            if (!worst || share > worst.share) {
                worst = { q: q, share: share, off: cell.off, n: cell.n || 0 };
            }
        });
        var base = 'Off-scale answers — “Unsure”, “Unknown”, ' +
            '“No basis to assess” — are counted in every popover and ' +
            'excluded from every metric; they are never folded into the scale.';
        if (!worst) return base;
        return base + ' They are heaviest on Q' + worst.q.q + ' (' +
            fmtInt(worst.off) + ' off-scale against ' + fmtInt(worst.n) +
            ' scored, ' + fmtPct(worst.share) + ' of that question’s answers).';
    }

    // --- The seven anchors ---------------------------------------------------

    // GAP 5 — put the canvas back if a previous empty selection removed it.
    // The explicit width matters too: likert-viz budgets its axis labels from
    // `canvas.clientWidth`, which on an untouched <canvas> is the 300px
    // intrinsic default, so the first render would truncate every row label.
    function ensureCanvas(holderId, canvasId) {
        var holder = el(holderId);
        if (!holder) return null;
        var canvas = el(canvasId);
        if (!canvas) {
            holder.innerHTML = '';
            canvas = document.createElement('canvas');
            canvas.id = canvasId;
            holder.appendChild(canvas);
        }
        canvas.style.width = '100%';
        return canvas;
    }

    function shortName(q) {
        return String(q.label || '')
            .replace(/^Support for (a |an |the )?/i, '')
            .replace(/^Preferred /i, '');
    }

    // How much of the canvas likert-viz may spend on row labels. A narrow phone
    // panel needs a bigger share to avoid truncating; a wide one does not.
    function labelShareFor(holderId) {
        var holder = el(holderId);
        var width = holder ? holder.clientWidth : 0;
        return width >= 520 ? 0.26 : 0.42;
    }

    function drawAnchors() {
        if (!ensureCanvas('anchorHolder', 'anchorBar')) return;

        var dim = currentDim();
        var seg = currentSeg();
        var lookupDim = seg === 'overall' ? 'overall' : dim;

        var rows = ANCHORS.map(function (q) {
            return {
                label: 'Q' + q.q + ' · ' + shortName(q),
                cell: cellFor(q, lookupDim, seg),
                question: q
            };
        });
        var usable = rows.filter(function (r) {
            return r.cell && r.cell.c && !S2Viz.isMasked(r.cell, MASK_N);
        });

        var chart = S2Viz.renderDivergingBar('#anchorBar', usable, {
            construct: 'support',
            legend: '#anchorLegend',
            labelShare: labelShareFor('anchorHolder'),
            label: 'The seven MBM support anchors — ' + segLabel()
        });
        if (!chart) {
            var legend = el('anchorLegend');
            if (legend) legend.innerHTML = '';
        }

        var note = el('anchorNote');
        if (!note) return;
        var dropped = ANCHORS.length - usable.length;
        var parts = ['Oppose is the bottom two rungs, support the top two; the ' +
            'neutral middle is drawn split either side of zero.'];
        if (seg === 'overall') {
            parts.push('Showing all ' + fmtInt(D.meta.totals.respondents) +
                ' respondents.');
        } else {
            parts.push('Showing ' + segLabel() + ' within ' +
                dimLabel(dim).toLowerCase() + '.');
        }
        if (dropped > 0) {
            parts.push(dropped + ' of ' + ANCHORS.length + ' anchors are ' +
                'suppressed for this selection (fewer than ' + MASK_N +
                ' scored answers).');
        }
        note.textContent = parts.join(' ');
    }

    // --- Redaction split (whole sample; static) ------------------------------

    function drawRedaction() {
        var canvas = ensureCanvas('redactionHolder', 'redactionBar');
        if (!canvas) return;

        var labels = [];
        var named = [];
        var redacted = [];
        var meta = [];
        var wide = (el('redactionHolder') || {}).clientWidth >= 520;

        ANCHORS.forEach(function (q) {
            var a = cellFor(q, 'redaction', 'named');
            var b = cellFor(q, 'redaction', 'redacted');
            var sa = sharesOf(q, a);
            var sb = sharesOf(q, b);
            if (!sa || !sb) return;
            labels.push(wrapWords('Q' + q.q + ' · ' + shortName(q),
                wide ? 22 : 16, wide ? 2 : 3));
            named.push(sa.mean);
            redacted.push(sb.mean);
            meta.push({ q: q, named: sa, redacted: sb, delta: sb.mean - sa.mean });
        });

        var holder = el('redactionHolder');
        if (!meta.length) {
            if (holder) {
                holder.innerHTML = '<div class="card s2-empty">The export ' +
                    'carries no redaction breakdown for the support anchors.</div>';
            }
            return;
        }

        // The numbers first: they are the point of the panel and must survive a
        // missing chart library.
        drawDeltaChips(meta);
        writeRedactionNote(meta);
        writeRedactionSrTable(meta);

        if (!window.Chart) {
            if (holder) {
                holder.innerHTML = '<div class="card s2-error" role="alert">' +
                    '<div class="s2-error-title">Chart library unavailable</div>' +
                    '<p class="s2-error-hint">Chart.js did not load, so the ' +
                    'named / redacted comparison cannot be drawn. The ' +
                    'per-anchor gaps listed below come from the same numbers.' +
                    '</p></div>';
            }
            var deadLegend = el('redactionLegend');
            if (deadLegend) deadLegend.innerHTML = '';
            return;
        }

        var chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Named',
                    data: named,
                    backgroundColor: withAlpha(RESOURCE_COLORS.hydro, 0.75),
                    borderColor: RESOURCE_COLORS.hydro,
                    borderWidth: 1,
                    borderRadius: 2
                }, {
                    label: 'Redacted',
                    data: redacted,
                    backgroundColor: withAlpha(RESOURCE_COLORS.nuclear, 0.75),
                    borderColor: RESOURCE_COLORS.nuclear,
                    borderWidth: 1,
                    borderRadius: 2
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                animation: (window.matchMedia &&
                    window.matchMedia('(prefers-reduced-motion: reduce)').matches)
                    ? false : undefined,
                scales: {
                    x: {
                        min: 1,
                        max: 5,
                        ticks: { stepSize: 1 },
                        title: {
                            display: true,
                            text: 'mean score (1 = does not support, 5 = strongly supports)'
                        }
                    },
                    y: { ticks: { autoSkip: false } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: function (items) {
                                var m = meta[items[0].dataIndex];
                                return 'Q' + m.q.q + ' ' + m.q.label;
                            },
                            label: function (ctx) {
                                var m = meta[ctx.dataIndex];
                                var s = ctx.datasetIndex === 0 ? m.named : m.redacted;
                                return ctx.dataset.label + ': mean ' +
                                    s.mean.toFixed(2) + ' (n=' + s.n + ' scored)';
                            },
                            afterBody: function (items) {
                                var m = meta[items[0].dataIndex];
                                return 'redacted − named = ' +
                                    (m.delta >= 0 ? '+' : '−') +
                                    Math.abs(m.delta).toFixed(2);
                            }
                        }
                    }
                }
            }
        });

        if (window.buildLegendFromChart) {
            buildLegendFromChart(el('redactionLegend'), chart);
        }
    }

    // sr-only equivalent of the redaction chart.
    function writeRedactionSrTable(meta) {
        var srHost = el('redactionSr');
        if (!srHost) {
            srHost = document.createElement('div');
            srHost.id = 'redactionSr';
            var noteNode = el('redactionNote');
            if (noteNode && noteNode.parentNode) {
                noteNode.parentNode.insertBefore(srHost, noteNode);
            }
        }
        S2Viz.srTable(srHost, {
            caption: 'Mean support per anchor, named versus redacted respondents',
            head: ['Question', 'Named mean', 'Named n', 'Redacted mean',
                   'Redacted n', 'Redacted minus named'],
            rows: meta.map(function (m) {
                return ['Q' + m.q.q + ' ' + m.q.label,
                        m.named.mean.toFixed(2), String(m.named.n),
                        m.redacted.mean.toFixed(2), String(m.redacted.n),
                        (m.delta >= 0 ? '+' : '−') +
                            Math.abs(m.delta).toFixed(2)];
            })
        });
    }

    function drawDeltaChips(meta) {
        var host = el('redactionDeltas');
        if (!host) return;
        host.innerHTML = meta.map(function (m) {
            var up = m.delta > 0;
            var side = up ? 'redacted' : 'named';
            var cls = up ? 'hm-tag-redacted' : 'hm-tag-named';
            return '<li class="hm-delta">' +
                '<span class="hm-delta-q">Q' + m.q.q + '</span>' +
                '<span class="s2-tag ' + cls + '">' + side + ' +' +
                Math.abs(m.delta).toFixed(2) + '</span>' +
                (up ? '<span class="s2-tag s2-tag-bloc">reversal</span>' : '') +
                '</li>';
        }).join('');
    }

    function writeRedactionNote(meta) {
        var note = el('redactionNote');
        if (!note) return;
        var flips = meta.filter(function (m) { return m.delta > 0; });
        var lead = 'Each chip names the side with the higher mean and by how ' +
            'much. Named respondents are more supportive on ' +
            (meta.length - flips.length) + ' of ' + meta.length + ' anchors';
        if (flips.length === 1) {
            lead += '; Q' + flips[0].q.q + ' is the only reversal (redacted ' +
                flips[0].redacted.mean.toFixed(2) + ' against named ' +
                flips[0].named.mean.toFixed(2) + ')';
        } else if (flips.length) {
            lead += '; ' + flips.length + ' anchors run the other way';
        }
        note.textContent = lead + '. A headline built only on attributable ' +
            'submissions therefore skews supportive. The export carries one ' +
            'dimension at a time, so this split is whole-sample — it is not ' +
            'crossed with the segment chosen above.';
    }

    // --- Static copy fed from the data --------------------------------------

    function fillStats() {
        var totals = D.meta.totals || {};
        text('statRows', String(ROWS.length));
        var constructs = {};
        ROWS.forEach(function (r) { constructs[r.construct] = true; });
        text('statConstructs', String(Object.keys(constructs).length));
        text('statDims', String(S2Segments.dims().length));
        text('statRespondents', fmtInt(totals.respondents || 0));
        text('statRedacted', totals.respondents
            ? fmtPct((totals.redacted || 0) / totals.respondents, 1)
            : '—');
    }

    function fillInsights() {
        [71, 83, 153, 171].forEach(function (n) {
            var q = rowByQ(n);
            var s = q ? sharesOf(q, cellFor(q, 'overall')) : null;
            text('insQ' + n + 'pct', s ? fmtPct(s.hi) : 'n/a');
            if (n === 71) {
                text('insQ71opp', s ? fmtPct(s.lo) : 'n/a');
                text('insQ71mean', s ? s.mean.toFixed(2) : 'n/a');
            }
        });
        text('insBurden', burdenPhrase());
    }

    // Built from whatever burden/cost rows the export carries, so the sentence
    // stays true (and grammatical) on the fixtures as well as the real data.
    function burdenPhrase() {
        var rows = ROWS.filter(function (r) { return RELATIVE[r.construct]; })
            .map(function (r) {
                var s = sharesOf(r, cellFor(r, 'overall'));
                return s ? { row: r, shares: s } : null;
            })
            .filter(Boolean);
        if (!rows.length) return 'no burden or cost rows are in this export';

        rows.sort(function (a, b) { return b.shares.mean - a.shares.mean; });
        var mean = rows.reduce(function (total, x) {
            return total + x.shares.mean;
        }, 0) / rows.length;
        var top = rows[0];

        return 'the ' + rows.length + ' burden and cost rows average ' +
            mean.toFixed(2) + ' on their own scales, topping out at ' +
            top.shares.mean.toFixed(2) + ' on “' + top.row.label + '” (Q' +
            top.row.q + '), where ' + fmtPct(top.shares.hi) + ' of the ' +
            fmtInt(top.shares.n) + ' answers sit at 4–5';
    }

    // --- Boot ---------------------------------------------------------------

    function redraw() {
        drawHeatmap();
        drawAnchors();
    }

    function start() {
        S2Data.loadAll(FILES).then(function (loaded) {
            D = loaded;

            ROWS = buildRows(D.meta);
            CELLS = normaliseCells(D.likert, ROWS);
            ORDINAL = ROWS.filter(function (r) { return r.construct === 'ordinal'; });

            var support = ROWS.filter(function (r) { return r.construct === 'support'; });
            ANCHORS = support.slice().sort(function (a, b) { return a.q - b.q; });

            S2Segments.init(D.meta);
            buildControls();

            S2Segments.on(function (ev) {
                if (ev.detail && ev.detail.param === 'dim') {
                    // A new dimension means a new value list. Drop a stale value
                    // silently: the redraw below picks up the corrected state.
                    if (currentSeg() === 'overall' &&
                        S2Segments.get('seg', 'overall') !== 'overall') {
                        S2Segments.set('seg', null, { silent: true });
                    }
                    buildSegSelect();
                }
                redraw();
            });

            fillStats();
            fillInsights();
            redraw();
            drawRedaction();
        }).catch(function (err) {
            S2Data.errorPanel('heatmap', err, {
                title: 'The scale data could not be loaded'
            });
            if (window.console && console.error) console.error(err);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
