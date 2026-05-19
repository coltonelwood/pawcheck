-- =====================================================
-- Migration 005: Rate limiting RPCs
-- =====================================================
-- Throttles the expensive AI endpoints (analyze, training,
-- nutrition) to protect the Anthropic budget. Even paid
-- subscribers shouldn't be able to script 10,000 requests/min.
-- =====================================================

-- Count recent queries by user within a time window
create or replace function public.recent_query_count(
  user_uuid uuid,
  window_minutes integer default 60
)
returns integer
language sql
security definer
stable
as $$
  select count(*)::integer
  from public.queries
  where user_id = user_uuid
    and created_at > now() - (window_minutes || ' minutes')::interval;
$$;

-- Count recent training plans
create or replace function public.recent_training_count(
  user_uuid uuid,
  window_hours integer default 24
)
returns integer
language sql
security definer
stable
as $$
  select count(*)::integer
  from public.training_plans
  where user_id = user_uuid
    and created_at > now() - (window_hours || ' hours')::interval;
$$;

-- Count recent nutrition plans
create or replace function public.recent_nutrition_count(
  user_uuid uuid,
  window_hours integer default 24
)
returns integer
language sql
security definer
stable
as $$
  select count(*)::integer
  from public.nutrition_plans
  where user_id = user_uuid
    and created_at > now() - (window_hours || ' hours')::interval;
$$;

-- Count recent community posts (per user per day, anti-spam)
create or replace function public.recent_post_count(
  user_uuid uuid,
  window_hours integer default 24
)
returns integer
language sql
security definer
stable
as $$
  select count(*)::integer
  from public.community_posts
  where user_id = user_uuid
    and created_at > now() - (window_hours || ' hours')::interval;
$$;
