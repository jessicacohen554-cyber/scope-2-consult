// ============================================================================
// S2Quotes - curated quote cards
// ============================================================================
// Site-specific module (not an upstream design-system file).
//
// Consumes the `quotes.json` shape from plans/mbm-dashboard/PLAN.md §5:
//   QUOTE = {text(≤600), q, respondent_id, attribution, org_type, redacted,
//            template_cluster: null | hash}
//
//   S2Quotes.render(el, quotes, opts)                  // one column
//   S2Quotes.renderPair(el, {for: [...], against: [...]}, opts)
//
// Cards carry `.scroll-reveal`, which scroll-observer.js picks up through its
// MutationObserver — no bespoke reveal code.
//
// A template-cluster badge is not decoration: PLAN §3.5 found 14% of
// respondents sharing verbatim text, so a quote that is really a circulated
// template must say so on its face.
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

    var ORG_LABELS = {
        company: 'Company',
        industry_group: 'Industry group',
        consultant: 'Consultant',
        ngo: 'NGO/nonprofit',
        energy_supplier: 'Energy supplier/utility',
        other: 'Other',
        academia: 'Academia/research',
        data_analytics: 'Data/analytics provider',
        financial: 'Financial institution',
        government: 'Government institution',
        registry_operator: 'Registry operator',
        verification: 'Verification body',
        ghg_program: 'GHG program',
        grid_operator: 'Grid operator',
        intl_agency: 'International agency'
    };

    function orgLabel(key) {
        return ORG_LABELS[key] || (key ? String(key).replace(/_/g, ' ') : '');
    }

    function defaultOrgHref(id) {
        return 'respondents.html?org=' + encodeURIComponent(id);
    }

    function card(quote, opts) {
        var text = String(quote.text || '');
        var attribution = quote.attribution ||
            (quote.redacted ? 'Redacted' : 'Unattributed');
        var href = (opts.orgHref || defaultOrgHref)(quote.respondent_id);

        var html = '<figure class="card s2-quote scroll-reveal' +
            (quote.redacted ? ' s2-quote--redacted' : '') + '">' +
            '<blockquote class="s2-quote-text">' + esc(text) + '</blockquote>' +
            '<figcaption class="s2-quote-foot">';

        if (!quote.redacted && quote.respondent_id !== undefined &&
            opts.linkOrgs !== false) {
            html += '<a class="s2-quote-org" href="' + esc(href) + '">' +
                esc(attribution) + '</a>';
        } else {
            html += '<span class="s2-quote-org">' + esc(attribution) + '</span>';
        }

        html += '<span class="s2-quote-tags">';
        if (quote.org_type && String(attribution).indexOf(orgLabel(quote.org_type)) < 0) {
            html += '<span class="s2-tag">' + esc(orgLabel(quote.org_type)) + '</span>';
        }
        if (quote.q !== undefined && quote.q !== null) {
            html += '<span class="s2-tag s2-tag-q">Q' + esc(quote.q) + '</span>';
        }
        if (quote.template_cluster) {
            html += '<span class="s2-tag s2-tag-template" title="Verbatim text shared ' +
                'with other respondents (template cluster ' +
                esc(String(quote.template_cluster).slice(0, 8)) + ')">' +
                'template cluster</span>';
        }
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
            el.innerHTML = '<div class="card s2-empty">' +
                esc(opts.emptyText || 'No curated quotes for this selection yet.') +
                '</div>';
            return el;
        }

        var html = '';
        if (opts.title) {
            html += '<h4 class="s2-quote-heading">' + esc(opts.title) +
                '<span class="s2-quote-count">' + list.length + '</span></h4>';
        }
        html += '<div class="s2-quote-list">' +
            list.map(function(q) { return card(q, opts); }).join('') + '</div>';
        el.innerHTML = html;
        return el;
    }

    // Side-by-side "for" / "against" panels for the proposal deep dives.
    function renderPair(target, sides, opts) {
        var el = node(target);
        if (!el) return null;
        opts = opts || {};
        sides = sides || {};
        el.classList.add('s2-quote-pair');
        el.innerHTML = '<div class="s2-quote-col s2-quote-col--for"></div>' +
            '<div class="s2-quote-col s2-quote-col--against"></div>';
        render(el.children[0], sides['for'], {
            title: opts.forTitle || 'In support',
            orgHref: opts.orgHref,
            linkOrgs: opts.linkOrgs,
            limit: opts.limit,
            emptyText: opts.emptyText
        });
        render(el.children[1], sides['against'], {
            title: opts.againstTitle || 'Opposed',
            orgHref: opts.orgHref,
            linkOrgs: opts.linkOrgs,
            limit: opts.limit,
            emptyText: opts.emptyText
        });
        return el;
    }

    window.S2Quotes = {
        render: render,
        renderPair: renderPair,
        orgLabel: orgLabel,
        ORG_LABELS: ORG_LABELS
    };
})();
