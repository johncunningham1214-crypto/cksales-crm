import { supabase } from '../../../lib/supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AccountProfile(props: any) {
  const params = await props.params;
  const accountId = params.id;

  // 1. Fetch the Account details
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  // 2. Fetch the Calls for this specific account, ordered by newest first
  const { data: calls, error: callsError } = await supabase
    .from('calls')
    .select('*')
    .eq('account_id', accountId)
    .order('date', { ascending: false });

  if (accountError || !account) {
    return (
      <div className="p-8 text-center mt-20">
        <h1 className="text-3xl font-black text-gray-900 mb-4">Account not found</h1>
        <p className="text-gray-500 mb-8">We could not find the account with ID: <strong>{accountId}</strong></p>
        <Link href="/accounts" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
          ← Back to Accounts List
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="mb-8">
        <Link href="/accounts" className="text-blue-600 hover:underline font-medium text-sm">
          ← Back to Accounts
        </Link>
        <div className="flex justify-between items-end mt-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900">{account.name}</h1>
            <p className="text-gray-500 font-medium text-lg mt-1">{account.territory || 'No territory assigned'}</p>
          </div>
          <Link href={`/accounts/${accountId}/edit`}>
  <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors">
    Edit Account
  </button>
</Link>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Account Details */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Contact Info</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium text-gray-900">{account.phone || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium text-green-600">{account.status || 'Active'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: The Call Log */}
        <div className="md:col-span-2">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Call Log</h2>
              <Link href={`/accounts/${accountId}/log-visit`}>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  + Log Visit
                </button>
              </Link>
            </div>
            
            {/* If there are calls, show them. If not, show the empty state. */}
            {calls && calls.length > 0 ? (
              <div className="space-y-4">
                {calls.map((call) => (
                  <div key={call.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50 hover:bg-white hover:border-gray-200 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                        {call.type}
                      </span>
                      <span className="text-sm text-gray-500 font-medium">
                        {new Date(call.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-gray-800 mt-3 whitespace-pre-wrap">{call.notes}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                  📝
                </div>
                <h3 className="text-gray-900 font-bold mb-1">No calls logged yet</h3>
                <p className="text-gray-500 text-sm">Keep track of your visits and follow-ups here.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}