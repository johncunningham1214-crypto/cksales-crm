"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewAccount() {
  const router = useRouter();
  
  // Basic Info
  const [name, setName] = useState('');
  const [territory, setTerritory] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('Active');
  
  // Hierarchy Info
  const [isParent, setIsParent] = useState(false);
  const [parentId, setParentId] = useState('');
  
  // List of Major Accounts for the dropdown
  const [majorAccounts, setMajorAccounts] = useState<any[]>([]);

  // Fetch only the Major Accounts to populate our dropdown
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase
      .from('accounts')
      .insert([
        { 
          name, 
          territory, 
          phone, 
          status,
          is_parent: isParent,
          // If it is a parent, it can't have a parent. If a parent is selected, save it.
          parent_id: isParent ? null : (parentId || null) 
        }
      ]);

    if (error) {
      console.error("Error adding account:", error.message);
      alert("Failed to add account.");
    } else {
      router.push('/accounts');
      router.refresh();
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href="/accounts" className="text-blue-600 hover:underline font-medium text-sm">
          ← Back to Accounts
        </Link>
        <h1 className="text-3xl font-black text-gray-900 mt-4">New Account</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm space-y-6">
        
        {/* --- HIERARCHY TOGGLE --- */}
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6">
          <label className="flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={isParent}
              onChange={(e) => {
                setIsParent(e.target.checked);
                if (e.target.checked) setParentId(''); // Clear parent selection if they make THIS a parent
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

        {/* --- PARENT DROPDOWN (Hides if this IS a parent) --- */}
        {!isParent && (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Belongs to Major Account (Optional)</label>
            <select 
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 bg-white"
            >
              <option value="">-- Standalone Account (No Parent) --</option>
              {majorAccounts.map(parent => (
                <option key={parent.id} value={parent.id}>{parent.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* --- STANDARD FIELDS --- */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            {isParent ? 'Company Name *' : 'Branch Name * (e.g., Johnstone - Newburgh)'}
          </label>
          <input 
            type="text" 
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">State / Territory</label>
            <input 
              type="text" 
              value={territory}
              onChange={(e) => setTerritory(e.target.value.toUpperCase())} 
              placeholder="e.g. NY, NJ"
              maxLength={2}
              className="w-full border border-gray-300 rounded-lg p-3"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Phone</label>
            <input 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 shadow-sm">
            Save {isParent ? 'Parent Account' : 'Branch'}
          </button>
        </div>
      </form>
    </div>
  );
}