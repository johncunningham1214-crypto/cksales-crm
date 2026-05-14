"use client";

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import Link from 'next/link';

export default function LogVisitPage() {
  const router = useRouter();
  const params = useParams(); 
  const accountId = params.id; // Grabs the specific account ID from the URL

  // Set today's date as the default
  const today = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [type, setType] = useState('In-person');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Send the visit data to the 'calls' table
    const { error } = await supabase
      .from('calls')
      .insert([
        { 
          account_id: accountId, // This links the call to this specific customer
          date: date,
          type: type,
          notes: notes
        }
      ]);

    if (error) {
      console.error('Error saving call:', error);
      alert('Failed to save visit.');
    } else {
      // Go back to the account profile and refresh
      router.push(`/accounts/${accountId}`);
      router.refresh();
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href={`/accounts/${accountId}`} className="text-blue-600 hover:underline font-medium text-sm">
          ← Back to Profile
        </Link>
        <h1 className="text-3xl font-black text-gray-900 mt-4">Log a Visit</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <div className="space-y-6">
          
          {/* Date Field */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Date</label>
            <input 
              type="date" 
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Type Field */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Visit Type</label>
            <select 
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="In-person">In-person</option>
              <option value="Phone Call">Phone Call</option>
              <option value="Lunch & Learn">Lunch & Learn</option>
              <option value="Email/Digital">Email/Digital</option>
            </select>
          </div>

          {/* Notes Field */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Visit Notes</label>
            <textarea 
              required
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:border-blue-500"
              placeholder="What was discussed? Any follow-ups required?"
            ></textarea>
          </div>

        </div>

        <div className="mt-8 flex justify-end gap-4">
          <Link href={`/accounts/${accountId}`}>
            <button type="button" className="px-6 py-3 font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Cancel
            </button>
          </Link>
          <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Save Visit
          </button>
        </div>
      </form>
    </div>
  );
}