"use client";

// Home: "My Day". What to do today, what's due, which accounts deserve a
// visit, what the team learned, and how sales are moving.

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useMe, OPEN_WHO_ARE_YOU } from '@/lib/me';
import { fetchLines } from '@/lib/lines';
import { periodLabel } from '@/lib/importer';
import { daysBetween, addMonths, type SaleRow } from '@/lib/briefing';
import { compareRows, fetchAllRows, currentMonth, type Comparison } from '@/lib/insights';

const compact = (n: number) =>
  Math.abs(n) >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
  : Math.abs(n) >= 1_000 ? `$${Math.round(n / 1_000)}K`
  : `$${Math.round(n)}`;

const Pct = ({ pct }: { pct: number | null }) =>
  pct == null ? null : (
    <span className={`text-xs font-bold ${pct >= 0 ? 'text-green-700' : 'text-red-700'}`}>
      {pct >= 0 ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  );

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// .in() filters go in the URL, so split long id lists
const chunks = <T,>(arr: T[], size = 100) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

type Visit = { account: any; reason: string; tone: 'red' | 'yellow' | 'gray' };
type Mover = { account: any; cmp: Comparison };

export default function MyDay() {
  const me = useMe();
  const [isLoading, setIsLoading] = useState(true);

  const [stops, setStops] = useState<any[]>([]);
  const [nextStop, setNextStop] = useState<any | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [moreTasks, setMoreTasks] = useState(0);
  const [myAccounts, setMyAccounts] = useState<any[]>([]);
  const [worthVisit, setWorthVisit] = useState<Visit[]>([]);
  const [teamNotes, setTeamNotes] = useState<any[]>([]);
  const [mySales, setMySales] = useState<Comparison | null>(null);
  const [movers, setMovers] = useState<{ up: Mover[]; down: Mover[] }>({ up: [], down: [] });
  const [byLine, setByLine] = useState<{ name: string; cmp: Comparison }[]>([]);
  const [noDataLines, setNoDataLines] = useState<string[]>([]);

  useEffect(() => {
    if (me.loading) return;
    const name = me.name;

    async function load() {
      const today = todayStr();
      const since = addMonths(currentMonth(), -25);
      const lines = await fetchLines();

      // ---- Firm-wide sales by line (everyone sees this) ----
      const firmRows = await fetchAllRows<SaleRow>((from, to) =>
        supabase.from('sales').select('account_id, vendor_id, period, amount, source').gte('period', since).range(from, to));
      const lineCmp = lines
        .map((l: any) => ({ name: l.name, cmp: compareRows(firmRows.filter(r => String(r.vendor_id) === String(l.id))) }))
        .filter(x => x.cmp.latest);
      setByLine(lineCmp.sort((a, b) => b.cmp.last12 - a.cmp.last12));
      setNoDataLines(lines.filter((l: any) => !lineCmp.some(x => x.name === l.name)).map((l: any) => l.name));

      // ---- Team notes (latest shared visits) ----
      const { data: shared } = await supabase
        .from('calls')
        .select('id, date, rep_name, notes, share_headline, account_id, accounts(name, territory, parent_id)')
        .eq('shared', true)
        .order('shared_at', { ascending: false })
        .limit(30);

      if (!name) {
        setTeamNotes((shared || []).slice(0, 3));
        setIsLoading(false);
        return;
      }

      // ---- My stops, tasks and accounts ----
      const [todayRes, nextRes, tasksRes, accountsRes] = await Promise.all([
        supabase.from('events').select('*, accounts(name)').eq('salesman', name).eq('event_date', today).order('event_date'),
        supabase.from('events').select('*, accounts(name)').eq('salesman', name).gt('event_date', today).order('event_date').limit(1),
        supabase.from('tasks').select('*, accounts(name)').eq('rep_name', name).or('status.is.null,status.neq.Completed').order('due_date', { ascending: true, nullsFirst: false }),
        supabase.from('accounts').select('id, name, territory, parent_id, is_parent').contains('assigned_reps', [name]).order('name'),
      ]);
      setStops(todayRes.data || []);
      setNextStop(nextRes.data?.[0] || null);

      const weekOut = addDays(today, 7);
      const allTasks = tasksRes.data || [];
      const soon = allTasks.filter((t: any) => t.due_date && t.due_date <= weekOut);
      setTasks(soon);
      setMoreTasks(allTasks.length - soon.length);

      const accounts = accountsRes.data || [];
      setMyAccounts(accounts);
      const ids = accounts.map((a: any) => a.id);

      // Last visit per account, and sales for my accounts
      const lastVisit = new Map<string, string>();
      const mine: SaleRow[] = [];
      for (const group of chunks(ids)) {
        const [callsRows, salesRows] = await Promise.all([
          fetchAllRows<any>((from, to) =>
            supabase.from('calls').select('account_id, date').in('account_id', group).order('date', { ascending: false }).range(from, to)),
          fetchAllRows<SaleRow>((from, to) =>
            supabase.from('sales').select('account_id, vendor_id, period, amount, source').in('account_id', group).gte('period', since).range(from, to)),
        ]);
        callsRows.forEach((c: any) => { if (!lastVisit.has(String(c.account_id))) lastVisit.set(String(c.account_id), c.date); });
        mine.push(...salesRows);
      }
      setMySales(compareRows(mine));

      // Per-account comparisons: movers and "worth a visit"
      const perAccount = accounts.map((a: any) => ({
        account: a,
        cmp: compareRows(mine.filter(r => String(r.account_id) === String(a.id))),
        days: lastVisit.has(String(a.id)) ? daysBetween(lastVisit.get(String(a.id))!) : null,
      }));
      const withTrend = perAccount.filter(x => x.cmp.pct != null && x.cmp.change !== 0);
      setMovers({
        up: withTrend.filter(x => x.cmp.change > 0).sort((a, b) => b.cmp.change - a.cmp.change).slice(0, 3),
        down: withTrend.filter(x => x.cmp.change < 0).sort((a, b) => a.cmp.change - b.cmp.change).slice(0, 3),
      });

      const visits = perAccount
        .filter(x => x.days == null || x.days > 14)
        .map(x => {
          if (x.cmp.pct != null && x.cmp.pct <= -15)
            return { score: 1000 + Math.abs(x.cmp.change) / 1000, v: { account: x.account, tone: 'red' as const, reason: `Sales down ${-x.cmp.pct}% vs. last year (–${compact(Math.abs(x.cmp.change))})${x.days != null ? ` · last visit ${x.days}d ago` : ''}` } };
          if (x.days == null)
            return { score: 300 + x.cmp.last12 / 100000, v: { account: x.account, tone: 'gray' as const, reason: 'No visit logged yet' } };
          if (x.days > 45)
            return { score: 200 + x.days, v: { account: x.account, tone: 'yellow' as const, reason: `No visit in ${x.days} days` } };
          return null;
        })
        .filter(Boolean)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5)
        .map((x: any) => x.v);
      setWorthVisit(visits);

      // Team notes from the companies I cover, not my own
      const myCompanies = new Set(accounts.map((a: any) => String(a.is_parent ? a.id : (a.parent_id ?? a.id))));
      const notMine = (shared || []).filter((n: any) => n.rep_name !== name);
      const relevant = notMine.filter((n: any) => {
        const acc = n.accounts || {};
        return myCompanies.has(String(acc.parent_id ?? n.account_id));
      });
      setTeamNotes((relevant.length ? relevant : notMine).slice(0, 3));

      setIsLoading(false);
    }
    load();
  }, [me.loading, me.name]);

  async function completeTask(id: any) {
    setTasks(prev => prev.filter(t => t.id !== id));
    const { error } = await supabase.from('tasks').update({ status: 'Completed' }).eq('id', id);
    if (error) alert('Could not complete the task: ' + error.message);
  }

  if (me.loading || isLoading) return <div className="p-8 text-center text-gray-500">Loading your day...</div>;

  const firstName = me.name?.split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const card = "bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden";
  const head = "px-5 py-4 border-b border-gray-100 flex justify-between items-center gap-3";
  const today = todayStr();

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-5">
      <div>
        <p className="text-sm font-bold text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">{greeting}{firstName ? `, ${firstName}` : ''}</h1>
      </div>

      {!me.name && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-blue-900 font-medium">Tell the app which salesman you are to see your stops, tasks and accounts.</p>
          <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_WHO_ARE_YOU))}
            className="shrink-0 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold">Which one is you?</button>
        </div>
      )}

      {me.name && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* 1. TODAY'S STOPS */}
          <div className={card}>
            <div className={head}>
              <h2 className="font-bold text-gray-900">Today&apos;s stops</h2>
              <div className="flex gap-2">
                <Link href="/routing" className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">Plan route</Link>
                <Link href="/calendar" className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">+ Schedule</Link>
              </div>
            </div>
            {stops.length ? (
              <div className="divide-y divide-gray-100">
                {stops.map(s => (
                  <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{s.accounts?.name || s.title}</p>
                      {s.accounts?.name && s.title && <p className="text-xs text-gray-500 truncate">{s.title}</p>}
                    </div>
                    {s.account_id && (
                      <Link href={`/accounts/${s.account_id}/brief`} className="shrink-0 text-xs font-bold text-white bg-gray-900 px-3 py-2 rounded-lg">📋 Brief</Link>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-4 text-sm text-gray-500">
                Nothing scheduled today.
                {nextStop && <> Next: <b className="text-gray-700">{nextStop.accounts?.name || nextStop.title}</b> on {nextStop.event_date}.</>}
                {worthVisit.length > 0 && ' The accounts below are worth a stop.'}
              </div>
            )}
          </div>

          {/* 2. DUE THIS WEEK */}
          <div className={card}>
            <div className={head}>
              <h2 className="font-bold text-gray-900">Due this week</h2>
              <Link href="/tasks" className="text-xs font-bold text-blue-600">All tasks →</Link>
            </div>
            {tasks.length ? (
              <div className="divide-y divide-gray-100">
                {tasks.map(t => {
                  const overdue = t.due_date < today;
                  return (
                    <label key={t.id} className="px-5 py-3 flex items-start gap-3 cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" onChange={() => completeTask(t.id)} className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600 cursor-pointer" />
                      <span className="min-w-0">
                        <span className="block font-bold text-gray-900 text-sm">{t.title}</span>
                        <span className={`block text-xs ${overdue ? 'text-red-700 font-bold' : 'text-gray-500'}`}>
                          {overdue ? 'Overdue · ' : ''}{t.due_date}{t.accounts?.name ? ` · ${t.accounts.name}` : ''}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="px-5 py-4 text-sm text-gray-500">Nothing due this week.</p>
            )}
            {moreTasks > 0 && <p className="px-5 py-2 text-xs text-gray-400 border-t border-gray-100">{moreTasks} more open task{moreTasks === 1 ? '' : 's'} later or with no date</p>}
          </div>

          {/* 3. WORTH A VISIT */}
          <div className={card}>
            <div className={head}><h2 className="font-bold text-gray-900">Worth a visit</h2></div>
            {myAccounts.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-500">
                No accounts are assigned to you yet. Add yourself under &quot;Assigned Salesmen&quot; when editing an account.
              </p>
            ) : worthVisit.length ? (
              <div className="divide-y divide-gray-100">
                {worthVisit.map(v => (
                  <Link key={v.account.id} href={`/accounts/${v.account.id}/brief`} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-gray-50">
                    <span className="min-w-0">
                      <span className="block font-bold text-gray-900 text-sm truncate">
                        {v.tone === 'red' ? '🔴' : v.tone === 'yellow' ? '🟡' : '⚪'} {v.account.name}
                      </span>
                      <span className="block text-xs text-gray-500">{v.reason}</span>
                    </span>
                    <span className="text-gray-400 shrink-0">→</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-5 py-4 text-sm text-gray-500">All your accounts look covered. Nice.</p>
            )}
          </div>

          {/* 4. FROM THE TEAM */}
          <TeamCard notes={teamNotes} card={card} head={head} />
        </div>
      )}

      {!me.name && <TeamCard notes={teamNotes} card={card} head={head} />}

      {/* 5. SALES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {me.name && (
          <div className={card}>
            <div className={head}>
              <h2 className="font-bold text-gray-900">My accounts</h2>
              {mySales?.latest && <span className="text-xs text-gray-400">through {periodLabel(mySales.latest)}</span>}
            </div>
            {mySales?.latest ? (
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-3xl font-black text-gray-900">{compact(mySales.last12)} <Pct pct={mySales.pct} /></p>
                  <p className="text-xs text-gray-500">Last 12 months on file{mySales.pct != null ? ', vs. the same months last year' : ''}</p>
                </div>
                {(movers.up.length > 0 || movers.down.length > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <MoverList title="Biggest gains" items={movers.up} />
                    <MoverList title="Biggest drops" items={movers.down} />
                  </div>
                )}
              </div>
            ) : (
              <p className="px-5 py-4 text-sm text-gray-500">
                No sales data on your accounts yet. Most data is at the parent-company level, so check that the parent companies you cover list you as a salesman.
              </p>
            )}
          </div>
        )}

        <div className={card}>
          <div className={head}>
            <h2 className="font-bold text-gray-900">The firm by line</h2>
            <Link href="/imports" className="text-xs font-bold text-blue-600">Sales data →</Link>
          </div>
          {byLine.length ? (
            <div className="divide-y divide-gray-100">
              {byLine.map(l => (
                <div key={l.name} className="px-5 py-3 flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-bold text-gray-900 text-sm">{l.name}</span>
                    <span className="block text-[11px] text-gray-500">through {periodLabel(l.cmp.latest!)}</span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block font-bold text-gray-900 text-sm">{compact(l.cmp.last12)}</span>
                    <Pct pct={l.cmp.pct} />
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-5 py-4 text-sm text-gray-500">No sales data imported yet.</p>
          )}
          {noDataLines.length > 0 && byLine.length > 0 && (
            <p className="px-5 py-3 text-xs text-gray-400 border-t border-gray-100">No data yet: {noDataLines.join(', ')}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamCard({ notes, card, head }: { notes: any[]; card: string; head: string }) {
  return (
    <div className={card}>
      <div className={head}>
        <h2 className="font-bold text-gray-900">From the team</h2>
        <Link href="/team" className="text-xs font-bold text-blue-600">Team Notes →</Link>
      </div>
      {notes.length ? (
        <div className="divide-y divide-gray-100">
          {notes.map(n => (
            <div key={n.id} className="px-5 py-3">
              <p className="text-sm text-gray-900">
                {n.share_headline ? <b>{n.share_headline}</b> : (n.notes?.length > 160 ? n.notes.slice(0, 160) + '…' : n.notes)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {n.rep_name || 'Team'} at{' '}
                <Link href={`/accounts/${n.account_id}`} className="text-blue-600 font-bold">{n.accounts?.name || 'a branch'}</Link>
                {n.accounts?.territory ? ` (${n.accounts.territory})` : ''} · {n.date}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-5 py-4 text-sm text-gray-500">Nothing shared yet. Tick &quot;Share with the team&quot; when you log a visit that went well.</p>
      )}
    </div>
  );
}

function MoverList({ title, items }: { title: string; items: Mover[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{title}</p>
      <div className="space-y-2">
        {items.map(m => (
          <Link key={m.account.id} href={`/accounts/${m.account.id}/brief`} className="flex justify-between gap-2 text-sm hover:underline">
            <span className="truncate text-gray-800 font-medium">{m.account.name}</span>
            <span className={`shrink-0 font-bold ${m.cmp.change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {m.cmp.change >= 0 ? '+' : '–'}{compact(Math.abs(m.cmp.change))}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
