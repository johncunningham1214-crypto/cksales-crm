"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TERRITORIES, SALES_TEAM } from '@/lib/constants';

export default function NewAccount() {
  const router = useRouter();

  // Basic Info
  const [name, setName] = useState('');
  const [territory, setTerritory] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [status] = useState('Active');
  const [isContractor, setIsContractor] = useState(false);
  const [assignedReps, setAssignedReps] = useState<string[]>([]);

  // Hierarchy Info
  const [isParent, setIsParent] = useState(false);
  const [parentId, setParentId] = useState('');
  const [majorAccounts, setMajorAccounts] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchParents() {
      const { data } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('is_parent', true)
        .order('name');
      if (data) setMajorAccounts(data);
    }
    fetchParents();
  }, []);

  const toggleRep = (rep: string) => {
    setAssignedReps(prev => prev.includes(rep) ? prev.filter(r => r !== rep) : [...prev, rep]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const { data, error } = await supabase
      .from('accounts')
      .insert([{
        name,
        territory: territory || null,
        address: address || null,
        phone,
        status,
        is_parent: isParent,
        parent_id: isParent ? null : (parentId || null),
        is_contractor: isContractor,
        assigned_reps: assignedReps,
      }])
      .select('id');

    if (error) {
      console.error("Error adding account:", error.message);
      alert("Failed to add account: " + error.message);
      setIsSaving(false);
    } else {
      // Go straight to the new branch so the rep can check off our lines
      const newId = data?.[0]?.id;
      router.push(newId ? `/accounts/${newId}` : '/accounts');
      router.refresh();
    }
  };

  const input = "w-full border border-gray-300 rounded-lg p-3 bg-white";

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href="/accounts" className="text-blue-600 hover:underline font-medium text-sm">
          ← Back to Accounts
        </Link>
        <h1 className="text-3xl font-black text-gray-900 mt-4">New Account</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">

        {/* --- HIERARCHY TOGGLE --- */}
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isParent}
              onChange={(e) => {
                setIsParent(e.target.checked);
                if (e.target.checked) setParentId('');
              }}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
            />
            <span className="ml-3 font-bold text-blue-900">
              This is a Major Parent Account (e.g., Johnstone Supply, URI)
            </span>
          </label>
          <p className="ml-8 mt-1 text-sm text-blue-700">
            Check this box if this is the main corporate entity. Leave it unchecked if this is a specific branch location.
          </p>
        </div>

        {/* --- PARENT DROPDOWN --- */}
        {!isParent && (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Belongs to Major Account (Optional)</label>
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={input}>
              <option value="">-- Standalone Account (No Parent) --</option>
              {majorAccounts.map(parent => (
                <option key={parent.id} value={parent.id}>{parent.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            {isParent ? 'Company Name *' : 'Branch Name * (e.g., Johnstone - Newburgh)'}
          </label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={input} />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Address</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={input} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              State {!isParent && '*'}
            </label>
            <select
              required={!isParent}
              value={territory}
              onChange={(e) => setTerritory(e.target.value)}
              className={input}
            >
              <option value="">Select...</option>
              {TERRITORIES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={input} />
          </div>
        </div>

        {!isParent && (
          <p className="text-xs text-gray-500 -mt-3">The state decides which of our lines show up on this branch.</p>
        )}

        {/* --- ASSIGNED REPS --- */}
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

        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_contractor"
            checked={isContractor}
            onChange={(e) => setIsContractor(e.target.checked)}
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
          />
          <label htmlFor="is_contractor" className="ml-3 text-sm font-bold text-gray-700 cursor-pointer">
            Mark as HVAC Contractor
          </label>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 shadow-sm disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : `Save ${isParent ? 'Parent Account' : 'Branch'}`}
          </button>
        </div>
      </form>
    </div>
  );
}
