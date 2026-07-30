// index-page.js — landing page: hero stats + the headline 7-anchor diverging bar.
//
// Loads meta.json + likert.json through S2Data and draws the seven MBM support
// anchors (construct 'support', survey order) as one diverging stacked bar via
// S2Viz.renderDivergingBar. The hero stat cards carry verified static values in
// the HTML so the page degrades readably; this module overwrites them from
// meta.json so the numbers can never drift from the export.

(function () {
    'use strict';

    var FILES = ['meta', 'likert'];

    function el(id) { return document.getElementById(id); }

    function fmtInt(n) {
        return (typeof n === 'number') ? n.toLocaleString('en-US') : String(n);
    }

    function setText(id, text) {
        var node = el(id);
        if (node) node.textContent = text;
    }

    function shortName(q) {
        return String(q.label || '')
            .replace(/^Support for (a |an |the )?/i, '')
            .replace(/^Preferred /i, '');
    }

    // Same label-share heuristic as the heatmap page: narrow panels give the
    // row labels a bigger slice of the canvas so they are not truncated.
    function labelShareFor(holderId) {
        var holder = el(holderId);
        var width = holder ? holder.clientWidth : 0;
        return width >= 520 ? 0.26 : 0.42;
    }

    function drawHeadline(D) {
        var holder = el('headlineHolder');
        if (!holder) return;
        holder.innerHTML = '<canvas id="headlineBar"></canvas>';

        var anchors = ((D.meta && D.meta.questions) || [])
            .filter(function (q) { return q.construct === 'support'; })
            .sort(function (a, b) { return a.q - b.q; });

        var rows = anchors.map(function (q) {
            var entry = D.likert[String(q.q)] || {};
            return {
                label: 'Q' + q.q + ' · ' + shortName(q),
                cell: entry.overall,
                question: q
            };
        }).filter(function (r) { return r.cell && r.cell.c; });

        S2Viz.renderDivergingBar('#headlineBar', rows, {
            construct: 'support',
            legend: '#headlineLegend',
            labelShare: labelShareFor('headlineHolder'),
            label: 'The seven MBM support anchors — all respondents'
        });

        var note = el('headlineNote');
        if (note) {
            note.textContent = 'Oppose is the bottom two rungs of each 1–5 ' +
                'scale, support the top two; the neutral middle is drawn split ' +
                'either side of zero. Response bases run from ' +
                fmtInt(909) + ' answers on Q71 down to ' + fmtInt(522) +
                ' on Q97 and Q124 — percentages are shares of those who ' +
                'answered each question, not of all ' +
                fmtInt((D.meta.totals || {}).respondents || 1072) +
                ' respondents.';
        }
    }

    function fillStats(D) {
        var t = (D.meta && D.meta.totals) || {};
        if (t.respondents) setText('statRespondents', fmtInt(t.respondents));
        if (t.answers) setText('statAnswers', fmtInt(t.answers));
        if (t.redacted && t.respondents) {
            setText('statRedacted',
                (100 * t.redacted / t.respondents).toFixed(1) + '%');
        }
    }

    function boot() {
        if (!window.S2Data) return;
        S2Data.loadAll(FILES).then(function (D) {
            fillStats(D);
            drawHeadline(D);
        }).catch(function (err) {
            S2Data.errorPanel('headlineHolder', err, {
                title: 'The headline chart could not load its data.'
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
