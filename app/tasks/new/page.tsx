"use client";

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { SALES_TEAM } from '@/lib/constants';
function NewTaskForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedAccountId = searchParams.get('accountId');

  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountId, setAccountId] = useState(preSelectedAccountId || '');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [repName, setRepName] = useState('');
  const [status, setStatus] = useState('Pending');
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
    if (!accountId) return alert("Please select an account.");
    if (!repName) return alert("Please select who this is assigned to.");
    
    setIsSubmitting(true);

    // IMPORTANT: Change 'tasks' to 'action_items' below if that's what your database uses!
    const { error } = await supabase
      .from('tasks')
      .insert([{ 
        account_id: accountId, 
        title, 
        due_date: dueDate || null, 
        rep_name: repName,
        status 
      }]);

    if (error) {
      console.error("Error saving task:", error);
      alert("Failed to save task: " + error.message);
      setIsSubmitting(false);
    } else {
      router.push(`/accounts/${accountId}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Add New Task</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        
        {/* Branch & Assigned Rep */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Assigned To</label>
            <select 
              required
              value={repName}
              onChange={(e) => setRepName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none bg-white"
            >
             <option value="" disabled>Who is doing this?</option>
{SALES_TEAM.map(name => (
  <option key={name} value={name}>{name}</option>
))}
            </select>
          </div>
        </div>

        {/* Task Details */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">What needs to be done?</label>
          <input 
            type="text" 
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Send Supco pump pricing sheet"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
          />
        </div>

        {/* Date & Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Due Date (Optional)</label>
            <input 
              type="date" 
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none bg-white"
            >
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
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
            {isSubmitting ? 'Saving...' : 'Save Task'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewTaskPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <button 
        onClick={() => window.history.back()} 
        className="text-blue-600 hover:underline font-medium text-sm mb-6 inline-block cursor-pointer"
      >
        ← Back
      </button>
      <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading form...</div>}>
        <NewTaskForm />
      </Suspense>
    </div>
  );
}