"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TERRITORIES } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { fetchLines, fetchCoverage, CoverageRow } from '@/lib/lines';

export default function LinesPage() {
  const [lines, setLines] = useState<any[]>([]);
  const [coverage, setCoverage] = useState<CoverageRow[]>([]);
  const [renewals, setRenewals] = useState<Record<string, string>>({}); // admins only: RLS returns nothing to others
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [l, c, { data: agreements }] = await Promise.all([
        fetchLines(),
        fetchCoverage(),
        supabase.from('line_agreements').select('vendor_id, agreement_renewal'),
      ]);
      setLines(l);
      setCoverage(c);
      const r: Record<string, string> = {};
      (agreements || []).forEach((a: any) => { if (a.agreement_renewal) r[String(a.vendor_id)] = a.agreement_renewal; });
      setRenewals(r);
      setIsLoading(false);
    }
    load();
  }, []);

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading lines...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Our Lines</h1>
        <p className="text-gray-500 mt-2 font-medium">
          The {lines.length} manufacturers we represent and where we rep each one. Tap a line to set its territory and agreement details.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {lines.map(line => {
          const rows = coverage.filter(r => String(r.vendor_id) === String(line.id));
          const full = rows.filter(r => r.coverage === 'full').length;
          const partial = rows.filter(r => r.coverage === 'partial').length;

          return (
            <Link
              key={line.id}
              href={`/lines/${line.id}`}
              className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-blue-500 hover:shadow-md transition-all group block"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{line.name}</h3>
                <span className="text-gray-400 group-hover:text-blue-600 transition-colors text-xl">→</span>
              </div>

              {rows.length === 0 ? (
                <span className="inline-block bg-yellow-50 text-yellow-800 border border-yellow-200 text-xs font-bold px-2.5 py-1 rounded">
                  ⚠ Territory not set up yet
                </span>
              ) : (
                <>
                  <p className="text-sm text-gray-600 font-medium mb-3">
                    {full === TERRITORIES.length ? 'Entire territory' : `${full} full state${full === 1 ? '' : 's'}`}
                    {partial > 0 && ` · ${partial} partial`}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {TERRITORIES.map(st => {
                      const row = rows.find(r => r.state === st);
                      const style = !row
                        ? 'bg-gray-50 text-gray-300'
                        : row.coverage === 'full'
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 text-blue-800';
                      return (
                        <span key={st} className={`text-[10px] font-bold w-7 text-center py-0.5 rounded ${style}`}>{st}</span>
                      );
                    })}
                  </div>
                </>
              )}

              {renewals[String(line.id)] && (
                <p className="text-xs text-amber-700 mt-3">🔒 Agreement renews {renewals[String(line.id)]}</p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
