import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function ProfileOnboardingModal({ user, show, onComplete }: { user: any, show: boolean, onComplete: () => void }) {
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!displayName || displayName.trim().length < 3) {
      setError('Display name must be at least 3 characters.')
      return
    }
    setLoading(true)
    // Check if display name is taken
    const { data: taken } = await supabase.from('profiles').select('display_name').eq('display_name', displayName).single()
    if (taken) {
      setError('That display name is already taken.')
      setLoading(false)
      return
    }
    // Insert profile row
    const { error: insertError } = await supabase.from('profiles').insert({ id: user.id, email: user.email, display_name: displayName })
    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }
    setLoading(false)
    onComplete()
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-stone-800">Welcome to ZineMap!</h2>
        <p className="mb-4 text-stone-600">Before you get started, please choose a display name:</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Display name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            minLength={3}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-500 text-white py-2 rounded hover:bg-rose-600"
          >
            {loading ? 'Saving...' : 'Save and Continue'}
          </button>
          {error && <div className="text-center text-sm text-red-600 mt-2">{error}</div>}
        </form>
      </div>
    </div>
  )
} 