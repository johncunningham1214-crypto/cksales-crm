"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { SALES_TEAM, VENDORS } from '@/lib/constants';

export default function EditCall() {
  const router = useRouter();
  const params = useParams();
  const callId = params.id as string;

  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [date, setDate] = useState('');
  const [repName, setRepName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [type, setType] = useState('Field Visit');
  const [notes, setNotes] = useState('');
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);

  useEffect(() => {
    async function fetchData() {
      // 1. Fetch Accounts for the dropdown
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('id, name')
        .order('name');
        
      if (accountsData) setAccounts(accountsData);

      // 2. Fetch the specific call we are editing
      const { data: callData } = await supabase
        .from('calls')
        .select('*')
        .eq('id', callId)
        .single();

      if (callData) {
        setDate(callData.date || '');
        setRepName(callData.rep_name || '');
        setAccountId(callData.account_id || '');
        setType(callData.type || 'Field Visit');
        setNotes(callData.notes || '');
        setSelectedVendors(callData.vendors || []);
      }
      
      setIsLoading(false);
    }
    
    if (callId) fetchData();
  }, [callId]);

  const toggleVendor = (vendor: string) => {
    setSelectedVendors(prev => 
      prev.includes(vendor) 
        ? prev.filter(v => v !== vendor) 
        : [...prev, vendor]
    );
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const { error } = await supabase
      .from('calls')
      .update({
        date,
        rep_name: repName,
        account_id: accountId === "" ? null : accountId,
        type,
        notes,
        vendors: selectedVendors
      })
      .eq('id', callId);

    if (error) {
      console.error("Error updating call:", error);
      alert("Failed to update visit: " + error.message);
      setIsSaving(false);
    } else {
      // Send them back to the previous page
      router.back();
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this visit record? This cannot be undone.")) return;
    
    const { error } = await supabase.from('calls').delete().eq('id', callId);
    if (error) {
      alert("Failed to delete: " + error.message);
    } else {
      router.push('/'); // Send to dashboard on delete
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading visit details...</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-gray-900">Edit Field Visit</h1>
        <div className="flex items-center gap-4">
          <button onClick={handleDelete} className="text-red-600 font-bold hover:text-red-800 text-sm">
            Delete Call
          </button>
          <button onClick={() => router.back()} className="text-blue-600 font-bold hover:underline">
            Cancel
          </button>
        </div>
      </div>

      <form onSubmit={handleUpdate} className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        <div className="pt-4 border-t border-gray-100">
          <button 
            type="submit"
            disabled={isSaving}
            className="w-full bg-blue-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Updating Visit...' : 'Save Updates'}
          </button>
        </div>
      </form>
    </div>
  );
}
// --- END OF FILE ---