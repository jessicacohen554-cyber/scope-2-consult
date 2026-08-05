// ============================================================================
// index-page.js - the overview page (index.html)
// ============================================================================
// PLAN §4 assigns index.html to P40. P40 never merged: at P42 the file did not
// exist in any branch, so `Overview` in the nav and the footer 404'd from all
// nine other pages. P42 built the page rather than ship a site whose front door
// is broken. See the P42 report - the manager should review the prose in the
// assessment section specifically, since editorial judgment there was P40's
// brief and P40's model.
//
// Like every other page module, this one owns no figures. Each number in the
// hero row and in the assessment prose is stamped from the exported JSON at
// render time through `stat()` / `fig()`, so a re-export moves the page and a
// figure that disappears from the contract shows as a visible gap rather than
// as a stale hardcoded number. The panels are the shared renderers.
//
// Panels:
//   1. hero stat row        meta.totals + stances + integrity
//   2. headline strips      Q19 · Q21 · Q24            (ECStance.renderStrips)
//   3. gradient poles       matrix ends                (ECMatrix.renderMini)
//   4. the assessment       prose with stamped figures (PLAN §8)
//   5. takeaway cards       static links to all nine other pages
// ============================================================================

(function () {
    'use strict';

    var MASK_N = 5;
    var HEADLINE_QIDS = ['Q019', 'Q021', 'Q024'];
    var FILES = ['meta', 'stances', 'matrix', 'scoreboard', 'respondents',
                 'integrity'];

    var D = {};

    function el(id) { return document.getElementById(id); }

    function esc(s) { return ECData.escapeHtml(s); }

    function pct1(part, base) {
        return base ? Math.round((part / base) * 1000 + 1e-9) / 10 : 0;
    }

    function fmtPct(v) { return (Math.round(v * 10) / 10).toFixed(1) + '%'; }

    // Only the two totals reach four digits; everything else on this page is a
    // count under 200 and reads better bare.
    function group(n) {
        return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    // --- Figure stamping -----------------------------------------------------
    // Every `data-fig` in the HTML resolves through this table. A key with no
    // entry, or an entry that throws because the contract moved, renders as a
    // marked gap - never as a silent wrong number.
    function cell(qid) { return (D.stances[qid] || {}).overall || { c: [], n: 0 }; }

    function optIndex(qid, key) {
        var q = ECData.question(D.meta, qid) || {};
        var keys = (q.options || []).map(function (o) { return o.key; });
        return keys.indexOf(key);
    }

    function count(qid, key) {
        var i = optIndex(qid, key);
        return i < 0 ? null : (cell(qid).c || [])[i] || 0;
    }

    function share(qid, key) {
        var n = cell(qid).n;
        var c = count(qid, key);
        return c === null ? null : fmtPct(pct1(c, n));
    }

    function base(qid) { return cell(qid).n; }

    function seg(dim, key) {
        var values = ((D.meta.segments || {})[dim] || {}).values || [];
        for (var i = 0; i < values.length; i++) {
            if (values[i].key === key) return values[i].n;
        }
        return null;
    }

    function board(key) { return (D.scoreboard || {})[key] || {}; }

    function boardTop(key, end) {
        var opts = board(key).options || [];
        return opts.length ? opts[end === 'last' ? opts.length - 1 : 0] : null;
    }

    function net(qid) {
        var t = ((D.matrix.tests || {})[qid] || {});
        return typeof t.net_pct === 'number' ? t.net_pct : null;
    }

    function signed(v) {
        var r = Math.round(v * 10) / 10;
        return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toFixed(1);
    }

    function matrixQid(testKey) {
        var tests = ((D.meta.matrix || {}).tests) || [];
        for (var i = 0; i < tests.length; i++) {
            if (tests[i].key === testKey) return tests[i].qid;
        }
        return null;
    }

    function feas(testKey) {
        var per = ((D.matrix.feasibility || {}).per_test || {})[testKey];
        return per ? per.n : null;
    }

    function countryCell(qid, side) {
        var rows = D.respondents.country_effect || [];
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].qid === qid) return rows[i][side];
        }
        return null;
    }

    function countryShare(qid, side, key) {
        var c = countryCell(qid, side);
        var i = optIndex(qid, key);
        if (!c || i < 0 || !c.n) return null;
        return fmtPct(pct1(c.c[i] || 0, c.n));
    }

    function countryBase(qid, side) {
        var c = countryCell(qid, side);
        return c ? c.n : null;
    }

    function orgRedaction(key, side) {
        var rows = ((D.respondents.distributions || {})
            .org_type_x_redaction || {}).rows || [];
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].key === key) return rows[i][side];
        }
        return null;
    }

    function q52Rows() {
        return ((D.integrity.citations || {}).q52) || [];
    }

    function q52Blank() {
        return q52Rows().filter(function (row) {
            return /^\s*n\s*\/?\s*a\s*\.?\s*$/i.test(row.preview || '');
        }).length;
    }

    function attrition(which) {
        var rows = D.respondents.attrition || [];
        var answered = rows.filter(function (r) { return r.n > 0; });
        if (!answered.length) return null;
        return which === 'last' ? answered[answered.length - 1]
                                : answered[0];
    }

    var FIGURES = {
        // --- participation
        raw: function () { return D.meta.totals.respondents_raw; },
        analytical: function () { return D.meta.totals.respondents; },
        excluded: function () { return (D.integrity.excluded || []).length; },
        junk: function () {
            return (D.integrity.excluded || []).filter(function (e) {
                return e.reason === 'junk';
            }).length;
        },
        questions: function () { return D.meta.totals.questions; },
        answers: function () { return group(D.meta.totals.answers); },
        free_text: function () { return group(D.meta.totals.free_text_answers); },
        named: function () { return D.meta.totals.named; },
        redacted: function () { return D.meta.totals.redacted; },
        redacted_pct: function () {
            return fmtPct(pct1(D.meta.totals.redacted, D.meta.totals.respondents));
        },
        us: function () { return seg('country_4', 'us'); },
        us_pct: function () {
            return fmtPct(pct1(seg('country_4', 'us'), D.meta.totals.respondents));
        },
        attrition_top: function () { return (attrition('first') || {}).n; },
        attrition_top_q: function () { return (attrition('first') || {}).display; },
        attrition_end: function () { return (attrition('last') || {}).n; },
        attrition_end_q: function () { return (attrition('last') || {}).display; },

        // --- the headline
        q19_no: function () { return count('Q019', 'no'); },
        q19_yes: function () { return count('Q019', 'yes'); },
        q19_no_pct: function () { return share('Q019', 'no'); },
        q19_n: function () { return base('Q019'); },
        q19_us_no_pct: function () { return countryShare('Q019', 'us', 'no'); },
        q19_us_n: function () { return countryBase('Q019', 'us'); },
        q19_nonus_no_pct: function () {
            return countryShare('Q019', 'non_us', 'no');
        },
        q19_nonus_n: function () { return countryBase('Q019', 'non_us'); },

        // --- the splits
        q21_yes: function () { return count('Q021', 'yes'); },
        q21_no: function () { return count('Q021', 'no'); },
        q21_n: function () { return base('Q021'); },
        q24_pct: function () { return share('Q024', 'each_year'); },
        q24_each: function () { return count('Q024', 'each_year'); },
        q24_n: function () { return base('Q024'); },
        q24_us_pct: function () {
            return countryShare('Q024', 'us', 'each_year');
        },
        q24_us_n: function () { return countryBase('Q024', 'us'); },
        q24_nonus_pct: function () {
            return countryShare('Q024', 'non_us', 'each_year');
        },
        q24_nonus_n: function () { return countryBase('Q024', 'non_us'); },
        q31_yes: function () { return count('Q031', 'yes'); },
        q31_unsure: function () { return count('Q031', 'unsure'); },
        q31_no: function () { return count('Q031', 'no'); },
        q31_n: function () { return base('Q031'); },
        q33_yes: function () { return count('Q033', 'yes'); },
        q33_no: function () { return count('Q033', 'no'); },
        q33_n: function () { return base('Q033'); },
        q45_annual: function () { return count('Q045', 'annual'); },
        q45_hourly: function () { return count('Q045', 'hourly'); },
        q45_n: function () { return base('Q045'); },
        q43_n: function () { return base('Q043'); },

        // --- additionality
        net_regulatory: function () { return signed(net(matrixQid('regulatory'))); },
        net_timing: function () { return signed(net(matrixQid('timing'))); },
        net_first: function () { return signed(net(matrixQid('first_of_kind'))); },
        feas_n: function () { return (D.matrix.feasibility || {}).n; },
        feas_none: function () {
            return (((D.matrix.feasibility || {}).specials || {})
                .none_feasible || {}).n;
        },
        feas_regulatory: function () { return feas('regulatory'); },
        feas_timing: function () { return feas('timing'); },
        poslist_feas: function () { return feas('positive_list'); },
        poslist_feas_pct: function () {
            return fmtPct(pct1(feas('positive_list'),
                               (D.matrix.feasibility || {}).n));
        },
        poslist_req_pct: function () {
            var qid = matrixQid('positive_list');
            var c = ((D.matrix.tests || {})[qid] || {}).overall || {};
            return fmtPct(pct1((c.c || [])[0] || 0, c.n));
        },
        poslist_req_n: function () {
            var qid = matrixQid('positive_list');
            return (((D.matrix.tests || {})[qid] || {}).overall || {}).n;
        },
        poslist_gap: function () {
            var qid = matrixQid('positive_list');
            var c = ((D.matrix.tests || {})[qid] || {}).overall || {};
            return (pct1(feas('positive_list'), (D.matrix.feasibility || {}).n)
                - pct1((c.c || [])[0] || 0, c.n)).toFixed(1);
        },

        // --- scoreboards
        om_app: function () { return board('om').base_app; },
        om_not: function () { return board('om').base_not; },
        om_top: function () { return (boardTop('om') || {}).label; },
        om_top_net: function () { return signed((boardTop('om') || {}).net_pct); },
        om_last: function () { return (boardTop('om', 'last') || {}).label; },
        om_last_net: function () {
            return signed((boardTop('om', 'last') || {}).net_pct);
        },
        bm_app: function () { return board('bm').base_app; },
        bm_not: function () { return board('bm').base_not; },
        bm_top: function () { return (boardTop('bm') || {}).label; },
        bm_top_net: function () { return signed((boardTop('bm') || {}).net_pct); },
        bm_last: function () { return (boardTop('bm', 'last') || {}).label; },
        bm_last_net: function () {
            return signed((boardTop('bm', 'last') || {}).net_pct);
        },
        wt_app: function () { return board('weighting').base_app; },
        wt_not: function () { return board('weighting').base_not; },
        wt_top: function () { return (boardTop('weighting') || {}).label; },
        wt_top_net: function () {
            return signed((boardTop('weighting') || {}).net_pct);
        },
        wt_unsure_app: function () {
            var sp = (board('weighting').specials || []).filter(function (s) {
                return s.key === 'unsure' && s.side === 'app';
            });
            return sp.length ? sp[0].n : null;
        },
        wt_unsure_not: function () {
            var sp = (board('weighting').specials || []).filter(function (s) {
                return s.key === 'unsure' && s.side === 'not';
            });
            return sp.length ? sp[0].n : null;
        },

        // --- evidence, coordination, integrity
        q52_n: function () { return q52Rows().length; },
        q52_blank: function () { return q52Blank(); },
        q52_substantive: function () { return q52Rows().length - q52Blank(); },
        cite_named_pct: function () {
            var rows = ((D.integrity.citations || {}).by_redaction) || [];
            for (var i = 0; i < rows.length; i++) {
                if (rows[i].key === 'named') return fmtPct(rows[i].pct);
            }
            return null;
        },
        cite_redacted_pct: function () {
            var rows = ((D.integrity.citations || {}).by_redaction) || [];
            for (var i = 0; i < rows.length; i++) {
                if (rows[i].key === 'redacted') return fmtPct(rows[i].pct);
            }
            return null;
        },
        blocs: function () { return (D.integrity.blocs || []).length; },
        bloc_people: function () {
            return D.integrity.text_clusters_n_respondents;
        },
        clusters: function () { return (D.integrity.text_clusters || []).length; },
        big_bloc: function () {
            var b = (D.integrity.blocs || [])[0] || {};
            return (b.member_ids_named || []).length + (b.n_redacted || 0);
        },
        // The interpretive clause depends on facts that could change on a
        // re-export - whether every member is redacted, and whether they all
        // filed from one country - so it is assembled from the data rather than
        // written into the page and left to go stale. The country itself is
        // never named: for a pack of redacted filers that would be new
        // attribute disclosure (P35 F6).
        big_bloc_sentence: function () {
            var b = (D.integrity.blocs || [])[0];
            if (!b) return null;
            var named = (b.member_ids_named || []).length;
            var total = named + (b.n_redacted || 0);
            var parts = [];
            parts.push(named === 0 ? 'every one of them redacted'
                                   : b.n_redacted + ' of them redacted');
            if (b.single_country) {
                parts.push('and all filing from a single country — which makes ' +
                    'it coordination inside one jurisdiction rather than across ' +
                    'an industry');
            } else if (typeof b.n_countries === 'number') {
                parts.push('drawn from ' + b.n_countries + ' countries');
            }
            return total + ' respondents, ' + parts.join(', ');
        },
        q19_dedup_no: function () {
            var rows = D.integrity.dedup_effect || [];
            for (var i = 0; i < rows.length; i++) {
                if (rows[i].qid === 'Q019') return rows[i].deduped.c[1];
            }
            return null;
        },
        q21_dedup_no: function () {
            var rows = D.integrity.dedup_effect || [];
            for (var i = 0; i < rows.length; i++) {
                if (rows[i].qid === 'Q021') return rows[i].deduped.c[1];
            }
            return null;
        },
        company_redacted: function () { return orgRedaction('company', 'redacted'); },
        company_named: function () { return orgRedaction('company', 'named'); },
        company_total: function () { return orgRedaction('company', 'total'); }
    };

    function stampFigures(root) {
        var nodes = (root || document).querySelectorAll('[data-fig]');
        Array.prototype.forEach.call(nodes, function (node) {
            var key = node.getAttribute('data-fig');
            var fn = FIGURES[key];
            var value = null;
            if (fn) {
                try { value = fn(); } catch (err) { value = null; }
            }
            if (value === null || value === undefined || value === '') {
                node.textContent = '—';
                node.classList.add('ix-fig-missing');
                node.title = 'This figure is not in the current export.';
            } else {
                node.textContent = String(value);
            }
        });
    }

    // --- Panels --------------------------------------------------------------
    function drawStrips() {
        ECStance.renderStrips('#headlineStrips', {
            meta: D.meta,
            stances: D.stances,
            qids: HEADLINE_QIDS,
            dim: 'overall',
            maskN: MASK_N,
            label: 'The three closed questions',
            showLinks: true,
            pageBase: ''
        });
    }

    function drawMatrix() {
        ECMatrix.renderMini('#gradientPoles', {
            meta: D.meta,
            matrix: D.matrix,
            maskN: MASK_N,
            ends: 2,
            link: 'topics/additionality.html',
            pageBase: ''
        });
    }

    function drawStamp() {
        var stamp = el('exportStamp');
        if (!stamp) return;
        stamp.textContent = 'Every figure on this page is stamped from the ' +
            'exported dataset (' + ECData.basePath() + '), generated ' +
            (D.meta.generated || 'unknown') + '.' +
            (D.meta.provisional
                ? ' This export is marked provisional: curation inputs may still ' +
                  'be landing.'
                : '');
    }

    function start() {
        ECData.loadAll(FILES).then(function (loaded) {
            D = loaded;
            stampFigures();
            drawStrips();
            drawMatrix();
            drawStamp();
        }).catch(function (err) {
            ECData.errorPanel('#headlineStrips', err, {
                title: 'The overview could not load its data'
            });
            Array.prototype.forEach.call(
                document.querySelectorAll('.ec-loading'),
                function (node) {
                    node.textContent = 'Unavailable — the export could not be read.';
                });
            Array.prototype.forEach.call(
                document.querySelectorAll('[data-fig]'),
                function (node) {
                    node.textContent = '—';
                    node.classList.add('ix-fig-missing');
                });
            if (window.console && console.error) console.error(err);
        });
        void esc;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
