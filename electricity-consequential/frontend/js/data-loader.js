// ============================================================================
// ECData - JSON loader for the electricity-consequential consultation hub
// ============================================================================
// Site-specific module (not an upstream design-system file). Port of the
// repo-root hub's S2Data; renamed, with the subdirectory fallback pointed at
// topics/ instead of proposals/.
//
// Loads the exported contract files described in
// electricity-consequential/plans/consequential-dashboard/PLAN.md §5 from
// `data/`, or from the hand-authored miniatures in `data/fixtures/` when the
// URL carries `?fixtures=1`. Every response is cached per resolved URL, so
// several panels on one page share a single fetch.
//
// Include via: <script src="js/data-loader.js"></script>
//
// Usage:
//   ECData.load('meta').then(function(meta) { ... });
//   ECData.loadAll(['meta', 'stances']).then(function(d) { d.meta; d.stances; });
//   ECData.loadOrg(151).then(function(org) { ... });
//   ECData.withData('#panel', ['meta', 'matrix'], function(d) { ... });
//
// fetch() does not work from file:// — serve the directory:
//   cd electricity-consequential/frontend && python3 -m http.server 8000
// ============================================================================

(function() {
    'use strict';

    var CACHE = {};

    // --- Path resolution -----------------------------------------------------
    // Pages live at the site root (index.html, decisions.html, …) and one level
    // down (topics/*.html). The shared.css <link> already carries the right
    // relative prefix on every page built from templates/page-template.html, so
    // reuse it rather than guessing. `<body data-data-base="...">` overrides.
    function detectPrefix() {
        var body = document.body;
        if (body && body.getAttribute('data-data-base')) {
            return body.getAttribute('data-data-base');
        }
        var link = document.querySelector('link[rel="stylesheet"][href*="shared.css"]');
        if (link) {
            var href = link.getAttribute('href') || '';
            var cut = href.lastIndexOf('styles/');
            if (cut >= 0) return href.slice(0, cut);
        }
        // Fallback: the one known subdirectory of the site.
        return /\/topics\//.test(window.location.pathname) ? '../' : '';
    }

    var CONFIG = {
        prefix: null,          // resolved lazily (body may not exist yet)
        fixtures: null,        // null = decide from the URL
        dir: 'data/',
        fixturesDir: 'data/fixtures/'
    };

    function params() {
        return new URLSearchParams(window.location.search);
    }

    // `?fixtures=1` (or `?fixtures=true`) switches the whole page to fixtures.
    // `ECData.configure({fixtures: true})` forces it (dev.html does this).
    function isFixtures() {
        if (CONFIG.fixtures !== null) return CONFIG.fixtures;
        var v = params().get('fixtures');
        return v === '1' || v === 'true' || v === 'yes';
    }

    function prefix() {
        if (CONFIG.prefix === null) CONFIG.prefix = detectPrefix();
        return CONFIG.prefix;
    }

    function basePath() {
        return prefix() + (isFixtures() ? CONFIG.fixturesDir : CONFIG.dir);
    }

    function url(name) {
        var clean = String(name).replace(/^\/+/, '').replace(/\.json$/, '');
        return basePath() + clean + '.json';
    }

    // --- Fetching ------------------------------------------------------------
    function fetchJson(target) {
        if (CACHE[target]) return CACHE[target];

        CACHE[target] = fetch(target, { cache: 'no-cache' }).then(function(res) {
            if (!res.ok) {
                throw wrap(new Error('HTTP ' + res.status + ' ' + res.statusText), target);
            }
            return res.json().catch(function(err) {
                throw wrap(new Error('Malformed JSON (' + err.message + ')'), target);
            });
        }).catch(function(err) {
            delete CACHE[target];          // let a later attempt retry
            throw err.ecurl ? err : wrap(err, target);
        });

        return CACHE[target];
    }

    function wrap(err, target) {
        err.ecurl = target;
        if (window.location.protocol === 'file:') {
            err.echint = 'Pages served over file:// cannot fetch JSON. Run ' +
                'python3 -m http.server 8000 inside electricity-consequential/' +
                'frontend/ and open http://localhost:8000/ instead.';
        } else {
            err.echint = 'Could not load ' + target + '. Serve the site with ' +
                'cd electricity-consequential/frontend && python3 -m http.server ' +
                '8000 — and if you are working before the P22 export lands, add ' +
                '?fixtures=1 to the URL.';
        }
        return err;
    }

    // --- Public API ----------------------------------------------------------
    function load(name) {
        return fetchJson(url(name));
    }

    function loadOrg(id) {
        return fetchJson(basePath() + 'orgs/' + String(id) + '.json');
    }

    // Resolve several files at once: loadAll(['meta','stances']) -> {meta, stances}
    function loadAll(names) {
        return Promise.all(names.map(load)).then(function(results) {
            var out = {};
            names.forEach(function(n, i) { out[n] = results[i]; });
            return out;
        });
    }

    // Same as loadAll, but a file that 404s resolves to `null` instead of
    // rejecting the batch. Curation-dependent files (themes, quotes, the audit
    // block) are absent while P22 runs with --allow-missing-curation, and a
    // page that only garnishes with them should still render.
    function loadOptional(names) {
        return Promise.all(names.map(function(n) {
            return load(n).catch(function() { return null; });
        })).then(function(results) {
            var out = {};
            names.forEach(function(n, i) { out[n] = results[i]; });
            return out;
        });
    }

    function escapeHtml(s) {
        return String(s === null || s === undefined ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Visible, non-silent failure. Replaces the target element's contents.
    function errorPanel(el, err, opts) {
        opts = opts || {};
        if (typeof el === 'string') {
            el = el.charAt(0) === '#' ? document.getElementById(el.slice(1))
                                      : (document.querySelector(el) ||
                                         document.getElementById(el));
        }
        if (!el) return;
        var title = opts.title || 'Data could not be loaded';
        var hint = (err && err.echint) ||
            'Serve the site with cd electricity-consequential/frontend && ' +
            'python3 -m http.server 8000.';
        var detail = err ? (err.message || String(err)) : 'Unknown error';
        el.innerHTML =
            '<div class="card ec-error" role="alert">' +
            '<div class="ec-error-title">' + escapeHtml(title) + '</div>' +
            '<p class="ec-error-detail">' + escapeHtml(detail) +
            (err && err.ecurl ? ' — <code>' + escapeHtml(err.ecurl) + '</code>' : '') +
            '</p>' +
            '<p class="ec-error-hint">' + escapeHtml(hint) + '</p>' +
            '</div>';
    }

    // Run `fn(data)` once the named files resolve; render an error panel into
    // `el` if any of them fail. Keeps page code free of boilerplate.
    function withData(el, names, fn) {
        return loadAll(names).then(fn).catch(function(err) {
            errorPanel(el, err);
            if (window.console && console.error) console.error(err);
            throw err;
        });
    }

    function configure(opts) {
        opts = opts || {};
        if (opts.prefix !== undefined) CONFIG.prefix = opts.prefix;
        if (opts.fixtures !== undefined) CONFIG.fixtures = opts.fixtures;
        if (opts.dir !== undefined) CONFIG.dir = opts.dir;
        if (opts.fixturesDir !== undefined) CONFIG.fixturesDir = opts.fixturesDir;
        return CONFIG;
    }

    function clearCache() {
        CACHE = {};
    }

    // --- meta.json conveniences ---------------------------------------------
    // Every consumer needs meta.questions indexed by qid ("Q019"), and most
    // want the "Q19" display form. PLAN §5 ships questions as a list, so the
    // index is built here once rather than in six page modules.
    function indexQuestions(meta) {
        var out = {};
        ((meta && meta.questions) || []).forEach(function(q) {
            if (q && q.qid) out[q.qid] = q;
        });
        return out;
    }

    function question(meta, qid) {
        if (!meta) return null;
        if (!meta._ecQIndex) {
            try {
                Object.defineProperty(meta, '_ecQIndex', {
                    value: indexQuestions(meta), enumerable: false
                });
            } catch (e) {
                meta._ecQIndex = indexQuestions(meta);
            }
        }
        return meta._ecQIndex[qid] || null;
    }

    // "Q019" -> "Q19", "Q026_1" -> "Q26.1" when meta has no display string.
    function display(meta, qid) {
        var q = question(meta, qid);
        if (q && q.display) return q.display;
        var m = /^Q0*(\d+)(?:_(\d+))?$/.exec(String(qid || ''));
        if (!m) return String(qid || '');
        return 'Q' + m[1] + (m[2] ? '.' + m[2] : '');
    }

    window.ECData = {
        load: load,
        loadAll: loadAll,
        loadOptional: loadOptional,
        loadOrg: loadOrg,
        withData: withData,
        errorPanel: errorPanel,
        configure: configure,
        clearCache: clearCache,
        isFixtures: isFixtures,
        basePath: basePath,
        url: url,
        escapeHtml: escapeHtml,
        indexQuestions: indexQuestions,
        question: question,
        display: display
    };
})();
