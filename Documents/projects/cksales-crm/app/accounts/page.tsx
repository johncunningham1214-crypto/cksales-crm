import Link from 'next/link';

export default function AccountsPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black text-gray-900">Accounts</h1>
          <p className="text-gray-500 font-medium">Manage branches and personnel in your territory.</p>
        </div>
        
        {/* This is the primary action for this tab */}
        <Link href="/calls">
          <button className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100">
            + Log Daily Call
          </button>
        </Link>
      </div>

      {/* Placeholder for your actual customer list */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <p className="text-gray-400 italic">No accounts added yet. Your customer list will appear here.</p>
        </div>
      </div>
    </div>
  );
}