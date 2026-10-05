-- Run once in Supabase SQL Editor when upgrading an existing leaderboard.
begin;

alter table public.leaderboard
  add column if not exists mode text;

update public.leaderboard
set mode = 'normal'
where mode is null;

alter table public.leaderboard
  alter column mode set default 'normal',
  alter column mode set not null;

alter table public.leaderboard
  drop constraint if exists leaderboard_mode_check,
  drop constraint if exists leaderboard_seconds_check;

alter table public.leaderboard
  add constraint leaderboard_mode_check check (mode in ('normal', 'hard')),
  add constraint leaderboard_seconds_check check (
    (mode = 'normal' and seconds between 1 and 1200)
    or (mode = 'hard' and seconds between 1 and 900)
  );

drop index if exists public.leaderboard_ranking;
create index leaderboard_ranking
  on public.leaderboard(mode, seconds, created_at, id);

grant select (mode) on public.leaderboard to anon, authenticated;
grant insert (mode) on public.leaderboard to authenticated;

commit;
