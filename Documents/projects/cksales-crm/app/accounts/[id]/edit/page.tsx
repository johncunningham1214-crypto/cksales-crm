"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function EditAccountForm() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.id;

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [territory, setTerritory] = useState('');
  const [status, setStatus] = useState('Active');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // The East Coast territories we defined earlier
  const territories = [
    'ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA', 
    'DE', 'MD', 'DC', 'VA', 'NC', 'SC', 'GA', 'FL'
  ];

  // 1. Fetch the existing account data to pre-fill the form
  useEffect(() => {
    async function fetchAccountData() {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (data) {
        setName(data.name || '');
        setAddress(data.address || '');
        setPhone(data.phone || '');
        setTerritory(data.territory || '');
        setStatus(data.status || 'Active');
      } else if (error) {
        console.error("Error fetching account:", error);
      }
      setIsLoading(false);
    }

    if (accountId) fetchAccountData();
  }, [accountId]);

  // 2. Save the updated data back to Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase
      .from('accounts')
      .update({ 
        name, 
        address, 
        phone, 
        territory, 
        status 
      })
      .eq('id', accountId);

    if (error) {
      console.error("Error updating account:", error);
      alert("Failed to update account: " + error.message);
      setIsSubmitting(false);
    } else {
      // Success! Send them back to the account profile
      router.push(`/accounts/${accountId}`);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading account data...</div>;
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href={`/accounts/${accountId}`} className="text-blue-600 hover:underline font-medium text-sm mb-6 inline-block">
        ← Back to Account Profile
      </Link>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Edit Account Details</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          {/* Branch Name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Branch Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
              placeholder="e.g. Johnstone Supply - Hackensack"
            />
          </div>

          {/* Address & Phone Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Address</label>
              <input 
                type="text" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                placeholder="123 Main St, City, ST 12345"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
              <input 
                type="text" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          {/* Territory & Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Territory</label>
              <select 
                value={territory}
                onChange={(e) => setTerritory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none bg-white"
              >
                <option value="" disabled>Select a territory...</option>
                {territories.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none bg-white"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-4 border-t border-gray-100">
            <button 
              type="button"
              onClick={() => router.back()}
              className="text-gray-500 font-bold hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}