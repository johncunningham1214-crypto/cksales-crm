import { supabase } from '@/lib/supabase'
import AddAccountForm from './AddAccountForm' // 1. Import the form

export default async function AccountsPage() {
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .order('name', { ascending: true })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Accounts</h1>
        <p className="text-slate-500">Manage your distributors and key customers.</p>
      </div>

      {/* 2. Add the Form here */}
      <AddAccountForm />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-4">Company Name</th>
              <th className="px-6 py-4">Territory</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Last Visited</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {accounts?.map((account) => (
              <tr key={account.id} className="hover:bg-slate-50 transition">
                <td className="px-6 py-4 font-medium text-blue-600">{account.name}</td>
                <td className="px-6 py-4 text-slate-600">{account.territory || '—'}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    {account.status || 'Active'}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500">{account.last_visited || 'No date'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}