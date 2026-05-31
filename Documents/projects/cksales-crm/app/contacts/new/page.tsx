"use client";

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function NewContactForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // This allows you to auto-select a branch if you click "Add Contact" from a branch's profile page
  const preSelectedAccountId = searchParams.get('accountId');

  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountId, setAccountId] = useState(preSelectedAccountId || '');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!accountId) return alert("Please select a branch.");
    if (!name.trim()) return alert("Please enter a name.");
    
    setIsSubmitting(true);

    const { data, error } = await supabase
      .from('contacts')
      .insert([{ 
        account_id: accountId, 
        name: name.trim(), 
        title: title.trim(), 
        phone: phone.trim(), 
        email: email.trim(),
        notes: notes.trim()
      }])
      .select()
      .single(); // We use .single() here to immediately get the ID of the person we just created

    if (error) {
      console.error("Error saving contact:", error);
      alert("Failed to save contact: " + error.message);
      setIsSubmitting(false);
    } else {
      // Success! Route them directly to the new profile page you built earlier
      router.push(`/contacts/${data.id}`);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-8 py-6 border-b border-gray-200 bg-gray-50">
        <h2 className="text-xl font-bold text-gray-900">Add New Contact</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        
        {/* Branch Selection */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Branch Location</label>
          <select 
            required
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
          >
            <option value="" disabled>Select a branch...</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.name} {acc.territory ? `(${acc.territory})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Core Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mike Johnson"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Job Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Branch Manager"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none"
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
              placeholder="e.g. (555) 123-4567"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. mike@branch.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none"
            />
          </div>
        </div>

        {/* Additional Notes */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Personal Notes & Info</label>
          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="e.g., Prefers texts, needs extra line cards, huge Yankees fan..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none resize-y"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex items-center justify-end gap-4 border-t border-gray-100">
          <Link 
            href="/contacts"
            className="text-gray-500 font-bold hover:text-gray-700 transition-colors"
          >
            Cancel
          </Link>
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

export default function NewContactPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <Link href="/contacts" className="text-blue-600 hover:underline font-medium text-sm inline-block">
        ← Back to Contacts
      </Link>
      <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading form...</div>}>
        <NewContactForm />
      </Suspense>
    </div>
  );
}