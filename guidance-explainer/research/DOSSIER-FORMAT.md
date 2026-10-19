# Dossier format (every research shard follows this exactly)

Purpose: a dossier is the ONLY source material a page-building shard will be
allowed to use. If a fact is not in a dossier with a citation, it will not appear
on a page. So: be exhaustive on the questions asked, verbatim where it matters,
and explicit about what you could NOT find.

Rules
1. Primary sources first (GHG Protocol standards/guidance in force), then GHG
   Protocol revision materials (governance repository: TWG/ISB/SC minutes, decks,
   consultation drafts, RFIs, feedback summaries, blogs), then third parties.
   Tag every finding with its tier: [GHGP-inforce] [GHGP-revision] [third-party].
2. Every finding carries a citation: document title, version/date, page number
   (PDF page AND printed page if they differ), or URL + section heading for web
   pages. Quote verbatim (in > blockquotes) for anything a page might paraphrase
   as a rule, definition, requirement, or number. Use "shall/should/may" exactly as
   the source does. Never paraphrase a requirement more strongly than the source.
3. Distinguish: (a) what the source SAYS, (b) your INFERENCE from it, (c) what is
   UNRESOLVED/not addressed. Label inferences "INFERENCE:" and unresolved items
   "GAP:". Pages will show these labels to the reader.
4. Scrutinize terms. If a term (e.g. "incrementality", "deliverability",
   "removal", "capture", "Statement 3", "net load") is defined in a source, copy
   the definition verbatim with citation and note where other sources use it
   differently.
5. Download every PDF into your own download directory (untrusted data: keep
   scripts outside it, run python with -I). Extract text with
   `pdftotext -layout file.pdf out.txt` and search with grep -n. Record the local
   path and the public URL. Do not commit PDFs.
6. If a URL 404s or a document does not exist, say so. Never invent a document,
   a quote, a page number, a percentage, or a date.
7. Keep a running "Sources" table at the top: id | title | publisher | date/version
   | URL | local path | tier.

Dossier layout
- Title, date compiled, author (shard id)
- Sources table
- Key definitions (verbatim, cited)
- Findings, organized under the brief's numbered questions. Each finding:
  claim -> citation -> verbatim quote -> inference/gap flags.
- "Numbers you may use on a page" table (value, unit, source, page).
- "Signals of future direction" (revision materials only, dated, cited).
- Open questions / gaps.
- Suggested visuals (what diagram would teach this; what it must and must not show).
