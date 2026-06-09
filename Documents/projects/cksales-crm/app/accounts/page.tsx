"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { TERRITORIES, SALES_TEAM } from '@/lib/constants';

export default function AccountsDirectory() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [territoryFilter, setTerritoryFilter] = useState('All');
  const [salesmanFilter, setSalesmanFilter] = useState('All');
  const [accountTypeFilter, setAccountTypeFilter] = useState('All'); // NEW: Hub vs Branch filter

  useEffect(() => {
    async function fetchAccounts() {
      setIsLoading(true);
      
      let query = supabase
        .from('accounts')
        .select('*')
        .order('name');
        
      // Filter by Territory
      if (territoryFilter !== 'All') {
        query = query.eq('territory', territoryFilter);
      }

      // Filter by Assigned Salesman
      if (salesmanFilter !== 'All') {
        query = query.contains('assigned_reps', [salesmanFilter]);
      }

      // NEW: Filter by Account Type
      if (accountTypeFilter === 'HQ') {
        query = query.is('parent_id', null); // Main Hubs have NO parent
      } else if (accountTypeFilter === 'Branch') {
        query = query.not('parent_id', 'is', null); // Branches ALWAYS have a parent
      }

      const { data, error } = await query;
      
      if (data) setAccounts(data);
      if (error) console.error("Error fetching accounts:", error);
      
      setIsLoading(false);
    }

    fetchAccounts();
  }, [territoryFilter, salesmanFilter, accountTypeFilter]); // Added the new filter here

  const filteredAccounts = accounts.filter(acc => 
    (acc.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (acc.address?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Accounts Directory</h1>
          <p className="text-gray-500 mt-2 font-medium">Manage your network of distributors and branches.</p>
        </div>
        <Link 
          href="/accounts/new"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
        >
          + Add Account
        </Link>
      </div>

      {/* Control Panel / Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Search Bar */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Search</label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            <input 
              type="text" 
              placeholder="Name or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none"
            />
          </div>
        </div>

        {/* NEW: Account Type Filter */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Account Type</label>
          <select 
            value={accountTypeFilter}
            onChange={(e) => setAccountTypeFilter(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
          >
            <option value="All">All Accounts</option>
            <option value="HQ">Main Hubs / HQs Only</option>
            <option value="Branch">Satellite Branches Only</option>
          </select>
        </div>

        {/* Territory Filter */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Territory</label>
          <select 
            value={territoryFilter}
            onChange={(e) => setTerritoryFilter(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
          >
            <option value="All">All Territories</option>
            {TERRITORIES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Salesman Filter */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Salesman</label>
          <select 
            value={salesmanFilter}
            onChange={(e) => setSalesmanFilter(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
          >
            <option value="All">Entire Team</option>
            {SALES_TEAM.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-gray-500 font-bold">Loading directory...</div>
      ) : filteredAccounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAccounts.map(account => (
            <Link 
              key={account.id} 
              href={`/accounts/${account.id}`}
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group flex flex-col justify-between h-full"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-black text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {account.name}
                  </h3>
                  {account.parent_id && (
                    <span title="Satellite Branch" className="text-purple-600 bg-purple-50 p-1.5 rounded-lg shrink-0">
                      🏢
                    </span>
                  )}
                </div>
                
                <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex items-start gap-2">
                  <span className="shrink-0">📍</span> 
                  {account.address || 'No address provided'}
                </p>

                {account.assigned_reps && account.assigned_reps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {account.assigned_reps.map((rep: string) => (
                      <span key={rep} className="bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold px-2 py-0.5 rounded-md">
                        {rep}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-auto pt-4 border-t border-gray-100">
                <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-1 rounded">
                  {account.territory || 'No Territory'}
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded ${
                  account.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {account.status || 'Active'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
          <p className="text-gray-500 font-medium mb-4">No accounts match your current filters.</p>
          <button 
            onClick={() => {
              setSearchTerm('');
              setTerritoryFilter('All');
              setSalesmanFilter('All');
              setAccountTypeFilter('All'); // Clear this one too!
            }}
            className="text-blue-600 font-bold hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}