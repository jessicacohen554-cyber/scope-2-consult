// ============================================================================
// S2Data - JSON loader for the MBM consultation dashboard
// ============================================================================
// Site-specific module (not an upstream design-system file).
//
// Loads the exported contract files described in plans/mbm-dashboard/PLAN.md §5
// from `data/`, or from the hand-authored miniatures in `data/fixtures/` when
// the URL carries `?fixtures=1`. Every response is cached per resolved URL, so
// several panels on one page share a single fetch.
//
// Include via: <script src="js/data-loader.js"></script>
//
// Usage:
//   S2Data.load('meta').then(function(meta) { ... });
//   Promise.all([S2Data.load('meta'), S2Data.load('likert')]).then(...)
//   S2Data.loadAll(['meta', 'likert']).then(function(d) { d.meta; d.likert; });
//   S2Data.loadOrg(900).then(function(org) { ... });
//   S2Data.load('meta').catch(function(err) { S2Data.errorPanel(el, err); });
//
// fetch() does not work from file:// — serve the directory:
//   cd frontend && python3 -m http.server 8000
// ============================================================================

(function() {
    'use strict';

    var CACHE = {};

    // --- Path resolution -----------------------------------------------------
    // Pages live at the site root (index.html, heatmap.html, …) and one level
    // down (proposals/*.html). The shared.css <link> already carries the right
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
        // Fallback: known subdirectories of the site.
        return /\/proposals\//.test(window.location.pathname) ? '../' : '';
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
    // `S2Data.configure({fixtures: true})` forces it (dev.html does this).
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
            throw err.s2url ? err : wrap(err, target);
        });

        return CACHE[target];
    }

    function wrap(err, target) {
        err.s2url = target;
        if (window.location.protocol === 'file:') {
            err.s2hint = 'Pages served over file:// cannot fetch JSON. Run ' +
                'python3 -m http.server 8000 inside frontend/ and open ' +
                'http://localhost:8000/ instead.';
        } else {
            err.s2hint = 'Could not load ' + target + '. Serve the site with ' +
                'cd frontend && python3 -m http.server 8000 — and if you are ' +
                'working before the data export lands, add ?fixtures=1 to the URL.';
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

    // Resolve several files at once: loadAll(['meta','likert']) -> {meta, likert}
    function loadAll(names) {
        return Promise.all(names.map(load)).then(function(results) {
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
        if (typeof el === 'string') el = document.getElementById(el);
        if (!el) return;
        var title = opts.title || 'Data could not be loaded';
        var hint = (err && err.s2hint) ||
            'Serve the site with cd frontend && python3 -m http.server 8000.';
        var detail = err ? (err.message || String(err)) : 'Unknown error';
        el.innerHTML =
            '<div class="card s2-error" role="alert">' +
            '<div class="s2-error-title">' + escapeHtml(title) + '</div>' +
            '<p class="s2-error-detail">' + escapeHtml(detail) +
            (err && err.s2url ? ' — <code>' + escapeHtml(err.s2url) + '</code>' : '') +
            '</p>' +
            '<p class="s2-error-hint">' + escapeHtml(hint) + '</p>' +
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

    window.S2Data = {
        load: load,
        loadAll: loadAll,
        loadOrg: loadOrg,
        withData: withData,
        errorPanel: errorPanel,
        configure: configure,
        clearCache: clearCache,
        isFixtures: isFixtures,
        basePath: basePath,
        url: url,
        escapeHtml: escapeHtml
    };
})();
