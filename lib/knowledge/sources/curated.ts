/**
 * Curated connector: a committed, license-clean reference corpus authored from
 * public-domain US-government and CC-licensed veterinary sources (FDA, CDC, NIH,
 * USDA, ...). Guarantees coverage of high-priority triage topics (toxic
 * foods/plants/substances, emergency presentations, common complaints) that a
 * broad literature crawl misses.
 *
 * The JSON seed is imported statically so it is bundled into the serverless
 * function (no filesystem reads at runtime). Each entry records its true source
 * + license, surfaced as a citation at assessment time.
 */

import type { KnowledgeSourceConnector, SourceDocument } from '../types'
import entries from '../../../knowledge-seed/veterinary-reference.json'

interface CuratedEntry {
  external_id: string
  title: string
  content: string
  source_name: string
  license: string
  url: string
  species: string[]
  topic_tags: string[]
}

export const curatedConnector: KnowledgeSourceConnector = {
  key: 'curated',
  async fetchDocuments(_config, { limit }): Promise<SourceDocument[]> {
    const data = entries as CuratedEntry[]
    return data.slice(0, limit).map((e) => ({
      externalId: e.external_id,
      title: e.title,
      url: e.url,
      license: e.license,
      sourceName: e.source_name,
      species: e.species,
      topicTags: e.topic_tags,
      content: e.content,
    }))
  },
}
