"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { fetchLines } from '@/lib/lines';
import { periodLabel } from '@/lib/importer';

const money = (n: number | null) =>
  n == null ? '—' : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function ImportHistory() {
  const [imports, setImports] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchAll = () => Promise.all([
    supabase.from('sales_imports').select('*, vendors(name)').order('created_at', { ascending: false }),
    fetchLines(),
  ]);

  async function load() {
    const [{ data }, l] = await fetchAll();
    setImports(data || []);
    setLines(l);
    setIsLoading(false);
  }

  useEffect(() => {
    fetchAll().then(([{ data }, l]) => {
      setImports(data || []);
      setLines(l);
      setIsLoading(false);
    });
  }, []);

  async function undoImport(imp: any) {
    if (!confirm(`Remove this ${imp.vendors?.name || ''} import and all ${money(imp.total_amount)} of sales it added? This cannot be undone.`)) return;
    setDeletingId(imp.id);
    const { error } = await supabase.from('sales_imports').delete().eq('id', imp.id);
    if (error) alert('Could not remove import: ' + error.message);
    await load();
    setDeletingId(null);
  }

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading imports...</div>;

  // Latest month of data we hold for each line, by source
  const latest = (vendorId: any, source: string) =>
    imports
      .filter(i => String(i.vendor_id) === String(vendorId) && i.source === source && i.period_end)
      .map(i => i.period_end as string)
      .sort()
      .pop();

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Sales Data</h1>
          <p className="text-gray-500 mt-2 font-medium">POS reports and commission statements imported into the CRM.</p>
        </div>
        <Link href="/imports/new" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 shadow-sm">
          + Import a File
        </Link>
      </div>

      {/* What we have, line by line */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Data on file by line</h2>
          <p className="text-sm text-gray-500">Latest month we have from each principal.</p>
        </div>
        <div className="divide-y divide-gray-100">
          {lines.map(line => {
            const pos = latest(line.id, 'pos');
            const comm = latest(line.id, 'commission');
            return (
              <div key={line.id} className="px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="font-bold text-gray-900 text-sm">{line.name}</p>
                <div className="flex gap-2 text-xs font-bold">
                  <span className={`px-2.5 py-1 rounded ${pos ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>
                    POS: {pos ? periodLabel(pos) : 'none'}
                  </span>
                  <span className={`px-2.5 py-1 rounded ${comm ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-400'}`}>
                    Commission: {comm ? periodLabel(comm) : 'none'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Import log */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Import history</h2>
        </div>
        {imports.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No files imported yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {imports.map(imp => (
              <div key={imp.id} className="p-4 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900">
                    {imp.vendors?.name || 'Unknown line'}{' '}
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${imp.source === 'pos' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                      {imp.source === 'pos' ? 'POS' : 'Commission'}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {imp.period_start ? periodLabel(imp.period_start) : '?'}
                    {imp.period_end && imp.period_end !== imp.period_start ? ` – ${periodLabel(imp.period_end)}` : ''}
                    {' · '}{money(imp.total_amount)}
                    {Number(imp.skipped_amount) ? ` (${money(imp.skipped_amount)} skipped)` : ''}
                    {' · '}{imp.file_name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(imp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {imp.imported_by ? ` by ${imp.imported_by}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => undoImport(imp)}
                  disabled={deletingId === imp.id}
                  className="shrink-0 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg disabled:opacity-50"
                >
                  {deletingId === imp.id ? 'Removing...' : 'Undo import'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
