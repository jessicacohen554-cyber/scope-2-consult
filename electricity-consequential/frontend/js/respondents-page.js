// ============================================================================
// ECRespondents - page module for respondents.html ("Who Responded")
// ============================================================================
// Site-specific module (not an upstream design-system file). Salvaged from the
// repo-root Scope 2 hub's js/respondents-page.js and re-cut for this survey:
// no Likert anchors, so the redaction-effect panel is a set of paired stance
// strips rather than a mean heatmap, and the attrition funnel is new — this
// consultation loses four fifths of its room between the first question and
// the last, which is the single most important thing to know before reading
// any other page.
//
// Reads `respondents.json` + `meta.json` (PLAN §5) and renders:
//   - organization type × redaction stacked bars (share/count toggle)
//   - country, sector, engagement-band and profile bars
//   - the attrition funnel over `attrition`, with computed milestones
//   - named-vs-redacted paired stance strips over `redaction_effect`,
//     delegated to ECStance.renderStrips with a synthesized `redaction` split
//   - the named-organization browser (ECOrgTable), with each free-text answer
//     turned into a disclosure and answers on the 4,000-character cap marked
//
// COLOR CONTRACT (dataviz method, design-system parameters):
//   named    = SEMANTIC_COLORS.muted    — deliberately recessive gray
//   redacted = RESOURCE_COLORS.nuclear  — the focus series, valence-free indigo
//   totals   = RESOURCE_COLORS.hydro    — single-series magnitude panels
// Redaction is the story on this page, so it carries the only saturated hue in
// the two-series panels ("highlight one, gray the rest"). Indigo rather than
// red/amber on purpose: withholding a name is not misconduct. Single-series
// panels stay one blue and use saturation, never a second hue, to pick out the
// row being talked about. No hex literal appears in this file.
//
// PRIVACY (PLAN gotcha 15). A distribution row whose count arrives as the
// `"<5"` sentinel — or as anything else non-numeric — is never charted and
// never printed. It is counted, named as suppressed, and left out of the bars.
//
// EXCLUSIONS (PLAN gotcha 4). The analytical base is 180 of 185 filings. The
// five excluded respondents are integrity.html material and never appear here,
// in any panel or any profile; this module only ever renders what the exporter
// put in respondents.json, which is already the analytical base.
// ============================================================================

(function() {
    'use strict';

    // The survey captured free text up to 4,000 characters (PLAN gotcha 11);
    // an answer landing exactly on the cap was almost certainly cut off.
    var FT_CAP = 4000;
    // Longer than this and the disclosure starts closed.
    var FT_COLLAPSE = 420;

    // The five questions PLAN §4 puts in the stance fingerprint, in the order
    // ECOrgTable draws the chips.
    var FINGERPRINT_QIDS = ['Q019', 'Q021', 'Q024', 'Q031', 'Q033'];

    // --- small helpers -------------------------------------------------------
    function esc(s) {
        if (window.ECData) return ECData.escapeHtml(s);
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
        return Number(n || 0).toLocaleString('en-US');
    }

    function sum(rows, key) {
        return (rows || []).reduce(function(a, r) {
            return a + (Number(r[key || 'n']) || 0);
        }, 0);
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

    function alpha(color, a) {
        return window.withAlpha ? withAlpha(color, a) : color;
    }

    function srTable(target, spec) {
        if (window.ECStance) return ECStance.srTable(target, spec);
        return null;
    }

    function chartMissing(canvas, what) {
        var host = canvas && canvas.parentNode;
        if (host) {
            host.innerHTML = '<div class="card ec-empty">Chart.js did not load, ' +
                'so ' + esc(what || 'this chart') + ' cannot be drawn. The ' +
                'numbers are in the data table beneath it.</div>';
        }
        return null;
    }

    // --- masked and malformed rows -------------------------------------------
    // PLAN gotcha 15: a count below the disclosure threshold arrives as the
    // string sentinel `"<5"`. It is never charted, never printed as a number,
    // and never silently dropped — the panel says how many rows it is hiding.
    function isSuppressed(v) {
        return typeof v === 'string' || v === null || v === undefined ||
            (typeof v === 'number' && !isFinite(v));
    }

    // Single-series distribution rows: [{key?, label, n, pct?}]
    function usableRows(rows) {
        var out = [], masked = [];
        (rows || []).forEach(function(r) {
            if (!r) return;
            if (isSuppressed(r.n)) { masked.push(r); return; }
            out.push({
                key: r.key || r.label,
                label: r.label || r.key || '—',
                n: Number(r.n) || 0,
                pct: typeof r.pct === 'number' ? r.pct : null
            });
        });
        return { rows: out, masked: masked };
    }

    // Two-series rows: [{key, label, named, redacted, total|n}]. The real
    // export carries `total`; the hand-authored fixtures carry `n` on some
    // shapes, and either is accepted.
    function splitRows(rows) {
        var out = [], masked = [];
        (rows || []).forEach(function(r) {
            if (!r) return;
            var named = isSuppressed(r.named) ? null : Number(r.named);
            var redacted = isSuppressed(r.redacted) ? null : Number(r.redacted);
            var total = isSuppressed(r.total)
                ? (isSuppressed(r.n) ? null : Number(r.n))
                : Number(r.total);
            if (named === null && redacted === null) { masked.push(r); return; }
            if (total === null) {
                total = (named || 0) + (redacted || 0);
            }
            if (named === null || redacted === null) {
                // One side suppressed: the other side would disclose it by
                // subtraction, so the whole row stays out of the chart.
                masked.push(r);
                return;
            }
            if (!total) { masked.push(r); return; }
            out.push({
                key: r.key || r.label,
                label: r.label || r.key || '—',
                named: named,
                redacted: redacted,
                total: total
            });
        });
        return { rows: out, masked: masked };
    }

    // One sentence naming what a panel is not showing, or '' when nothing is
    // suppressed. Never prints the suppressed values themselves.
    function maskNote(masked, noun) {
        if (!masked || !masked.length) return '';
        return masked.length + ' ' + (noun || 'row') +
            (masked.length === 1 ? '' : 's') + ' fall' +
            (masked.length === 1 ? 's' : '') + ' below the five-respondent ' +
            'disclosure threshold and ' + (masked.length === 1 ? 'is' : 'are') +
            ' suppressed rather than charted — suppressed is not zero.';
    }

    // --- axis label wrapping (Chart.js does not wrap category labels) --------
    // At most two lines; anything that still does not fit is elided rather than
    // silently dropped, and the untruncated text stays in the tooltip and the
    // .sr-only table.
    function wrap(text, budget) {
        text = String(text === null || text === undefined ? '' : text).trim();
        if (text.length <= budget) return text;
        // Break on whitespace, and additionally inside a token on a slash — a
        // slash is a break opportunity that stays on the line it ends, so
        // "Energy supplier/utility" wraps without losing it. A slash that
        // already stands alone ("Other / not applicable") is an ordinary token
        // and keeps the spaces the label was written with.
        var words = [];
        text.split(/\s+/).filter(Boolean).forEach(function(w) {
            var parts = w.split('/');
            parts.forEach(function(p, i) {
                var t = i < parts.length - 1 ? p + '/' : p;
                if (!t) return;
                words.push({ t: t, sep: i === 0 ? ' ' : '' });
            });
        });
        if (words.length) words[0].sep = '';
        var lines = [], cur = '', i;
        for (i = 0; i < words.length; i++) {
            var next = cur ? cur + words[i].sep + words[i].t : words[i].t;
            if (next.length <= budget || !cur) {
                cur = next;
            } else if (lines.length < 1) {
                lines.push(cur);
                cur = words[i].t;
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

    // Row-count-driven panel height, so a 13-row chart is not squeezed into the
    // 320px .chart-container default and a 3-row chart is not mostly whitespace.
    // The height itself is page CSS (`.rp-chart-rows`); this only publishes n.
    function sizeRows(canvas, n) {
        var host = canvas && canvas.parentNode;
        if (host && host.style) host.style.setProperty('--rp-rows', String(n));
    }

    // ========================================================================
    // Stacked named/redacted bars
    // ========================================================================
    // rows: [{key, label, named, redacted, total}] — respondents.json
    // opts: {mode:'share'|'count', srTarget, legend, srCaption, dimLabel,
    //        labelShare, noteTarget, noun}
    function stackedRedaction(target, rows, opts) {
        var canvas = node(target);
        if (!canvas) return null;
        opts = opts || {};
        var split = splitRows(rows);
        rows = split.rows;

        if (opts.noteTarget) {
            var noteEl = node(opts.noteTarget);
            if (noteEl) noteEl.textContent = maskNote(split.masked, opts.noun);
        }

        if (!window.Chart) return chartMissing(canvas, 'this stacked bar');
        if (!rows.length) {
            var host = canvas.parentNode;
            if (host) {
                host.innerHTML = '<div class="card ec-empty">No segments to ' +
                    'chart at the disclosure threshold.</div>';
            }
            return null;
        }

        sizeRows(canvas, rows.length);

        var prev = Chart.getChart(canvas);
        if (prev) prev.destroy();

        var mode = opts.mode === 'count' ? 'count' : 'share';
        var pal = palette();
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
                backgroundColor: alpha(color, 0.82),
                borderColor: surface,
                borderWidth: border,
                borderSkipped: false,
                borderRadius: gapSide === 'left'
                    ? { topRight: 4, bottomRight: 4 } : 0,
                stack: 'redaction'
            };
        }

        // Direct labels: the share redacted (or the base size) past the bar end.
        var endLabels = {
            id: 'ecRedactionLabels',
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
                    if (!r) return;
                    ctx.fillText(mode === 'share'
                        ? pctText(r.redacted, r.total)
                        : fmt(r.total), bar.x + 7, bar.y);
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

        if (opts.srTarget) {
            srTable(opts.srTarget, {
                caption: opts.srCaption ||
                    'Named and redacted respondents by segment',
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
    // Single-series horizontal bars (country, sector, engagement, profile)
    // ========================================================================
    // rows: [{key?, label, n, pct?}]
    // opts: {color, highlight (key), srTarget, srCaption, dimLabel, labelShare,
    //        base, noteTarget, noun, valueLabel}
    function simpleBars(target, rows, opts) {
        var canvas = node(target);
        if (!canvas) return null;
        opts = opts || {};
        var split = usableRows(rows);
        rows = split.rows;

        if (opts.noteTarget) {
            var noteEl = node(opts.noteTarget);
            if (noteEl) noteEl.textContent = maskNote(split.masked, opts.noun);
        }

        if (!window.Chart) return chartMissing(canvas, 'this bar chart');
        if (!rows.length) {
            var host = canvas.parentNode;
            if (host) {
                host.innerHTML = '<div class="card ec-empty">No rows to chart ' +
                    'at the disclosure threshold.</div>';
            }
            return null;
        }

        sizeRows(canvas, rows.length);

        var prev = Chart.getChart(canvas);
        if (prev) prev.destroy();

        var base = opts.base || sum(rows);
        var color = opts.color || palette().total;
        var hi = opts.highlight;
        // One hue, two saturations: the highlighted row is the point of the
        // panel, the rest are context. A second hue would imply a second
        // meaning that the data does not carry.
        var fills = rows.map(function(r) {
            return alpha(color, hi && r.key === hi ? 0.88 : 0.34);
        });
        var shareOf = function(r) {
            return r.pct === null ? pct(r.n, base) : r.pct;
        };

        var endLabels = {
            id: 'ecSimpleBarLabels',
            afterDatasetsDraw: function(chart) {
                var ctx = chart.ctx;
                var meta = chart.getDatasetMeta(0);
                if (!meta || !meta.data) return;
                ctx.save();
                ctx.font = '700 11px ' +
                    (token('--font-data') || Chart.defaults.font.family);
                ctx.fillStyle = token('--text-muted') || '';
                ctx.textBaseline = 'middle';
                meta.data.forEach(function(bar, i) {
                    var r = rows[i];
                    if (!r) return;
                    ctx.fillText(fmt(r.n) + ' · ' + shareOf(r).toFixed(1) + '%',
                                 bar.x + 7, bar.y);
                });
                ctx.restore();
            }
        };

        var chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: wrapAll(canvas, rows.map(function(r) { return r.label; }),
                    opts.labelShare || 0.32),
                datasets: [{
                    label: opts.valueLabel || 'Respondents',
                    data: rows.map(function(r) { return r.n; }),
                    backgroundColor: fills,
                    borderRadius: { topRight: 4, bottomRight: 4 },
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: reducedMotion() ? false : undefined,
                indexAxis: 'y',
                layout: { padding: { right: 74 } },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'respondents (of ' + fmt(base) + ')'
                        },
                        ticks: { callback: function(v) { return fmt(v); } }
                    },
                    y: { ticks: { autoSkip: false } }
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
                                return fmt(r.n) + ' of ' + fmt(base) + ' (' +
                                    shareOf(r).toFixed(1) + '%)';
                            }
                        }
                    }
                }
            },
            plugins: [endLabels]
        });

        if (opts.srTarget) {
            srTable(opts.srTarget, {
                caption: opts.srCaption || 'Respondents by segment',
                head: [opts.dimLabel || 'Segment', 'Respondents',
                       '% of ' + fmt(base)],
                rows: rows.map(function(r) {
                    return [r.label, fmt(r.n), shareOf(r).toFixed(1) + '%'];
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
        var minTotal = opts.minTotal || 10;
        var split = splitRows(rows);
        var ranked = split.rows.filter(function(r) {
            return r.total >= minTotal;
        }).map(function(r) {
            return { label: r.label, share: pct(r.redacted, r.total), total: r.total };
        }).sort(function(a, b) { return b.share - a.share; });

        if (ranked.length < 2) {
            el.innerHTML = '<p class="ec-note">Fewer than two organization ' +
                'types reach ' + minTotal + ' respondents, so there is no ' +
                'gradient worth ranking — with a handful of filings per type a ' +
                'single one moves the share by tens of points.</p>';
            return;
        }

        var take = Math.min(3, Math.floor(ranked.length / 2));
        var top = ranked.slice(0, take);
        var bottom = ranked.slice(-take).reverse();

        function chips(list) {
            return list.map(function(r) {
                return '<span class="rp-chip"><span class="rp-chip-val">' +
                    r.share.toFixed(1) + '%</span>' + esc(r.label) +
                    ' <span class="rp-chip-n">n=' + fmt(r.total) + '</span></span>';
            }).join('');
        }

        var spread = ranked[0].share - ranked[ranked.length - 1].share;

        el.innerHTML =
            '<div class="rp-gradient">' +
            '<div class="rp-gradient-side"><span class="ec-control-label">' +
            'Most redacted</span><div class="rp-chips">' + chips(top) +
            '</div></div>' +
            '<div class="rp-gradient-side"><span class="ec-control-label">' +
            'Least redacted</span><div class="rp-chips">' + chips(bottom) +
            '</div></div></div>' +
            '<p class="ec-note">' + spread.toFixed(1) + ' percentage points ' +
            'separate the most and least redacted type among those with at ' +
            'least ' + minTotal + ' respondents. Smaller types are left out of ' +
            'this ranking — at n=2 a single filing swings the share by 50 ' +
            'points — but they are all in the chart above.</p>';
    }

    // PLAN §4 asks this panel for every self-declared organization type, with
    // the coarse five-value vocabulary reserved for the segment toggles. An
    // export may supply either. Say which one is actually on screen rather
    // than claiming the other — the difference matters, because the coarse
    // grouping hides the tail types inside "Other".
    function orgTypeScopeNote(rows, meta) {
        var segs = ((meta && meta.segments) || {}).org_type_5 || {};
        var segKeys = (segs.values || []).map(function(v) { return v.key; });
        var rowKeys = (rows || []).map(function(r) { return r && r.key; })
            .filter(Boolean);
        if (!segKeys.length || !rowKeys.length) return '';

        var coarse = rowKeys.length === segKeys.length &&
            rowKeys.every(function(k) { return segKeys.indexOf(k) >= 0; });
        if (!coarse) {
            var tail = null;
            (rows || []).forEach(function(r) {
                if (r && r.key === 'tail') tail = r;
            });
            var own = rowKeys.length - (tail ? 1 : 0);
            return own + ' self-declared organization types are charted on ' +
                'their own row' + (tail
                    ? ', and the types with fewer than five respondents are ' +
                      'grouped into one row of ' + fmt(tail.total) +
                      ' rather than published individually.'
                    : '.');
        }
        var bucket = 'Other';
        (segs.values || []).forEach(function(v) {
            if (v.key === 'other') bucket = v.label || bucket;
        });
        return 'This export supplies the coarse ' + segKeys.length +
            '-value organization vocabulary rather than one row per ' +
            'self-declared type, so the smaller types are pooled inside ' +
            '“' + bucket + '” instead of appearing on their own row.';
    }

    // One computed sentence describing the same gradient, for prose that must
    // not assert a pattern this consultation's data may not carry.
    function gradientSummary(rows, opts) {
        opts = opts || {};
        var minTotal = opts.minTotal || 10;
        var ranked = splitRows(rows).rows.filter(function(r) {
            return r.total >= minTotal;
        }).map(function(r) {
            return {
                label: r.label,
                share: pct(r.redacted, r.total),
                total: r.total
            };
        }).sort(function(a, b) { return b.share - a.share; });

        if (ranked.length < 2) {
            return 'Too few organization types reach ' + minTotal +
                ' respondents for a gradient to be worth reading here.';
        }
        var hi = ranked[0], lo = ranked[ranked.length - 1];
        var spread = hi.share - lo.share;
        if (spread < 10) {
            return 'Redaction runs close to flat across the larger ' +
                'organization types, from ' + hi.share.toFixed(1) + '% in ' +
                hi.label + ' (n=' + fmt(hi.total) + ') down to ' +
                lo.share.toFixed(1) + '% in ' + lo.label + ' (n=' +
                fmt(lo.total) + ').';
        }
        return 'Among the types with at least ' + minTotal + ' respondents, ' +
            hi.label + ' withholds a name most often (' + hi.share.toFixed(1) +
            '% of ' + fmt(hi.total) + ') and ' + lo.label + ' least often (' +
            lo.share.toFixed(1) + '% of ' + fmt(lo.total) + ') — a spread of ' +
            spread.toFixed(1) + ' percentage points.';
    }

    // ========================================================================
    // Attrition funnel
    // ========================================================================
    // rows : respondents.json `attrition` — [{qid, display, n}] in survey order.
    // The strip itself is the shared ECStance renderer; what is added here is
    // the funnel reading: where the room emptied, and by how much.
    function renderAttritionFunnel(target, rows, opts) {
        var el = node(target);
        if (!el) return null;
        opts = opts || {};
        rows = (rows || []).filter(function(r) {
            return r && !isSuppressed(r.n);
        });
        if (!rows.length) {
            el.innerHTML = '<div class="card ec-empty">No attrition series in ' +
                'this export.</div>';
            return null;
        }

        var meta = opts.meta || {};
        var base = opts.base || 0;          // analytical base, from meta.totals
        var first = rows[0];
        var last = rows[rows.length - 1];
        var peak = rows.reduce(function(m, r) {
            return (r.n || 0) > (m.n || 0) ? r : m;
        }, rows[0]);

        // Biggest single step down between consecutive questions.
        var drop = null;
        for (var i = 1; i < rows.length; i++) {
            var d = (rows[i - 1].n || 0) - (rows[i].n || 0);
            if (!drop || d > drop.d) {
                drop = { d: d, from: rows[i - 1], to: rows[i] };
            }
        }

        function label(r) {
            return r.display ||
                (window.ECData ? ECData.display(meta, r.qid) : r.qid);
        }

        var stops = [];
        if (base) {
            stops.push({
                label: 'Analytical base',
                sub: 'every respondent counted on this site',
                n: base
            });
        }
        stops.push({
            label: label(peak),
            sub: 'the best-answered question in the survey',
            n: peak.n
        });
        if (drop && drop.to !== peak && drop.d > 0) {
            stops.push({
                label: label(drop.from) + ' → ' + label(drop.to),
                sub: 'the steepest single step: ' + fmt(drop.d) +
                    ' fewer respondents from one question to the next',
                n: drop.to.n
            });
        }
        stops.push({
            label: label(last),
            sub: 'the last question in the survey',
            n: last.n
        });

        var top = stops[0].n || 1;
        var swatch = window.ECStance
            ? ECStance.tint(ECStance.POLES.sequential, 0.62)
            : { bg: '' };

        var html = '<div class="rp-funnel">' + stops.map(function(s) {
            return '<div class="rp-funnel-row">' +
                '<span class="rp-funnel-label">' + esc(s.label) +
                '<span class="rp-funnel-sub">' + esc(s.sub) + '</span></span>' +
                '<span class="rp-funnel-track">' +
                '<span class="rp-funnel-bar" style="width:' +
                Math.max(2, Math.round(100 * (s.n || 0) / top)) +
                '%;background:' + swatch.bg + '"></span></span>' +
                '<span class="rp-funnel-n">' + fmt(s.n) +
                '<span class="rp-funnel-pct">' + pctText(s.n, top) +
                ' of the base</span></span>' +
                '</div>';
        }).join('') + '</div>';

        html += '<p class="ec-note">Read every panel on this site against the ' +
            'base of its own question. The survey opened to <strong>' +
            fmt(top) + '</strong> respondents and closed with <strong>' +
            fmt(last.n) + '</strong> answering ' + esc(label(last)) +
            ' — <strong>' + pctText(last.n, top) + '</strong> of the room. A ' +
            'majority on a late question is a majority of the people still ' +
            'in it, not of the consultation.</p>';

        el.innerHTML = html;

        srTable(el.querySelector('.rp-funnel-sr') || appendSlot(el), {
            caption: 'Attrition milestones, as respondent counts and as a share ' +
                'of the analytical base',
            head: ['Stage', 'Respondents', 'Share of base'],
            rows: stops.map(function(s) {
                return [s.label, fmt(s.n), pctText(s.n, top)];
            })
        });

        return { stops: stops, first: first, last: last, peak: peak, drop: drop };
    }

    function appendSlot(el) {
        var slot = document.createElement('div');
        slot.className = 'rp-funnel-sr';
        el.appendChild(slot);
        return slot;
    }

    // ========================================================================
    // Named vs redacted stance comparison
    // ========================================================================
    // effect : respondents.json `redaction_effect` —
    //          [{qid, named: SCELL, redacted: SCELL}]
    //
    // Delegated to ECStance.renderStrips by synthesizing the `redaction`
    // dimension it already knows how to draw: the overall bar is the two sides
    // summed, and the two segment rows are the sides themselves. Where either
    // side is suppressed the sum would leak it, so the combined bar is passed
    // through as suppressed rather than reconstructed from one side.
    function combine(a, b) {
        var masked = window.ECStance ? ECStance.MASK_SENTINEL : '<5';
        function bad(cell) {
            return !cell || typeof cell.n === 'string' || !cell.c;
        }
        if (bad(a) || bad(b)) return { n: masked };
        var len = Math.max(a.c.length, b.c.length);
        var c = [];
        for (var i = 0; i < len; i++) c.push((a.c[i] || 0) + (b.c[i] || 0));
        return { c: c, n: (Number(a.n) || 0) + (Number(b.n) || 0) };
    }

    function renderRedactionEffect(target, effect, opts) {
        var el = node(target);
        if (!el) return null;
        opts = opts || {};
        var meta = opts.meta || {};
        var rows = (effect || []).filter(function(r) { return r && r.qid; });
        if (!rows.length) {
            el.innerHTML = '<div class="card ec-empty">This export carries no ' +
                'named-versus-redacted split.</div>';
            return null;
        }

        var synthetic = {};
        rows.forEach(function(r) {
            synthetic[r.qid] = {
                overall: combine(r.named, r.redacted),
                by: { redaction: { named: r.named, redacted: r.redacted } }
            };
        });

        return ECStance.renderStrips(el, {
            qids: rows.map(function(r) { return r.qid; }),
            stances: synthetic,
            meta: meta,
            dim: 'redaction',
            maskN: opts.maskN === undefined ? 5 : opts.maskN,
            showSegments: true,
            showLinks: opts.showLinks !== false,
            pageBase: opts.pageBase || '',
            label: 'Named versus redacted respondents'
        });
    }

    // The direction of the split, computed rather than asserted: for each
    // question, the option whose share moves most between the two groups.
    // Everything under `hedgeAt` points is reported as indistinguishable,
    // because at these bases it is.
    function redactionShifts(effect, meta, opts) {
        opts = opts || {};
        var hedgeAt = opts.hedgeAt === undefined ? 8 : opts.hedgeAt;
        var out = [];
        (effect || []).forEach(function(r) {
            if (!r || !r.qid) return;
            var a = r.named, b = r.redacted;
            if (!a || !b || !a.c || !b.c ||
                typeof a.n === 'string' || typeof b.n === 'string') {
                out.push({ qid: r.qid, suppressed: true });
                return;
            }
            var q = (window.ECData && ECData.question(meta, r.qid)) || {};
            var options = q.options || [];
            var nA = Number(a.n) || 0, nB = Number(b.n) || 0;
            var best = null;
            for (var i = 0; i < Math.max(a.c.length, b.c.length); i++) {
                var pa = pct(a.c[i] || 0, nA);
                var pb = pct(b.c[i] || 0, nB);
                var delta = pb - pa;
                if (!best || Math.abs(delta) > Math.abs(best.delta)) {
                    best = {
                        index: i,
                        option: (options[i] || {}).label || ('option ' + (i + 1)),
                        special: !!(options[i] || {}).special,
                        namedPct: pa,
                        redactedPct: pb,
                        delta: delta
                    };
                }
            }
            if (!best) return;
            out.push({
                qid: r.qid,
                display: (window.ECData && ECData.display(meta, r.qid)) || r.qid,
                label: q.label || q.shorthand || r.qid,
                nNamed: nA,
                nRedacted: nB,
                option: best.option,
                special: best.special,
                namedPct: best.namedPct,
                redactedPct: best.redactedPct,
                delta: best.delta,
                material: Math.abs(best.delta) >= hedgeAt
            });
        });
        return out;
    }

    function renderShiftNote(target, effect, opts) {
        var el = node(target);
        if (!el) return null;
        opts = opts || {};
        var meta = opts.meta || {};
        var shifts = redactionShifts(effect, meta, opts).filter(function(s) {
            return !s.suppressed;
        });
        if (!shifts.length) {
            el.innerHTML = '';
            return null;
        }

        var material = shifts.filter(function(s) { return s.material; })
            .sort(function(a, b) { return Math.abs(b.delta) - Math.abs(a.delta); });

        var html = '<ul class="rp-shifts">' + shifts.map(function(s) {
            var dir = s.delta > 0 ? 'more' : 'less';
            return '<li class="rp-shift' + (s.material ? '' : ' rp-shift--flat') +
                '"><span class="rp-shift-q">' + esc(s.display) + '</span>' +
                '<span class="rp-shift-body">' +
                (s.material
                    ? 'Redacted respondents pick <strong>' + esc(s.option) +
                      '</strong> ' + Math.abs(s.delta).toFixed(1) + ' points ' +
                      dir + ' often'
                    : 'No option moves more than ' +
                      Math.abs(s.delta).toFixed(1) + ' points between the two ' +
                      'groups') +
                ' <span class="rp-shift-detail">(' +
                s.namedPct.toFixed(1) + '% of ' + fmt(s.nNamed) + ' named vs ' +
                s.redactedPct.toFixed(1) + '% of ' + fmt(s.nRedacted) +
                ' redacted)</span>' +
                (s.special
                    ? ' <span class="ec-tag ec-tag-special">non-substantive ' +
                      'option — never netted</span>'
                    : '') +
                '</span></li>';
        }).join('') + '</ul>';

        html += '<p class="ec-note">' +
            (material.length
                ? material.length + ' of ' + shifts.length + ' questions move ' +
                  'by at least ' + (opts.hedgeAt === undefined ? 8 : opts.hedgeAt) +
                  ' points between named and redacted respondents; the largest ' +
                  'is ' + esc(material[0].display) + ' at ' +
                  Math.abs(material[0].delta).toFixed(1) + ' points. '
                : 'No question here moves by as much as ' +
                  (opts.hedgeAt === undefined ? 8 : opts.hedgeAt) +
                  ' points between the two groups. ') +
            'Each side is a share of its own base, printed beside it. These are ' +
            'two self-selected groups compared after the fact, not a designed ' +
            'comparison: a gap of a few points is noise, a consistent direction ' +
            'across several questions is worth noticing, and neither is ' +
            'evidence about any individual respondent. Withholding a name is a ' +
            'disclosure choice, not a verdict.</p>';

        el.innerHTML = html;
        return shifts;
    }

    // ========================================================================
    // Named-organization browser
    // ========================================================================
    // ECOrgTable owns the table; this adds an entity-family filter dimension
    // (labelled through a cloned meta so org-table.js stays untouched) and
    // enhances every expanded profile: free text becomes a per-question
    // disclosure, and answers sitting on the 4,000-character cap are marked.
    function familyMeta(meta, rows) {
        var seen = {}, values = [];
        (rows || []).forEach(function(r) {
            if (r && r.family && !seen[r.family]) {
                seen[r.family] = true;
                values.push(r.family);
            }
        });
        if (!values.length) return meta;
        values.sort();

        var segments = {};
        Object.keys((meta && meta.segments) || {}).forEach(function(k) {
            segments[k] = meta.segments[k];
        });
        segments.family = {
            label: 'Entity family',
            values: values.map(function(v) {
                return {
                    key: v,
                    label: String(v).replace(/_/g, ' ')
                        .replace(/\b([a-z])/g, function(m, c) {
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

    // Turn one `.ec-answer-text` span into a collapsible disclosure.
    function enhanceAnswerText(span) {
        span.setAttribute('data-rp-ft', '1');
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
                ? '<span class="ec-tag ec-tag-template" title="This answer is ' +
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
            '.ec-org-detail .ec-answer-text:not([data-rp-ft])');
        for (var i = 0; i < spans.length; i++) enhanceAnswerText(spans[i]);
    }

    // A profile opens in a cell spanning the whole table, and the table is
    // wider than a phone — so without this the prose is 940px wide inside a
    // 290px scrollport. Publish the visible width; the stylesheet pins the
    // panel to the scrollport's left edge and sizes it to match.
    function fitDetailWidth(el) {
        var scroller = el.querySelector('.ec-table-scroll');
        if (!scroller || !scroller.clientWidth) return;
        el.style.setProperty('--rp-detail-w', scroller.clientWidth + 'px');
    }

    function renderOrgBrowser(target, rows, meta, opts) {
        var el = node(target);
        if (!el) return null;
        opts = opts || {};

        var filters = opts.filters || ['org_type', 'audited_class', 'country'];
        var withFamily = familyMeta(meta, rows);
        if (withFamily !== meta && filters.indexOf('family') < 0) {
            filters = filters.concat(['family']);
        }

        var table = ECOrgTable.render(el, rows, {
            meta: withFamily,
            filters: filters,
            pageSize: opts.pageSize || 25,
            sortKey: opts.sortKey || 'nsub',
            sortDir: opts.sortDir || 'desc'
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

    // The fingerprint chips carry no visible question labels — the order is
    // fixed and stated once, here, from meta so the wording matches the rest
    // of the site.
    function fingerprintLegend(target, meta, qids) {
        var el = node(target);
        if (!el) return;
        qids = qids || FINGERPRINT_QIDS;
        var parts = qids.map(function(qid) {
            var q = (window.ECData && ECData.question(meta, qid)) || {};
            var disp = (window.ECData && ECData.display(meta, qid)) || qid;
            return '<span class="rp-fp-key"><strong>' + esc(disp) + '</strong> ' +
                esc(q.label || q.shorthand || '') + '</span>';
        }).join('');
        el.innerHTML = '<span class="ec-control-label">Stance fingerprint, ' +
            'left to right</span><span class="rp-fp-keys">' + parts + '</span>' +
            '<p class="ec-note">Each chip is one answer, colored the way that ' +
            'question is colored everywhere else on this site: the support ramp ' +
            'where the question carries a polarity, a neutral ramp where it is ' +
            'an ordered ladder, and gray for non-substantive answers. A hatched ' +
            'chip showing only the question number means that respondent did ' +
            'not answer it. Hover any chip for the full question and answer.</p>';
    }

    window.ECRespondents = {
        FT_CAP: FT_CAP,
        FINGERPRINT_QIDS: FINGERPRINT_QIDS,
        fmt: fmt,
        pct: pct,
        pctText: pctText,
        sum: sum,
        palette: palette,
        splitRows: splitRows,
        usableRows: usableRows,
        maskNote: maskNote,
        stackedRedaction: stackedRedaction,
        simpleBars: simpleBars,
        gradientNote: gradientNote,
        gradientSummary: gradientSummary,
        orgTypeScopeNote: orgTypeScopeNote,
        renderAttritionFunnel: renderAttritionFunnel,
        renderRedactionEffect: renderRedactionEffect,
        redactionShifts: redactionShifts,
        renderShiftNote: renderShiftNote,
        renderOrgBrowser: renderOrgBrowser,
        fingerprintLegend: fingerprintLegend,
        enhanceProfiles: enhanceProfiles,
        fitDetailWidth: fitDetailWidth
    };
})();
