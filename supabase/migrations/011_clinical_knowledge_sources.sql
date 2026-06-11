-- =====================================================
-- Migration 011: Retarget the knowledge base to CLINICAL content
-- =====================================================
-- The initial broad queries ("any paper mentioning canine/feline") filled the
-- corpus with off-topic research. Restrict Europe PMC to open-access VETERINARY
-- CLINICAL journals + companion-animal clinical terms (relevance-ranked), and
-- disable the general-science PLOS source to keep the corpus high-signal.
-- =====================================================

update public.knowledge_sources
set config = jsonb_build_object(
  'query',
  '(JOURNAL:"BMC Veterinary Research" OR JOURNAL:"Frontiers in Veterinary Science" OR JOURNAL:"Journal of Feline Medicine and Surgery" OR JOURNAL:"Journal of Small Animal Practice" OR JOURNAL:"Journal of Veterinary Internal Medicine" OR JOURNAL:"Veterinary Sciences" OR JOURNAL:"Animals") AND (dog OR cat OR canine OR feline) AND (disease OR clinical OR treatment OR diagnosis OR symptom OR management) AND OPEN_ACCESS:y AND LANG:eng',
  'page_size', 100
)
where key = 'europepmc';

-- PLOS ONE is general science; re-enable later only with a vet-specific query.
update public.knowledge_sources set enabled = false where key = 'plos';
