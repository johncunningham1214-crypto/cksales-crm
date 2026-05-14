import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default async function Dashboard() {
  // 1. Fetch the exact count of rows from your 'accounts' table
  const { count, error } = await supabase
    .from('accounts')
    .select('*', { count: 'exact', head: true });

  // 2. If there's an error or no accounts, default to 0
  const accountCount = count || 0;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Welcome back.</h1>
      <p className="text-gray-600 mb-8">Here is what is happening in your territory.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* The Accounts Box */}
        <Link href="/accounts">
          <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-blue-500 transition-all cursor-pointer">
            <h3 className="text-gray-500 font-medium mb-2">Total Accounts</h3>
            <p className="text-4xl font-black text-blue-600">{accountCount}</p>
          </div>
        </Link>

        {/* You can leave these next two as placeholders for now */}
        <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
          <h3 className="text-gray-500 font-medium mb-2">Recent Calls</h3>
          <p className="text-4xl font-black text-green-600">0</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
          <h3 className="text-gray-500 font-medium mb-2">Tasks Pending</h3>
          <p className="text-4xl font-black text-orange-600">0</p>
        </div>
      </div>
    </div>
  );
}