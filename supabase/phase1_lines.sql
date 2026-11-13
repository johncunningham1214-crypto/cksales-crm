-- =====================================================================
-- CK Sales CRM — Phase 1: Lines, Territory Coverage, Branch White Space
-- Run once in Supabase: Dashboard → SQL Editor → paste → Run.
-- Safe to re-run (uses IF NOT EXISTS / ON CONFLICT everywhere).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Extend the existing `vendors` table (already used by Tech Library)
--    so it can hold line details. (Commission rates and agreement terms
--    live in the admin-only line_agreements table: phase1b_admin_only.sql.)
-- ---------------------------------------------------------------------
alter table public.vendors add column if not exists is_principal      boolean not null default false; -- true = a line we rep (vs. just a library entry)
alter table public.vendors add column if not exists active            boolean not null default true;
alter table public.vendors add column if not exists factory_contact   text;           -- name of our contact at the manufacturer
alter table public.vendors add column if not exists factory_email     text;
alter table public.vendors add column if not exists factory_phone     text;
alter table public.vendors add column if not exists annual_goal       numeric(14,2);  -- $ sales goal for our territory
alter table public.vendors add column if not exists focus_products    text;           -- SKUs / families the factory wants pushed

-- ---------------------------------------------------------------------
-- 2. Seed our lines. Matches existing names case-insensitively so we
--    don't duplicate anything already in the Tech Library.
--    NOTE: names here must match VENDORS in lib/constants.ts exactly.
-- ---------------------------------------------------------------------
with lines(name) as (values
  ('NuCalgon'), ('Regal Rexnord'), ('Browning Belts'), ('Supco'), ('Harris'),
  ('NCP'), ('Kiwi Climate'), ('LH Dottie'), ('Tuttle & Bailey'), ('Inficon'),
  ('Parker Filtration'), ('Aldes'), ('RAM Fabrication'), ('ARRCO Compressors'), ('Holyoke Fittings')
)
insert into public.vendors (name, is_principal)
select l.name, true from lines l
where not exists (select 1 from public.vendors v where lower(v.name) = lower(l.name));

update public.vendors set is_principal = true
where lower(name) in (
  'nucalgon','regal rexnord','browning belts','supco','harris','ncp','kiwi climate',
  'lh dottie','tuttle & bailey','inficon','parker filtration','aldes','ram fabrication','arrco compressors','holyoke fittings'
);

-- ---------------------------------------------------------------------
-- 3. New tables. Column types for the foreign keys are read from your
--    existing accounts.id / vendors.id so this works whether they are
--    uuid or integer.
-- ---------------------------------------------------------------------
do $$
declare
  acct_type text;
  vend_type text;
begin
  select format_type(a.atttypid, a.atttypmod) into acct_type
  from pg_attribute a where a.attrelid = 'public.accounts'::regclass and a.attname = 'id';

  select format_type(a.atttypid, a.atttypmod) into vend_type
  from pg_attribute a where a.attrelid = 'public.vendors'::regclass and a.attname = 'id';

  -- Where we rep each line. One row per line per state.
  --   full    = we have the whole state
  --   partial = we have only part of it (describe which part in notes)
  --   no row  = not ours in that state
  execute format($f$
    create table if not exists public.line_coverage (
      id         bigint generated always as identity primary key,
      vendor_id  %s not null references public.vendors(id) on delete cascade,
      state      text not null,
      coverage   text not null default 'full' check (coverage in ('full','partial')),
      notes      text,
      unique (vendor_id, state)
    )$f$, vend_type);

  -- What each branch does with each line (the white-space grid).
  --   not_ours = branch sits in a partial state but outside our piece of it
  execute format($f$
    create table if not exists public.branch_lines (
      id          bigint generated always as identity primary key,
      account_id  %s not null references public.accounts(id) on delete cascade,
      vendor_id   %s not null references public.vendors(id) on delete cascade,
      status      text not null check (status in ('stocked','not_stocked','prospect','lost','not_ours')),
      notes       text,
      updated_by  text,
      updated_at  timestamptz not null default now(),
      unique (account_id, vendor_id)
    )$f$, acct_type, vend_type);
end $$;

create index if not exists branch_lines_vendor_idx on public.branch_lines (vendor_id);
create index if not exists line_coverage_state_idx on public.line_coverage (state);

-- ---------------------------------------------------------------------
-- 4. Security: any logged-in team member can read and edit.
-- ---------------------------------------------------------------------
alter table public.line_coverage enable row level security;
alter table public.branch_lines  enable row level security;

drop policy if exists "team full access" on public.line_coverage;
create policy "team full access" on public.line_coverage
  for all to authenticated using (true) with check (true);

drop policy if exists "team full access" on public.branch_lines;
create policy "team full access" on public.branch_lines
  for all to authenticated using (true) with check (true);
