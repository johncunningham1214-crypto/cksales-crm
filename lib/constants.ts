// lib/constants.ts

export const SALES_TEAM = [
  "John Cunningham",
  "Alejandro Reanos",
  "Joe McIlvain",
  "Brian Jr.",
  "Matt Doty",
  "Jeff Ross",
  "Jim Cunningham",
  "Matt Kavanagh",
  "Rob Gilooly",
  "Rick Kisser",
  "Robert Vosburgh"
];

export const TERRITORIES = [
  'ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA',
  'DE', 'MD', 'DC', 'VA', 'NC', 'SC', 'GA', 'FL'
];

// Matches the options in the Log Visit / Edit Visit forms
export const VISIT_TYPES = [
  "Field Visit",
  "Lunch & Learn",
  "Counter Day",
  "Product Training",
  "Issue Resolution",
  "Cold Call"
];

// Lines we represent. Names must match the `vendors` table exactly
// (seeded by supabase/phase1_lines.sql). Used by the visit forms,
// dashboard and report filters. The Lines page reads from the database.
export const VENDORS = [
  'NuCalgon',
  'Regal Rexnord',
  'Browning Belts',
  'Supco',
  'Harris',
  'NCP',
  'Kiwi Climate',
  'LH Dottie',
  'Tuttle & Bailey',
  'Inficon',
  'Parker Filtration',
  'Aldes',
  'RAM Fabrication',
  'ARRCO Compressors',
  'Holyoke Fittings',
  'Other'
];

// What a branch does with one of our lines
export const LINE_STATUSES = [
  { value: '',            label: 'Not set',        style: 'bg-white text-gray-500 border-gray-300' },
  { value: 'stocked',     label: 'Stocks it',      style: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'not_stocked', label: "Doesn't stock",  style: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'prospect',    label: 'Working on it',  style: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  { value: 'lost',        label: 'Lost it',        style: 'bg-gray-800 text-white border-gray-800' },
  { value: 'not_ours',    label: 'Not our area',   style: 'bg-gray-100 text-gray-500 border-gray-200' },
];
