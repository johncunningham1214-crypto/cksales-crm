-- =====================================================================
-- STEP 2 of 2 — Create Nu-Calgon accounts and pre-match them for import
--
-- * Creates a parent account for each company in Nu-Calgon's report
--   (skips any account that already exists with the same name).
-- * Johnstone: "Distribution Center" and "Direct Orders" under a
--   Johnstone Supply parent. Winsupply Elmsford/Newburgh under Winsupply Inc.
-- * Saves each Nu-Calgon report name as a match, so the import page
--   fills every name in automatically ("Saved match").
--
-- BEFORE RUNNING: if the preview showed a "possible duplicate" (e.g. you
-- already have "URI" for United Refrigeration), change the account name
-- in the list below to your existing name exactly, so it gets reused.
--
-- Requires: phase1_lines.sql and phase2_sales.sql. Safe to re-run.
-- =====================================================================
do $$
declare
  r          record;
  v_vendor   public.vendors.id%type;
  v_parent   public.accounts.id%type;
  v_account  public.accounts.id%type;
  n_created  int := 0;
begin
  select id into v_vendor from public.vendors
  where regexp_replace(lower(name), '[^a-z0-9]', '', 'g') = 'nucalgon'
  order by is_principal desc limit 1;
  if v_vendor is null then
    raise exception 'No vendor named NuCalgon. Run phase1_lines.sql first.';
  end if;

  for r in
    select * from (values
    ('abco refrigeration supply', 'ABCO Refrigeration Supply', null, null, 'ABCO'),
    ('ace plmb and elec supply', 'Ace Plumbing & Electric Supply', null, null, 'Ace'),
    ('albro utilities corp', 'Albro Utilities', null, null, 'Albro'),
    ('ap hvac and plumbing supplies', 'AP HVAC & Plumbing Supplies', null, null, 'AP HVAC'),
    ('apr supply co', 'APR Supply', null, null, 'APR'),
    ('associate refrigeration inc', 'Associate Refrigeration', null, null, 'Associate'),
    ('audubon plumbing supply co', 'Audubon Plumbing Supply', null, null, 'Audubon'),
    ('best plmb specialties 1076', 'Best Plumbing Specialties', null, null, 'Best Pl'),
    ('bhc residential and light commercial', 'BHC Residential & Light Commercial', null, null, 'BHC'),
    ('c f connolly dist co inc', 'C F Connolly Distributing', null, null, 'Connolly'),
    ('carrier enterprise llc', 'Carrier Enterprise', null, null, 'Carrier'),
    ('carrier transicold co', 'Carrier Transicold', null, null, 'Transicold'),
    ('chemical specifics inc', 'Chemical Specifics', null, null, 'Chemical'),
    ('coastal supply group', 'Coastal Supply Group', null, null, 'Coastal'),
    ('daikin applied', 'Daikin Applied', null, null, 'Daikin'),
    ('daikin comfort technologies distrib', 'Daikin Comfort Technologies Distribution', null, null, 'Daikin'),
    ('daikin comfort technologies ne inc', 'Daikin Comfort Technologies NE', null, null, 'Daikin'),
    ('dunphey smith company', 'Dunphey-Smith', null, null, 'Dunphey'),
    ('easy ice llc', 'Easy Ice', null, null, 'Easy Ice'),
    ('economy refrig and vent', 'Economy Refrigeration & Ventilation', null, null, 'Economy'),
    ('economy rhvac supply llc', 'Economy RHVAC Supply', null, null, 'Economy'),
    ('f w webb co', 'F.W. Webb', null, null, 'Webb'),
    ('fargo hvac supply inc', 'Fargo HVAC Supply', null, null, 'Fargo'),
    ('fastenal company purchasing', 'Fastenal', null, null, 'Fastenal'),
    ('ferguson enterprises inc', 'Ferguson', null, null, 'Ferguson'),
    ('grainger', 'Grainger', null, null, 'Grainger'),
    ('h and l heating supply', 'H&L Heating Supply', null, null, 'H&L'),
    ('hvac depot supply', 'HVAC Depot Supply', null, null, 'Depot Supply'),
    ('jc residential and light commercial l', 'JC Residential & Light Commercial', null, null, 'JC Res'),
    ('johnstone supply a 389', 'Johnstone Supply - Direct Orders', 'Johnstone Supply', null, 'Johnstone'),
    ('johnstone supply dc a 389', 'Johnstone Supply - Distribution Center', 'Johnstone Supply', null, 'Johnstone'),
    ('lennox industries inc', 'Lennox Industries', null, null, 'Lennox'),
    ('lion hvac supplies inc', 'Lion HVAC Supplies', null, null, 'Lion'),
    ('luce schwab and kase inc', 'Luce Schwab & Kase', null, null, 'Luce'),
    ('meier supply company inc', 'Meier Supply', null, null, 'Meier'),
    ('msc industrial direct co inc', 'MSC Industrial Direct', null, null, 'MSC'),
    ('northeast plumbing', 'Northeast Plumbing', null, null, 'Northeast Pl'),
    ('patriot supply com', 'Patriot Supply', null, null, 'Patriot'),
    ('peirce phelps inc', 'Peirce-Phelps', null, null, 'Peirce'),
    ('power flo technologies inc', 'Power-Flo Technologies', null, null, 'Power-Flo'),
    ('powertron international', 'Powertron International', null, null, 'Powertron'),
    ('qxo', 'QXO', null, null, 'QXO'),
    ('r e michel company inc', 'R.E. Michel', null, null, 'Michel'),
    ('rheem sales company inc', 'Rheem Sales Company', null, null, 'Rheem'),
    ('sid harvey industries inc', 'Sid Harvey Industries', null, null, 'Harvey'),
    ('supplyhouse llc', 'SupplyHouse.com', null, null, 'SupplyHouse'),
    ('the home depot pro', 'The Home Depot Pro', null, null, 'Home Depot'),
    ('traco industrial corp', 'Traco Industrial', null, null, 'Traco'),
    ('trane technologies', 'Trane Technologies', null, null, 'Trane'),
    ('tristate filters and hvac suppli', 'Tristate Filters & HVAC Supply', null, null, 'Tristate'),
    ('united refrigeration', 'United Refrigeration', null, null, 'United Refrig'),
    ('vallen distribution inc', 'Vallen Distribution', null, null, 'Vallen'),
    ('w a birdsall and company', 'W.A. Birdsall', null, null, 'Birdsall'),
    ('wallington plumbing and heating suppl', 'Wallington Plumbing & Heating Supply', null, null, 'Wallington'),
    ('weinstein supply', 'Weinstein Supply', null, null, 'Weinstein'),
    ('white and shauger inc', 'White & Shauger', null, null, 'Shauger'),
    ('winsupply elmsford ny co', 'Winsupply - Elmsford', 'Winsupply Inc.', 'NY', 'Winsupply'),
    ('winsupply newburgh ny co', 'Winsupply - Newburgh', 'Winsupply Inc.', 'NY', 'Winsupply'),
    ('winsupply inc', 'Winsupply Inc.', null, null, 'Winsupply')
    ) as t(alias, account_name, parent_name, state, keyword)
  loop
    v_parent := null;

    -- Parent company (for Johnstone / Winsupply branches)
    if r.parent_name is not null then
      select id into v_parent from public.accounts where lower(name) = lower(r.parent_name) limit 1;
      if v_parent is null then
        insert into public.accounts (name, status, is_parent, is_contractor)
        values (r.parent_name, 'Active', true, false)
        returning id into v_parent;
        n_created := n_created + 1;
      end if;
    end if;

    -- The account itself
    select id into v_account from public.accounts where lower(name) = lower(r.account_name) limit 1;
    if v_account is null then
      insert into public.accounts (name, status, is_parent, parent_id, territory, is_contractor)
      values (r.account_name, 'Active', r.parent_name is null, v_parent, r.state, false)
      returning id into v_account;
      n_created := n_created + 1;
    end if;

    -- Remember how Nu-Calgon spells it
    insert into public.account_aliases (vendor_id, alias, account_id)
    values (v_vendor, r.alias, v_account)
    on conflict (vendor_id, alias) do update set account_id = excluded.account_id;
  end loop;

  raise notice 'Done: % accounts created, 59 Nu-Calgon names matched.', n_created;
end $$;
