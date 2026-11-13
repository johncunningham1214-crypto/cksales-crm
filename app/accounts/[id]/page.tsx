"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function AccountProfile() {
  const params = useParams();
  const accountId = params.id as string;

  const [account, setAccount] = useState<any>(null);
  const [calls, setCalls] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]); 
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Account notes: a running log stored in the accounts.notes column
  const [noteDraft, setNoteDraft] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesEdit, setNotesEdit] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesError, setNotesError] = useState('');

  async function saveNotes(newNotes: string) {
    const { data, error } = await supabase
      .from('accounts')
      .update({ notes: newNotes.trim() || null })
      .eq('id', accountId)
      .select('notes');

    if (error || !data || data.length === 0) {
      setNotesError(error?.message || 'Could not save the note. Please try again.');
      return false;
    }
    setAccount((prev: any) => ({ ...prev, notes: data[0].notes }));
    return true;
  }

  async function handleAddNote() {
    const text = noteDraft.trim();
    if (!text || isSavingNotes) return;
    setIsSavingNotes(true);
    setNotesError('');

    // Re-read the latest notes first so a teammate's recent note isn't overwritten
    const { data: latest } = await supabase.from('accounts').select('notes').eq('id', accountId).single();
    const existing = latest?.notes ?? account.notes ?? '';

    const stamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const entry = `${stamp}: ${text}`;
    const saved = await saveNotes(existing ? `${entry}\n\n${existing}` : entry);

    if (saved) setNoteDraft('');
    setIsSavingNotes(false);
  }

  async function handleSaveNotesEdit() {
    if (isSavingNotes) return;
    setIsSavingNotes(true);
    setNotesError('');
    const saved = await saveNotes(notesEdit);
    if (saved) setIsEditingNotes(false);
    setIsSavingNotes(false);
  }

  useEffect(() => {
    async function fetchAccountData() {
      const today = new Date().toISOString().split('T')[0];

      // 1. Fetch the main account details
      const { data: accountData } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .single();
        
      if (accountData) setAccount(accountData);

      // 2. Find any branches (children) that belong to this account
      const { data: childAccounts } = await supabase
        .from('accounts')
        .select('id')
        .eq('parent_id', accountId);

      // Create an array of IDs starting with the parent, then pushing all child IDs
      const relevantAccountIds = [accountId];
      if (childAccounts) {
        childAccounts.forEach(child => relevantAccountIds.push(child.id));
      }

      // 3. Fetch Contacts (HQ specific)
      const { data: contactsData } = await supabase
        .from('contacts')
        .select('*')
        .eq('account_id', accountId)
        .order('name');
        
      if (contactsData) setContacts(contactsData);

      // 4. Fetch Calls, Tasks, and Events using .in()
      // NEW: Added `vendors` to the calls select statement!
      const [callsRes, tasksRes, eventsRes] = await Promise.all([
        supabase.from('calls').select('id, date, type, notes, rep_name, account_id, vendors, accounts(name)').in('account_id', relevantAccountIds).order('date', { ascending: false }),
        supabase.from('tasks').select('*, accounts(name)').in('account_id', relevantAccountIds).order('due_date', { ascending: true }),
        supabase.from('events').select('*, accounts(name)').in('account_id', relevantAccountIds).gte('event_date', today).order('event_date', { ascending: true })
      ]);

      if (callsRes.data) setCalls(callsRes.data);
      if (tasksRes.data) setTasks(tasksRes.data);
      if (eventsRes.data) setUpcomingEvents(eventsRes.data);
      
      setIsLoading(false);
    }

    if (accountId) fetchAccountData();
  }, [accountId]);

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading branch profile...</div>;
  if (!account) return <div className="p-8 text-center text-red-500">Account not found.</div>;

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
            <p className="flex items-center gap-2"><span>📍</span> {account.address || 'No address on file'}</p>
            <p className="flex items-center gap-2"><span>📞</span> {account.phone || 'No phone number on file'}</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-5">
            <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-1 rounded">
              {account.territory || 'Unassigned Territory'}
            </span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded ${account.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {account.status || 'Active'}
            </span>
            {account.parent_id && (
              <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-1 rounded">Satellite Branch</span>
            )}
            {/* Display Assigned Reps */}
            {account.assigned_reps && account.assigned_reps.map((rep: string) => (
              <span key={rep} className="bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold px-2 py-1 rounded-md">
                👤 {rep}
              </span>
            ))}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
          <Link href={`/accounts/${account.id}/edit`} className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-bold hover:bg-gray-50 transition-colors shadow-sm text-center">
            ✏️ Edit Account
          </Link>
          <Link href={`/calls/new?accountId=${account.id}`} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm text-center">
            + Log Visit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Contacts */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">HQ Contacts</h2>
              <Link href={`/contacts/new?accountId=${account.id}`} className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg">
                + Add
              </Link>
            </div>
            
            <div className="divide-y divide-gray-100">
              {contacts.length > 0 ? (
                contacts.map(contact => (
                  <div key={contact.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <Link href={`/contacts/${contact.id}/edit`} className="group flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{contact.name}</h3>
                      <span className="opacity-0 group-hover:opacity-100 text-xs font-bold text-blue-600 transition-opacity">✎ Edit</span>
                    </Link>
                    <p className="text-sm text-gray-500 font-medium mb-3">{contact.title || 'Staff'}</p>
                    <div className="text-sm text-gray-600 space-y-1.5">
                      {contact.phone && <a href={`tel:${contact.phone}`} className="flex items-center gap-2 hover:text-blue-600 transition-colors"><span>📞</span> {contact.phone}</a>}
                      {contact.email && <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:text-blue-600 transition-colors"><span>✉️</span> {contact.email}</a>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">No contacts listed.</div>
              )}
            </div>
          </div>

          {/* Account Notes */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Notes</h2>
              {account.notes && !isEditingNotes && (
                <button
                  type="button"
                  onClick={() => { setNotesEdit(account.notes || ''); setNotesError(''); setIsEditingNotes(true); }}
                  className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg"
                >
                  ✎ Edit
                </button>
              )}
            </div>

            <div className="p-6 space-y-4">
              {notesError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm font-bold border border-red-200">{notesError}</div>
              )}

              {isEditingNotes ? (
                <>
                  <textarea
                    value={notesEdit}
                    onChange={(e) => setNotesEdit(e.target.value)}
                    rows={10}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none transition-shadow"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleSaveNotesEdit}
                      disabled={isSavingNotes}
                      className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {isSavingNotes ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsEditingNotes(false); setNotesError(''); }}
                      disabled={isSavingNotes}
                      className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={3}
                    placeholder="Type a new note..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none transition-shadow"
                  />
                  <button
                    type="button"
                    onClick={handleAddNote}
                    disabled={isSavingNotes || !noteDraft.trim()}
                    className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isSavingNotes ? 'Saving...' : '+ Add Note'}
                  </button>

                  {account.notes ? (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words border-t border-gray-100 pt-4">{account.notes}</p>
                  ) : (
                    <p className="text-center text-gray-500 text-sm">No notes yet.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Events, Tasks & Activity Stack */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Upcoming Visits */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Upcoming Visits</h2>
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">{upcomingEvents.length} Scheduled</span>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {upcomingEvents.map(event => {
                  const [year, month, day] = event.event_date.split('-');
                  const formattedDate = new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

                  return (
                    <div key={event.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row gap-4 items-start md:items-center">
                      <div className="md:w-32 shrink-0"><span className="text-sm font-bold text-blue-600 uppercase tracking-wider">{formattedDate}</span></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <h3 className="text-lg font-bold text-gray-900">{event.title}</h3>
                          {event.account_id !== account.id && event.accounts && <span className="bg-purple-50 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full border border-purple-200">📍 {event.accounts.name}</span>}
                          {event.salesman && <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-1 rounded-full border border-gray-200">{event.salesman}</span>}
                        </div>
                        {event.description && <p className="text-gray-500 text-sm mt-1">{event.description}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 text-sm">No upcoming visits scheduled.</div>
            )}
          </div>

          {/* Open Tasks */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Open Tasks</h2>
              <Link href={`/tasks/new?accountId=${account.id}`} className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg">+ Add Task</Link>
            </div>
            
            <div className="divide-y divide-gray-100">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <div key={task.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900">{task.title}</h3>
                        {task.account_id !== account.id && task.accounts && <span className="bg-purple-50 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full border border-purple-200">📍 {task.accounts.name}</span>}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Due: <span className="font-medium text-gray-700">{task.due_date || 'No date set'}</span> {task.rep_name && ` • Assigned to: ${task.rep_name}`}</p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full shrink-0 ${task.status?.toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {task.status || 'Pending'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">No open tasks.</div>
              )}
            </div>
          </div>

          {/* Activity History */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Network Activity</h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              {calls.length > 0 ? (
                calls.map((call) => (
                  <div key={call.id} className="p-6 hover:bg-gray-50 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {call.rep_name ? call.rep_name.charAt(0) : '?'}
                        </div>
                        <div>
                          <p className="text-sm text-gray-900 font-medium">
                            <span className="font-bold">{call.rep_name || 'A team member'}</span> logged a <span className="font-bold">{call.type}</span>
                            {call.account_id !== account.id && call.accounts && <span> at <span className="text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 ml-1">📍 {call.accounts.name}</span></span>}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{call.date}</p>
                        </div>
                      </div>
                      
                      {/* NEW: Edit Call Button */}
                      <Link 
                        href={`/calls/${call.id}/edit`} 
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md"
                      >
                        ✎ Edit Note
                      </Link>
                    </div>

                    <div className="pl-11 mt-2">
                      {/* NEW: Vendor Tags in Account Feed */}
                      {call.vendors && call.vendors.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {call.vendors.map((vendor: string) => (
                            <span key={vendor} className="bg-gray-800 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                              {vendor}
                            </span>
                          ))}
                        </div>
                      )}

                      {call.notes && (
                        <p className="text-sm text-gray-600 bg-white p-3 border border-gray-100 rounded-lg italic shadow-sm">
                          "{call.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">No activity logged in this network yet.</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
// --- END OF FILE ---