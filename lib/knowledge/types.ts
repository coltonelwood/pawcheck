/**
 * Shared types for the veterinary knowledge base (RAG).
 */

/** A document as returned by a source connector, before storage. */
export interface SourceDocument {
  /** Stable id within the source (PMID, DOI, ...). Used for dedup. */
  externalId: string
  title: string
  url?: string
  authors?: string[]
  license?: string
  /** ISO date string (YYYY-MM-DD) if known. */
  publishedAt?: string
  /** Cleaned text to embed (abstract or full text). */
  content: string
}

/** A source connector: knows how to discover documents from one open source. */
export interface KnowledgeSourceConnector {
  key: string
  /**
   * Fetch a page of relevant documents. Connectors only return legally
   * usable content (open-access / licensed). `config` is the per-source
   * JSON stored in knowledge_sources.config.
   */
  fetchDocuments(config: Record<string, any>, opts: { limit: number }): Promise<SourceDocument[]>
}

/** A retrieved passage with its citation, returned by retrieveKnowledge(). */
export interface RetrievedPassage {
  content: string
  similarity: number
  title: string
  url: string | null
  authors: string[] | null
  publishedAt: string | null
  license: string | null
}
