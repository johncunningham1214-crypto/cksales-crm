"use client";

// Team Notes: every visit someone chose to share, searchable by
// company, line, state and keyword.

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { VENDORS, TERRITORIES } from '@/lib/constants';

export default function TeamNotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [company, setCompany] = useState('All');
  const [line, setLine] = useState('All');
  const [state, setState] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Opened from an account's "See all →" link: ?company=<parent id>
    const fromLink = new URLSearchParams(window.location.search).get('company');

    Promise.all([
      supabase
        .from('calls')
        .select('id, date, rep_name, type, notes, vendors, share_headline, shared_at, account_id, accounts(name, territory, parent_id)')
        .eq('shared', true)
        .order('shared_at', { ascending: false })
        .limit(300),
      supabase.from('accounts').select('id, name').eq('is_parent', true).order('name'),
    ]).then(([notesRes, companiesRes]) => {
      setNotes(notesRes.data || []);
      setCompanies(companiesRes.data || []);
      if (fromLink) setCompany(fromLink);
      setIsLoading(false);
    });
  }, []);

  const companyName = (id: any) => companies.find(c => String(c.id) === String(id))?.name;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter(n => {
      const acc = n.accounts || {};
      // A note belongs to a company if it was logged at the company or at one of its branches
      const noteCompany = acc.parent_id ?? n.account_id;
      if (company !== 'All' && String(noteCompany) !== company) return false;
      if (line !== 'All' && !(n.vendors || []).includes(line)) return false;
      if (state !== 'All' && acc.territory !== state) return false;
      if (q) {
        const hay = [n.share_headline, n.notes, n.rep_name, acc.name, companyName(acc.parent_id), ...(n.vendors || [])]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, company, line, state, search, companies]);

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading team notes...</div>;

  const select = "border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 outline-none";

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Team Notes</h1>
        <p className="text-gray-500 mt-2 font-medium">
          Visits the team shared: what worked, what to watch for. To share one, tick &quot;Share with the team&quot; when you log a visit.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm space-y-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search: counter day, Inficon, buyer, URI..."
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select value={company} onChange={e => setCompany(e.target.value)} className={select}>
            <option value="All">All companies</option>
            {companies.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>
          <select value={line} onChange={e => setLine(e.target.value)} className={select}>
            <option value="All">All lines</option>
            {VENDORS.filter(v => v !== 'Other').map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={state} onChange={e => setState(e.target.value)} className={select}>
            <option value="All">All states</option>
            {TERRITORIES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <p className="text-sm text-gray-500 font-medium">{filtered.length} note{filtered.length === 1 ? '' : 's'}</p>

      <div className="space-y-4">
        {filtered.length > 0 ? filtered.map(n => {
          const acc = n.accounts || {};
          const parent = companyName(acc.parent_id);
          return (
            <div key={n.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              {n.share_headline && <p className="font-bold text-gray-900 text-lg leading-snug">{n.share_headline}</p>}
              {n.notes && <p className={`text-gray-700 whitespace-pre-wrap ${n.share_headline ? 'mt-1.5 text-sm' : ''}`}>{n.notes}</p>}
              {n.vendors?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {n.vendors.map((v: string) => (
                    <button key={v} type="button" onClick={() => setLine(v)}
                      className="bg-gray-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase hover:bg-gray-700">{v}</button>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-3">
                <b className="text-gray-700">{n.rep_name || 'Team'}</b> · {n.type} at{' '}
                <Link href={`/accounts/${n.account_id}`} className="text-blue-600 font-bold">{acc.name || 'a branch'}</Link>
                {acc.territory ? ` (${acc.territory})` : ''}
                {parent && <> · <button type="button" onClick={() => setCompany(String(acc.parent_id))} className="font-bold text-gray-700 hover:underline">{parent}</button></>}
                {' · '}{n.date}
              </p>
            </div>
          );
        }) : (
          <div className="p-12 text-center text-gray-500 bg-white border border-gray-200 rounded-2xl">
            {notes.length === 0 ? 'Nothing shared yet. Be the first: tick "Share with the team" on your next visit.' : 'No notes match these filters.'}
          </div>
        )}
      </div>
    </div>
  );
}
