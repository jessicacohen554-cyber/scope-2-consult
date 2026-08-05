// ============================================================================
// ECStance - stance strips, diverging scoreboards, attrition, theme bars
// ============================================================================
// Site-specific module (not an upstream design-system file). The grid, hatch,
// popover and token-color machinery are salvaged from the repo-root hub's
// js/likert-viz.js; everything above that is new, because this survey has no
// Likert scales to heatmap.
//
//   ECStance.renderStrips(el, {qids, stances, meta, dim, ...})
//   ECStance.renderScoreboard(el, board, {meta, key, dim, ...})
//   ECStance.renderAttrition(el, rows, {meta, ...})
//   ECStance.renderThemes(el, block, {taxonomy, ...})
//   ECStance.srTable(el, {caption, head, rows})
//
// Contract shapes come from PLAN.md §5. The cell grammar is:
//   SCELL       = {"c": [counts in meta option order], "n": <sum>}
//   masked cell = {"n": "<5"}          <- n is a STRING; that is the sentinel
//   pick cell   = {"n": <int>}         <- scoreboard / feasibility segment cells
//
// STRINGENCY IS NOT SENTIMENT (PLAN gotcha 5). The support ramp (green/red) is
// used only where meta.json gives the question a `polarity` block naming the
// critical option. Ordered ladders, the additionality matrix and anything else
// get a neutral sequential ramp. Special options (PLAN gotcha 6 — "Unsure",
// "None", "All are feasible", "N/A") are always gray, are never netted, and
// never carry a support reading. Colors are read from the design tokens at
// runtime, so no hex is hardcoded anywhere in this file.
// ============================================================================

(function() {
    'use strict';

    var MASK_SENTINEL = '<5';

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

    // 1dp, ROUND_HALF_UP on the tenth — matches the exporter's rounding so a
    // client-derived percentage never disagrees with an exported one.
    function pct1(part, base) {
        if (!base) return 0;
        return Math.round((part / base) * 1000 + 1e-9) / 10;
    }

    function fmtPct(v) {
        return (Math.round(v * 10) / 10).toFixed(1) + '%';
    }

    function fmtSigned(v) {
        var r = Math.round(v * 10) / 10;
        return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toFixed(1);
    }

    // --- Token-derived color math (salvaged from likert-viz.js) --------------
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

    // Pick the token text color with the best contrast on this background.
    function pickText(bg) {
        var cands = [parseColor(token('--text-primary')) || [0, 0, 0],
                     parseColor(token('--bg-page-white')) || [255, 255, 255]];
        var best = cands[0], bestRatio = 0;
        cands.forEach(function(c) {
            var r = contrast(c, bg);
            if (r > bestRatio) { bestRatio = r; best = c; }
        });
        return rgbCss(best);
    }

    // A tinted swatch derived entirely from design tokens.
    // tint('--hydro', 0.6) -> {bg: 'rgb(...)', fg: 'rgb(...)'}
    function tint(poleToken, alpha) {
        var base = parseColor(token('--bg-card')) || [255, 255, 255];
        var pole = parseColor(token(poleToken));
        if (!pole) return { bg: rgbCss(base), fg: pickText(base) };
        var bg = mix(pole, base, Math.max(0, Math.min(1, alpha)));
        return { bg: rgbCss(bg), fg: pickText(bg) };
    }

    // --- SCELL grammar -------------------------------------------------------
    // A cell is masked when its `n` is the string sentinel PLAN gotcha 15
    // specifies. A numeric n below `maskN` is also treated as masked: the
    // exporter should never emit one for a segment, and if it ever does the
    // page must still refuse to print it.
    function isMasked(cell, maskN) {
        if (!cell) return false;
        if (typeof cell.n === 'string') return true;
        if (maskN && typeof cell.n === 'number' && cell.n > 0 && cell.n < maskN) {
            return true;
        }
        return false;
    }

    function isEmpty(cell) {
        if (!cell) return true;
        if (typeof cell.n === 'string') return false;   // masked, not empty
        var n = cell.n === undefined ? sum(cell.c) : cell.n;
        return !n;
    }

    function baseOf(cell) {
        if (!cell) return 0;
        if (typeof cell.n === 'number') return cell.n;
        return sum(cell.c);
    }

    function maskedLabel(cell, maskN) {
        if (cell && typeof cell.n === 'string') return 'n' + cell.n;
        return 'n<' + (maskN || 5);
    }

    // The softer band above the mask (contract addition C3). The exporter flags
    // these cells; the numeric fallback keeps hand-written fixtures and any
    // pre-C3 export honest. A percentage off a base this small is noise — one
    // more respondent moves it 10-20 points — so renderers print the counts and
    // leave the percentage out.
    var THIN_N = 10;

    function isThin(cell, maskN) {
        if (!cell || isMasked(cell, maskN) || isEmpty(cell)) return false;
        if (cell.thin === true) return true;
        return typeof cell.n === 'number' && cell.n < THIN_N;
    }

    // "3 of 7" rather than "42.9%".
    function fmtOf(part, base) {
        return part + ' of ' + base;
    }

    // --- Canvas degradation --------------------------------------------------
    // Chart.js is pinned from a CDN. If it fails to load for a real reader
    // there is nothing wrong with the page except that every canvas panel is
    // blank space with no explanation (P35, Q4). Every canvas call site routes
    // its miss through here so the failure reads the same everywhere and always
    // points at the sr-only table, which is plain DOM and always present.
    function chartMissing(canvas, what) {
        var el = typeof canvas === 'string'
            ? document.querySelector(canvas) : canvas;
        var host = el && el.parentNode;
        if (host) {
            host.innerHTML = '<div class="card ec-empty">Chart.js did not load, ' +
                'so ' + esc(what || 'this chart') + ' cannot be drawn. Every ' +
                'number it would show is in the data table beneath it.</div>';
        }
        return null;
    }

    // --- Option palette ------------------------------------------------------
    // Support colors only where meta declares a polarity AND the question is a
    // clean two-way (plus any number of specials). Everything else is a neutral
    // sequential ramp in option order — a granularity ladder is not an opinion.
    var SEQ_POLE = '--hydro';
    var SUPPORT_POLE = '--wind';
    var CRITICAL_POLE = '--red';
    var SPECIAL_POLE = '--text-light';

    function palette(question) {
        var opts = (question && question.options) || [];
        var criticalKey = question && question.polarity && question.polarity.critical;
        var real = [];
        opts.forEach(function(o, i) { if (!o.special) real.push(i); });
        var usePolarity = !!criticalKey && real.length === 2;

        return opts.map(function(o, i) {
            if (o.special) {
                var sp = tint(SPECIAL_POLE, 0.30);
                sp.kind = 'special';
                return sp;
            }
            if (usePolarity) {
                var isCrit = o.key === criticalKey;
                var pc = tint(isCrit ? CRITICAL_POLE : SUPPORT_POLE, 0.72);
                pc.kind = isCrit ? 'critical' : 'support';
                return pc;
            }
            var pos = real.indexOf(i);
            var span = real.length > 1 ? pos / (real.length - 1) : 0;
            var sq = tint(SEQ_POLE, 0.22 + 0.60 * span);
            sq.kind = 'sequential';
            return sq;
        });
    }

    // --- Screen-reader data table -------------------------------------------
    function srTable(target, spec) {
        var el = node(target);
        if (!el) return null;
        spec = spec || {};
        var html = '<table class="sr-only ec-sr-table">';
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

    // --- Popover (shared with ECMatrix) -------------------------------------
    var popover = null;
    var popoverOwner = null;

    function ensurePopover() {
        if (popover) return popover;
        popover = document.createElement('div');
        popover.className = 'ec-popover';
        popover.setAttribute('role', 'dialog');
        popover.setAttribute('aria-label', 'Response detail');
        popover.hidden = true;
        popover.addEventListener('click', function(ev) {
            if (ev.target.closest('[data-ec-close]')) closePopover();
        });
        document.body.appendChild(popover);

        document.addEventListener('keydown', function(ev) {
            if (ev.key === 'Escape' && !popover.hidden) closePopover();
        });
        document.addEventListener('click', function(ev) {
            if (popover.hidden) return;
            if (popover.contains(ev.target)) return;
            if (ev.target.closest('[data-ec-pop]')) return;
            closePopover();
        }, true);
        // Track the anchor rather than closing: focusing the popover can itself
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
        var owner = popoverOwner;
        popoverOwner = null;
        if (owner && owner.focus) owner.focus();
    }

    // Public: any module can raise the shared popover against any anchor.
    function openPopover(anchorEl, innerHtml) {
        var pop = ensurePopover();
        pop.innerHTML = '<button type="button" class="ec-popover-close" ' +
            'data-ec-close aria-label="Close">&times;</button>' + innerHtml;
        pop.hidden = false;
        popoverOwner = anchorEl;
        place();
        var close = pop.querySelector('.ec-popover-close');
        if (close) close.focus({ preventScroll: true });
        return pop;
    }

    // Distribution list used by both the stance popover and the matrix popover.
    function distHtml(cell, options, pal) {
        var c = cell.c || [];
        var n = baseOf(cell);
        var maxC = Math.max.apply(null, c.concat([0]));
        return '<ul class="ec-dist">' + c.map(function(v, i) {
            var o = options[i] || { label: 'Option ' + (i + 1) };
            var w = maxC ? Math.round(100 * v / maxC) : 0;
            var sw = pal[i] || { bg: 'transparent' };
            return '<li class="ec-dist-row' + (o.special ? ' ec-dist-row--special' : '') +
                '"><span class="ec-dist-label">' + esc(o.label) + '</span>' +
                '<span class="ec-dist-bar" aria-hidden="true">' +
                '<span class="ec-dist-fill" style="width:' + w + '%;background:' +
                sw.bg + '"></span></span>' +
                '<span class="ec-dist-n">' + v + '</span>' +
                '<span class="ec-dist-pct">' + fmtPct(pct1(v, n)) + '</span></li>';
        }).join('') + '</ul>';
    }

    // Segment breakdown table inside a popover.
    function segTableHtml(byDim, dimKey, options, maskN) {
        var vals = (window.ECSegments && ECSegments.values(dimKey)) || [];
        if (!vals.length) {
            vals = Object.keys(byDim || {}).map(function(k) {
                return { key: k, label: k };
            });
        }
        if (!vals.length) return '';
        var rows = vals.map(function(v) {
            var cell = (byDim || {})[v.key];
            if (!cell) {
                return '<tr><th scope="row">' + esc(v.label) +
                    '</th><td colspan="2" class="ec-seg-none">not answered</td></tr>';
            }
            if (isMasked(cell, maskN)) {
                return '<tr><th scope="row">' + esc(v.label) +
                    '</th><td colspan="2" class="ec-seg-masked">suppressed (' +
                    esc(maskedLabel(cell, maskN)) + ')</td></tr>';
            }
            var n = baseOf(cell);
            var c = cell.c || [];
            var parts = c.map(function(x, i) {
                var o = options[i] || {};
                return esc(o.label || ('opt' + (i + 1))) + ' ' + x;
            }).join(' · ');
            return '<tr><th scope="row">' + esc(v.label) + '</th><td>' +
                (parts || '—') + '</td><td class="ec-seg-n">n=' + n +
                (isThin(cell, maskN)
                    ? ' <span class="ec-thin-flag">thin</span>' : '') +
                '</td></tr>';
        }).join('');
        return '<table class="ec-seg-table"><caption>By ' +
            esc((window.ECSegments && ECSegments.dimLabel(dimKey)) || dimKey) +
            '</caption><tbody>' + rows + '</tbody></table>';
    }

    // --- Stance strips -------------------------------------------------------
    // renderStrips(el, {qids, stances, meta, dim, maskN, pageBase, label,
    //                   showLegend, showSegments, srTable})
    //   qids     : ['Q019','Q021',…] — order preserved
    //   stances  : stances.json ({"<qid>": {overall: SCELL, by: {...}}})
    //   meta     : meta.json (options, labels, polarity, page targets)
    //   dim      : 'overall' or a segment dimension key
    function renderStrips(target, opts) {
        var el = node(target);
        if (!el) return null;
        opts = opts || {};
        var meta = opts.meta || {};
        var data = opts.stances || {};
        var dimKey = opts.dim || 'overall';
        var maskN = opts.maskN === undefined ? 5 : opts.maskN;
        var pageBase = opts.pageBase || '';
        var qids = (opts.qids || Object.keys(data)).filter(function(qid) {
            return data[qid];
        });

        if (!qids.length) {
            el.innerHTML = '<div class="card ec-empty">No stance questions to show ' +
                'for this selection.</div>';
            return { el: el, qids: [] };
        }

        var srRows = [];
        var html = '<div class="ec-strips">';

        qids.forEach(function(qid) {
            var q = (window.ECData && ECData.question(meta, qid)) || { qid: qid };
            var options = q.options || [];
            var pal = palette(q);
            var entry = data[qid] || {};
            var overall = entry.overall;

            html += '<div class="ec-strip" data-qid="' + esc(qid) + '">';
            html += '<div class="ec-strip-head">' +
                '<span class="ec-strip-q">' +
                esc((window.ECData && ECData.display(meta, qid)) || qid) + '</span>' +
                '<span class="ec-strip-label">' + esc(q.label || q.shorthand || qid) +
                '</span>' +
                '<span class="ec-base-chip">n=' + baseOf(overall) + '</span>' +
                '</div>';

            html += barHtml(overall, options, pal, maskN, {
                anchorAttrs: ' data-ec-pop data-qid="' + esc(qid) +
                    '" data-seg="overall" tabindex="0" role="button"',
                aria: ariaFor(q, options, overall, 'all respondents', maskN)
            });

            if (opts.showLegend !== false) {
                html += legendHtml(options, pal, overall);
            }

            srRows.push([
                ((window.ECData && ECData.display(meta, qid)) || qid) + ' ' +
                    (q.label || ''),
                'All respondents',
                srCellText(overall, options, maskN)
            ]);

            if (dimKey !== 'overall' && opts.showSegments !== false) {
                var byDim = (entry.by || {})[dimKey] || {};
                // opts.segValues lets a caller draw a dimension that is not one
                // of the four toggle vocabularies — the paired named/redacted
                // and US/non-US comparisons on respondents.html synthesize
                // their own two-value dimension and supply its labels here.
                var vals = opts.segValues ||
                    (window.ECSegments && ECSegments.values(dimKey)) ||
                    Object.keys(byDim).map(function(k) { return { key: k, label: k }; });
                if (vals.length) {
                    html += '<div class="ec-strip-segs">';
                    vals.forEach(function(v) {
                        var cell = byDim[v.key];
                        html += '<div class="ec-strip-seg">' +
                            '<span class="ec-strip-seg-label">' + esc(v.label) +
                            '</span>' +
                            barHtml(cell, options, pal, maskN, {
                                compact: true,
                                anchorAttrs: cell && !isMasked(cell, maskN) && !isEmpty(cell)
                                    ? ' data-ec-pop data-qid="' + esc(qid) +
                                      '" data-seg="' + esc(v.key) + '" tabindex="0" ' +
                                      'role="button"'
                                    : '',
                                aria: ariaFor(q, options, cell, v.label, maskN)
                            }) + '</div>';
                        srRows.push([
                            ((window.ECData && ECData.display(meta, qid)) || qid) +
                                ' ' + (q.label || ''),
                            v.label,
                            srCellText(cell, options, maskN)
                        ]);
                    });
                    html += '</div>';
                }
            }

            if (q.page && opts.showLinks !== false) {
                html += '<a class="ec-strip-link" href="' +
                    esc(pageBase + q.page) + '">Open the ' +
                    esc(q.topic ? String(q.topic).replace(/_/g, ' ') : 'topic') +
                    ' page &rarr;</a>';
            }

            html += '</div>';
        });

        html += '</div>';
        html += '<p class="ec-note ec-note-legend"><span class="ec-swatch-hatch" ' +
            'aria-hidden="true"></span> hatched = fewer than ' + maskN +
            ' respondents answered in that segment; the split is suppressed, ' +
            'not zero. Bars marked <span class="ec-thin-flag">counts only</span> ' +
            'have between ' + maskN + ' and ' + (THIN_N - 1) + ' respondents &mdash; ' +
            'read them as counts, because one more answer would move a ' +
            'percentage by ten points or more. Gray segments are ' +
            'non-substantive options (&ldquo;Unsure&rdquo;, &ldquo;None&rdquo;, ' +
            '&ldquo;N/A&rdquo;) and are never netted.</p>';
        html += '<div class="ec-srtable-slot"></div>';
        el.innerHTML = html;
        el.classList.add('ec-strips-host');

        if (opts.srTable !== false) {
            srTable(el.querySelector('.ec-srtable-slot'), {
                caption: (opts.label || 'Stance questions') + ' — counts by ' +
                    (dimKey === 'overall' ? 'all respondents'
                        : ((window.ECSegments && ECSegments.dimLabel(dimKey)) || dimKey)),
                head: ['Question', 'Segment', 'Distribution'],
                rows: srRows
            });
        }

        wireStrips(el, { meta: meta, data: data, dimKey: dimKey, maskN: maskN,
                         pageBase: pageBase });

        return { el: el, qids: qids, dim: dimKey };
    }

    function srCellText(cell, options, maskN) {
        if (!cell || isEmpty(cell)) return 'not answered';
        if (isMasked(cell, maskN)) return 'suppressed (' + maskedLabel(cell, maskN) + ')';
        var n = baseOf(cell);
        var thin = isThin(cell, maskN);
        return (cell.c || []).map(function(v, i) {
            var o = options[i] || {};
            return (o.label || 'option ' + (i + 1)) + ' ' +
                (thin ? fmtOf(v, n) : v + ' (' + fmtPct(pct1(v, n)) + ')');
        }).join(', ') + '; n=' + n +
            (thin ? ', too few to express as percentages' : '');
    }

    function ariaFor(q, options, cell, segLabel, maskN) {
        var head = (q.label || q.qid || 'Question') + ' — ' + segLabel + ': ';
        if (!cell || isEmpty(cell)) return head + 'not answered by this segment.';
        if (isMasked(cell, maskN)) {
            return head + 'suppressed, fewer than ' + (maskN || 5) +
                ' respondents in this segment.';
        }
        return head + srCellText(cell, options, maskN) +
            '. Activate for the full breakdown.';
    }

    // One 100%-stacked horizontal bar.
    function barHtml(cell, options, pal, maskN, o) {
        o = o || {};
        var cls = 'ec-bar' + (o.compact ? ' ec-bar--compact' : '');
        if (!cell || isEmpty(cell)) {
            return '<div class="' + cls + ' ec-bar--empty" role="img" aria-label="' +
                esc(o.aria || 'Not answered') + '"><span class="ec-bar-note">' +
                'not answered</span></div>';
        }
        if (isMasked(cell, maskN)) {
            return '<div class="' + cls + ' ec-bar--masked" role="img" aria-label="' +
                esc(o.aria || 'Suppressed') + '"><span class="ec-bar-note">' +
                esc(maskedLabel(cell, maskN)) + ' · suppressed</span></div>';
        }
        var n = baseOf(cell);
        var thin = isThin(cell, maskN);
        if (thin) cls += ' ec-bar--thin';
        var segs = (cell.c || []).map(function(v, i) {
            if (!v) return '';
            var p = pct1(v, n);
            var sw = pal[i] || { bg: 'transparent', fg: 'inherit' };
            var opt = options[i] || {};
            // Widths still have to be proportional — that is what a stacked bar
            // is — but under THIN_N the *number* on offer is the count, never
            // the percentage. Contract addition C3.
            return '<span class="ec-bar-seg' +
                (opt.special ? ' ec-bar-seg--special' : '') +
                '" style="width:' + p + '%;background:' + sw.bg + ';color:' +
                sw.fg + '" title="' + esc((opt.label || '') + ' — ' +
                (thin ? fmtOf(v, n) : v + ' (' + fmtPct(p) + ')')) + '">' +
                (p >= 11 ? '<span class="ec-bar-seg-val">' + v + '</span>' : '') +
                '</span>';
        }).join('');
        return '<div class="' + cls + '" role="img" aria-label="' +
            esc(o.aria || '') + '"' + (o.anchorAttrs || '') + '>' + segs +
            '<span class="ec-bar-n" aria-hidden="true">n=' + n +
            (thin ? ' · counts only' : '') + '</span></div>';
    }

    function legendHtml(options, pal, cell) {
        var n = baseOf(cell);
        var c = (cell && cell.c) || [];
        return '<ul class="ec-strip-legend">' + options.map(function(o, i) {
            var sw = pal[i] || {};
            var v = c[i];
            return '<li class="ec-strip-legend-item' +
                (o.special ? ' ec-strip-legend-item--special' : '') + '">' +
                '<span class="ec-legend-dot" aria-hidden="true" style="background:' +
                (sw.bg || 'transparent') + '"></span>' + esc(o.label) +
                (v === undefined ? '' : ' <span class="ec-legend-n">' + v +
                    ' · ' + fmtPct(pct1(v, n)) + '</span>') +
                (o.special ? ' <span class="ec-tag ec-tag-special">not netted</span>'
                           : '') +
                '</li>';
        }).join('') + '</ul>';
    }

    // Listeners attach once per container and read the latest render context
    // off the element, so repeated renders never stack handlers.
    function wireStrips(el, ctx) {
        el.ecStripCtx = ctx;
        if (el.ecStripWired) return;
        el.ecStripWired = true;

        function activate(barEl) {
            var c = el.ecStripCtx;
            var qid = barEl.getAttribute('data-qid');
            var seg = barEl.getAttribute('data-seg');
            var entry = c.data[qid];
            if (!entry) return;
            var q = (window.ECData && ECData.question(c.meta, qid)) || { qid: qid };
            var options = q.options || [];
            var pal = palette(q);
            var cell = seg === 'overall'
                ? entry.overall
                : (((entry.by || {})[c.dimKey] || {})[seg] || null);
            if (!cell || isMasked(cell, c.maskN) || isEmpty(cell)) return;

            var segLabel = seg === 'overall'
                ? 'All respondents'
                : ((window.ECSegments && ECSegments.valueLabel(c.dimKey, seg)) || seg);

            var html = '<div class="ec-popover-kicker">' +
                esc((window.ECData && ECData.display(c.meta, qid)) || qid) +
                ' · ' + esc(segLabel) + '</div>' +
                '<div class="ec-popover-title">' + esc(q.label || qid) + '</div>' +
                distHtml(cell, options, pal) +
                '<div class="ec-popover-meta"><span><strong>n</strong> ' +
                baseOf(cell) + ' answered</span>' +
                (q.n_answered ? '<span><strong>base</strong> ' + q.n_answered +
                    ' on this question</span>' : '') +
                (q.doc_section ? '<span><strong>doc</strong> §' +
                    esc(q.doc_section) + '</span>' : '') + '</div>';

            if (c.dimKey !== 'overall') {
                html += segTableHtml((entry.by || {})[c.dimKey], c.dimKey,
                                     options, c.maskN);
            }
            if (q.page) {
                html += '<a class="ec-popover-link" href="' +
                    esc(c.pageBase + q.page) + '">Open the full panel &rarr;</a>';
            }
            openPopover(barEl, html);
        }

        el.addEventListener('click', function(ev) {
            var barEl = ev.target.closest('[data-ec-pop]');
            if (barEl && el.contains(barEl)) activate(barEl);
        });
        el.addEventListener('keydown', function(ev) {
            if (ev.key !== 'Enter' && ev.key !== ' ') return;
            var barEl = ev.target.closest('[data-ec-pop]');
            if (!barEl || !el.contains(barEl)) return;
            ev.preventDefault();
            activate(barEl);
        });
    }

    // --- Paired diverging scoreboard ----------------------------------------
    // renderScoreboard(el, board, {meta, key, dim, maskN, label, sort})
    //   board : scoreboard.json[key] — {base_app, base_not, options[], specials[]}
    //
    // PLAN gotcha 7: each side is a percentage of ITS OWN base, both bases are
    // always on screen, specials sit beside the chart and are never netted, and
    // an option absent from both lists is unknown rather than neutral.
    function renderScoreboard(target, board, opts) {
        var el = node(target);
        if (!el) return null;
        opts = opts || {};
        board = board || {};
        var meta = opts.meta || {};
        var maskN = opts.maskN === undefined ? 5 : opts.maskN;
        var dimKey = opts.dim || 'overall';
        var spec = (meta.scoreboards || {})[opts.key] || {};
        var baseApp = board.base_app !== undefined ? board.base_app : spec.base_app;
        var baseNot = board.base_not !== undefined ? board.base_not : spec.base_not;
        var rows = (board.options || []).slice();

        if (!rows.length) {
            el.innerHTML = '<div class="card ec-empty">No scoreboard options to ' +
                'show.</div>';
            return { el: el, rows: [] };
        }

        function netOf(r) {
            if (r.net_pct !== undefined && r.net_pct !== null) return r.net_pct;
            return pct1((r.app || {}).n || 0, baseApp) -
                   pct1((r.not || {}).n || 0, baseNot);
        }

        if (opts.sort !== false) {
            rows.sort(function(a, b) { return netOf(b) - netOf(a); });
        }

        var appTint = tint(SUPPORT_POLE, 0.72);
        var notTint = tint(CRITICAL_POLE, 0.72);
        var maxSide = 0;
        rows.forEach(function(r) {
            maxSide = Math.max(maxSide, pct1((r.app || {}).n || 0, baseApp),
                                        pct1((r.not || {}).n || 0, baseNot));
        });
        var scale = maxSide > 0 ? 100 / maxSide : 1;

        var html = '<div class="ec-score" role="group" aria-label="' +
            esc(opts.label || spec.label || 'Methodology scoreboard') + '">' +
            '<div class="ec-score-axis"><span class="ec-score-axis-left">' +
            'Not appropriate — % of ' + baseNot + ' who answered ' +
            esc(spec.q_not ? ECData.display(meta, spec.q_not) : 'the not-appropriate question') +
            '</span><span class="ec-score-axis-right">Appropriate — % of ' +
            baseApp + ' who answered ' +
            esc(spec.q_app ? ECData.display(meta, spec.q_app) : 'the appropriate question') +
            '</span></div>';

        var srRows = [];
        rows.forEach(function(r) {
            var appN = (r.app || {}).n || 0;
            var notN = (r.not || {}).n || 0;
            var appP = pct1(appN, baseApp);
            var notP = pct1(notN, baseNot);
            var net = netOf(r);
            html += '<div class="ec-score-row" data-ec-pop data-opt="' +
                esc(r.key) + '" tabindex="0" role="button" aria-label="' +
                esc(r.label + ': appropriate ' + appN + ' of ' + baseApp + ' (' +
                    fmtPct(appP) + '), not appropriate ' + notN + ' of ' + baseNot +
                    ' (' + fmtPct(notP) + '), net ' + fmtSigned(net) +
                    ' points. Activate for the segment split.') + '">' +
                '<span class="ec-score-label">' + esc(r.label) + '</span>' +
                '<span class="ec-score-track ec-score-track--not">' +
                '<span class="ec-score-bar" style="width:' +
                Math.min(100, notP * scale) + '%;background:' + notTint.bg + '"></span>' +
                '<span class="ec-score-val">' + notN + ' · ' + fmtPct(notP) +
                '</span></span>' +
                '<span class="ec-score-track ec-score-track--app">' +
                '<span class="ec-score-bar" style="width:' +
                Math.min(100, appP * scale) + '%;background:' + appTint.bg + '"></span>' +
                '<span class="ec-score-val">' + appN + ' · ' + fmtPct(appP) +
                '</span></span>' +
                '<span class="ec-tag ec-tag-net' +
                (net > 0 ? ' ec-tag-net--pos' : net < 0 ? ' ec-tag-net--neg' : '') +
                '">net ' + fmtSigned(net) + '</span>' +
                '</div>';
            srRows.push([r.label, appN + ' (' + fmtPct(appP) + ')',
                         notN + ' (' + fmtPct(notP) + ')', fmtSigned(net)]);
        });
        html += '</div>';

        var specials = board.specials || [];
        if (specials.length) {
            html += '<div class="ec-score-specials"><h4 class="ec-subhead">' +
                'Non-substantive answers — shown, never netted</h4><ul>' +
                specials.map(function(s) {
                    return '<li><span class="ec-tag ec-tag-special">' +
                        esc(s.side === 'not' ? 'not-appropriate list'
                                             : 'appropriate list') + '</span> ' +
                        esc(s.label) + ' <strong>' + s.n + '</strong> of ' +
                        (s.side === 'not' ? baseNot : baseApp) + '</li>';
                }).join('') + '</ul>' +
                '<p class="ec-note">A method absent from both lists is ' +
                '<em>unknown</em>, not neutral — the two questions have ' +
                'different bases (' + baseApp + ' and ' + baseNot +
                ') and neither is a referendum.</p></div>';
        }

        html += '<div class="ec-srtable-slot"></div>';
        el.innerHTML = html;
        el.classList.add('ec-score-host');

        if (opts.srTable !== false) {
            srTable(el.querySelector('.ec-srtable-slot'), {
                caption: (opts.label || spec.label || 'Scoreboard') +
                    ' — appropriate (base ' + baseApp + ') vs not appropriate (base ' +
                    baseNot + ')',
                head: ['Option', 'Appropriate', 'Not appropriate', 'Net (pts)'],
                rows: srRows
            });
        }

        wireScoreboard(el, { board: board, rows: rows, dimKey: dimKey,
                             maskN: maskN, baseApp: baseApp, baseNot: baseNot });
        return { el: el, rows: rows };
    }

    function wireScoreboard(el, ctx) {
        el.ecScoreCtx = ctx;
        if (el.ecScoreWired) return;
        el.ecScoreWired = true;

        function pickRow(key) {
            var found = null;
            (el.ecScoreCtx.rows || []).forEach(function(r) {
                if (String(r.key) === String(key)) found = r;
            });
            return found;
        }

        function sideTable(side, cellMap, base, maskN, dimKey) {
            var vals = (window.ECSegments && ECSegments.values(dimKey)) || [];
            if (!vals.length) return '';
            return '<table class="ec-seg-table"><caption>' + esc(side) +
                ' by ' + esc((window.ECSegments && ECSegments.dimLabel(dimKey)) ||
                    dimKey) + '</caption><tbody>' +
                vals.map(function(v) {
                    var c = (cellMap || {})[v.key];
                    if (!c) {
                        return '<tr><th scope="row">' + esc(v.label) +
                            '</th><td class="ec-seg-none">—</td></tr>';
                    }
                    if (isMasked(c, maskN)) {
                        return '<tr><th scope="row">' + esc(v.label) +
                            '</th><td class="ec-seg-masked">suppressed (' +
                            esc(maskedLabel(c, maskN)) + ')</td></tr>';
                    }
                    return '<tr><th scope="row">' + esc(v.label) + '</th><td>' +
                        baseOf(c) + ' picks</td></tr>';
                }).join('') + '</tbody></table>';
        }

        function activate(rowEl) {
            var c = el.ecScoreCtx;
            var r = pickRow(rowEl.getAttribute('data-opt'));
            if (!r) return;
            var appN = (r.app || {}).n || 0, notN = (r.not || {}).n || 0;
            var html = '<div class="ec-popover-kicker">Scoreboard option</div>' +
                '<div class="ec-popover-title">' + esc(r.label) + '</div>' +
                '<div class="ec-popover-meta">' +
                '<span><strong>appropriate</strong> ' + appN + ' of ' + c.baseApp +
                ' (' + fmtPct(pct1(appN, c.baseApp)) + ')</span>' +
                '<span><strong>not</strong> ' + notN + ' of ' + c.baseNot +
                ' (' + fmtPct(pct1(notN, c.baseNot)) + ')</span></div>';
            if (c.dimKey !== 'overall') {
                html += sideTable('Appropriate', (r.app || {}).by &&
                        (r.app.by[c.dimKey] || {}), c.baseApp, c.maskN, c.dimKey);
                html += sideTable('Not appropriate', (r.not || {}).by &&
                        (r.not.by[c.dimKey] || {}), c.baseNot, c.maskN, c.dimKey);
            }
            html += '<p class="ec-popover-note">Each side is a share of its own ' +
                'base. The two questions were answered by different people, so ' +
                'the net is a difference of shares, not of respondents.</p>';
            openPopover(rowEl, html);
        }

        el.addEventListener('click', function(ev) {
            var rowEl = ev.target.closest('.ec-score-row');
            if (rowEl && el.contains(rowEl)) activate(rowEl);
        });
        el.addEventListener('keydown', function(ev) {
            if (ev.key !== 'Enter' && ev.key !== ' ') return;
            var rowEl = ev.target.closest('.ec-score-row');
            if (!rowEl || !el.contains(rowEl)) return;
            ev.preventDefault();
            activate(rowEl);
        });
    }

    // --- Attrition strip -----------------------------------------------------
    // rows: respondents.json `attrition` — [{qid, display, n}] in survey order.
    function renderAttrition(target, rows, opts) {
        var el = node(target);
        if (!el) return null;
        opts = opts || {};
        rows = (rows || []).filter(Boolean);
        if (!rows.length) {
            el.innerHTML = '<div class="card ec-empty">No attrition series.</div>';
            return null;
        }
        var meta = opts.meta || {};
        var max = rows.reduce(function(m, r) { return Math.max(m, r.n || 0); }, 0) || 1;
        var first = rows[0], last = rows[rows.length - 1];
        var swatch = tint(SEQ_POLE, 0.66);

        var html = '<div class="ec-attrition" role="img" aria-label="Responses per ' +
            'question in survey order, falling from ' + (first.n || 0) + ' at ' +
            esc(first.display || first.qid) + ' to ' + (last.n || 0) + ' at ' +
            esc(last.display || last.qid) + '.">' +
            rows.map(function(r) {
                var h = Math.max(3, Math.round(100 * (r.n || 0) / max));
                var label = r.display || (window.ECData && ECData.display(meta, r.qid)) ||
                    r.qid;
                return '<span class="ec-attrition-col" title="' + esc(label) + ' — n=' +
                    (r.n || 0) + '"><span class="ec-attrition-bar" style="height:' + h +
                    '%;background:' + swatch.bg + '"></span>' +
                    '<span class="ec-attrition-tick">' + esc(label) + '</span></span>';
            }).join('') + '</div>' +
            '<p class="ec-note">Every panel on this site divides by the base of its ' +
            'own question: from <strong>' + (first.n || 0) + '</strong> at ' +
            esc(first.display || first.qid) + ' down to <strong>' + (last.n || 0) +
            '</strong> at ' + esc(last.display || last.qid) + '.</p>' +
            '<div class="ec-srtable-slot"></div>';
        el.innerHTML = html;

        if (opts.srTable !== false) {
            srTable(el.querySelector('.ec-srtable-slot'), {
                caption: 'Responses per question in survey order',
                head: ['Question', 'Responses'],
                rows: rows.map(function(r) {
                    return [String(r.display || r.qid), String(r.n || 0)];
                })
            });
        }
        return { el: el, rows: rows };
    }

    // --- Theme bars ----------------------------------------------------------
    // block : themes.json `by_question[qid]` — {n_texts, n_coded, themes:[...]}
    // opts.taxonomy : themes.json `taxonomy` (for labels, definitions, polarity)
    function renderThemes(target, block, opts) {
        var el = node(target);
        if (!el) return null;
        opts = opts || {};
        block = block || {};
        var themes = (block.themes || []).slice();
        if (!themes.length) {
            el.innerHTML = '<div class="card ec-empty">' +
                esc(opts.emptyText || 'Theme coding for this question has not landed yet.') +
                '</div>';
            return null;
        }
        var tax = {};
        (opts.taxonomy || []).forEach(function(t) { tax[t.key] = t; });
        if (opts.sort !== false) {
            themes.sort(function(a, b) { return (b.n || 0) - (a.n || 0); });
        }
        if (opts.limit) themes = themes.slice(0, opts.limit);

        var base = block.n_texts || block.n_coded || 0;
        var max = themes.reduce(function(m, t) { return Math.max(m, t.n || 0); }, 0) || 1;

        var POLARITY_POLE = {
            concern: CRITICAL_POLE,
            support: SUPPORT_POLE,
            design: '--nuclear',
            neutral: SEQ_POLE
        };

        var html = '<ul class="ec-themes">' + themes.map(function(t) {
            var def = tax[t.key] || {};
            var pole = POLARITY_POLE[def.polarity] || SEQ_POLE;
            var sw = tint(pole, 0.60);
            var dedupSw = tint(pole, 0.95);
            var share = t.share_pct !== undefined && t.share_pct !== null
                ? t.share_pct : pct1(t.n || 0, base);
            var dedup = t.n_dedup === undefined ? null : t.n_dedup;
            return '<li class="ec-theme"><span class="ec-theme-label" title="' +
                esc(def.definition || '') + '">' + esc(def.label || t.key) +
                (def.polarity ? ' <span class="ec-tag ec-tag-' +
                    esc(def.polarity) + '">' + esc(def.polarity) + '</span>' : '') +
                '</span>' +
                '<span class="ec-theme-track">' +
                '<span class="ec-theme-bar" style="width:' +
                Math.round(100 * (t.n || 0) / max) + '%;background:' + sw.bg + '"></span>' +
                (dedup !== null && dedup !== t.n
                    ? '<span class="ec-theme-bar ec-theme-bar--dedup" style="width:' +
                      Math.round(100 * dedup / max) + '%;background:' + dedupSw.bg +
                      '" title="' + dedup + ' after template-cluster dedup"></span>'
                    : '') +
                '</span>' +
                '<span class="ec-theme-n">' + (t.n || 0) +
                (dedup !== null && dedup !== t.n
                    ? ' <span class="ec-theme-dedup">(' + dedup + ' deduped)</span>'
                    : '') +
                '</span><span class="ec-theme-pct">' + fmtPct(share) + '</span></li>';
        }).join('') + '</ul>' +
            '<p class="ec-note">Shares are of the <strong>' + base +
            '</strong> free-text answers to this question' +
            (block.n_coded !== undefined
                ? ' (' + block.n_coded + ' carried at least one theme)' : '') +
            '. The inner bar is the count after collapsing template-cluster ' +
            'members to one voice.</p>' +
            '<div class="ec-srtable-slot"></div>';
        el.innerHTML = html;

        if (opts.srTable !== false) {
            srTable(el.querySelector('.ec-srtable-slot'), {
                caption: (opts.label || 'Themes') + ' — mentions out of ' +
                    base + ' free-text answers',
                head: ['Theme', 'Mentions', 'After dedup', 'Share'],
                rows: themes.map(function(t) {
                    var def = tax[t.key] || {};
                    return [def.label || t.key, String(t.n || 0),
                            t.n_dedup === undefined ? '—' : String(t.n_dedup),
                            fmtPct(t.share_pct !== undefined && t.share_pct !== null
                                ? t.share_pct : pct1(t.n || 0, base))];
                })
            });
        }
        return { el: el, themes: themes };
    }

    window.ECStance = {
        renderStrips: renderStrips,
        renderScoreboard: renderScoreboard,
        renderAttrition: renderAttrition,
        renderThemes: renderThemes,
        srTable: srTable,
        chartMissing: chartMissing,
        // shared with ECMatrix and the page modules
        openPopover: openPopover,
        closePopover: closePopover,
        distHtml: distHtml,
        segTableHtml: segTableHtml,
        palette: palette,
        tint: tint,
        token: token,
        isMasked: isMasked,
        isEmpty: isEmpty,
        isThin: isThin,
        baseOf: baseOf,
        maskedLabel: maskedLabel,
        pct1: pct1,
        fmtPct: fmtPct,
        fmtOf: fmtOf,
        fmtSigned: fmtSigned,
        MASK_SENTINEL: MASK_SENTINEL,
        THIN_N: THIN_N,
        POLES: {
            sequential: SEQ_POLE,
            support: SUPPORT_POLE,
            critical: CRITICAL_POLE,
            special: SPECIAL_POLE
        }
    };
})();
