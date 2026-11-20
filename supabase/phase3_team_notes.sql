-- =====================================================================
-- CK Sales CRM — Team Notes: share a logged visit with the team
-- A shared visit shows on every branch of the same parent company
-- (account page + pre-call brief) and on the Team Notes page.
-- Run once in Supabase SQL Editor. Safe to re-run.
-- =====================================================================
alter table public.calls add column if not exists shared         boolean not null default false;
alter table public.calls add column if not exists share_headline text;         -- optional one-liner: what the team should know
alter table public.calls add column if not exists shared_at      timestamptz;

create index if not exists calls_shared_idx on public.calls (shared, shared_at desc);

notify pgrst, 'reload schema';
