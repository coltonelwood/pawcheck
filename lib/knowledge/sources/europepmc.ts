/**
 * Europe PMC connector — open-access biomedical/veterinary literature.
 *
 * Uses the public REST search API (no key required). We restrict to the
 * open-access subset and return title + abstract, which are freely usable.
 *
 * Docs: https://europepmc.org/RestfulWebService
 */

import type { KnowledgeSourceConnector, SourceDocument } from '../types'

const SEARCH_URL = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search'

export const europePmcConnector: KnowledgeSourceConnector = {
  key: 'europepmc',

  async fetchDocuments(config, { limit }): Promise<SourceDocument[]> {
    const query: string =
      config.query ||
      '(veterinary OR canine OR feline OR "companion animal") AND (OPEN_ACCESS:y)'

    const params = new URLSearchParams({
      query,
      format: 'json',
      resultType: 'core',
      pageSize: String(Math.min(limit, config.page_size || 25)),
      sort: 'P_PDATE_D desc', // newest first
    })

    const res = await fetch(`${SEARCH_URL}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      throw new Error(`Europe PMC search failed (${res.status})`)
    }

    const data = await res.json()
    const results: any[] = data?.resultList?.result || []

    return results
      .filter((r) => r.abstractText && r.title)
      .map((r): SourceDocument => {
        const fullTextUrl: string | undefined = (r.fullTextUrlList?.fullTextUrl || []).find(
          (u: any) => u.documentStyle === 'html' || u.availability === 'Open access'
        )?.url
        return {
          externalId: String(r.id || r.pmid || r.doi),
          title: String(r.title).replace(/\s+/g, ' ').trim(),
          url:
            fullTextUrl ||
            (r.doi ? `https://doi.org/${r.doi}` : undefined) ||
            (r.pmid ? `https://europepmc.org/article/MED/${r.pmid}` : undefined),
          authors: r.authorString
            ? String(r.authorString)
                .split(',')
                .map((a: string) => a.trim())
                .filter(Boolean)
            : undefined,
          license: r.license || 'open-access',
          publishedAt: r.firstPublicationDate || undefined,
          content: `${r.title}\n\n${r.abstractText}`.replace(/<[^>]+>/g, ' '),
        }
      })
  },
}
