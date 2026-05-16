"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function AccountProfile() {
  const params = useParams();
  const accountId = params.id;

  const [account, setAccount] = useState<any>(null);
  const [parentAccount, setParentAccount] = useState<any>(null);
  const [childBranches, setChildBranches] = useState<any[]>([]); // NEW: To hold child branches
  const [calls, setCalls] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAccountDetails() {
      // 1. Get the Account info
      const { data: accountData } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      // 2. If this is a BRANCH, fetch its Parent's name
      if (accountData?.parent_id) {
        const { data: pData } = await supabase
          .from('accounts')
          .select('id, name')
          .eq('id', accountData.parent_id)
          .single();
        
        if (pData) setParentAccount(pData);
      }

      // 3. NEW: If this is an HQ (Parent), fetch all of its Branches!
      if (accountData?.is_parent) {
        const { data: childrenData } = await supabase
          .from('accounts')
          .select('id, name, territory, status')
          .eq('parent_id', accountId)
          .order('name');
          
        if (childrenData) setChildBranches(childrenData);
      }

      // 4. Get the Field Notes (Calls)
      const { data: callsData } = await supabase
        .from('calls')
        .select('*')
        .eq('account_id', accountId)
        .order('date', { ascending: false });

      // 5. Get the People (Contacts)
      const { data: contactsData } = await supabase
        .from('contacts')
        .select('*')
        .eq('account_id', accountId)
        .order('last_name');

      if (accountData) setAccount(accountData);
      if (callsData) setCalls(callsData);
      if (contactsData) setContacts(contactsData);
      
      setIsLoading(false);
    }

    fetchAccountDetails();
  }, [accountId]);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading profile...</div>;
  }

  if (!account) {
    return <div className="p-8 text-center text-red-500">Account not found.</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      
      {/* Header Section */}
      <div className="mb-8">
        <Link href="/accounts" className="text-blue-600 hover:underline font-medium text-sm mb-4 inline-block">
          ← Back to Accounts
        </Link>
        <div className="flex justify-between items-start mt-2">
          <div>
            <h1 className="text-4xl font-black text-gray-900">
              {account.name}
              {account.is_parent && (
                <span className="ml-3 align-middle bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full">
                  Major Account HQ
                </span>
              )}
            </h1>
            
            {/* Parent Account Link (Only shows if this is a branch) */}
            {parentAccount && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-gray-500 text-sm font-medium">Branch of:</span>
                <Link href={`/accounts/${parentAccount.id}`}>
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-sm font-bold border border-blue-100 hover:bg-blue-100 hover:text-blue-800 transition-colors inline-block">
                    🏢 {parentAccount.name}
                  </span>
                </Link>
              </div>
            )}

            <div className="flex items-center gap-4 mt-4 text-gray-600 font-medium">
              <span className="bg-gray-100 px-3 py-1 rounded-full text-sm">{account.territory || 'No Territory'}</span>
              <span>{account.phone || 'No Phone'}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                account.status === 'Inactive' ? 'bg-red-100 text-red-800' : 
                account.status === 'Prospect' ? 'bg-yellow-100 text-yellow-800' : 
                'bg-green-100 text-green-800'
              }`}>
                {account.status || 'Active'}
              </span>
            </div>
          </div>
          <Link href={`/accounts/${accountId}/edit`}>
            <button className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-bold hover:bg-gray-200 transition-colors">
              Edit Account
            </button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Contacts & Branches */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* NEW: Attached Branches Box (Only shows if this is an HQ) */}
          {account.is_parent && (
            <div className="bg-white border border-blue-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-blue-200 bg-blue-50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-blue-900">Attached Locations</h2>
                <span className="bg-blue-200 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                  {childBranches.length}
                </span>
              </div>
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {childBranches.length > 0 ? (
                  childBranches.map((branch) => (
                    <Link key={branch.id} href={`/accounts/${branch.id}`} className="block p-4 hover:bg-blue-50 transition-colors group">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                            {branch.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 font-medium">
                            {branch.territory || 'No Territory'}
                          </div>
                        </div>
                        <span className="text-blue-400 group-hover:text-blue-600 font-bold">→</span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    No branches attached to this HQ yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contacts Box */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Contacts</h2>
              <Link href="/contacts/new" className="text-blue-600 hover:underline text-sm font-bold">
                + Add
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {contacts.length > 0 ? (
                contacts.map((contact) => (
                  <div key={contact.id} className="p-6 hover:bg-gray-50 transition-colors group">
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-bold text-gray-900 text-lg">
                        {contact.first_name} {contact.last_name}
                      </div>
                      <Link href={`/contacts/${contact.id}/edit`} className="text-blue-500 font-medium text-sm hover:underline">
                        Edit →
                      </Link>
                    </div>
                    <div className="text-sm text-blue-600 font-medium mb-2">{contact.title || 'Staff'}</div>
                    {contact.phone && <div className="text-sm text-gray-600 mb-1">📞 {contact.phone}</div>}
                    {contact.email && <div className="text-sm text-gray-600">✉️ {contact.email}</div>}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No contacts added yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Field Notes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Field Notes & Activity</h2>
              <Link href={`/calls/new?accountId=${accountId}`}>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-blue-700 transition-colors">
                  + Log Visit
                </button>
              </Link>
            </div>
            
            <div className="divide-y divide-gray-100">
              {calls.length > 0 ? (
                calls.map((call) => (
                  <div key={call.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full uppercase tracking-wider">
                        {call.type}
                      </span>
                      <span className="text-sm font-bold text-gray-500">
                        {new Date(call.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{call.notes}</p>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-gray-500">
                  No visits logged for this account yet.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}