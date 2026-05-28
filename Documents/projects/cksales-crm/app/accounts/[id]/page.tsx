"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function AccountProfile() {
  const params = useParams();
  const accountId = params.id;

  const [account, setAccount] = useState<any>(null);
  const [calls, setCalls] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAccountData() {
      // Fire all 4 database requests simultaneously!
      const [accountRes, contactsRes, callsRes, tasksRes] = await Promise.all([
        supabase.from('accounts').select('*').eq('id', accountId).single(),
        supabase.from('contacts').select('*').eq('account_id', accountId).order('name'),
        supabase.from('calls').select('id, date, type, notes, rep_name').eq('account_id', accountId).order('date', { ascending: false }),
        supabase.from('tasks').select('*').eq('account_id', accountId).order('due_date', { ascending: true }) // Change 'tasks' to 'action_items' if needed
      ]);

      if (accountRes.data) setAccount(accountRes.data);
      if (contactsRes.data) setContacts(contactsRes.data);
      if (callsRes.data) setCalls(callsRes.data);
      if (tasksRes.data) setTasks(tasksRes.data);
      
      setIsLoading(false);
    }

    if (accountId) fetchAccountData();
  }, [accountId]);

  // THE SAFETY NETS
  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading branch profile...</div>;
  }

  if (!account) {
    return <div className="p-8 text-center text-red-500">Account not found.</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Navigation Breadcrumb */}
      <Link href="/accounts" className="text-blue-600 hover:underline font-medium text-sm">
        ← Back to Accounts
      </Link>

      {/* Account Header */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900">{account.name}</h1>
          <div className="mt-3 space-y-1 text-gray-600 font-medium text-sm">
            <p className="flex items-center gap-2">
              <span>📍</span> {account.address || 'No address on file'}
            </p>
            <p className="flex items-center gap-2">
              <span>📞</span> {account.phone || 'No phone number on file'}
            </p>
          </div>
          <div className="flex gap-2 mt-5">
            <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-1 rounded">
              {account.territory || 'Unassigned Territory'}
            </span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded ${
              account.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {account.status || 'Active'}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
          <Link 
            href={`/accounts/${account.id}/edit`}
            className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-bold hover:bg-gray-50 transition-colors shadow-sm text-center"
          >
            ✏️ Edit Account
          </Link>
          <Link 
            href={`/calls/new?accountId=${account.id}`}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm text-center"
          >
            + Log Visit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Contacts */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Branch Contacts</h2>
              <Link 
                href={`/contacts/new?accountId=${account.id}`}
                className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg"
              >
                + Add
              </Link>
            </div>
            
            <div className="divide-y divide-gray-100">
              {contacts.length > 0 ? (
                contacts.map(contact => (
                  <div key={contact.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <Link href={`/contacts/${contact.id}/edit`} className="group flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {contact.name}
                      </h3>
                      <span className="opacity-0 group-hover:opacity-100 text-xs font-bold text-blue-600 transition-opacity">
                        ✎ Edit
                      </span>
                    </Link>
                    <p className="text-sm text-gray-500 font-medium mb-3">{contact.title || 'Staff'}</p>
                    
                    <div className="text-sm text-gray-600 space-y-1.5">
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
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No contacts listed for this branch.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Tasks & Activity Stack */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* TOP OF STACK: Branch Tasks */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Open Tasks</h2>
              <Link 
                href={`/tasks/new?accountId=${account.id}`}
                className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg"
              >
                + Add Task
              </Link>
            </div>
            
            <div className="divide-y divide-gray-100">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <div key={task.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="font-bold text-gray-900">{task.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Due: <span className="font-medium text-gray-700">{task.due_date || 'No date set'}</span> 
                        {task.rep_name && ` • Assigned to: ${task.rep_name}`}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full shrink-0 ${
                      task.status?.toLowerCase() === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {task.status || 'Pending'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No open tasks for this branch. You're all caught up!
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM OF STACK: Branch History */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Branch History</h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              {calls.length > 0 ? (
                calls.map((call) => (
                  <div key={call.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {call.rep_name ? call.rep_name.charAt(0) : '?'}
                        </div>
                        <div>
                          <p className="text-sm text-gray-900 font-medium">
                            <span className="font-bold">{call.rep_name || 'A team member'}</span> logged a <span className="font-bold">{call.type}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{call.date}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-3 pl-11 bg-white p-3 border border-gray-100 rounded-lg italic">
                      "{call.notes}"
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No activity logged for this branch yet.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}