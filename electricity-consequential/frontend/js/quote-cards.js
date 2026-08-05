// ============================================================================
// ECQuotes - curated quote cards with theme chips
// ============================================================================
// Site-specific module (not an upstream design-system file). Port of the
// repo-root hub's S2Quotes, extended with the theme chips this survey needs —
// it has no reason picklists, so the coded theme taxonomy is the only
// structured handle on a free-text-dominated record.
//
// Consumes the `quotes.json` shape from PLAN.md §5:
//   quotes.json = {"<topic or qid>": {for:[QUOTE], against:[QUOTE],
//                                     context:[QUOTE]}}
//   QUOTE = {text(≤600, verbatim substring, […] elision allowed), qid,
//            respondent_id, attribution, org_type, redacted, themes:[keys],
//            template_cluster: null | hash}
//
//   ECQuotes.render(el, quotes, opts)                       // one column
//   ECQuotes.renderTriad(el, {for, against, context}, opts) // the §5 triple
//   ECQuotes.filter(quotes, {topic, stance, org_type, redacted, theme})
//
// Cards carry `.scroll-reveal`, which scroll-observer.js picks up through its
// MutationObserver — no bespoke reveal code.
//
// A template-cluster badge is not decoration: PLAN §3.5 found 38 shared-text
// clusters across 25 respondents, so a quote that is really a circulated
// response pack must say so on its face.
// ============================================================================

(function() {
    'use strict';

    function esc(s) {
        return String(s === null || s === undefined ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function node(t) {
        if (typeof t === 'string') {
            return t.charAt(0) === '#' ? document.getElementById(t.slice(1))
                                       : document.querySelector(t);
        }
        return t || null;
    }

    // The 13 org types this survey's Q6 offers, plus the two extras the audit
    // vocabulary can promote a respondent into. meta.json wins where it has a
    // label; this map is the fallback and the ordering hint.
    var ORG_LABELS = {
        company: 'Company',
        consultant: 'Consultant',
        ngo: 'NGO/civil society',
        industry_group: 'Industry group',
        energy_supplier: 'Energy supplier/utility',
        academia: 'Academia/research',
        data_analytics: 'Data/analytics provider',
        financial: 'Financial institution',
        ghg_program: 'GHG program',
        government: 'Government',
        registry_operator: 'Registry operator',
        verification: 'Verification body',
        grid_operator: 'Grid operator',
        intl_agency: 'International agency',
        other: 'Other'
    };

    var SIDE_TITLES = {
        'for': 'In support',
        against: 'Against',
        context: 'Context & caveats'
    };

    function orgLabel(key, meta) {
        if (!key) return '';
        var segs = meta && meta.segments && meta.segments.org_type_5;
        if (segs && segs.values) {
            for (var i = 0; i < segs.values.length; i++) {
                if (segs.values[i].key === key) return segs.values[i].label;
            }
        }
        return ORG_LABELS[key] || String(key).replace(/_/g, ' ');
    }

    function defaultOrgHref(id) {
        return 'respondents.html?org=' + encodeURIComponent(id);
    }

    function themeChips(keys, taxonomy) {
        if (!keys || !keys.length) return '';
        var tax = {};
        (taxonomy || []).forEach(function(t) { tax[t.key] = t; });
        return keys.map(function(k) {
            var t = tax[k] || {};
            return '<span class="ec-tag ec-tag-theme' +
                (t.polarity ? ' ec-tag-' + esc(t.polarity) : '') +
                '" title="' + esc(t.definition || '') + '">' +
                esc(t.label || String(k).replace(/_/g, ' ')) + '</span>';
        }).join('');
    }

    function card(quote, opts) {
        var meta = opts.meta || null;
        var text = String(quote.text || '');
        var attribution = quote.attribution ||
            (quote.redacted ? 'Redacted' : 'Unattributed');
        var href = (opts.orgHref || defaultOrgHref)(quote.respondent_id);
        var qDisplay = quote.qid
            ? ((window.ECData && ECData.display(meta, quote.qid)) || quote.qid)
            : null;

        var html = '<figure class="card ec-quote scroll-reveal' +
            (quote.redacted ? ' ec-quote--redacted' : '') + '">' +
            '<blockquote class="ec-quote-text">' + esc(text) + '</blockquote>' +
            '<figcaption class="ec-quote-foot">';

        // Redacted respondents have no profile to link to, and never will —
        // PLAN gotcha 15: they are never named, anywhere, ever.
        if (!quote.redacted && quote.respondent_id !== undefined &&
            quote.respondent_id !== null && opts.linkOrgs !== false) {
            html += '<a class="ec-quote-org" href="' + esc(href) + '">' +
                esc(attribution) + '</a>';
        } else {
            html += '<span class="ec-quote-org">' + esc(attribution) + '</span>';
        }

        html += '<span class="ec-quote-tags">';
        if (quote.org_type &&
            String(attribution).indexOf(orgLabel(quote.org_type, meta)) < 0) {
            html += '<span class="ec-tag">' + esc(orgLabel(quote.org_type, meta)) +
                '</span>';
        }
        if (qDisplay) {
            html += '<span class="ec-tag ec-tag-q">' + esc(qDisplay) + '</span>';
        }
        if (quote.template_cluster) {
            html += '<span class="ec-tag ec-tag-template" title="Verbatim text ' +
                'shared with other respondents (cluster ' +
                esc(String(quote.template_cluster).slice(0, 8)) + ')">' +
                'template cluster</span>';
        }
        html += themeChips(quote.themes, opts.taxonomy);
        html += '</span></figcaption></figure>';
        return html;
    }

    function render(target, quotes, opts) {
        var el = node(target);
        if (!el) return null;
        opts = opts || {};
        var list = (quotes || []).filter(Boolean);
        if (opts.limit) list = list.slice(0, opts.limit);

        if (!list.length) {
            el.innerHTML = (opts.title
                ? '<h4 class="ec-quote-heading">' + esc(opts.title) +
                  '<span class="ec-quote-count">0</span></h4>'
                : '') +
                '<div class="card ec-empty">' +
                esc(opts.emptyText ||
                    'No curated quotes for this selection yet — P21 has not landed.') +
                '</div>';
            return el;
        }

        var html = '';
        if (opts.title) {
            html += '<h4 class="ec-quote-heading">' + esc(opts.title) +
                '<span class="ec-quote-count">' + list.length + '</span></h4>';
        }
        html += '<div class="ec-quote-list">' +
            list.map(function(q) { return card(q, opts); }).join('') + '</div>';
        el.innerHTML = html;
        return el;
    }

    // for / against / context, side by side. PLAN §4 asks every topic page for
    // all three, not the two-sided pair the Scope 2 hub used.
    function renderTriad(target, sides, opts) {
        var el = node(target);
        if (!el) return null;
        opts = opts || {};
        sides = sides || {};
        var order = opts.order || ['for', 'against', 'context'];
        el.classList.add('ec-quote-triad');
        el.innerHTML = order.map(function(k) {
            return '<div class="ec-quote-col ec-quote-col--' + esc(k) + '"></div>';
        }).join('');
        order.forEach(function(k, i) {
            render(el.children[i], sides[k], {
                title: (opts.titles && opts.titles[k]) || SIDE_TITLES[k] || k,
                meta: opts.meta,
                taxonomy: opts.taxonomy,
                orgHref: opts.orgHref,
                linkOrgs: opts.linkOrgs,
                limit: opts.limit,
                emptyText: opts.emptyText
            });
        });
        return el;
    }

    // Flatten quotes.json into a filterable list — the voices-page browser.
    // Returns [{...QUOTE, topic, side}].
    function flatten(quotesJson) {
        var out = [];
        Object.keys(quotesJson || {}).forEach(function(topic) {
            var block = quotesJson[topic] || {};
            ['for', 'against', 'context'].forEach(function(side) {
                (block[side] || []).forEach(function(q) {
                    var copy = {};
                    Object.keys(q).forEach(function(k) { copy[k] = q[k]; });
                    copy.topic = topic;
                    copy.side = side;
                    out.push(copy);
                });
            });
        });
        return out;
    }

    function filter(list, criteria) {
        criteria = criteria || {};
        return (list || []).filter(function(q) {
            if (criteria.topic && criteria.topic !== 'all' &&
                q.topic !== criteria.topic) return false;
            if (criteria.side && criteria.side !== 'all' &&
                q.side !== criteria.side) return false;
            if (criteria.org_type && criteria.org_type !== 'all' &&
                q.org_type !== criteria.org_type) return false;
            if (criteria.redaction && criteria.redaction !== 'all') {
                var want = criteria.redaction === 'redacted';
                if (!!q.redacted !== want) return false;
            }
            if (criteria.theme && criteria.theme !== 'all') {
                if (!(q.themes || []).some(function(t) {
                    return t === criteria.theme;
                })) return false;
            }
            if (criteria.template === true && !q.template_cluster) return false;
            return true;
        });
    }

    window.ECQuotes = {
        render: render,
        renderTriad: renderTriad,
        flatten: flatten,
        filter: filter,
        themeChips: themeChips,
        orgLabel: orgLabel,
        ORG_LABELS: ORG_LABELS,
        SIDE_TITLES: SIDE_TITLES
    };
})();
