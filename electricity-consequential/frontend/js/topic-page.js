// ============================================================================
// ECTopicPage - the single config-driven renderer behind topics/*.html
// ============================================================================
// Site-specific module (not an upstream design-system file). One renderer, four
// pages: formula, additionality, emission-rates, weighting. Each page sets a
// `TOPIC_CONFIG` global and includes this file; nothing else about the four
// pages differs.
//
// It owns no visual grammar of its own. Every chart is drawn by the P11
// components (ECStance / ECMatrix / ECQuotes) and every class it writes is
// already defined in styles/shared.css or styles/site.css — this file adds no
// CSS and hand-writes no `.ec-*` component markup, per DESIGN_SYSTEM.md rules
// 1, 10 and 12.
//
// ---------------------------------------------------------------------------
// TOPIC_CONFIG
// ---------------------------------------------------------------------------
//   {
//     key:        'formula',              // page identity, used in log lines
//     root:       'topicPanels',          // element id the sections land in
//     controls:   {dim: 'dimToggle', seg: 'segToggle'},   // optional hosts
//     sections: [
//       {
//         id, title, subtitle, width: ''|'wide'|'narrow',
//         callout: {text, variant},       // .insight-glass under the panels
//         panels: [ <panel>, ... ]
//       }
//     ]
//   }
//
// A <panel> is `{kind, id, title, subtitle, note, decisionQid, link}` plus the
// fields its kind needs:
//
//   strips      qids:[qid,…]                  -> ECStance.renderStrips
//   matrix      segValue:bool                 -> ECMatrix.renderHeatmap
//   cross       -                             -> ECMatrix.renderCross
//   scoreboard  board:'om'|'bm'|'weighting',  -> ECStance.renderScoreboard
//               axis:{app,not}                   ({base} is substituted)
//   themes      questions:[{qid,title}]       -> ECStance.renderThemes
//   quotes      source:'formula'              -> ECQuotes.renderTriad
//   pointer     qid, body                     -> prose + a cross-page link
//   bases       qids:[qid,…]                  -> the response-base footnote
//
// ---------------------------------------------------------------------------
// Degrading gracefully (P31 brief, PLAN §5)
// ---------------------------------------------------------------------------
// themes.json and quotes.json are curation outputs: they are absent while the
// exporter runs with --allow-missing-curation and may be empty for any single
// question afterwards. A panel with nothing to draw is never rendered as an
// empty box — it is replaced by an HTML comment naming the panel and the
// reason, and the same line is written to console.info so a session running the
// page can see what the export is missing. A section whose panels all drop out
// disappears the same way. Nothing here edits or second-guesses the exporter.
//
// Every number on screen comes from the exported JSON. This file computes no
// percentages, nets nothing, and knows no survey figures.
// ============================================================================

(function () {
    'use strict';

    var MASK_N = 5;

    // Theme bars shown per question before the tail is folded into a note.
    var THEME_LIMIT = 12;

    // topics/*.html sits one level below the site root, so every cross-page
    // href this module writes is prefixed. (The nav does the same through
    // NAV_BASE; ECData does it by reading the shared.css <link>.)
    var PAGE_BASE = '../';

    var CFG = null;
    var DATA = {};
    var HIDDEN = [];        // [{id, why}] — reported to the console at the end

    function esc(s) {
        return window.ECData ? ECData.escapeHtml(s)
                             : String(s === null || s === undefined ? '' : s);
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function hostId(panel) {
        return 'ecp-' + panel.id;
    }

    function comment(id, why) {
        HIDDEN.push({ id: id, why: why });
        return '<!-- panel "' + String(id).replace(/--+/g, '-') + '" hidden: ' +
            String(why).replace(/--+/g, '-') + ' -->';
    }

    function orgHref(id) {
        return PAGE_BASE + 'respondents.html?org=' + encodeURIComponent(id);
    }

    // Every chart offers the way back to the Decision Board. The fragment is
    // what makes the link land: P30's page gives each panel host an id, so
    // #stripsHost / #matrixHost / #scoreboardHost / #laddersHost put the reader
    // in front of the right panel today. `?q=` rides along for the question
    // preselect P30 does not read yet — an inert parameter now, the hook when
    // P42 unifies the two pages.
    var DECISION_ANCHOR = {
        strips: 'stripsHost',
        matrix: 'matrixHost',
        cross: 'matrixHost',
        scoreboard: 'scoreboardHost'
    };

    function decisionsHref(qid, panel) {
        var anchor = (panel && panel.decisionAnchor) ||
            DECISION_ANCHOR[panel && panel.kind] || '';
        return PAGE_BASE + 'decisions.html?q=' + encodeURIComponent(qid) +
            (anchor ? '#' + anchor : '');
    }

    function dimKey() {
        return (window.ECSegments && ECSegments.get('dim')) || 'overall';
    }

    function segValueKey() {
        return (window.ECSegments && ECSegments.get('seg')) || 'overall';
    }

    function questionOf(qid) {
        return (window.ECData && ECData.question(DATA.meta, qid)) || null;
    }

    function displayOf(qid) {
        return (window.ECData && ECData.display(DATA.meta, qid)) || qid;
    }

    // A question's own title, used wherever the config does not override it.
    function questionTitle(qid, fallback) {
        var q = questionOf(qid);
        if (!q) return fallback || displayOf(qid);
        return displayOf(qid) + ' — ' + (q.label || q.shorthand || '');
    }

    // ------------------------------------------------------------------------
    // Panel kinds
    // ------------------------------------------------------------------------
    // `files`     — contract files the kind reads (core files are required;
    //               themes/quotes are loaded optionally and may be null).
    // `segmented` — repaint when the segment controls change.
    // `resolve`   — {ok:true, …} when there is something to draw, or
    //               {ok:false, why:'…'} which becomes the HTML comment.
    // `body`      — inner HTML of the host (only kinds that need scaffolding).
    // `draw`      — hand the host to the P11 renderer.

    var KINDS = {

        // --- stance strips ---------------------------------------------------
        strips: {
            files: ['stances'],
            segmented: true,
            resolve: function (p) {
                var stances = DATA.stances || {};
                var have = (p.qids || []).filter(function (qid) {
                    var entry = stances[qid];
                    return entry && entry.overall &&
                        !ECStance.isEmpty(entry.overall);
                });
                if (!have.length) {
                    return { ok: false, why: 'stances.json carries no answers for ' +
                        (p.qids || []).join(', ') };
                }
                return { ok: true, qids: have, missing: (p.qids || [])
                    .filter(function (q) { return have.indexOf(q) < 0; }) };
            },
            draw: function (host, p, r) {
                ECStance.renderStrips(host, {
                    qids: r.qids,
                    stances: DATA.stances,
                    meta: DATA.meta,
                    dim: dimKey(),
                    maskN: MASK_N,
                    pageBase: PAGE_BASE,
                    label: p.title,
                    // The strip's own "open the topic page" link would point at
                    // the page it is already on; the Decision Board link below
                    // the panel is the useful direction from here.
                    showLinks: false
                });
            }
        },

        // --- the 9 x 3 additionality matrix ----------------------------------
        matrix: {
            files: ['matrix'],
            segmented: true,
            resolve: function () {
                var tests = ((DATA.meta || {}).matrix || {}).tests || [];
                var cells = (DATA.matrix || {}).tests || {};
                if (!tests.length || !Object.keys(cells).length) {
                    return { ok: false, why: 'matrix.json carries no rated tests' };
                }
                return { ok: true, n: tests.length };
            },
            draw: function (host, p) {
                ECMatrix.renderHeatmap(host, {
                    meta: DATA.meta,
                    matrix: DATA.matrix,
                    dim: dimKey(),
                    segValue: p.segValue ? segValueKey() : 'overall',
                    maskN: MASK_N,
                    pageBase: PAGE_BASE,
                    label: p.title
                });
            }
        },

        // --- required-vs-feasible cross (the one canvas on these pages) ------
        cross: {
            files: ['matrix'],
            segmented: false,
            resolve: function () {
                var feas = (DATA.matrix || {}).feasibility || {};
                if (!Object.keys(feas.per_test || {}).length) {
                    return { ok: false, why: 'matrix.json has no Q28 feasibility ' +
                        'picks' };
                }
                return { ok: true, feasibility: feas };
            },
            // ECMatrix.renderCross writes its sr-table into the
            // `.ec-srtable-slot` two levels above the canvas, so the canvas
            // lives in its own container inside the host.
            // `ec-chart-tall` buys back vertical room at phone widths, where
            // shared.css shortens .chart-container-lg to 320 px. Nine labelled
            // points need the height to resolve their collisions (P35 F11);
            // shared.css is a verbatim shell file, so the override is a
            // site-specific class beside it rather than an edit to it.
            body: function (p) {
                return '<div class="chart-container-lg ec-chart-tall">' +
                    '<canvas id="' + hostId(p) + '-canvas"></canvas></div>' +
                    '<div class="ec-srtable-slot"></div>';
            },
            draw: function (host, p, r) {
                ECMatrix.renderCross('#' + hostId(p) + '-canvas', {
                    meta: DATA.meta,
                    matrix: DATA.matrix,
                    label: p.title
                });
                var none = (r.feasibility.specials || {}).none_feasible;
                if (none && none.n !== undefined) {
                    var note = document.createElement('p');
                    note.className = 'ec-note';
                    note.textContent = none.n + ' of ' + (r.feasibility.n || 0) +
                        ' respondents answered that no test is feasible at all. ' +
                        'That is a special answer: it is shown here and never ' +
                        'netted into the ladder.';
                    host.appendChild(note);
                }
            }
        },

        // --- paired diverging scoreboard -------------------------------------
        scoreboard: {
            files: ['scoreboard'],
            segmented: true,
            resolve: function (p) {
                var board = (DATA.scoreboard || {})[p.board];
                if (!board || !(board.options || []).length) {
                    return { ok: false, why: 'scoreboard.json has no "' + p.board +
                        '" board' };
                }
                return { ok: true, board: board };
            },
            draw: function (host, p, r) {
                ECStance.renderScoreboard(host, r.board, {
                    meta: DATA.meta,
                    key: p.board,
                    dim: dimKey(),
                    maskN: MASK_N,
                    label: p.title
                });
                applyAxisLabels(host, p, r.board);
            }
        },

        // --- coded free-text themes ------------------------------------------
        themes: {
            files: ['themes'],
            segmented: false,
            resolve: function (p) {
                if (!DATA.themes) {
                    return { ok: false, why: 'themes.json is absent — the export ' +
                        'ran without curation' };
                }
                var byQ = DATA.themes.by_question || {};
                var have = (p.questions || []).filter(function (item) {
                    var block = byQ[item.qid];
                    return block && (block.themes || []).length;
                });
                if (!have.length) {
                    return { ok: false, why: 'themes.json codes none of ' +
                        (p.questions || []).map(function (i) { return i.qid; })
                            .join(', ') };
                }
                return { ok: true, questions: have };
            },
            body: function (p, r) {
                var multi = r.questions.length > 1;
                return '<div' + (multi ? ' class="grid-2col"' : '') + '>' +
                    r.questions.map(function (item) {
                        return '<div>' +
                            '<h4 class="chart-title">' +
                            esc(item.title || questionTitle(item.qid)) + '</h4>' +
                            (item.subtitle
                                ? '<p class="ec-note">' + esc(item.subtitle) + '</p>'
                                : '') +
                            '<div id="' + hostId(p) + '-' + item.qid + '"></div>' +
                            '</div>';
                    }).join('') + '</div>';
            },
            draw: function (host, p, r) {
                r.questions.forEach(function (item) {
                    var block = DATA.themes.by_question[item.qid];
                    var limit = item.limit || p.limit || THEME_LIMIT;
                    var el = byId(hostId(p) + '-' + item.qid);
                    ECStance.renderThemes(el, block, {
                        taxonomy: DATA.themes.taxonomy,
                        label: item.title || questionTitle(item.qid),
                        limit: limit
                    });
                    themeTail(el, block, limit);
                });
            }
        },

        // --- curated quotes ---------------------------------------------------
        quotes: {
            files: ['quotes'],
            segmented: false,
            resolve: function (p) {
                if (!DATA.quotes) {
                    return { ok: false, why: 'quotes.json is absent — the export ' +
                        'ran without curation' };
                }
                var block = DATA.quotes[p.source];
                var total = block ? ['for', 'against', 'context']
                    .reduce(function (n, side) {
                        return n + ((block[side] || []).length);
                    }, 0) : 0;
                if (!total) {
                    return { ok: false, why: 'quotes.json has no curated quotes ' +
                        'under "' + p.source + '"' };
                }
                return { ok: true, block: block, total: total };
            },
            draw: function (host, p, r) {
                ECQuotes.renderTriad(host, r.block, {
                    meta: DATA.meta,
                    taxonomy: (DATA.themes || {}).taxonomy,
                    titles: p.titles,
                    // Named respondents link to their profile on the
                    // respondents page; redacted ones never do — ECQuotes
                    // enforces that, this only fixes the relative path.
                    orgHref: orgHref
                });
            }
        },

        // --- a pointer to another page ---------------------------------------
        // Prose plus a link, with the question's own base filled in from meta so
        // even the pointer carries its n.
        pointer: {
            files: [],
            segmented: false,
            resolve: function (p) {
                var q = p.qid ? questionOf(p.qid) : null;
                if (p.qid && !q) {
                    return { ok: false, why: 'meta.json has no ' + p.qid };
                }
                return { ok: true, q: q };
            },
            draw: function (host, p, r) {
                var n = r.q && r.q.n_answered;
                var html = '<p class="ec-answer-text">' + esc(p.body) + '</p>';
                if (r.q) {
                    html += '<p class="ec-note">' + esc(displayOf(p.qid)) + ' — ' +
                        esc(r.q.label || '') + '. <strong>n=' +
                        (n === undefined ? '?' : n) +
                        '</strong> respondents answered it.</p>';
                }
                host.innerHTML = html;
            }
        },

        // --- the response-base footnote ---------------------------------------
        bases: {
            files: [],
            segmented: false,
            resolve: function (p) {
                var rows = (p.qids || []).map(questionOf).filter(Boolean);
                if (!rows.length) {
                    return { ok: false, why: 'meta.json carries none of this ' +
                        'page’s questions' };
                }
                return { ok: true, rows: rows };
            },
            // The base a panel actually divided by, where this page draws one.
            // meta's `n_answered` is the fallback — and the only source for the
            // free-text questions, which no panel counts. Reading the panel
            // first keeps this table agreeing with the n chips above it.
            baseOf: function (qid) {
                var s = (DATA.stances || {})[qid];
                if (s && s.overall) return ECStance.baseOf(s.overall);
                var m = ((DATA.matrix || {}).tests || {})[qid];
                if (m && m.overall) return ECStance.baseOf(m.overall);
                var boards = (DATA.meta || {}).scoreboards || {};
                var found;
                Object.keys(boards).forEach(function (k) {
                    var board = (DATA.scoreboard || {})[k];
                    if (!board) return;
                    if (boards[k].q_app === qid) found = board.base_app;
                    if (boards[k].q_not === qid) found = board.base_not;
                });
                if (found !== undefined) return found;
                var q = questionOf(qid);
                return q && q.n_answered !== undefined ? q.n_answered : null;
            },
            draw: function (host, p, r) {
                var self = this;
                var html = '<div class="ec-table-scroll"><table class="data-table">' +
                    '<caption class="sr-only">Response base for every question ' +
                    'on this page</caption><thead><tr>' +
                    ['Question', 'What it asks', 'Answer type', 'Responses (n)']
                        .map(function (h) {
                            return '<th scope="col">' + esc(h) + '</th>';
                        }).join('') + '</tr></thead><tbody>' +
                    r.rows.map(function (q) {
                        var n = self.baseOf(q.qid);
                        return '<tr><th scope="row">' + esc(displayOf(q.qid)) +
                            '</th><td>' + esc(q.label || q.shorthand || '') +
                            '</td><td>' + esc(String(q.asks_for || q.type || '')
                                .replace(/_/g, ' ')) +
                            '</td><td>' + (n === null ? '—' : n) + '</td></tr>';
                    }).join('') + '</tbody></table></div>' +
                    '<p class="ec-note">Bases differ question by question — this ' +
                    'consultation loses respondents steadily from the first ' +
                    'question to the last, so no percentage on this page shares a ' +
                    'denominator with any other unless it says so. Segment cells ' +
                    'with fewer than ' + MASK_N + ' respondents are suppressed ' +
                    'rather than printed.</p>';
                host.innerHTML = html;
            }
        }
    };

    // The taxonomy runs to dozens of keys and the tail of any single question is
    // long and thin, so the bars stop at THEME_LIMIT. Truncation that hides what
    // it dropped would be a lie about coverage, so everything below the cut is
    // named in a note with its count — the panel is shorter, the record is not.
    function themeTail(el, block, limit) {
        if (!el || !block) return;
        var all = (block.themes || []).slice().sort(function (a, b) {
            return (b.n || 0) - (a.n || 0);
        });
        var omitted = all.slice(limit);
        if (!omitted.length) return;
        var tax = {};
        ((DATA.themes || {}).taxonomy || []).forEach(function (t) { tax[t.key] = t; });
        var note = document.createElement('p');
        note.className = 'ec-note';
        // Counts travel with the names: the bars stop at the cut and so does the
        // component's data table, so this note is the only place the tail is
        // recorded and it has to carry the numbers too.
        note.textContent = omitted.length + ' further theme' +
            (omitted.length === 1 ? '' : 's') + ' coded on this question, below ' +
            'the ' + limit + ' shown: ' + omitted.map(function (t) {
                return ((tax[t.key] || {}).label || t.key) + ' ' + (t.n || 0);
            }).join(', ') + '.';
        el.appendChild(note);
    }

    // The scoreboard component labels its two sides "appropriate" and "not
    // appropriate", which is right for Q35/36 and Q38/39 but not for the
    // weighting board, where the left-hand question (Q49) asks which approaches
    // are *not feasible to implement*. Calling "all are feasible" an answer on
    // the "not-appropriate list" would be a plain misstatement, so the config
    // supplies the true wording and it is written over the rendered labels —
    // the axis pair with `{base}` substituted, and the two side tags beside the
    // specials. Everything here is guarded: if the component's markup changes,
    // the panel keeps the component's own text rather than breaking.
    //
    // This belongs in ECStance as a renderScoreboard option. It is done here
    // because styles/site.css and js/stance-viz.js are outside this prompt's
    // lane; it is flagged for P42 to push upstream.
    function applyAxisLabels(host, p, board) {
        if (!p.axis) return;
        var spec = ((DATA.meta || {}).scoreboards || {})[p.board] || {};
        var baseApp = board.base_app !== undefined ? board.base_app : spec.base_app;
        var baseNot = board.base_not !== undefined ? board.base_not : spec.base_not;
        var left = host.querySelector('.ec-score-axis-left');
        var right = host.querySelector('.ec-score-axis-right');
        if (left && p.axis.not) {
            left.textContent = p.axis.not.replace('{base}', baseNot);
        }
        if (right && p.axis.app) {
            right.textContent = p.axis.app.replace('{base}', baseApp);
        }
        var tags = { 'appropriate list': p.axis.appTag,
                     'not-appropriate list': p.axis.notTag };
        Array.prototype.forEach.call(
            host.querySelectorAll('.ec-score-specials .ec-tag-special'),
            function (tag) {
                var replacement = tags[tag.textContent.trim()];
                if (replacement) tag.textContent = replacement;
            });
    }

    // ------------------------------------------------------------------------
    // Scaffolding
    // ------------------------------------------------------------------------
    function panelHtml(panel, resolved) {
        var kind = KINDS[panel.kind];
        var inner = kind.body ? kind.body(panel, resolved) : '';
        return '<div class="chart-panel scroll-reveal" data-ec-panel="' +
            esc(panel.id) + '">' +
            (panel.title
                ? '<h3 class="chart-title">' + esc(panel.title) + '</h3>' : '') +
            (panel.subtitle
                ? '<p class="ec-note">' + esc(panel.subtitle) + '</p>' : '') +
            '<div id="' + hostId(panel) + '">' + inner + '</div>' +
            (panel.note
                ? '<p class="ec-note">' + esc(panel.note) + '</p>' : '') +
            (panel.decisionQid
                ? '<a class="ec-strip-link" href="' +
                  esc(decisionsHref(panel.decisionQid, panel)) +
                  '">See ' + esc(displayOf(panel.decisionQid)) +
                  ' beside every other decision point &rarr;</a>'
                : '') +
            (panel.link
                ? '<a class="ec-strip-link" href="' + esc(PAGE_BASE + panel.link.href) +
                  '">' + esc(panel.link.text) + ' &rarr;</a>'
                : '') +
            '</div>';
    }

    function sectionHtml(section, panels) {
        var cls = 'content-section' +
            (section.width ? '-' + section.width : '');
        return '<section class="' + cls + '" id="' + esc(section.id) + '">' +
            (section.title
                ? '<h2 class="section-title">' + esc(section.title) + '</h2>' : '') +
            (section.subtitle
                ? '<p class="section-subtitle">' + esc(section.subtitle) + '</p>'
                : '') +
            panels.join('') +
            (section.callout
                ? '<div class="insight-glass ' +
                  esc(section.callout.variant || 'insight-glass-indigo') +
                  ' scroll-reveal"><strong>' +
                  esc(section.callout.title || 'How to read this.') + '</strong> ' +
                  esc(section.callout.text) + '</div>'
                : '') +
            '</section>';
    }

    // ------------------------------------------------------------------------
    // Build + draw
    // ------------------------------------------------------------------------
    var live = [];      // panels that actually rendered, for segment redraws

    function build() {
        var root = byId(CFG.root || 'topicPanels');
        if (!root) return;

        live = [];
        HIDDEN = [];
        var pending = [];
        var html = (CFG.sections || []).map(function (section) {
            var shown = 0;
            var panels = (section.panels || []).map(function (panel) {
                var kind = KINDS[panel.kind];
                if (!kind) {
                    return comment(panel.id, 'unknown panel kind "' +
                        panel.kind + '"');
                }
                var resolved = kind.resolve(panel);
                if (!resolved.ok) return comment(panel.id, resolved.why);
                shown++;
                pending.push({ panel: panel, kind: kind, resolved: resolved });
                return panelHtml(panel, resolved);
            });
            if (!shown) {
                return comment(section.id, 'every panel in this section is ' +
                    'absent from the current export');
            }
            return sectionHtml(section, panels);
        }).join('\n');

        // Nothing at all resolved: say so in one card rather than leaving the
        // page as a lede over empty space. This is the state a topic page sits
        // in when the export predates the questions it covers.
        if (!pending.length) {
            html += '<section class="content-section"><div class="card ec-empty">' +
                'None of this page’s panels are in the current export' +
                (ECData.isFixtures()
                    ? ' — the hand-authored fixtures cover only a slice of the ' +
                      'questionnaire. Drop <code>?fixtures=1</code> to read the ' +
                      'real export.'
                    : '. Nothing here has been hidden by choice: every panel ' +
                      'names itself and its reason in an HTML comment above.') +
                '</div></section>';
        }

        root.innerHTML = html;

        pending.forEach(function (item) {
            var host = byId(hostId(item.panel));
            if (!host) return;
            item.kind.draw(host, item.panel, item.resolved);
            if (item.kind.segmented) live.push(item);
        });
    }

    function redraw() {
        live.forEach(function (item) {
            var host = byId(hostId(item.panel));
            if (host) item.kind.draw(host, item.panel, item.resolved);
        });
    }

    // ------------------------------------------------------------------------
    // Controls
    // ------------------------------------------------------------------------
    function controls() {
        var ids = CFG.controls || {};
        if (ids.dim && byId(ids.dim)) {
            ECSegments.dimToggle('#' + ids.dim, {
                def: 'overall',
                includeOverall: true
            });
        }
        // Only the matrix reads a single segment value; the strips and the
        // scoreboard show every value of the chosen dimension at once.
        if (ids.seg && byId(ids.seg)) {
            ECSegments.valueToggle('#' + ids.seg, {
                label: 'Matrix shows',
                allLabel: 'All respondents'
            });
        }
        ECSegments.on(function (ev) {
            if (!ev.detail) return;
            if (ev.detail.param !== 'dim' && ev.detail.param !== 'seg') return;
            redraw();
        });
    }

    // ------------------------------------------------------------------------
    // Boot
    // ------------------------------------------------------------------------
    // Core files must load: a topic page with no meta.json is not a page. The
    // two curation files resolve to null when the export predates P21, and
    // every panel that reads them hides itself.
    function filesNeeded() {
        var core = { meta: true };
        var optional = {};
        (CFG.sections || []).forEach(function (section) {
            (section.panels || []).forEach(function (panel) {
                var kind = KINDS[panel.kind];
                if (!kind) return;
                kind.files.forEach(function (f) {
                    if (f === 'themes' || f === 'quotes') optional[f] = true;
                    else core[f] = true;
                });
            });
        });
        // Quote cards colour their theme chips from the taxonomy, so a page
        // with quotes wants themes.json even when it draws no theme bars.
        if (optional.quotes) optional.themes = true;
        return { core: Object.keys(core).sort(), optional: Object.keys(optional).sort() };
    }

    function report() {
        if (!window.console || !console.info) return;
        var where = 'topic-page[' + (CFG.key || '?') + ']';
        console.info(where + ': ' + live.length + ' segment-aware panel(s) live; ' +
            HIDDEN.length + ' panel/section(s) hidden.');
        HIDDEN.forEach(function (h) {
            console.info(where + ': hidden "' + h.id + '" — ' + h.why);
        });
    }

    function start() {
        CFG = window.TOPIC_CONFIG;
        if (!CFG) {
            if (window.console && console.error) {
                console.error('topic-page.js: no TOPIC_CONFIG on this page.');
            }
            return;
        }
        var need = filesNeeded();
        var root = CFG.root || 'topicPanels';

        ECData.loadAll(need.core).then(function (core) {
            DATA = core;
            if (!need.optional.length) return null;
            return ECData.loadOptional(need.optional).then(function (extra) {
                Object.keys(extra).forEach(function (k) { DATA[k] = extra[k]; });
            });
        }).then(function () {
            ECSegments.init(DATA.meta);
            controls();
            build();
            report();
        }).catch(function (err) {
            ECData.errorPanel('#' + root, err, {
                title: 'This topic page could not load its data'
            });
            if (window.console && console.error) console.error(err);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

    // Exposed for the QA wave: ECTopicPage.hidden() lists what the current
    // export did not supply, without reading the console.
    window.ECTopicPage = {
        redraw: redraw,
        hidden: function () { return HIDDEN.slice(); },
        config: function () { return CFG; },
        data: function () { return DATA; }
    };
})();
