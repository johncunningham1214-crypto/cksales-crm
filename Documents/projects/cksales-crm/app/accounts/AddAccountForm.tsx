'use client' // This tells Next.js this is an interactive component

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AddAccountForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [territory, setTerritory] = useState('New York')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('accounts')
      .insert([{ name, territory, status: 'Prospect' }])

    setLoading(false)

    if (error) {
      alert(error.message)
    } else {
      setName('')
      router.refresh() // This updates the table behind the form
      alert('Account added successfully!')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
      <h2 className="text-lg font-bold mb-4">Quick Add Account</h2>
      <div className="flex flex-col md:flex-row gap-4">
        <input
          required
          type="text"
          placeholder="Company Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select 
          value={territory} 
          onChange={(e) => setTerritory(e.target.value)}
          className="p-2 border border-slate-300 rounded-md bg-white"
        >
          <option value="New York">New York</option>
          <option value="New Jersey">New Jersey</option>
          <option value="New England">New England</option>
        </select>
        <button 
          disabled={loading}
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? 'Saving...' : 'Save Account'}
        </button>
      </div>
    </form>
  )
}