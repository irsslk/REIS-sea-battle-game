-- Run in Supabase SQL editor if leaderboard writes fail silently (RLS).
-- Allows authenticated players to upsert only their own leaderboard rows.

create policy if not exists "leaderboards_insert_own"
  on public.leaderboards for insert
  with check (auth.uid() = user_id);

create policy if not exists "leaderboards_update_own"
  on public.leaderboards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
