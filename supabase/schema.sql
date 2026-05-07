create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  username text unique not null,
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

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('bot','multiplayer')),
  status text not null default 'waiting' check (status in ('waiting','active','finished','cancelled')),
  player_one_id uuid references public.users(id) on delete set null,
  player_two_id uuid references public.users(id) on delete set null,
  winner_id uuid references public.users(id) on delete set null,
  invite_code text unique,
  bot_level text check (bot_level in ('easy','medium','hard')),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists games_status_idx on public.games(status);
create index if not exists games_created_at_idx on public.games(created_at desc);

create table if not exists public.game_moves (
  id bigserial primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.users(id) on delete cascade,
  move_number integer not null check (move_number > 0),
  x integer not null check (x between 0 and 9),
  y integer not null check (y between 0 and 9),
  result text not null check (result in ('hit','miss','sunk')),
  ship_name text,
  created_at timestamptz not null default now(),
  unique (game_id, move_number)
);

create index if not exists game_moves_game_id_idx on public.game_moves(game_id);

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
  on public.leaderboards(rank_scope, region, country, city, elo desc);

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.game_moves enable row level security;
alter table public.leaderboards enable row level security;

create policy if not exists "users_select_own"
  on public.users for select
  using (auth.uid() = id);

create policy if not exists "users_insert_own"
  on public.users for insert
  with check (auth.uid() = id);

create policy if not exists "profiles_public_read"
  on public.profiles for select
  using (true);

create policy if not exists "profiles_mutate_own"
  on public.profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "games_read_participant"
  on public.games for select
  using (auth.uid() = player_one_id or auth.uid() = player_two_id);

create policy if not exists "games_write_participant"
  on public.games for all
  using (auth.uid() = player_one_id or auth.uid() = player_two_id)
  with check (auth.uid() = player_one_id or auth.uid() = player_two_id);

create policy if not exists "game_moves_read_participant"
  on public.game_moves for select
  using (
    exists (
      select 1
      from public.games g
      where g.id = game_moves.game_id
        and (g.player_one_id = auth.uid() or g.player_two_id = auth.uid())
    )
  );

create policy if not exists "game_moves_insert_participant"
  on public.game_moves for insert
  with check (
    player_id = auth.uid()
    and exists (
      select 1
      from public.games g
      where g.id = game_moves.game_id
        and (g.player_one_id = auth.uid() or g.player_two_id = auth.uid())
    )
  );

create policy if not exists "leaderboards_public_read"
  on public.leaderboards for select
  using (true);

create policy if not exists "leaderboards_insert_own"
  on public.leaderboards for insert
  with check (auth.uid() = user_id);

create policy if not exists "leaderboards_update_own"
  on public.leaderboards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
