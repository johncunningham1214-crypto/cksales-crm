import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default async function AccountsPage() {
  // Fetch all accounts from Supabase, sorted alphabetically by name
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .order('name', { ascending: true });

  // If there's an error fetching, we can log it (helpful for debugging)
  if (error) {
    console.error('Error fetching accounts:', error);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black text-gray-900">Accounts</h1>
        <button></button> 
        <Link href="/accounts/new">
  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
    + New Account
  </button>
  </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-sm uppercase tracking-wider">
              <th className="p-4 font-semibold">Name</th>
              <th className="p-4 font-semibold">Territory</th>
              <th className="p-4 font-semibold">Phone</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* We map through the database rows here */}
            {accounts?.map((account) => (
              <tr key={account.id} className="hover:bg-gray-50 transition-colors group">
                <td className="p-4">
                  {/* We wrapped the name in a Link to the specific account ID */}
                  <Link href={`/accounts/${account.id}`} className="font-bold text-gray-900 group-hover:text-blue-600 block">
                    {account.name}
                  </Link>
                </td>
                <td className="p-4 text-gray-600">{account.territory || '—'}</td>
                <td className="p-4 text-gray-600">{account.phone || '—'}</td>
                <td className="p-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                    {account.status || 'Active'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <Link href={`/accounts/${account.id}`} className="text-blue-500 font-medium text-sm hover:underline">
                    View Profile →
                  </Link>
                </td>
              </tr>
            ))}

            {/* What to show if the table is totally empty */}
            {accounts?.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400">
                  No accounts found. Click "+ New Account" to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}