"use client";

import React, { useState, useEffect, Fragment } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('Branches'); // 'Branches' or 'Major'
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // NEW: State to track which Major Account row is expanded
  const [expandedParentId, setExpandedParentId] = useState<string | null>(null);

  const eastCoastStates = [
    'All', 'ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 
    'PA', 'DE', 'MD', 'VA', 'NC', 'SC', 'GA', 'FL'
  ];

  useEffect(() => {
    async function fetchAccounts() {
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

  const searchedAndFiltered = accounts.filter(account => {
    const matchesState = activeFilter === 'All' || account.territory === activeFilter;
    const matchesSearch = account.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesState && matchesSearch;
  });

  const majorAccounts = searchedAndFiltered.filter(a => a.is_parent);
  const branchAccounts = searchedAndFiltered.filter(a => !a.is_parent);

  const getParentName = (parentId: string) => {
    if (!parentId) return '—';
    const parent = accounts.find(a => a.id === parentId);
    return parent ? parent.name : '—';
  };

  const getBranchCount = (parentId: string) => {
    return accounts.filter(a => a.parent_id === parentId).length;
  };

  const getVisitStatus = (calls: any[]) => {
    if (!calls || calls.length === 0) return { text: 'Never Visited', needsAttention: true };
    const sortedCalls = calls.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastVisitDate = new Date(sortedCalls[0].date);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    return { 
      text: lastVisitDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), 
      needsAttention: lastVisitDate < sixtyDaysAgo 
    };
  };

  // NEW: Function to toggle the dropdown
  const toggleRow = (id: string) => {
    if (expandedParentId === id) {
      setExpandedParentId(null); // Close it if it's already open
    } else {
      setExpandedParentId(id); // Open the clicked one
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-black text-gray-900">Accounts</h1>
        <Link href="/accounts/new">
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 shadow-sm">
            + New Account
          </button>
        </Link>
      </div>

      <div className="flex space-x-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('Branches')}
          className={`pb-4 px-2 text-lg font-bold border-b-4 transition-colors ${
            activeTab === 'Branches' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          All Branches
        </button>
        <button
          onClick={() => setActiveTab('Major')}
          className={`pb-4 px-2 text-lg font-bold border-b-4 transition-colors ${
            activeTab === 'Major' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Major Accounts HQ
        </button>
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
          className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:border-blue-500 text-lg"
        />
      </div>

      {activeTab === 'Branches' && (
        <div className="mb-8">
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
      )}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            {activeTab === 'Branches' ? (
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-4 text-sm font-bold text-gray-500 uppercase">Branch Name</th>
                <th className="p-4 text-sm font-bold text-gray-500 uppercase">Parent Company</th>
                <th className="p-4 text-sm font-bold text-gray-500 uppercase">State</th>
                <th className="p-4 text-sm font-bold text-gray-500 uppercase">Last Visit</th>
                <th className="p-4 text-sm font-bold text-gray-500 uppercase text-right">Action</th>
              </tr>
            ) : (
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-4 text-sm font-bold text-gray-500 uppercase">Major Account</th>
                <th className="p-4 text-sm font-bold text-gray-500 uppercase">Total Branches</th>
                <th className="p-4 text-sm font-bold text-gray-500 uppercase">Status</th>
                <th className="p-4 text-sm font-bold text-gray-500 uppercase text-right">Action</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-gray-200">
            
            {isLoading ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400 font-medium">Loading accounts...</td></tr>
            ) : activeTab === 'Branches' ? (
              /* --- BRANCHES ROW --- */
              branchAccounts.length > 0 ? (
                branchAccounts.map((account) => {
                  const visitStatus = getVisitStatus(account.calls);
                  return (
                    <tr key={account.id} className={`transition-colors group ${visitStatus.needsAttention ? 'hover:bg-orange-50/50' : 'hover:bg-gray-50'}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {visitStatus.needsAttention && <span title="Needs Follow-up" className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>}
                          <Link href={`/accounts/${account.id}`} className="font-bold text-gray-900 group-hover:text-blue-600">
                            {account.name}
                          </Link>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600 font-medium">
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                          {getParentName(account.parent_id)}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600 font-medium">{account.territory || '—'}</td>
                      <td className="p-4"><span className={`font-medium ${visitStatus.needsAttention ? 'text-red-600' : 'text-gray-600'}`}>{visitStatus.text}</span></td>
                      <td className="p-4 text-right">
                        <Link href={`/accounts/${account.id}`} className="text-blue-500 font-medium text-sm hover:underline">View →</Link>
                      </td>
                    </tr>
                  );
                })
              ) : <tr><td colSpan={5} className="p-8 text-center text-gray-400">No branches found.</td></tr>
            ) : (
              /* --- MAJOR ACCOUNTS ROW WITH ACCORDION --- */
              majorAccounts.length > 0 ? (
                majorAccounts.map((account) => {
                  const isExpanded = expandedParentId === account.id;
                  // Find all branches that belong to this major account
                  const childBranches = accounts.filter(a => a.parent_id === account.id);

                  return (
                    <Fragment key={account.id}>
                      {/* Parent Row (Clickable) */}
                      <tr 
                        onClick={() => toggleRow(account.id)}
                        className="hover:bg-gray-50 transition-colors cursor-pointer group"
                      >
                        <td className="p-4 font-black text-gray-900 text-lg flex items-center gap-3">
                          <span className="text-gray-400 group-hover:text-blue-600 transition-colors text-sm">
                            {isExpanded ? '▼' : '▶'}
                          </span>
                          {account.name}
                        </td>
                        <td className="p-4">
                          <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-bold">
                            {childBranches.length} Locations
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${account.status === 'Inactive' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {account.status || 'Active'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <Link href={`/accounts/${account.id}`} onClick={(e) => e.stopPropagation()} className="text-blue-500 font-medium text-sm hover:underline">
                            Manage HQ →
                          </Link>
                        </td>
                      </tr>

                      {/* Child Dropdown Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={4} className="p-0 bg-gray-50 border-t border-gray-100 shadow-inner">
                            <div className="p-6 pl-12 border-l-4 border-blue-500">
                              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Attached Branches</h4>
                              {childBranches.length > 0 ? (
                                <ul className="space-y-3">
                                  {childBranches.map(branch => (
                                    <li key={branch.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                      <div className="flex items-center gap-3">
                                        <span className="font-bold text-gray-800">{branch.name}</span>
                                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{branch.territory || 'N/A'}</span>
                                      </div>
                                      <Link href={`/accounts/${branch.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-bold hover:underline">
                                        View Branch →
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-gray-500 italic">No branches have been attached to this account yet.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              ) : <tr><td colSpan={4} className="p-8 text-center text-gray-400">No major accounts found.</td></tr>
            )}

          </tbody>
        </table>
      </div>
    </div>
  );
}