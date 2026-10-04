-- Run once in your project's Supabase SQL Editor.
begin;
create table public.booth_staff (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 40),
  seconds integer not null check (seconds between 1 and 1200),
  created_at timestamptz not null default now(),
  submitted_by uuid not null default auth.uid() references auth.users(id)
);
create index leaderboard_ranking on public.leaderboard(seconds, created_at, id);
alter table public.booth_staff enable row level security;
alter table public.leaderboard enable row level security;
revoke all on public.booth_staff from anon, authenticated;
revoke all on public.leaderboard from anon, authenticated;
grant select on public.booth_staff to authenticated;
grant select (id, name, seconds, created_at) on public.leaderboard to anon, authenticated;
grant insert (id, name, seconds, submitted_by) on public.leaderboard to authenticated;
create policy staff_check_own_membership on public.booth_staff
  for select to authenticated using (user_id = (select auth.uid()));
create policy public_read_rankings on public.leaderboard
  for select to anon, authenticated using (true);
create policy staff_insert_verified on public.leaderboard
  for insert to authenticated with check (
    submitted_by = (select auth.uid())
    and exists (select 1 from public.booth_staff where user_id = (select auth.uid()))
  );
-- No client policies/grants for creating staff, updating, or deleting records.
commit;

-- AFTER creating the staff account in Authentication > Users:
-- Replace the UUID below, uncomment, and run separately for each approved staff member.
-- insert into public.booth_staff(user_id) values ('STAFF-USER-UUID-HERE');
