"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SALES_TEAM, VENDORS } from '@/lib/constants'; // NEW: Imported Vendors
import Link from 'next/link';

export default function CallReport() {
  const [calls, setCalls] = useState<any[]>([]);
  const [accountsList, setAccountsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const [startDate, setStartDate] = useState(lastWeek.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  const [selectedRep, setSelectedRep] = useState('All');
  const [selectedAccount, setSelectedAccount] = useState('All');
  const [selectedVendor, setSelectedVendor] = useState('All'); // NEW: Vendor Filter State

  useEffect(() => {
    async function fetchAccounts() {
      const { data } = await supabase.from('accounts').select('id, name').order('name');
      if (data) setAccountsList(data);
    }
    fetchAccounts();
  }, []);

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, selectedRep, selectedAccount, selectedVendor]);

  async function fetchReport() {
    setIsLoading(true);

    let accountIdsToQuery: string[] = [];

    // If an account is selected, find it AND all of its child branches
    if (selectedAccount !== 'All') {
      accountIdsToQuery.push(selectedAccount);
      
      const { data: children } = await supabase
        .from('accounts')
        .select('id')
        .eq('parent_id', selectedAccount);
        
      if (children) {
        children.forEach(child => accountIdsToQuery.push(child.id));
      }
    }

    let query = supabase
      .from('calls')
      .select('*, accounts(name)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (selectedRep !== 'All') {
      query = query.eq('rep_name', selectedRep);
    }

    // NEW: Apply Vendor Array Filter
    if (selectedVendor !== 'All') {
      query = query.contains('vendors', [selectedVendor]);
    }

    if (accountIdsToQuery.length > 0) {
      query = query.in('account_id', accountIdsToQuery);
    }

    const { data, error } = await query;

    if (data) setCalls(data);
    if (error) console.error("Error fetching report:", error);
    
    setIsLoading(false);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="print:hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Call Report Generator</h1>
          <p className="text-gray-500 mt-2 font-medium">Filter, export, and analyze field activity.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/" className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-bold hover:bg-gray-50 transition-colors shadow-sm">
            Back to Dashboard
          </Link>
          <button 
            onClick={() => window.print()}
            className="bg-gray-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors shadow-sm flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="print:hidden bg-white border border-gray-200 rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Start Date</label>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">End Date</label>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Sales Rep</label>
          <select 
            value={selectedRep}
            onChange={(e) => setSelectedRep(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
          >
            <option value="All">Entire Team</option>
            {SALES_TEAM.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        
        {/* NEW: Vendor Filter */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Vendor / Mfr</label>
          <select 
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
          >
            <option value="All">All Vendors</option>
            {VENDORS.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Distributor Hub</label>
          <select 
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
          >
            <option value="All">All Accounts</option>
            {accountsList.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Printable Report Title */}
      <div className="hidden print:block mb-8 border-b-2 border-gray-900 pb-4">
        <h1 className="text-3xl font-black text-gray-900">CK Sales - Activity Report</h1>
        <div className="text-gray-600 font-medium mt-1 flex flex-wrap gap-x-4 gap-y-1">
          <span>{startDate} to {endDate}</span>
          <span>| Rep: {selectedRep}</span>
          {selectedVendor !== 'All' && <span>| Vendor: {selectedVendor}</span>}
        </div>
      </div>

      {/* Results */}
      <div className="bg-white border print:border-none border-gray-200 rounded-2xl shadow-sm print:shadow-none overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 print:bg-white flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">
            {isLoading ? 'Generating...' : `${calls.length} Calls Logged`}
          </h2>
        </div>

        {calls.length > 0 ? (
          <div className="divide-y divide-gray-200 print:divide-gray-300">
            {calls.map((call) => {
              const [year, month, day] = call.date.split('-');
              const formattedDate = new Date(Number(year), Number(month) - 1, Number(day))
                .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

              return (
                <div key={call.id} className="p-6 print:px-0 print:py-4 break-inside-avoid">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {call.accounts ? call.accounts.name : 'Internal / Unknown Account'}
                      </h3>
                      <div className="flex items-center flex-wrap gap-3 mt-1">
                        <span className="text-sm font-bold text-blue-600">{formattedDate}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-sm text-gray-600 font-medium">{call.rep_name}</span>
                        <span className="text-gray-300">•</span>
                        <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-0.5 rounded border border-gray-200">
                          {call.type}
                        </span>
                      </div>
                    </div>
                    
                    {/* NEW: Print-friendly Vendor Tags */}
                    {call.vendors && call.vendors.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 sm:justify-end shrink-0">
                        {call.vendors.map((vendor: string) => (
                          <span key={vendor} className="bg-gray-800 text-white print:bg-white print:text-gray-900 print:border print:border-gray-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                            {vendor}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <p className="text-gray-700 mt-3 text-sm leading-relaxed whitespace-pre-wrap max-w-4xl">
                    {call.notes || "No notes provided."}
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            {isLoading ? 'Searching...' : 'No activity logged for this criteria.'}
          </div>
        )}
      </div>
    </div>
  );
}
// --- END OF FILE ---