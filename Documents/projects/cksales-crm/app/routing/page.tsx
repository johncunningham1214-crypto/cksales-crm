"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { TERRITORIES } from '@/lib/constants';

export default function TerritoryRouting() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedTerritory, setSelectedTerritory] = useState('All');
  const [routeList, setRouteList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

 

  useEffect(() => {
    async function fetchAccounts() {
      // Fetch active accounts that have a valid address
      const { data } = await supabase
        .from('accounts')
        .select('id, name, address, territory, status')
        .eq('status', 'Active')
        .order('name');
      
      if (data) setAccounts(data);
      setIsLoading(false);
    }
    fetchAccounts();
  }, []);

  // Add an account to the day's driving itinerary
  const addToRoute = (account: any) => {
    if (!routeList.some(item => item.id === account.id)) {
      setRouteList([...routeList, account]);
    }
  };

  // Remove an account from the itinerary
  const removeFromRoute = (id: string) => {
    setRouteList(routeList.filter(item => item.id !== id));
  };

  // Move a stop up or down in the sequence
  const moveStop = (index: number, direction: 'up' | 'down') => {
    const updatedList = [...routeList];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < updatedList.length) {
      const temp = updatedList[index];
      updatedList[index] = updatedList[targetIndex];
      updatedList[targetIndex] = temp;
      setRouteList(updatedList);
    }
  };

  // Generate the native multi-stop Google Maps navigation link
  const generateMapsLink = () => {
    if (routeList.length === 0) return '#';
    
    // Base multi-destination URL structure for Google Maps
    const origin = 'Current+Location';
    const destination = encodeURIComponent(routeList[routeList.length - 1].address || routeList[routeList.length - 1].name);
    
    // Any stops in between become waypoints
    const waypoints = routeList
      .slice(0, -1)
      .map(acc => encodeURIComponent(acc.address || acc.name))
      .join('|');

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
  };

  const filteredAccounts = selectedTerritory === 'All'
    ? accounts
    : accounts.filter(acc => {
        if (!acc.territory) return false; // Skip if no territory is assigned
        
        // Convert both to lowercase to prevent case-sensitive mismatches
        const dbData = acc.territory.toLowerCase();
        const btnText = selectedTerritory.toLowerCase();
        
        // If the database says "New Jersey" and the button is "Northern New Jersey", it still matches!
        return dbData.includes(btnText) || btnText.includes(dbData);
      });

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading map engine...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-black text-gray-900">Territory Routing</h1>
        <p className="text-gray-500 mt-2 font-medium">Build and optimize your field travel sequence.</p>
      </div>

      {/* Territory Filter Buttons */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-200">
        {['All', ...TERRITORIES].map((t) => (
          <button
            key={t}
            onClick={() => setSelectedTerritory(t)}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              selectedTerritory === t
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Available Locations */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Available Locations ({filteredAccounts.length})
            </h2>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto pr-2">
              {filteredAccounts.length > 0 ? (
                filteredAccounts.map((acc) => (
                  <div key={acc.id} className="py-4 flex justify-between items-start gap-4 group">
                    <div>
                      <div className="font-bold text-gray-900">{acc.name}</div>
                      <div className="text-sm text-gray-500 mt-1 font-medium">{acc.address || 'No Address Listed'}</div>
                      <span className="inline-block mt-2 bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded">
                        {acc.territory}
                      </span>
                    </div>
                    <button
                      onClick={() => addToRoute(acc)}
                      disabled={routeList.some(item => item.id === acc.id)}
                      className="shrink-0 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 disabled:bg-gray-50 disabled:text-gray-400 font-bold text-xs px-3 py-2 rounded-lg transition-colors"
                    >
                      {routeList.some(item => item.id === acc.id) ? 'Added' : '+ Add to Route'}
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400 text-sm">No active accounts found in this market.</div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Today's Driving Itinerary */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden sticky top-24">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Today's Stop Sequence</h2>
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full">
                {routeList.length} Stops
              </span>
            </div>

            <div className="p-4 divide-y divide-gray-100 min-h-[200px] max-h-[400px] overflow-y-auto">
              {routeList.length > 0 ? (
                routeList.map((stop, index) => (
                  <div key={stop.id} className="py-3 flex items-center justify-between gap-3 group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                        {index + 1}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-gray-900 text-sm truncate">{stop.name}</div>
                        <div className="text-xs text-gray-400 truncate">{stop.address}</div>
                      </div>
                    </div>
                    
                    {/* Sequence Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onClick={() => moveStop(index, 'up')}
                        disabled={index === 0}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400 disabled:opacity-20"
                      >
                        ▲
                      </button>
                      <button 
                        onClick={() => moveStop(index, 'down')}
                        disabled={index === routeList.length - 1}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400 disabled:opacity-20"
                      >
                        ▼
                      </button>
                      <button 
                        onClick={() => removeFromRoute(stop.id)}
                        className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded ml-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400 text-sm flex flex-col items-center justify-center h-full">
                  <span>No stops selected yet.</span>
                  <span className="text-xs mt-1 text-gray-400">Click "+ Add to Route" to begin.</span>
                </div>
              )}
            </div>

            {/* Launch Button */}
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <a
                href={generateMapsLink()}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full block text-center font-bold text-sm py-3 px-4 rounded-xl transition-colors shadow-sm ${
                  routeList.length > 0
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                onClick={(e) => routeList.length === 0 && e.preventDefault()}
              >
                🚀 Launch Route in Google Maps
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}