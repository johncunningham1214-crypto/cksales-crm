-- ============================================================
-- RUN THIS NEXT: admin-only terms + sales tables (phase1b + phase2)
-- Paste ALL of this into Supabase SQL Editor and click Run once.
-- ============================================================

-- =====================================================================
-- CK Sales CRM — Admin-only rep agreement terms
-- Moves commission rates and agreement terms out of `vendors` (which the
-- whole team can read) into `line_agreements`, which only admins can
-- read or change. Enforced by the database, not just hidden on screen.
--
-- Run AFTER phase1_lines.sql. Safe to re-run.
-- =====================================================================

-- 1. Who is an admin. Add or remove people here (Table Editor → app_admins).
--    Use the exact email you log into the CRM with.
create table if not exists public.app_admins (
  email text primary key
);
alter table public.app_admins enable row level security;  -- no policies: only is_admin() below can read it

insert into public.app_admins (email) values ('john@cksalesinc.net')
on conflict do nothing;

-- 2. Is the logged-in user an admin? (Used by the security rules and the app.)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
grant execute on function public.is_admin() to authenticated;

-- 3. Admin-only agreement terms, one row per line
do $$
declare vend_type text;
begin
  select format_type(a.atttypid, a.atttypmod) into vend_type
  from pg_attribute a where a.attrelid = 'public.vendors'::regclass and a.attname = 'id';

  execute format($f$
    create table if not exists public.line_agreements (
      vendor_id         %s primary key references public.vendors(id) on delete cascade,
      commission_rate   numeric(5,2),   -- e.g. 5.00 = 5%%
      agreement_start   date,
      agreement_renewal date,
      terms_notes       text,           -- house accounts, termination terms, split territories
      updated_at        timestamptz not null default now()
    )$f$, vend_type);
end $$;

alter table public.line_agreements enable row level security;
drop policy if exists "admins only" on public.line_agreements;
create policy "admins only" on public.line_agreements
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 4. If Phase 1 already put these columns on `vendors`, move any data
--    across and then remove the columns so the team can't read them.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'vendors' and column_name = 'commission_rate') then
    insert into public.line_agreements (vendor_id, commission_rate, agreement_start, agreement_renewal, terms_notes)
    select id, commission_rate, agreement_start, agreement_renewal, line_notes
    from public.vendors
    where commission_rate is not null or agreement_start is not null
       or agreement_renewal is not null or line_notes is not null
    on conflict (vendor_id) do nothing;

    alter table public.vendors
      drop column if exists commission_rate,
      drop column if exists agreement_start,
      drop column if exists agreement_renewal,
      drop column if exists line_notes;
  end if;
end $$;


-- =====================================================================
-- CK Sales CRM — Phase 2: Sales data (POS + commission statements)
-- Run once in Supabase: Dashboard → SQL Editor → paste → Run.
-- Requires Phase 1 (phase1_lines.sql) to have been run first.
-- Safe to re-run.
-- =====================================================================

do $$
declare
  acct_type text;
  vend_type text;
begin
  select format_type(a.atttypid, a.atttypmod) into acct_type
  from pg_attribute a where a.attrelid = 'public.accounts'::regclass and a.attname = 'id';

  select format_type(a.atttypid, a.atttypmod) into vend_type
  from pg_attribute a where a.attrelid = 'public.vendors'::regclass and a.attname = 'id';

  -- One row per uploaded file, so an import can be reviewed or undone.
  execute format($f$
    create table if not exists public.sales_imports (
      id            bigint generated always as identity primary key,
      vendor_id     %s not null references public.vendors(id) on delete cascade,
      source        text not null check (source in ('pos','commission')),
      file_name     text,
      period_start  date,
      period_end    date,
      row_count     integer,
      total_amount  numeric(14,2),
      skipped_amount numeric(14,2),
      imported_by   text,
      created_at    timestamptz not null default now()
    )$f$, vend_type);

  -- Monthly sales: one row per branch, per line, per month, per source.
  --   period = first day of the month (2026-03-01 = March 2026)
  --   source = 'pos' (distributor sell-through) or 'commission' (what we got paid on)
  execute format($f$
    create table if not exists public.sales (
      id          bigint generated always as identity primary key,
      account_id  %s not null references public.accounts(id) on delete cascade,
      vendor_id   %s not null references public.vendors(id) on delete cascade,
      period      date not null check (extract(day from period) = 1),
      amount      numeric(14,2) not null,
      source      text not null check (source in ('pos','commission')),
      import_id   bigint references public.sales_imports(id) on delete cascade,
      unique (account_id, vendor_id, period, source)
    )$f$, acct_type, vend_type);

  -- How each principal spells our branches ("JOHNSTONE #412" → Johnstone - Newburgh).
  -- Saved during import so each name only has to be matched once per line.
  execute format($f$
    create table if not exists public.account_aliases (
      id          bigint generated always as identity primary key,
      vendor_id   %s not null references public.vendors(id) on delete cascade,
      alias       text not null,  -- stored lowercased with spaces collapsed, as the app matches it
      account_id  %s references public.accounts(id) on delete cascade,  -- null = "always skip this name"
      created_at  timestamptz not null default now(),
      unique (vendor_id, alias)
    )$f$, vend_type, acct_type);
end $$;
create index if not exists sales_account_idx on public.sales (account_id, period);
create index if not exists sales_vendor_idx  on public.sales (vendor_id, period);

-- ---------------------------------------------------------------------
-- Security: any logged-in team member can read and edit.
-- ---------------------------------------------------------------------
alter table public.sales_imports   enable row level security;
alter table public.sales           enable row level security;
alter table public.account_aliases enable row level security;

drop policy if exists "team full access" on public.sales_imports;
create policy "team full access" on public.sales_imports   for all to authenticated using (true) with check (true);
drop policy if exists "team full access" on public.sales;
create policy "team full access" on public.sales           for all to authenticated using (true) with check (true);
drop policy if exists "team full access" on public.account_aliases;
create policy "team full access" on public.account_aliases for all to authenticated using (true) with check (true);

notify pgrst, 'reload schema';
