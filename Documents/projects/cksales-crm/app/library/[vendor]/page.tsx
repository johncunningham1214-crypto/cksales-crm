"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';

export default function VendorLibraryPage() {
  const params = useParams();
  const vendorSlug = params.vendor as string; 

  const [vendor, setVendor] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('Flyer'); // 'Flyer' or 'Pricing'
  const [isLoading, setIsLoading] = useState(true);

  // Reference to the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch the vendor and their documents
  const fetchData = async () => {
    // 1. Get the vendor details based on the URL slug
    const { data: vData } = await supabase
      .from('vendors')
      .select('*')
      .eq('slug', vendorSlug)
      .single();

    if (vData) {
      setVendor(vData);
      
      // 2. Fetch documents attached to this specific vendor
      const { data: dData } = await supabase
        .from('documents')
        .select('*')
        .eq('vendor_id', vData.id)
        .order('created_at', { ascending: false });

      if (dData) setDocuments(dData);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [vendorSlug]);

  // Handle the file upload process
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !vendor) return;

    setIsUploading(true);

    // 1. Create a clean, unique file path (e.g., "14/167890123-supco-pump.pdf")
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const filePath = `${vendor.id}/${Date.now()}-${safeFileName}`;

    // 2. Upload the physical file to the Supabase Storage Bucket
    const { error: uploadError } = await supabase.storage
      .from('vendor-files')
      .upload(filePath, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      alert("Failed to upload file to storage.");
      setIsUploading(false);
      return;
    }

    // 3. Save the record in the database so we can find it later
    const { error: dbError } = await supabase
      .from('documents')
      .insert([{
        vendor_id: vendor.id,
        title: file.name,
        file_path: filePath,
        category: uploadCategory
      }]);

    if (dbError) {
      console.error("Database error:", dbError);
      alert("Failed to save document record.");
    } else {
      fetchData(); // Refresh the list to show the new file!
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = ''; // Reset the input
  };

  // Handle document deletion
  const handleDeleteDoc = async (id: string, filePath: string) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;

    // 1. Delete from database
    await supabase.from('documents').delete().eq('id', id);

    // 2. Delete the actual file from the storage bucket
    await supabase.storage.from('vendor-files').remove([filePath]);

    fetchData(); // Refresh the UI
  };

  // Helper to generate the clickable download link
  const getFileUrl = (path: string) => {
    return supabase.storage.from('vendor-files').getPublicUrl(path).data.publicUrl;
  };

  // Split documents by category for the UI
  const flyers = documents.filter(doc => doc.category === 'Flyer');
  const pricing = documents.filter(doc => doc.category === 'Pricing');

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading library...</div>;
  if (!vendor) return <div className="p-8 text-center text-red-500">Vendor not found.</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="mb-8">
        <Link href="/library" className="text-blue-600 hover:underline font-medium text-sm mb-4 inline-block">
          ← Back to Technical Library
        </Link>
        <h1 className="text-4xl font-black text-gray-900 mt-2">{vendor.name} Resources</h1>
      </div>

      {/* Upload Control Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-center gap-4 shadow-sm">
        <div className="flex-1">
          <h3 className="font-bold text-blue-900 text-lg">Upload New Document</h3>
          <p className="text-sm text-blue-700">Add a PDF, Word, or Excel file to this vendor's library.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value)}
            className="border border-blue-200 rounded-lg p-2.5 bg-white text-sm font-bold text-gray-700 focus:outline-none focus:border-blue-500"
          >
            <option value="Flyer">Product Flyer</option>
            <option value="Pricing">Pricing / Promo</option>
          </select>

          {/* Hidden File Input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg"
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-sm transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
          >
            {isUploading ? 'Uploading...' : '+ Select File'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Column: Product Flyers */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center gap-3">
            <span className="text-2xl">📄</span>
            <h2 className="text-lg font-bold text-gray-900">Product Flyers</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {flyers.length > 0 ? flyers.map(doc => (
              <div key={doc.id} className="p-4 px-6 flex justify-between items-center hover:bg-gray-50 transition-colors group">
                <a href={getFileUrl(doc.file_path)} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline truncate pr-4">
                  {doc.title}
                </a>
                <button 
                  onClick={() => handleDeleteDoc(doc.id, doc.file_path)}
                  className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold text-sm"
                >
                  Delete
                </button>
              </div>
            )) : (
              <div className="p-8 text-center text-gray-400 text-sm">No flyers uploaded yet.</div>
            )}
          </div>
        </div>

        {/* Right Column: Pricing & Promos */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center gap-3">
            <span className="text-2xl">🏷️</span>
            <h2 className="text-lg font-bold text-gray-900">Pricing & Promos</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {pricing.length > 0 ? pricing.map(doc => (
              <div key={doc.id} className="p-4 px-6 flex justify-between items-center hover:bg-gray-50 transition-colors group">
                <a href={getFileUrl(doc.file_path)} target="_blank" rel="noopener noreferrer" className="font-medium text-green-600 hover:underline truncate pr-4">
                  {doc.title}
                </a>
                <button 
                  onClick={() => handleDeleteDoc(doc.id, doc.file_path)}
                  className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold text-sm"
                >
                  Delete
                </button>
              </div>
            )) : (
              <div className="p-8 text-center text-gray-400 text-sm">No pricing sheets uploaded yet.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}