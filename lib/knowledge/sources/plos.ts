/**
 * PLOS connector — Public Library of Science, all content CC-BY.
 *
 * Uses the public Solr search API (no key required). Returns title + abstract.
 *
 * Docs: https://api.plos.org/solr/search-fields/
 */

import type { KnowledgeSourceConnector, SourceDocument } from '../types'

const SEARCH_URL = 'https://api.plos.org/search'

export const plosConnector: KnowledgeSourceConnector = {
  key: 'plos',

  async fetchDocuments(config, { limit }): Promise<SourceDocument[]> {
    const baseQuery: string = config.query || 'veterinary OR canine OR feline'

    const params = new URLSearchParams({
      // restrict to articles that actually have an abstract body
      q: `(${baseQuery}) AND doc_type:full AND abstract:[* TO *]`,
      fl: 'id,title,author,abstract,publication_date,journal',
      wt: 'json',
      rows: String(Math.min(limit, config.page_size || 25)),
      sort: 'publication_date desc',
    })

    const res = await fetch(`${SEARCH_URL}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      throw new Error(`PLOS search failed (${res.status})`)
    }

    const data = await res.json()
    const docs: any[] = data?.response?.docs || []

    return docs
      .map((d): SourceDocument | null => {
        const title = Array.isArray(d.title) ? d.title[0] : d.title
        const abstractArr = Array.isArray(d.abstract) ? d.abstract : [d.abstract]
        const abstract = (abstractArr || []).filter(Boolean).join(' ').trim()
        if (!title || !abstract) return null
        const doi: string = d.id // PLOS id is the DOI
        return {
          externalId: doi,
          title: String(title).replace(/\s+/g, ' ').trim(),
          url: `https://journals.plos.org/plosone/article?id=${encodeURIComponent(doi)}`,
          authors: Array.isArray(d.author) ? d.author : undefined,
          license: 'CC-BY',
          publishedAt: d.publication_date ? String(d.publication_date).slice(0, 10) : undefined,
          content: `${title}\n\n${abstract}`.replace(/<[^>]+>/g, ' '),
        }
      })
      .filter((d): d is SourceDocument => d !== null)
  },
}
