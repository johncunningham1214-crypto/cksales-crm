"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { SALES_TEAM, VENDORS } from '@/lib/constants'; // NEW: Added VENDORS

export default function Dashboard() {
  const [stats, setStats] = useState({
    upcomingVisits: 0,
    openTasks: 0,
    callsThisWeek: 0,
    activeAccounts: 0,
    needsAttention: 0 
  });
  
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoadingKPIs, setIsLoadingKPIs] = useState(true);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  
  const [dashboardFilter, setDashboardFilter] = useState('All');
  
  // NEW: Feed-specific filters
  const [feedSalesmanFilter, setFeedSalesmanFilter] = useState('All');
  const [feedVendorFilter, setFeedVendorFilter] = useState('All');

  // EFFECT 1: Fetch the top KPI widgets
  useEffect(() => {
    async function fetchKPIs() {
      setIsLoadingKPIs(true);
      
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0];

      let visitsQuery = supabase.from('events').select('*', { count: 'exact', head: true }).gte('event_date', todayStr);
      let tasksQuery = supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'Completed');
      let callsQuery = supabase.from('calls').select('*', { count: 'exact', head: true }).gte('date', startOfWeekStr);
      let accountsQuery = supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('status', 'Active');
      
      const { data: recentCalls } = await supabase.from('calls').select('account_id').gte('date', threeMonthsAgoStr);
      const recentlyVisitedIds = recentCalls ? [...new Set(recentCalls.map(c => c.account_id).filter(Boolean))] : [];

      let neglectedQuery = supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('status', 'Active');

      if (recentlyVisitedIds.length > 0) {
        neglectedQuery = neglectedQuery.not('id', 'in', `(${recentlyVisitedIds.join(',')})`);
      }

      if (dashboardFilter !== 'All') {
        visitsQuery = visitsQuery.eq('salesman', dashboardFilter);
        tasksQuery = tasksQuery.eq('rep_name', dashboardFilter);
        callsQuery = callsQuery.eq('rep_name', dashboardFilter);
        accountsQuery = accountsQuery.contains('assigned_reps', [dashboardFilter]);
        neglectedQuery = neglectedQuery.contains('assigned_reps', [dashboardFilter]);
      }

      const [
        { count: visitsCount },
        { count: tasksCount },
        { count: callsCount },
        { count: accountsCount },
        { count: needsAttentionCount } 
      ] = await Promise.all([
        visitsQuery,
        tasksQuery,
        callsQuery,
        accountsQuery,
        neglectedQuery 
      ]);

      setStats({
        upcomingVisits: visitsCount || 0,
        openTasks: tasksCount || 0,
        callsThisWeek: callsCount || 0,
        activeAccounts: accountsCount || 0,
        needsAttention: needsAttentionCount || 0
      });

      setIsLoadingKPIs(false);
    }

    fetchKPIs();
  }, [dashboardFilter]); 

  // EFFECT 2: Fetch the Activity Feed (Now uses the new vendor filter too)
  useEffect(() => {
    async function fetchFeed() {
      setIsFeedLoading(true);
      
      let query = supabase
        .from('calls')
        .select('*, accounts(name)')
        .order('date', { ascending: false })
        .limit(10); // Upped to 10 so you can see more history when filtering

      if (feedSalesmanFilter !== 'All') {
        query = query.eq('rep_name', feedSalesmanFilter);
      }

      // NEW: Vendor Filter Logic
      if (feedVendorFilter !== 'All') {
        query = query.contains('vendors', [feedVendorFilter]);
      }

      const { data } = await query;
      if (data) setRecentActivity(data);
      
      setIsFeedLoading(false);
    }

    fetchFeed();
  }, [feedSalesmanFilter, feedVendorFilter]); // Re-fetch if either dropdown changes

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      
      {/* GLOBAL HEADER & FILTER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Territory Overview</h1>
          <p className="text-gray-500 font-medium mt-1">Live field metrics & alerts.</p>
        </div>
        
        <div className="w-full md:w-auto">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
            Viewing KPIs For:
          </label>
          <select 
            value={dashboardFilter}
            onChange={(e) => setDashboardFilter(e.target.value)}
            className="w-full md:w-64 border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-bold text-gray-900 bg-gray-50 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white outline-none transition-all shadow-sm"
          >
            <option value="All">Entire Sales Team</option>
            {SALES_TEAM.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI WIDGETS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
        {isLoadingKPIs && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl">
            <span className="bg-gray-900 text-white font-bold px-4 py-2 rounded-full text-sm shadow-xl animate-pulse">Calculating Metrics...</span>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl">🗓️</div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-900">{stats.upcomingVisits}</h3>
            <p className="text-sm font-bold text-gray-500 mt-1">Upcoming Visits</p>
          </div>
          <Link href="/calendar" className="mt-4 text-sm font-bold text-blue-600 hover:underline">View Schedule →</Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 text-xl">⚡</div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-900">{stats.openTasks}</h3>
            <p className="text-sm font-bold text-gray-500 mt-1">Pending Tasks</p>
          </div>
          <Link href="/tasks" className="mt-4 text-sm font-bold text-blue-600 hover:underline">Manage Action Items →</Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xl">🤝</div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-900">{stats.callsThisWeek}</h3>
            <p className="text-sm font-bold text-gray-500 mt-1">Calls Logged This Week</p>
          </div>
          <Link href="/calls/new/report" className="mt-4 text-sm font-bold text-blue-600 hover:underline">Generate Report →</Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
          {stats.needsAttention > 0 && <div className="absolute inset-0 border-2 border-red-400 rounded-2xl animate-pulse pointer-events-none"></div>}
          <div className="flex justify-between items-start mb-4 z-10 relative">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xl">🏢</div>
            {stats.needsAttention > 0 && (
              <Link href="/accounts" className="bg-red-50 text-red-700 border border-red-200 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-red-100 transition-colors flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                {stats.needsAttention} Needs Attention
              </Link>
            )}
          </div>
          <div className="z-10 relative">
            <h3 className="text-3xl font-black text-gray-900">{stats.activeAccounts}</h3>
            <p className="text-sm font-bold text-gray-500 mt-1">Assigned Accounts</p>
          </div>
          <Link href="/accounts" className="mt-4 text-sm font-bold text-blue-600 hover:underline z-10 relative">View Directory →</Link>
        </div>
      </div>

      {/* RECENT ACTIVITY FEED */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mt-8">
        
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 whitespace-nowrap">
            Latest Field Activity 
            {isFeedLoading && <span className="text-xs text-gray-400 font-normal animate-pulse">(Updating...)</span>}
          </h2>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            
            {/* NEW: Vendor Feed Filter */}
            <select 
              value={feedVendorFilter}
              onChange={(e) => setFeedVendorFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-700 bg-white focus:ring-2 focus:ring-blue-600 outline-none w-full sm:w-auto shadow-sm"
            >
              <option value="All">All Vendors</option>
              {VENDORS.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>

            <select 
              value={feedSalesmanFilter}
              onChange={(e) => setFeedSalesmanFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-700 bg-white focus:ring-2 focus:ring-blue-600 outline-none w-full sm:w-auto shadow-sm"
            >
              <option value="All">Entire Team</option>
              {SALES_TEAM.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            <Link href="/calls/new" className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-4 py-2 rounded-lg text-center whitespace-nowrap shadow-sm">
              + Log Visit
            </Link>
          </div>
        </div>
        
        <div className="divide-y divide-gray-100 min-h-[200px] max-h-[600px] overflow-y-auto">
          {isFeedLoading && recentActivity.length === 0 ? (
             <div className="p-12 text-center text-gray-500">Loading feed...</div>
          ) : recentActivity.length > 0 ? (
            recentActivity.map((call) => {
              const [year, month, day] = call.date.split('-');
              const formattedDate = new Date(Number(year), Number(month) - 1, Number(day))
                .toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              return (
                <div key={call.id} className="p-6 hover:bg-gray-50 transition-colors flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-sm shrink-0 mt-1 border border-gray-200">
                    {call.rep_name ? call.rep_name.charAt(0) : '?'}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium">
                      <span className="font-bold">{call.rep_name || 'A team member'}</span> completed a <span className="font-bold text-blue-600">{call.type}</span> at <span className="font-bold">{call.accounts ? call.accounts.name : 'an unknown account'}</span>.
                    </p>
                    <p className="text-xs text-gray-500 mt-1 font-bold">{formattedDate}</p>
                    
                    {/* NEW: Display Vendor Tags */}
                    {call.vendors && call.vendors.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {call.vendors.map((vendor: string) => (
                          <span key={vendor} className="bg-gray-800 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                            {vendor}
                          </span>
                        ))}
                      </div>
                    )}

                    {call.notes && (
                      <p className="text-sm text-gray-600 mt-3 bg-white p-3 border border-gray-100 rounded-lg italic shadow-sm">
                        "{call.notes}"
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-gray-500">
              No recent field activity logged for this filter.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
// --- END OF FILE ---