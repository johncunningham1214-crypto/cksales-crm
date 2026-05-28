"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function GlobalTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    // We are pulling the tasks and linking them directly to the account name
    const { data, error } = await supabase
      .from('tasks') // Note: If your table is still 'action_items', change it here!
      .select(`
        *,
        accounts(name, territory)
      `)
      .order('due_date', { ascending: true }); // Closest due dates at the top
    
    if (error) {
      console.error("Error fetching tasks:", error);
    } else if (data) {
      setTasks(data);
    }
    setIsLoading(false);
  }

  // Quick-complete feature! Lets you check off tasks directly from this page.
  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Pending' ? 'Completed' : 'Pending';
    
    // 1. Update the UI instantly so it feels fast
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    // 2. Save it to the database quietly in the background
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId);

    if (error) {
      alert("Failed to update task. Check your connection.");
      fetchTasks(); // Revert if it failed
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading dispatch board...</div>;
  }

  // Split tasks into two buckets for the UI
  const pendingTasks = tasks.filter(t => t.status !== 'Completed');
  const completedTasks = tasks.filter(t => t.status === 'Completed');

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Team Tasks</h1>
          <p className="text-gray-500 mt-2 font-medium">Global dispatch board for all field reps.</p>
        </div>
        <Link href="/tasks/new" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm">
          + Add Task
        </Link>
      </div>

      {/* PENDING TASKS */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">
            Pending Actions ({pendingTasks.length})
          </h2>
        </div>
        
        <div className="divide-y divide-gray-100">
          {pendingTasks.length > 0 ? (
            pendingTasks.map((task) => (
              <div key={task.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-gray-900">{task.title}</h3>
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2.5 py-1 rounded-full">
                      Pending
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm mt-2">
                    <Link href={`/accounts/${task.account_id}`} className="font-bold text-blue-600 hover:underline">
                      🏢 {task.accounts?.name || 'Unknown Branch'}
                    </Link>
                    <span className="text-gray-500 font-medium">
                      👤 {task.rep_name || 'Unassigned'}
                    </span>
                    <span className={`font-medium ${
                      task.due_date && new Date(task.due_date) < new Date() ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      📅 {task.due_date || 'No Date'}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => toggleTaskStatus(task.id, task.status)}
                  className="w-full md:w-auto bg-white border-2 border-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-bold hover:border-green-500 hover:text-green-600 hover:bg-green-50 transition-all shrink-0"
                >
                  ✓ Mark Complete
                </button>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-gray-500">
              No pending tasks. The board is clear!
            </div>
          )}
        </div>
      </div>

      {/* COMPLETED TASKS (Shows at the bottom) */}
      {completedTasks.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl shadow-sm overflow-hidden opacity-75 hover:opacity-100 transition-opacity">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-100">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
              Recently Completed ({completedTasks.length})
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {completedTasks.map((task) => (
              <div key={task.id} className="p-4 px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="font-bold text-gray-600 line-through">{task.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {task.accounts?.name} • Completed by {task.rep_name}
                  </p>
                </div>
                <button 
                  onClick={() => toggleTaskStatus(task.id, task.status)}
                  className="text-sm font-bold text-blue-600 hover:underline"
                >
                  Undo
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}