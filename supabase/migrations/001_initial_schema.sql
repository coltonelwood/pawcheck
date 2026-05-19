-- =============================================
-- PAWCHECK DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- =============================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- =============================================
-- PROFILES (extends auth.users)
-- =============================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null unique,
  full_name text,
  created_at timestamptz default now() not null,
  
  -- Subscription tracking
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text default 'free',
  subscription_tier text default 'free', -- 'free', 'monthly', 'yearly'
  subscription_period_end timestamptz,
  
  -- Usage tracking
  free_queries_used integer default 0 not null,
  total_queries_count integer default 0 not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================
-- PETS
-- =============================================
create table if not exists public.pets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  species text not null check (species in ('dog', 'cat', 'other')),
  breed text,
  date_of_birth date,
  weight_lbs numeric(5,2),
  sex text check (sex in ('male', 'female', 'unknown')),
  spayed_neutered boolean,
  known_conditions text[],
  current_medications text[],
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.pets enable row level security;

create policy "Users can view own pets"
  on public.pets for select
  using (auth.uid() = user_id);

create policy "Users can insert own pets"
  on public.pets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own pets"
  on public.pets for update
  using (auth.uid() = user_id);

create policy "Users can delete own pets"
  on public.pets for delete
  using (auth.uid() = user_id);

create index pets_user_id_idx on public.pets(user_id);

-- =============================================
-- QUERIES (photo analyses)
-- =============================================
create table if not exists public.queries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  pet_id uuid references public.pets(id) on delete cascade not null,
  
  -- User input
  photo_url text not null,
  description text,
  symptoms text[],
  
  -- AI output (structured)
  urgency text check (urgency in ('green', 'yellow', 'red')),
  urgency_label text, -- "Monitor at home", "Vet soon", "Vet immediately"
  description_summary text,
  likely_causes jsonb, -- [{name, probability, explanation}]
  recommended_action text,
  vet_visit text check (vet_visit in ('immediate', 'within_24h', 'within_week', 'monitor', 'not_needed')),
  confidence_score integer check (confidence_score >= 0 and confidence_score <= 100),
  red_flags text[],
  followup_questions text[],
  raw_ai_response jsonb, -- store complete response for debugging
  
  -- Processing
  status text default 'pending' check (status in ('pending', 'processing', 'complete', 'failed')),
  error_message text,
  processing_time_ms integer,
  
  created_at timestamptz default now() not null,
  completed_at timestamptz
);

alter table public.queries enable row level security;

create policy "Users can view own queries"
  on public.queries for select
  using (auth.uid() = user_id);

create policy "Users can insert own queries"
  on public.queries for insert
  with check (auth.uid() = user_id);

create policy "Service role can update queries"
  on public.queries for update
  using (true);

create index queries_user_id_idx on public.queries(user_id);
create index queries_pet_id_idx on public.queries(pet_id);
create index queries_created_at_idx on public.queries(created_at desc);

-- =============================================
-- STORAGE BUCKET (pet photos)
-- =============================================
insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload pet photos"
  on storage.objects for insert
  with check (
    bucket_id = 'pet-photos' 
    and auth.role() = 'authenticated'
  );

create policy "Anyone can view pet photos"
  on storage.objects for select
  using (bucket_id = 'pet-photos');

create policy "Users can delete own pet photos"
  on storage.objects for delete
  using (
    bucket_id = 'pet-photos' 
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

-- =============================================
-- USAGE TRACKING (atomic increment)
-- =============================================
create or replace function public.increment_query_count(user_uuid uuid)
returns void as $$
begin
  update public.profiles
  set 
    free_queries_used = case 
      when subscription_status = 'active' then free_queries_used
      else free_queries_used + 1
    end,
    total_queries_count = total_queries_count + 1
  where id = user_uuid;
end;
$$ language plpgsql security definer;

-- =============================================
-- HELPER: get user's query quota status
-- =============================================
create or replace function public.get_user_quota(user_uuid uuid)
returns jsonb as $$
declare
  result jsonb;
  free_limit integer := 3;
begin
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
