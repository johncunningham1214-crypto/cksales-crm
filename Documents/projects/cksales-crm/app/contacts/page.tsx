"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchContacts() {
      // We join the accounts table so we can show the company name!
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          accounts ( name )
        `)
        .order('last_name');

      if (data) setContacts(data);
      setIsLoading(false);
    }
    fetchContacts();
  }, []);

  const filteredContacts = contacts.filter(contact => {
    const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-black text-gray-900">Address Book</h1>
        <Link href="/contacts/new">
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 shadow-sm">
            + New Contact
          </button>
        </Link>
      </div>

      <div className="relative mb-8">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="text-gray-400">🔍</span>
        </div>
        <input
          type="text"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:border-blue-500 text-lg"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-4 text-sm font-bold text-gray-500 uppercase">Name</th>
              <th className="p-4 text-sm font-bold text-gray-500 uppercase">Title & Company</th>
              <th className="p-4 text-sm font-bold text-gray-500 uppercase">Contact Info</th>
              <th className="p-4 text-sm font-bold text-gray-500 uppercase text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr><td colSpan={3} className="p-8 text-center text-gray-400">Loading contacts...</td></tr>
            ) : filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-gray-900 text-lg">
                      {contact.first_name} {contact.last_name}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-gray-900 font-medium">{contact.title || 'No Title'}</div>
                    <div className="text-blue-600 text-sm">
                      {/* Displays the linked company name, or standalone if not linked */}
                      {contact.accounts?.name ? `@ ${contact.accounts.name}` : 'Stand-alone Contact'}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-gray-600 text-sm">{contact.phone || 'No Phone'}</div>
                    <div className="text-gray-600 text-sm">{contact.email || 'No Email'}</div>
                  </td>
                  <td className="p-4 text-right">
                </td>
                <td className="p-4 text-right">
     <Link href="{`/contacts/${contact.id}/edit`}" className="text-blue-500 font-medium text-sm hover:underline">
       Edit →
     </Link>
   </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={3} className="p-8 text-center text-gray-400">No contacts found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}