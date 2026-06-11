-- =====================================================
-- Migration 007: Security hardening (RLS / RPC)
-- =====================================================
-- Closes several privilege-escalation / IDOR holes found in the
-- pre-launch security audit:
--   * profiles: a user could self-grant premium / reset their free quota
--   * queries:  UPDATE policy was `using (true)` (anyone could edit any row)
--   * usage/quota RPCs accepted an arbitrary user_uuid (cross-user abuse)
--   * push token + storage-upload policies missing WITH CHECK (write as others)
--   * free-tier gate had a check-then-increment TOCTOU race
-- =====================================================

-- -----------------------------------------------------
-- 1. profiles: block client writes to billing / usage / identity columns.
--    Postgres RLS can't restrict columns, so we use a BEFORE UPDATE trigger.
--    Legitimate server paths (Stripe webhook via service_role, and the
--    SECURITY DEFINER credit RPCs which set app.allow_billing_update) are allowed.
-- -----------------------------------------------------
create or replace function public.guard_profile_columns()
returns trigger
language plpgsql
security definer
as $$
begin
  if auth.role() = 'service_role'
     or coalesce(current_setting('app.allow_billing_update', true), 'off') = 'on' then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.email is distinct from old.email
     or new.subscription_status is distinct from old.subscription_status
     or new.subscription_tier is distinct from old.subscription_tier
     or new.subscription_period_end is distinct from old.subscription_period_end
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.stripe_subscription_id is distinct from old.stripe_subscription_id
     or new.free_queries_used is distinct from old.free_queries_used
     or new.total_queries_count is distinct from old.total_queries_count then
    raise exception 'Not permitted to modify billing, usage, or identity columns';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_columns_trg on public.profiles;
create trigger guard_profile_columns_trg
  before update on public.profiles
  for each row execute function public.guard_profile_columns();

-- Keep the owner-row UPDATE policy but add WITH CHECK so a user can't
-- re-point their row's id while updating allowed columns.
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- -----------------------------------------------------
-- 2. queries: replace the public `using (true)` UPDATE with owner-scoped.
-- -----------------------------------------------------
drop policy if exists "Service role can update queries" on public.queries;
create policy "Users can update own queries"
  on public.queries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -----------------------------------------------------
-- 3. Add WITH CHECK to owner-scoped UPDATE policies (prevent ownership reassignment).
-- -----------------------------------------------------
drop policy if exists "Users can update own pets" on public.pets;
create policy "Users can update own pets" on public.pets for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can update own vaccines" on public.vaccines;
create policy "Users can update own vaccines" on public.vaccines for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can update own training plans" on public.training_plans;
create policy "Users can update own training plans" on public.training_plans for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can update own nutrition plans" on public.nutrition_plans;
create policy "Users can update own nutrition plans" on public.nutrition_plans for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can update own posts" on public.community_posts;
create policy "Users can update own posts" on public.community_posts for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can update own comments" on public.community_comments;
create policy "Users can update own comments" on public.community_comments for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -----------------------------------------------------
-- 4. push tokens: FOR ALL policies need WITH CHECK so a user can't insert
--    a row under another user's id.
-- -----------------------------------------------------
drop policy if exists "Users can manage own push subscriptions" on public.push_subscriptions;
create policy "Users can manage own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own expo tokens" on public.expo_push_tokens;
create policy "Users can manage their own expo tokens"
  on public.expo_push_tokens for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -----------------------------------------------------
-- 5. storage uploads: scope INSERT to the user's own folder (mirrors DELETE).
--    Uploads are written as `{auth.uid()}/{file}`, so this is non-breaking.
-- -----------------------------------------------------
drop policy if exists "Authenticated users can upload pet photos" on storage.objects;
create policy "Authenticated users can upload pet photos"
  on storage.objects for insert
  with check (
    bucket_id = 'pet-photos'
    and auth.role() = 'authenticated'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "Authenticated users can upload community photos" on storage.objects;
create policy "Authenticated users can upload community photos"
  on storage.objects for insert
  with check (
    bucket_id = 'community-photos'
    and auth.role() = 'authenticated'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

-- -----------------------------------------------------
-- 6. Usage/quota RPCs: bind to the caller. They took an arbitrary user_uuid,
--    letting one user inflate/reset or read another user's counts.
-- -----------------------------------------------------
create or replace function public.assert_self(user_uuid uuid)
returns void
language plpgsql
stable
as $$
begin
  if auth.role() <> 'service_role' and user_uuid is distinct from auth.uid() then
    raise exception 'forbidden: may only act on your own account';
  end if;
end;
$$;

create or replace function public.increment_query_count(user_uuid uuid)
returns void as $$
begin
  perform public.assert_self(user_uuid);
  perform set_config('app.allow_billing_update', 'on', true);
  update public.profiles
  set
    free_queries_used = case when subscription_status = 'active'
      then free_queries_used else free_queries_used + 1 end,
    total_queries_count = total_queries_count + 1
  where id = user_uuid;
end;
$$ language plpgsql security definer;

create or replace function public.get_user_quota(user_uuid uuid)
returns jsonb as $$
declare
  result jsonb;
  free_limit integer := 3;
begin
  perform public.assert_self(user_uuid);
  select jsonb_build_object(
    'subscription_status', subscription_status,
    'subscription_tier', subscription_tier,
    'free_queries_used', free_queries_used,
    'free_queries_remaining', greatest(0, free_limit - free_queries_used),
    'can_query', subscription_status = 'active' or free_queries_used < free_limit,
    'requires_upgrade', subscription_status != 'active' and free_queries_used >= free_limit
  ) into result
  from public.profiles
  where id = user_uuid;
  return result;
end;
$$ language plpgsql security definer;

-- Rate-limit count RPCs (defined in 005) — re-create with the self guard.
-- Param names / types / defaults / return type kept identical to 005.
create or replace function public.recent_query_count(user_uuid uuid, window_minutes integer default 60)
returns integer language plpgsql security definer stable as $$
begin
  perform public.assert_self(user_uuid);
  return (select count(*)::integer from public.queries
    where user_id = user_uuid and created_at > now() - (window_minutes || ' minutes')::interval);
end;
$$;

create or replace function public.recent_training_count(user_uuid uuid, window_hours integer default 24)
returns integer language plpgsql security definer stable as $$
begin
  perform public.assert_self(user_uuid);
  return (select count(*)::integer from public.training_plans
    where user_id = user_uuid and created_at > now() - (window_hours || ' hours')::interval);
end;
$$;

create or replace function public.recent_nutrition_count(user_uuid uuid, window_hours integer default 24)
returns integer language plpgsql security definer stable as $$
begin
  perform public.assert_self(user_uuid);
  return (select count(*)::integer from public.nutrition_plans
    where user_id = user_uuid and created_at > now() - (window_hours || ' hours')::interval);
end;
$$;

create or replace function public.recent_post_count(user_uuid uuid, window_hours integer default 24)
returns integer language plpgsql security definer stable as $$
begin
  perform public.assert_self(user_uuid);
  return (select count(*)::integer from public.community_posts
    where user_id = user_uuid and created_at > now() - (window_hours || ' hours')::interval);
end;
$$;

-- -----------------------------------------------------
-- 7. Atomic free-tier gate (fixes the check-then-increment TOCTOU race).
--    consume_query_credit increments-and-allows in a single locked UPDATE:
--    a row is only updated when the user is active OR strictly under the limit,
--    so concurrent requests cannot all slip past the limit.
--    refund_query_credit reverses a reservation when the AI call fails.
-- -----------------------------------------------------
create or replace function public.consume_query_credit(user_uuid uuid)
returns boolean as $$
declare
  free_limit integer := 3;
  allowed boolean;
begin
  perform public.assert_self(user_uuid);
  perform set_config('app.allow_billing_update', 'on', true);
  update public.profiles
  set
    total_queries_count = total_queries_count + 1,
    free_queries_used = case when subscription_status = 'active'
      then free_queries_used else free_queries_used + 1 end
  where id = user_uuid
    and (subscription_status = 'active' or free_queries_used < free_limit)
  returning true into allowed;
  return coalesce(allowed, false);
end;
$$ language plpgsql security definer;

create or replace function public.refund_query_credit(user_uuid uuid)
returns void as $$
begin
  perform public.assert_self(user_uuid);
  perform set_config('app.allow_billing_update', 'on', true);
  update public.profiles
  set
    total_queries_count = greatest(0, total_queries_count - 1),
    free_queries_used = case when subscription_status = 'active'
      then free_queries_used else greatest(0, free_queries_used - 1) end
  where id = user_uuid;
end;
$$ language plpgsql security definer;
