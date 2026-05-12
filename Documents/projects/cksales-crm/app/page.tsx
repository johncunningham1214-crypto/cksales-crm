import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data: accounts } = await supabase.from('accounts').select('*')

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Welcome Back</h1>
        <p className="text-slate-500">Here is what is happening in your territory.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Total Accounts</p>
          <p className="text-3xl font-bold">{accounts?.length || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Active Leads</p>
          <p className="text-3xl font-bold text-blue-600">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Library Docs</p>
          <p className="text-3xl font-bold">0</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-bold mb-4">Recent Activity</h3>
        <p className="text-slate-400 italic">No recent activity found.</p>
      </div>
    </div>
  )
}