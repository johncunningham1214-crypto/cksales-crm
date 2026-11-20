-- =====================================================================
-- CK Sales CRM — Link each login to a salesman name, once.
-- The first time someone logs in, the app asks "Which one is you?".
-- After they pick, that email is locked to that name: they can't change
-- it and nobody else can claim the same name. Only admins can fix a
-- mistake (Table Editor → team_members, edit or delete the row).
-- Requires phase1b_admin_only.sql (is_admin()). Safe to re-run.
-- =====================================================================

create table if not exists public.team_members (
  email      text primary key,                 -- login email, stored lowercase
  name       text not null unique,             -- must match a name in SALES_TEAM
  created_at timestamptz not null default now()
);

alter table public.team_members enable row level security;

-- Everyone logged in can see who is who (needed to show names)
drop policy if exists "team can read" on public.team_members;
create policy "team can read" on public.team_members
  for select to authenticated using (true);

-- You can only claim a name for your own email (and only once: email is the key)
drop policy if exists "claim my own name" on public.team_members;
create policy "claim my own name" on public.team_members
  for insert to authenticated
  with check (email = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Only admins can change or remove a link
drop policy if exists "admins can fix" on public.team_members;
create policy "admins can fix" on public.team_members
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins can remove" on public.team_members;
create policy "admins can remove" on public.team_members
  for delete to authenticated using (public.is_admin());

notify pgrst, 'reload schema';
