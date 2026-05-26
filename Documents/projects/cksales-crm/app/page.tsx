"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function Dashboard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Toggle a task's completion status directly from the dashboard
  const toggleComplete = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('action_items')
      .update({ is_completed: !currentStatus })
      .eq('id', id);
      
    if (!error) {
      // Filter the task out of the list so it disappears when checked
      setTasks(tasks.filter(task => task.id !== id));
    }
  };

  useEffect(() => {
    async function fetchDashboardData() {
      // 1. Fetch top 5 OPEN tasks (combining global and branch-specific)
      const { data: tasksData } = await supabase
        .from('action_items')
        .select(`
          *,
          accounts ( name )
        `)
        .eq('is_completed', false)
        .order('created_at', { ascending: false })
        .limit(5);

      // 2. Fetch the 5 most recent field notes/calls, including the branch name
      const { data: callsData } = await supabase
        .from('calls')
        .select(`
          *,
          accounts ( name )
        `)
        .order('date', { ascending: false })
        .limit(5);

      if (tasksData) setTasks(tasksData);
      if (callsData) setRecentCalls(callsData);
      
      setIsLoading(false);
    }

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading your command center...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      
      {/* HEADER & QUICK ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900">Daily Briefing</h1>
          <p className="text-gray-500 mt-2 font-medium">Your active territory overview.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/calls/new">
            <button className="bg-blue-600 text-white px-5 py-3 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm">
              + Log Visit
            </button>
          </Link>
          <Link href="/tasks">
            <button className="bg-white border border-gray-300 text-gray-700 px-5 py-3 rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors shadow-sm">
              + Add Task
            </button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: Priority Tasks */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
          <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">Priority Tasks</h2>
            <Link href="/tasks" className="text-blue-600 hover:underline text-sm font-bold">View All →</Link>
          </div>
          
          <div className="divide-y divide-gray-100 flex-1">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <div key={task.id} className="p-5 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={task.is_completed}
                    onChange={() => toggleComplete(task.id, task.is_completed)}
                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600 cursor-pointer"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{task.title}</p>
                    {task.accounts?.name && (
                      <Link href={`/accounts/${task.account_id}`}>
                        <span className="inline-block mt-2 bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded hover:bg-blue-100 transition-colors">
                          🏢 {task.accounts.name}
                        </span>
                      </Link>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500 text-sm h-full flex items-center justify-center">
                All caught up! No open tasks.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Recent Field Activity */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
          <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">Recent Field Activity</h2>
            <Link href="/accounts" className="text-blue-600 hover:underline text-sm font-bold">Browse Accounts →</Link>
          </div>
          
          <div className="divide-y divide-gray-100 flex-1">
            {recentCalls.length > 0 ? (
              recentCalls.map((call) => (
                <div key={call.id} className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <Link href={`/accounts/${call.account_id}`}>
                      <span className="font-bold text-gray-900 hover:text-blue-600 transition-colors">
                        {call.accounts?.name || 'Unknown Account'}
                      </span>
                    </Link>
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {new Date(call.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="mb-2">
                    <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase tracking-wider">
                      {call.type}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-2">{call.notes}</p>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500 text-sm h-full flex items-center justify-center">
                No recent visits logged. Time to hit the road!
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}