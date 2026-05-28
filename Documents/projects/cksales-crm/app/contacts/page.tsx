"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function ContactsDirectory() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchContacts() {
      // Fetch all contacts AND the name of the account they belong to
      const { data } = await supabase
        .from('contacts')
        .select(`
          *,
          accounts (name, territory)
        `)
        .order('name');
      
      if (data) setContacts(data);
      setIsLoading(false);
    }
    fetchContacts();
  }, []);

  // Filter contacts by name or the branch they work at
  const filteredContacts = contacts.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.accounts?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading master directory...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Global Directory</h1>
        <p className="text-gray-500 mt-2 font-medium">All field contacts and branch staff.</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
        <input 
          type="text" 
          placeholder="Search by name or branch..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
        />
      </div>

      {/* Contacts List */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">
            {filteredContacts.length} Contacts Found
          </h2>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredContacts.length > 0 ? (
            filteredContacts.map(contact => (
              <div key={contact.id} className="p-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4 hover:bg-gray-50 transition-colors">
                
                {/* Contact Identity */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{contact.name}</h3>
                  <p className="text-sm font-medium text-blue-600">{contact.title || 'Staff'}</p>
                  
                  {/* Branch Association */}
                  <Link href={`/accounts/${contact.account_id}`} className="inline-block mt-2 text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200 transition-colors">
                    {contact.accounts?.name || 'Unknown Branch'} 
                    {contact.accounts?.territory ? ` (${contact.accounts.territory})` : ''}
                  </Link>
                </div>
                
                {/* Contact Methods & Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-8 shrink-0">
                  <div className="text-sm text-gray-600 space-y-1">
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                        <span>📞</span> {contact.phone}
                      </a>
                    )}
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                        <span>✉️</span> {contact.email}
                      </a>
                    )}
                  </div>
                  
                  <Link 
                    href={`/contacts/${contact.id}/edit`}
                    className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors bg-white border border-gray-200 px-4 py-2 rounded-lg"
                  >
                    Edit
                  </Link>
                </div>

              </div>
            ))
          ) : (
            <div className="p-12 text-center text-gray-500">
              No contacts match your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}