-- Migration 006: Veterinary knowledge base (RAG)
-- A continuously-updated corpus of open-access / licensed veterinary literature.
-- Documents are fetched from source APIs, chunked, embedded (Voyage AI, 1024-dim),
-- and retrieved at assessment time to ground Claude's answers in real literature.

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- Sources registry: each row is an ingestion connector (Europe PMC, PLOS, ...)
-- ---------------------------------------------------------------------------
create table if not exists public.knowledge_sources (
  id            uuid primary key default uuid_generate_v4(),
  key           text unique not null,           -- stable connector key, e.g. 'europepmc'
  name          text not null,
  kind          text not null,                  -- 'api' | 'file' | 'sitemap'
  license       text,                           -- e.g. 'CC-BY', 'open-access'
  config        jsonb not null default '{}',    -- connector-specific (query, filters)
  enabled       boolean not null default true,
  last_crawled_at timestamptz,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Documents: one per source article/page. Deduped by (source_id, external_id).
-- ---------------------------------------------------------------------------
create table if not exists public.knowledge_documents (
  id            uuid primary key default uuid_generate_v4(),
  source_id     uuid not null references public.knowledge_sources(id) on delete cascade,
  external_id   text not null,                  -- source's stable id (PMID, DOI, ...)
  title         text not null,
  url           text,
  authors       text[],
  license       text,
  published_at  date,
  content       text not null,                  -- cleaned full text / abstract
  content_hash  text not null,                  -- sha256 of content for change detection
  -- ingestion lifecycle: discovered -> chunked -> embedded (or 'error')
  status        text not null default 'discovered',
  error         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (source_id, external_id)
);

create index if not exists knowledge_documents_status_idx
  on public.knowledge_documents (status);

-- ---------------------------------------------------------------------------
-- Chunks: embeddable slices of a document. 1024-dim matches Voyage voyage-3.5.
-- ---------------------------------------------------------------------------
create table if not exists public.knowledge_chunks (
  id            uuid primary key default uuid_generate_v4(),
  document_id   uuid not null references public.knowledge_documents(id) on delete cascade,
  chunk_index   int not null,
  content       text not null,
  token_count   int,
  embedding     vector(1024),                   -- null until embedded
  created_at    timestamptz not null default now(),
  unique (document_id, chunk_index)
);

-- Rows still needing an embedding (drives the /process worker).
create index if not exists knowledge_chunks_unembedded_idx
  on public.knowledge_chunks (document_id)
  where embedding is null;

-- Approximate-nearest-neighbour index for retrieval (cosine).
create index if not exists knowledge_chunks_embedding_idx
  on public.knowledge_chunks
  using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- Retrieval RPC: cosine similarity search over embedded chunks.
-- Returns chunk content + the parent document's citation metadata.
-- ---------------------------------------------------------------------------
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
  license text
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
    d.license
  from public.knowledge_chunks c
  join public.knowledge_documents d on d.id = c.document_id
  where c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ---------------------------------------------------------------------------
-- RLS: the knowledge base is server-only (service role). No public access.
-- ---------------------------------------------------------------------------
alter table public.knowledge_sources   enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks    enable row level security;
-- No policies = only the service role (which bypasses RLS) can read/write.

-- ---------------------------------------------------------------------------
-- Seed the initial open-access source connectors.
-- ---------------------------------------------------------------------------
insert into public.knowledge_sources (key, name, kind, license, config)
values
  (
    'europepmc',
    'Europe PMC (Open Access subset)',
    'api',
    'open-access',
    jsonb_build_object(
      'query', '(veterinary OR canine OR feline OR "companion animal") AND (OPEN_ACCESS:y)',
      'page_size', 25
    )
  ),
  (
    'plos',
    'PLOS (Public Library of Science)',
    'api',
    'CC-BY',
    jsonb_build_object(
      'query', 'veterinary OR canine OR feline',
      'page_size', 25
    )
  )
on conflict (key) do nothing;
