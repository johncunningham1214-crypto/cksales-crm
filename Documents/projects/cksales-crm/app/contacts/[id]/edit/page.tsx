"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function EditContactPage() {
  const router = useRouter();
  const params = useParams();
  const contactId = params.id;
  
  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [accountId, setAccountId] = useState('');
  
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the contact's existing info AND the list of companies
  useEffect(() => {
    async function fetchData() {
      // 1. Get the contact details
      const { data: contactData } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (contactData) {
        setFirstName(contactData.first_name || '');
        setLastName(contactData.last_name || '');
        setTitle(contactData.title || '');
        setPhone(contactData.phone || '');
        setEmail(contactData.email || '');
        setAccountId(contactData.account_id || '');
      }

      // 2. Get the accounts for the dropdown
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('id, name')
        .order('name');
      
      if (accountsData) setAccounts(accountsData);
      
      setIsLoading(false);
    }
    fetchData();
  }, [contactId]);

  // Update Function
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase
      .from('contacts')
      .update({ 
        first_name: firstName, 
        last_name: lastName, 
        title: title, 
        phone: phone, 
        email: email, 
        account_id: accountId || null 
      })
      .eq('id', contactId);

    if (error) {
      console.error("Error updating contact:", error);
      alert("Failed to update contact.");
    } else {
      router.push('/contacts');
      router.refresh();
    }
  };

  // Delete Function (Danger Zone)
  const handleDelete = async () => {
    const isConfirmed = window.confirm("🚨 DANGER ZONE 🚨\n\nAre you sure you want to permanently delete this contact?");
    
    if (isConfirmed) {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) {
        console.error("Error deleting contact:", error);
        alert("Failed to delete contact.");
      } else {
        router.push('/contacts');
        router.refresh();
      }
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading contact details...</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href="/contacts" className="text-blue-600 hover:underline font-medium text-sm">
          ← Back to Rolodex
        </Link>
        <h1 className="text-3xl font-black text-gray-900 mt-4">Edit Contact</h1>
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
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3" />
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

        <div className="pt-4 flex justify-end gap-4">
          <Link href="/contacts">
            <button type="button" className="px-6 py-3 font-medium text-gray-600 hover:text-gray-900">Cancel</button>
          </Link>
          <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700">
            Save Changes
          </button>
        </div>
      </form>

      {/* --- DANGER ZONE --- */}
      <div className="mt-12 pt-8 border-t border-red-100">
        <h3 className="text-red-800 font-black text-lg mb-2">Danger Zone</h3>
        <p className="text-sm text-red-600 mb-4">
          Permanently remove this contact from the database.
        </p>
        <button 
          type="button"
          onClick={handleDelete}
          className="bg-red-50 text-red-600 border border-red-200 px-6 py-3 rounded-lg font-bold hover:bg-red-600 hover:text-white transition-colors"
        >
          Delete Contact
        </button>
      </div>
    </div>
  );
}