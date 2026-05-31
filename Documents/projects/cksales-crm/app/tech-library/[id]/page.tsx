"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function VendorDocuments() {
  const params = useParams();
  const vendorId = params.id;

  const [vendor, setVendor] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // 1. Fetch the vendor as an array to avoid the .single() crash
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorId);

      // 2. Fetch the documents
      const { data: docsData, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('title');

      // 3. If the array has the vendor, grab the first one
      if (vendorData && vendorData.length > 0) {
        setVendor(vendorData[0]);
      }
      
      if (docsData) {
        setDocuments(docsData);
      }
      
      setIsLoading(false);
    }

    if (vendorId) fetchData();
  }, [vendorId]);

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading documents...</div>;
  
  if (!vendor) return (
    <div className="p-8 text-center text-red-500 space-y-4">
      <h2 className="text-xl font-bold">Manufacturer not found.</h2>
      <Link href="/tech-library" className="text-blue-600 hover:underline">
        ← Go back to Library
      </Link>
    </div>
  );

  const filteredDocs = documents.filter(doc => 
    doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    doc.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <Link href="/tech-library" className="text-blue-600 hover:underline font-medium text-sm">
        ← Back to Manufacturers
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900">{vendor.name} Library</h1>
          <p className="text-gray-500 mt-1 font-medium">{documents.length} documents available</p>
        </div>
        <Link href="/tech-library/upload" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm">
          + Upload New
        </Link>
      </div>

      {documents.length > 0 && (
        <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
          <input 
            type="text" 
            placeholder="Search documents by title or category..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocs.length > 0 ? (
          filteredDocs.map(doc => {
            const fileUrl = supabase.storage.from('vendor-files').getPublicUrl(doc.file_path).data.publicUrl;

            return (
              <a 
                key={doc.id} 
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-blue-500 hover:shadow-md transition-all group block"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded">
                    {doc.category}
                  </span>
                  <span className="text-gray-400 group-hover:text-blue-600 transition-colors">↗</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {doc.title}
                </h3>
              </a>
            )
          })
        ) : (
          <div className="col-span-full p-12 text-center text-gray-500 bg-white border border-gray-200 rounded-2xl">
            No documents found for {vendor.name}.
          </div>
        )}
      </div>
    </div>
  );
}