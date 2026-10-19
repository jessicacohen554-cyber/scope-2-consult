// ============================================================================
// SHARED FOOTER MODULE - Single source of truth for site footer
// ============================================================================
// Lifted from the hourly-cfe-optimizer design system. Only FOOTER_LINKS and
// DEFAULT_NOTE are site-specific.
//
// Include via: <script src="js/shared-footer.js"></script>
//
// Usage: Place a placeholder element in your HTML:
//   <footer id="siteFooter" data-footer-note="Page-specific note here"></footer>
//
// This script will inject the standard footer links, note, and bottom-banner.
// If no data-footer-note is provided, a default note is used.
// ============================================================================

(function() {
    'use strict';

    // Canonical footer link set - single source of truth (SITE-SPECIFIC)
    // Mirrors the nav.js top level, flattened: Overview, the four dashboards,
    // and Methodology. The nine proposal pages live in the nav mega-menu only.
    // FOOTER_BASE keeps links correct from proposals/ subpages, exactly as
    // NAV_BASE does in nav.js.
    var FOOTER_LINKS = [
        { href: 'index.html',                 label: 'Start' },
        { href: 'ccs-removals.html',          label: 'CCS: removal or reduction?' },
        { href: 'ccs-eac.html',               label: 'CCS-backed EACs' },
        { href: 'scope2-update.html',         label: 'October 2026 update' },
        { href: 'governance.html',            label: 'Governance & TWGs' },
        { href: 'storage-mechanics.html',     label: 'Storage ledger' },
        { href: 'storage-revision.html',      label: 'Storage & incrementality' },
        { href: 'consequential-basics.html',  label: 'Impact accounting' },
        { href: 'consequential-ccus.html',    label: 'CCUS impact matrix' },
        { href: 'sources.html',               label: 'Sources' }
    ];

    var DEFAULT_NOTE = 'Scope 2 Frontier · compiled 19 Oct 2026 from GHG Protocol materials and the sources listed. Educational synthesis; not GHG Protocol guidance.';

    function buildFooter() {
        var el = document.getElementById('siteFooter');
        if (!el) return;

        var note = el.getAttribute('data-footer-note') || DEFAULT_NOTE;

        // Build footer HTML
        el.className = 'page-footer';
        el.innerHTML =
            '<div class="footer-links">' +
            FOOTER_LINKS.map(function(link) {
                return '<a href="' + link.href + '">' + link.label + '</a>';
            }).join('') +
            '</div>' +
            '<div class="footer-note">' + note + '</div>';

        // Insert bottom-banner after footer
        var banner = document.createElement('div');
        banner.className = 'bottom-banner';
        el.parentNode.insertBefore(banner, el.nextSibling);
    }

    // Run on DOMContentLoaded or immediately if already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildFooter);
    } else {
        buildFooter();
    }
})();
