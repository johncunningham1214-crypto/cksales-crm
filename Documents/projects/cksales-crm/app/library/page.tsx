"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function TechnicalLibrary() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the vendors from the database
  const fetchVendors = async () => {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('name');
      
    if (data) setVendors(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  // Delete function for the Danger Zone
  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault(); // Prevents the link from clicking through when you hit delete
    
    if (window.confirm(`🚨 Are you sure you want to delete ${name} from the library?`)) {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting vendor:", error.message);
        alert("Failed to delete vendor.");
      } else {
        fetchVendors(); // Refresh the list instantly
      }
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black text-gray-900">Technical Library</h1>
          <p className="text-gray-600 mt-2 font-medium">Manage product flyers and pricing for your manufacturers.</p>
        </div>
        <Link href="/library/new">
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 shadow-sm">
            + Add Vendor
          </button>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-gray-500 font-medium">Loading vendors...</div>
      ) : vendors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {vendors.map(vendor => (
            <Link key={vendor.id} href={`/library/${vendor.slug}`} className="block relative group">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer h-full flex flex-col justify-center items-center text-center">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🏭</div>
                <h3 className="font-bold text-gray-900 text-xl">{vendor.name}</h3>
              </div>
              
              {/* The Delete Button (Hidden until you hover over the card) */}
              <button 
                onClick={(e) => handleDelete(e, vendor.id, vendor.name)}
                className="absolute top-2 right-2 bg-red-50 text-red-600 p-2 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                title="Delete Vendor"
              >
                ✕
              </button>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-12">
          <p className="text-gray-500 font-medium mb-4">No vendors added yet.</p>
          <Link href="/library/new">
            <button className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg font-bold hover:bg-gray-50">
              Add Your First Vendor
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}