"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SALES_TEAM, VENDORS } from '@/lib/constants'; 

export default function LogCall() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAccountId = searchParams.get('accountId');

  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [repName, setRepName] = useState('');
  const [accountId, setAccountId] = useState(preselectedAccountId || '');
  const [type, setType] = useState('Field Visit');
  const [notes, setNotes] = useState('');
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]); // NEW: Track tagged vendors

  useEffect(() => {
    async function fetchAccounts() {
      const { data } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('status', 'Active')
        .order('name');
        
      if (data) setAccounts(data);
      setIsLoading(false);
    }
    fetchAccounts();
  }, []);

  // NEW: Handle vendor checkbox toggles
  const toggleVendor = (vendor: string) => {
    setSelectedVendors(prev => 
      prev.includes(vendor) 
        ? prev.filter(v => v !== vendor) 
        : [...prev, vendor]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const { error } = await supabase
      .from('calls')
      .insert([{
        date,
        rep_name: repName,
        account_id: accountId === "" ? null : accountId,
        type,
        notes,
        vendors: selectedVendors // NEW: Save the tags to the database
      }]);

    if (error) {
      console.error("Error logging call:", error);
      alert("Failed to log visit: " + error.message);
      setIsSaving(false);
    } else {
      // If we came from an account profile, send them back there. Otherwise, go to dashboard.
      if (preselectedAccountId) {
        router.push(`/accounts/${preselectedAccountId}`);
      } else {
        router.push('/');
      }
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading accounts...</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-gray-900">Log Field Visit</h1>
        <button onClick={() => router.back()} className="text-blue-600 font-bold hover:underline">
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Date of Visit *</label>
            <input 
              type="date" 
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none"
            />
          </div>

          {/* Rep Name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Salesman *</label>
            <select 
              required
              value={repName}
              onChange={(e) => setRepName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
            >
              <option value="" disabled>Select rep...</option>
              {SALES_TEAM.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Account Location */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Account / Branch Location *</label>
          <select 
            required
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
          >
            <option value="" disabled>Select account...</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>

        {/* Visit Type */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Type of Visit *</label>
          <select 
            required
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
          >
            <option value="Field Visit">Standard Field Visit</option>
            <option value="Lunch & Learn">Lunch & Learn</option>
            <option value="Counter Day">Counter Day</option>
            <option value="Product Training">Product Training</option>
            <option value="Issue Resolution">Issue / Warranty Resolution</option>
            <option value="Cold Call">Cold Call / Prospecting</option>
          </select>
        </div>

        {/* NEW: Vendor Tags Grid */}
        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
          <label className="block text-sm font-bold text-gray-900 mb-3">Vendors Discussed / Pitched</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {VENDORS.map(vendor => (
              <label key={vendor} className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox"
                  checked={selectedVendors.includes(vendor)}
                  onChange={() => toggleVendor(vendor)}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-600 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{vendor}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Visit Notes & Action Items</label>
          <textarea 
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Summarize the meeting, who you spoke with, and any follow-up needed..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none resize-y"
          ></textarea>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-gray-100">
          <button 
            type="submit"
            disabled={isSaving}
            className="w-full bg-blue-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Logging Visit...' : 'Log Field Visit'}
          </button>
        </div>
      </form>
    </div>
  );
}
// --- END OF FILE ---