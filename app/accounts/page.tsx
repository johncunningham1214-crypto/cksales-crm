"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { SALES_TEAM } from '@/lib/constants';

export default function AccountsDirectory() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [salesmanFilter, setSalesmanFilter] = useState('All');

  useEffect(() => {
    async function fetchAccounts() {
      setIsLoading(true);
      
      let query = supabase
        .from('accounts')
        .select('*')
        .order('name');
      
      if (salesmanFilter !== 'All') {
        query = query.contains('assigned_reps', [salesmanFilter]);
      }
      
      const { data, error } = await query;
      if (data) setAccounts(data);
      if (error) console.error("Error fetching accounts:", error);
      
      setIsLoading(false);
    }
    
    fetchAccounts();
  }, [salesmanFilter]);

  // Filter by search term locally (faster than querying the database on every keystroke)
  const filteredAccounts = accounts.filter(acc => 
    acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (acc.address && acc.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    // Notice the responsive padding: p-4 on mobile, md:p-8 on desktop!
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      
      {/* Header & Mobile-Friendly Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-gray-200 rounded-2xl p-5 md:p-6 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Accounts</h1>
          <p className="text-gray-500 font-medium mt-1 text-sm md:text-base">Directory of {filteredAccounts.length} branches.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              🔍
            </span>
            <input 
              type="text" 
              placeholder="Search by name or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none shadow-sm"
            />
          </div>

          {/* Salesman Filter */}
          <select 
            value={salesmanFilter}
            onChange={(e) => setSalesmanFilter(e.target.value)}
            className="w-full sm:w-auto border border-gray-300 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 bg-white focus:ring-2 focus:ring-blue-600 outline-none shadow-sm"
          >
            <option value="All">Entire Team</option>
            {SALES_TEAM.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          {/* Add Button - Full width on mobile, auto on desktop */}
          <Link 
            href="/accounts/new" 
            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm text-center whitespace-nowrap"
          >
            + New Account
          </Link>
        </div>
      </div>

      {/* Grid Layout (Stacks on mobile, 2 cols on tablet, 3 cols on desktop) */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500 font-medium">Loading accounts...</div>
      ) : filteredAccounts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredAccounts.map(account => (
            <Link 
              key={account.id} 
              href={`/accounts/${account.id}`} 
              className="block bg-white border border-gray-200 rounded-2xl p-5 md:p-6 shadow-sm hover:border-blue-500 hover:shadow-md transition-all active:bg-gray-50 group flex flex-col h-full"
            >
              {/* Card Header */}
              <div className="flex justify-between items-start gap-3 mb-3">
                <h3 className="text-lg md:text-xl font-black text-gray-900 leading-tight group-hover:text-blue-600 transition-colors">
                  {account.name}
                </h3>
                <span className={`shrink-0 text-[10px] md:text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${account.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {account.status || 'Active'}
                </span>
              </div>
              
              {/* Card Body (Grows to push badges to the bottom) */}
              <div className="space-y-2 mb-4 flex-1">
                {account.address ? (
                  <p className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">📍</span> 
                    <span className="leading-snug">{account.address}</span>
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">📍</span> No address
                  </p>
                )}
                
                {account.phone && (
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <span className="shrink-0">📞</span> 
                    <span>{account.phone}</span>
                  </p>
                )}
              </div>
              
              {/* Card Footer (Badges) */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100 mt-auto">
                {account.parent_id && (
                  <span className="bg-purple-50 text-purple-700 border border-purple-100 text-[10px] md:text-xs font-bold px-2 py-1 rounded">
                    Branch
                  </span>
                )}
                {account.territory && (
                  <span className="bg-gray-100 text-gray-700 border border-gray-200 text-[10px] md:text-xs font-bold px-2 py-1 rounded">
                    {account.territory}
                  </span>
                )}
                {account.assigned_reps && account.assigned_reps.map((rep: string) => (
                  <span key={rep} className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] md:text-xs font-bold px-2 py-1 rounded">
                    👤 {rep}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-2xl shadow-sm text-gray-500 font-medium">
          No accounts found matching your search.
        </div>
      )}
    </div>
  );
}
// --- END OF FILE ---