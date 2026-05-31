"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useRouter, useParams } from 'next/navigation';

export default function EditContactForm() {
  const router = useRouter();
  const params = useParams();
  const contactId = params.id;

  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountId, setAccountId] = useState('');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchAccounts() {
      const { data } = await supabase
        .from('accounts')
        .select('id, name, territory')
        .order('name');
      
      if (data) setAccounts(data);
    }

    async function fetchContactData() {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (data) {
        setAccountId(data.account_id || '');
        setName(data.name || '');
        setTitle(data.title || '');
        setPhone(data.phone || '');
        setEmail(data.email || '');
        setNotes(data.notes || '');
      } else if (error) {
        console.error("Error fetching contact:", error);
      }
      setIsLoading(false);
    }

    fetchAccounts();
    if (contactId) fetchContactData();
  }, [contactId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return alert("Please select a branch for this contact.");
    
    setIsSubmitting(true);

    const { error } = await supabase
      .from('contacts')
      .update({ account_id: accountId, name, title, phone, email, notes })
      .eq('id', contactId);

    if (error) {
      console.error("Error updating contact:", error);
      alert("Failed to update contact: " + error.message);
      setIsSubmitting(false);
    } else {
      router.back();
    }
  };

  // NEW: Delete Function
  const handleDelete = async () => {
    // Built-in browser confirmation popup
    const isConfirmed = window.confirm("Are you sure you want to delete this contact? This cannot be undone.");
    if (!isConfirmed) return;

    setIsSubmitting(true);
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contactId);

    if (error) {
      console.error("Error deleting contact:", error);
      alert("Failed to delete contact.");
      setIsSubmitting(false);
    } else {
      // If deleted successfully, send them back to the master Rolodex
      router.push('/contacts');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading contact data...</div>;
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <button 
        onClick={() => router.back()} 
        className="text-blue-600 hover:underline font-medium text-sm mb-6 inline-block cursor-pointer"
      >
        ← Back
      </button>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Edit Contact</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Branch Location</label>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Job Title</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
              />
            </div>
          </div>
          {/* Additional Notes (Spans full width) */}
          <div className="pt-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">Personal Notes & Info</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none resize-y"
              placeholder="e.g., Prefers text messages, massive Yankees fan, needs extra spec sheets for counter displays..."
            />
          </div>

          {/* UPDATED: Action Buttons with Delete */}
          <div className="pt-4 flex items-center justify-between border-t border-gray-100">
            <button 
              type="button"
              onClick={handleDelete}
              className="text-red-600 font-bold hover:text-red-800 transition-colors px-2 py-2"
            >
              🗑️ Delete Contact
            </button>
            <div className="flex items-center gap-4">
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
          </div>
        </form>
      </div>
    </div>
  );
}