// ============================================================================
// S2OrgTable - searchable / sortable / filterable named-organization browser
// ============================================================================
// Site-specific module (not an upstream design-system file).
//
// Consumes `respondents.json` → `org_index` (PLAN §5):
//   {id, name(≤80), org_type, audited_class, sector, country, nsub, pct,
//    ft_chars, cites, template, entity_group, bloc, anchors:[7 scores or null]}
// and lazily fetches `orgs/{id}.json` when a row is expanded.
//
//   S2OrgTable.render(el, rows, {meta, anchorQuestions, pageSize, ...})
//
// Vanilla only: no virtualization, no framework. ~500 rows render fine, and
// rows beyond `pageSize` come in on demand so the initial DOM stays small.
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

    var DEFAULT_ANCHORS = [71, 83, 97, 113, 124, 153, 171];
    var uid = 0;

    var COLUMNS = [
        { key: 'name',          label: 'Organization', type: 'text' },
        { key: 'org_type',      label: 'Claimed type', type: 'seg', dim: 'org_type' },
        { key: 'audited_class', label: 'Audited class', type: 'slug' },
        { key: 'sector',        label: 'Sector', type: 'seg', dim: 'sector' },
        { key: 'country',       label: 'Country', type: 'seg', dim: 'country' },
        { key: 'nsub',          label: 'Answers', type: 'num' },
        { key: 'ft_chars',      label: 'Free text', type: 'num' },
        { key: 'flags',         label: 'Flags', type: 'flags', sortable: false },
        { key: 'anchors',       label: 'Anchors', type: 'spark', sortable: false }
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
        if (window.S2Quotes && dim === 'org_type') return S2Quotes.orgLabel(key);
        return slug(key);
    }

    function num(v) {
        return typeof v === 'number' ? v : (v === null || v === undefined ? -1 : +v || 0);
    }

    function fmtNum(v) {
        if (v === null || v === undefined) return '—';
        return Number(v).toLocaleString('en-US');
    }

    function sparkline(anchors, questions) {
        var vals = anchors || [];
        var cells = vals.map(function(v, i) {
            var q = questions[i];
            if (v === null || v === undefined) {
                return '<span class="s2-spark-bar s2-spark-na" title="Q' +
                    esc(q) + ': not answered"></span>';
            }
            var lvl = Math.max(1, Math.min(5, Math.round(v)));
            return '<span class="s2-spark-bar s2-spark-' + lvl +
                '" style="--s2-spark-h:' + Math.round(100 * lvl / 5) +
                '%" title="Q' + esc(q) + ': ' + esc(v) + ' of 5"></span>';
        }).join('');
        var read = vals.map(function(v, i) {
            return 'Q' + questions[i] + ' ' + (v === null || v === undefined ? 'n/a' : v);
        }).join(', ');
        return '<span class="s2-spark" aria-hidden="true">' + cells + '</span>' +
            '<span class="sr-only">' + esc(read) + '</span>';
    }

    function flagTags(row) {
        var out = '';
        if (row.cites) out += '<span class="s2-tag s2-tag-cite" title="Free text ' +
            'contains citation signals">cites</span>';
        if (row.template) out += '<span class="s2-tag s2-tag-template" ' +
            'title="Shares verbatim text with other respondents">template</span>';
        if (row.bloc) out += '<span class="s2-tag s2-tag-bloc" title="Coordinated bloc: ' +
            esc(slug(row.bloc)) + '">' + esc(slug(row.bloc)) + '</span>';
        if (row.entity_group) out += '<span class="s2-tag s2-tag-family" ' +
            'title="Entity family: ' + esc(slug(row.entity_group)) + '">family</span>';
        return out || '<span class="s2-tag-none">—</span>';
    }

    function render(target, rows, opts) {
        var el = node(target);
        if (!el) return null;
        opts = opts || {};
        var meta = opts.meta || null;
        var all = (rows || []).slice();
        var anchorQs = opts.anchorQuestions || DEFAULT_ANCHORS;
        var pageSize = opts.pageSize || 25;
        var loader = opts.orgLoader ||
            (window.S2Data ? S2Data.loadOrg : function() {
                return Promise.reject(new Error('No org loader available'));
            });
        var columns = opts.columns || COLUMNS;
        var id = 's2-orgtable-' + (++uid);

        var state = {
            q: '',
            filters: {},
            sortKey: opts.sortKey || 'nsub',
            sortDir: opts.sortDir || 'desc',
            shown: pageSize
        };

        var filterDims = opts.filters ||
            ['org_type', 'audited_class', 'sector', 'country'];

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

        function controlsHtml() {
            var html = '<div class="s2-table-controls">' +
                '<div class="s2-field"><label class="s2-control-label" for="' + id +
                '-q">Search organizations</label>' +
                '<input class="s2-input" type="search" id="' + id + '-q" ' +
                'placeholder="Name contains…" value="' + esc(state.q) + '"></div>';
            filterDims.forEach(function(dimKey) {
                var vals = distinct(dimKey);
                if (!vals.length) return;
                html += '<div class="s2-field"><label class="s2-control-label" for="' +
                    id + '-f-' + dimKey + '">' +
                    esc(labelForDim(dimKey)) + '</label>' +
                    '<select class="s2-select" id="' + id + '-f-' + dimKey +
                    '" data-filter="' + dimKey + '"><option value="">All</option>';
                vals.forEach(function(v) {
                    html += '<option value="' + esc(v) + '"' +
                        (state.filters[dimKey] === v ? ' selected' : '') + '>' +
                        esc(labelFor(meta, dimKey, v)) + '</option>';
                });
                html += '</select></div>';
            });
            html += '</div>';
            return html;
        }

        function labelForDim(dimKey) {
            var segs = meta && meta.segments && meta.segments[dimKey];
            if (segs && segs.label) return segs.label;
            return slug(dimKey);
        }

        function paint() {
            var list = sorted(filtered());
            var visible = list.slice(0, state.shown);

            var html = controlsHtml() +
                '<div class="s2-table-status" role="status">' +
                'Showing ' + visible.length + ' of ' + list.length +
                ' organizations' + (list.length !== all.length
                    ? ' (' + all.length + ' total)' : '') + '.</div>' +
                '<div class="s2-table-scroll"><table class="data-table s2-org-table">' +
                '<caption class="sr-only">Named respondent organizations — ' +
                'searchable and sortable; expand a row for the full profile.' +
                '</caption><thead><tr>';

            columns.forEach(function(col) {
                var sortable = col.sortable !== false;
                var isSort = state.sortKey === col.key;
                html += '<th scope="col"' +
                    (sortable ? ' aria-sort="' + (isSort
                        ? (state.sortDir === 'asc' ? 'ascending' : 'descending')
                        : 'none') + '"' : '') + '>';
                if (sortable) {
                    html += '<button type="button" class="s2-sort" data-sort="' +
                        esc(col.key) + '">' + esc(col.label) +
                        '<span class="s2-sort-caret" aria-hidden="true">' +
                        (isSort ? (state.sortDir === 'asc' ? '▲' : '▼') : '') +
                        '</span></button>';
                } else {
                    html += esc(col.label);
                }
                html += '</th>';
            });
            html += '<th scope="col"><span class="sr-only">Profile</span></th></tr></thead><tbody>';

            visible.forEach(function(row) {
                html += '<tr class="s2-org-row" data-id="' + esc(row.id) + '">';
                columns.forEach(function(col) {
                    if (col.type === 'spark') {
                        html += '<td class="s2-td-spark">' +
                            sparkline(row.anchors, anchorQs) + '</td>';
                    } else if (col.type === 'flags') {
                        html += '<td class="s2-td-flags">' + flagTags(row) + '</td>';
                    } else if (col.key === 'name') {
                        html += '<td class="s2-td-name">' + esc(row.name || '—') + '</td>';
                    } else {
                        html += '<td' + (col.type === 'num' ? ' class="num"' : '') + '>' +
                            esc(cellText(row, col)) + '</td>';
                    }
                });
                html += '<td class="s2-td-expand">' +
                    '<button type="button" class="btn-pill s2-expand" data-id="' +
                    esc(row.id) + '" aria-expanded="false">Profile</button></td></tr>';
                html += '<tr class="s2-org-detail-row" data-detail="' + esc(row.id) +
                    '" hidden><td colspan="' + (columns.length + 1) +
                    '"><div class="s2-org-detail"></div></td></tr>';
            });

            html += '</tbody></table></div>';

            if (list.length > visible.length) {
                var remaining = list.length - visible.length;
                html += '<div class="s2-table-more"><button type="button" ' +
                    'class="btn-pill s2-more">Show ' +
                    Math.min(pageSize, remaining) + ' more</button>' +
                    '<span class="s2-note">' + remaining +
                    ' still hidden</span></div>';
            }

            el.innerHTML = html;
            el.classList.add('s2-org-browser');
        }

        function detailHtml(org) {
            var flags = org.flags || {};
            var html = '<div class="s2-org-head">' +
                '<span class="s2-org-name">' + esc(org.name || '') + '</span>' +
                '<span class="s2-org-meta">' +
                esc(labelFor(meta, 'org_type', org.org_type)) + ' · ' +
                esc(slug(org.audited_class)) + ' · ' +
                esc(labelFor(meta, 'sector', org.sector)) + ' · ' +
                esc(labelFor(meta, 'country', org.country)) + ' · ' +
                esc(slug(org.responding_as)) + '</span></div>';

            if (org.audit_basis) {
                html += '<p class="s2-org-audit"><strong>Audit basis.</strong> ' +
                    esc(org.audit_basis) + '</p>';
            }

            html += '<div class="s2-org-flags">';
            if (flags.template) html += '<span class="s2-tag s2-tag-template">template response</span>';
            if (flags.bloc) html += '<span class="s2-tag s2-tag-bloc">bloc: ' +
                esc(slug(flags.bloc)) + '</span>';
            if (flags.entity_group) html += '<span class="s2-tag s2-tag-family">family: ' +
                esc(slug(flags.entity_group)) + '</span>';
            if (flags.cites) html += '<span class="s2-tag s2-tag-cite">' +
                esc(flags.citation_count || 0) + ' citation signals</span>';
            html += '</div>';

            var answers = org.answers || [];
            html += '<div class="s2-org-answers"><h5 class="s2-org-subhead">' +
                answers.length + ' recorded answers</h5><ul class="s2-answer-list">';
            answers.forEach(function(a) {
                html += '<li class="s2-answer"><span class="s2-answer-q">Q' +
                    esc(a.q) + '</span><span class="s2-answer-body">' +
                    '<span class="s2-answer-label">' + esc(a.label || a.shorthand || '') +
                    '</span>';
                if (a.numeric !== null && a.numeric !== undefined) {
                    html += '<span class="s2-tag s2-tag-score">' + esc(a.numeric) + '</span>';
                }
                if (a.selections && a.selections.length) {
                    html += '<span class="s2-answer-selections">' +
                        a.selections.map(function(s) {
                            return '<span class="s2-tag">' + esc(s) + '</span>';
                        }).join('') + '</span>';
                }
                if (a.text) {
                    html += '<span class="s2-answer-text">' + esc(a.text) + '</span>';
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
            var holder = detailRow.querySelector('.s2-org-detail');
            if (holder.getAttribute('data-loaded') === '1') return;
            holder.innerHTML = '<p class="s2-loading">Loading profile…</p>';
            loader(rowId).then(function(org) {
                holder.innerHTML = detailHtml(org);
                holder.setAttribute('data-loaded', '1');
            }).catch(function(err) {
                if (window.S2Data) {
                    S2Data.errorPanel(holder, err, { title: 'Profile unavailable' });
                } else {
                    holder.innerHTML = '<p class="s2-error-detail">' +
                        esc(err && err.message) + '</p>';
                }
            });
        }

        el.addEventListener('click', function(ev) {
            var sortBtn = ev.target.closest('.s2-sort');
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
            if (ev.target.closest('.s2-more')) {
                state.shown += pageSize;
                paint();
                return;
            }
            var expand = ev.target.closest('.s2-expand');
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
            var dim = ev.target.getAttribute && ev.target.getAttribute('data-filter');
            if (!dim) return;
            state.filters[dim] = ev.target.value;
            state.shown = pageSize;
            paint();
        });

        paint();

        return {
            el: el,
            state: state,
            refresh: paint,
            rows: function() { return all.slice(); }
        };
    }

    window.S2OrgTable = {
        render: render,
        COLUMNS: COLUMNS,
        DEFAULT_ANCHORS: DEFAULT_ANCHORS
    };
})();
