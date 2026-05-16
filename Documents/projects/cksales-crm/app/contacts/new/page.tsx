"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewContact() {
  const router = useRouter();
  
  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [accountId, setAccountId] = useState('');
  
  // To hold our list of companies for the dropdown
  const [accounts, setAccounts] = useState<any[]>([]);

  // Fetch accounts when the page loads
  useEffect(() => {
    async function fetchAccounts() {
      const { data } = await supabase
        .from('accounts')
        .select('id, name')
        .order('name');
      
      if (data) setAccounts(data);
    }
    fetchAccounts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase
      .from('contacts')
      .insert([
        { 
          first_name: firstName, 
          last_name: lastName, 
          title: title, 
          phone: phone, 
          email: email, 
          account_id: accountId || null // Allows saving unattached contacts
        }
      ]);

    if (error) {
      console.error("Error adding contact:", error);
      alert("Failed to add contact.");
    } else {
      router.push('/contacts');
      router.refresh();
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href="/contacts" className="text-blue-600 hover:underline font-medium text-sm">
          ← Back to Rolodex
        </Link>
        <h1 className="text-3xl font-black text-gray-900 mt-4">Add New Contact</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm space-y-6">
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">First Name *</label>
            <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Last Name *</label>
            <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Job Title / Role</label>
          <input type="text" placeholder="e.g. Branch Manager" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3" />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Attach to Account</label>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 bg-white">
            <option value="">-- No Account (Stand-alone Contact) --</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3" />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700">
            Save Contact
          </button>
        </div>
      </form>
    </div>
  );
}