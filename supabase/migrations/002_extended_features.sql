-- =============================================
-- PAWCHECK MIGRATION 002 - EXTENDED FEATURES
-- Run this AFTER 001_initial_schema.sql
-- Adds: vaccines, training plans, nutrition plans, community,
--       notifications, user location, web push subscriptions
-- =============================================

-- =============================================
-- USER LOCATION (for vet finder + notifications)
-- =============================================
alter table public.profiles
  add column if not exists zip_code text,
  add column if not exists location_lat numeric(10, 7),
  add column if not exists location_lng numeric(10, 7),
  add column if not exists timezone text default 'America/Denver';

-- Notification preferences
alter table public.profiles
  add column if not exists notify_email_vaccine boolean default true,
  add column if not exists notify_email_followup boolean default true,
  add column if not exists notify_email_community boolean default false,
  add column if not exists notify_push_enabled boolean default false;

-- =============================================
-- VACCINES
-- =============================================
create table if not exists public.vaccines (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  pet_id uuid references public.pets(id) on delete cascade not null,
  name text not null,
  administered_date date,
  due_date date,
  veterinarian text,
  notes text,
  reminder_sent boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.vaccines enable row level security;

create policy "Users can view own vaccines"
  on public.vaccines for select using (auth.uid() = user_id);
create policy "Users can insert own vaccines"
  on public.vaccines for insert with check (auth.uid() = user_id);
create policy "Users can update own vaccines"
  on public.vaccines for update using (auth.uid() = user_id);
create policy "Users can delete own vaccines"
  on public.vaccines for delete using (auth.uid() = user_id);

create index vaccines_user_id_idx on public.vaccines(user_id);
create index vaccines_pet_id_idx on public.vaccines(pet_id);
create index vaccines_due_date_idx on public.vaccines(due_date);

-- =============================================
-- TRAINING PLANS
-- =============================================
create table if not exists public.training_plans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  pet_id uuid references public.pets(id) on delete cascade not null,
  
  -- User input
  behavior_issue text not null,
  goal text,
  context text,
  duration_weeks integer default 4,
  
  -- AI output
  plan_title text,
  plan_summary text,
  weekly_milestones jsonb,  -- [{week: 1, focus: "...", exercises: [...]}]
  daily_exercises jsonb,    -- [{name, duration_min, description, frequency}]
  reinforcement_tips text[],
  red_flags text[],         -- when to consult a professional trainer/vet
  raw_ai_response jsonb,
  
  status text default 'active' check (status in ('active', 'completed', 'archived')),
  progress_pct integer default 0 check (progress_pct between 0 and 100),
  
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.training_plans enable row level security;

create policy "Users can view own training plans"
  on public.training_plans for select using (auth.uid() = user_id);
create policy "Users can insert own training plans"
  on public.training_plans for insert with check (auth.uid() = user_id);
create policy "Users can update own training plans"
  on public.training_plans for update using (auth.uid() = user_id);
create policy "Users can delete own training plans"
  on public.training_plans for delete using (auth.uid() = user_id);

create index training_plans_user_id_idx on public.training_plans(user_id);
create index training_plans_pet_id_idx on public.training_plans(pet_id);

-- =============================================
-- NUTRITION PLANS
-- =============================================
create table if not exists public.nutrition_plans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  pet_id uuid references public.pets(id) on delete cascade not null,
  
  -- User input
  current_diet text,
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal text check (goal in ('maintain', 'weight_loss', 'weight_gain', 'muscle', 'puppy_growth', 'senior_support')),
  food_preferences text,
  allergies text[],
  
  -- AI output (structured)
  daily_calories integer,
  protein_grams numeric(6,1),
  fat_grams numeric(6,1),
  meal_schedule jsonb,        -- [{meal: "breakfast", time: "7:00", portion_cups: 1, foods: []}]
  recommended_foods jsonb,    -- [{name, type, why_recommended}]
  avoid_foods text[],
  supplements jsonb,
  notes text,
  raw_ai_response jsonb,
  
  created_at timestamptz default now() not null
);

alter table public.nutrition_plans enable row level security;

create policy "Users can view own nutrition plans"
  on public.nutrition_plans for select using (auth.uid() = user_id);
create policy "Users can insert own nutrition plans"
  on public.nutrition_plans for insert with check (auth.uid() = user_id);
create policy "Users can update own nutrition plans"
  on public.nutrition_plans for update using (auth.uid() = user_id);
create policy "Users can delete own nutrition plans"
  on public.nutrition_plans for delete using (auth.uid() = user_id);

create index nutrition_plans_user_id_idx on public.nutrition_plans(user_id);

-- =============================================
-- COMMUNITY POSTS
-- =============================================
create table if not exists public.community_posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  pet_id uuid references public.pets(id) on delete set null,
  
  title text not null,
  content text not null,
  photo_url text,
  category text default 'general' check (category in ('general', 'health', 'training', 'nutrition', 'success_story', 'question')),
  
  -- Optional link to an assessment (must be set as public by user)
  linked_query_id uuid references public.queries(id) on delete set null,
  
  -- Engagement counters (denormalized for performance)
  like_count integer default 0,
  comment_count integer default 0,
  
  is_published boolean default true,
  is_flagged boolean default false,
  
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.community_posts enable row level security;

-- Anyone authenticated can read published posts
create policy "Anyone can view published posts"
  on public.community_posts for select
  using (is_published = true and is_flagged = false);

create policy "Users can insert own posts"
  on public.community_posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own posts"
  on public.community_posts for update
  using (auth.uid() = user_id);

create policy "Users can delete own posts"
  on public.community_posts for delete
  using (auth.uid() = user_id);

create index community_posts_user_id_idx on public.community_posts(user_id);
create index community_posts_created_at_idx on public.community_posts(created_at desc);
create index community_posts_category_idx on public.community_posts(category);

-- =============================================
-- COMMUNITY COMMENTS
-- =============================================
create table if not exists public.community_comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.community_posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  is_flagged boolean default false,
  created_at timestamptz default now() not null
);

alter table public.community_comments enable row level security;

create policy "Anyone can view non-flagged comments"
  on public.community_comments for select
  using (is_flagged = false);

create policy "Users can insert own comments"
  on public.community_comments for insert
  with check (auth.uid() = user_id);

create policy "Users can update own comments"
  on public.community_comments for update
  using (auth.uid() = user_id);

create policy "Users can delete own comments"
  on public.community_comments for delete
  using (auth.uid() = user_id);

create index community_comments_post_id_idx on public.community_comments(post_id);

-- =============================================
-- COMMUNITY LIKES (track who liked what)
-- =============================================
create table if not exists public.community_likes (
  post_id uuid references public.community_posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  primary key (post_id, user_id)
);

alter table public.community_likes enable row level security;

create policy "Anyone can view likes"
  on public.community_likes for select using (true);

create policy "Users can insert own likes"
  on public.community_likes for insert with check (auth.uid() = user_id);

create policy "Users can delete own likes"
  on public.community_likes for delete using (auth.uid() = user_id);

-- Maintain denormalized counters
create or replace function public.update_post_like_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.community_posts
    set like_count = like_count + 1
    where id = new.post_id;
  elsif (TG_OP = 'DELETE') then
    update public.community_posts
    set like_count = greatest(0, like_count - 1)
    where id = old.post_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_update_like_count on public.community_likes;
create trigger trg_update_like_count
  after insert or delete on public.community_likes
  for each row execute function public.update_post_like_count();

create or replace function public.update_post_comment_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.community_posts
    set comment_count = comment_count + 1
    where id = new.post_id;
  elsif (TG_OP = 'DELETE') then
    update public.community_posts
    set comment_count = greatest(0, comment_count - 1)
    where id = old.post_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_update_comment_count on public.community_comments;
create trigger trg_update_comment_count
  after insert or delete on public.community_comments
  for each row execute function public.update_post_comment_count();

-- =============================================
-- WEB PUSH SUBSCRIPTIONS
-- =============================================
create table if not exists public.push_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  endpoint text not null unique,
  p256dh text not null,
  auth_secret text not null,
  user_agent text,
  created_at timestamptz default now() not null,
  last_used_at timestamptz default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Users can manage own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id);

create index push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

-- =============================================
-- COMMUNITY POSTS STORAGE BUCKET
-- =============================================
insert into storage.buckets (id, name, public)
values ('community-photos', 'community-photos', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload community photos"
  on storage.objects for insert
  with check (bucket_id = 'community-photos' and auth.role() = 'authenticated');

create policy "Anyone can view community photos"
  on storage.objects for select
  using (bucket_id = 'community-photos');

create policy "Users can delete own community photos"
  on storage.objects for delete
  using (
    bucket_id = 'community-photos'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );
