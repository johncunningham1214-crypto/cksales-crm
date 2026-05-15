"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const eastCoastStates = [
    'All', 'ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 
    'PA', 'DE', 'MD', 'VA', 'NC', 'SC', 'GA', 'FL'
  ];

  useEffect(() => {
    async function fetchAccounts() {
      // THE UPGRADE: We are now fetching the accounts AND their call dates!
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          *,
          calls ( date )
        `)
        .order('name');

      if (data) {
        setAccounts(data);
      } else if (error) {
        console.error("Error fetching accounts:", error);
      }
      setIsLoading(false);
    }

    fetchAccounts();
  }, []);

  const filteredAccounts = accounts.filter(account => {
    const matchesState = activeFilter === 'All' || account.territory === activeFilter;
    const matchesSearch = account.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesState && matchesSearch;
  });

  // Helper function to check if an account needs attention (over 60 days)
  const getVisitStatus = (calls: any[]) => {
    if (!calls || calls.length === 0) {
      return { text: 'Never Visited', needsAttention: true };
    }

    // Sort calls to find the most recent one
    const sortedCalls = calls.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastVisitDate = new Date(sortedCalls[0].date);
    
    // Calculate the date 60 days ago
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const needsAttention = lastVisitDate < sixtyDaysAgo;
    const formattedDate = lastVisitDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return { text: formattedDate, needsAttention };
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-black text-gray-900">Accounts</h1>
        <Link href="/accounts/new">
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
            + New Account
          </button>
        </Link>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="text-gray-400">🔍</span>
        </div>
        <input
          type="text"
          placeholder="Search accounts by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-lg"
        />
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Filter by State</h3>
        <div className="flex flex-wrap gap-2">
          {eastCoastStates.map((state) => (
            <button
              key={state}
              onClick={() => setActiveFilter(state)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                activeFilter === state 
                  ? 'bg-gray-900 text-white shadow-md' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-900 hover:text-gray-900'
              }`}
            >
              {state}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-4 text-sm font-bold text-gray-500 uppercase tracking-wider">Account Name</th>
              <th className="p-4 text-sm font-bold text-gray-500 uppercase tracking-wider">State</th>
              <th className="p-4 text-sm font-bold text-gray-500 uppercase tracking-wider">Last Visit</th>
              <th className="p-4 text-sm font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="p-4 text-sm font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400 font-medium">
                  Loading accounts...
                </td>
              </tr>
            ) : filteredAccounts.length > 0 ? (
              filteredAccounts.map((account) => {
                // Run our math to check the dates
                const visitStatus = getVisitStatus(account.calls);

                return (
                  <tr 
                    key={account.id} 
                    // If it needs attention, we make the row hover a slight orange instead of gray!
                    className={`transition-colors group ${visitStatus.needsAttention ? 'hover:bg-orange-50/50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {/* If it needs attention, show a small warning dot */}
                        {visitStatus.needsAttention && (
                          <span title="Needs Follow-up" className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                        )}
                        <Link href={`/accounts/${account.id}`} className="font-bold text-gray-900 group-hover:text-blue-600 block">
                          {account.name}
                        </Link>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 font-medium">{account.territory || '—'}</td>
                    <td className="p-4">
                      {/* Color the text red if it's been too long */}
                      <span className={`font-medium ${visitStatus.needsAttention ? 'text-red-600' : 'text-gray-600'}`}>
                        {visitStatus.text}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        account.status === 'Inactive' ? 'bg-red-100 text-red-800' : 
                        account.status === 'Prospect' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-green-100 text-green-800'
                      }`}>
                        {account.status || 'Active'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link href={`/accounts/${account.id}`} className="text-blue-500 font-medium text-sm hover:underline">
                        View Profile →
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400 font-medium">
                  No accounts match your search. 
                </td>
              </tr>
            )}

          </tbody>
        </table>
      </div>
    </div>
  );
}