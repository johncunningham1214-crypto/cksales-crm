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
