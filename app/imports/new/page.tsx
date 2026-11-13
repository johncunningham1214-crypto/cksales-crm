"use client";

// Import a principal's POS report or commission statement (CSV).
// Steps: 1) pick line + file  2) tell us which columns are what
//        3) match the file's customer names to our branches  4) review + import

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { fetchLines } from '@/lib/lines';
import {
  parseCSV, guessHeaderRow, parsePeriod, periodLabel, normalizeName,
  suggestAccount, extractRecords, DateMode, Mapping,
} from '@/lib/importer';

type Step = 1 | 2 | 3 | 4 | 5;
type MatchState = { accountId: string; how: 'saved' | 'suggested' | 'exact' | 'manual' | 'none' };

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const input = "w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none bg-white";
const SKIP = '__skip__';

export default function ImportSales() {
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [lines, setLines] = useState<any[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [source, setSource] = useState<'pos' | 'commission'>('pos');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<string[][]>([]);
  const [fileError, setFileError] = useState('');

  // Step 2
  const thisYear = new Date().getFullYear();
  const [headerRow, setHeaderRow] = useState(0);
  const [nameCol, setNameCol] = useState(-1);
  const [stateCol, setStateCol] = useState(-1);
  const [dateMode, setDateMode] = useState<DateMode>('column');
  const [dateCol, setDateCol] = useState(-1);
  const [amountCol, setAmountCol] = useState(-1);
  const [singleMonth, setSingleMonth] = useState(new Date().toISOString().slice(0, 7));
  const [monthCols, setMonthCols] = useState<number[]>([]);
  const [defaultYear, setDefaultYear] = useState(thisYear);

  // Step 3
  const [accounts, setAccounts] = useState<any[]>([]);
  const [matches, setMatches] = useState<Record<string, MatchState>>({});
  const [savedAliases, setSavedAliases] = useState<Record<string, string | null>>({});
  const [onlyUnmatched, setOnlyUnmatched] = useState(false);
  const [rememberMatches, setRememberMatches] = useState(true);

  // Step 4 / 5
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [result, setResult] = useState<{ importId: number; months: number; branches: number; total: number } | null>(null);

  useEffect(() => {
    fetchLines().then(setLines);
    supabase.from('accounts').select('id, name, territory, is_parent').order('name').then(({ data }) => setAccounts(data || []));
  }, []);

  const header = rows[headerRow] || [];
  const colOptions = header.map((h, i) => ({ i, label: h?.trim() || `Column ${i + 1}` }));
  const vendorName = lines.find(l => String(l.id) === vendorId)?.name || '';

  // ---------- Step 1: read the file ----------
  async function handleFile(file: File | undefined) {
    setFileError('');
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      setFileError('Please upload a .csv file. In Excel: File → Save As → "CSV UTF-8".');
      return;
    }
    const text = await file.text();
    const parsed = parseCSV(text);
    if (parsed.length < 2) { setFileError('That file looks empty.'); return; }
    setFileName(file.name);
    setRows(parsed);
    const h = guessHeaderRow(parsed);
    setHeaderRow(h);
    autoMap(parsed, h);
  }

  // Best guesses for which column is which, based on header words
  function autoMap(all: string[][], h: number) {
    const hdr = (all[h] || []).map(c => (c || '').toLowerCase());
    const find = (...words: string[]) => hdr.findIndex(c => words.some(w => c.includes(w)));
    setNameCol(find('customer', 'branch', 'ship to', 'ship-to', 'sold to', 'account', 'name', 'distributor'));
    setStateCol(hdr.findIndex(c => c.trim() === 'state' || c.trim() === 'st' || c.includes('ship state')));
    setDateCol(find('date', 'period', 'month'));
    setAmountCol(find('sales', 'amount', 'net', 'extended', 'total', 'revenue', '$'));

    const monthish = hdr.map((c, i) => (parsePeriod(c, thisYear) ? i : -1)).filter(i => i >= 0);
    setMonthCols(monthish);
    setDateMode(monthish.length >= 2 ? 'across' : 'column');
  }

  // ---------- Step 2: records from the mapping ----------
  const mapping: Mapping = {
    headerRow,
    nameCol,
    stateCol: stateCol >= 0 ? stateCol : null,
    dateMode,
    dateCol: dateCol >= 0 ? dateCol : null,
    amountCol: amountCol >= 0 ? amountCol : null,
    singlePeriod: `${singleMonth}-01`,
    monthCols,
    defaultYear,
  };

  const { records, skippedRows } = useMemo(
    () => (nameCol >= 0 && rows.length ? extractRecords(rows, mapping) : { records: [], skippedRows: 0 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, headerRow, nameCol, stateCol, dateMode, dateCol, amountCol, singleMonth, monthCols, defaultYear]
  );

  const mappingReady =
    nameCol >= 0 &&
    (dateMode === 'across' ? monthCols.length > 0 : amountCol >= 0 && (dateMode === 'single' || dateCol >= 0)) &&
    records.length > 0;

  // Unique names in the file, biggest first
  const fileNames = useMemo(() => {
    const m = new Map<string, { raw: string; state: string | null; total: number }>();
    records.forEach(r => {
      const key = normalizeName(r.name);
      const cur = m.get(key) || { raw: r.name, state: r.state, total: 0 };
      cur.total += r.amount;
      m.set(key, cur);
    });
    return [...m.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.total - a.total);
  }, [records]);

  // ---------- Step 3: load saved matches, then suggest the rest ----------
  async function goToMatching() {
    const { data } = await supabase.from('account_aliases').select('alias, account_id').eq('vendor_id', vendorId);
    const saved: Record<string, string | null> = {};
    (data || []).forEach((a: any) => { saved[a.alias] = a.account_id == null ? null : String(a.account_id); });
    setSavedAliases(saved);

    const exact = new Map(accounts.map(a => [normalizeName(a.name), String(a.id)]));
    const next: Record<string, MatchState> = {};
    fileNames.forEach(n => {
      if (n.key in saved) next[n.key] = { accountId: saved[n.key] ?? SKIP, how: 'saved' };
      else if (exact.has(n.key)) next[n.key] = { accountId: exact.get(n.key)!, how: 'exact' };
      else {
        const s = suggestAccount(n.raw, accounts, n.state);
        next[n.key] = s ? { accountId: String(s.id), how: 'suggested' } : { accountId: '', how: 'none' };
      }
    });
    setMatches(next);
    setStep(3);
  }

  const setMatch = (key: string, accountId: string) =>
    setMatches(prev => ({ ...prev, [key]: { accountId, how: 'manual' } }));

  const unmatchedCount = fileNames.filter(n => !matches[n.key]?.accountId).length;

  // ---------- Step 4: totals ----------
  const summary = useMemo(() => {
    const byMonth = new Map<string, number>();
    const byKey = new Map<string, number>(); // account|period → amount
    let matched = 0, skipped = 0;
    records.forEach(r => {
      const m = matches[normalizeName(r.name)];
      if (!m || !m.accountId || m.accountId === SKIP) { skipped += r.amount; return; }
      matched += r.amount;
      byMonth.set(r.period, (byMonth.get(r.period) || 0) + r.amount);
      const k = `${m.accountId}|${r.period}`;
      byKey.set(k, (byKey.get(k) || 0) + r.amount);
    });
    const branches = new Set([...byKey.keys()].map(k => k.split('|')[0])).size;
    return { byMonth: [...byMonth.entries()].sort(), byKey, matched, skipped, branches };
  }, [records, matches]);

  // ---------- Import ----------
  async function runImport() {
    setIsImporting(true);
    setImportError('');
    const { data: { user } } = await supabase.auth.getUser();
    const periods = summary.byMonth.map(([p]) => p);

    const { data: imp, error: impErr } = await supabase
      .from('sales_imports')
      .insert([{
        vendor_id: vendorId, source, file_name: fileName,
        period_start: periods[0] || null, period_end: periods[periods.length - 1] || null,
        row_count: records.length,
        total_amount: Math.round(summary.matched * 100) / 100,
        skipped_amount: Math.round(summary.skipped * 100) / 100,
        imported_by: user?.email || null,
      }])
      .select('id');

    if (impErr || !imp?.[0]) {
      setImportError('Could not start the import: ' + (impErr?.message || 'unknown error'));
      setIsImporting(false);
      return;
    }
    const importId = imp[0].id;

    const salesRows = [...summary.byKey.entries()].map(([k, amount]) => {
      const [account_id, period] = k.split('|');
      return { account_id, vendor_id: vendorId, period, amount: Math.round(amount * 100) / 100, source, import_id: importId };
    });

    for (let i = 0; i < salesRows.length; i += 500) {
      const { error } = await supabase
        .from('sales')
        .upsert(salesRows.slice(i, i + 500), { onConflict: 'account_id,vendor_id,period,source' });
      if (error) {
        await supabase.from('sales_imports').delete().eq('id', importId); // roll back what went in
        setImportError('Import failed and was rolled back: ' + error.message);
        setIsImporting(false);
        return;
      }
    }

    if (rememberMatches) {
      const aliasRows = fileNames
        .filter(n => matches[n.key]?.accountId)
        .map(n => ({
          vendor_id: vendorId,
          alias: n.key,
          account_id: matches[n.key].accountId === SKIP ? null : matches[n.key].accountId,
        }))
        .filter(a => savedAliases[a.alias] === undefined || savedAliases[a.alias] !== a.account_id);
      if (aliasRows.length) {
        const { error } = await supabase.from('account_aliases').upsert(aliasRows, { onConflict: 'vendor_id,alias' });
        if (error) console.error('Could not save matches:', error.message);
      }
    }

    setResult({ importId, months: periods.length, branches: summary.branches, total: summary.matched });
    setIsImporting(false);
    setStep(5);
  }

  // Accounts grouped by state for the match dropdowns
  const accountGroups = useMemo(() => {
    const g = new Map<string, any[]>();
    accounts.forEach(a => {
      const k = a.is_parent ? 'Parent companies' : (a.territory || 'No state');
      g.set(k, [...(g.get(k) || []), a]);
    });
    return [...g.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [accounts]);

  // ---------- UI ----------
  const stepHeader = () => (
    <div className="flex gap-2 text-xs font-bold">
      {['File', 'Columns', 'Match branches', 'Review'].map((label, i) => (
        <span key={label} className={`px-3 py-1.5 rounded-full ${step === i + 1 ? 'bg-blue-600 text-white' : step > i + 1 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
          {i + 1}. {label}
        </span>
      ))}
    </div>
  );

  const colSelect = (value: number, onChange: (n: number) => void, optional = false) => (
    <select value={value} onChange={e => onChange(Number(e.target.value))} className={input}>
      <option value={-1}>{optional ? '— none —' : 'Select column...'}</option>
      {colOptions.map(c => <option key={c.i} value={c.i}>{c.label}</option>)}
    </select>
  );

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <Link href="/imports" className="text-blue-600 hover:underline font-medium text-sm">← Import history</Link>
      <h1 className="text-3xl font-black text-gray-900">Import Sales</h1>
      {step <= 4 && stepHeader()}

      {/* STEP 1 */}
      {step === 1 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Which line is this file for? *</label>
            <select value={vendorId} onChange={e => setVendorId(e.target.value)} className={input}>
              <option value="">Select line...</option>
              {lines.map(l => <option key={l.id} value={String(l.id)}>{l.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">What kind of file? *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([['pos', 'POS report', 'What branches sold (sell-through)'], ['commission', 'Commission statement', 'What we were paid commission on']] as const).map(([v, label, sub]) => (
                <button key={v} type="button" onClick={() => setSource(v)}
                  className={`text-left border-2 rounded-xl p-4 ${source === v ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>
                  <p className="font-bold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500 mt-1">{sub}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">File (.csv) *</label>
            <input type="file" accept=".csv,text/csv" onChange={e => handleFile(e.target.files?.[0])}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:font-bold file:bg-blue-50 file:text-blue-700" />
            <p className="text-xs text-gray-500 mt-2">Excel or PDF? Open it in Excel and use File → Save As → CSV UTF-8.</p>
            {fileError && <p className="text-sm font-bold text-red-700 mt-2">{fileError}</p>}
            {fileName && !fileError && <p className="text-sm font-bold text-green-700 mt-2">✓ {fileName}: {rows.length} rows</p>}
          </div>

          <button type="button" disabled={!vendorId || !rows.length} onClick={() => setStep(2)}
            className="w-full bg-blue-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-700 disabled:opacity-50">
            Next: Columns
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Which row has the column names?</label>
            <select value={headerRow} onChange={e => { const h = Number(e.target.value); setHeaderRow(h); autoMap(rows, h); }} className={input}>
              {rows.slice(0, 15).map((r, i) => (
                <option key={i} value={i}>Row {i + 1}: {r.filter(Boolean).slice(0, 4).join(' | ').slice(0, 70)}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Branch / customer name *</label>
              {colSelect(nameCol, setNameCol)}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">State (helps matching)</label>
              {colSelect(stateCol, setStateCol, true)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">How are months shown? *</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([['column', 'A date column', 'Each row has a date'], ['across', 'Months across the top', 'Jan, Feb, Mar... columns'], ['single', 'Whole file is one month', 'e.g. a monthly statement']] as const).map(([v, label, sub]) => (
                <button key={v} type="button" onClick={() => setDateMode(v)}
                  className={`text-left border-2 rounded-xl p-3 ${dateMode === v ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>
                  <p className="font-bold text-gray-900 text-sm">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
                </button>
              ))}
            </div>
          </div>

          {dateMode === 'column' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Date / month column *</label>
                {colSelect(dateCol, setDateCol)}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Sales $ column *</label>
                {colSelect(amountCol, setAmountCol)}
              </div>
            </div>
          )}

          {dateMode === 'single' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Month *</label>
                <input type="month" value={singleMonth} onChange={e => setSingleMonth(e.target.value)} className={input} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Sales $ column *</label>
                {colSelect(amountCol, setAmountCol)}
              </div>
            </div>
          )}

          {dateMode === 'across' && (
            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-700">Tick each column that is one month of sales *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {colOptions.map(c => {
                  const p = parsePeriod(c.label, defaultYear);
                  const on = monthCols.includes(c.i);
                  return (
                    <label key={c.i} className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm cursor-pointer ${on ? 'border-blue-600 bg-blue-50' : 'border-gray-200'} ${!p ? 'opacity-50' : ''}`}>
                      <input type="checkbox" disabled={!p} checked={on}
                        onChange={() => setMonthCols(prev => on ? prev.filter(x => x !== c.i) : [...prev, c.i])} />
                      <span className="truncate">{c.label}{p && <span className="block text-[10px] text-blue-700 font-bold">{periodLabel(p)}</span>}</span>
                    </label>
                  );
                })}
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-bold text-gray-700">Year for headers without one:</label>
                <input type="number" value={defaultYear} onChange={e => setDefaultYear(Number(e.target.value))} className="w-28 border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <p className="text-xs text-gray-500">Don&apos;t tick YTD or Total columns.</p>
            </div>
          )}

          {/* Live preview */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm">
            {records.length > 0 ? (
              <>
                <p className="font-bold text-gray-900 mb-2">
                  {records.length} sales entries · {fileNames.length} customer names · {money(records.reduce((s, r) => s + r.amount, 0))}
                  {skippedRows > 0 && <span className="text-yellow-700"> · {skippedRows} rows skipped (no month or amount)</span>}
                </p>
                <div className="space-y-1 text-gray-600">
                  {records.slice(0, 4).map((r, i) => (
                    <p key={i} className="truncate">{r.name} · {periodLabel(r.period)} · {money(r.amount)}</p>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-gray-500">Pick the columns above to see a preview.</p>
            )}
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="flex-1 bg-white border border-gray-300 text-gray-700 px-6 py-4 rounded-lg font-bold">Back</button>
            <button type="button" disabled={!mappingReady} onClick={goToMatching}
              className="flex-[2] bg-blue-600 text-white px-6 py-4 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
              Next: Match branches
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gray-50 space-y-3">
            <p className="text-sm text-gray-700">
              Match each name in <b>{vendorName}</b>&apos;s file to one of our accounts. Saved matches are filled in automatically next time.
            </p>
            <div className="flex flex-wrap gap-4 items-center text-sm">
              <span className={`font-bold ${unmatchedCount ? 'text-red-700' : 'text-green-700'}`}>
                {unmatchedCount ? `${unmatchedCount} still need a match` : '✓ Every name is matched or skipped'}
              </span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={onlyUnmatched} onChange={e => setOnlyUnmatched(e.target.checked)} />
                Show only names that need attention
              </label>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {fileNames
              .filter(n => !onlyUnmatched || ['none', 'suggested'].includes(matches[n.key]?.how) || !matches[n.key]?.accountId)
              .map(n => {
                const m = matches[n.key] || { accountId: '', how: 'none' };
                const tag =
                  m.how === 'saved' ? ['Saved match', 'bg-green-100 text-green-800'] :
                  m.how === 'exact' ? ['Exact name', 'bg-green-100 text-green-800'] :
                  m.how === 'suggested' ? ['Best guess: check it', 'bg-yellow-100 text-yellow-800'] :
                  m.how === 'manual' ? ['Set by you', 'bg-blue-100 text-blue-800'] :
                  ['No match', 'bg-red-100 text-red-700'];
                return (
                  <div key={n.key} className="p-4 md:px-6 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="md:w-2/5 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{n.raw}</p>
                      <p className="text-xs text-gray-500">
                        {money(n.total)}{n.state ? ` · ${n.state}` : ''} · <span className={`font-bold px-1.5 py-0.5 rounded ${tag[1]}`}>{tag[0]}</span>
                      </p>
                    </div>
                    <select value={m.accountId} onChange={e => setMatch(n.key, e.target.value)}
                      className={`md:flex-1 border rounded-lg px-3 py-2.5 text-sm bg-white ${!m.accountId ? 'border-red-300' : 'border-gray-300'}`}>
                      <option value="">Choose account...</option>
                      <option value={SKIP}>⊘ Skip (not one of our accounts)</option>
                      {accountGroups.map(([group, accs]) => (
                        <optgroup key={group} label={group}>
                          {accs.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                );
              })}
          </div>

          <div className="p-6 border-t border-gray-200 space-y-4">
            <p className="text-xs text-gray-500">Missing a branch? <Link href="/accounts/new" target="_blank" className="text-blue-600 underline font-bold">Add it in a new tab</Link>, then come back and reload the matches.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(2)} className="flex-1 bg-white border border-gray-300 text-gray-700 px-6 py-4 rounded-lg font-bold">Back</button>
              <button type="button" onClick={async () => {
                  const { data } = await supabase.from('accounts').select('id, name, territory, is_parent').order('name');
                  if (data) setAccounts(data);
                }}
                className="flex-1 bg-white border border-gray-300 text-gray-700 px-6 py-4 rounded-lg font-bold">Reload accounts</button>
              <button type="button" onClick={() => setStep(4)}
                className="flex-[2] bg-blue-600 text-white px-6 py-4 rounded-lg font-bold hover:bg-blue-700">
                Next: Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              ['Line', vendorName],
              ['Type', source === 'pos' ? 'POS' : 'Commission'],
              ['Importing', money(summary.matched)],
              ['Branches', String(summary.branches)],
            ].map(([k, v]) => (
              <div key={k} className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase">{k}</p>
                <p className="text-lg font-black text-gray-900 truncate">{v}</p>
              </div>
            ))}
          </div>

          {(summary.skipped !== 0 || unmatchedCount > 0) && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm font-medium rounded-xl p-4">
              {money(summary.skipped)} won&apos;t be imported because it&apos;s skipped or unmatched
              {unmatchedCount > 0 && <> ({unmatchedCount} name{unmatchedCount === 1 ? '' : 's'} not matched)</>}.
            </div>
          )}

          <div>
            <p className="text-sm font-bold text-gray-700 mb-2">By month</p>
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl">
              {summary.byMonth.map(([p, amt]) => (
                <div key={p} className="flex justify-between px-4 py-2 text-sm">
                  <span className="text-gray-700">{periodLabel(p)}</span>
                  <span className="font-bold text-gray-900">{money(amt)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              If {vendorName} {source === 'pos' ? 'POS' : 'commission'} numbers already exist for a branch and month, they&apos;ll be replaced by this file.
            </p>
          </div>

          <label className="flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer">
            <input type="checkbox" checked={rememberMatches} onChange={e => setRememberMatches(e.target.checked)} className="w-5 h-5" />
            Remember these branch matches for future {vendorName} files
          </label>

          {importError && <p className="text-sm font-bold text-red-700">{importError}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(3)} className="flex-1 bg-white border border-gray-300 text-gray-700 px-6 py-4 rounded-lg font-bold">Back</button>
            <button type="button" disabled={isImporting || summary.branches === 0} onClick={runImport}
              className="flex-[2] bg-blue-600 text-white px-6 py-4 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
              {isImporting ? 'Importing...' : `Import ${money(summary.matched)}`}
            </button>
          </div>
        </div>
      )}

      {/* DONE */}
      {step === 5 && result && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center space-y-4">
          <p className="text-4xl">✅</p>
          <h2 className="text-2xl font-black text-gray-900">Imported {money(result.total)}</h2>
          <p className="text-gray-600">{vendorName} · {result.branches} branches · {result.months} month{result.months === 1 ? '' : 's'}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/imports" className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-bold">View import history</Link>
            <button type="button" onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">Import another file</button>
          </div>
        </div>
      )}
    </div>
  );
}
