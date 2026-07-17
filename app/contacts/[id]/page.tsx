"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function ContactProfile() {
  const params = useParams();
  const contactId = params.id;

  const [contact, setContact] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchContactData() {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          accounts (name, territory)
        `)
        .eq('id', contactId)
        .single();

      if (data) setContact(data);
      if (error) console.error("Error fetching contact:", error);
      
      setIsLoading(false);
    }

    if (contactId) fetchContactData();
  }, [contactId]);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading profile...</div>;
  }

  if (!contact) {
    return <div className="p-8 text-center text-red-500">Contact not found.</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Navigation */}
      <div className="flex gap-4">
        <Link href="/contacts" className="text-blue-600 hover:underline font-medium text-sm">
          ← Back to Contacts
        </Link>
        <span className="text-gray-300">|</span>
        <Link href={`/accounts/${contact.account_id}`} className="text-blue-600 hover:underline font-medium text-sm">
          Go to Branch Profile →
        </Link>
      </div>

      {/* Header Profile Card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6">
          {/* Avatar Circle */}
          <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-3xl font-black shrink-0">
            {contact.name.charAt(0)}
          </div>
          
          <div>
            <h1 className="text-3xl font-black text-gray-900">{contact.name}</h1>
            <p className="text-lg text-blue-600 font-bold mt-1">{contact.title || 'Staff Member'}</p>
            <p className="text-sm text-gray-500 font-medium mt-1">
              📍 {contact.accounts?.name || 'Unknown Branch'} {contact.accounts?.territory ? `(${contact.accounts.territory})` : ''}
            </p>
          </div>
        </div>
        
        <Link 
          href={`/contacts/${contact.id}/edit`}
          className="bg-white border-2 border-gray-200 text-gray-700 px-6 py-3 rounded-lg font-bold hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm shrink-0"
        >
          ✎ Edit Profile
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Contact Methods */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Contact Info</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Phone</p>
                {contact.phone ? (
                  <a href={`tel:${contact.phone}`} className="text-gray-900 font-bold hover:text-blue-600 transition-colors flex items-center gap-2">
                    📞 {contact.phone}
                  </a>
                ) : (
                  <p className="text-gray-500 italic text-sm">No phone on file</p>
                )}
              </div>
              
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email</p>
                {contact.email ? (
                  <a href={`mailto:${contact.email}`} className="text-gray-900 font-bold hover:text-blue-600 transition-colors flex items-center gap-2 break-all">
                    ✉️ {contact.email}
                  </a>
                ) : (
                  <p className="text-gray-500 italic text-sm">No email on file</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Additional Notes */}
        <div className="md:col-span-2">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden h-full">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Personal Notes & Info</h2>
            </div>
            <div className="p-6">
              {contact.notes ? (
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {contact.notes}
                </p>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm mb-4">No additional information saved for {contact.name}.</p>
                  <Link 
                    href={`/contacts/${contact.id}/edit`}
                    className="text-sm font-bold text-blue-600 hover:underline"
                  >
                    + Add Notes
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}