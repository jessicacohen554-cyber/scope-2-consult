// ============================================================================
// voices-page.js — page module for voices.html (Themes & voices)
// ============================================================================
// Page-specific module (P33). Owns nothing shared: every visual it produces is
// drawn by ECStance / ECQuotes from styles/site.css classes, and the handful of
// layouts unique to this page are styled in voices.html's own <style> block.
//
// This survey has no reason picklists — 1,377 free-text answers carry the
// argument. So this page is the free-text record itself:
//
//   1. the coded theme taxonomy, grouped by polarity, raw vs template-dedup,
//      re-scopeable by topic, plus a per-question profile;
//   2. a filterable browser over every curated quote (topic x side x org type x
//      redaction x theme, plus a template-packs-only switch);
//   3. the template exhibit — the circulated response packs from integrity.json
//      as document cards, named members only, redacted members as counts;
//   4. how much each named respondent actually wrote (log-scale bands);
//   5. a short note on how the coding works, pointing at methodology.html.
//
// Contract shapes: PLAN.md §5 (themes.json, quotes.json, integrity.json,
// respondents.json, meta.json). Every one of them except meta.json is optional
// here: P22 can export with --allow-missing-curation, so a panel whose input is
// absent hides itself, leaves an HTML comment saying why, and is listed in the
// warning box at the top of the page. Nothing is ever faked in.
//
// PLAN gotcha 15 / DESIGN_SYSTEM law 14 apply throughout: redacted respondents
// are never named, junk and superseded respondents never appear (the exclusion
// list in integrity.json is enforced again here, client-side, rather than
// trusted), and every count carries its base.
// ============================================================================

(function () {
    'use strict';

    // --- Page vocabulary -----------------------------------------------------
    // meta.json labels questions but not topics, so the display names for the
    // five topic families live here. Unknown keys fall back to the humanized
    // key; the topic -> page link is read from meta.questions[].page.
    var TOPIC_LABELS = {
        general: 'General feedback',
        formula: 'Formula & scope',
        additionality: 'Additionality',
        emission_rates: 'Marginal emission rates',
        weighting: 'BM/OM weighting',
        profile: 'Respondent profile'
    };

    // Polarity definitions quoted from reference/theme_taxonomy.md's coding
    // rule 5 — polarity is a property of the theme, never of the respondent.
    var POLARITY_GROUPS = [
        {
            key: 'concern',
            title: 'Concerns',
            blurb: 'Names a problem or risk of consequential accounting, or of ' +
                   'the proposal as drafted.'
        },
        {
            key: 'design',
            title: 'Design asks',
            blurb: 'Prescribes how the standard should be built — the ' +
                   'constructive half of the record.'
        },
        {
            key: 'support',
            title: 'Support',
            blurb: 'Argues the value of consequential accounting or of a ' +
                   'proposed element.'
        },
        {
            key: 'neutral',
            title: 'Context',
            blurb: 'Contextual or informational content that takes no side.'
        }
    ];

    // A polarity group this large gets a full-width panel; smaller ones pair up.
    var WIDE_GROUP_MIN = 7;

    // Log-scale bands for the verbosity distribution. Trailing empty bands are
    // trimmed at draw time so the ladder ends where the record ends.
    var CHAR_BANDS = [
        { lo: 1, hi: 1000, label: 'under 1k' },
        { lo: 1000, hi: 3000, label: '1k – 3k' },
        { lo: 3000, hi: 10000, label: '3k – 10k' },
        { lo: 10000, hi: 30000, label: '10k – 30k' },
        { lo: 30000, hi: 100000, label: '30k – 100k' },
        { lo: 100000, hi: Infinity, label: '100k and over' }
    ];

    var QUOTE_PARAMS = ['qtopic', 'qside', 'qorg', 'qred', 'qtheme', 'qtpl', 'qall'];

    // The browser holds every curated quote, which is a very tall page at full
    // size. Show a first screenful and let the reader ask for the rest; the
    // filters are the real navigation.
    var QUOTES_PER_COLUMN = 8;
    var QUOTES_SINGLE = 20;

    // --- State ---------------------------------------------------------------
    var D = {};              // meta / themes / quotes / integrity / respondents
    var TAX = [];            // themes.json taxonomy
    var TAX_BY_KEY = {};
    var QID_TOPIC = {};      // "Q020" -> "formula"
    var QID_ORDER = {};      // "Q020" -> survey position
    var TOPIC_PAGE = {};     // "formula" -> "topics/formula.html"
    var TOPICS = [];         // topic keys in survey order
    var QUOTES = [];         // flattened quotes.json, exclusions enforced
    var EXCLUDED = {};       // respondent_id -> exclusion reason
    var DEGRADED = [];       // human-readable list of the panels we hid
    var DROPPED = {};        // message -> true, for anything the filter caught
    var verbosityChart = null;

    // --- Small helpers -------------------------------------------------------
    function esc(s) {
        return window.ECData ? ECData.escapeHtml(s)
            : String(s === null || s === undefined ? '' : s);
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function fmtInt(n) {
        return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function fmtPct(v) {
        return (Math.round((v || 0) * 10) / 10).toFixed(1) + '%';
    }

    function pct1(part, base) {
        if (!base) return 0;
        return Math.round((part / base) * 1000 + 1e-9) / 10;
    }

    function humanize(key) {
        return String(key || '').replace(/_/g, ' ');
    }

    function topicLabel(key) {
        if (!key) return 'Untagged';
        return TOPIC_LABELS[key] || humanize(key);
    }

    function qDisplay(qid) {
        return (window.ECData && ECData.display(D.meta, qid)) || String(qid || '');
    }

    // Sort a list of qids into survey order; unknown ones trail alphabetically.
    function sortQids(qids) {
        return (qids || []).slice().sort(function (a, b) {
            var oa = QID_ORDER[a], ob = QID_ORDER[b];
            if (oa === undefined && ob === undefined) return a < b ? -1 : a > b ? 1 : 0;
            if (oa === undefined) return 1;
            if (ob === undefined) return -1;
            return oa - ob;
        });
    }

    // A panel whose input never arrived is hidden, not filled with zeros. The
    // HTML comment is for whoever views source wondering where the panel went;
    // the warning box at the top of the page is for everyone else.
    function hidePanel(id, reason) {
        var el = byId(id);
        DEGRADED.push(reason);
        if (!el) return;
        el.hidden = true;
        if (el.parentNode) {
            el.parentNode.insertBefore(
                document.createComment(' voices.html: #' + id +
                    ' hidden — ' + reason + ' '),
                el
            );
        }
    }

    function paintDegradedNote() {
        var el = byId('degradedNote');
        if (!el) return;
        var dropped = Object.keys(DROPPED);
        if (!DEGRADED.length && !dropped.length) return;
        var html = '';
        if (DEGRADED.length) {
            html += '<strong>Some panels are not shown.</strong> This export ' +
                'does not carry everything this page renders, so the affected ' +
                'panels are hidden rather than filled in:<ul>' +
                DEGRADED.map(function (d) {
                    return '<li>' + esc(d) + '</li>';
                }).join('') + '</ul>';
        }
        if (dropped.length) {
            html += '<p>' + dropped.length + ' excluded respondent record(s) ' +
                'were filtered out of this page: ' + esc(dropped.join('; ')) +
                '.</p>';
        }
        el.innerHTML = html;
        el.hidden = false;
    }

    // --- Indexing ------------------------------------------------------------
    function indexMeta() {
        var qs = (D.meta && D.meta.questions) || [];
        var seen = {};
        qs.forEach(function (q, i) {
            if (!q || !q.qid) return;
            QID_ORDER[q.qid] = i;
            if (q.topic) {
                QID_TOPIC[q.qid] = q.topic;
                if (q.page && !TOPIC_PAGE[q.topic]) TOPIC_PAGE[q.topic] = q.page;
                if (!seen[q.topic]) { seen[q.topic] = true; TOPICS.push(q.topic); }
            }
        });
    }

    function indexTaxonomy() {
        TAX = (D.themes && D.themes.taxonomy) || [];
        TAX_BY_KEY = {};
        TAX.forEach(function (t) { if (t && t.key) TAX_BY_KEY[t.key] = t; });
    }

    // PLAN §5 promises the exporter already dropped junk and superseded
    // respondents from every aggregate, quote and org file. This re-checks it
    // against integrity.json's own exclusion list rather than taking it on
    // trust — and rather than hardcoding respondent ids, which would rot.
    function indexExclusions() {
        ((D.integrity && D.integrity.excluded) || []).forEach(function (e) {
            if (e && e.id !== undefined && e.id !== null) {
                EXCLUDED[String(e.id)] = e.reason || 'excluded';
            }
        });
        var dropped = (D.integrity && D.integrity.resubmission &&
                       D.integrity.resubmission.dropped);
        if (dropped !== undefined && dropped !== null) {
            EXCLUDED[String(dropped)] = EXCLUDED[String(dropped)] || 'superseded';
        }
    }

    function isExcluded(id, where) {
        if (id === undefined || id === null) return false;
        var reason = EXCLUDED[String(id)];
        if (!reason) return false;
        DROPPED['#' + id + ' (' + reason + ') from ' + where] = true;
        return true;
    }

    // --- Hero stats ----------------------------------------------------------
    function drawStats() {
        var el = byId('voicesStats');
        if (!el) return;
        var totals = (D.meta && D.meta.totals) || {};
        var cards = [];

        if (totals.free_text_answers !== undefined) {
            cards.push([fmtInt(totals.free_text_answers), 'Free-text answers']);
        }
        if (TAX.length) {
            cards.push([fmtInt(TAX.length), 'Themes in the taxonomy']);
        }
        var coded = codedTotals('all');
        if (coded.n_texts) {
            cards.push([fmtPct(pct1(coded.n_coded, coded.n_texts)),
                        'Answers carrying a theme']);
        }
        if (QUOTES.length) {
            cards.push([fmtInt(QUOTES.length), 'Curated quotes']);
        }
        var packs = (D.integrity && D.integrity.blocs) || [];
        if (packs.length) {
            var members = packs.reduce(function (m, b) {
                return m + namedMembers(b).length + (b.n_redacted || 0);
            }, 0);
            cards.push([fmtInt(members),
                        'Respondents in ' + packs.length + ' response pack' +
                        (packs.length === 1 ? '' : 's')]);
        }

        if (!cards.length) {
            el.hidden = true;
            return;
        }
        el.innerHTML = cards.map(function (c) {
            return '<div class="stat-card"><div class="stat-value">' + esc(c[0]) +
                '</div><div class="stat-label">' + esc(c[1]) + '</div></div>';
        }).join('');
    }

    // --- Theme aggregation ---------------------------------------------------
    // Mentions, not respondents: an answer that argues a theme in three
    // different questions counts three times. That is what "total mentions"
    // means on this page and the caption says so.
    function aggregate(topicKey) {
        var byQ = (D.themes && D.themes.by_question) || {};
        var totals = {};
        var nTexts = 0, nCoded = 0, nQuestions = 0, qids = [];

        Object.keys(byQ).forEach(function (qid) {
            if (topicKey && topicKey !== 'all' && QID_TOPIC[qid] !== topicKey) return;
            var block = byQ[qid] || {};
            nQuestions += 1;
            qids.push(qid);
            nTexts += block.n_texts || 0;
            nCoded += block.n_coded || 0;
            (block.themes || []).forEach(function (t) {
                if (!t || !t.key) return;
                var e = totals[t.key];
                if (!e) {
                    e = totals[t.key] = { key: t.key, n: 0, n_dedup: 0, dedup: false };
                }
                e.n += t.n || 0;
                if (t.n_dedup !== undefined && t.n_dedup !== null) {
                    e.n_dedup += t.n_dedup;
                    e.dedup = true;
                }
            });
        });

        var themes = Object.keys(totals).map(function (k) {
            var e = totals[k];
            var out = { key: k, n: e.n, share_pct: pct1(e.n, nTexts) };
            if (e.dedup) out.n_dedup = e.n_dedup;
            return out;
        });

        return {
            n_texts: nTexts,
            n_coded: nCoded,
            n_questions: nQuestions,
            qids: sortQids(qids),
            themes: themes
        };
    }

    function codedTotals(topicKey) {
        var agg = aggregate(topicKey);
        return { n_texts: agg.n_texts, n_coded: agg.n_coded,
                 n_questions: agg.n_questions };
    }

    // Which topics actually carry coded questions — the toggle only offers
    // scopes that have something in them.
    function codedTopics() {
        var byQ = (D.themes && D.themes.by_question) || {};
        var present = {};
        Object.keys(byQ).forEach(function (qid) {
            present[QID_TOPIC[qid] || 'untagged'] = true;
        });
        var ordered = TOPICS.filter(function (t) { return present[t]; });
        Object.keys(present).forEach(function (t) {
            if (ordered.indexOf(t) < 0) ordered.push(t);
        });
        return ordered;
    }

    function drawThemeOverview() {
        var host = byId('themeGroups');
        var scope = byId('themeScope');
        if (!host) return;

        var topicKey = ECSegments.get('ttopic', 'all');
        var agg = aggregate(topicKey);

        if (scope) {
            var link = topicKey !== 'all' && TOPIC_PAGE[topicKey]
                ? ' <a class="ec-strip-link" href="' + esc(TOPIC_PAGE[topicKey]) +
                  '">Open the ' + esc(topicLabel(topicKey)) + ' page &rarr;</a>'
                : '';
            scope.innerHTML =
                '<strong>' + esc(topicKey === 'all' ? 'All topics'
                                                    : topicLabel(topicKey)) +
                '</strong> — ' + agg.n_questions + ' coded question' +
                (agg.n_questions === 1 ? '' : 's') + ' (' +
                esc(agg.qids.map(qDisplay).join(', ')) + '), ' +
                fmtInt(agg.n_texts) + ' free-text answers, ' +
                fmtInt(agg.n_coded) + ' of them carrying at least one theme, ' +
                agg.themes.length + ' of the ' + TAX.length +
                ' taxonomy keys used.' + link;
        }

        // Split the four polarity groups into full-width and paired panels by
        // how many themes each actually has in this scope.
        var groups = POLARITY_GROUPS.map(function (g) {
            var themes = agg.themes.filter(function (t) {
                var def = TAX_BY_KEY[t.key];
                return def && def.polarity === g.key;
            });
            return { spec: g, themes: themes };
        }).filter(function (g) { return g.themes.length > 0; });

        // Taxonomy keys with no polarity (or a polarity outside the four PLAN
        // §5 declares) would otherwise vanish silently. Give them a group.
        var orphans = agg.themes.filter(function (t) {
            var def = TAX_BY_KEY[t.key];
            return !def || !def.polarity ||
                POLARITY_GROUPS.every(function (g) { return g.key !== def.polarity; });
        });
        if (orphans.length) {
            groups.push({
                spec: {
                    key: 'other',
                    title: 'Unclassified',
                    blurb: 'Taxonomy keys the export gives no polarity for.'
                },
                themes: orphans
            });
        }

        if (!groups.length) {
            host.innerHTML = '<div class="card ec-empty">No coded themes for ' +
                'this topic.</div>';
            return;
        }

        var wide = groups.filter(function (g) {
            return g.themes.length >= WIDE_GROUP_MIN;
        });
        var narrow = groups.filter(function (g) {
            return g.themes.length < WIDE_GROUP_MIN;
        });

        function panelHtml(g) {
            return '<div class="chart-panel scroll-reveal">' +
                '<h3 class="chart-title">' + esc(g.spec.title) +
                ' <span class="ec-base-chip">' + g.themes.length + ' theme' +
                (g.themes.length === 1 ? '' : 's') + '</span></h3>' +
                '<p class="chart-subtitle">' + esc(g.spec.blurb) + '</p>' +
                '<div id="themeGroup-' + esc(g.spec.key) + '"></div></div>';
        }

        var html = wide.map(panelHtml).join('');
        if (narrow.length >= 2) {
            html += '<div class="grid-2col">' + narrow.map(panelHtml).join('') +
                '</div>';
        } else {
            html += narrow.map(panelHtml).join('');
        }
        host.innerHTML = html;

        groups.forEach(function (g) {
            var hostId = 'themeGroup-' + g.spec.key;
            ECStance.renderThemes('#' + hostId, {
                n_texts: agg.n_texts,
                n_coded: agg.n_coded,
                themes: g.themes
            }, {
                taxonomy: TAX,
                label: g.spec.title + ' — ' +
                    (topicKey === 'all' ? 'all topics' : topicLabel(topicKey))
            });
            // ECStance.renderThemes closes with a caption phrased for a single
            // question ("...answers to this question"). That is exactly right on
            // the per-question panel below, and wrong here, where the block
            // pools every coded question in scope. The renderer takes no option
            // for it, so restate the base rather than leave a false one on
            // screen. (A `baseNote` option in stance-viz.js would retire this —
            // flagged for P42; this page does not edit shared modules.)
            var panel = byId(hostId);
            var caption = panel && panel.querySelector('.ec-note');
            if (caption) {
                caption.innerHTML = 'Mentions out of the <strong>' +
                    fmtInt(agg.n_texts) + '</strong> free-text answers in this ' +
                    'scope (' + agg.n_questions + ' question' +
                    (agg.n_questions === 1 ? '' : 's') + '; ' +
                    fmtInt(agg.n_coded) + ' carried at least one theme). The ' +
                    'inner bar collapses template-cluster members to one voice.';
            }
        });
    }

    // --- Per-question theme profile -----------------------------------------
    function buildQuestionPicker() {
        var host = byId('themeQuestionField');
        if (!host) return false;
        var byQ = (D.themes && D.themes.by_question) || {};
        var qids = sortQids(Object.keys(byQ));
        if (!qids.length) return false;

        var current = ECSegments.get('tq', qids[0]);
        if (qids.indexOf(current) < 0) current = qids[0];

        host.innerHTML =
            '<label class="ec-control-label" for="themeQuestion">Question</label>' +
            '<select class="ec-select" id="themeQuestion">' +
            qids.map(function (qid) {
                var q = (window.ECData && ECData.question(D.meta, qid)) || {};
                var block = byQ[qid] || {};
                return '<option value="' + esc(qid) + '"' +
                    (qid === current ? ' selected' : '') + '>' +
                    esc(qDisplay(qid) + ' — ' + (q.label || q.shorthand || qid) +
                        ' (n=' + (block.n_texts || 0) + ')') +
                    '</option>';
            }).join('') + '</select>';

        var sel = byId('themeQuestion');
        sel.addEventListener('change', function () {
            ECSegments.set('tq', sel.value);
        });
        return true;
    }

    function drawThemeQuestion() {
        var host = byId('themesByQuestion');
        if (!host) return;
        var byQ = (D.themes && D.themes.by_question) || {};
        var qids = sortQids(Object.keys(byQ));
        var qid = ECSegments.get('tq', qids[0]);
        if (qids.indexOf(qid) < 0) qid = qids[0];
        if (!qid) return;

        var q = (window.ECData && ECData.question(D.meta, qid)) || {};
        var topic = QID_TOPIC[qid];
        var note = byId('themeQuestionNote');
        if (note) {
            note.innerHTML = '<strong>' + esc(qDisplay(qid)) + '</strong> ' +
                esc(q.label || q.shorthand || '') +
                (topic ? ' · ' + esc(topicLabel(topic)) : '') +
                (q.doc_section ? ' · consultation §' + esc(q.doc_section) : '') +
                (topic && TOPIC_PAGE[topic]
                    ? ' <a class="ec-strip-link" href="' + esc(TOPIC_PAGE[topic]) +
                      '">Open the topic page &rarr;</a>'
                    : '');
        }

        ECStance.renderThemes(host, byQ[qid], {
            taxonomy: TAX,
            label: qDisplay(qid) + ' themes',
            emptyText: 'No themes coded for ' + qDisplay(qid) + '.'
        });
    }

    // --- Quote browser -------------------------------------------------------
    function flattenQuotes() {
        if (!D.quotes || !window.ECQuotes) return [];
        return ECQuotes.flatten(D.quotes).filter(function (q) {
            return !isExcluded(q.respondent_id, 'the quote browser');
        });
    }

    function distinctOrgTypes() {
        var seen = {}, out = [];
        QUOTES.forEach(function (q) {
            if (q.org_type && !seen[q.org_type]) {
                seen[q.org_type] = true;
                out.push(q.org_type);
            }
        });
        out.sort(function (a, b) {
            return ECQuotes.orgLabel(a, D.meta)
                .localeCompare(ECQuotes.orgLabel(b, D.meta));
        });
        return out;
    }

    function distinctThemes() {
        var seen = {}, out = [];
        QUOTES.forEach(function (q) {
            (q.themes || []).forEach(function (t) {
                if (!seen[t]) { seen[t] = true; out.push(t); }
            });
        });
        out.sort(function (a, b) {
            var la = (TAX_BY_KEY[a] || {}).label || humanize(a);
            var lb = (TAX_BY_KEY[b] || {}).label || humanize(b);
            return la.localeCompare(lb);
        });
        return out;
    }

    function distinctQuoteTopics() {
        var seen = {}, out = [];
        QUOTES.forEach(function (q) {
            if (q.topic && !seen[q.topic]) { seen[q.topic] = true; out.push(q.topic); }
        });
        out.sort(function (a, b) {
            var ia = TOPICS.indexOf(a), ib = TOPICS.indexOf(b);
            if (ia < 0) ia = 99;
            if (ib < 0) ib = 99;
            return ia - ib;
        });
        return out;
    }

    // One <select> in the shared .ec-field / .ec-select shape, URL-backed.
    function selectField(hostId, param, label, options) {
        var host = byId(hostId);
        if (!host) return;
        var current = ECSegments.get(param, 'all');
        var known = options.some(function (o) { return o.key === current; });
        if (!known) current = 'all';
        var id = hostId + 'Select';

        host.innerHTML = '<label class="ec-control-label" for="' + esc(id) + '">' +
            esc(label) + '</label><select class="ec-select" id="' + esc(id) + '">' +
            options.map(function (o) {
                return '<option value="' + esc(o.key) + '"' +
                    (o.key === current ? ' selected' : '') + '>' +
                    esc(o.label) + '</option>';
            }).join('') + '</select>';

        var sel = byId(id);
        sel.addEventListener('change', function () {
            // 'all' is the default, so it leaves the URL rather than sitting
            // in it — every other value makes the view a shareable link.
            ECSegments.set(param, sel.value === 'all' ? null : sel.value);
        });
    }

    function buildQuoteControls() {
        var topics = distinctQuoteTopics();
        selectField('qTopic', 'qtopic', 'Topic',
            [{ key: 'all', label: 'All topics (' + QUOTES.length + ')' }].concat(
                topics.map(function (t) {
                    var n = QUOTES.filter(function (q) { return q.topic === t; }).length;
                    return { key: t, label: topicLabel(t) + ' (' + n + ')' };
                })));

        ECSegments.toggle('#qSide', {
            param: 'qside',
            label: 'Side',
            def: 'all',
            options: [
                { key: 'all', label: 'All' },
                { key: 'for', label: ECQuotes.SIDE_TITLES['for'] },
                { key: 'against', label: ECQuotes.SIDE_TITLES.against },
                { key: 'context', label: ECQuotes.SIDE_TITLES.context }
            ]
        });

        selectField('qOrg', 'qorg', 'Organization type',
            [{ key: 'all', label: 'All organization types' }].concat(
                distinctOrgTypes().map(function (t) {
                    return { key: t, label: ECQuotes.orgLabel(t, D.meta) };
                })));

        ECSegments.toggle('#qRed', {
            param: 'qred',
            label: 'Attribution',
            def: 'all',
            options: [
                { key: 'all', label: 'All' },
                { key: 'named', label: 'Named' },
                { key: 'redacted', label: 'Redacted' }
            ]
        });

        selectField('qTheme', 'qtheme', 'Theme',
            [{ key: 'all', label: 'Any theme' }].concat(
                distinctThemes().map(function (t) {
                    var def = TAX_BY_KEY[t] || {};
                    var n = QUOTES.filter(function (q) {
                        return (q.themes || []).indexOf(t) >= 0;
                    }).length;
                    return { key: t, label: (def.label || humanize(t)) + ' (' + n + ')' };
                })));

        ECSegments.switchToggle('#qTemplate', {
            param: 'qtpl',
            label: 'Response packs',
            onLabel: 'Template text only',
            offLabel: 'All quotes',
            def: false
        });

        var more = byId('quoteMore');
        if (more && !more.ecWired) {
            more.ecWired = true;
            more.addEventListener('click', function (ev) {
                if (!ev.target.closest('[data-quote-more]')) return;
                ECSegments.set('qall',
                    ECSegments.getBool('qall', false) ? null : '1');
            });
        }
    }

    function currentQuoteCriteria() {
        return {
            topic: ECSegments.get('qtopic', 'all'),
            side: ECSegments.get('qside', 'all'),
            org_type: ECSegments.get('qorg', 'all'),
            redaction: ECSegments.get('qred', 'all'),
            theme: ECSegments.get('qtheme', 'all'),
            template: ECSegments.getBool('qtpl', false) ? true : undefined
        };
    }

    function drawQuotes() {
        var host = byId('quoteBrowser');
        var status = byId('quoteStatus');
        if (!host) return;

        var criteria = currentQuoteCriteria();
        var list = ECQuotes.filter(QUOTES, criteria);
        var side = criteria.side;
        var showAll = ECSegments.getBool('qall', false);

        var active = [];
        if (criteria.topic !== 'all') active.push(topicLabel(criteria.topic));
        if (side !== 'all') active.push(ECQuotes.SIDE_TITLES[side] || side);
        if (criteria.org_type !== 'all') {
            active.push(ECQuotes.orgLabel(criteria.org_type, D.meta));
        }
        if (criteria.redaction !== 'all') active.push(criteria.redaction);
        if (criteria.theme !== 'all') {
            active.push((TAX_BY_KEY[criteria.theme] || {}).label ||
                humanize(criteria.theme));
        }
        if (criteria.template) active.push('shared template text only');

        var emptyText = 'No curated quote matches this combination of filters.';
        var shown = 0;

        if (side === 'all') {
            var sides = { 'for': [], against: [], context: [] };
            list.forEach(function (q) {
                if (sides[q.side]) sides[q.side].push(q);
            });
            if (!showAll) {
                Object.keys(sides).forEach(function (k) {
                    sides[k] = sides[k].slice(0, QUOTES_PER_COLUMN);
                });
            }
            shown = sides['for'].length + sides.against.length +
                sides.context.length;
            host.classList.remove('voices-quotes-single');
            host.innerHTML = '';
            ECQuotes.renderTriad(host, sides, {
                meta: D.meta,
                taxonomy: TAX,
                emptyText: emptyText
            });
        } else {
            var one = showAll ? list : list.slice(0, QUOTES_SINGLE);
            shown = one.length;
            // One side is one column, and a full-bleed column of quote cards is
            // unreadable at desktop width — hold it to a prose measure.
            host.classList.remove('ec-quote-triad');
            host.classList.add('voices-quotes-single');
            ECQuotes.render(host, one, {
                meta: D.meta,
                taxonomy: TAX,
                title: ECQuotes.SIDE_TITLES[side] || side,
                emptyText: emptyText
            });
        }

        if (status) {
            status.innerHTML = 'Showing <strong>' + shown + '</strong> of ' +
                (list.length === QUOTES.length
                    ? QUOTES.length + ' curated quote' +
                      (QUOTES.length === 1 ? '' : 's')
                    : list.length + ' matching quote' +
                      (list.length === 1 ? '' : 's') + ', out of ' +
                      QUOTES.length + ' curated') +
                (active.length ? ' — ' + esc(active.join(' · ')) : '') + '.' +
                (list.length ? '' : ' Nothing matches this combination; widen ' +
                    'a filter.');
        }

        var more = byId('quoteMore');
        if (more) {
            if (shown < list.length) {
                more.innerHTML = '<button type="button" class="btn-pill" ' +
                    'data-quote-more>Show all ' + list.length + ' &darr;</button>';
                more.hidden = false;
            } else if (showAll && list.length > QUOTES_PER_COLUMN) {
                more.innerHTML = '<button type="button" class="btn-pill" ' +
                    'data-quote-more>Show fewer &uarr;</button>';
                more.hidden = false;
            } else {
                more.innerHTML = '';
                more.hidden = true;
            }
        }
    }

    // --- The template exhibit ------------------------------------------------
    function namedMembers(bloc) {
        return (bloc.member_ids_named || []).filter(function (m) {
            return m && !isExcluded(m.id, 'a response pack member list');
        });
    }

    // integrity.json carries blocs and text clusters as separate lists, joined
    // only by shared membership. Match a cluster to a pack when they share a
    // named respondent; an all-redacted pack matches nothing and says so
    // rather than guessing.
    function clustersFor(bloc) {
        var ids = {};
        namedMembers(bloc).forEach(function (m) { ids[String(m.id)] = true; });
        return ((D.integrity && D.integrity.text_clusters) || []).filter(function (c) {
            return (c.named_members || []).some(function (m) {
                return m && ids[String(m.id)];
            });
        });
    }

    // The cluster previews in the export are the *normalized* form used for
    // matching (whitespace collapsed, case folded), not the submitted keystrokes.
    // It still looks like a quotation on screen, so say what it is.
    function passageHtml(cluster) {
        return '<blockquote class="ec-quote-text">' + esc(cluster.preview) +
            '</blockquote>' +
            '<p class="voices-pack-chips"><span class="ec-tag ec-tag-special">' +
            'normalized text, not verbatim</span></p>';
    }

    // Every shared passage in the record, longest first. This is where the
    // packs whose members are all redacted contribute their text: it is listed
    // as evidence of what circulated, without being attributed to a pack the
    // export gives no key to join on.
    function drawPassages() {
        var host = byId('packPassages');
        if (!host) return;
        var clusters = ((D.integrity && D.integrity.text_clusters) || [])
            .slice()
            .sort(function (a, b) { return (b.chars || 0) - (a.chars || 0); });
        if (!clusters.length) {
            host.hidden = true;
            return;
        }
        var show = clusters.slice(0, 6);
        host.innerHTML = '<h3 class="chart-title">The longest shared passages' +
            ' <span class="ec-base-chip">' + show.length + ' of ' +
            clusters.length + '</span></h3>' +
            '<p class="chart-subtitle">Text that appears in more than one ' +
            'submission, longest first. A passage is listed here whether or not ' +
            'its filers can be named.</p>' +
            show.map(function (c) {
                var named = (c.named_members || []).filter(function (m) {
                    return m && !isExcluded(m.id, 'a shared-passage member list');
                });
                var qids = sortQids(c.qids || []);
                return '<div class="card voices-pack scroll-reveal">' +
                    '<p class="voices-pack-chips">' +
                    '<span class="ec-tag ec-tag-template">' +
                    (c.n_respondents || 0) + ' submissions</span>' +
                    '<span class="ec-tag">' + fmtInt(c.chars || 0) +
                    ' characters</span>' +
                    (qids.length
                        ? '<span class="ec-tag ec-tag-q">' +
                          esc(qids.map(qDisplay).join(' · ')) + '</span>'
                        : '') +
                    '</p>' +
                    passageHtml(c) +
                    '<p class="voices-pack-members">' +
                    (named.length
                        ? named.map(function (m) {
                            return '<a class="ec-tag ec-tag-family" href="' +
                                esc('respondents.html?org=' +
                                    encodeURIComponent(m.id)) + '">' +
                                esc(m.name) + '</a>';
                        }).join('')
                        : '') +
                    (c.n_redacted
                        ? '<span class="ec-tag ec-tag-special">' + c.n_redacted +
                          ' redacted filer' + (c.n_redacted === 1 ? '' : 's') +
                          ', never named</span>'
                        : '') +
                    '</p></div>';
            }).join('');
    }

    function drawPacks() {
        var host = byId('packCards');
        if (!host) return;
        var blocs = ((D.integrity && D.integrity.blocs) || []).slice();
        if (!blocs.length) return;

        blocs.sort(function (a, b) {
            var na = namedMembers(a).length + (a.n_redacted || 0);
            var nb = namedMembers(b).length + (b.n_redacted || 0);
            if (nb !== na) return nb - na;
            return (b.shared_texts || 0) - (a.shared_texts || 0);
        });

        host.innerHTML = blocs.map(function (b) {
            var named = namedMembers(b);
            var nRedacted = b.n_redacted || 0;
            var total = named.length + nRedacted;
            var clusters = clustersFor(b);

            var qids = {};
            clusters.forEach(function (c) {
                (c.qids || []).forEach(function (q) { qids[q] = true; });
            });
            var qidList = sortQids(Object.keys(qids));

            var longest = null;
            clusters.forEach(function (c) {
                if (!longest || (c.chars || 0) > (longest.chars || 0)) longest = c;
            });

            var html = '<article class="card voices-pack scroll-reveal">' +
                '<h3 class="chart-title">' + esc(b.label || humanize(b.key)) +
                '</h3>' +
                '<p class="voices-pack-chips">' +
                '<span class="ec-tag ec-tag-template">' + total +
                ' respondent' + (total === 1 ? '' : 's') + '</span>' +
                (b.shared_texts !== undefined
                    ? '<span class="ec-tag">' + b.shared_texts +
                      ' shared text' + (b.shared_texts === 1 ? '' : 's') + '</span>'
                    : '') +
                (clusters.length
                    ? '<span class="ec-tag">' + clusters.length +
                      ' matched passage' + (clusters.length === 1 ? '' : 's') +
                      '</span>'
                    : '') +
                (qidList.length
                    ? '<span class="ec-tag ec-tag-q">' +
                      esc(qidList.map(qDisplay).join(' · ')) + '</span>'
                    : '') +
                '</p>';

            if (longest && longest.preview) {
                html += passageHtml(longest) +
                    '<p class="ec-note">The longest shared passage in this pack ' +
                    'runs ' + fmtInt(longest.chars || 0) + ' characters and ' +
                    'appears in ' + (longest.n_respondents || 0) +
                    ' submissions.</p>';
            } else if (!named.length && nRedacted) {
                // A pack whose every member is redacted has no named member to
                // join its clusters on — integrity.json gives blocs no cluster
                // key — so the passage cannot be attributed to this pack without
                // guessing. The passages themselves are listed below instead.
                html += '<p class="ec-note">Every member of this pack requested ' +
                    'redaction. The pack is counted, no member is named, and its ' +
                    'shared passage is not matched to it here — the export offers ' +
                    'no way to link a pack to its text except through a named ' +
                    'member. The passages are listed below.</p>';
            } else {
                html += '<p class="ec-note">This export carries no matching ' +
                    'shared-text passage for this pack, so none is shown.</p>';
            }

            html += '<h4 class="ec-subhead">Members</h4>' +
                '<p class="voices-pack-members">' +
                (named.length
                    ? named.map(function (m) {
                        return '<a class="ec-tag ec-tag-family" href="' +
                            esc('respondents.html?org=' +
                                encodeURIComponent(m.id)) + '">' +
                            esc(m.name) + '</a>';
                    }).join('')
                    : '<span class="ec-tag ec-tag-none">no named members</span>') +
                (nRedacted
                    ? '<span class="ec-tag ec-tag-special">+ ' + nRedacted +
                      ' redacted, never named</span>'
                    : '') +
                '</p></article>';
            return html;
        }).join('');

        var note = byId('packNote');
        if (note) {
            var clusters = (D.integrity && D.integrity.text_clusters) || [];
            var respondentsInClusters = {};
            clusters.forEach(function (c) {
                (c.named_members || []).forEach(function (m) {
                    respondentsInClusters[String(m.id)] = true;
                });
            });
            note.innerHTML = fmtInt(clusters.length) + ' shared-text cluster' +
                (clusters.length === 1 ? '' : 's') + ' in the record, ' +
                'resolving into <strong>' + blocs.length + '</strong> connected ' +
                'response pack' + (blocs.length === 1 ? '' : 's') + '. ' +
                'A pack is a group of respondents who filed the same passages, ' +
                'not an accusation: circulating a template is ordinary advocacy. ' +
                'It matters because identical text is one argument filed several ' +
                'times, which is why every theme count on this page also carries ' +
                'a template-deduplicated figure. The effect on the headline ' +
                'stances is tabulated on the ' +
                '<a href="integrity.html">integrity page</a>.';
        }
    }

    // --- Verbosity -----------------------------------------------------------
    function verbosityRows() {
        var idx = (D.respondents && D.respondents.org_index) || [];
        return idx.filter(function (r) {
            return r && r.ft_chars !== undefined && r.ft_chars !== null &&
                !isExcluded(r.id, 'the verbosity distribution');
        });
    }

    function median(values) {
        if (!values.length) return 0;
        var a = values.slice().sort(function (x, y) { return x - y; });
        var m = Math.floor(a.length / 2);
        return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2);
    }

    function drawVerbosity() {
        var rows = verbosityRows();
        if (!rows.length) return;

        var chars = rows.map(function (r) { return r.ft_chars || 0; });
        var bands = CHAR_BANDS.map(function (b) {
            return {
                label: b.label,
                n: chars.filter(function (c) { return c >= b.lo && c < b.hi; }).length
            };
        });
        var zero = chars.filter(function (c) { return c <= 0; }).length;
        if (zero) bands.unshift({ label: 'no free text', n: zero });
        while (bands.length && bands[bands.length - 1].n === 0) bands.pop();

        var med = median(chars);
        var top = rows.slice().sort(function (a, b) {
            return (b.ft_chars || 0) - (a.ft_chars || 0);
        });
        var tail = top[0];

        // The canvas is the picture; the sr-only table is the data.
        ECStance.srTable('#verbositySr', {
            caption: 'Free-text characters written per named respondent, ' +
                'in log-scale bands',
            head: ['Band', 'Respondents'],
            rows: bands.map(function (b) { return [b.label, String(b.n)]; })
        });

        var canvas = byId('verbosityChart');
        if (canvas && typeof Chart === 'undefined') {
            // Without this the canvas stayed on the page as unexplained blank
            // space when the CDN failed (P35, Q4).
            ECStance.chartMissing(canvas, 'the verbosity distribution');
        } else if (canvas) {
            if (verbosityChart) verbosityChart.destroy();
            verbosityChart = new Chart(canvas.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: bands.map(function (b) { return b.label; }),
                    datasets: [{
                        label: 'Named respondents',
                        data: bands.map(function (b) { return b.n; }),
                        backgroundColor: withAlpha(RESOURCE_COLORS.hydro, 0.55),
                        borderColor: RESOURCE_COLORS.hydro,
                        borderWidth: 1
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function (ctx) {
                                    return ctx.parsed.x + ' of ' + rows.length +
                                        ' named respondents (' +
                                        fmtPct(pct1(ctx.parsed.x, rows.length)) + ')';
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            title: { display: true, text: 'Respondents' },
                            ticks: { precision: 0 }
                        },
                        y: { title: { display: true, text: 'Free-text characters' } }
                    }
                }
            });
        } else if (canvas) {
            var fallback = byId('verbosityFallback');
            if (fallback) {
                fallback.textContent = 'Chart.js did not load, so the band ' +
                    'chart is not drawn. The same numbers are in the data ' +
                    'table below.';
            }
        }

        var note = byId('verbosityNote');
        if (note) {
            var ratio = med ? (tail.ft_chars || 0) / med : 0;
            var allChars = chars.reduce(function (s, c) { return s + c; }, 0);
            var headN = 5;
            note.innerHTML =
                'Median named respondent: <strong>' + fmtInt(med) +
                '</strong> characters of free text. Longest: ' +
                (tail && tail.name
                    ? '<a href="' + esc('respondents.html?org=' +
                        encodeURIComponent(tail.id)) + '"><strong>' +
                      esc(tail.name) + '</strong></a>'
                    : '<strong>the longest filer</strong>') +
                ' at <strong>' + fmtInt(tail ? tail.ft_chars : 0) +
                '</strong> characters' +
                (ratio >= 1.5
                    ? ' — <strong>' + (Math.round(ratio * 10) / 10) +
                      '&times;</strong> the median'
                    : '') +
                '.' +
                // Only a meaningful claim when there is a tail to compare to.
                (rows.length > headN && allChars
                    ? ' The ' + headN + ' longest submissions carry ' +
                      fmtPct(pct1(top.slice(0, headN).reduce(function (s, r) {
                          return s + (r.ft_chars || 0);
                      }, 0), allChars)) + ' of every character counted here, ' +
                      'which is why the bands are log-scale.'
                    : '');
        }

        var list = byId('verbosityTop');
        if (list) {
            list.innerHTML = '<h4 class="ec-subhead">Longest submissions</h4>' +
                '<ul class="ec-answer-list">' +
                top.slice(0, 5).map(function (r) {
                    return '<li class="ec-answer">' +
                        '<span class="ec-answer-q">' + fmtInt(r.ft_chars) +
                        '</span><span class="ec-answer-body">' +
                        '<a class="ec-answer-label" href="' +
                        esc('respondents.html?org=' + encodeURIComponent(r.id)) +
                        '">' + esc(r.name) + '</a>' +
                        '<span class="ec-tag">' +
                        esc(ECQuotes.orgLabel(r.org_type, D.meta)) + '</span>' +
                        (r.template
                            ? '<span class="ec-tag ec-tag-template">template</span>'
                            : '') +
                        (r.cites
                            ? '<span class="ec-tag ec-tag-cite">cites sources</span>'
                            : '') +
                        '</span></li>';
                }).join('') + '</ul>';
        }

        var caveat = byId('verbosityCaveat');
        if (caveat) {
            var totalBase = (D.meta && D.meta.totals && D.meta.totals.respondents) || 0;
            caveat.innerHTML = 'Counted over the <strong>' + rows.length +
                '</strong> named respondents in the analytical base' +
                (totalBase ? ' of ' + totalBase : '') + '. The export publishes ' +
                'a per-respondent character count only for organizations that ' +
                'agreed to be named, so redacted respondents — a plurality of ' +
                'this consultation — are not in this chart. It is a picture of ' +
                'who wrote at length among those we can name, not of the whole ' +
                'record.';
        }
    }

    // --- How the coding works ------------------------------------------------
    function drawCoding() {
        var el = byId('codingNote');
        if (!el) return;
        var coded = codedTotals('all');
        var counts = {};
        TAX.forEach(function (t) {
            counts[t.polarity || 'unclassified'] =
                (counts[t.polarity || 'unclassified'] || 0) + 1;
        });
        var mix = Object.keys(counts).map(function (k) {
            return counts[k] + ' ' + humanize(k);
        }).join(' · ');

        el.innerHTML =
            '<h3 class="chart-title">How the coding works</h3>' +
            '<p>Every substantive free-text answer was read once and tagged ' +
            'against a <strong>closed vocabulary</strong> of ' +
            (TAX.length ? '<strong>' + TAX.length + '</strong> theme keys'
                        : 'theme keys') +
            (mix ? ' (' + esc(mix) + ')' : '') +
            ', fixed before the coding pass began. Coding is ' +
            '<strong>multi-label</strong>: an answer carries every theme it ' +
            'argues, so the mentions on this page add up to more than the ' +
            'number of answers. Codes come from what the answer says — never ' +
            'from the respondent&rsquo;s organization type, country or stance ' +
            'on the closed questions.</p>' +
            '<p>Answers whose normalized text is identical carry identical ' +
            'codes, because they are the same argument filed more than once. ' +
            'That is why every bar here has an inner bar: the outer one counts ' +
            'mentions, the inner one counts them again after collapsing each ' +
            'template cluster to a single voice. Where the two diverge, the ' +
            'theme is travelling on a circulated response pack.</p>' +
            (coded.n_texts
                ? '<p>Coverage: <strong>' + fmtInt(coded.n_coded) + '</strong> ' +
                  'of ' + fmtInt(coded.n_texts) + ' free-text answers across ' +
                  coded.n_questions + ' questions carry at least one theme (' +
                  fmtPct(pct1(coded.n_coded, coded.n_texts)) + '). The rest are ' +
                  '&ldquo;N/A&rdquo;, bare cross-references or empty courtesy ' +
                  'replies.</p>'
                : '') +
            '<p><a class="btn-pill" href="methodology.html">Full coding method, ' +
            'caveats and reproduction steps &rarr;</a></p>';
    }

    // --- Wiring --------------------------------------------------------------
    function onSegmentChange(ev) {
        var param = ev && ev.detail && ev.detail.param;
        if (param === 'ttopic') {
            drawThemeOverview();
        } else if (param === 'tq') {
            drawThemeQuestion();
        } else if (QUOTE_PARAMS.indexOf(param) >= 0) {
            drawQuotes();
        }
    }

    function buildThemeControls() {
        var topics = codedTopics();
        ECSegments.toggle('#themeTopic', {
            param: 'ttopic',
            label: 'Topic',
            def: 'all',
            options: [{ key: 'all', label: 'All topics' }].concat(
                topics.map(function (t) {
                    return { key: t, label: topicLabel(t) };
                }))
        });
    }

    function build() {
        indexMeta();
        indexTaxonomy();
        indexExclusions();
        QUOTES = flattenQuotes();

        var hasThemes = !!(D.themes && D.themes.by_question &&
            Object.keys(D.themes.by_question).length);
        var hasQuotes = QUOTES.length > 0;
        var hasPacks = !!(D.integrity && (D.integrity.blocs || []).length);
        var hasVerbosity = verbosityRows().length > 0;

        if (hasThemes) {
            buildThemeControls();
            drawThemeOverview();
            if (buildQuestionPicker()) {
                drawThemeQuestion();
            } else {
                hidePanel('themeQuestionPanel',
                    'themes.json carries no per-question blocks to profile');
            }
        } else {
            hidePanel('secThemes',
                'themes.json is absent or carries no by_question blocks — the ' +
                'theme taxonomy overview needs it (P21 curation + exporter rerun)');
            hidePanel('secCoding',
                'the how-coding-works note describes a taxonomy this export ' +
                'does not carry');
        }

        if (hasQuotes) {
            buildQuoteControls();
            drawQuotes();
        } else {
            hidePanel('secQuotes',
                'quotes.json is absent or empty — the quote browser has ' +
                'nothing to browse (P21 curation + exporter rerun)');
        }

        if (hasPacks) {
            drawPacks();
            drawPassages();
        } else {
            hidePanel('secPacks',
                'integrity.json carries no blocs — the template exhibit needs ' +
                'the response-pack list');
        }

        if (hasVerbosity) {
            drawVerbosity();
        } else {
            hidePanel('secVerbosity',
                'respondents.json carries no org_index entries with ft_chars — ' +
                'the verbosity distribution needs per-respondent character counts');
        }

        if (hasThemes) drawCoding();
        drawStats();
        paintDegradedNote();

        ECSegments.on(onSegmentChange);
    }

    function boot() {
        if (!window.ECData) return;
        ECData.load('meta').then(function (meta) {
            D.meta = meta;
            ECSegments.init(meta);
            // Everything except meta.json is optional: a missing file resolves
            // to null and hides its panel instead of failing the page.
            return ECData.loadOptional(
                ['themes', 'quotes', 'integrity', 'respondents']);
        }).then(function (rest) {
            D.themes = rest.themes;
            D.quotes = rest.quotes;
            D.integrity = rest.integrity;
            D.respondents = rest.respondents;
            build();
        }).catch(function (err) {
            // meta.json is the one file this page cannot do without: without it
            // there are no question labels, no topics and no segment vocabulary.
            // Show the loader's own failure panel and take the empty section
            // shells off the page rather than leaving headings over nothing.
            ['voicesStats', 'secThemes', 'secQuotes', 'secPacks',
             'secVerbosity', 'secCoding'].forEach(function (id) {
                var el = byId(id);
                if (el) el.hidden = true;
            });
            ECData.errorPanel('#loadError', err, {
                title: 'The free-text record could not be loaded'
            });
            if (window.console && console.error) console.error(err);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
