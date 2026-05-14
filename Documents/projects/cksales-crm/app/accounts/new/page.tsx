"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';

export default function NewAccountPage() {
  const router = useRouter();
  
  // These hold the text you type into the form
  const [name, setName] = useState('');
  const [territory, setTerritory] = useState('');
  const [phone, setPhone] = useState('');
  
  // This function runs when you hit "Save Account"
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevents the page from refreshing
    
    // Send the data to your Supabase 'accounts' table
    const { error } = await supabase
      .from('accounts')
      .insert([
        { 
          name: name, 
          territory: territory, 
          phone: phone,
          status: 'Active' 
        }
      ]);

    if (error) {
      console.error('Error saving account:', error);
      alert('Failed to save account.');
    } else {
      // If successful, send the user back to the Accounts list and refresh the data
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
        <h1 className="text-3xl font-black text-gray-900 mt-4">Add New Account</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <div className="space-y-6">
          
          {/* Name Field */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Account Name *</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., Ferguson Plumbing"
            />
          </div>

          {/* Territory Field */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Territory</label>
            <select 
              value={territory}
              onChange={(e) => setTerritory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="">Select a territory...</option>
              <option value="New York State">New York State</option>
              <option value="Northern New Jersey">Northern New Jersey</option>
              <option value="New England">New England</option>
            </select>
          </div>

          {/* Phone Field */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
            <input 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="(555) 555-5555"
            />
          </div>

        </div>

        <div className="mt-8 flex justify-end gap-4">
          <Link href="/accounts">
            <button type="button" className="px-6 py-3 font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Cancel
            </button>
          </Link>
          <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
            Save Account
          </button>
        </div>
      </form>
    </div>
  );
}