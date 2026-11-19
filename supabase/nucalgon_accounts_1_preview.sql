-- =====================================================================
-- STEP 1 of 2 — PREVIEW (changes nothing)
-- Lists accounts you ALREADY have that look like the Nu-Calgon companies,
-- so we don't create duplicates. Run it, look at the results, then see
-- the instructions in STEP 2.
-- =====================================================================
with plan(alias, account_name, parent_name, state, keyword) as (values
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
)
select
  p.account_name                       as planned_account,
  a.name                               as existing_account,
  case when lower(a.name) = lower(p.account_name) or lower(a.name) = lower(p.parent_name)
       then 'same name: will be reused'
       else 'similar: possible duplicate' end as note
from plan p
join public.accounts a
  on a.name ilike '%' || p.keyword || '%'
  or lower(a.name) = lower(p.account_name)
  or lower(a.name) = lower(p.parent_name)
order by 3 desc, 1, 2;
