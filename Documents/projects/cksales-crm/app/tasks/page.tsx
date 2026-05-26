"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function ActionItemsPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);

// Fetch all tasks, plus the names of any linked accounts or contacts
  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('action_items')
      .select(`
        *,
        accounts ( name ),
        contacts ( first_name, last_name )
      `)
      .order('is_completed', { ascending: true }) // Open tasks at the top
      .order('created_at', { ascending: false }); // Newest tasks first

    if (error) {
      console.error("Fetch Error:", error);
      alert("Error loading tasks: " + error.message);
    }

    if (data) setTasks(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

// Quick-add a global task (no specific account linked yet)
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const { error } = await supabase
      .from('action_items')
      .insert([{ title: newTaskTitle, is_completed: false }]);

    if (error) {
      // This will now pop up an alert telling us exactly what the database is mad about!
      console.error("Database Error:", error);
      alert("Failed to save task: " + error.message);
    } else {
      setNewTaskTitle('');
      fetchTasks();
    }
  };

  // Toggle a task between complete/incomplete
  const toggleComplete = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('action_items')
      .update({ is_completed: !currentStatus })
      .eq('id', id);

    if (!error) fetchTasks();
  };

  // Delete a task permanently
  const deleteTask = async (id: string) => {
    if (!window.confirm('Delete this task?')) return;
    
    const { error } = await supabase
      .from('action_items')
      .delete()
      .eq('id', id);

    if (!error) fetchTasks();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-gray-900">Action Items</h1>
        <p className="text-gray-600 mt-2 font-medium">Track your follow-ups, promises, and to-dos.</p>
      </div>

      {/* Quick Add Form */}
      <form onSubmit={handleAddTask} className="mb-8 flex gap-3">
        <input 
          type="text" 
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="e.g., Email new LG pricing sheet to Johnstone Supply..."
          className="flex-1 border border-gray-300 rounded-xl p-4 text-lg shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
        />
        <button 
          type="submit" 
          className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-700 shadow-sm transition-colors"
        >
          Add Task
        </button>
      </form>

      {/* Task List */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 font-medium">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-medium bg-gray-50">
            You're all caught up! No open action items.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tasks.map((task) => (
              <div key={task.id} className={`p-4 px-6 flex items-center gap-4 transition-colors hover:bg-gray-50 group ${task.is_completed ? 'bg-gray-50 opacity-75' : 'bg-white'}`}>
                
                {/* Checkbox */}
                <input 
                  type="checkbox" 
                  checked={task.is_completed}
                  onChange={() => toggleComplete(task.id, task.is_completed)}
                  className="w-6 h-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />

                {/* Task Details */}
                <div className="flex-1">
                  <p className={`text-lg font-bold ${task.is_completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                    {task.title}
                  </p>
                  
                  {/* Show Account/Contact Badges if they exist */}
                  {(task.accounts || task.contacts) && (
                    <div className="flex gap-2 mt-1">
                      {task.accounts && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          🏢 {task.accounts.name}
                        </span>
                      )}
                      {task.contacts && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          👤 {task.contacts.first_name} {task.contacts.last_name}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Delete Button */}
                <button 
                  onClick={() => deleteTask(task.id)}
                  className="text-red-400 hover:text-red-600 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}