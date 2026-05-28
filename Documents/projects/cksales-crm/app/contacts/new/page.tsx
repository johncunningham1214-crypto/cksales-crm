"use client";

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function NewContactForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedAccountId = searchParams.get('accountId');

  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountId, setAccountId] = useState(preSelectedAccountId || '');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch accounts so we can populate the dropdown
  useEffect(() => {
    async function fetchAccounts() {
      const { data } = await supabase
        .from('accounts')
        .select('id, name, territory')
        .order('name');
      
      if (data) setAccounts(data);
    }
    fetchAccounts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return alert("Please select a branch for this contact.");
    
    setIsSubmitting(true);

    const { error } = await supabase
      .from('contacts')
      .insert([{ 
        account_id: accountId, 
        name, 
        title, 
        phone, 
        email 
      }]);

    if (error) {
      // Force the app to print exactly what we sent and exactly what the database said back
      console.log("PAYLOAD SENT:", { account_id: accountId, name, title, phone, email });
      console.log("SUPABASE ERROR:", JSON.stringify(error, null, 2));
      alert("Failed! Check your browser's Developer Tools Console for the exact error.");
      setIsSubmitting(false);
    } else {
      // Route right back to the branch profile so you can see the new contact!
      router.push(`/accounts/${accountId}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-8 py-6 border-b border-gray-200 bg-gray-50">
        <h2 className="text-xl font-bold text-gray-900">Add New Contact</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        
        {/* Branch Selection */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Branch</label>
          <select 
            required
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none bg-white"
          >
            <option value="" disabled>Select a branch...</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.name} {acc.territory ? `(${acc.territory})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
              placeholder="e.g. Mike Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Job Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
              placeholder="e.g. Branch Manager"
            />
          </div>
        </div>

        {/* Contact Methods */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
            <input 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
              placeholder="mike@example.com"
            />
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
            {isSubmitting ? 'Saving...' : 'Save Contact'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Next.js requires search params to be wrapped in a suspense boundary
export default function NewContactPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <button 
        onClick={() => window.history.back()} 
        className="text-blue-600 hover:underline font-medium text-sm mb-6 inline-block cursor-pointer"
      >
        ← Back
      </button>
      <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading form...</div>}>
        <NewContactForm />
      </Suspense>
    </div>
  );
}