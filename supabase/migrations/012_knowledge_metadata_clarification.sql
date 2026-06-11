-- =====================================================
-- Migration 012: KB citation metadata + curated source + interactive clarification
-- =====================================================

-- (A) Per-document species + topic tags + an optional source-name override
-- (so a curated entry can cite its true origin, e.g. "FDA", instead of the
-- generic connector name).
alter table public.knowledge_documents
  add column if not exists species     text[],
  add column if not exists topic_tags  text[],
  add column if not exists source_name text;

-- (A) Retrieval RPC now also returns the human-readable SOURCE NAME (for the
-- "Sources" citation UI) plus species/topic tags. Drop first — the return
-- signature changes, which CREATE OR REPLACE cannot do.
drop function if exists public.match_knowledge_chunks(vector, int, float);
create or replace function public.match_knowledge_chunks(
  query_embedding vector(1024),
  match_count int default 6,
  min_similarity float default 0.5
)
returns table (
  chunk_id uuid,
  document_id uuid,
  content text,
  similarity float,
  title text,
  url text,
  authors text[],
  published_at date,
  license text,
  source_name text,
  species text[],
  topic_tags text[]
)
language sql
stable
as $$
  select
    c.id as chunk_id,
    c.document_id,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity,
    d.title,
    d.url,
    d.authors,
    d.published_at,
    d.license,
    coalesce(d.source_name, s.name) as source_name,
    d.species,
    d.topic_tags
  from public.knowledge_chunks c
  join public.knowledge_documents d on d.id = c.document_id
  join public.knowledge_sources   s on s.id = d.source_id
  where c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- (A) Curated, license-clean reference corpus (public-domain US gov + CC),
-- ingested from a committed JSON seed file via the `curated` connector.
insert into public.knowledge_sources (key, name, kind, license, config)
values (
  'curated',
  'PawCheck Curated Veterinary Reference',
  'file',
  'Public Domain (US Gov) / CC',
  jsonb_build_object('path', 'knowledge-seed/veterinary-reference.json')
)
on conflict (key) do nothing;

-- (A+B) Assessment record gains: grounding SOURCES surfaced to the user, and the
-- full interactive CLARIFICATION exchange (rounds of questions/answers/photos).
alter table public.queries
  add column if not exists sources       jsonb,
  add column if not exists clarification jsonb;
