import { supabase } from '../lib/supabase';
import Link from 'next/link';

// We learned our lesson! Never cache the dashboard.
export const dynamic = 'force-dynamic';

export default async function Home() {
  // 1. Get the total number of accounts
  // We use { count: 'exact', head: true } so Supabase just sends us the number, 
  // rather than downloading the entire list of accounts to count them.
  const { count: accountsCount } = await supabase
    .from('accounts')
    .select('*', { count: 'exact', head: true });

  // 2. Get the total number of visits logged
  const { count: visitsCount } = await supabase
    .from('calls')
    .select('*', { count: 'exact', head: true });

  // 3. Get the 5 most recent visits WITH the Account Name (The "Join")
  const { data: recentVisits } = await supabase
    .from('calls')
    .select(`
      *,
      accounts (
        name
      )
    `)
    .order('date', { ascending: false })
    .limit(5);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-black text-gray-900 mb-8">Territory Command Center</h1>
      
      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        
        {/* Metric 1 */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-gray-500 font-bold text-sm uppercase tracking-wider mb-2">Total Accounts</h3>
          <p className="text-4xl font-black text-blue-600">{accountsCount || 0}</p>
        </div>
        
        {/* Metric 2 */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-gray-500 font-bold text-sm uppercase tracking-wider mb-2">Visits Logged</h3>
          <p className="text-4xl font-black text-green-600">{visitsCount || 0}</p>
        </div>
        
        {/* Metric 3 */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-gray-500 font-bold text-sm uppercase tracking-wider mb-2">Quick Actions</h3>
          <div className="mt-2 space-y-2">
            <Link href="/accounts/new" className="block text-blue-600 font-medium hover:underline">
              + Add New Account
            </Link>
            <Link href="/accounts" className="block text-blue-600 font-medium hover:underline">
              View All Accounts →
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Recent Field Activity</h2>
        </div>
        
        <div className="divide-y divide-gray-100">
          {recentVisits && recentVisits.length > 0 ? (
            recentVisits.map((visit) => (
              <div key={visit.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    {/* Notice how we use visit.accounts.name to get the joined data! */}
                    <Link href={`/accounts/${visit.account_id}`} className="font-bold text-gray-900 hover:text-blue-600 text-lg">
                      {visit.accounts?.name || 'Unknown Account'}
                    </Link>
                    <span className="ml-3 inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded">
                      {visit.type}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-500">
                    {new Date(visit.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p className="text-gray-600 mt-2 line-clamp-2">{visit.notes}</p>
              </div>
            ))
          ) : (
            <div className="p-10 text-center text-gray-500">
              No recent activity found. Head to an account to log a visit!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}