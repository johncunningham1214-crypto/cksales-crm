"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function TechLibraryVendors() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // New State for adding a vendor
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchVendors();
  }, []);

  async function fetchVendors() {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('name');
    
    if (data) setVendors(data);
    if (error) console.error("Error fetching vendors:", error);
    setIsLoading(false);
  }

  // The function to save a new manufacturer
  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName.trim()) return;
    
    setIsSubmitting(true);

    const { error } = await supabase
      .from('vendors')
      .insert([{ name: newVendorName.trim() }]);

    if (error) {
      console.error("Error saving vendor:", error);
      alert("Failed to save manufacturer: " + error.message);
    } else {
      // Success! Clear the form, close the box, and refresh the list
      setNewVendorName('');
      setIsAddingVendor(false);
      fetchVendors();
    }
    
    setIsSubmitting(false);
  };

  const filteredVendors = vendors.filter(v => 
    v.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading manufacturers...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Tech Library</h1>
          <p className="text-gray-500 mt-2 font-medium">Select a manufacturer to view spec sheets and manuals.</p>
        </div>
        <Link href="/tech-library/upload" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm">
          + Upload Document
        </Link>
      </div>

      {/* Toolbar: Search and Add Button */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 bg-white p-2 border border-gray-200 rounded-xl shadow-sm flex">
          <input 
            type="text" 
            placeholder="Search manufacturers..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent px-4 py-2 text-gray-900 outline-none"
          />
        </div>
        <button 
          onClick={() => setIsAddingVendor(!isAddingVendor)}
          className="bg-white border-2 border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm shrink-0"
        >
          {isAddingVendor ? 'Cancel' : '+ Add Manufacturer'}
        </button>
      </div>

      {/* Dropdown Form for Adding a Vendor */}
      {isAddingVendor && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 shadow-sm animate-in slide-in-from-top-2 fade-in duration-200">
          <form onSubmit={handleAddVendor} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-blue-900 mb-2">New Manufacturer Name</label>
              <input 
                type="text" 
                autoFocus
                required
                value={newVendorName}
                onChange={(e) => setNewVendorName(e.target.value)}
                placeholder="e.g. Trane, Mitsubishi, LG..."
                className="w-full border border-blue-200 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none bg-white shadow-sm"
              />
            </div>
            <button 
              type="submit"
              disabled={isSubmitting || !newVendorName.trim()}
              className="w-full md:w-auto bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 h-[50px]"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </form>
        </div>
      )}

      {/* Vendor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVendors.length > 0 ? (
          filteredVendors.map(vendor => (
            <Link 
              key={vendor.id} 
              href={`/tech-library/${vendor.id}`}
              className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-blue-500 hover:shadow-md transition-all group flex items-center justify-between"
            >
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                {vendor.name}
              </h3>
              <span className="text-gray-400 group-hover:text-blue-600 transition-colors text-xl">
                →
              </span>
            </Link>
          ))
        ) : (
          <div className="col-span-full p-12 text-center text-gray-500 bg-white border border-gray-200 rounded-2xl">
            {searchQuery ? "No manufacturers match your search." : "No manufacturers found. Click 'Add Manufacturer' to start your list."}
          </div>
        )}
      </div>
    </div>
  );
}