// ============================================================================
// index-page.js - Overview & objective assessment (index.html)
// ============================================================================
// Page module for P40. The essay on index.html is static prose; every figure
// in it is verified against the exported JSON and linked to the panel that
// shows it. This module owns only the data-driven furniture around the essay:
//
//   1. hero stats row      analytical base, questions, Q19, redaction, Q52
//   2. headline strips     Q19 · Q21 · Q24                (ECStance.renderStrips)
//   3. matrix extremes     regulatory vs first-of-its-kind (ECMatrix.renderMini)
//
// The strips and the matrix rows follow one segment toggle, the same grammar
// as the Decision Board. Nothing here computes a number the contract does not
// carry: the Q52 substantive count is the exported q52 rows minus the bare
// "N/A" filings the integrity page itemizes the same way.
//
// Include after the site modules, at the end of <body>.
// ============================================================================

(function () {
    'use strict';

    var MASK_N = 5;

    // The headline decision points, in PLAN §4 order.
    var STANCE_QIDS = ['Q019', 'Q021', 'Q024'];

    // The additionality gradient's two ends (§4: matrix top and bottom rows).
    var MATRIX_ENDS = ['Q026_1', 'Q026_9'];

    var FILES = ['meta', 'stances', 'matrix', 'respondents', 'integrity'];

    var D = {};

    // --- Small helpers -------------------------------------------------------
    function esc(s) { return ECData.escapeHtml(s); }

    function el(id) { return document.getElementById(id); }

    function put(id, html) {
        var node = el(id);
        if (node) node.innerHTML = html;
        return node;
    }

    function dimKey() { return ECSegments.get('dim') || 'overall'; }

    function display(qid) { return ECData.display(D.meta, qid); }

    function question(qid) { return ECData.question(D.meta, qid); }

    function present(qids, source) {
        return qids.filter(function (qid) { return !!(source || {})[qid]; });
    }

    function usable(cell) {
        return !!cell && !ECStance.isEmpty(cell) && !ECStance.isMasked(cell, MASK_N);
    }

    // Share choosing the option meta.json flags as the question's critical
    // answer (PLAN gotcha 5 — for Q19 that is "No").
    function criticalShare(qid) {
        var q = question(qid);
        var entry = (D.stances || {})[qid];
        var cell = entry ? entry.overall : null;
        var critical = q && q.polarity && q.polarity.critical;
        if (!q || !critical || !usable(cell)) return null;
        var idx = -1;
        (q.options || []).forEach(function (o, i) { if (o.key === critical) idx = i; });
        if (idx < 0) return null;
        var n = ECStance.baseOf(cell);
        var v = (cell.c || [])[idx] || 0;
        return {
            n: n, count: v,
            pct: ECStance.pct1(v, n),
            label: (q.options[idx] || {}).label || critical
        };
    }

    // Q52 evidence submissions: exported rows minus the bare "N/A" filings.
    // Same reading as the integrity page's evidence table.
    function evidenceCounts() {
        var rows = (((D.integrity || {}).citations || {}).q52) || [];
        if (!rows.length) return null;
        var bare = rows.filter(function (r) {
            return /^\s*n\/?a[\s.]*$/i.test(String(r.preview || ''));
        }).length;
        return { total: rows.length, bare: bare, substantive: rows.length - bare };
    }

    // --- Hero stats ----------------------------------------------------------
    function statCard(value, label, note) {
        return '<div class="stat-card">' +
            '<div class="stat-value">' + esc(value) + '</div>' +
            '<div class="stat-label">' + esc(label) + '</div>' +
            (note ? '<p class="ec-note">' + esc(note) + '</p>' : '') +
            '</div>';
    }

    function drawHero() {
        var totals = (D.meta || {}).totals || {};
        var attrition = ((D.respondents || {}).attrition || []).filter(Boolean);
        var cards = [];

        if (totals.respondents !== undefined) {
            var excluded = totals.respondents_raw !== undefined
                ? totals.respondents_raw - totals.respondents : null;
            cards.push(statCard(
                totals.respondents,
                'Respondents · analytical base',
                excluded === null ? '' :
                    totals.respondents_raw + ' filed · ' + excluded +
                    ' excluded as junk or superseded'));
        }

        if (totals.questions !== undefined) {
            var span = attrition.length
                ? (attrition[0].display || attrition[0].qid) + ' – ' +
                  (attrition[attrition.length - 1].display ||
                   attrition[attrition.length - 1].qid)
                : '';
            cards.push(statCard(
                totals.questions,
                'Substantive questions',
                span ? 'running ' + span + ', bases falling throughout' : ''));
        }

        var crit = criticalShare('Q019');
        if (crit) {
            cards.push(statCard(
                ECStance.fmtPct(crit.pct),
                '“' + crit.label + '” on ' + display('Q019'),
                crit.count + ' of ' + crit.n + ' who answered the formula question'));
        }

        if (totals.redacted !== undefined && totals.respondents) {
            cards.push(statCard(
                ECStance.fmtPct(ECStance.pct1(totals.redacted, totals.respondents)),
                'Redaction requested',
                totals.redacted + ' of ' + totals.respondents +
                    ' withheld their identity'));
        }

        var ev = evidenceCounts();
        if (ev) {
            cards.push(statCard(
                ev.substantive,
                'Substantive evidence submissions',
                ev.total + ' answers to ' +
                    (display('Q052') || 'Q52') + ', ' + ev.bare +
                    ' of them a bare “N/A”'));
        }

        put('heroStats', cards.join('') ||
            '<div class="card ec-empty">This export carries no totals block.</div>');
    }

    // --- Headline strips -----------------------------------------------------
    function drawStrips() {
        ECStance.renderStrips('#stripsHost', {
            qids: present(STANCE_QIDS, D.stances),
            stances: D.stances,
            meta: D.meta,
            dim: dimKey(),
            maskN: MASK_N,
            showSegments: true,
            label: 'Headline decision points'
        });
        var missing = STANCE_QIDS.filter(function (qid) {
            return !(D.stances || {})[qid];
        });
        put('stripsCoverage', missing.length
            ? '<p class="ec-note">Not carried in this export: ' +
              missing.map(function (qid) {
                  return '<strong>' + esc(display(qid)) + '</strong>';
              }).join(' · ') + '.</p>'
            : '');
    }

    // --- Matrix extremes -----------------------------------------------------
    // renderMini draws every test the meta block declares, so the two ends of
    // the gradient are selected by handing it a filtered copy of meta.matrix.
    // Nothing in the loaded contract objects is mutated.
    function drawMatrixEnds() {
        var mx = (D.meta || {}).matrix || {};
        var tests = (mx.tests || []).filter(function (t) {
            return MATRIX_ENDS.indexOf(t.qid) >= 0;
        });
        if (!tests.length) {
            put('matrixEndsHost', '<div class="card ec-empty">The additionality ' +
                'matrix is not in this export yet.</div>');
            return;
        }
        var endsMeta = {};
        Object.keys(D.meta).forEach(function (k) { endsMeta[k] = D.meta[k]; });
        endsMeta.matrix = { levels: mx.levels, tests: tests };

        ECMatrix.renderMini('#matrixEndsHost', {
            meta: endsMeta,
            matrix: D.matrix,
            dim: dimKey(),
            maskN: MASK_N,
            link: 'topics/additionality.html'
        });
    }

    // --- Wiring --------------------------------------------------------------
    function redraw() {
        drawStrips();
        drawMatrixEnds();
    }

    function start() {
        ECData.loadAll(FILES).then(function (loaded) {
            D = loaded;
            ECSegments.init(D.meta);

            ECSegments.dimToggle('#dimToggle', {
                label: 'Segment the headline block by',
                def: 'overall',
                includeOverall: true
            });

            ECSegments.on(function (ev) {
                var param = ev.detail && ev.detail.param;
                if (param === 'dim') redraw();
            });

            drawHero();
            redraw();

            var stamp = el('exportStamp');
            if (stamp) {
                stamp.textContent = 'Every figure on this page — the panels above and ' +
                    'the essay below — is stated from the exported dataset (' +
                    ECData.basePath() + '), generated ' +
                    (D.meta.generated || 'unknown') + '.' +
                    (D.meta.provisional
                        ? ' This export is marked provisional: curation inputs may ' +
                          'still be landing.'
                        : '');
            }
        }).catch(function (err) {
            ECData.errorPanel('#stripsHost', err, {
                title: 'The overview could not load its data'
            });
            Array.prototype.forEach.call(
                document.querySelectorAll('.ec-loading'),
                function (node) {
                    node.textContent = 'Unavailable — the export could not be read.';
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
