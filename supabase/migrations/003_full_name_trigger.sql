-- ============================================================
-- Migration 003 — fully self-contained, safe to re-run
-- Creates missing tables, adds full_name, trigger, all RLS
-- ============================================================

-- 1. Tables (all idempotent)

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  created_at timestamptz not null default now()
);

-- profiles may already exist; add full_name if missing
create table if not exists public.profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  username text unique not null,
  full_name text,
  city text,
  country text,
  region text not null default 'CIS',
  avatar_url text,
  selected_theme text not null default 'classic-day',
  elo integer not null default 1000 check (elo >= 0),
  games_played integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  accuracy numeric(5,2) not null default 0,
  favorite_ship text,
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists full_name text;

create table if not exists public.leaderboards (
  id bigserial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  city text,
  country text,
  region text not null,
  elo integer not null,
  wins integer not null,
  losses integer not null,
  rank_scope text not null check (rank_scope in ('city','country','region')),
  snapshot_at timestamptz not null default now()
);

create index if not exists leaderboards_scope_elo_idx
  on public.leaderboards(rank_scope, elo desc);

-- 2. Enable RLS on all tables

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.leaderboards enable row level security;

-- 3. RLS policies — all idempotent

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='users' and policyname='users_select_own') then
    create policy "users_select_own" on public.users for select using (auth.uid() = id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='users' and policyname='users_insert_own') then
    create policy "users_insert_own" on public.users for insert with check (auth.uid() = id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='users' and policyname='users_update_own') then
    create policy "users_update_own" on public.users for update using (auth.uid() = id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_public_read') then
    create policy "profiles_public_read" on public.profiles for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_mutate_own') then
    create policy "profiles_mutate_own" on public.profiles for all
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='leaderboards' and policyname='leaderboards_public_read') then
    create policy "leaderboards_public_read" on public.leaderboards for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='leaderboards' and policyname='leaderboards_insert_own') then
    create policy "leaderboards_insert_own" on public.leaderboards for insert with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='leaderboards' and policyname='leaderboards_update_own') then
    create policy "leaderboards_update_own" on public.leaderboards for update
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end;
$$;

-- 4. Trigger function: auto-create user + profile rows on signup

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_username  text;
begin
  begin
    v_full_name := trim(coalesce(new.raw_user_meta_data->>'full_name', ''));

    v_username := regexp_replace(
      case when v_full_name = '' then 'captain' else v_full_name end,
      '[^a-zA-Z0-9_\-]', '_', 'g'
    );
    v_username := left(v_username, 24) || '_' || left(new.id::text, 8);

    insert into public.users(id, email)
    values (new.id, new.email)
    on conflict (id) do nothing;

    insert into public.profiles(user_id, username, full_name)
    values (new.id, v_username, nullif(v_full_name, ''))
    on conflict (user_id) do nothing;

  exception when others then
    raise warning 'handle_new_auth_user: % (user: %)', sqlerrm, new.id;
  end;

  return new;
end;
$$;

-- 5. Attach trigger

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();

-- 6. Back-fill public.users for any auth users that already exist
--    (covers accounts created before this migration)

insert into public.users (id, email)
select id, email
from auth.users
on conflict (id) do nothing;
