// ============================================================================
// decisions-page.js - the Decision Board (decisions.html)
// ============================================================================
// Page module for P30. Owns nothing visual: every mark on the page is drawn by
// the shared EC* renderers (PLAN §7), and every number is stamped from the
// exported JSON contract (PLAN §5). decisions.html carries no figures of its
// own — if a panel has no data in an export, it says so rather than inventing
// one.
//
// Panels, in PLAN §4 order:
//   1. stance strips        Q19 · Q21 · Q24 · Q33 · Q31   (ECStance.renderStrips)
//   2. additionality mini   9 tests × R/O/N by net req.    (ECMatrix.renderMini)
//   3. methodology roll-up  om / bm / weighting            (ECStance.renderScoreboard)
//   4. granularity ladders  Q43 · Q45 + fine/coarse bins   (ECStance.renderStrips)
//   5. attrition strip      n per question, survey order   (ECStance.renderAttrition)
//
// One ECSegments dimension toggle drives panels 1–4: the strips and ladders
// re-render per segment, and the matrix/scoreboard popovers carry the segment
// split for the selected dimension. Panel 5 is a base-size context strip and is
// deliberately not segmented.
//
// Include after the site modules, at the end of <body>.
// ============================================================================

(function () {
    'use strict';

    // --- Configuration -------------------------------------------------------
    var MASK_N = 5;

    // The closed decision points of the board, in PLAN §4 order.
    var STANCE_QIDS = ['Q019', 'Q021', 'Q024', 'Q033', 'Q031'];

    // The ordered granularity ladders — spatial first, then temporal.
    var LADDER_QIDS = ['Q043', 'Q045'];

    // Canonical scoreboard family order. A family meta declares beyond these is
    // appended in meta's own key order rather than dropped.
    var BOARD_ORDER = ['om', 'bm', 'weighting'];

    // The non-curation contract files. All five are emitted even when the
    // exporter runs with --allow-missing-curation, so a missing one means a
    // broken export and has to surface as an error, not as an empty panel.
    var FILES = ['meta', 'stances', 'matrix', 'scoreboard', 'respondents'];

    var D = {};
    var boardShellsBuilt = false;

    // --- Small helpers -------------------------------------------------------
    function esc(s) { return ECData.escapeHtml(s); }

    function el(id) { return document.getElementById(id); }

    function put(id, html) {
        var node = el(id);
        if (node) node.innerHTML = html;
        return node;
    }

    function dimKey() { return ECSegments.get('dim') || 'overall'; }

    function segRows() { return ECSegments.getBool('segrows', true); }

    function display(qid) { return ECData.display(D.meta, qid); }

    function question(qid) { return ECData.question(D.meta, qid); }

    function readable(s) { return String(s || '').replace(/_/g, ' '); }

    function joinList(parts) {
        if (!parts.length) return '';
        if (parts.length === 1) return parts[0];
        return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
    }

    // A cell only counts as readable data when it is neither empty nor masked.
    function usable(cell) {
        return !!cell && !ECStance.isEmpty(cell) && !ECStance.isMasked(cell, MASK_N);
    }

    function overallCell(qid) {
        var entry = (D.stances || {})[qid];
        return entry ? entry.overall : null;
    }

    function present(qids, source) {
        return qids.filter(function (qid) { return !!(source || {})[qid]; });
    }

    // Names the questions the board asked for but this export does not carry.
    // Silent when the export is complete; on fixtures it is the honest reason a
    // panel is short.
    function coverageNote(hostId, wanted, source, tail) {
        var missing = wanted.filter(function (qid) { return !(source || {})[qid]; });
        if (!missing.length) return put(hostId, '');
        return put(hostId, '<p class="ec-note">Not carried in this export: ' +
            missing.map(function (qid) {
                return '<strong>' + esc(display(qid)) + '</strong>';
            }).join(' · ') + '. ' + esc(tail || '') + '</p>');
    }

    // --- Derived readings ----------------------------------------------------
    // Share choosing the option meta.json flags as this question's critical
    // answer (PLAN gotcha 5 — for Q19 that is "No", not "Yes").
    function criticalShare(qid) {
        var q = question(qid);
        var cell = overallCell(qid);
        var critical = q && q.polarity && q.polarity.critical;
        if (!q || !critical || !usable(cell)) return null;
        var idx = -1;
        (q.options || []).forEach(function (o, i) { if (o.key === critical) idx = i; });
        if (idx < 0) return null;
        var n = ECStance.baseOf(cell);
        var v = (cell.c || [])[idx] || 0;
        return {
            qid: qid, q: q, n: n, count: v,
            pct: ECStance.pct1(v, n),
            label: (q.options[idx] || {}).label || critical
        };
    }

    // Modal (largest) substantive option of a stance question. Specials are
    // never a "winner" — PLAN gotcha 6 keeps them out of every reading.
    function modal(qid) {
        var q = question(qid);
        var cell = overallCell(qid);
        if (!q || !usable(cell)) return null;
        var n = ECStance.baseOf(cell);
        var best = null;
        (q.options || []).forEach(function (o, i) {
            if (o.special) return;
            var v = (cell.c || [])[i] || 0;
            if (!best || v > best.count) {
                best = { count: v, label: o.label, key: o.key };
            }
        });
        if (!best || !n) return null;
        best.qid = qid;
        best.n = n;
        best.pct = ECStance.pct1(best.count, n);
        return best;
    }

    // Fine-vs-coarse binning of an ordered ladder. PLAN §6 defines Q43/Q45 ranks
    // coarse -> fine, so the low half of the ladder is the coarse reading and
    // the high half the fine one; an odd ladder keeps its midpoint as its own
    // bin rather than being forced to one side.
    function ladderBins(qid) {
        var q = question(qid);
        var cell = overallCell(qid);
        if (!q || !usable(cell)) return null;

        var ranked = [];
        (q.options || []).forEach(function (o, i) {
            if (o.special) return;
            if (o.rank === undefined || o.rank === null) return;
            ranked.push({ index: i, rank: o.rank, label: o.label });
        });
        if (ranked.length < 3) return null;
        ranked.sort(function (a, b) { return a.rank - b.rank; });

        var mid = (ranked.length - 1) / 2;
        var bins = { coarse: [], middle: [], fine: [] };
        ranked.forEach(function (o, pos) {
            if (pos < mid) bins.coarse.push(o);
            else if (pos > mid) bins.fine.push(o);
            else bins.middle.push(o);
        });

        function tally(list) {
            var count = list.reduce(function (acc, o) {
                return acc + ((cell.c || [])[o.index] || 0);
            }, 0);
            return {
                count: count,
                labels: list.map(function (o) { return o.label; })
            };
        }

        return {
            qid: qid, q: q,
            n: ECStance.baseOf(cell),
            coarse: tally(bins.coarse),
            middle: tally(bins.middle),
            fine: tally(bins.fine)
        };
    }

    // Scoreboard families this export actually carries, in canonical order.
    function boardKeys() {
        var declared = Object.keys((D.meta || {}).scoreboards || {});
        var ordered = BOARD_ORDER.filter(function (k) { return declared.indexOf(k) >= 0; });
        declared.forEach(function (k) { if (ordered.indexOf(k) < 0) ordered.push(k); });
        if (!ordered.length) ordered = Object.keys(D.scoreboard || {});
        return ordered.filter(function (k) { return !!(D.scoreboard || {})[k]; });
    }

    function boardSpec(key) {
        return ((D.meta || {}).scoreboards || {})[key] || {};
    }

    function boardBases(key) {
        var board = (D.scoreboard || {})[key] || {};
        var spec = boardSpec(key);
        return {
            app: board.base_app !== undefined ? board.base_app : spec.base_app,
            not: board.base_not !== undefined ? board.base_not : spec.base_not
        };
    }

    // Same rule the renderer uses (PLAN gotcha 7): each side is a share of its
    // own base, so the net is a difference of shares, never of respondents.
    function netOf(row, bases) {
        if (row.net_pct !== undefined && row.net_pct !== null) return row.net_pct;
        return ECStance.pct1((row.app || {}).n || 0, bases.app) -
               ECStance.pct1((row.not || {}).n || 0, bases.not);
    }

    // --- Panel 0: hero stats + the headline callout --------------------------
    function statCard(value, label, note, title) {
        return '<div class="stat-card"' +
            (title ? ' title="' + esc(title) + '"' : '') + '>' +
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
                'Questions in the dataset',
                span ? 'substantive questions run ' + span : ''));
        }

        var crit = criticalShare('Q019');
        if (crit) {
            cards.push(statCard(
                ECStance.fmtPct(crit.pct),
                '“' + crit.label + '” on ' + display('Q019'),
                crit.count + ' of ' + crit.n + ' who answered',
                crit.q.label || ''));
        }

        if (totals.redacted !== undefined && totals.respondents) {
            cards.push(statCard(
                ECStance.fmtPct(ECStance.pct1(totals.redacted, totals.respondents)),
                'Redaction requested',
                totals.redacted + ' of ' + totals.respondents +
                    ' withheld their identity'));
        }

        put('heroStats', cards.join('') ||
            '<div class="card ec-empty">This export carries no totals block.</div>');
    }

    function drawHeadline() {
        var host = el('headline');
        if (!host) return;
        var crit = criticalShare('Q019');
        if (!crit) { host.innerHTML = ''; host.hidden = true; return; }
        host.hidden = false;
        host.innerHTML =
            '<div class="emphasis-big">' + esc(ECStance.fmtPct(crit.pct)) + '</div>' +
            '<div class="emphasis-desc">answered “' + esc(crit.label) + '” to ' +
            esc(display('Q019')) + ' — ' + esc(crit.q.label || '') + '</div>' +
            '<div class="emphasis-sub">' + crit.count + ' of the ' + crit.n +
            ' respondents who answered this question. A consultation is not a ' +
            'referendum, and at this base it is not a survey either — this is ' +
            'the balance of a self-selected record.</div>';
    }

    // --- Panel 1: stance strips ---------------------------------------------
    function drawStrips() {
        var qids = present(STANCE_QIDS, D.stances);
        ECStance.renderStrips('#stripsHost', {
            qids: qids,
            stances: D.stances,
            meta: D.meta,
            dim: dimKey(),
            maskN: MASK_N,
            showSegments: segRows(),
            label: 'Closed decision points'
        });
        coverageNote('stripsCoverage', STANCE_QIDS, D.stances,
            'The strips above are the decision points this export does carry.');
        drawStripReading(qids);
    }

    // A mechanical reading of the strips: which decision is the most lopsided
    // and which is the closest call. Raw modal shares are not comparable across
    // a two-way and a three-way question — 38% leads a three-way but trails a
    // two-way — so each is measured as points clear of an even split across the
    // options that question offered.
    function drawStripReading(qids) {
        var readings = qids.map(function (qid) {
            var m = modal(qid);
            var q = question(qid);
            var k = ((q || {}).options || []).length;
            if (!m || !k) return null;
            m.lead = m.pct - 100 / k;
            return m;
        }).filter(Boolean);
        if (readings.length < 2) return put('stripsReading', '');

        readings.sort(function (a, b) { return b.lead - a.lead; });
        var top = readings[0], bottom = readings[readings.length - 1];

        function phrase(r) {
            return '<strong>' + esc(display(r.qid)) + '</strong> — ' +
                esc(r.label) + ' at ' + esc(ECStance.fmtPct(r.pct)) + ' of n=' +
                r.n + ', ' + esc(ECStance.fmtSigned(r.lead)) + ' points clear of ' +
                'an even split across its options';
        }

        put('stripsReading', '<p class="ec-note">Most lopsided: ' + phrase(top) +
            '. Closest call: ' + phrase(bottom) + '. Each share is of its own ' +
            'question’s base, and no two of these questions were answered by the ' +
            'same respondents.</p>');
    }

    // --- Panel 2: the additionality mini-matrix ------------------------------
    function drawMatrix() {
        var result = ECMatrix.renderMini('#matrixHost', {
            meta: D.meta,
            matrix: D.matrix,
            dim: dimKey(),
            maskN: MASK_N,
            link: 'topics/additionality.html'
        });
        drawMatrixBase(result);
        drawMatrixReading(result);
    }

    // "n = 99–108 per test" — the spread of the per-test bases, stamped from
    // the cells actually drawn.
    function drawMatrixBase(result) {
        var rows = (result && result.rows) || [];
        var bases = rows.map(function (r) { return ECStance.baseOf(r.cell); })
            .filter(function (n) { return n > 0; });
        if (!bases.length) return put('matrixBase', '');
        var lo = Math.min.apply(null, bases), hi = Math.max.apply(null, bases);
        put('matrixBase', '<span class="ec-base-chip">n = ' +
            (lo === hi ? lo : lo + '–' + hi) + ' per test</span>');
    }

    function drawMatrixReading(result) {
        var rows = ((result && result.rows) || []).filter(function (r) {
            return r.net !== null && r.net !== undefined;
        });
        if (!rows.length) return put('matrixReading', '');
        var levels = ECMatrix.levels(D.meta);
        var top = rows[0], bottom = rows[rows.length - 1];
        var hi = (levels[0] || {}).label || 'the most stringent level';
        var lo = (levels[levels.length - 1] || {}).label || 'the least stringent level';
        put('matrixReading',
            '<strong>Read as stringency, not support.</strong> Net requiredness is ' +
            'the share choosing <em>' + esc(hi) + '</em> minus the share choosing ' +
            '<em>' + esc(lo) + '</em>, on each test’s own base. Highest: <strong>' +
            esc(top.label) + '</strong> ' + esc(ECStance.fmtSigned(top.net)) +
            ' points. Lowest: <strong>' + esc(bottom.label) + '</strong> ' +
            esc(ECStance.fmtSigned(bottom.net)) + ' points. A respondent who ' +
            'calls a test “' + esc(lo) + '” is not opposing additionality.');
    }

    // --- Panel 3: the methodology scoreboard roll-up ------------------------
    // Panel shells are built once so a segment change re-renders the boards in
    // place instead of replaying the reveal animation on every click.
    function buildBoardShells() {
        if (boardShellsBuilt) return;
        var host = el('scoreboardHost');
        if (!host) return;
        var keys = boardKeys();
        if (!keys.length) {
            host.innerHTML = '<div class="card ec-empty">This export carries no ' +
                'methodology scoreboards.</div>';
            boardShellsBuilt = true;
            return;
        }
        host.innerHTML = keys.map(function (key) {
            var spec = boardSpec(key);
            var bases = boardBases(key);
            var qApp = spec.q_app ? question(spec.q_app) : null;
            var link = qApp && qApp.page
                ? '<a class="ec-strip-link" href="' + esc(qApp.page) + '">Open the ' +
                  esc(readable(qApp.topic) || 'topic') + ' page &rarr;</a>'
                : '';
            return '<div class="chart-panel scroll-reveal">' +
                '<h3 class="chart-title">' +
                esc(spec.label || readable(key) + ' methods') + ' ' +
                '<span class="ec-base-chip">appropriate n=' + esc(bases.app) +
                ' · not appropriate n=' + esc(bases.not) + '</span></h3>' +
                '<div id="scoreboard-' + esc(key) + '"></div>' + link + '</div>';
        }).join('');
        boardShellsBuilt = true;
    }

    function drawScoreboards() {
        buildBoardShells();
        var keys = boardKeys();
        keys.forEach(function (key) {
            var spec = boardSpec(key);
            ECStance.renderScoreboard('#scoreboard-' + key, D.scoreboard[key], {
                meta: D.meta,
                key: key,
                dim: dimKey(),
                maskN: MASK_N,
                label: spec.label || readable(key) + ' methods'
            });
        });
        drawBoardReading(keys);
    }

    function drawBoardReading(keys) {
        var lines = keys.map(function (key) {
            var board = D.scoreboard[key] || {};
            var spec = boardSpec(key);
            var bases = boardBases(key);
            var rows = (board.options || []).slice().sort(function (a, b) {
                return netOf(b, bases) - netOf(a, bases);
            });
            if (!rows.length) return '';
            var top = rows[0], bottom = rows[rows.length - 1];
            return '<li><strong>' + esc(spec.label || readable(key)) +
                '</strong> — strongest ' + esc(top.label) + ' ' +
                esc(ECStance.fmtSigned(netOf(top, bases))) +
                (rows.length > 1
                    ? ', weakest ' + esc(bottom.label) + ' ' +
                      esc(ECStance.fmtSigned(netOf(bottom, bases)))
                    : '') +
                ' (bases ' + esc(bases.app) + ' and ' + esc(bases.not) + ').</li>';
        }).filter(Boolean);
        if (!lines.length) return put('boardReading', '');
        put('boardReading',
            '<strong>Winners and losers, family by family.</strong>' +
            '<ul>' + lines.join('') + '</ul>' +
            'Net is a difference of two shares on two different bases, so it ' +
            'ranks options within a family and nothing else. A method on ' +
            'neither list is <em>unknown</em>, not neutral, and the ' +
            '“unsure”/“none” answers beside each board are never netted in.');
    }

    // --- Panel 4: the granularity ladders ------------------------------------
    function drawLadders() {
        ECStance.renderStrips('#laddersHost', {
            qids: present(LADDER_QIDS, D.stances),
            stances: D.stances,
            meta: D.meta,
            dim: dimKey(),
            maskN: MASK_N,
            showSegments: segRows(),
            label: 'Granularity ladders'
        });
        coverageNote('laddersCoverage', LADDER_QIDS, D.stances,
            'The ladder below is the one this export does carry.');
        drawLadderBins();
    }

    function drawLadderBins() {
        var blocks = present(LADDER_QIDS, D.stances).map(ladderBins).filter(Boolean);
        if (!blocks.length) return put('ladderBins', '');
        put('ladderBins', blocks.map(function (b) {
            function part(word, bin) {
                if (!bin.labels.length) return '';
                return word + ' (' + esc(joinList(bin.labels)) + ') <strong>' +
                    bin.count + '</strong>';
            }
            var parts = [part('finer half', b.fine),
                         part('midpoint', b.middle),
                         part('coarser half', b.coarse)].filter(Boolean);
            return '<p class="ec-note"><strong>' + esc(display(b.qid)) + ' · ' +
                esc(b.q.label || '') + '.</strong> Binned across the ladder: ' +
                parts.join(' · ') + ' <span class="ec-base-chip">n=' + b.n +
                '</span> — all respondents, whatever segment the strips are ' +
                'showing.</p>';
        }).join(''));
    }

    // --- Panel 5: the attrition strip ---------------------------------------
    function drawAttrition() {
        var rows = (D.respondents || {}).attrition || [];
        ECStance.renderAttrition('#attritionHost', rows, { meta: D.meta });
    }

    // --- Wiring --------------------------------------------------------------
    // Panels 1–4 follow the segment toggle; the hero, the headline and the
    // attrition strip do not depend on it.
    function redraw() {
        drawStrips();
        drawMatrix();
        drawScoreboards();
        drawLadders();
    }

    function start() {
        ECData.loadAll(FILES).then(function (loaded) {
            D = loaded;
            ECSegments.init(D.meta);

            ECSegments.dimToggle('#dimToggle', {
                label: 'Segment every panel by',
                def: 'overall',
                includeOverall: true
            });
            ECSegments.switchToggle('#segRowToggle', {
                param: 'segrows',
                label: 'Per-segment rows',
                onLabel: 'Shown',
                offLabel: 'Hidden',
                def: true
            });

            ECSegments.on(function (ev) {
                var param = ev.detail && ev.detail.param;
                if (param === 'dim' || param === 'segrows') redraw();
            });

            drawHero();
            drawHeadline();
            redraw();
            drawAttrition();

            var stamp = el('exportStamp');
            if (stamp) {
                stamp.textContent = 'Every figure on this page is stamped from the ' +
                    'exported dataset (' + ECData.basePath() + '), generated ' +
                    (D.meta.generated || 'unknown') + '.' +
                    (D.meta.provisional
                        ? ' This export is marked provisional: curation inputs may ' +
                          'still be landing.'
                        : '');
            }
        }).catch(function (err) {
            ECData.errorPanel('#stripsHost', err, {
                title: 'The Decision Board could not load its data'
            });
            // Never leave the other panels claiming they are still loading.
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
