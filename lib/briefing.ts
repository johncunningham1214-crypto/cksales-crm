// lib/briefing.ts — the thinking behind the pre-call briefing.
// Pure functions (no database calls) so the rules are easy to test and tweak.

import { coverageFor, type CoverageRow } from '@/lib/lines';

type Id = string | number;
const same = (a: Id | null | undefined, b: Id | null | undefined) => a != null && b != null && String(a) === String(b);

// ---------- Dates ----------

export const addMonths = (period: string, n: number) => {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
};

export const daysBetween = (fromIso: string, to: Date = new Date()) => {
  const [y, m, d] = fromIso.slice(0, 10).split('-').map(Number);
  const from = new Date(y, m - 1, d);
  const today = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((today.getTime() - from.getTime()) / 86400000);
};

// ---------- Sales trend ----------

export type SaleRow = { account_id: Id; vendor_id: Id; period: string; amount: number; source: 'pos' | 'commission' };

export type LineTrend = {
  vendorId: Id;
  level: 'branch' | 'company';   // branch-level numbers, or the parent company's
  source: 'pos' | 'commission';
  latest: string;                // latest month we have
  last12: number;                // total of months on file in the 12 months up to `latest`
  pct: number | null;            // vs same months last year (only months we have for both years)
  monthsCompared: number;
  series: { period: string; amount: number | null }[]; // 12 months up to latest, null = no data
};

// For one line: use the branch's own numbers when we have them, otherwise
// the parent company's. Prefer POS over commission statements.
export function lineTrend(rows: SaleRow[], vendorId: Id, accountId: Id, parentId?: Id | null): LineTrend | null {
  const forLine = rows.filter(r => same(r.vendor_id, vendorId));
  let level: 'branch' | 'company' = 'branch';
  let pick = forLine.filter(r => same(r.account_id, accountId));
  if (pick.length === 0 && parentId != null) {
    pick = forLine.filter(r => same(r.account_id, parentId));
    level = 'company';
  }
  if (pick.length === 0) return null;

  const source: 'pos' | 'commission' = pick.some(r => r.source === 'pos') ? 'pos' : 'commission';
  const byMonth = new Map<string, number>();
  pick.filter(r => r.source === source).forEach(r => byMonth.set(r.period, (byMonth.get(r.period) || 0) + Number(r.amount)));

  const latest = [...byMonth.keys()].sort().pop()!;
  const series: { period: string; amount: number | null }[] = [];
  let last12 = 0, ty = 0, ly = 0, monthsCompared = 0;
  for (let i = 11; i >= 0; i--) {
    const p = addMonths(latest, -i);
    const v = byMonth.has(p) ? byMonth.get(p)! : null;
    series.push({ period: p, amount: v });
    if (v != null) {
      last12 += v;
      const prior = byMonth.get(addMonths(p, -12));
      if (prior != null) { ty += v; ly += prior; monthsCompared++; }
    }
  }
  const pct = monthsCompared > 0 && ly > 0 ? Math.round(((ty - ly) / ly) * 100) : null;
  return { vendorId, level, source, latest, last12, pct, monthsCompared, series };
}

// ---------- Sister branches ----------

export type SisterGap = { vendorId: Id; lineName: string; stocked: number; of: number; hereStatus: string };

// Lines this branch doesn't stock that its sister branches (same parent
// company) do. Only counts sisters in states where we rep that line.
export function sisterGaps(args: {
  lines: { id: Id; name: string }[];
  coverage: CoverageRow[];
  here: { id: Id; territory?: string | null };
  hereStatuses: Record<string, string>;            // vendorId → status at this branch
  sisters: { id: Id; territory?: string | null }[];
  sisterStatuses: { account_id: Id; vendor_id: Id; status: string }[];
}): SisterGap[] {
  const { lines, coverage, here, hereStatuses, sisters, sisterStatuses } = args;
  const gaps: SisterGap[] = [];

  for (const line of lines) {
    if (coverageFor(coverage, line.id, here.territory).coverage === 'none') continue;
    const status = hereStatuses[String(line.id)] || '';
    if (status === 'stocked' || status === 'not_ours') continue;

    const eligible = sisters.filter(s => {
      if (coverageFor(coverage, line.id, s.territory).coverage === 'none') return false;
      const st = sisterStatuses.find(x => same(x.account_id, s.id) && same(x.vendor_id, line.id))?.status;
      return st !== 'not_ours';
    });
    const stocked = eligible.filter(s =>
      sisterStatuses.some(x => same(x.account_id, s.id) && same(x.vendor_id, line.id) && x.status === 'stocked')
    ).length;

    if (stocked > 0) gaps.push({ vendorId: line.id, lineName: line.name, stocked, of: eligible.length, hereStatus: status });
  }
  return gaps.sort((a, b) => b.stocked / b.of - a.stocked / a.of || b.stocked - a.stocked);
}

// ---------- Talking points ----------

export type TalkingPoint = { kind: 'task' | 'gap' | 'decline' | 'winback' | 'focus' | 'stale' | 'unchecked' | 'growth'; text: string; vendorId?: Id };

export function talkingPoints(args: {
  tasks: { title: string; due_date?: string | null; status?: string | null }[];
  gaps: SisterGap[];
  parentName?: string | null;
  trends: (LineTrend & { lineName: string })[];
  lines: { id: Id; name: string; focus_products?: string | null }[];
  hereStatuses: Record<string, string>;
  coveredLineIds: Id[];
  daysSinceVisit: number | null;
  today?: Date;
}): TalkingPoint[] {
  const { tasks, gaps, parentName, trends, lines, hereStatuses, coveredLineIds, daysSinceVisit } = args;
  const today = args.today || new Date();
  const out: Record<TalkingPoint['kind'], TalkingPoint[]> = { task: [], gap: [], decline: [], winback: [], focus: [], stale: [], unchecked: [], growth: [] };

  // Promises due: open tasks overdue or due within a week
  tasks
    .filter(t => (t.status || '').toLowerCase() !== 'completed' && t.due_date)
    .map(t => ({ t, d: -daysBetween(t.due_date!, today) }))   // days until due (negative = overdue)
    .filter(x => x.d <= 7)
    .sort((a, b) => a.d - b.d)
    .forEach(({ t, d }) => out.task.push({
      kind: 'task',
      text: `Follow up: ${t.title} (${d < 0 ? `${-d} day${d === -1 ? '' : 's'} overdue` : d === 0 ? 'due today' : `due in ${d} day${d === 1 ? '' : 's'}`})`,
    }));

  // Sister-branch gaps
  const company = parentName || 'sister';
  gaps.forEach(g => out.gap.push({
    kind: 'gap', vendorId: g.vendorId,
    text: g.hereStatus === 'prospect'
      ? `${g.stocked} of ${g.of} ${company} branches stock ${g.lineName}. You're working on it here, so push to close.`
      : `${g.stocked} of ${g.of} ${company} branches stock ${g.lineName}. This one doesn't.`,
  }));

  // Lines we lost here
  lines.filter(l => hereStatuses[String(l.id)] === 'lost' && !gaps.some(g => same(g.vendorId, l.id)))
    .forEach(l => out.winback.push({ kind: 'winback', vendorId: l.id, text: `Win back ${l.name}. They used to stock it.` }));

  // Declines and growth
  trends.filter(t => t.pct != null && t.pct <= -15).sort((a, b) => a.pct! - b.pct!)
    .forEach(t => out.decline.push({
      kind: 'decline', vendorId: t.vendorId,
      text: `${t.lineName} is down ${-t.pct!}% vs. last year${t.level === 'company' ? ' (company-wide)' : ''}. Ask what changed.`,
    }));
  trends.filter(t => t.pct != null && t.pct >= 15).sort((a, b) => b.pct! - a.pct!)
    .forEach(t => out.growth.push({
      kind: 'growth', vendorId: t.vendorId,
      text: `${t.lineName} is up ${t.pct}% vs. last year${t.level === 'company' ? ' (company-wide)' : ''}. Thank them and ask what's driving it.`,
    }));

  // Factory focus products on lines they already carry
  lines.filter(l => l.focus_products && hereStatuses[String(l.id)] === 'stocked')
    .forEach(l => out.focus.push({ kind: 'focus', vendorId: l.id, text: `${l.name} focus: ${l.focus_products}` }));

  if (daysSinceVisit == null) out.stale.push({ kind: 'stale', text: 'No visit logged here yet. Introduce yourself and learn the counter staff.' });
  else if (daysSinceVisit > 45) out.stale.push({ kind: 'stale', text: `No visit in ${daysSinceVisit} days. Check in on how our lines are moving.` });

  const unchecked = coveredLineIds.filter(id => !hereStatuses[String(id)]).length;
  if (unchecked > 0) out.unchecked.push({ kind: 'unchecked', text: `${unchecked} of our lines aren't checked off here yet. Walk the shelves and update them.` });

  // Take the best 3: one promise, the strongest gap, a decline, then the rest
  const order: TalkingPoint['kind'][] = ['task', 'gap', 'decline', 'gap', 'winback', 'focus', 'growth', 'stale', 'unchecked', 'task'];
  const used: Record<string, number> = {};
  const picked: TalkingPoint[] = [];
  for (const k of order) {
    if (picked.length === 3) break;
    const i = used[k] || 0;
    if (out[k][i]) { picked.push(out[k][i]); used[k] = i + 1; }
  }
  return picked;
}

// ---------- Health ----------

export type Health = { color: 'green' | 'yellow' | 'red' | 'gray'; label: string; reason: string };

export function branchHealth(trends: LineTrend[], daysSinceVisit: number | null): Health {
  const compared = trends.filter(t => t.pct != null);
  let pct: number | null = null;
  if (compared.length) {
    // Weight each line by its size so one small line doesn't swing the badge
    let ty = 0, ly = 0;
    compared.forEach(t => { const lyEst = t.last12 / (1 + t.pct! / 100); ty += t.last12; ly += lyEst; });
    pct = ly > 0 ? Math.round(((ty - ly) / ly) * 100) : null;
  }
  const parts: string[] = [];
  if (pct != null) parts.push(`Sales ${pct >= 0 ? '+' : ''}${pct}%`);
  parts.push(daysSinceVisit == null ? 'never visited' : `visited ${daysSinceVisit === 0 ? 'today' : `${daysSinceVisit}d ago`}`);
  const reason = parts.join(' · ');

  if (pct == null && daysSinceVisit == null) return { color: 'gray', label: 'New', reason };
  if ((pct != null && pct <= -15) || (daysSinceVisit != null && daysSinceVisit > 90)) return { color: 'red', label: 'Slipping', reason };
  if ((pct == null || pct >= 5) && daysSinceVisit != null && daysSinceVisit <= 45) return { color: 'green', label: 'Healthy', reason };
  return { color: 'yellow', label: 'Watch', reason };
}
