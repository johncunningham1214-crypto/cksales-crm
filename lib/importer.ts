// lib/importer.ts — pure helpers for importing POS / commission files.
// No database calls here, so these can be tested on their own.

// ---------- CSV ----------

// Parses CSV text into rows of cells. Handles quoted fields, commas and
// line breaks inside quotes, "" escapes, CRLF line endings and a BOM.
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const s = text.replace(/^﻿/, '');

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell); cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      rows.push(row); row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }

  // Drop fully blank rows
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

// Guess which row holds the column headers: POS reports often start with
// a few title lines. Picks the first row among the first 15 that has at
// least 60% as many filled cells as the widest row.
export function guessHeaderRow(rows: string[][]): number {
  const width = (r: string[]) => r.filter(c => c.trim() !== '').length;
  const max = Math.max(0, ...rows.slice(0, 15).map(width));
  const idx = rows.slice(0, 15).findIndex(r => width(r) >= Math.max(2, max * 0.6));
  return idx === -1 ? 0 : idx;
}

// ---------- Amounts ----------

// "$1,234.50" → 1234.5   "(250.00)" → -250   "1,000-" → -1000   "" → null
export function parseAmount(raw: string | undefined | null): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (s === '' || s === '-') return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }
  if (s.endsWith('-')) { negative = true; s = s.slice(0, -1); }
  if (s.startsWith('-')) { negative = !negative; s = s.slice(1); }
  s = s.replace(/[$,\s]/g, '');
  if (!/^\d*\.?\d+$/.test(s)) return null;
  const n = Number(s);
  return negative ? -n : n;
}

// ---------- Months ----------

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

const fullYear = (y: number) => (y < 100 ? 2000 + y : y);
const toPeriod = (y: number, m: number) =>
  m >= 1 && m <= 12 && y >= 2000 && y <= 2100 ? `${y}-${String(m).padStart(2, '0')}-01` : null;

// Turns almost any date or month label into the first of that month,
// e.g. "3/15/2026", "2026-03", "202603", "Mar 2026", "March-26", "Mar '26"
// → "2026-03-01". A bare month name ("Mar") uses defaultYear.
export function parsePeriod(raw: string | undefined | null, defaultYear?: number): string | null {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase().replace(/\s+/g, ' ');
  if (!s) return null;
  let m: RegExpMatchArray | null;

  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?(?:[ t].*)?$/))) return toPeriod(+m[1], +m[2]);          // 2026-03-15, 2026/03
  if ((m = s.match(/^(\d{1,2})[-/.]\d{1,2}[-/.](\d{2}|\d{4})(?: .*)?$/))) return toPeriod(fullYear(+m[2]), +m[1]); // 3/15/2026, 03-15-26
  if ((m = s.match(/^(\d{1,2})[-/.](\d{4})$/))) return toPeriod(+m[2], +m[1]);                                    // 3/2026
  if ((m = s.match(/^(\d{4})(\d{2})$/))) return toPeriod(+m[1], +m[2]);                                           // 202603

  // Month names, with an optional year before or after: "mar 2026", "march-26", "mar '26", "2026 mar", "mar"
  const words = s.replace(/[-/.,']/g, ' ').split(' ').filter(Boolean);
  const monthWord = words.find(w => MONTHS[w] !== undefined);
  if (monthWord) {
    const yearWord = words.find(w => /^\d{2}$|^\d{4}$/.test(w));
    const y = yearWord ? fullYear(+yearWord) : defaultYear;
    if (!y) return null;
    return toPeriod(y, MONTHS[monthWord]);
  }
  return null;
}

export function periodLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// ---------- Branch name matching ----------

// How names are stored as aliases and compared
export function normalizeName(raw: string): string {
  return String(raw)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9# ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP = new Set(['inc', 'llc', 'co', 'corp', 'company', 'the', 'and', 'of', 'supply', 'supplies', 'branch', 'store']);
const tokens = (s: string) => normalizeName(s).replace(/#/g, ' ').split(' ').filter(t => t && !STOP.has(t));

// Best-guess branch for a name in a principal's file. Compares words and
// branch numbers; a matching state nudges the score up. Returns null when
// nothing is a confident match, so the user decides.
export function suggestAccount(
  fileName: string,
  accounts: { id: any; name: string; territory?: string | null }[],
  fileState?: string | null
): { id: any; score: number } | null {
  const a = tokens(fileName);
  if (a.length === 0) return null;
  const aSet = new Set(a);
  const aNums = a.filter(t => /^\d+$/.test(t));
  let best: { id: any; score: number } | null = null;

  for (const acc of accounts) {
    const b = tokens(acc.name);
    if (b.length === 0) continue;
    const bSet = new Set(b);
    const shared = [...aSet].filter(t => bSet.has(t)).length;
    let score = shared / new Set([...aSet, ...bSet]).size; // word overlap, 0–1

    // Same branch number is a strong signal; a different one rules it out
    const bNums = b.filter(t => /^\d+$/.test(t));
    if (aNums.length && bNums.length) score += aNums.some(n => bNums.includes(n)) ? 0.3 : -0.5;

    if (fileState && acc.territory && fileState.trim().toUpperCase() === acc.territory) score += 0.15;

    if (!best || score > best.score) best = { id: acc.id, score };
  }
  return best && best.score >= 0.45 ? best : null;
}

// ---------- Turning a file into records ----------

export type DateMode = 'column' | 'single' | 'across';

export type Mapping = {
  headerRow: number;        // index of the header row in the parsed file
  nameCol: number;          // branch / customer name
  stateCol: number | null;  // optional, helps matching
  dateMode: DateMode;
  dateCol: number | null;   // dateMode 'column'
  amountCol: number | null; // dateMode 'column' or 'single'
  singlePeriod: string;     // dateMode 'single', e.g. '2026-03-01'
  monthCols: number[];      // dateMode 'across': columns that each hold one month
  defaultYear: number;      // for month headers with no year ("Jan")
};

export type SalesRecord = { name: string; state: string | null; period: string; amount: number };

// Reads every data row below the header into { name, period, amount }.
// Rows with no name, no usable month, or no amount are counted as skipped.
// Rows whose name looks like a total line are dropped.
export function extractRecords(rows: string[][], map: Mapping): { records: SalesRecord[]; skippedRows: number } {
  const records: SalesRecord[] = [];
  let skippedRows = 0;
  const header = rows[map.headerRow] || [];

  for (const row of rows.slice(map.headerRow + 1)) {
    const name = (row[map.nameCol] || '').trim();
    if (!name) { skippedRows++; continue; }
    if (/^(grand\s+)?totals?\b|^subtotal/i.test(name)) continue;
    const state = map.stateCol != null ? (row[map.stateCol] || '').trim() || null : null;

    if (map.dateMode === 'across') {
      let any = false;
      for (const c of map.monthCols) {
        const period = parsePeriod(header[c], map.defaultYear);
        const amount = parseAmount(row[c]);
        if (period && amount != null && amount !== 0) { records.push({ name, state, period, amount }); any = true; }
      }
      if (!any) skippedRows++;
    } else {
      const period = map.dateMode === 'single'
        ? map.singlePeriod
        : parsePeriod(map.dateCol != null ? row[map.dateCol] : null, map.defaultYear);
      const amount = parseAmount(map.amountCol != null ? row[map.amountCol] : null);
      if (!period || amount == null) { skippedRows++; continue; }
      if (amount !== 0) records.push({ name, state, period, amount });
    }
  }
  return { records, skippedRows };
}
