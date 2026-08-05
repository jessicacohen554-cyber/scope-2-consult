// ============================================================================
// ECOrgTable - searchable / sortable / filterable named-organization browser
// ============================================================================
// Site-specific module (not an upstream design-system file). Port of the
// repo-root hub's S2OrgTable, with stance-fingerprint chips in place of the
// 7-anchor Likert sparkline — this survey has no scores to spark.
//
// Consumes `respondents.json` → `org_index` (PLAN §5):
//   {id, name(≤80), org_type, audited_class, country, nsub, ft_chars, cites,
//    template, family, fingerprint:{q19,q21,q24,q31,q33: option key | null}}
// and lazily fetches `orgs/{id}.json` when a row is expanded:
//   {id, name, org_type, audited_class, audit_basis, sector, country,
//    responding_as, flags:{template, family, cites, citation_count},
//    answers:[{qid, display, shorthand, label, type, text, selections:[...]}]}
//
//   ECOrgTable.render(el, rows, {meta, fingerprint, pageSize, orgLoader, ...})
//
// Vanilla only: no virtualization, no framework. The ~106 named analytical-base
// respondents render fine, and rows beyond `pageSize` come in on demand so the
// initial DOM stays small.
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

    // The five questions PLAN §4 puts in the fingerprint. `field` is the key
    // inside org_index[].fingerprint; `qid` is how meta.json names the same
    // question. The two differ by contract — see PLAN §5.
    var FINGERPRINT = [
        { field: 'q19', qid: 'Q019', short: 'Q19' },
        { field: 'q21', qid: 'Q021', short: 'Q21' },
        { field: 'q24', qid: 'Q024', short: 'Q24' },
        { field: 'q31', qid: 'Q031', short: 'Q31' },
        { field: 'q33', qid: 'Q033', short: 'Q33' }
    ];

    var uid = 0;

    var COLUMNS = [
        { key: 'name',          label: 'Organization', type: 'text' },
        { key: 'org_type',      label: 'Claimed type', type: 'seg', dim: 'org_type_5' },
        { key: 'audited_class', label: 'Audited class', type: 'slug' },
        { key: 'country',       label: 'Country', type: 'seg', dim: 'country_4' },
        { key: 'nsub',          label: 'Answers', type: 'num' },
        { key: 'ft_chars',      label: 'Free text', type: 'num' },
        { key: 'flags',         label: 'Flags', type: 'flags', sortable: false },
        { key: 'fingerprint',   label: 'Stance fingerprint', type: 'fingerprint',
          sortable: false }
    ];

    function slug(s) {
        return s ? String(s).replace(/_/g, ' ') : '—';
    }

    function labelFor(meta, dim, key) {
        if (!key) return '—';
        var segs = meta && meta.segments && meta.segments[dim];
        if (segs && segs.values) {
            for (var i = 0; i < segs.values.length; i++) {
                if (segs.values[i].key === key) return segs.values[i].label;
            }
        }
        if (window.ECQuotes && dim === 'org_type_5') {
            return ECQuotes.orgLabel(key, meta);
        }
        return slug(key);
    }

    function num(v) {
        return typeof v === 'number' ? v : (v === null || v === undefined ? -1 : +v || 0);
    }

    function fmtNum(v) {
        if (v === null || v === undefined) return '—';
        return Number(v).toLocaleString('en-US');
    }

    function shorten(s, n) {
        s = String(s || '');
        return s.length > n ? s.slice(0, n - 1) + '…' : s;
    }

    // One chip per fingerprint question, colored by the same palette the stance
    // strips use, so a row reads the same way the charts do.
    function fingerprintChips(row, meta, spec) {
        var fp = row.fingerprint || {};
        return '<span class="ec-fp">' + spec.map(function(f) {
            var key = fp[f.field];
            var q = (window.ECData && ECData.question(meta, f.qid)) || null;
            if (key === null || key === undefined || key === '' || key === '-') {
                return '<span class="ec-fp-chip ec-fp-chip--na" title="' +
                    esc(f.short) + ': not answered">' + esc(f.short) + '</span>';
            }
            var label = key, style = '', idx = -1;
            if (q && q.options) {
                q.options.forEach(function(o, i) {
                    if (o.key === key) { label = o.label; idx = i; }
                });
                if (idx >= 0 && window.ECStance) {
                    var sw = ECStance.palette(q)[idx];
                    if (sw) style = 'background:' + sw.bg + ';color:' + sw.fg + ';';
                }
            }
            return '<span class="ec-fp-chip"' +
                (style ? ' style="' + style + '"' : '') + ' title="' +
                esc(f.short + ' ' + ((q && q.label) || '') + ': ' + label) + '">' +
                esc(shorten(label, 9)) + '</span>';
        }).join('') + '</span><span class="sr-only">' +
            esc(spec.map(function(f) {
                var key = (row.fingerprint || {})[f.field];
                return f.short + ' ' + (key ? slug(key) : 'not answered');
            }).join(', ')) + '</span>';
    }

    function flagTags(row) {
        var out = '';
        if (row.cites) out += '<span class="ec-tag ec-tag-cite" title="Free text ' +
            'contains citation signals">cites</span>';
        if (row.template) out += '<span class="ec-tag ec-tag-template" ' +
            'title="Shares verbatim text with other respondents">template</span>';
        if (row.family) out += '<span class="ec-tag ec-tag-family" ' +
            'title="Entity family: ' + esc(slug(row.family)) + '">family</span>';
        return out || '<span class="ec-tag-none">—</span>';
    }

    function render(target, rows, opts) {
        var el = node(target);
        if (!el) return null;
        opts = opts || {};
        var meta = opts.meta || null;
        var all = (rows || []).slice();
        var fpSpec = opts.fingerprint || FINGERPRINT;
        var pageSize = opts.pageSize || 25;
        var loader = opts.orgLoader ||
            (window.ECData ? ECData.loadOrg : function() {
                return Promise.reject(new Error('No org loader available'));
            });
        var columns = opts.columns || COLUMNS;
        var id = 'ec-orgtable-' + (++uid);

        var state = {
            q: '',
            filters: {},
            sortKey: opts.sortKey || 'nsub',
            sortDir: opts.sortDir || 'desc',
            shown: pageSize
        };

        var filterDims = opts.filters ||
            ['org_type', 'audited_class', 'country'];
        var DIM_OF = { org_type: 'org_type_5', country: 'country_4' };

        function distinct(key) {
            var seen = {}, out = [];
            all.forEach(function(r) {
                var v = r[key];
                if (v && !seen[v]) { seen[v] = true; out.push(v); }
            });
            out.sort();
            return out;
        }

        function cellText(row, col) {
            switch (col.type) {
                case 'seg':  return labelFor(meta, col.dim, row[col.key]);
                case 'slug': return slug(row[col.key]);
                case 'num':  return fmtNum(row[col.key]);
                default:     return row[col.key] === undefined ? '—'
                                                               : String(row[col.key]);
            }
        }

        function sortValue(row, col) {
            if (col.type === 'num') return num(row[col.key]);
            return String(cellText(row, col)).toLowerCase();
        }

        function filtered() {
            var q = state.q.trim().toLowerCase();
            return all.filter(function(r) {
                if (q && String(r.name || '').toLowerCase().indexOf(q) < 0) return false;
                for (var k in state.filters) {
                    if (state.filters[k] && String(r[k]) !== state.filters[k]) return false;
                }
                return true;
            });
        }

        function sorted(list) {
            var col = null;
            columns.forEach(function(c) { if (c.key === state.sortKey) col = c; });
            if (!col) return list;
            var dir = state.sortDir === 'asc' ? 1 : -1;
            return list.slice().sort(function(a, b) {
                var va = sortValue(a, col), vb = sortValue(b, col);
                if (va < vb) return -dir;
                if (va > vb) return dir;
                return String(a.name || '').localeCompare(String(b.name || ''));
            });
        }

        function labelForDim(key) {
            var dimKey = DIM_OF[key] || key;
            var segs = meta && meta.segments && meta.segments[dimKey];
            if (segs && segs.label) return segs.label;
            return slug(key);
        }

        function controlsHtml() {
            var html = '<div class="ec-table-controls">' +
                '<div class="ec-field"><label class="ec-control-label" for="' + id +
                '-q">Search organizations</label>' +
                '<input class="ec-input" type="search" id="' + id + '-q" ' +
                'placeholder="Name contains…" value="' + esc(state.q) + '"></div>';
            filterDims.forEach(function(key) {
                var vals = distinct(key);
                if (!vals.length) return;
                html += '<div class="ec-field"><label class="ec-control-label" for="' +
                    id + '-f-' + key + '">' + esc(labelForDim(key)) + '</label>' +
                    '<select class="ec-select" id="' + id + '-f-' + key +
                    '" data-filter="' + key + '"><option value="">All</option>';
                vals.forEach(function(v) {
                    html += '<option value="' + esc(v) + '"' +
                        (state.filters[key] === v ? ' selected' : '') + '>' +
                        esc(labelFor(meta, DIM_OF[key] || key, v)) + '</option>';
                });
                html += '</select></div>';
            });
            html += '</div>';
            return html;
        }

        function paint() {
            var list = sorted(filtered());
            var visible = list.slice(0, state.shown);

            var html = controlsHtml() +
                '<div class="ec-table-status" role="status">' +
                'Showing ' + visible.length + ' of ' + list.length +
                ' organizations' + (list.length !== all.length
                    ? ' (' + all.length + ' named in the analytical base)' : '') +
                '.</div>' +
                '<div class="ec-table-scroll"><table class="data-table ec-org-table">' +
                '<caption class="sr-only">Named respondent organizations — ' +
                'searchable and sortable; expand a row for the full profile. ' +
                'Redacted respondents are not listed and are never named.' +
                '</caption><thead><tr>';

            columns.forEach(function(col) {
                var sortable = col.sortable !== false;
                var isSort = state.sortKey === col.key;
                html += '<th scope="col"' +
                    (sortable ? ' aria-sort="' + (isSort
                        ? (state.sortDir === 'asc' ? 'ascending' : 'descending')
                        : 'none') + '"' : '') + '>';
                if (sortable) {
                    html += '<button type="button" class="ec-sort" data-sort="' +
                        esc(col.key) + '">' + esc(col.label) +
                        '<span class="ec-sort-caret" aria-hidden="true">' +
                        (isSort ? (state.sortDir === 'asc' ? '▲' : '▼') : '') +
                        '</span></button>';
                } else {
                    html += esc(col.label);
                }
                html += '</th>';
            });
            html += '<th scope="col"><span class="sr-only">Profile</span></th>' +
                '</tr></thead><tbody>';

            visible.forEach(function(row) {
                html += '<tr class="ec-org-row" data-id="' + esc(row.id) + '">';
                columns.forEach(function(col) {
                    if (col.type === 'fingerprint') {
                        html += '<td class="ec-td-fp">' +
                            fingerprintChips(row, meta, fpSpec) + '</td>';
                    } else if (col.type === 'flags') {
                        html += '<td class="ec-td-flags">' + flagTags(row) + '</td>';
                    } else if (col.key === 'name') {
                        html += '<td class="ec-td-name">' + esc(row.name || '—') + '</td>';
                    } else {
                        html += '<td' + (col.type === 'num' ? ' class="num"' : '') + '>' +
                            esc(cellText(row, col)) + '</td>';
                    }
                });
                html += '<td class="ec-td-expand">' +
                    '<button type="button" class="btn-pill ec-expand" data-id="' +
                    esc(row.id) + '" aria-expanded="false">Profile</button></td></tr>';
                html += '<tr class="ec-org-detail-row" data-detail="' + esc(row.id) +
                    '" hidden><td colspan="' + (columns.length + 1) +
                    '"><div class="ec-org-detail"></div></td></tr>';
            });

            html += '</tbody></table></div>';

            if (list.length > visible.length) {
                var remaining = list.length - visible.length;
                html += '<div class="ec-table-more"><button type="button" ' +
                    'class="btn-pill ec-more">Show ' +
                    Math.min(pageSize, remaining) + ' more</button>' +
                    '<span class="ec-note">' + remaining +
                    ' still hidden</span></div>';
            }

            el.innerHTML = html;
            el.classList.add('ec-org-browser');
        }

        function detailHtml(org) {
            var flags = org.flags || {};
            var html = '<div class="ec-org-head">' +
                '<span class="ec-org-name">' + esc(org.name || '') + '</span>' +
                '<span class="ec-org-meta">' +
                esc(labelFor(meta, 'org_type_5', org.org_type)) + ' · ' +
                esc(slug(org.audited_class)) + ' · ' +
                esc(org.sector || '—') + ' · ' +
                esc(labelFor(meta, 'country_4', org.country)) + ' · ' +
                esc(slug(org.responding_as)) + '</span></div>';

            if (org.audit_basis) {
                html += '<p class="ec-org-audit"><strong>Audit basis.</strong> ' +
                    esc(org.audit_basis) + '</p>';
            }

            html += '<div class="ec-org-flags">';
            if (flags.template) html += '<span class="ec-tag ec-tag-template">' +
                'template response</span>';
            if (flags.family) html += '<span class="ec-tag ec-tag-family">family: ' +
                esc(slug(flags.family)) + '</span>';
            if (flags.cites) html += '<span class="ec-tag ec-tag-cite">' +
                esc(flags.citation_count || 0) + ' citation signals</span>';
            html += '</div>';

            var answers = org.answers || [];
            html += '<div class="ec-org-answers"><h5 class="ec-org-subhead">' +
                answers.length + ' recorded answers, in survey order</h5>' +
                '<ul class="ec-answer-list">';
            answers.forEach(function(a) {
                var disp = a.display ||
                    (window.ECData ? ECData.display(meta, a.qid) : a.qid);
                html += '<li class="ec-answer"><span class="ec-answer-q">' +
                    esc(disp) + '</span><span class="ec-answer-body">' +
                    '<span class="ec-answer-label">' +
                    esc(a.label || a.shorthand || '') + '</span>';
                if (a.selections && a.selections.length) {
                    html += '<span class="ec-answer-selections">' +
                        a.selections.map(function(sel) {
                            return '<span class="ec-tag">' + esc(sel) + '</span>';
                        }).join('') + '</span>';
                }
                if (a.text) {
                    html += '<span class="ec-answer-text">' + esc(a.text) + '</span>';
                }
                html += '</span></li>';
            });
            html += '</ul></div>';
            return html;
        }

        function toggleDetail(btn) {
            var rowId = btn.getAttribute('data-id');
            var detailRow = el.querySelector('tr[data-detail="' + rowId + '"]');
            if (!detailRow) return;
            var open = btn.getAttribute('aria-expanded') === 'true';
            if (open) {
                btn.setAttribute('aria-expanded', 'false');
                btn.textContent = 'Profile';
                detailRow.hidden = true;
                return;
            }
            btn.setAttribute('aria-expanded', 'true');
            btn.textContent = 'Hide';
            detailRow.hidden = false;
            var holder = detailRow.querySelector('.ec-org-detail');
            if (holder.getAttribute('data-loaded') === '1') return;
            holder.innerHTML = '<p class="ec-loading">Loading profile…</p>';
            loader(rowId).then(function(org) {
                holder.innerHTML = detailHtml(org);
                holder.setAttribute('data-loaded', '1');
            }).catch(function(err) {
                if (window.ECData) {
                    ECData.errorPanel(holder, err, { title: 'Profile unavailable' });
                } else {
                    holder.innerHTML = '<p class="ec-error-detail">' +
                        esc(err && err.message) + '</p>';
                }
            });
        }

        el.addEventListener('click', function(ev) {
            var sortBtn = ev.target.closest('.ec-sort');
            if (sortBtn) {
                var key = sortBtn.getAttribute('data-sort');
                if (state.sortKey === key) {
                    state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
                } else {
                    state.sortKey = key;
                    state.sortDir = key === 'name' ? 'asc' : 'desc';
                }
                paint();
                return;
            }
            if (ev.target.closest('.ec-more')) {
                state.shown += pageSize;
                paint();
                return;
            }
            var expand = ev.target.closest('.ec-expand');
            if (expand) toggleDetail(expand);
        });

        el.addEventListener('input', function(ev) {
            if (ev.target.id === id + '-q') {
                state.q = ev.target.value;
                state.shown = pageSize;
                paint();
                var input = document.getElementById(id + '-q');
                if (input) {
                    input.focus();
                    input.setSelectionRange(input.value.length, input.value.length);
                }
            }
        });

        el.addEventListener('change', function(ev) {
            var key = ev.target.getAttribute && ev.target.getAttribute('data-filter');
            if (!key) return;
            state.filters[key] = ev.target.value;
            state.shown = pageSize;
            paint();
        });

        paint();

        return {
            el: el,
            state: state,
            refresh: paint,
            open: function(rowId) {
                var btn = el.querySelector('.ec-expand[data-id="' + rowId + '"]');
                if (btn && btn.getAttribute('aria-expanded') !== 'true') {
                    toggleDetail(btn);
                }
                return !!btn;
            },
            rows: function() { return all.slice(); }
        };
    }

    window.ECOrgTable = {
        render: render,
        COLUMNS: COLUMNS,
        FINGERPRINT: FINGERPRINT
    };
})();
