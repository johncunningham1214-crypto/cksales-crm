"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { SALES_TEAM } from '@/lib/constants';

export default function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters for Tasks
  const [salesmanFilter, setSalesmanFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('Pending'); // Defaults to open tasks

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesmanFilter, statusFilter]); // Re-fetch on filter change

  async function fetchTasks() {
    setIsLoading(true);
    
    let query = supabase
      .from('tasks')
      .select('*, accounts(name)')
      .order('due_date', { ascending: true });

    // Apply Salesman Filter
    if (salesmanFilter !== 'All') {
      query = query.eq('rep_name', salesmanFilter);
    }

    // Apply Status Filter
    if (statusFilter !== 'All') {
      if (statusFilter === 'Pending') {
        query = query.neq('status', 'Completed'); // Show everything except Completed
      } else {
        query = query.eq('status', 'Completed'); // Show only Completed
      }
    }

    const { data, error } = await query;
    if (data) setTasks(data);
    if (error) console.error("Error fetching tasks:", error);
    
    setIsLoading(false);
  }

  const toggleTaskStatus = async (taskId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    
    // Optimistic UI update (makes the UI feel faster)
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));

    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId);

    if (error) {
      console.error("Error updating task status:", error);
      fetchTasks(); // Revert on error
    } else {
      // Re-fetch to clear out if they switched it away from the current filter
      fetchTasks();
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Tasks</h1>
          <p className="text-gray-500 mt-2 font-medium">Manage your action items and follow-ups.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          
          {/* Status Filter */}
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-3 text-sm font-bold text-gray-700 bg-white focus:ring-2 focus:ring-blue-600 outline-none shadow-sm"
          >
            <option value="Pending">Open / Pending</option>
            <option value="Completed">Completed</option>
            <option value="All">All Statuses</option>
          </select>

          {/* Salesman Filter */}
          <select 
            value={salesmanFilter}
            onChange={(e) => setSalesmanFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-3 text-sm font-bold text-gray-700 bg-white focus:ring-2 focus:ring-blue-600 outline-none shadow-sm"
          >
            <option value="All">Entire Team</option>
            {SALES_TEAM.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <Link 
            href="/tasks/new"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap text-center"
          >
            + New Task
          </Link>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Loading tasks...</div>
        ) : tasks.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {tasks.map((task) => (
              <div key={task.id} className="p-6 hover:bg-gray-50 transition-colors flex items-start gap-4">
                
                {/* Checkbox Toggle */}
                <button 
                  onClick={() => toggleTaskStatus(task.id, task.status)}
                  className={`mt-1 shrink-0 w-6 h-6 rounded border flex items-center justify-center transition-colors ${
                    task.status === 'Completed' 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : 'border-gray-300 hover:border-blue-500'
                  }`}
                >
                  {task.status === 'Completed' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  )}
                </button>

                {/* Task Details */}
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-1">
                    <h3 className={`text-lg font-bold ${task.status === 'Completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {task.title}
                    </h3>
                    
                    {/* Tags Container */}
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {task.rep_name && (
                        <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-1 rounded border border-gray-200">
                          {task.rep_name}
                        </span>
                      )}
                      {task.due_date && (
                        <span className={`text-xs font-bold px-2 py-1 rounded border ${
                          new Date(task.due_date) < new Date() && task.status !== 'Completed'
                            ? 'bg-red-50 text-red-700 border-red-200' 
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          Due: {task.due_date}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {task.accounts && (
                    <div className="text-blue-700 font-semibold text-sm mt-1 mb-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                      {task.accounts.name}
                    </div>
                  )}

                  {task.description && (
                    <p className={`text-sm ${task.status === 'Completed' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {task.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            No tasks found for this filter.
          </div>
        )}
      </div>
    </div>
  );
}
// --- END OF FILE ---