"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function UploadDocument() {
  const router = useRouter();
  
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Spec Sheet');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchVendors() {
      const { data } = await supabase
        .from('vendors')
        .select('id, name')
        .order('name');
      
      if (data) setVendors(data);
    }
    fetchVendors();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Please select a file to upload.");
    if (!vendorId) return alert("Please select a vendor.");
    
    setIsSubmitting(true);

    // 1. Create a unique file name to prevent overwriting (e.g., 168439002-genteq-motor.pdf)
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${fileName}`;

    // 2. Upload the physical file to the Supabase Storage bucket
    const { error: uploadError } = await supabase.storage
      .from('vendor-files')
      .upload(filePath, file);

    if (uploadError) {
      console.error("Upload Error:", uploadError);
      alert("Failed to upload file: " + uploadError.message);
      setIsSubmitting(false);
      return;
    }

    // 3. Save the record in the 'documents' database table
    const { error: dbError } = await supabase
      .from('documents')
      .insert([{
        vendor_id: vendorId,
        title,
        category,
        file_path: filePath
      }]);

    if (dbError) {
      console.error("Database Error:", dbError);
      alert("File uploaded, but failed to save database record.");
      setIsSubmitting(false);
    } else {
      router.push('/tech-library');
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <button 
        onClick={() => router.back()} 
        className="text-blue-600 hover:underline font-medium text-sm mb-6 inline-block"
      >
        ← Back to Library
      </button>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">Upload Tech Document</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Vendor</label>
              <select 
                required
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
              >
                <option value="" disabled>Select a vendor...</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
              <select 
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
              >
                <option value="Spec Sheet">Spec Sheet</option>
                <option value="Pricing">Pricing</option>
                <option value="Cross-Reference">Cross-Reference</option>
                <option value="Installation Manual">Installation Manual</option>
                <option value="Warranty Info">Warranty Info</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Document Title</label>
            <input 
              type="text" 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Genteq Evergreen IM Installation Manual"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">File (PDF, Image, etc.)</label>
            <input 
              type="file" 
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-gray-50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="pt-4 flex justify-end gap-4 border-t border-gray-100">
            <button 
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}