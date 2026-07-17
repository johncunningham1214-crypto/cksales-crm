"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SALES_TEAM } from '@/lib/constants';

export default function Calendar() {
  const [events, setEvents] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Salesman Filter State
  const [salesmanFilter, setSalesmanFilter] = useState('All');

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [accountId, setAccountId] = useState('');
  const [description, setDescription] = useState('');
  const [salesman, setSalesman] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesmanFilter]); 

  async function fetchData() {
    setIsLoading(true);
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch Accounts for the dropdown form
    const { data: accountsData } = await supabase
      .from('accounts')
      .select('id, name')
      .order('name');
      
    if (accountsData) setAccounts(accountsData);

    // Fetch Events with the Filter Logic
    let query = supabase
      .from('events')
      .select('*, accounts(name)')
      .gte('event_date', today)
      .order('event_date', { ascending: true });

    if (salesmanFilter !== 'All') {
      query = query.eq('salesman', salesmanFilter);
    }
    
    const { data: eventsData, error: eventsError } = await query;
    
    if (eventsData) setEvents(eventsData);
    if (eventsError) console.error("Error fetching events:", eventsError);
    
    setIsLoading(false);
  }

  const resetForm = () => {
    setTitle('');
    setEventDate('');
    setAccountId('');
    setDescription('');
    setSalesman('');
    setEditingId(null);
    setIsAdding(false);
  };

  const handleEditClick = (event: any) => {
    setTitle(event.title);
    setEventDate(event.event_date);
    setAccountId(event.account_id ? event.account_id : '');
    setDescription(event.description || '');
    setSalesman(event.salesman || '');
    setEditingId(event.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this event? This cannot be undone.")) return;
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) {
      alert("Failed to delete: " + error.message);
    } else {
      resetForm();
      fetchData();
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !eventDate) return;
    
    setIsSubmitting(true);

    const eventPayload = {
      title: title.trim(), 
      event_date: eventDate,
      description: description.trim(),
      salesman: salesman === "Unassigned" ? null : salesman,
      account_id: accountId ? accountId : null
    };

    let error;
    if (editingId) {
      const res = await supabase.from('events').update(eventPayload).eq('id', editingId);
      error = res.error;
    } else {
      const res = await supabase.from('events').insert([eventPayload]);
      error = res.error;
    }

    if (error) {
      console.error("Error saving event:", error);
      alert("Failed to save event: " + error.message);
    } else {
      resetForm();
      fetchData();
    }
    
    setIsSubmitting(false);
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    const [year, month, day] = dateString.split('-');
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('en-US', options);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Schedule</h1>
          <p className="text-gray-500 mt-2 font-medium">Upcoming meetings and field visits.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Salesman Filter */}
          <select 
            value={salesmanFilter}
            onChange={(e) => setSalesmanFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-3 text-sm font-bold text-gray-700 bg-white focus:ring-2 focus:ring-blue-600 outline-none shadow-sm"
          >
            <option value="All">Entire Team</option>
            <option value="My Schedule">My Schedule</option>
            <option value="Unassigned">Unassigned</option>
            {SALES_TEAM.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <button 
            onClick={() => isAdding ? resetForm() : setIsAdding(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
          >
            {isAdding ? 'Cancel' : '+ New Event'}
          </button>
        </div>
      </div>

      {/* Add / Edit Event Form */}
      {isAdding && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="mb-4 pb-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">
              {editingId ? 'Edit Event' : 'Schedule New Event'}
            </h2>
            {editingId && (
              <button 
                type="button"
                onClick={() => handleDelete(editingId)}
                className="text-red-600 hover:text-red-800 text-sm font-bold bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors"
              >
                Delete Event
              </button>
            )}
          </div>

          <form onSubmit={handleSaveEvent} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">Event Title</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Lunch meeting, Product Training..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Assigned To</label>
                <select 
                  required
                  value={salesman}
                  onChange={(e) => setSalesman(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
                >
                  <option value="" disabled>Select rep...</option>
                  <option value="Unassigned">Unassigned</option>
                  <option value="My Schedule">My Schedule</option>
                  {SALES_TEAM.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Date</label>
                <input 
                  type="date" 
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">Branch Location (Optional)</label>
                <select 
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
                >
                  <option value="">-- No specific branch / Internal --</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Event Notes</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Reviewing the new boiler specs with the branch manager..."
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none resize-y"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button 
                type="submit"
                disabled={isSubmitting}
                className="bg-gray-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : (editingId ? 'Update Event' : 'Save Event')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Events Agenda List */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
           <div className="p-12 text-center text-gray-500">Loading schedule...</div>
        ) : events.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {events.map(event => (
              <div key={event.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row gap-4 items-start md:items-center group">
                
                <div className="md:w-48 shrink-0 flex flex-col">
                  <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">
                    {formatDate(event.event_date)}
                  </span>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-gray-900">{event.title}</h3>
                    
                    {event.salesman && (
                      <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-1 rounded-full border border-gray-200">
                        {event.salesman}
                      </span>
                    )}
                  </div>
                  
                  {event.accounts && (
                    <div className="text-blue-700 font-semibold text-sm mt-1 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                      {event.accounts.name}
                    </div>
                  )}

                  {event.description && (
                    <p className="text-gray-500 text-sm mt-1">{event.description}</p>
                  )}
                </div>

                <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEditClick(event)}
                    className="text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            No upcoming events found for this filter.
          </div>
        )}
      </div>
    </div>
  );
}
// --- END OF FILE ---