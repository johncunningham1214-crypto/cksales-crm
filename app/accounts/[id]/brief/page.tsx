"use client";

// Pre-call briefing: everything a salesperson needs in the parking lot,
// readable in 30 seconds on a phone.

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import BranchLines from '@/app/components/BranchLines';
import TeamNotes from '@/app/components/TeamNotes';
import { fetchLines, fetchCoverage, coverageFor } from '@/lib/lines';
import { periodLabel } from '@/lib/importer';
import {
  lineTrend, sisterGaps, talkingPoints, branchHealth, daysBetween, addMonths,
  LineTrend, TalkingPoint, Health, SaleRow,
} from '@/lib/briefing';

const compact = (n: number) =>
  Math.abs(n) >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
  : Math.abs(n) >= 1_000 ? `$${Math.round(n / 1_000)}K`
  : `$${Math.round(n)}`;

const HEALTH_STYLE: Record<Health['color'], string> = {
  green: 'bg-green-100 text-green-800 border-green-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  red: 'bg-red-100 text-red-800 border-red-200',
  gray: 'bg-gray-100 text-gray-600 border-gray-200',
};
const HEALTH_DOT: Record<Health['color'], string> = { green: '🟢', yellow: '🟡', red: '🔴', gray: '⚪' };

const POINT_ICON: Record<TalkingPoint['kind'], string> = {
  task: '✅', gap: '🎯', decline: '📉', winback: '🔁', focus: '⭐', stale: '👋', unchecked: '📋', growth: '📈',
};

function Sparkline({ series }: { series: { amount: number | null }[] }) {
  const max = Math.max(1, ...series.map(s => Math.abs(s.amount || 0)));
  return (
    <svg width="96" height="24" viewBox="0 0 96 24" aria-hidden="true">
      {series.map((s, i) => {
        const h = s.amount == null ? 2 : Math.max(2, (Math.abs(s.amount) / max) * 22);
        return (
          <rect key={i} x={i * 8 + 1} y={24 - h} width="6" height={h} rx="1"
            className={s.amount == null ? 'fill-gray-200' : 'fill-blue-500'} />
        );
      })}
    </svg>
  );
}

type Brief = {
  account: any;
  parent: any | null;
  contacts: any[];
  calls: any[];
  points: TalkingPoint[];
  health: Health;
  daysSinceVisit: number | null;
  trends: (LineTrend & { lineName: string })[];
  docs: { id: any; title: string; category?: string; url: string; lineName: string }[];
  pointLineNames: string[];
};

export default function PreCallBrief() {
  const params = useParams();
  const accountId = params.id as string;
  const [brief, setBrief] = useState<Brief | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [shareMsg, setShareMsg] = useState('');

  useEffect(() => {
    async function load() {
      const { data: account } = await supabase.from('accounts').select('*').eq('id', accountId).single();
      if (!account) { setNotFound(true); setIsLoading(false); return; }

      const since = addMonths(new Date().toISOString().slice(0, 7) + '-01', -25);
      const salesIds = [account.id, account.parent_id].filter(Boolean);

      const [parentRes, contactsRes, callsRes, tasksRes, lines, coverage, hereRes, salesRes, sistersRes] = await Promise.all([
        account.parent_id ? supabase.from('accounts').select('id, name').eq('id', account.parent_id).single() : Promise.resolve({ data: null }),
        supabase.from('contacts').select('*').eq('account_id', account.id).order('name'),
        supabase.from('calls').select('id, date, type, notes, rep_name, vendors').eq('account_id', account.id).order('date', { ascending: false }).limit(5),
        supabase.from('tasks').select('title, due_date, status').eq('account_id', account.id).or('status.is.null,status.neq.Completed'),
        fetchLines(),
        fetchCoverage(),
        supabase.from('branch_lines').select('vendor_id, status').eq('account_id', account.id),
        supabase.from('sales').select('account_id, vendor_id, period, amount, source').in('account_id', salesIds).gte('period', since),
        account.parent_id
          ? supabase.from('accounts').select('id, territory').eq('parent_id', account.parent_id).neq('id', account.id)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const parent = parentRes.data;
      const sisters = (sistersRes.data || []) as any[];
      const { data: sisterStatuses } = sisters.length
        ? await supabase.from('branch_lines').select('account_id, vendor_id, status').in('account_id', sisters.map(s => s.id))
        : { data: [] as any[] };

      const hereStatuses: Record<string, string> = {};
      (hereRes.data || []).forEach((r: any) => { hereStatuses[String(r.vendor_id)] = r.status; });

      const coveredLines = lines.filter((l: any) => coverageFor(coverage, l.id, account.territory).coverage !== 'none');

      // Sales trends per line (branch numbers if we have them, else the parent company's)
      const sales = (salesRes.data || []) as SaleRow[];
      const trends = lines
        .map((l: any) => {
          const t = lineTrend(sales, l.id, account.id, account.parent_id);
          return t ? { ...t, lineName: l.name, level: account.is_parent ? 'company' as const : t.level } : null;
        })
        .filter(Boolean)
        .sort((a: any, b: any) => b.last12 - a.last12) as (LineTrend & { lineName: string })[];

      const calls = callsRes.data || [];
      const daysSinceVisit = calls[0]?.date ? daysBetween(calls[0].date) : null;

      const gaps = account.is_parent ? [] : sisterGaps({
        lines, coverage, here: account, hereStatuses, sisters, sisterStatuses: sisterStatuses || [],
      });

      const points = talkingPoints({
        tasks: tasksRes.data || [],
        gaps,
        parentName: parent?.name,
        trends,
        lines,
        hereStatuses,
        coveredLineIds: account.is_parent ? [] : coveredLines.map((l: any) => l.id),
        daysSinceVisit,
      });

      // Docs for the lines we're about to talk about, then any gap lines
      const docLineIds = [...new Set([
        ...points.filter(p => p.vendorId != null).map(p => String(p.vendorId)),
        ...gaps.map(g => String(g.vendorId)),
      ])].slice(0, 6);
      const { data: docRows } = docLineIds.length
        ? await supabase.from('documents').select('id, title, category, file_path, vendor_id').in('vendor_id', docLineIds).order('title')
        : { data: [] as any[] };
      const lineName = (id: any) => lines.find((l: any) => String(l.id) === String(id))?.name || '';
      const docs = docLineIds
        .flatMap(id => (docRows || []).filter((d: any) => String(d.vendor_id) === id).slice(0, 2))
        .slice(0, 6)
        .map((d: any) => ({
          id: d.id, title: d.title, category: d.category, lineName: lineName(d.vendor_id),
          url: supabase.storage.from('vendor-files').getPublicUrl(d.file_path).data.publicUrl,
        }));

      setBrief({
        account, parent,
        contacts: contactsRes.data || [],
        calls: calls.slice(0, 3),
        points,
        health: branchHealth(trends, daysSinceVisit),
        daysSinceVisit,
        trends,
        docs,
        pointLineNames: [...new Set(points.filter(p => p.vendorId != null).map(p => lineName(p.vendorId)).filter(Boolean))],
      });
      setIsLoading(false);
    }
    if (accountId) load();
  }, [accountId]);

  async function share() {
    if (!brief) return;
    const b = brief;
    const text = [
      `Pre-call brief: ${b.account.name}`,
      `${HEALTH_DOT[b.health.color]} ${b.health.reason}`,
      '',
      'Bring up today:',
      ...b.points.map((p, i) => `${i + 1}. ${p.text}`),
      ...(b.trends.length ? ['', 'Sales (last 12 months on file):', ...b.trends.slice(0, 5).map(t => `• ${t.lineName}: ${compact(t.last12)}${t.pct != null ? ` (${t.pct >= 0 ? '+' : ''}${t.pct}%)` : ''}`)] : []),
    ].join('\n');
    try {
      if (navigator.share) await navigator.share({ title: `Brief: ${b.account.name}`, text });
      else { await navigator.clipboard.writeText(text); setShareMsg('Copied. Paste it into a text or email.'); }
    } catch {
      // user closed the share sheet
    }
  }

  if (isLoading) return <div className="p-8 text-center text-gray-500">Building your brief...</div>;
  if (notFound || !brief) return <div className="p-8 text-center text-red-500">Account not found.</div>;

  const { account, parent, contacts, calls, points, health, daysSinceVisit, trends, docs, pointLineNames } = brief;
  const lastCall = calls[0];
  const logHref = `/calls/new?accountId=${account.id}${pointLineNames.length ? `&vendors=${encodeURIComponent(pointLineNames.join(','))}` : ''}`;
  const card = "bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden";
  const cardHead = "px-5 py-4 border-b border-gray-100 flex justify-between items-center";

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4 pb-32">
      <Link href={`/accounts/${account.id}`} className="text-blue-600 hover:underline font-medium text-sm">← Full account page</Link>

      {/* HEADER: the 5-second read */}
      <div className={`${card} p-5`}>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pre-call brief</p>
        <h1 className="text-2xl font-black text-gray-900 leading-tight mt-1">{account.name}</h1>
        {parent && <p className="text-sm text-gray-500 font-medium">{parent.name}{account.territory ? ` · ${account.territory}` : ''}</p>}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${HEALTH_STYLE[health.color]}`}>
            {HEALTH_DOT[health.color]} {health.label}
          </span>
          <span className="text-sm text-gray-600 font-medium">{health.reason}</span>
        </div>
        {lastCall && (
          <p className="text-sm text-gray-700 mt-3">
            Last visit: <b>{daysSinceVisit === 0 ? 'today' : `${daysSinceVisit} days ago`}</b>{lastCall.rep_name ? `, ${lastCall.rep_name}` : ''}
          </p>
        )}
      </div>

      {/* 1. BRING UP TODAY */}
      <div className="bg-blue-600 rounded-2xl shadow-sm p-5 text-white">
        <h2 className="text-sm font-black uppercase tracking-wider text-blue-100">Bring up today</h2>
        {points.length ? (
          <ol className="mt-3 space-y-3">
            {points.map((p, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-sm">{POINT_ICON[p.kind]}</span>
                <span className="font-semibold leading-snug pt-0.5">{p.text}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 font-medium text-blue-50">Nothing flagged. Ask what&apos;s moving and walk the shelves.</p>
        )}
      </div>

      {/* WHAT'S WORKED AT SISTER BRANCHES */}
      <TeamNotes accountId={account.id} parentId={account.parent_id} isParent={account.is_parent} companyName={account.is_parent ? account.name : parent?.name} limit={3} />

      {/* 2. PEOPLE */}
      <div className={card}>
        <div className={cardHead}>
          <h2 className="font-bold text-gray-900">People</h2>
          <Link href={`/contacts/new?accountId=${account.id}`} className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">+ Add</Link>
        </div>
        {contacts.length ? (
          <div className="divide-y divide-gray-100">
            {contacts.map(c => (
              <div key={c.id} className="px-5 py-3">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.title || 'Staff'}</p>
                  </div>
                  {c.phone && <a href={`tel:${c.phone}`} className="shrink-0 text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">📞 Call</a>}
                </div>
                {c.notes && <p className="text-sm text-gray-600 mt-1.5 bg-gray-50 rounded-lg px-3 py-2">{c.notes}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 py-4 text-sm text-gray-500">No contacts yet. Get the buyer&apos;s and counter staff&apos;s names today.</p>
        )}
      </div>

      {/* 3. OUR LINES HERE (one-tap updates) */}
      {!account.is_parent && <BranchLines accountId={account.id} territory={account.territory} />}

      {/* 4. SALES */}
      <div className={card}>
        <div className={cardHead}>
          <h2 className="font-bold text-gray-900">Sales</h2>
          <span className="text-xs text-gray-400 font-medium">last 12 months on file</span>
        </div>
        {trends.length ? (
          <div className="divide-y divide-gray-100">
            {trends.map(t => (
              <div key={String(t.vendorId)} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-sm">
                    {t.lineName} <span className="text-gray-900">{compact(t.last12)}</span>
                    {t.pct != null && (
                      <span className={`ml-2 text-xs font-bold ${t.pct >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {t.pct >= 0 ? '▲' : '▼'} {Math.abs(t.pct)}%
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {t.level === 'company' ? 'Company-wide' : 'This branch'} · {t.source === 'pos' ? 'POS' : 'commission report'} · through {periodLabel(t.latest)}
                    {t.pct != null && t.monthsCompared < 12 && ` · ${t.monthsCompared} mo compared`}
                  </p>
                </div>
                <Sparkline series={t.series} />
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 py-4 text-sm text-gray-500">No sales data imported for this account yet.</p>
        )}
      </div>

      {/* 5. RECENT ACTIVITY */}
      <div className={card}>
        <div className={cardHead}><h2 className="font-bold text-gray-900">Recent visits</h2></div>
        {calls.length ? (
          <div className="divide-y divide-gray-100">
            {calls.map(c => (
              <div key={c.id} className="px-5 py-3">
                <p className="text-sm text-gray-900"><b>{c.rep_name || 'Team'}</b> · {c.type} · <span className="text-gray-500">{c.date}</span></p>
                {c.vendors?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {c.vendors.map((v: string) => <span key={v} className="bg-gray-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">{v}</span>)}
                  </div>
                )}
                {c.notes && <p className="text-sm text-gray-600 mt-1">{c.notes.length > 220 ? c.notes.slice(0, 220) + '…' : c.notes}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 py-4 text-sm text-gray-500">No visits logged yet.</p>
        )}
      </div>

      {/* 6. DOCS TO HAVE READY */}
      {docs.length > 0 && (
        <div className={card}>
          <div className={cardHead}><h2 className="font-bold text-gray-900">Have these ready</h2></div>
          <div className="divide-y divide-gray-100">
            {docs.map(d => (
              <div key={d.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{d.title}</p>
                  <p className="text-[11px] text-gray-500">{d.lineName}{d.category ? ` · ${d.category}` : ''}</p>
                </a>
                <div className="flex gap-2 shrink-0">
                  <a href={`sms:?&body=${encodeURIComponent(`${d.title}: ${d.url}`)}`} className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg">Text</a>
                  <a href={`mailto:?subject=${encodeURIComponent(d.title)}&body=${encodeURIComponent(d.url)}`} className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg">Email</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STICKY ACTIONS */}
      <div className="fixed bottom-0 inset-x-0 md:left-64 bg-white/95 backdrop-blur border-t border-gray-200 p-3 z-30">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button type="button" onClick={share} className="flex-1 bg-white border border-gray-300 text-gray-700 py-3.5 rounded-xl font-bold">
            Share brief
          </button>
          <Link href={logHref} className="flex-[2] bg-blue-600 text-white py-3.5 rounded-xl font-bold text-center hover:bg-blue-700">
            Log this visit
          </Link>
        </div>
        {shareMsg && <p className="text-center text-xs font-bold text-green-700 mt-2">{shareMsg}</p>}
      </div>
    </div>
  );
}
