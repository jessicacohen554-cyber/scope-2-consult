// ============================================================================
// S2Respondents - page module for respondents.html ("Who Responded")
// ============================================================================
// Site-specific module (not an upstream design-system file).
//
// Reads `respondents.json` + `meta.json` (PLAN §5) and renders:
//   - org type × redaction and sector × redaction stacked bars
//   - country and engagement-band bars (delegated to S2Viz.renderOptionBars)
//   - individual vs organization split
//   - the redaction-effect mini heatmap over the seven support anchors
//   - the named-organization browser (S2OrgTable) with a progressive
//     enhancement that makes each free-text answer collapsible and marks
//     answers that hit the survey's 4,000-character cap
//
// COLOR CONTRACT (dataviz method, design-system parameters):
//   named    = SEMANTIC_COLORS.muted    — deliberately recessive gray
//   redacted = RESOURCE_COLORS.nuclear  — the focus series, valence-free indigo
//   totals   = RESOURCE_COLORS.hydro    — single-series magnitude panels
// Redaction is the story on this page, so it carries the only saturated hue in
// the two-series panels ("highlight one, gray the rest"). Indigo rather than
// red/amber on purpose: withholding a name is not misconduct.
//
// Anchor means use the same diverging red→green support ramp as heatmap.html,
// read from the design tokens at runtime — no hex literal appears in this file.
// ============================================================================

(function() {
    'use strict';

    var ANCHORS = [71, 83, 97, 113, 124, 153, 171];

    // Free text was captured with a 4,000-character cap: an answer that lands
    // exactly on it is almost certainly cut off (8 such answers in the survey).
    var FT_CAP = 4000;
    // Longer than this and the disclosure starts closed.
    var FT_COLLAPSE = 420;

    // --- small helpers -------------------------------------------------------
    function esc(s) {
        if (window.S2Data) return S2Data.escapeHtml(s);
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

    function token(name) {
        try {
            return getComputedStyle(document.documentElement)
                .getPropertyValue(name).trim();
        } catch (err) {
            return '';
        }
    }

    function pct(a, b) {
        return b ? Math.round(1000 * a / b) / 10 : 0;
    }

    // Always one decimal, so a column of shares reads as a column ("20.0%",
    // never "20%" beside "69.7%").
    function pctText(a, b) {
        return pct(a, b).toFixed(1) + '%';
    }

    function fmt(n) {
        return Number(n).toLocaleString('en-US');
    }

    function reducedMotion() {
        return window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function palette() {
        var S = window.SEMANTIC_COLORS || {};
        var R = window.RESOURCE_COLORS || {};
        return { named: S.muted, redacted: R.nuclear, total: R.hydro };
    }

    // --- color math (tokens in, rgb out — used by the mini heatmap) ----------
    function parseColor(str) {
        str = String(str || '').trim();
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
        m = /^rgba?\(([^)]+)\)$/i.exec(str);
        if (m) {
            var parts = m[1].split(',').map(function(p) { return parseFloat(p); });
            return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
        }
        return null;
    }

    function composite(fg, bg, alpha) {
        return [0, 1, 2].map(function(i) {
            return Math.round(fg[i] * alpha + bg[i] * (1 - alpha));
        });
    }

    // Flat tint of a design token over the card surface. `t` is 0…1.
    function tintStyle(tokenName, t) {
        var fg = parseColor(token(tokenName));
        var bg = parseColor(token('--bg-card')) || [255, 255, 255];
        if (!fg) return '';
        var rgb = composite(fg, bg, Math.max(0, Math.min(0.82, t)));
        return 'background:rgb(' + rgb.join(',') + ');';
    }

    // --- axis label wrapping (Chart.js does not wrap category labels) --------
    // At most two lines; anything that still does not fit is elided rather than
    // silently dropped, and the untruncated text stays in the tooltip and the
    // sr-only table.
    function wrap(text, budget) {
        text = String(text === null || text === undefined ? '' : text).trim();
        if (text.length <= budget) return text;
        // A slash is a break opportunity but stays on the line it ends, so
        // "Energy supplier/utility" wraps without losing the slash.
        var words = text.replace(/\//g, '/ ').split(/\s+/).filter(Boolean);
        var lines = [], cur = '', i;
        for (i = 0; i < words.length; i++) {
            // Re-join without a space where the split was on a slash.
            var glue = /\/$/.test(cur) ? '' : ' ';
            var next = cur ? cur + glue + words[i] : words[i];
            if (next.length <= budget || !cur) {
                cur = next;
            } else if (lines.length < 1) {
                lines.push(cur);
                cur = words[i];
            } else {
                break;
            }
        }
        if (cur) lines.push(cur);
        if (i < words.length) {
            var last = lines[lines.length - 1];
            lines[lines.length - 1] = last.length + 1 > budget
                ? last.slice(0, Math.max(1, budget - 1)) + '…'
                : last + '…';
        }
        return lines.length === 1 ? lines[0] : lines;
    }

    // Budget characters against the *container*, not the canvas: on first draw
    // Chart.js has not sized the canvas yet, so canvas.clientWidth is still the
    // 300px HTML default and every label would wrap.
    function wrapAll(canvas, texts, share) {
        var host = canvas.parentNode;
        var width = (host && host.clientWidth) || canvas.clientWidth || 520;
        var budget = Math.max(11, Math.floor(width * (share || 0.3) / 6.4));
        return texts.map(function(t) { return wrap(t, budget); });
    }

    // A distribution row carries its base size as `total` in the real export and
    // as `n` in the hand-authored fixtures; either is accepted, and a row with no
    // redaction split at all (some fixture rows) is dropped rather than drawn as
    // an empty bar.
    function splitRows(rows) {
        return (rows || []).map(function(r) {
            if (!r) return null;
            var named = typeof r.named === 'number' ? r.named : null;
            var redacted = typeof r.redacted === 'number' ? r.redacted : null;
            if (named === null && redacted === null) return null;
            var total = typeof r.total === 'number' ? r.total
                : (typeof r.n === 'number' ? r.n : (named || 0) + (redacted || 0));
            if (!total) return null;
            return {
                key: r.key,
                label: r.label || r.key,
                named: named === null ? total - redacted : named,
                redacted: redacted === null ? total - named : redacted,
                total: total
            };
        }).filter(Boolean);
    }

    // ========================================================================
    // Stacked named/redacted bars
    // ========================================================================
    // rows: [{key, label, named, redacted, total}] — respondents.json
    // opts: {mode:'share'|'count', srTarget, legend, srCaption, dimLabel}
    function stackedRedaction(target, rows, opts) {
        var canvas = node(target);
        if (!canvas) return null;
        opts = opts || {};
        rows = splitRows(rows);

        var host = canvas.parentNode;
        if (!window.Chart) {
            if (host) {
                host.innerHTML = '<div class="card s2-empty">Chart.js did not ' +
                    'load, so this stacked bar cannot be drawn.</div>';
            }
            return null;
        }
        if (!rows.length) {
            if (host) {
                host.innerHTML = '<div class="card s2-empty">' +
                    'No segments to chart.</div>';
            }
            return null;
        }

        var prev = Chart.getChart(canvas);
        if (prev) prev.destroy();

        var mode = opts.mode === 'count' ? 'count' : 'share';
        var pal = palette();
        var withA = window.withAlpha || function(c) { return c; };
        var surface = token('--bg-card') || '';

        var namedVals = rows.map(function(r) {
            return mode === 'share' ? pct(r.named, r.total) : r.named;
        });
        var redVals = rows.map(function(r) {
            return mode === 'share' ? pct(r.redacted, r.total) : r.redacted;
        });

        // 2px surface gap between the two segments (dataviz mark spec), and the
        // outer end of the bar is the only rounded end.
        function ds(label, data, color, gapSide) {
            var border = {};
            border[gapSide] = 2;
            return {
                label: label,
                data: data,
                backgroundColor: withA(color, 0.82),
                borderColor: surface,
                borderWidth: border,
                borderSkipped: false,
                borderRadius: gapSide === 'left'
                    ? { topRight: 4, bottomRight: 4 } : 0,
                stack: 'redaction',
                s2Color: color
            };
        }

        // Direct labels: the share redacted (or the base size) past the bar end.
        var endLabels = {
            id: 's2RedactionLabels',
            afterDatasetsDraw: function(chart) {
                var ctx = chart.ctx;
                var last = chart.getDatasetMeta(1);
                if (!last || !last.data) return;
                ctx.save();
                ctx.font = '700 11px ' +
                    (token('--font-data') || Chart.defaults.font.family);
                ctx.fillStyle = token('--text-muted') || '';
                ctx.textBaseline = 'middle';
                last.data.forEach(function(bar, i) {
                    var r = rows[i];
                    var text = mode === 'share'
                        ? pctText(r.redacted, r.total)
                        : fmt(r.total);
                    ctx.fillText(text, bar.x + 7, bar.y);
                });
                ctx.restore();
            }
        };

        var chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: wrapAll(canvas, rows.map(function(r) { return r.label; }),
                    opts.labelShare || 0.3),
                datasets: [
                    ds('Named', namedVals, pal.named, 'right'),
                    ds('Redacted', redVals, pal.redacted, 'left')
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: reducedMotion() ? false : undefined,
                indexAxis: 'y',
                layout: { padding: { right: mode === 'share' ? 46 : 56 } },
                scales: {
                    x: {
                        stacked: true,
                        beginAtZero: true,
                        max: mode === 'share' ? 100 : undefined,
                        title: {
                            display: true,
                            text: mode === 'share'
                                ? '% of respondents in this segment'
                                : 'respondents'
                        },
                        ticks: {
                            callback: function(v) {
                                return mode === 'share' ? v + '%' : fmt(v);
                            }
                        }
                    },
                    y: { stacked: true, ticks: { autoSkip: false } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: function(items) {
                                return rows[items[0].dataIndex].label;
                            },
                            label: function(ctx) {
                                var r = rows[ctx.dataIndex];
                                var n = ctx.datasetIndex === 0 ? r.named : r.redacted;
                                return ctx.dataset.label + ': ' + fmt(n) + ' of ' +
                                    fmt(r.total) + ' (' + pctText(n, r.total) + ')';
                            }
                        }
                    }
                }
            },
            plugins: [endLabels]
        });

        if (opts.legend && window.buildLegend) {
            buildLegend(node(opts.legend), [
                { label: 'Named (organization given)', color: pal.named, type: 'band' },
                { label: 'Redacted (name withheld)', color: pal.redacted, type: 'band' }
            ]);
        }

        if (opts.srTarget && window.S2Viz) {
            S2Viz.srTable(opts.srTarget, {
                caption: opts.srCaption || 'Named and redacted respondents by segment',
                head: [opts.dimLabel || 'Segment', 'Named', 'Redacted', 'Total',
                       '% redacted'],
                rows: rows.map(function(r) {
                    return [r.label, fmt(r.named), fmt(r.redacted), fmt(r.total),
                            pctText(r.redacted, r.total)];
                })
            });
        }

        return chart;
    }

    // ========================================================================
    // Redaction gradient annotation (computed, never hardcoded)
    // ========================================================================
    function gradientNote(target, rows, opts) {
        var el = node(target);
        if (!el) return;
        opts = opts || {};
        var minTotal = opts.minTotal || 20;
        var ranked = splitRows(rows).filter(function(r) {
            return r.total >= minTotal;
        }).map(function(r) {
            return { label: r.label, share: pct(r.redacted, r.total), total: r.total };
        }).sort(function(a, b) { return b.share - a.share; });
        if (!ranked.length) {
            el.innerHTML = '<p class="s2-note">No segment here reaches ' +
                minTotal + ' respondents, so there is no gradient worth ' +
                'ranking — with a handful of filings per type a single one ' +
                'moves the share by tens of points.</p>';
            return;
        }

        var top = ranked.slice(0, 3);
        var bottom = ranked.slice(-3).reverse();

        function chips(list) {
            return list.map(function(r) {
                return '<span class="rp-chip"><span class="rp-chip-val">' +
                    r.share.toFixed(1) + '%</span>' + esc(r.label) +
                    ' <span class="rp-chip-n">n=' + fmt(r.total) + '</span></span>';
            }).join('');
        }

        el.innerHTML =
            '<div class="rp-gradient">' +
            '<div class="rp-gradient-side"><span class="s2-control-label">' +
            'Most redacted</span><div class="rp-chips">' + chips(top) +
            '</div></div>' +
            '<div class="rp-gradient-side"><span class="s2-control-label">' +
            'Least redacted</span><div class="rp-chips">' + chips(bottom) +
            '</div></div></div>' +
            '<p class="s2-note">Segments with fewer than ' + minTotal +
            ' respondents are left out of this ranking — with n=2 a single ' +
            'filing swings the share by 50 points. All 15 types are in the ' +
            'chart above.</p>';
    }

    // ========================================================================
    // Redaction-effect mini heatmap (named vs redacted mean per anchor)
    // ========================================================================
    // effect: respondents.json → redaction_effect  [{q, shorthand, mean_named,
    //         mean_redacted, n_named, n_redacted}]
    // Only the seven `support` anchors are drawn: pooling constructs would put
    // burden rows (3 = same as today) under the support ramp. The other 15
    // scale rows live on heatmap.html.
    var effectUid = 0;

    function renderRedactionEffect(target, effect, meta) {
        var el = node(target);
        if (!el) return null;
        var srId = 'rp-effect-sr-' + (++effectUid);

        var byQ = {};
        (effect || []).forEach(function(r) { byQ[String(r.q)] = r; });
        var qMeta = {};
        ((meta && meta.questions) || []).forEach(function(q) {
            qMeta[String(q.q)] = q;
        });

        var rows = ANCHORS.map(function(q) { return byQ[String(q)]; })
            .filter(Boolean);
        if (!rows.length) {
            el.innerHTML = '<div class="card s2-empty">' +
                'No redaction-effect rows for the support anchors.</div>';
            return null;
        }

        // Diverging ramp around the neutral middle of the 1–5 support scale.
        function meanCell(mean) {
            var t = Math.abs(mean - 3) / 2;                 // 0 at neutral, 1 at either end
            var tokenName = mean >= 3 ? '--green-text' : '--red-text';
            return tintStyle(tokenName, 0.12 + 0.62 * t);
        }

        var html = '<div class="s2-heatmap-wrap"><div class="s2-heatmap rp-hm" ' +
            'style="--s2-cols:3" aria-hidden="true">' +
            '<div class="s2-hm-row">' +
            '<div class="s2-hm-corner"><span>Support anchor</span></div>' +
            '<div class="s2-hm-colhead"><span class="s2-hm-colname">Named</span>' +
            '<span class="s2-base-chip">mean of 1–5</span></div>' +
            '<div class="s2-hm-colhead"><span class="s2-hm-colname">Redacted</span>' +
            '<span class="s2-base-chip">mean of 1–5</span></div>' +
            '<div class="s2-hm-colhead"><span class="s2-hm-colname">Shift</span>' +
            '<span class="s2-base-chip">redacted − named</span></div>' +
            '</div>';

        rows.forEach(function(r) {
            var q = qMeta[String(r.q)] || {};
            var delta = Math.round(100 * (r.mean_redacted - r.mean_named)) / 100;
            var reversal = delta > 0;
            html += '<div class="s2-hm-row">' +
                '<div class="s2-hm-rowhead"><span class="s2-hm-qnum">Q' + esc(r.q) +
                '</span><span class="s2-hm-qlabel">' +
                esc(q.label || r.shorthand || '') +
                (reversal
                    ? ' <span class="s2-tag rp-tag-reversal">reversal</span>'
                    : '') +
                '</span></div>' +
                '<div class="s2-cell" style="' + meanCell(r.mean_named) + '">' +
                '<span class="s2-cell-val">' + r.mean_named.toFixed(2) + '</span>' +
                '<span class="rp-cell-n">n=' + fmt(r.n_named) + '</span></div>' +
                '<div class="s2-cell" style="' + meanCell(r.mean_redacted) + '">' +
                '<span class="s2-cell-val">' + r.mean_redacted.toFixed(2) + '</span>' +
                '<span class="rp-cell-n">n=' + fmt(r.n_redacted) + '</span></div>' +
                '<div class="s2-cell rp-cell-delta' +
                (reversal ? ' rp-delta-up' : ' rp-delta-down') + '">' +
                '<span class="s2-cell-val">' + (delta > 0 ? '+' : '') +
                delta.toFixed(2) + '</span></div>' +
                '</div>';
        });

        html += '</div></div><div id="' + srId + '"></div>';
        el.innerHTML = html;

        if (window.S2Viz) {
            S2Viz.srTable('#' + srId, {
                caption: 'Mean support (1 = does not support, 5 = strongly ' +
                    'supports) on each anchor, named versus redacted respondents',
                head: ['Anchor', 'Named mean', 'Named n', 'Redacted mean',
                       'Redacted n', 'Shift'],
                rows: rows.map(function(r) {
                    var q = qMeta[String(r.q)] || {};
                    var delta = r.mean_redacted - r.mean_named;
                    return ['Q' + r.q + ' ' + (q.label || r.shorthand || ''),
                            r.mean_named.toFixed(2), fmt(r.n_named),
                            r.mean_redacted.toFixed(2), fmt(r.n_redacted),
                            (delta > 0 ? '+' : '') + delta.toFixed(2)];
                })
            });
        }

        return rows;
    }

    // ========================================================================
    // Named-organization browser
    // ========================================================================
    // S2OrgTable owns the table; this adds a `bloc` filter dimension (labelled
    // through a cloned meta so org-table.js stays verbatim) and enhances every
    // expanded profile: free text becomes a per-question disclosure and answers
    // sitting on the 4,000-character cap get a truncation marker.
    function blocMeta(meta, rows) {
        var seen = {}, values = [];
        (rows || []).forEach(function(r) {
            if (r.bloc && !seen[r.bloc]) { seen[r.bloc] = true; values.push(r.bloc); }
        });
        values.sort();

        var segments = {};
        Object.keys((meta && meta.segments) || {}).forEach(function(k) {
            segments[k] = meta.segments[k];
        });
        segments.bloc = {
            label: 'Coordinated bloc',
            values: values.map(function(v) {
                return {
                    key: v,
                    label: v.replace(/_/g, ' ').replace(/\b([a-z])/g, function(m, c) {
                        return c.toUpperCase();
                    })
                };
            })
        };

        var clone = {};
        Object.keys(meta || {}).forEach(function(k) { clone[k] = meta[k]; });
        clone.segments = segments;
        return clone;
    }

    // Turn one `.s2-answer-text` span into a collapsible disclosure.
    function enhanceAnswerText(span) {
        span.setAttribute('data-s2-ft', '1');
        var text = span.textContent || '';
        var len = text.length;
        var truncated = len >= FT_CAP;
        var body = span.parentNode;
        if (!body) return;

        var details = document.createElement('details');
        details.className = 'rp-ft';
        if (len <= FT_COLLAPSE) details.open = true;

        var summary = document.createElement('summary');
        summary.className = 'rp-ft-summary';
        summary.innerHTML = '<span class="rp-ft-label">Free text — ' +
            esc(fmt(len)) + ' characters</span>' +
            (truncated
                ? '<span class="s2-tag s2-tag-template" title="This answer is ' +
                  'exactly at the survey’s 4,000-character limit, so the ' +
                  'submitted text was almost certainly cut off.">likely ' +
                  'truncated</span>'
                : '');

        var holder = document.createElement('div');
        holder.className = 'rp-ft-body';

        body.insertBefore(details, span);
        details.appendChild(summary);
        details.appendChild(holder);
        holder.appendChild(span);

        if (truncated) {
            var marker = document.createElement('p');
            marker.className = 'rp-ft-trunc';
            marker.textContent = 'Cut off at the 4,000-character limit — the ' +
                'respondent’s answer continues beyond what was recorded.';
            holder.appendChild(marker);
        }
    }

    function enhanceProfiles(root) {
        var spans = root.querySelectorAll(
            '.s2-org-detail .s2-answer-text:not([data-s2-ft])');
        for (var i = 0; i < spans.length; i++) enhanceAnswerText(spans[i]);
    }

    // A profile opens in a cell that spans the whole table, and the table is
    // wider than a phone — so without this the prose is 1,000px wide inside a
    // 290px scrollport. Publish the visible width; the stylesheet pins the
    // panel to the scrollport's left edge and sizes it to match.
    function fitDetailWidth(el) {
        var scroller = el.querySelector('.s2-table-scroll');
        if (!scroller || !scroller.clientWidth) return;
        el.style.setProperty('--rp-detail-w', scroller.clientWidth + 'px');
    }

    function renderOrgBrowser(target, rows, meta, opts) {
        var el = node(target);
        if (!el) return null;
        opts = opts || {};

        var table = S2OrgTable.render(el, rows, {
            meta: blocMeta(meta, rows),
            filters: ['org_type', 'audited_class', 'bloc', 'sector', 'country'],
            pageSize: opts.pageSize || 20,
            anchorQuestions: ANCHORS
        });

        // Profiles are lazy-loaded by org-table.js, so watch for them landing.
        if (window.MutationObserver) {
            var observer = new MutationObserver(function() {
                enhanceProfiles(el);
                fitDetailWidth(el);
            });
            observer.observe(el, { childList: true, subtree: true });
        }
        enhanceProfiles(el);
        fitDetailWidth(el);
        window.addEventListener('resize', function() { fitDetailWidth(el); });

        return table;
    }

    window.S2Respondents = {
        ANCHORS: ANCHORS,
        FT_CAP: FT_CAP,
        palette: palette,
        pct: pct,
        pctText: pctText,
        splitRows: splitRows,
        fitDetailWidth: fitDetailWidth,
        fmt: fmt,
        stackedRedaction: stackedRedaction,
        gradientNote: gradientNote,
        renderRedactionEffect: renderRedactionEffect,
        renderOrgBrowser: renderOrgBrowser,
        enhanceProfiles: enhanceProfiles
    };
})();
