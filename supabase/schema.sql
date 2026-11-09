-- SpeakLoop cloud sync schema
-- Run this once in your Supabase project's SQL Editor (Dashboard > SQL Editor > New query).
-- Each table stores one row per record as JSONB, scoped to the signed-in user via Row Level Security.

create table if not exists public.user_sentences (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.user_review_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.user_reports (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_sentences enable row level security;
alter table public.user_review_logs enable row level security;
alter table public.user_reports enable row level security;
alter table public.user_streaks enable row level security;

drop policy if exists "Users manage their own sentences" on public.user_sentences;
create policy "Users manage their own sentences" on public.user_sentences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their own review logs" on public.user_review_logs;
create policy "Users manage their own review logs" on public.user_review_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their own reports" on public.user_reports;
create policy "Users manage their own reports" on public.user_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their own streak" on public.user_streaks;
create policy "Users manage their own streak" on public.user_streaks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
