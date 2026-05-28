"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function Dashboard() {
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      // Notice we added 'rep_name' right after 'notes' in this query
      const { data: calls } = await supabase
        .from('calls')
        .select(`
          id, 
          date, 
          type, 
          notes, 
          rep_name,
          accounts (name)
        `)
        .order('date', { ascending: false })
        .limit(10);

      if (calls) setRecentCalls(calls);
      setIsLoading(false);
    }

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading command center...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Daily Briefing</h1>
          <p className="text-gray-500 mt-2 font-medium">Here is the latest activity from the field.</p>
        </div>
        <Link href="/calls/new" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm">
          + Log Visit
        </Link>
      </div>

      {/* Activity Ticker */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Live Field Activity</h2>
          <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            Live
          </span>
        </div>
        
        <div className="divide-y divide-gray-100">
          {recentCalls.length > 0 ? (
            recentCalls.map((call) => (
              <div key={call.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {/* Rep Name Badge */}
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {call.rep_name ? call.rep_name.charAt(0) : '?'}
                    </div>
                    <div>
                      <p className="text-sm text-gray-900 font-medium">
                        <span className="font-bold">{call.rep_name || 'A team member'}</span> completed a <span className="font-bold">{call.type}</span> at <span className="font-bold text-blue-600">{call.accounts?.name || 'Unknown Account'}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{call.date}</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-3 pl-10 bg-white p-3 border border-gray-100 rounded-lg italic">
                  "{call.notes}"
                </p>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500 text-sm">
              No recent field activity found. Go log some visits!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}