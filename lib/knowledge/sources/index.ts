/**
 * Connector registry. Add new open-access sources here and seed a matching
 * row in knowledge_sources (migration / SQL) with the same `key`.
 */

import type { KnowledgeSourceConnector } from '../types'
import { europePmcConnector } from './europepmc'
import { plosConnector } from './plos'

const CONNECTORS: Record<string, KnowledgeSourceConnector> = {
  [europePmcConnector.key]: europePmcConnector,
  [plosConnector.key]: plosConnector,
}

export function getConnector(key: string): KnowledgeSourceConnector | null {
  return CONNECTORS[key] || null
}
