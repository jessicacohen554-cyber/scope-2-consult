# QA / verification brief

You are the verification shard. Your job is adversarial: find every place a page says
something its dossier does not support, says it more strongly than the source, mislabels
an inference as sourced, invents a number, breaks a citation, or renders badly.

Inputs
- Pages: guidance-explainer/site/*.html (not _template.html)
- Dossiers: guidance-explainer/research/R1..R4 (the ONLY permitted factual basis;
  pages map to dossiers: ccs-* → R1; scope2-update, governance → R2; storage-* → R3;
  consequential-* → R4; index.html may draw on all four at headline level)
- Rules: guidance-explainer/BUILD-BRIEF.md
- Render checker: node /tmp/claude-0/-home-user-scope-2-consult/b28ef211-cbcf-518f-a8b6-e173dc77c534/scratchpad/shoot.js <site dir> <pages...>

Checks (do all; report per page)
1. Citation integrity: every `.cite` href `sources.html#id` resolves to a row id in
   sources.html; every cite's tier class matches the row's tier; chip text names a
   document consistent with the row.
2. Quote fidelity: every `.quote` / `.defn` verbatim text appears in the dossier
   (allow whitespace/typographic-quote differences only). List any altered quote.
3. Claim support: sample every section's sourced sentences (not just a few): find the
   supporting dossier passage; flag anything unsupported, over-stated (shall vs should
   vs may; proposed vs adopted; pulse check vs decision), or attributed to the wrong
   document/date.
4. Numbers: every number on a page must be in the dossier's "Numbers you may use" or
   elsewhere in the dossier with the same unit and base; flag any invented or
   mis-based figure (e.g. the two-denominator caution in R3).
5. Labels: anything reasoned-not-sourced must sit in an inference callout or be
   marked INFERENCE; anything unknown must be a gap callout; nothing in a plain
   paragraph may be an inference.
6. Terms: check that defined terms (removal, captured CO2 pathway, incrementality,
   deliverability, hourly matching, Statement 1/2/3, qualifying storage, OM/BM,
   primary/secondary effects) are used in the sense the dossier records.
7. Render: run the checker on every page; note OVERFLOW/console errors; open the
   phone screenshots and flag unreadable SVG text, overlaps, clipped labels, empty
   figures, broken toggles (check that each .seg/.stepper/.matrix has matching targets).
8. Links: pager prev/next and nav links point to existing files; no TODO/placeholder.

Output: write guidance-explainer/research/QA-REPORT.md with a table per page:
severity (blocker / fix / nit) | location (section heading or quote start) | problem |
dossier reference | proposed fix (exact replacement text where possible). Then FIX
every blocker and fix-level item directly in the page files (minimal edits; keep the
page's structure), re-run the render checker, and list what you changed. Do not fix
nits unless trivial. Do not commit.
