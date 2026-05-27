"use client";

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LogVisitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedAccountId = searchParams.get('accountId');

  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountId, setAccountId] = useState(preSelectedAccountId || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Defaults to today
  const [type, setType] = useState('Branch Visit');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all accounts for the dropdown menu
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
    if (!accountId) return alert("Please select an account.");
    
    setIsSubmitting(true);

    const { error } = await supabase
      .from('calls')
      .insert([{ 
        account_id: accountId, 
        date, 
        type, 
        notes 
      }]);

    if (error) {
      console.error("Error saving visit:", error);
      alert("Failed to save visit: " + error.message);
      setIsSubmitting(false);
    } else {
      // Success! Route them back to the account profile they just logged a call for
      router.push(`/accounts/${accountId}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Log Field Activity</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        
        {/* Account Selection */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Account / Branch</label>
          <select 
            required
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none bg-white"
          >
            <option value="" disabled>Select an account...</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.name} {acc.territory ? `(${acc.territory})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date Picker */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Date</label>
            <input 
              type="date" 
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
            />
          </div>

          {/* Activity Type */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Activity Type</label>
            <select 
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none bg-white"
            >
              <option value="Branch Visit">Branch Visit</option>
              <option value="Counter Day">Counter Day</option>
              <option value="Lunch & Learn">Lunch & Learn</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Cold Call">Cold Call</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Field Notes */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Field Notes</label>
          <textarea 
            required
            rows={5}
            placeholder="Who did you speak with? What was discussed? Any follow-up needed?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none resize-none"
          ></textarea>
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
            {isSubmitting ? 'Saving...' : 'Save Visit'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Next.js requires search params to be wrapped in a suspense boundary
export default function LogVisitPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link href="/" className="text-blue-600 hover:underline font-medium text-sm mb-6 inline-block">
        ← Back to Dashboard
      </Link>
      <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading form...</div>}>
        <LogVisitForm />
      </Suspense>
    </div>
  );
}