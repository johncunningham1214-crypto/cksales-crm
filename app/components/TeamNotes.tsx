"use client";

// Shared visits from the other branches of the same parent company.
// Used on the account page and the pre-call brief.

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type Props = {
  accountId: string;
  parentId?: string | null;  // this branch's parent company
  isParent?: boolean;        // true when viewing the parent company itself
  companyName?: string | null;
  limit?: number;
};

export default function TeamNotes({ accountId, parentId, isParent, companyName, limit = 5 }: Props) {
  const [notes, setNotes] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState<string | null>(companyName || null);

  useEffect(() => {
    const companyId = isParent ? accountId : parentId;
    if (!companyId) return;

    async function load() {
      if (!companyName) {
        const { data: c } = await supabase.from('accounts').select('name').eq('id', companyId).single();
        if (c) setName(c.name);
      }

      // Every branch of the company, plus the company record itself, minus this account
      const { data: branches } = await supabase.from('accounts').select('id').eq('parent_id', companyId);
      const ids = [companyId, ...(branches || []).map((b: any) => b.id)].filter(id => String(id) !== String(accountId));
      if (ids.length === 0) { setLoaded(true); return; }

      const { data } = await supabase
        .from('calls')
        .select('id, date, rep_name, type, notes, vendors, share_headline, shared_at, account_id, accounts(name, territory)')
        .eq('shared', true)
        .in('account_id', ids)
        .order('shared_at', { ascending: false })
        .limit(limit);
      setNotes(data || []);
      setLoaded(true);
    }
    load();
  }, [accountId, parentId, isParent, limit, companyName]);

  if (!loaded || notes.length === 0) return null;

  return (
    <div className="bg-white border border-amber-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-amber-100 bg-amber-50 flex justify-between items-center gap-3">
        <h2 className="font-bold text-gray-900">
          {isParent ? `Shared from ${name || 'its'} branches` : `What's worked at other ${name || 'sister'} branches`}
        </h2>
        <Link href={`/team${(isParent ? accountId : parentId) ? `?company=${isParent ? accountId : parentId}` : ''}`} className="text-xs font-bold text-amber-800 whitespace-nowrap">
          See all →
        </Link>
      </div>
      <div className="divide-y divide-gray-100">
        {notes.map(n => (
          <div key={n.id} className="px-5 py-4">
            {n.share_headline && <p className="font-bold text-gray-900 leading-snug">{n.share_headline}</p>}
            {n.notes && (
              <p className={`text-sm text-gray-600 ${n.share_headline ? 'mt-1' : ''}`}>
                {n.notes.length > 280 ? n.notes.slice(0, 280) + '…' : n.notes}
              </p>
            )}
            {n.vendors?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {n.vendors.map((v: string) => (
                  <span key={v} className="bg-gray-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">{v}</span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              <b className="text-gray-700">{n.rep_name || 'Team'}</b> at{' '}
              <Link href={`/accounts/${n.account_id}`} className="text-blue-600 font-bold">{n.accounts?.name || 'a branch'}</Link>
              {n.accounts?.territory ? ` (${n.accounts.territory})` : ''} · {n.date}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
