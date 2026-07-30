// ============================================================================
// S2Segments - segment vocabulary, toggle controls, and shareable URL state
// ============================================================================
// Site-specific module (not an upstream design-system file).
//
// Owns three things:
//   1. the closed segment vocabulary from meta.json (PLAN §5: org_type, sector,
//      country, redaction, responding_as, audited_class),
//   2. `.toggle-btn-group` controls built from it — real <button aria-pressed>,
//   3. the page's view state, mirrored into URLSearchParams so any view is a
//      shareable link. Every change dispatches a `segmentchange` CustomEvent on
//      `document` (and on the control element) with
//      `detail = {param, value, state}`.
//
// Include via: <script src="js/segments.js"></script>
//
// Usage:
//   S2Segments.init(meta);
//   S2Segments.dimToggle('#dimToggle');                       // which dimension
//   S2Segments.toggle('#metricToggle', {param: 'metric', options: [...]});
//   S2Segments.switchToggle('#smallToggle', {param: 'hidesmall',
//                                            label: 'Hide n<15 segments'});
//   S2Segments.on(function(e) { redraw(e.detail.state); });
//   S2Segments.get('dim', 'org_type');
// ============================================================================

(function() {
    'use strict';

    var EVENT = 'segmentchange';
    var DIM_ORDER = ['org_type', 'sector', 'country', 'redaction',
                     'responding_as', 'audited_class'];

    var vocab = {};        // dim key -> {key, label, values:[{key,label,n}]}
    var defaults = {};     // param -> default value (omitted from the URL)
    var uid = 0;

    function esc(s) {
        return String(s === null || s === undefined ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function node(elOrSel) {
        if (typeof elOrSel === 'string') {
            return elOrSel.charAt(0) === '#'
                ? document.getElementById(elOrSel.slice(1))
                : document.querySelector(elOrSel);
        }
        return elOrSel || null;
    }

    // --- Vocabulary ----------------------------------------------------------
    // Accepts either the whole meta.json or just its `segments` object.
    function init(meta) {
        var segs = (meta && meta.segments) ? meta.segments : (meta || {});
        vocab = {};
        Object.keys(segs).forEach(function(key) {
            var entry = segs[key] || {};
            vocab[key] = {
                key: key,
                label: entry.label || key,
                values: (entry.values || []).map(function(v) {
                    return { key: v.key, label: v.label || v.key, n: v.n };
                })
            };
        });
        return dims();
    }

    // Declared dimensions in the canonical PLAN §5 order, unknown ones appended.
    function dims() {
        var keys = Object.keys(vocab);
        var ordered = DIM_ORDER.filter(function(k) { return keys.indexOf(k) >= 0; });
        keys.forEach(function(k) { if (ordered.indexOf(k) < 0) ordered.push(k); });
        return ordered.map(function(k) { return vocab[k]; });
    }

    function dim(key) {
        return vocab[key] || null;
    }

    function values(key) {
        return vocab[key] ? vocab[key].values.slice() : [];
    }

    function valueLabel(dimKey, valueKey) {
        var found = null;
        values(dimKey).forEach(function(v) { if (v.key === valueKey) found = v; });
        return found ? found.label : valueKey;
    }

    // --- URL-backed state ----------------------------------------------------
    function search() {
        return new URLSearchParams(window.location.search);
    }

    function get(param, fallback) {
        var v = search().get(param);
        if (v === null || v === '') {
            if (fallback !== undefined) return fallback;
            return defaults[param] !== undefined ? defaults[param] : null;
        }
        return v;
    }

    function getBool(param, fallback) {
        var v = get(param, fallback === undefined ? null : (fallback ? '1' : '0'));
        return v === '1' || v === 'true' || v === true;
    }

    // Everything this page tracks, defaults filled in — handy for redraws.
    function state() {
        var out = {};
        Object.keys(defaults).forEach(function(p) { out[p] = defaults[p]; });
        search().forEach(function(v, k) { out[k] = v; });
        return out;
    }

    function set(param, value, opts) {
        opts = opts || {};
        var qs = search();
        if (value === null || value === undefined || value === '' ||
            (defaults[param] !== undefined && String(value) === String(defaults[param]))) {
            qs.delete(param);
        } else {
            qs.set(param, String(value));
        }
        var str = qs.toString();
        var next = window.location.pathname + (str ? '?' + str : '') + window.location.hash;
        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', next);
        }
        if (!opts.silent) emit(param, value, opts.el);
        return value;
    }

    function emit(param, value, el) {
        var detail = { param: param, value: value, state: state() };
        if (el && el.dispatchEvent) {
            el.dispatchEvent(new CustomEvent(EVENT, { detail: detail, bubbles: true }));
        }
        document.dispatchEvent(new CustomEvent(EVENT, { detail: detail }));
    }

    function on(handler) {
        document.addEventListener(EVENT, handler);
        return handler;
    }

    function off(handler) {
        document.removeEventListener(EVENT, handler);
    }

    // --- Controls ------------------------------------------------------------
    // Generic single-choice toggle group. `options` is [{key, label, title}].
    function toggle(target, opts) {
        var el = node(target);
        if (!el) return null;
        opts = opts || {};
        var param = opts.param;
        var options = (opts.options || []).filter(Boolean);
        if (!param || !options.length) return null;

        if (opts.def !== undefined) defaults[param] = String(opts.def);
        else if (defaults[param] === undefined) defaults[param] = String(options[0].key);

        var labelId = 's2-ctl-' + (++uid);
        var current = get(param);
        if (!options.some(function(o) { return String(o.key) === String(current); })) {
            current = defaults[param];
        }

        function paint() {
            var html = '';
            if (opts.label) {
                html += '<span class="s2-control-label" id="' + labelId + '">' +
                    esc(opts.label) + '</span>';
            }
            html += '<div class="toggle-btn-group" role="group"' +
                (opts.label ? ' aria-labelledby="' + labelId + '"'
                            : ' aria-label="' + esc(param) + '"') + '>';
            options.forEach(function(o) {
                var active = String(o.key) === String(current);
                html += '<button type="button" data-key="' + esc(o.key) + '"' +
                    ' aria-pressed="' + (active ? 'true' : 'false') + '"' +
                    (active ? ' class="active"' : '') +
                    (o.title ? ' title="' + esc(o.title) + '"' : '') + '>' +
                    esc(o.label) + '</button>';
            });
            html += '</div>';
            el.innerHTML = html;
            el.classList.add('s2-control');
        }

        paint();

        el.addEventListener('click', function(ev) {
            var btn = ev.target.closest('button[data-key]');
            if (!btn || !el.contains(btn)) return;
            var key = btn.getAttribute('data-key');
            if (String(key) === String(current)) return;
            current = key;
            paint();
            set(param, key, { el: el });
        });

        return {
            el: el,
            param: param,
            value: function() { return current; },
            set: function(v) {
                current = String(v);
                paint();
                set(param, current, { el: el });
            },
            options: function() { return options.slice(); }
        };
    }

    // Which segment dimension is on the columns / x-axis.
    function dimToggle(target, opts) {
        opts = opts || {};
        var list = (opts.dims || dims().map(function(d) { return d.key; }))
            .filter(function(k) { return vocab[k]; });
        var options = list.map(function(k) {
            return { key: k, label: vocab[k].label, title: vocab[k].label };
        });
        if (opts.includeOverall) {
            options.unshift({ key: 'overall', label: opts.overallLabel || 'All respondents' });
        }
        return toggle(target, {
            param: opts.param || 'dim',
            label: opts.label === undefined ? 'Segment' : opts.label,
            options: options,
            def: opts.def || (options.length ? options[0].key : undefined)
        });
    }

    // Which value of a dimension a single-segment panel is showing. Re-paints
    // itself when the bound dimension parameter changes.
    function valueToggle(target, opts) {
        var el = node(target);
        if (!el) return null;
        opts = opts || {};
        var dimParam = opts.dimParam || 'dim';
        var param = opts.param || 'seg';
        var handle = null;

        function build() {
            var dimKey = opts.dim || get(dimParam, dims().length ? dims()[0].key : null);
            var vals = values(dimKey);
            var options = vals.map(function(v) {
                return {
                    key: v.key,
                    label: v.n === undefined ? v.label : v.label + ' (' + v.n + ')',
                    title: v.label
                };
            });
            if (opts.includeAll !== false) {
                options.unshift({ key: 'overall', label: opts.allLabel || 'All' });
            }
            if (!options.length) {
                el.innerHTML = '';
                return null;
            }
            defaults[param] = String(options[0].key);
            return toggle(el, {
                param: param,
                label: opts.label === undefined ? 'Showing' : opts.label,
                options: options,
                def: options[0].key
            });
        }

        handle = build();

        on(function(ev) {
            if (!ev.detail || ev.detail.param !== dimParam) return;
            var keep = handle ? handle.value() : null;
            handle = build();
            if (handle && keep &&
                handle.options().some(function(o) { return String(o.key) === String(keep); })) {
                handle.set(keep);
            } else if (handle) {
                set(param, handle.value(), { silent: true });
            }
        });

        return {
            el: el,
            param: param,
            value: function() { return handle ? handle.value() : null; },
            set: function(v) { if (handle) handle.set(v); },
            refresh: function() { handle = build(); }
        };
    }

    // On/off switch (e.g. "hide n<15 segments"). One real button, aria-pressed.
    function switchToggle(target, opts) {
        var el = node(target);
        if (!el) return null;
        opts = opts || {};
        var param = opts.param;
        if (!param) return null;
        defaults[param] = opts.def ? '1' : '0';
        var current = getBool(param, !!opts.def);
        var labelId = 's2-ctl-' + (++uid);

        function paint() {
            var html = '';
            if (opts.label) {
                html += '<span class="s2-control-label" id="' + labelId + '">' +
                    esc(opts.label) + '</span>';
            }
            html += '<div class="toggle-btn-group" role="group"' +
                (opts.label ? ' aria-labelledby="' + labelId + '"'
                            : ' aria-label="' + esc(param) + '"') + '>' +
                '<button type="button" aria-pressed="' + (current ? 'true' : 'false') + '"' +
                (current ? ' class="active"' : '') + '>' +
                esc(current ? (opts.onLabel || 'On') : (opts.offLabel || 'Off')) +
                '</button></div>';
            el.innerHTML = html;
            el.classList.add('s2-control');
        }

        paint();

        el.addEventListener('click', function(ev) {
            if (!ev.target.closest('button')) return;
            current = !current;
            paint();
            set(param, current ? '1' : '0', { el: el });
        });

        return {
            el: el,
            param: param,
            value: function() { return current; },
            set: function(v) {
                current = !!v;
                paint();
                set(param, current ? '1' : '0', { el: el });
            }
        };
    }

    window.S2Segments = {
        init: init,
        dims: dims,
        dim: dim,
        values: values,
        valueLabel: valueLabel,
        get: get,
        getBool: getBool,
        set: set,
        state: state,
        on: on,
        off: off,
        toggle: toggle,
        dimToggle: dimToggle,
        valueToggle: valueToggle,
        switchToggle: switchToggle,
        EVENT: EVENT
    };
})();
