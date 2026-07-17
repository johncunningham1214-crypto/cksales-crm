"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close the dropdown if you click anywhere else on the screen
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // The actual search engine
  useEffect(() => {
    async function performSearch() {
      // Don't search until we have at least 2 characters
      if (query.length < 2) {
        setResults([]);
        return;
      }

      // 1. Search Accounts by Name
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id, name')
        .ilike('name', `%${query}%`)
        .limit(3);

      // 2. Search Contacts by Name
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, name, title, account_id, accounts(name)')
        .ilike('name', `%${query}%`)
        .limit(3);

      const combinedResults = [];

      // Format Account results
      if (accounts) {
        accounts.forEach(acc => {
          combinedResults.push({
            id: `acc-${acc.id}`,
            type: 'Account',
            name: acc.name,
            subtext: 'Branch',
            link: `/accounts/${acc.id}`
          });
        });
      }

      // Format Contact results
      if (contacts) {
        contacts.forEach(contact => {
          combinedResults.push({
            id: `con-${contact.id}`,
            type: 'Contact',
            name: contact.name,
            subtext: `${contact.title || 'Staff'} @ ${contact.accounts?.name || 'Unknown Branch'}`,
            link: `/accounts/${contact.account_id}` // Links straight to the branch they belong to
          });
        });
      }

      setResults(combinedResults);
      setIsOpen(true);
    }

    // "Debounce" the search so it doesn't slam the database on every single keystroke
    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  return (
    <div className="relative w-full max-w-md z-50" ref={searchRef}>
      <div className="relative">
        <input
          type="text"
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm shadow-sm"
          placeholder="Quick search accounts & contacts..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
        />
        <div className="absolute left-3 top-2.5 text-gray-400">
          {/* Magnifying Glass Icon */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* The Dropdown Menu */}
      {isOpen && results.length > 0 && (
        <div className="absolute w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="divide-y divide-gray-100">
            {results.map((item) => (
              <Link 
                href={item.link} 
                key={item.id}
                onClick={() => { setQuery(''); setIsOpen(false); }} // Clear search on click
              >
                <div className="p-3 hover:bg-gray-50 transition-colors block cursor-pointer">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-gray-900">{item.name}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      item.type === 'Account' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {item.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{item.subtext}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* No Results Message */}
      {isOpen && query.length >= 2 && results.length === 0 && (
        <div className="absolute w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl p-4 text-center text-gray-500 text-sm">
          No matches found for "{query}"
        </div>
      )}
    </div>
  );
}