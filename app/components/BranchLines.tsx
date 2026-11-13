"use client";

// Shows each of our lines for one branch, filtered to the lines we
// actually rep in that branch's state, and lets the rep mark what the
// branch stocks. This is the white-space checklist.

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { LINE_STATUSES } from '@/lib/constants';
import { fetchLines, fetchCoverage, coverageFor, CoverageRow } from '@/lib/lines';

type Props = { accountId: string; territory?: string | null };

export default function BranchLines({ accountId, territory }: Props) {
  const [lines, setLines] = useState<any[]>([]);
  const [coverage, setCoverage] = useState<CoverageRow[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showOther, setShowOther] = useState(false);

  useEffect(() => {
    async function load() {
      const [l, c, { data: bl }] = await Promise.all([
        fetchLines(),
        fetchCoverage(),
        supabase.from('branch_lines').select('vendor_id, status').eq('account_id', accountId),
      ]);
      setLines(l);
      setCoverage(c);
      const map: Record<string, string> = {};
      (bl || []).forEach((r: any) => { map[String(r.vendor_id)] = r.status; });
      setStatuses(map);
      setIsLoading(false);
    }
    load();
  }, [accountId]);

  async function setStatus(vendorId: string | number, status: string) {
    const key = String(vendorId);
    const previous = statuses[key];
    setStatuses(prev => ({ ...prev, [key]: status })); // update screen right away
    setSavingId(key);
    setError('');

    let err;
    if (status === '') {
      ({ error: err } = await supabase.from('branch_lines').delete().eq('account_id', accountId).eq('vendor_id', vendorId));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      ({ error: err } = await supabase.from('branch_lines').upsert(
        { account_id: accountId, vendor_id: vendorId, status, updated_by: user?.email || null, updated_at: new Date().toISOString() },
        { onConflict: 'account_id,vendor_id' }
      ));
    }

    if (err) {
      setStatuses(prev => ({ ...prev, [key]: previous })); // roll back
      setError('Could not save: ' + err.message);
    }
    setSavingId(null);
  }

  if (isLoading) {
    return <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center text-gray-500 text-sm">Loading lines...</div>;
  }

  // Split lines into ones we rep here vs. not
  const ours: { line: any; partial: boolean; partialNote: string | null; unset: boolean }[] = [];
  const notHere: any[] = [];
  lines.forEach(line => {
    const { coverage: cov, notes } = coverageFor(coverage, line.id, territory);
    if (cov === 'none') notHere.push(line);
    else ours.push({ line, partial: cov === 'partial', partialNote: notes, unset: cov === 'unset' });
  });

  const counted = ours.filter(o => statuses[String(o.line.id)] !== 'not_ours');
  const stocked = counted.filter(o => statuses[String(o.line.id)] === 'stocked').length;
  const gaps = counted.filter(o => ['not_stocked', 'prospect', 'lost'].includes(statuses[String(o.line.id)])).length;
  const unknown = counted.filter(o => !statuses[String(o.line.id)]).length;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-bold text-gray-900">Our Lines Here</h2>
        <p className="text-sm text-gray-600 font-medium mt-1">
          Stocks <b className="text-green-700">{stocked}</b> of {counted.length}
          {gaps > 0 && <> · <b className="text-red-700">{gaps} gap{gaps === 1 ? '' : 's'}</b></>}
          {unknown > 0 && <> · {unknown} not checked</>}
        </p>
      </div>

      {!territory && (
        <div className="p-4 bg-yellow-50 text-yellow-800 text-sm font-medium border-b border-yellow-100">
          ⚠ No state set for this branch, so every line is shown. <Link href={`/accounts/${accountId}/edit`} className="underline font-bold">Set the state</Link>.
        </div>
      )}

      {error && <div className="p-3 bg-red-50 text-red-700 text-sm font-bold border-b border-red-200">{error}</div>}

      <div className="divide-y divide-gray-100">
        {ours.map(({ line, partial, partialNote, unset }) => {
          const key = String(line.id);
          const current = statuses[key] || '';
          const style = LINE_STATUSES.find(s => s.value === current)?.style || LINE_STATUSES[0].style;
          return (
            <div key={key} className="px-6 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{line.name}</p>
                {partial && (
                  <p className="text-[11px] text-blue-700 font-medium">Partial {territory}{partialNote ? `: ${partialNote}` : ''}</p>
                )}
                {unset && <p className="text-[11px] text-gray-400 font-medium">Territory not set up</p>}
              </div>
              <select
                value={current}
                disabled={savingId === key}
                onChange={(e) => setStatus(line.id, e.target.value)}
                className={`shrink-0 border rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-600 ${style}`}
              >
                {LINE_STATUSES
                  .filter(s => s.value !== 'not_ours' || partial || current === 'not_ours')
                  .map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          );
        })}
      </div>

      {notHere.length > 0 && (
        <div className="border-t border-gray-200">
          <button
            type="button"
            onClick={() => setShowOther(!showOther)}
            className="w-full px-6 py-3 text-left text-xs font-bold text-gray-500 hover:bg-gray-50"
          >
            {showOther ? '▾' : '▸'} {notHere.length} line{notHere.length === 1 ? '' : 's'} we don&apos;t rep in {territory}
          </button>
          {showOther && (
            <p className="px-6 pb-4 text-xs text-gray-500">{notHere.map(l => l.name).join(', ')}</p>
          )}
        </div>
      )}
    </div>
  );
}
