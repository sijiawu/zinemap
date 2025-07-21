"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

function validateEmail(email: string) {
  return /.+@.+\..+/.test(email)
}

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setError('')
    // Validation
    if (!userName || userName.trim().length < 5) {
      setError('User name must be at least 5 characters.')
      return
    }
    if (!email || !validateEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }
    setLoading(true)
    const { error: supabaseError } = await supabase.auth.signInWithOtp({ email })
    if (supabaseError) {
      setError(supabaseError.message)
    } else {
      setMessage('Check your email for the magic link!')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4 max-w-xs mx-auto">
      <input
        type="text"
        placeholder="Your user name"
        value={userName}
        onChange={e => setUserName(e.target.value)}
        required
        minLength={5}
        className="w-full border px-3 py-2 rounded"
      />
      <input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        className="w-full border px-3 py-2 rounded"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-rose-500 text-white py-2 rounded hover:bg-rose-600"
      >
        {loading ? 'Sending...' : 'Send Magic Link'}
      </button>
      {error && <div className="text-center text-sm text-red-600 mt-2">{error}</div>}
      {message && <div className="text-center text-sm mt-2">{message}</div>}
    </form>
  )
} 