"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function AccountProfile() {
  const params = useParams();
  const accountId = params.id as string;

  const [account, setAccount] = useState<any>(null);
  const [parentAccount, setParentAccount] = useState<any>(null);
  const [childBranches, setChildBranches] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]); // NEW: Holds account tasks
  const [newTaskTitle, setNewTaskTitle] = useState(''); // NEW: For the quick-add form
  const [isLoading, setIsLoading] = useState(true);

  // Define fetchTasks OUTSIDE useEffect so we can call it after adding a new task
  const fetchTasks = async () => {
    const { data: tasksData } = await supabase
      .from('action_items')
      .select('*')
      .eq('account_id', accountId)
      .order('is_completed', { ascending: true })
      .order('created_at', { ascending: false });
      
    if (tasksData) setTasks(tasksData);
  };

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

      // 3. If this is an HQ (Parent), fetch all of its Branches!
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
      
      // 6. Fetch the Action Items!
      await fetchTasks();

      setIsLoading(false);
    }

    fetchAccountDetails();
  }, [accountId]);

// NEW: Add a task directly linked to this account
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const { error } = await supabase
      .from('action_items')
      .insert([{ 
        title: newTaskTitle, 
        is_completed: false,
        account_id: accountId // Automatically links to this branch!
      }]);

    if (error) {
      console.error("Database Error:", error);
      alert("Failed to save task: " + error.message);
    } else {
      setNewTaskTitle('');
      fetchTasks(); // Refresh the list
    }
  };

  // NEW: Toggle task completion
  const toggleComplete = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('action_items')
      .update({ is_completed: !currentStatus })
      .eq('id', id);
    if (!error) fetchTasks();
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;
  if (!account) return <div className="p-8 text-center text-red-500">Account not found.</div>;

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
            
            {parentAccount && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-gray-500 text-sm font-medium">Branch of:</span>
                <Link href={`/accounts/${parentAccount.id}`}>
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-sm font-bold border border-blue-100 hover:bg-blue-100 transition-colors inline-block">
                    🏢 {parentAccount.name}
                  </span>
                </Link>
              </div>
            )}

            <div className="flex items-center gap-4 mt-4 text-gray-600 font-medium">
              <span className="bg-gray-100 px-3 py-1 rounded-full text-sm">{account.territory || 'No Territory'}</span>
              <span>{account.phone || 'No Phone'}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                account.status === 'Inactive' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
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
          
          {account.is_parent && (
            <div className="bg-white border border-blue-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-blue-200 bg-blue-50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-blue-900">Attached Locations</h2>
                <span className="bg-blue-200 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">{childBranches.length}</span>
              </div>
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {childBranches.length > 0 ? (
                  childBranches.map((branch) => (
                    <Link key={branch.id} href={`/accounts/${branch.id}`} className="block p-4 hover:bg-blue-50 transition-colors group">
                      <div className="font-bold text-gray-900 group-hover:text-blue-700">{branch.name}</div>
                    </Link>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500 text-sm">No branches attached.</div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Contacts</h2>
              <Link href="/contacts/new" className="text-blue-600 hover:underline text-sm font-bold">+ Add</Link>
            </div>
            <div className="divide-y divide-gray-100">
              {contacts.length > 0 ? (
                contacts.map((contact) => (
                  <div key={contact.id} className="p-6 hover:bg-gray-50">
                    <div className="font-bold text-gray-900 text-lg mb-1">{contact.first_name} {contact.last_name}</div>
                    <div className="text-sm text-blue-600 font-medium mb-2">{contact.title || 'Staff'}</div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">No contacts added.</div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Tasks & Field Notes */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* NEW: Action Items Box */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Open Action Items</h2>
            </div>
            
            {/* Quick Add Task */}
            <form onSubmit={handleAddTask} className="p-4 border-b border-gray-100 bg-gray-50 flex gap-2">
              <input 
                type="text" 
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Add a new task for this branch..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700">
                Add
              </button>
            </form>

            {/* Account Task List */}
            <div className="divide-y divide-gray-100">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <div key={task.id} className={`p-4 px-6 flex items-center gap-4 hover:bg-gray-50 ${task.is_completed ? 'bg-gray-50 opacity-75' : 'bg-white'}`}>
                    <input 
                      type="checkbox" 
                      checked={task.is_completed}
                      onChange={() => toggleComplete(task.id, task.is_completed)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 cursor-pointer"
                    />
                    <p className={`flex-1 font-medium ${task.is_completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {task.title}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-gray-500 text-sm">No open tasks for this account.</div>
              )}
            </div>
          </div>

          {/* Field Notes Box */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Field Notes & Activity</h2>
              <Link href={`/calls/new?accountId=${accountId}`}>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-blue-700">+ Log Visit</button>
              </Link>
            </div>
            
            <div className="divide-y divide-gray-100">
              {calls.length > 0 ? (
                calls.map((call) => (
                  <div key={call.id} className="p-6 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full uppercase">{call.type}</span>
                      <span className="text-sm font-bold text-gray-500">{new Date(call.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{call.notes}</p>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-gray-500">No visits logged for this account yet.</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}