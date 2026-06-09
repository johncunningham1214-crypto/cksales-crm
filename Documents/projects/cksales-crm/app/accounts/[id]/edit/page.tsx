"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { TERRITORIES, SALES_TEAM } from '@/lib/constants'; // NEW: Added SALES_TEAM

export default function EditAccount() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.id;

  // Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [territory, setTerritory] = useState('');
  const [status, setStatus] = useState('Active');
  const [parentId, setParentId] = useState('');
  const [assignedReps, setAssignedReps] = useState<string[]>([]); // NEW: Array for reps
  
  const [availableParents, setAvailableParents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const { data: accountData } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (accountData) {
        setName(accountData.name || '');
        setAddress(accountData.address || '');
        setPhone(accountData.phone || '');
        setTerritory(accountData.territory || '');
        setStatus(accountData.status || 'Active');
        setParentId(accountData.parent_id || '');
        setAssignedReps(accountData.assigned_reps || []); // Load existing reps
      }

      const { data: parentsData } = await supabase
        .from('accounts')
        .select('id, name')
        .neq('id', accountId)
        .order('name');

      if (parentsData) setAvailableParents(parentsData);
      
      setIsLoading(false);
    }

    if (accountId) fetchData();
  }, [accountId]);

  // NEW: Handle checkbox clicks
  const toggleRep = (repName: string) => {
    setAssignedReps(prev => 
      prev.includes(repName) 
        ? prev.filter(r => r !== repName) // Remove if already checked
        : [...prev, repName]              // Add if not checked
    );
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const { error } = await supabase
      .from('accounts')
      .update({
        name,
        address,
        phone,
        territory,
        status,
        parent_id: parentId === "" ? null : parentId,
        assigned_reps: assignedReps // Save the array to the database
      })
      .eq('id', accountId);

    if (error) {
      console.error("Error updating account:", error);
      alert("Failed to update account: " + error.message);
      setIsSaving(false);
    } else {
      router.push(`/accounts/${accountId}`);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading account details...</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-gray-900">Edit Account</h1>
        <Link href={`/accounts/${accountId}`} className="text-blue-600 font-bold hover:underline">
          Cancel
        </Link>
      </div>

      <form onSubmit={handleUpdate} className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm space-y-6">
        
        {/* Name */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Account / Branch Name *</label>
          <input 
            type="text" 
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none"
          />
        </div>

        {/* Parent Account */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Parent Distributor (Optional)</label>
          <select 
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
          >
            <option value="">-- No Parent (Independent / Main Hub) --</option>
            {availableParents.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>

        {/* NEW: Assigned Reps Checkboxes */}
        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
          <label className="block text-sm font-bold text-gray-900 mb-3">Assigned Salesmen</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SALES_TEAM.map(rep => (
              <label key={rep} className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox"
                  checked={assignedReps.includes(rep)}
                  onChange={() => toggleRep(rep)}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-600 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{rep}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Full Address</label>
          <input 
            type="text" 
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Phone */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Main Phone</label>
            <input 
              type="text" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none"
            />
          </div>

          {/* Territory */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Territory (State)</label>
            <select 
              value={territory}
              onChange={(e) => setTerritory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
            >
              <option value="" disabled>Select state...</option>
              {TERRITORIES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Account Status</label>
          <select 
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Prospect">Prospect</option>
          </select>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button 
            type="submit"
            disabled={isSaving}
            className="w-full bg-blue-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving Changes...' : 'Save Account Updates'}
          </button>
        </div>
      </form>
    </div>
  );
}