# Knowledge Base Sources & Licensing

This document is the licensing-compliance record for the PawCheck veterinary
knowledge base (the RAG corpus that grounds AI assessments). It lists every data
source that is ingested, what it provides, the license it is used under, how it
is accessed, and the official origin URL/domain.

## Hard licensing policy

PawCheck ingests **only** legally-usable veterinary content:

- **Open-access veterinary literature** — ingested under each article's own
  open-access license (Creative Commons variants). We respect the per-article
  license recorded with each document.
- **CC-licensed references** — content published under Creative Commons.
- **US-government public-domain sources** — FDA, CDC, USDA, NIH/NLM, EPA. Works
  produced by US federal agencies are in the public domain.
- **Openly-licensed university extension materials** — when used, only those
  published under an open/CC license.

PawCheck does **NOT** scrape or ingest copyrighted or paywalled material,
including but not limited to:

- The Merck Veterinary Manual and other copyrighted textbooks
- VIN (Veterinary Information Network)
- Paywalled / subscription journals (anything outside the open-access subset)
- ASPCA content
- Commercial / proprietary veterinary websites

Every ingested chunk records its **source**, **license**, and **URL** as
metadata, and these are surfaced as citations in the app at assessment time.

## Sources

The active sources are registered as rows in the `knowledge_sources` table
(`supabase/migrations/006_knowledge_base.sql`, `011_clinical_knowledge_sources.sql`,
`012_knowledge_metadata_clarification.sql`) and implemented as connectors in
`lib/knowledge/sources/`.

| Source | Provides | License | Access method | Official URL / domain |
| --- | --- | --- | --- | --- |
| **Europe PMC (Open Access subset)** | Title + abstract of open-access veterinary clinical journal articles | Per-article open-access (Creative Commons variants); the connector filters to `OPEN_ACCESS:y` | Live REST search API (`europepmc` connector, `lib/knowledge/sources/europepmc.ts`); no API key | https://europepmc.org (API: https://www.ebi.ac.uk/europepmc/webservices/rest/search) |
| **PLOS (Public Library of Science)** | Title + abstract of PLOS articles | CC-BY | Live Solr search API (`plos` connector, `lib/knowledge/sources/plos.ts`) — **currently disabled** | https://plos.org (API: https://api.plos.org/search) |
| **PawCheck Curated Veterinary Reference** | Plain-language triage reference (toxic foods/plants/substances, emergencies, common complaints) authored from US-government public-domain sources | Public Domain (US Government) / CC | Committed JSON seed file ingested via the `curated` connector (`lib/knowledge/sources/curated.ts`) | File: `knowledge-seed/veterinary-reference.json` |

### Europe PMC

- Public REST search API, no key required. Returns title + abstract only.
- Restricted to the **open-access subset** via the `OPEN_ACCESS:y` filter.
- Migration `011_clinical_knowledge_sources.sql` retargets the query to
  open-access **veterinary clinical journals** (BMC Veterinary Research,
  Frontiers in Veterinary Science, Journal of Feline Medicine and Surgery,
  Journal of Small Animal Practice, Journal of Veterinary Internal Medicine,
  Veterinary Sciences, Animals) AND companion-animal clinical terms, English
  language. This keeps the corpus high-signal and on-topic.
- Each document's license is taken from the article's own `license` field
  (defaulting to `open-access`).

### PLOS

- All PLOS content is CC-BY. Connector returns title + abstract.
- **Disabled** in migration `011_clinical_knowledge_sources.sql`
  (`enabled = false`) because PLOS ONE is general science; it is to be
  re-enabled only with a vet-specific query.

### Curated reference corpus

- File: `knowledge-seed/veterinary-reference.json`
- **42 entries**, statically imported and bundled into the serverless function
  (no runtime filesystem reads).
- Distinct `source_name` / `license` values present in the file:

  | `source_name` | `license` | Entries | Domain |
  | --- | --- | --- | --- |
  | NIH National Library of Medicine | Public Domain (US Government) | 22 | www.ncbi.nlm.nih.gov |
  | FDA Center for Veterinary Medicine | Public Domain (US Government) | 19 | www.fda.gov |
  | EPA | Public Domain (US Government) | 1 | www.epa.gov |

  All 42 curated entries are attributed to public-domain US-government sources.

## Compliance notes

- **Per-chunk attribution is retained.** Every document/chunk stores its
  `source_name`, `license`, and `url`. The retrieval RPC
  (`match_knowledge_chunks`) returns these fields, and they are surfaced as
  citations in the app's "Sources" UI for each assessment.
- **Curated entries are original summaries, not verbatim copies.** The curated
  corpus consists of original plain-language summaries of established veterinary
  knowledge, attributed to the public-domain US-government sources they are
  derived from — they are not copied text from those sources. (The
  US-government sources are themselves public domain regardless.)
- **No prescription dosing.** Medication-related entries never include
  prescription dosing specifics.
- **Open-access only for literature.** Europe PMC ingestion is filtered to the
  open-access subset, and only title + abstract are stored. Paywalled full text
  is never fetched or stored.

## How to add a source

1. Add a row to `knowledge_sources` (via a new migration) with a stable `key`,
   `name`, `kind` (`api` | `file` | `sitemap`), `license`, and connector
   `config`.
2. Add a matching connector in `lib/knowledge/sources/` implementing
   `KnowledgeSourceConnector` (see `europepmc.ts`, `plos.ts`, `curated.ts`).
3. **Only add legally-usable content** — open-access, Creative Commons, or
   US-government public-domain. Record the correct `license` and `url` so they
   propagate to per-chunk citations. Do not add copyrighted textbooks,
   paywalled journals, or proprietary/commercial sources.
