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
