// ============================================================================
// S2Proposal - the config-driven renderer behind frontend/proposals/*.html
// ============================================================================
// Site-specific module (not an upstream design-system file).
//
// Every proposal deep dive is the same page: nine HTML files each set a
// `PROPOSAL_CONFIG` global and load this script. The config is an ordered list
// of panel descriptors; this module resolves them against the exported data
// contract (plans/mbm-dashboard/PLAN.md §5) and renders them with the shared
// components — S2Viz for charts, S2Quotes for quote cards, S2Segments for the
// toggle state, S2Data for the fetches. It owns no styles: everything is a
// class from shared.css / site.css.
//
//   PROPOSAL_CONFIG = {
//     key: 'hourly-matching',                 // slug, used for ids/labels
//     lever: 'qc4_hourly_matching',           // policy_lever in meta.json
//     panels: [ {kind: 'stance', q: 71}, … ]  // rendered in this order
//   }
//
// Panel kinds:
//   note      {html, variant}                 prose block (insight-glass/box)
//   stance    {q}                             diverging bar + segment toggle
//                                             + named/redacted split
//   reasons   {for, against}                  canonical option bars, % answered
//   scale     {qs, drivers, title}            burden / cost / labeled scales,
//                                             with the "3 = same as today" rule
//   selects   {qs, stats, title}              design-preference distributions
//   years     {q}                             Q183 histogram + protest flag
//   evidence  {basis, html}                   Q122/Q138 basis (or a stated gap)
//   quotes    {lever, forTitle, againstTitle} curated for/against cards
//   footnote  {qs}                            base sizes for every question used
//
// Scale direction is never assumed: the construct comes from meta.json and the
// ramp family from S2Viz, so a burden row (3 = same as today, 5 = complaint)
// can never be painted or labeled as support. Percentages always carry their
// own base — response bases on this survey run from 1,072 down to 75.
// ============================================================================

(function() {
    'use strict';

    // --- Wiring --------------------------------------------------------------
    var FILES = ['meta', 'likert', 'reasons', 'selects', 'quotes', 'evidence'];
    var MASK_N = 5;     // the exporter's privacy mask (never show n<5 detail)
    var SMALL_N = 15;   // "hide small segments" threshold, as on the heatmap
    var ORG_PAGE = '../respondents.html';
    var HEATMAP_PAGE = '../heatmap.html';
    var EVIDENCE_PAGE = '../evidence.html';
    var INTEGRITY_PAGE = '../integrity.html';
    var METHOD_PAGE = '../methodology.html';

    var D = {};            // loaded contract files
    var CFG = null;        // the page's PROPOSAL_CONFIG
    var QMAP = {};         // question number -> meta.json question
    var CHARTS = {};       // canvas id -> Chart, so redraws never stack
    var SEG_DRAWS = [];    // redraws bound to the segment controls
    var REFS = {};         // every question a panel touched (drives the footnote)

    // --- Small helpers -------------------------------------------------------
    function esc(s) {
        return window.S2Data ? S2Data.escapeHtml(s)
            : String(s === null || s === undefined ? '' : s);
    }

    function el(id) {
        return document.getElementById(id);
    }

    function fmtInt(n) {
        if (n === null || n === undefined || isNaN(n)) return '—';
        return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    // Shares arrive as 0–1; every published percentage on these pages is 1dp.
    function fmtShare(x, dp) {
        if (x === null || x === undefined || isNaN(x)) return '—';
        return (x * 100).toFixed(dp === undefined ? 1 : dp) + '%';
    }

    function fmtPct(p, dp) {
        if (p === null || p === undefined || isNaN(p)) return '—';
        return Number(p).toFixed(dp === undefined ? 1 : dp) + '%';
    }

    function fmtMean(x) {
        return (x === null || x === undefined || isNaN(x)) ? '—' : Number(x).toFixed(2);
    }

    function qmeta(n) {
        return QMAP[String(n)] || null;
    }

    function ref(n) {
        if (n !== null && n !== undefined) REFS[String(n)] = true;
    }

    function qLabel(n) {
        var m = qmeta(n);
        return m && m.label ? m.label : 'Question ' + n;
    }

    function qTitle(n) {
        return 'Q' + n + ' — ' + qLabel(n);
    }

    function famFor(n) {
        var m = qmeta(n);
        return S2Viz.familyFor(m && m.construct);
    }

    function cellFor(n, dim, key) {
        var byQ = D.likert && D.likert[String(n)];
        if (!byQ) return null;
        if (!dim || dim === 'overall') return byQ.overall || null;
        var byDim = byQ[dim];
        return byDim ? (byDim[key] || null) : null;
    }

    function sharesFor(n, dim, key) {
        var c = cellFor(n, dim, key);
        if (!c || S2Viz.isMasked(c, MASK_N)) return null;
        var s = S2Viz.shares(c, famFor(n));
        if (s) s.off = c.off || 0;
        return s;
    }

    // Bars need vertical room per row; pick the shared container size that fits
    // rather than inventing a height (DESIGN_SYSTEM.md rule 1).
    function chartBox(rows) {
        if (rows <= 4) return 'chart-container-sm';
        if (rows <= 7) return 'chart-container';
        if (rows <= 10) return 'chart-container-lg';
        return 'chart-container-xl';
    }

    function destroyChart(id) {
        if (CHARTS[id]) {
            try { CHARTS[id].destroy(); } catch (e) { /* already gone */ }
            delete CHARTS[id];
        }
    }

    // A fresh canvas per draw: the chart renderers replace their host's markup
    // with an empty-state card when a selection has no data, so reusing the old
    // node would leave later redraws with nowhere to paint.
    function freshCanvas(hostId, canvasId) {
        var host = el(hostId);
        if (!host) return null;
        destroyChart(canvasId);
        host.innerHTML = '<canvas id="' + esc(canvasId) + '"></canvas>';
        return el(canvasId);
    }

    function keep(id, chart) {
        if (chart) CHARTS[id] = chart;
        return chart;
    }

    // S2Viz budgets characters for axis labels against the canvas's own width,
    // and a freshly created <canvas> still reports its intrinsic 300px until
    // Chart.js sizes it — which would truncate every label to a few words.
    // Scale the requested share by the container-to-canvas ratio so the budget
    // reflects the width the chart will actually get.
    function labelShareFor(hostId, canvas, share) {
        var host = el(hostId);
        var hostW = (host && host.clientWidth) || 480;
        var canvasW = (canvas && canvas.clientWidth) || hostW;
        if (!canvasW) return share;
        return share * (hostW / canvasW);
    }

    function setHtml(id, html) {
        var node = el(id);
        if (node) node.innerHTML = html;
    }

    function statCard(value, label, cls) {
        return '<div class="stat-card scroll-reveal">' +
            '<div class="stat-value' + (cls ? ' ' + cls : '') + '">' + esc(value) +
            '</div><div class="stat-label">' + esc(label) + '</div></div>';
    }

    function sectionOpen(id, title, subtitle, wide) {
        return '<section class="content-section' + (wide ? '-wide' : '') +
            '" id="' + esc(id) + '">' +
            '<h2 class="section-title">' + esc(title) + '</h2>' +
            (subtitle ? '<p class="section-subtitle">' + subtitle + '</p>' : '');
    }

    function sectionClose() {
        return '</section>';
    }

    function emptyCard(text) {
        return '<div class="card s2-empty">' + esc(text) + '</div>';
    }

    // --- Construct-aware wording --------------------------------------------
    // One place decides what the two ends of a scale are called, so no panel
    // can accidentally describe a cost row as "support".
    var END_WORDS = {
        support:   { lo: 'Oppose', mid: 'Neutral', hi: 'Support' },
        complaint: { lo: 'Less than today', mid: 'Same as today', hi: 'More than today' },
        magnitude: { lo: 'Low', mid: 'Middle', hi: 'High' },
        ladder:    { lo: 'Lowest rung', mid: 'Middle rungs', hi: 'Highest rung' }
    };
    var END_TINTS = {
        support:   { lo: 'text-storage', hi: 'text-wind' },
        complaint: { lo: 'text-hydro', hi: 'text-solar' },
        magnitude: { lo: 'text-muted', hi: 'text-hydro' },
        ladder:    { lo: 'text-muted', hi: 'text-nuclear' }
    };

    function endWords(fam, s) {
        var w = END_WORDS[fam.key] || END_WORDS.magnitude;
        var len = s ? s.len : 5;
        var width = s ? s.w : 2;
        function span(fromTop) {
            if (width === 1) return fromTop ? String(len) : '1';
            return fromTop ? (len - 1) + '–' + len : '1–2';
        }
        return {
            lo: w.lo + ' (' + span(false) + ')',
            mid: w.mid + (len % 2 && width > 1 ? ' (' + Math.ceil(len / 2) + ')' : ''),
            hi: w.hi + ' (' + span(true) + ')',
            plain: w
        };
    }

    function scaleNote(n) {
        var m = qmeta(n);
        if (!m) return '';
        var bits = [];
        if (m.construct) {
            var fam = S2Viz.familyFor(m.construct);
            bits.push('Scale: ' + S2Viz.groupLabel(m.construct) + ' — ' + fam.badge + '.');
        }
        if (m.anchor_low && m.anchor_high) {
            bits.push('Anchors: ' + m.anchor_low + ' → ' + m.anchor_high + '.');
        }
        var hasOff = !!(m.construct && m.off_labels && m.off_labels.length);
        if (m.scale_note) {
            // The exporter's own note ends some questions with an internal
            // restatement ("… is off-scale and left null"); the sentence below
            // says the same thing in reader's words, so drop the duplicate.
            var sentences = String(m.scale_note).match(/[^.]+\.?\s*/g) ||
                [m.scale_note];
            var kept = sentences.filter(function(sentence) {
                return !(hasOff && /off-scale/i.test(sentence));
            }).join('').replace(/\s+$/, '');
            if (kept) bits.push(kept);
        }
        if (hasOff) {
            bits.push('Off-scale: ' + m.off_labels.join(' / ') +
                ' — counted and shown, never folded into the scale.');
        }
        return bits.join(' ');
    }

    // Off-scale labels are only meaningful where the question has a scale; for
    // plain selects the exporter lists every option in `off_labels`.
    // Codebook type slugs read badly raw ("likert 1 5") in the base-size table.
    var TYPE_LABELS = {
        likert_1_5: '1–5 scale',
        scale_labeled: 'labeled 1–5 scale',
        ordinal_select: 'ordinal select',
        multi_select: 'multi-select',
        single_select: 'single select',
        numeric_year: 'written-in year',
        free_text: 'free text'
    };

    function typeLabel(t) {
        if (!t) return '—';
        return TYPE_LABELS[t] || String(t).replace(/_/g, ' ');
    }

    function offLabel(n) {
        var m = qmeta(n);
        if (!m || !m.construct) return 'Off-scale';
        return (m.off_labels && m.off_labels.length)
            ? m.off_labels.join(' / ') : 'Off-scale';
    }

    // --- Option-list helpers -------------------------------------------------
    function optionSource(n) {
        var key = String(n);
        if (D.selects && D.selects[key] && D.selects[key].options) return D.selects[key];
        if (D.reasons && D.reasons[key] && D.reasons[key].options) return D.reasons[key];
        return null;
    }

    // Ordinal questions must keep their ladder order (meta.labels), with the
    // off-scale rung ("Unsure", "Unknown") appended rather than sorted by size.
    function ladderOrder(n, options) {
        var m = qmeta(n);
        if (!m || !m.labels || !m.labels.length) return null;
        var index = {};
        m.labels.forEach(function(text, i) { index[text] = i; });
        var known = [], other = [];
        (options || []).forEach(function(o) {
            if (index[o.text] !== undefined) known.push(o); else other.push(o);
        });
        known.sort(function(a, b) { return index[a.text] - index[b.text]; });
        other.sort(function(a, b) { return (b.n || 0) - (a.n || 0); });
        return known.concat(other);
    }

    function isMulti(n) {
        var m = qmeta(n);
        return !!(m && m.type === 'multi_select');
    }

    function baseNote(n, data) {
        var bits = ['Percentages are of the ' + fmtInt(data.n_answered) +
            ' respondents who answered Q' + n + ' — never of all 1,072.'];
        if (isMulti(n)) {
            bits.push('Multi-select: respondents pick several options, so the ' +
                'shares sum to more than 100%.');
        }
        bits.push('Canonical options only — free-text write-ins are excluded.');
        return bits.join(' ');
    }

    function drawOptionChart(hostId, canvasId, srId, n, data, opts) {
        opts = opts || {};
        var canvas = freshCanvas(hostId, canvasId);
        if (!canvas) return;
        var ordered = ladderOrder(n, data.options);
        var rows = ordered || data.options;
        keep(canvasId, S2Viz.renderOptionBars(canvas, rows, {
            side: opts.side,
            color: opts.color,
            n_answered: data.n_answered,
            sort: ordered ? false : (opts.sort !== false),
            labelShare: labelShareFor(hostId, canvas, opts.labelShare || 0.42),
            // Two lines per tick: a third line makes long survey options collide
            // with their neighbours inside the shared container heights. The
            // untruncated text still reaches the tooltip and the sr-only table.
            maxLines: opts.maxLines || 2
        }));
        if (srId) {
            S2Viz.optionSrTable('#' + srId, rows, {
                caption: qTitle(n) + ' — share of the ' + fmtInt(data.n_answered) +
                    ' respondents who answered' +
                    (ordered ? ', in ladder order' : ', largest first')
            });
        }
    }

    // A titled panel around one option-bar question.
    function optionPanelHtml(pid, n, data, opts) {
        opts = opts || {};
        var rows = (data.options || []).length;
        return '<div class="chart-panel scroll-reveal">' +
            '<h3 class="chart-title">' + esc(opts.title || qTitle(n)) + '</h3>' +
            '<div class="' + chartBox(rows) + '" id="' + pid + '-box"></div>' +
            '<div id="' + pid + '-sr"></div>' +
            '<p class="s2-note">' + esc(opts.note || baseNote(n, data)) + '</p>' +
            '</div>';
    }

    // ========================================================================
    // Panel: note — page prose, rendered in a shared callout
    // ========================================================================
    function notePanel(p, pid) {
        var variant = p.variant || 'insight-glass';
        return {
            html: '<section class="content-section" id="' + pid + '">' +
                '<div class="' + esc(variant) + ' scroll-reveal">' + p.html +
                '</div></section>',
            draw: function() {}
        };
    }

    // ========================================================================
    // Panel: stance — the support anchor, by segment, plus the redaction split
    // ========================================================================
    function stancePanel(p, pid) {
        var n = p.q;
        ref(n);
        var m = qmeta(n);
        if (!m || !cellFor(n, 'overall')) {
            return {
                html: sectionOpen(pid, p.title || 'Stance',
                    'No scored answers for this question in the current export.') +
                    emptyCard('Q' + n + ' is not present in likert.json.') +
                    sectionClose(),
                draw: function() {}
            };
        }

        var fam = famFor(n);
        var subtitle = esc(qTitle(n)) + '. ' + esc(scaleNote(n));
        var html = sectionOpen(pid, p.title || 'Where respondents stand', subtitle) +
            '<div class="grid-stats" id="' + pid + '-stats"></div>' +
            '<div class="s2-controls">' +
            '<div id="' + pid + '-dim"></div>' +
            '<div id="' + pid + '-small"></div>' +
            '</div>' +
            '<div class="grid-2col">' +
            '<div class="glass-chart-panel flush scroll-reveal">' +
            '<h3 class="chart-title" id="' + pid + '-segtitle">By segment</h3>' +
            '<div class="chart-container-xl" id="' + pid + '-segbox"></div>' +
            '<div class="legend" id="' + pid + '-seglegend"></div>' +
            '<p class="s2-note" id="' + pid + '-segnote"></p>' +
            '</div>' +
            '<div class="chart-panel scroll-reveal">' +
            '<h3 class="chart-title">Attributable vs redacted</h3>' +
            '<div class="chart-container-sm" id="' + pid + '-redbox"></div>' +
            '<div id="' + pid + '-redtable"></div>' +
            '<p class="s2-note" id="' + pid + '-rednote"></p>' +
            '</div></div>' +
            '<div class="insight-glass scroll-reveal">' +
            (p.html ? p.html + ' ' : '') +
            '<a class="btn-pill" href="' + HEATMAP_PAGE + '?q=' + encodeURIComponent(n) +
            '">Open Q' + n + ' in the Likert Explorer &rarr;</a>' +
            '</div>' +
            sectionClose();

        function drawStats() {
            var s = sharesFor(n, 'overall');
            if (!s) { setHtml(pid + '-stats', emptyCard('No scored answers.')); return; }
            var w = endWords(fam, s);
            var tint = END_TINTS[fam.key] || END_TINTS.magnitude;
            var cards = statCard(fmtShare(s.lo), w.lo, tint.lo) +
                statCard(fmtShare(s.mid), w.mid, 'text-muted') +
                statCard(fmtShare(s.hi), w.hi, tint.hi) +
                statCard(fmtMean(s.mean), 'Mean (1–' + s.len + ')') +
                statCard(fmtInt(s.n), 'Scored answers');
            if (s.off) cards += statCard(fmtInt(s.off), offLabel(n), 'text-muted');
            setHtml(pid + '-stats', cards);
        }

        function segRows(dim, minN) {
            var rows = [], hidden = [];
            var overall = cellFor(n, 'overall');
            if (overall) {
                rows.push({
                    label: 'All respondents (n=' + overall.n + ')',
                    cell: overall, question: m
                });
            }
            S2Segments.values(dim).forEach(function(v) {
                var c = cellFor(n, dim, v.key);
                if (!c || S2Viz.isMasked(c, MASK_N)) {
                    hidden.push(v.label + (c && typeof c.n === 'number'
                        ? ' (n=' + c.n + ', masked)' : ' (no answers)'));
                    return;
                }
                if (minN && c.n < minN) {
                    hidden.push(v.label + ' (n=' + c.n + ')');
                    return;
                }
                rows.push({ label: v.label + ' (n=' + c.n + ')', cell: c, question: m });
            });
            return { rows: rows, hidden: hidden };
        }

        function drawSegBar() {
            var dim = S2Segments.get('dim', 'org_type');
            var minN = S2Segments.getBool('hidesmall', true) ? SMALL_N : 0;
            var dimLabel = (S2Segments.dim(dim) || {}).label || dim;
            var out = segRows(dim, minN);
            var canvas = freshCanvas(pid + '-segbox', pid + '-segchart');
            if (!canvas) return;
            setHtml(pid + '-segtitle', esc('Q' + n + ' by ' + dimLabel.toLowerCase()));
            keep(pid + '-segchart', S2Viz.renderDivergingBar(canvas, out.rows, {
                construct: m.construct,
                legend: '#' + pid + '-seglegend',
                label: 'Q' + n + ' ' + m.label + ' by ' + dimLabel,
                labelShare: labelShareFor(pid + '-segbox', canvas, 0.38)
            }));
            var note = 'Each row is that segment&rsquo;s own base (n in the label); ' +
                'shares are never compared across different bases without it.';
            if (out.hidden.length) {
                note += ' Not shown: ' + esc(out.hidden.join(', ')) +
                    ' — below the n&ge;' + minN + ' floor or under the n&lt;' +
                    MASK_N + ' privacy mask.';
            }
            setHtml(pid + '-segnote', note);
        }

        function drawRedaction() {
            var named = cellFor(n, 'redaction', 'named');
            var redacted = cellFor(n, 'redaction', 'redacted');
            var rows = [];
            if (named) rows.push({ label: 'Named (n=' + named.n + ')', cell: named, question: m });
            if (redacted) rows.push({ label: 'Redacted (n=' + redacted.n + ')', cell: redacted, question: m });
            var canvas = freshCanvas(pid + '-redbox', pid + '-redchart');
            if (!canvas) return;
            keep(pid + '-redchart', S2Viz.renderDivergingBar(canvas, rows, {
                construct: m.construct,
                label: 'Q' + n + ' by redaction',
                labelShare: labelShareFor(pid + '-redbox', canvas, 0.3),
                srTable: false
            }));

            var sn = named ? S2Viz.shares(named, fam) : null;
            var sr = redacted ? S2Viz.shares(redacted, fam) : null;
            var w = endWords(fam, sn || sr);
            var table = '<div class="s2-table-scroll"><table class="data-table">' +
                '<caption class="sr-only">Q' + n +
                ' by whether the respondent is named or redacted</caption>' +
                '<thead><tr><th scope="col">Group</th><th scope="col">n</th>' +
                '<th scope="col">' + esc(w.lo) + '</th>' +
                '<th scope="col">' + esc(w.hi) + '</th>' +
                '<th scope="col">Mean</th></tr></thead><tbody>';
            [['Named', sn], ['Redacted', sr]].forEach(function(pair) {
                var s = pair[1];
                table += '<tr><th scope="row">' + pair[0] + '</th>' +
                    '<td>' + (s ? fmtInt(s.n) : '—') + '</td>' +
                    '<td>' + (s ? fmtShare(s.lo) : '—') + '</td>' +
                    '<td>' + (s ? fmtShare(s.hi) : '—') + '</td>' +
                    '<td>' + (s ? fmtMean(s.mean) : '—') + '</td></tr>';
            });
            table += '</tbody></table></div>';
            setHtml(pid + '-redtable', table);

            var note;
            if (sn && sr) {
                var gap = sr.mean - sn.mean;
                var dir = gap > 0 ? 'higher' : 'lower';
                var word = fam.key === 'support'
                    ? (gap > 0 ? 'more supportive' : 'less supportive')
                    : 'scoring ' + dir;
                note = 'Redacted respondents are ' + word + ' than named ones by ' +
                    Math.abs(gap).toFixed(2) + ' points on the mean (' +
                    fmtMean(sr.mean) + ' vs ' + fmtMean(sn.mean) + '). ' +
                    '53.5% of all respondents redacted their identity, so a headline ' +
                    'built only on attributable answers is not the same headline.';
            } else {
                note = 'One side of the redaction split has no scored answers here.';
            }
            setHtml(pid + '-rednote', note);
        }

        return {
            html: html,
            draw: function() {
                drawStats();
                drawRedaction();
                drawSegBar();
                SEG_DRAWS.push(drawSegBar);
            },
            controls: { dim: pid + '-dim', small: pid + '-small' }
        };
    }

    // ========================================================================
    // Panel: reasons — the canonical for/against picklists
    // ========================================================================
    function reasonsPanel(p, pid) {
        var sides = [
            { key: 'for', q: p['for'], title: p.forTitle, color: null },
            { key: 'against', q: p.against, title: p.againstTitle, color: null }
        ].filter(function(s) {
            if (s.q === undefined || s.q === null) return false;
            ref(s.q);
            return !!(D.reasons && D.reasons[String(s.q)]);
        });

        if (!sides.length) {
            return {
                html: sectionOpen(pid, p.title || 'Reasons given',
                    'No canonical reason picklists are exported for this proposal.') +
                    emptyCard('reasons.json carries no entry for these questions.') +
                    sectionClose(),
                draw: function() {}
            };
        }

        // Full width, one side above the other: these option texts are survey
        // sentences, and halving the width would truncate the argument itself.
        var html = sectionOpen(pid, p.title || 'Why — the reasons respondents picked',
            p.subtitle || 'Every bar is the share of the people who answered that ' +
            'question, with the raw count at the end of the bar. The two sides have ' +
            'different bases, so the columns are not each other&rsquo;s complement.',
            true);
        sides.forEach(function(s) {
            var data = D.reasons[String(s.q)];
            html += optionPanelHtml(pid + '-' + s.key, s.q, data, {
                title: qTitle(s.q) + ' (n=' + fmtInt(data.n_answered) + ')'
            });
        });
        if (p.html) html += '<div class="insight-glass scroll-reveal">' + p.html + '</div>';
        html += sectionClose();

        return {
            html: html,
            draw: function() {
                sides.forEach(function(s) {
                    var data = D.reasons[String(s.q)];
                    drawOptionChart(pid + '-' + s.key + '-box',
                        pid + '-' + s.key + '-chart',
                        pid + '-' + s.key + '-sr', s.q, data, { side: s.key });
                });
            }
        };
    }

    // ========================================================================
    // Panel: scale — burden / cost / labeled scales (never the support ramp)
    // ========================================================================
    function scalePanel(p, pid) {
        var qs = (p.qs || []).filter(function(n) {
            ref(n);
            return !!cellFor(n, 'overall');
        });
        var drivers = (p.drivers || []).filter(function(n) {
            ref(n);
            return !!optionSource(n);
        });

        if (!qs.length && !drivers.length) {
            return {
                html: sectionOpen(pid, p.title || 'Cost and burden',
                    'No scale rows for this proposal in the current export.') +
                    emptyCard('likert.json carries no cells for these questions.') +
                    sectionClose(),
                draw: function() {}
            };
        }

        var fam = qs.length ? famFor(qs[0]) : null;
        var complaint = fam && fam.key === 'complaint';
        var html = sectionOpen(pid, p.title || 'Cost and burden relative to today',
            p.subtitle || (qs.length ? esc(qs.map(qTitle).join(' · ')) : ''));

        if (qs.length) {
            html += '<div class="grid-stats" id="' + pid + '-stats"></div>';
            if (complaint) {
                html += '<div class="insight-box insight-warn scroll-reveal">' +
                    '<strong>3 = same as today.</strong> These rows are not a support ' +
                    'scale. A 5 means &ldquo;much more than today&rdquo; — a complaint ' +
                    'about the proposal&rsquo;s cost or effort, not an endorsement of ' +
                    'it. They are drawn on the amber &ldquo;more than today&rdquo; ramp ' +
                    'and never on the green/red support ramp.</div>';
            }
            html += '<div class="glass-chart-panel flush scroll-reveal">' +
                '<h3 class="chart-title">' + esc(p.chartTitle || 'Distribution') + '</h3>' +
                '<div class="' + chartBox(Math.max(2, qs.length + 1)) + '" id="' +
                pid + '-box"></div>' +
                '<div class="legend" id="' + pid + '-legend"></div>' +
                '<p class="s2-note" id="' + pid + '-note"></p></div>';
        }

        if (drivers.length) {
            // A lone driver picklist keeps the full width; two or more share a row.
            if (drivers.length > 1) html += '<div class="grid-2col">';
            drivers.forEach(function(n, i) {
                html += optionPanelHtml(pid + '-d' + i, n, optionSource(n), {});
            });
            if (drivers.length > 1) html += '</div>';
        }
        if (p.html) html += '<div class="insight-glass scroll-reveal">' + p.html + '</div>';
        html += sectionClose();

        return {
            html: html,
            draw: function() {
                if (qs.length) {
                    var cards = '';
                    qs.forEach(function(n) {
                        var s = sharesFor(n, 'overall');
                        if (!s) return;
                        var w = endWords(famFor(n), s);
                        var tint = END_TINTS[famFor(n).key] || END_TINTS.magnitude;
                        cards += statCard(fmtMean(s.mean), 'Q' + n + ' mean (1–' + s.len + ')');
                        cards += statCard(fmtShare(s.hi), 'Q' + n + ' ' + w.hi.toLowerCase(),
                            tint.hi);
                        cards += statCard(fmtInt(s.n), 'Q' + n + ' scored' +
                            (s.off ? ' (+' + s.off + ' off-scale)' : ''));
                    });
                    setHtml(pid + '-stats', cards || emptyCard('No scored answers.'));

                    var rows = qs.map(function(n) {
                        var c = cellFor(n, 'overall');
                        return c ? { label: 'Q' + n + ' ' + qLabel(n), cell: c,
                                     question: qmeta(n) } : null;
                    }).filter(Boolean);
                    var canvas = freshCanvas(pid + '-box', pid + '-chart');
                    if (canvas) {
                        keep(pid + '-chart', S2Viz.renderDivergingBar(canvas, rows, {
                            construct: qmeta(qs[0]).construct,
                            legend: '#' + pid + '-legend',
                            label: (p.title || 'Scale rows') + ' — all respondents',
                            labelShare: labelShareFor(pid + '-box', canvas, 0.4)
                        }));
                    }
                    setHtml(pid + '-note', esc(qs.map(function(n) {
                        return 'Q' + n + ': ' + scaleNote(n);
                    }).join(' ')));
                }
                drivers.forEach(function(n, i) {
                    drawOptionChart(pid + '-d' + i + '-box', pid + '-d' + i + '-chart',
                        pid + '-d' + i + '-sr', n, optionSource(n),
                        { color: window.RESOURCE_COLORS && RESOURCE_COLORS.solar });
                });
            }
        };
    }

    // ========================================================================
    // Panel: selects — design-preference distributions (+ headline stat cards)
    // ========================================================================
    function selectsPanel(p, pid) {
        var qs = (p.qs || []).filter(function(n) {
            ref(n);
            return !!optionSource(n);
        });
        var stats = (p.stats || []).filter(function(s) { return !!optionSource(s.q); });

        if (!qs.length) {
            return {
                html: sectionOpen(pid, p.title || 'Design preferences',
                    'No closed-option design questions are exported for this section.') +
                    emptyCard('selects.json carries no entry for these questions.') +
                    sectionClose(),
                draw: function() {}
            };
        }

        var html = sectionOpen(pid, p.title || 'Design preferences', p.subtitle || '');
        if (stats.length) html += '<div class="grid-stats" id="' + pid + '-stats"></div>';
        html += qs.length > 1 ? '<div class="grid-2col">' : '';
        qs.forEach(function(n, i) {
            html += optionPanelHtml(pid + '-q' + i, n, optionSource(n),
                { note: p.notes && p.notes[String(n)] });
        });
        html += qs.length > 1 ? '</div>' : '';
        if (p.html) html += '<div class="insight-glass scroll-reveal">' + p.html + '</div>';
        html += sectionClose();

        function matchOption(n, needle) {
            var data = optionSource(n);
            if (!data) return null;
            var found = null;
            (data.options || []).forEach(function(o) {
                if (found) return;
                if (String(o.text) === needle) found = o;
            });
            if (!found) {
                var lower = String(needle).toLowerCase();
                (data.options || []).forEach(function(o) {
                    if (found) return;
                    if (String(o.text).toLowerCase().indexOf(lower) === 0) found = o;
                });
            }
            return found ? { option: found, data: data } : null;
        }

        return {
            html: html,
            draw: function() {
                if (stats.length) {
                    var cards = '';
                    stats.forEach(function(s) {
                        var hit = matchOption(s.q, s.match);
                        if (!hit) return;
                        cards += statCard(fmtPct(hit.option.pct),
                            s.label + ' (Q' + s.q + ', n=' + fmtInt(hit.data.n_answered) + ')',
                            s.tint);
                    });
                    setHtml(pid + '-stats', cards);
                }
                qs.forEach(function(n, i) {
                    drawOptionChart(pid + '-q' + i + '-box', pid + '-q' + i + '-chart',
                        pid + '-q' + i + '-sr', n, optionSource(n),
                        { color: window.RESOURCE_COLORS && RESOURCE_COLORS.hydro });
                });
            }
        };
    }

    // ========================================================================
    // Panel: years — Q183 uniform effective date, with the protest answers
    // flagged rather than averaged (PLAN §2 gotcha 11)
    // ========================================================================
    function yearsPanel(p, pid) {
        var n = p.q || 183;
        ref(n);
        var data = D.selects && D.selects[String(n)];
        if (!data || !data.years) {
            return {
                html: sectionOpen(pid, p.title || 'Preferred effective date',
                    'No year histogram in the current export.') +
                    emptyCard('selects.json has no `years` map for Q' + n + '.') +
                    sectionClose(),
                draw: function() {}
            };
        }

        var years = Object.keys(data.years).sort();
        var html = sectionOpen(pid, p.title || 'If there were a uniform effective date',
            p.subtitle || esc(qTitle(n)) + '. Answers are written-in years, not a scale.') +
            '<div class="grid-stats" id="' + pid + '-stats"></div>' +
            '<div class="chart-panel scroll-reveal">' +
            '<h3 class="chart-title">' + esc(qTitle(n)) + '</h3>' +
            '<div class="' + chartBox(years.length) + '" id="' + pid + '-box"></div>' +
            '<div id="' + pid + '-sr"></div>' +
            '<p class="s2-note">Each bar is one written-in year as a share of the ' +
            fmtInt(data.n_answered) + ' answers to Q' + n + '. Years after 2050 are ' +
            'flagged: they are protest answers, kept visible and excluded from the ' +
            'median.</p></div>' +
            '<div class="insight-box insight-warn scroll-reveal" id="' + pid +
            '-protest"></div>' +
            sectionClose();

        return {
            html: html,
            draw: function() {
                var total = 0, protest = data.protest_gt_2050 || 0, far = [];
                var flat = [];
                years.forEach(function(y) {
                    var count = data.years[y] || 0;
                    total += count;
                    for (var i = 0; i < count; i++) flat.push(Number(y));
                    if (Number(y) > 2050) far.push(y + ' × ' + count);
                });
                var clean = flat.filter(function(y) { return y <= 2050; });
                var median = clean.length
                    ? (clean.length % 2
                        ? clean[(clean.length - 1) / 2]
                        : Math.round((clean[clean.length / 2 - 1] +
                                      clean[clean.length / 2]) / 2))
                    : null;
                var modal = null, modalN = -1;
                years.forEach(function(y) {
                    if (data.years[y] > modalN) { modalN = data.years[y]; modal = y; }
                });
                var by2030 = clean.filter(function(y) { return y <= 2030; }).length;

                setHtml(pid + '-stats',
                    statCard(fmtInt(data.n_answered), 'Answered Q' + n) +
                    statCard(modal || '—', 'Most-named year (' + fmtInt(modalN) + ' answers)') +
                    statCard(median === null ? '—' : String(median),
                        'Median year, protest answers excluded') +
                    statCard(fmtShare(clean.length ? by2030 / clean.length : null),
                        'Name 2030 or earlier') +
                    statCard(fmtInt(protest), 'Later than 2050 (protest)', 'text-storage'));

                var rows = years.map(function(y) {
                    return {
                        text: Number(y) > 2050 ? y + ' (protest)' : y,
                        n: data.years[y],
                        pct: total ? Math.round(1000 * data.years[y] / total) / 10 : 0
                    };
                });
                var canvas = freshCanvas(pid + '-box', pid + '-chart');
                if (canvas) {
                    keep(pid + '-chart', S2Viz.renderOptionBars(canvas, rows, {
                        n_answered: total,
                        sort: false,
                        color: window.RESOURCE_COLORS && RESOURCE_COLORS.nuclear,
                        labelShare: labelShareFor(pid + '-box', canvas, 0.16),
                        maxLines: 1
                    }));
                }
                S2Viz.optionSrTable('#' + pid + '-sr', rows, {
                    caption: qTitle(n) + ' — written-in years and their counts'
                });

                setHtml(pid + '-protest',
                    '<strong>' + fmtInt(protest) + ' answers name a year after 2050' +
                    (far.length ? ' (' + esc(far.join(', ')) + ')' : '') +
                    '.</strong> These are protest answers rather than genuine ' +
                    'timelines. They stay in the histogram — suppressing answers you ' +
                    'dislike is its own distortion — but they are excluded from the ' +
                    'median above, which is why no mean year is shown anywhere on ' +
                    'this page.');
            }
        };
    }

    // ========================================================================
    // Panel: evidence — what the answers are actually based on
    // ========================================================================
    function evidencePanel(p, pid) {
        var basis = p.basis && D.evidence && D.evidence.basis
            ? D.evidence.basis[p.basis] : null;
        var n = basis ? basis.q : p.q;
        if (n) ref(n);

        if (!basis) {
            // A configured basis question with nothing exported is a real gap, and
            // it says so rather than quietly dropping the panel.
            return {
                html: sectionOpen(pid, p.title || 'What the answers rest on',
                    p.subtitle || '') +
                    '<div class="insight-box scroll-reveal">' +
                    (p.html || 'No evidence-basis question is exported for this ' +
                     'proposal.') + '</div>' +
                    (p.links === false ? '' : evidenceLinks()) +
                    sectionClose(),
                draw: function() {}
            };
        }

        var multi = isMulti(n);
        var html = sectionOpen(pid, p.title || 'What the answers rest on',
            p.subtitle || esc('Q' + n + ' — ' + basis.label) + ' (n=' +
            fmtInt(basis.n_answered) + ').') +
            '<div class="grid-2col">' +
            '<div class="chart-panel scroll-reveal">' +
            '<h3 class="chart-title">' + esc('Q' + n + ' — ' + basis.label) + '</h3>' +
            '<div class="' + chartBox((basis.options || []).length) + '" id="' +
            pid + '-box"></div>' +
            '<div id="' + pid + '-sr"></div>' +
            '<p class="s2-note">Share of the ' + fmtInt(basis.n_answered) +
            ' respondents who answered Q' + n + '. ' +
            (multi ? 'Multi-select, so shares sum above 100%.'
                   : 'Single choice, so shares sum to 100%.') + '</p></div>' +
            '<div class="chart-panel scroll-reveal">' +
            '<h3 class="chart-title">Basis by stance on hourly matching (Q71)</h3>' +
            '<div id="' + pid + '-cross"></div>' +
            '<p class="s2-note">Columns are the respondent&rsquo;s own Q71 answer — ' +
            'oppose (1–2), neutral (3), support (4–5) — the survey&rsquo;s clearest ' +
            'dividing line. Counts, not shares: ' +
            (multi ? 'a multi-select column sums to more than its respondents.'
                   : 'each column sums to the respondents in that stance who ' +
                     'answered this question.') + '</p></div></div>' +
            (p.html ? '<div class="insight-glass scroll-reveal">' + p.html + '</div>' : '') +
            (p.links === false ? '' : evidenceLinks()) +
            sectionClose();

        return {
            html: html,
            draw: function() {
                drawOptionChart(pid + '-box', pid + '-chart', pid + '-sr', n, basis,
                    { color: window.RESOURCE_COLORS && RESOURCE_COLORS.nuclear });

                var cross = basis.by_stance_q71 || {};
                var cols = ['oppose', 'neutral', 'support'];
                var labels = { oppose: 'Oppose (1–2)', neutral: 'Neutral (3)',
                               support: 'Support (4–5)' };
                var names = {};
                cols.forEach(function(k) {
                    Object.keys(cross[k] || {}).forEach(function(o) { names[o] = true; });
                });
                var options = (basis.options || []).map(function(o) { return o.text; })
                    .filter(function(t) { return names[t]; });
                Object.keys(names).forEach(function(t) {
                    if (options.indexOf(t) < 0) options.push(t);
                });
                if (!options.length) {
                    setHtml(pid + '-cross', emptyCard('No stance cross-tab exported.'));
                    return;
                }
                var totals = { oppose: 0, neutral: 0, support: 0 };
                options.forEach(function(t) {
                    cols.forEach(function(k) { totals[k] += (cross[k] || {})[t] || 0; });
                });
                var html2 = '<div class="s2-table-scroll"><table class="data-table">' +
                    '<caption class="sr-only">Q' + n +
                    ' basis by Q71 stance, respondent counts</caption>' +
                    '<thead><tr><th scope="col">Basis</th>' +
                    cols.map(function(k) {
                        return '<th scope="col">' + esc(labels[k]) + '</th>';
                    }).join('') + '</tr></thead><tbody>';
                options.forEach(function(t) {
                    html2 += '<tr><th scope="row">' + esc(t) + '</th>' +
                        cols.map(function(k) {
                            var v = (cross[k] || {})[t];
                            if (v === undefined) return '<td class="text-muted">—</td>';
                            if (v === '<5') return '<td class="text-muted">&lt;5</td>';
                            var share = !multi && totals[k]
                                ? ' (' + fmtShare(v / totals[k], 0) + ')' : '';
                            return '<td>' + fmtInt(v) + share + '</td>';
                        }).join('') + '</tr>';
                });
                html2 += '<tr><th scope="row">All answers in column</th>' +
                    cols.map(function(k) {
                        return '<td>' + fmtInt(totals[k]) + '</td>';
                    }).join('') + '</tr></tbody></table></div>';
                setHtml(pid + '-cross', html2);
            }
        };
    }

    function evidenceLinks() {
        return '<div class="insight-glass insight-glass-indigo scroll-reveal">' +
            '<strong>Where the evidence analysis lives.</strong> Citation mining, ' +
            'domain classification, template-propagated citations and the ' +
            'basis-by-stance roll-up are on the ' +
            '<a href="' + EVIDENCE_PAGE + '">Evidence &amp; Research page</a>; ' +
            'coordinated blocs and the self-classification audit are on the ' +
            '<a href="' + INTEGRITY_PAGE + '">Integrity &amp; Coalitions page</a>.' +
            '</div>';
    }

    // ========================================================================
    // Panel: quotes — curated for/against cards
    // ========================================================================
    function quotesPanel(p, pid) {
        var lever = p.lever || CFG.quoteLever || CFG.lever;
        var sides = (D.quotes && D.quotes[lever]) || {};
        var forList = sides['for'] || [];
        var againstList = sides['against'] || [];
        var templates = forList.concat(againstList).filter(function(q) {
            return q && q.template_cluster;
        }).length;
        var redacted = forList.concat(againstList).filter(function(q) {
            return q && q.redacted;
        }).length;

        var html = sectionOpen(pid, p.title || 'In their own words',
            p.subtitle || 'Verbatim answers, curated for the strength of the ' +
            'argument on each side — not a random or representative sample. Named ' +
            'respondents link to their profile; redacted ones cannot.', true) +
            '<div id="' + pid + '-cards"></div>' +
            '<p class="s2-note" id="' + pid + '-note"></p>' +
            (p.html ? '<div class="insight-glass scroll-reveal">' + p.html + '</div>' : '') +
            sectionClose();

        return {
            html: html,
            draw: function() {
                S2Quotes.renderPair('#' + pid + '-cards', sides, {
                    forTitle: p.forTitle || 'For the proposal',
                    againstTitle: p.againstTitle || 'Against the proposal',
                    orgHref: function(id) {
                        return ORG_PAGE + '?org=' + encodeURIComponent(id);
                    },
                    emptyText: 'No curated quotes on this side yet.'
                });
                var bits = [forList.length + ' quote(s) for, ' + againstList.length +
                    ' against, drawn from the free-text answers on this lever.'];
                if (redacted) {
                    bits.push(redacted + ' come(s) from a respondent who redacted ' +
                        'their identity — shown as “Redacted”, never named from ' +
                        'context.');
                }
                bits.push(templates
                    ? templates + ' carry(ies) a template-cluster badge: the same ' +
                      'verbatim text was filed by other respondents too, so it is one ' +
                      'circulated argument rather than several independent ones.'
                    : 'None of these texts belong to a template cluster — each is a ' +
                      'single respondent’s own wording.');
                setHtml(pid + '-note', esc(bits.join(' ')));
            }
        };
    }

    // ========================================================================
    // Panel: footnote — the base size behind every number on the page
    // ========================================================================
    function footnotePanel(p, pid) {
        var html = sectionOpen(pid, p.title || 'Response bases and caveats',
            p.subtitle || 'Every percentage on this page divides by the base for its ' +
            'own question. Those bases are not interchangeable — response rates on ' +
            'this survey run from 1,072 down to 75.') +
            '<div class="card card-spacious scroll-reveal" id="' + pid + '-table"></div>' +
            '<div class="insight-box scroll-reveal">' +
            '<strong>How to read the numbers on this page.</strong> ' +
            'Scale questions are grouped by construct and never pooled: support runs ' +
            '1 = strongly opposes → 5 = strongly supports, while cost and burden ' +
            'questions anchor 3 to &ldquo;same as today&rdquo; so a 5 is a complaint. ' +
            'Off-scale answers (&ldquo;Unsure&rdquo;, &ldquo;Unknown&rdquo;, ' +
            '&ldquo;No basis to assess&rdquo;) are reported next to the scale, never ' +
            'inside it. Multi-select shares sum above 100%. Segment cells with fewer ' +
            'than ' + MASK_N + ' respondents are withheld by the exporter, and ' +
            'segments below n=' + SMALL_N + ' are hidden from the stance chart by ' +
            'default. Method notes: <a href="' + METHOD_PAGE + '">Methodology</a>.' +
            '</div>' +
            sectionClose();

        return {
            html: html,
            draw: function() {
                var nums = Object.keys(REFS).map(Number).sort(function(a, b) {
                    return a - b;
                });
                if (p.qs && p.qs.length) nums = p.qs.slice().sort(function(a, b) {
                    return a - b;
                });
                var rows = nums.map(function(n) {
                    var m = qmeta(n);
                    var c = cellFor(n, 'overall');
                    var src = optionSource(n);
                    var answered = m ? m.n_answered
                        : (src ? src.n_answered : (c ? c.n : null));
                    var scored = c && typeof c.n === 'number' ? c.n : null;
                    var off = c && c.off ? c.off : 0;
                    return {
                        q: n,
                        label: m ? m.label : 'Question ' + n,
                        type: typeLabel(m && m.type),
                        construct: m && m.construct
                            ? S2Viz.groupLabel(m.construct) + ' — ' +
                              S2Viz.familyFor(m.construct).badge
                            : '—',
                        answered: answered,
                        scored: scored,
                        off: off
                    };
                });
                var table = '<div class="s2-table-scroll"><table class="data-table">' +
                    '<caption class="sr-only">Every question used on this page, with ' +
                    'its answer base</caption><thead><tr>' +
                    '<th scope="col">Q</th><th scope="col">Question</th>' +
                    '<th scope="col">Answer type</th>' +
                    '<th scope="col">Scale / direction</th>' +
                    '<th scope="col">Answered</th>' +
                    '<th scope="col">Scored</th>' +
                    '<th scope="col">Off-scale</th></tr></thead><tbody>';
                rows.forEach(function(r) {
                    table += '<tr><th scope="row">Q' + r.q + '</th>' +
                        '<td>' + esc(r.label) + '</td>' +
                        '<td>' + esc(r.type) + '</td>' +
                        '<td>' + esc(r.construct) + '</td>' +
                        '<td>' + fmtInt(r.answered) + '</td>' +
                        '<td>' + (r.scored === null ? '—' : fmtInt(r.scored)) + '</td>' +
                        '<td>' + (r.off ? fmtInt(r.off) : '—') + '</td></tr>';
                });
                table += '</tbody></table></div>' +
                    '<p class="s2-note">&ldquo;Answered&rdquo; is the codebook base ' +
                    'from meta.json; &ldquo;scored&rdquo; counts only answers that ' +
                    'landed on the scale, so the difference is the off-scale column. ' +
                    'Data generated ' + esc((D.meta && D.meta.generated) || 'n/a') +
                    ' from the consultation database.</p>';
                setHtml(pid + '-table', table);
            }
        };
    }

    // --- Panel registry ------------------------------------------------------
    var KINDS = {
        note: notePanel,
        stance: stancePanel,
        reasons: reasonsPanel,
        scale: scalePanel,
        selects: selectsPanel,
        years: yearsPanel,
        evidence: evidencePanel,
        quotes: quotesPanel,
        footnote: footnotePanel
    };

    // --- Segment dimension chooser ------------------------------------------
    // Six dimensions as a `.toggle-btn-group` measure ~630px, which a 390px
    // viewport clips (shared.css hides horizontal body overflow) and leaves the
    // last dimensions unreachable. The shared `.s2-select` field carries the
    // same closed vocabulary at any width and writes through S2Segments, so the
    // URL state and the `segmentchange` event behave exactly as with a toggle.
    function dimSelect(hostId) {
        var host = el(hostId);
        if (!host) return null;
        var dims = S2Segments.dims().filter(function(d) {
            return d && d.values && d.values.length;
        });
        if (!dims.length) return null;
        var current = S2Segments.get('dim', 'org_type');
        var known = dims.some(function(d) { return d.key === current; });
        if (!known) current = dims[0].key;
        var selectId = hostId + '-select';

        host.className = 's2-field';
        host.innerHTML = '<label class="s2-control-label" for="' + esc(selectId) +
            '">Segment</label>' +
            '<select class="s2-select" id="' + esc(selectId) + '">' +
            dims.map(function(d) {
                return '<option value="' + esc(d.key) + '"' +
                    (d.key === current ? ' selected' : '') + '>' +
                    esc(d.label) + ' (' + d.values.length + ')</option>';
            }).join('') + '</select>';

        el(selectId).addEventListener('change', function(ev) {
            S2Segments.set('dim', ev.target.value);
        });
        if (!known) S2Segments.set('dim', current, { silent: true });
        return el(selectId);
    }

    // --- Boot ----------------------------------------------------------------
    function fail(mount, err) {
        S2Data.errorPanel(mount, err, { title: 'This proposal page has no data' });
        if (window.console && console.error) console.error(err);
    }

    function build(mount) {
        var panels = (CFG.panels || []).filter(function(p) {
            return p && KINDS[p.kind];
        });
        var used = {};
        var built = panels.map(function(p, i) {
            var base = p.id || p.kind;
            var pid = used[base] ? base + '-' + (used[base] + 1) : base;
            used[base] = (used[base] || 0) + 1;
            return KINDS[p.kind](p, pid);
        });

        // Footnote panels report on every question the earlier panels touched, so
        // markup goes in first and the draws run in order afterwards.
        mount.innerHTML = built.map(function(b) { return b.html; }).join('');
        built.forEach(function(b) {
            try {
                b.draw();
            } catch (e) {
                if (window.console && console.error) console.error(e);
            }
        });

        // The segment controls belong to the stance panel; wire whichever exists.
        var controls = null;
        built.forEach(function(b) { if (b.controls) controls = b.controls; });
        if (controls) {
            dimSelect(controls.dim);
            S2Segments.switchToggle('#' + controls.small, {
                param: 'hidesmall',
                label: 'Segments with n<' + SMALL_N,
                onLabel: 'Hidden',
                offLabel: 'Shown',
                def: true
            });
            S2Segments.on(function(ev) {
                if (!ev.detail || (ev.detail.param !== 'dim' &&
                                   ev.detail.param !== 'hidesmall')) return;
                SEG_DRAWS.forEach(function(fn) {
                    try {
                        fn();
                    } catch (e) {
                        if (window.console && console.error) console.error(e);
                    }
                });
            });
        }
    }

    function start() {
        CFG = window.PROPOSAL_CONFIG;
        var mount = el(CFG && CFG.mount ? CFG.mount : 'proposalBody');
        if (!mount) {
            if (window.console && console.error) {
                console.error('proposal-page.js: no #proposalBody mount on this page.');
            }
            return;
        }
        if (!CFG || !CFG.panels) {
            mount.innerHTML = emptyCard('This page set no PROPOSAL_CONFIG.panels, so ' +
                'there is nothing to render.');
            return;
        }
        mount.innerHTML = '<div class="content-section"><div class="card s2-loading">' +
            'Loading the consultation data…</div></div>';

        S2Data.loadAll(FILES).then(function(loaded) {
            D = loaded;
            QMAP = {};
            ((D.meta && D.meta.questions) || []).forEach(function(q) {
                QMAP[String(q.q)] = q;
            });
            S2Segments.init(D.meta);
            build(mount);
        }).catch(function(err) {
            fail(mount, err);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

    window.S2Proposal = {
        start: start,
        kinds: Object.keys(KINDS),
        MASK_N: MASK_N,
        SMALL_N: SMALL_N
    };
})();
