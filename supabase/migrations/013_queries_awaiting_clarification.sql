-- =====================================================
-- Migration 013: allow the 'awaiting_clarification' query status
-- =====================================================
-- Interactive clarification parks an assessment in 'awaiting_clarification'
-- between rounds. The original CHECK constraint rejected it (silently failing
-- the update), so add it to the allowed set.

alter table public.queries drop constraint if exists queries_status_check;
alter table public.queries
  add constraint queries_status_check
  check (status in ('pending', 'processing', 'complete', 'failed', 'awaiting_clarification'));
