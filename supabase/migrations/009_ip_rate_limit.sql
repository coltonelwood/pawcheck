-- =====================================================
-- Migration 009: Per-IP rate limiting
-- =====================================================
-- Adds an IP-keyed counter alongside the existing per-user limits so a single
-- IP (or a script creating many accounts) can't hammer the paid AI endpoints.
-- The RPC inserts the hit, prunes that key's expired rows, and returns the
-- count in the window — all in one atomic call. Service-role only (RLS, no
-- policies); the API routes call it via the service client.
-- =====================================================

create table if not exists public.ip_request_log (
  id bigserial primary key,
  ip text not null,
  route text not null,
  created_at timestamptz not null default now()
);

create index if not exists ip_request_log_lookup
  on public.ip_request_log (ip, route, created_at desc);

alter table public.ip_request_log enable row level security;
-- No policies => only the service role can read/write.

create or replace function public.consume_ip_rate(
  p_ip text,
  p_route text,
  p_window_minutes integer
)
returns integer
language plpgsql
security definer
as $$
declare
  cnt integer;
begin
  insert into public.ip_request_log (ip, route) values (p_ip, p_route);
  -- self-prune this key's expired rows to keep the table bounded
  delete from public.ip_request_log
    where ip = p_ip and route = p_route
      and created_at < now() - make_interval(mins => p_window_minutes);
  select count(*)::integer into cnt from public.ip_request_log
    where ip = p_ip and route = p_route
      and created_at > now() - make_interval(mins => p_window_minutes);
  return cnt;
end;
$$;
