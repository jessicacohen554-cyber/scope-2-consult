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
    var FOOTER_LINKS = [
        { href: 'index.html',    label: 'Home' },
        { href: '#by-question',  label: 'Explore Responses' },
        { href: '#themes',       label: 'Key Themes' },
        { href: '#methodology',  label: 'Methodology' },
        { href: '#about',        label: 'About' }
    ];

    var DEFAULT_NOTE = 'Scope 2 Public Consultation Response Explorer';

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
