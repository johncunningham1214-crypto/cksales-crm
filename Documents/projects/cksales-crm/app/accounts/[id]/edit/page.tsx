"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import Link from 'next/link';

export default function EditAccountPage() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.id;

  // State to hold the form data
  const [name, setName] = useState('');
  const [territory, setTerritory] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('Active');
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch the existing data when the page loads
  useEffect(() => {
    async function fetchAccount() {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (data) {
        setName(data.name);
        setTerritory(data.territory || '');
        setPhone(data.phone || '');
        setStatus(data.status || 'Active');
      } else if (error) {
        console.error('Error fetching account:', error);
      }
      setIsLoading(false);
    }

    fetchAccount();
  }, [accountId]);

  // 2. Save the updated data back to Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase
      .from('accounts')
      .update({ 
        name: name, 
        territory: territory, 
        phone: phone,
        status: status 
      })
      .eq('id', accountId);

    if (error) {
      console.error('Error updating account:', error);
      alert('Failed to update account.');
    } else {
      router.push(`/accounts/${accountId}`);
      router.refresh();
    }
  };

  // 3. The Danger Zone: Delete the account and manage its relationships
  const handleDelete = async () => {
    const isConfirmed = window.confirm("🚨 DANGER ZONE 🚨\n\nAre you absolutely sure you want to permanently delete this account? (Field notes will be deleted. Any attached contacts or branches will be safely unlinked.)");

    if (isConfirmed) {
      // Step A: Delete attached field notes (calls) so they don't block us
      await supabase
        .from('calls')
        .delete()
        .eq('account_id', accountId);

      // Step B: Unlink attached contacts (so they don't get deleted from your Address Book)
      await supabase
        .from('contacts')
        .update({ account_id: null })
        .eq('account_id', accountId);

      // Step C: Unlink any child branches (if you are deleting a Major Account HQ)
      await supabase
        .from('accounts')
        .update({ parent_id: null })
        .eq('parent_id', accountId);

      // Step D: Now that all the connections are cleared, it is safe to delete the account!
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountId);

      if (error) {
        // We added .message and .details here so it never gives us a blank {} again!
        console.error('Error deleting account:', error.message, error.details, error.hint);
        alert(`Failed to delete account: ${error.message}`);
      } else {
        router.push('/accounts');
        router.refresh();
      }
    }
  };

  // Show a simple loading message while data is being fetched
  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading account details...</div>;
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href={`/accounts/${accountId}`} className="text-blue-600 hover:underline font-medium text-sm">
          ← Back to Profile
        </Link>
        <h1 className="text-3xl font-black text-gray-900 mt-4">Edit Account</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <div className="space-y-6">
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Account Name *</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">State / Territory</label>
            <input 
              type="text" 
              value={territory}
              onChange={(e) => setTerritory(e.target.value.toUpperCase())} 
              placeholder="e.g. NY, NJ, MA"
              maxLength={2}
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
            <input 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Prospect">Prospect</option>
            </select>
          </div>

        </div>

        <div className="mt-8 flex justify-end gap-4">
          <Link href={`/accounts/${accountId}`}>
            <button type="button" className="px-6 py-3 font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Cancel
            </button>
          </Link>
          <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
            Save Changes
          </button>
        </div>
      </form>

      {/* --- DANGER ZONE --- */}
      <div className="mt-12 pt-8 border-t border-red-100">
        <h3 className="text-red-800 font-black text-lg mb-2">Danger Zone</h3>
        <p className="text-sm text-red-600 mb-4">
          Permanently remove this account and all associated field notes from the database. This action cannot be reversed.
        </p>
        <button 
          type="button"
          onClick={handleDelete}
          className="bg-red-50 text-red-600 border border-red-200 px-6 py-3 rounded-lg font-bold hover:bg-red-600 hover:text-white transition-colors"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}