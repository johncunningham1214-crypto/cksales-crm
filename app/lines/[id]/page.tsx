"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { TERRITORIES } from '@/lib/constants';

type StateCoverage = { coverage: 'full' | 'partial'; notes: string };

export default function LineDetail() {
  const params = useParams();
  const router = useRouter();
  const lineId = params.id as string;

  const [line, setLine] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [coverage, setCoverage] = useState<Record<string, StateCoverage>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Line details (whole team sees these)
  const [factoryContact, setFactoryContact] = useState('');
  const [factoryEmail, setFactoryEmail] = useState('');
  const [factoryPhone, setFactoryPhone] = useState('');
  const [annualGoal, setAnnualGoal] = useState('');
  const [focusProducts, setFocusProducts] = useState('');

  // Rep agreement terms (admins only; the database won't return them to anyone else)
  const [commissionRate, setCommissionRate] = useState('');
  const [agreementStart, setAgreementStart] = useState('');
  const [agreementRenewal, setAgreementRenewal] = useState('');
  const [termsNotes, setTermsNotes] = useState('');

  useEffect(() => {
    async function load() {
      const [{ data: vendorRows }, { data: covRows }, { data: admin }, { data: agreementRows }] = await Promise.all([
        supabase.from('vendors').select('*').eq('id', lineId),
        supabase.from('line_coverage').select('state, coverage, notes').eq('vendor_id', lineId),
        supabase.rpc('is_admin'),
        supabase.from('line_agreements').select('*').eq('vendor_id', lineId),
      ]);

      const v = vendorRows?.[0];
      if (v) {
        setLine(v);
        setFactoryContact(v.factory_contact || '');
        setFactoryEmail(v.factory_email || '');
        setFactoryPhone(v.factory_phone || '');
        setAnnualGoal(v.annual_goal?.toString() || '');
        setFocusProducts(v.focus_products || '');
      }

      setIsAdmin(admin === true);
      const a = agreementRows?.[0];
      if (a) {
        setCommissionRate(a.commission_rate?.toString() || '');
        setAgreementStart(a.agreement_start || '');
        setAgreementRenewal(a.agreement_renewal || '');
        setTermsNotes(a.terms_notes || '');
      }

      const map: Record<string, StateCoverage> = {};
      (covRows || []).forEach((r: any) => { map[r.state] = { coverage: r.coverage, notes: r.notes || '' }; });
      setCoverage(map);
      setIsLoading(false);
    }
    if (lineId) load();
  }, [lineId]);

  // Tap a state: not ours → full → partial → not ours
  const cycleState = (st: string) => {
    setCoverage(prev => {
      const next = { ...prev };
      const cur = prev[st];
      if (!cur) next[st] = { coverage: 'full', notes: '' };
      else if (cur.coverage === 'full') next[st] = { coverage: 'partial', notes: cur.notes };
      else delete next[st];
      return next;
    });
  };

  const setAll = (on: boolean) => {
    if (!on) return setCoverage({});
    const map: Record<string, StateCoverage> = {};
    TERRITORIES.forEach(st => { map[st] = { coverage: 'full', notes: '' }; });
    setCoverage(map);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');

    const toNum = (s: string) => (s.trim() === '' ? null : Number(s));

    const { error: vErr } = await supabase
      .from('vendors')
      .update({
        factory_contact: factoryContact || null,
        factory_email: factoryEmail || null,
        factory_phone: factoryPhone || null,
        annual_goal: toNum(annualGoal),
        focus_products: focusProducts || null,
      })
      .eq('id', lineId);

    let aErr = null;
    if (isAdmin) {
      ({ error: aErr } = await supabase.from('line_agreements').upsert({
        vendor_id: lineId,
        commission_rate: toNum(commissionRate),
        agreement_start: agreementStart || null,
        agreement_renewal: agreementRenewal || null,
        terms_notes: termsNotes || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'vendor_id' }));
    }

    // Replace this line's coverage with what's on screen
    const { error: dErr } = await supabase.from('line_coverage').delete().eq('vendor_id', lineId);
    const rows = Object.entries(coverage).map(([state, c]) => ({
      vendor_id: lineId,
      state,
      coverage: c.coverage,
      notes: c.coverage === 'partial' ? (c.notes || null) : null,
    }));
    const { error: iErr } = rows.length ? await supabase.from('line_coverage').insert(rows) : { error: null };

    const err = vErr || aErr || dErr || iErr;
    if (err) {
      setMessage('Save failed: ' + err.message);
    } else {
      setMessage('Saved ✓');
      router.refresh();
    }
    setIsSaving(false);
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading line...</div>;
  if (!line) return <div className="p-8 text-center text-red-500">Line not found.</div>;

  const partialStates = TERRITORIES.filter(st => coverage[st]?.coverage === 'partial');
  const input = "w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none";

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8">
      <Link href="/lines" className="text-blue-600 hover:underline font-medium text-sm">← Back to Lines</Link>
      <h1 className="text-3xl font-black text-gray-900">{line.name}</h1>

      {/* TERRITORY COVERAGE */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Where we rep this line</h2>
            <p className="text-sm text-gray-500">Tap a state: <b>Full</b> → <b>Partial</b> → not ours.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setAll(true)} className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">All states</button>
            <button type="button" onClick={() => setAll(false)} className="text-sm font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">Clear</button>
          </div>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {TERRITORIES.map(st => {
            const c = coverage[st];
            const style = !c
              ? 'bg-white text-gray-400 border-gray-200'
              : c.coverage === 'full'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-blue-100 text-blue-800 border-blue-300';
            return (
              <button
                key={st}
                type="button"
                onClick={() => cycleState(st)}
                className={`border-2 rounded-xl py-3 font-black text-sm transition-colors ${style}`}
              >
                {st}
                <span className="block text-[10px] font-bold uppercase tracking-wide mt-0.5">
                  {!c ? '—' : c.coverage === 'full' ? 'Full' : 'Partial'}
                </span>
              </button>
            );
          })}
        </div>

        {partialStates.length > 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-sm font-bold text-gray-700">Which part of the state is ours?</p>
            {partialStates.map(st => (
              <div key={st} className="flex items-center gap-3">
                <span className="w-10 font-black text-blue-800">{st}</span>
                <input
                  type="text"
                  value={coverage[st].notes}
                  onChange={(e) => setCoverage(prev => ({ ...prev, [st]: { ...prev[st], notes: e.target.value } }))}
                  placeholder="e.g. Upstate only — north of Westchester"
                  className={input}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LINE DETAILS — whole team */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-5">
        <h2 className="text-lg font-bold text-gray-900">Line details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Factory contact</label>
            <input type="text" value={factoryContact} onChange={e => setFactoryContact(e.target.value)} className={input} />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
            <input type="email" value={factoryEmail} onChange={e => setFactoryEmail(e.target.value)} className={input} />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Phone</label>
            <input type="tel" value={factoryPhone} onChange={e => setFactoryPhone(e.target.value)} className={input} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Annual sales goal ($)</label>
          <input type="number" step="1" value={annualGoal} onChange={e => setAnnualGoal(e.target.value)} className={input} />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Focus products this year</label>
          <textarea rows={2} value={focusProducts} onChange={e => setFocusProducts(e.target.value)} className={input} placeholder="SKUs or product families the factory wants pushed" />
        </div>
      </div>

      {/* REP AGREEMENT — admins only */}
      {isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">🔒 Rep agreement</h2>
            <p className="text-sm text-amber-800">Only admins can see this section.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Commission rate (%)</label>
              <input type="number" step="0.01" value={commissionRate} onChange={e => setCommissionRate(e.target.value)} className={input + ' bg-white'} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Agreement start</label>
              <input type="date" value={agreementStart} onChange={e => setAgreementStart(e.target.value)} className={input + ' bg-white'} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Renewal date</label>
              <input type="date" value={agreementRenewal} onChange={e => setAgreementRenewal(e.target.value)} className={input + ' bg-white'} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Agreement terms</label>
            <textarea rows={3} value={termsNotes} onChange={e => setTermsNotes(e.target.value)} className={input + ' bg-white'} placeholder="House accounts, termination terms, split-territory details..." />
          </div>
        </div>
      )}

      <div className="sticky bottom-4 space-y-2">
        {message && (
          <p className={`text-center text-sm font-bold ${message.startsWith('Saved') ? 'text-green-700' : 'text-red-700'}`}>{message}</p>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-blue-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-lg"
        >
          {isSaving ? 'Saving...' : 'Save Line'}
        </button>
      </div>
    </div>
  );
}
