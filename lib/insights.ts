// lib/insights.ts — sales comparisons for the home page.
// Compares only complete months that exist in both years, so gaps in the
// data and the current (partial) month never look like a drop.

import { addMonths, type SaleRow } from '@/lib/briefing';

export type Comparison = {
  last12: number;          // total of complete months on file, last 12 months
  ty: number;              // months that have a match a year earlier...
  ly: number;              // ...and those same months last year
  pct: number | null;
  change: number;          // ty - ly, in dollars
  latest: string | null;   // latest complete month on file
};

export const currentMonth = (today = new Date()) =>
  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

// rows can mix accounts and lines. Each account+line is compared on its
// own months (POS preferred over commission when both exist), then summed.
export function compareRows(rows: SaleRow[], today = new Date()): Comparison {
  const cutoff = currentMonth(today);
  const complete = rows.filter(r => r.period < cutoff);

  // Which source to use for each account+line
  const usePos = new Set<string>();
  complete.forEach(r => { if (r.source === 'pos') usePos.add(`${r.account_id}|${r.vendor_id}`); });

  const series = new Map<string, Map<string, number>>(); // account|line → month → amount
  complete.forEach(r => {
    const key = `${r.account_id}|${r.vendor_id}`;
    if (usePos.has(key) ? r.source !== 'pos' : r.source !== 'commission') return;
    const m = series.get(key) || new Map<string, number>();
    m.set(r.period, (m.get(r.period) || 0) + Number(r.amount));
    series.set(key, m);
  });

  const latest = complete.length ? complete.map(r => r.period).sort().pop()! : null;
  if (!latest) return { last12: 0, ty: 0, ly: 0, pct: null, change: 0, latest: null };

  const windowStart = addMonths(latest, -11);
  let last12 = 0, ty = 0, ly = 0;
  series.forEach(m => {
    m.forEach((v, p) => {
      if (p < windowStart || p > latest) return;
      last12 += v;
      const prior = m.get(addMonths(p, -12));
      if (prior != null) { ty += v; ly += prior; }
    });
  });
  const pct = ly > 0 ? Math.round(((ty - ly) / ly) * 100) : null;
  return { last12, ty, ly, pct, change: ty - ly, latest };
}

// Supabase returns at most 1,000 rows per request, so page through.
export async function fetchAllRows<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  pageSize = 1000,
  maxRows = 20000
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const { data, error } = await query(from, from + pageSize - 1);
    if (error) { console.error(error.message); break; }
    out.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return out;
}
