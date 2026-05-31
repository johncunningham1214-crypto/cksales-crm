"use client";

import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewVendor() {
  const router = useRouter();
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Automatically create a lowercase, URL-friendly slug (e.g. "Genteq Motors" -> "genteq-motors")
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const { error } = await supabase
      .from('vendors')
      .insert([{ name, slug }]);

    if (error) {
      console.error("Error adding vendor:", error.message);
      alert("Failed to add vendor.");
    } else {
      router.push('/library');
      router.refresh();
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href="/library" className="text-blue-600 hover:underline font-medium text-sm">
          ← Back to Library
        </Link>
        <h1 className="text-3xl font-black text-gray-900 mt-4">Add New Vendor</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Vendor Name</label>
          <input 
            type="text" 
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. LG HVAC"
            className="w-full border border-gray-300 rounded-lg p-3"
          />
        </div>

        <div className="pt-4 flex justify-end">
          <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700">
            Save Vendor
          </button>
        </div>
      </form>
    </div>
  );
}