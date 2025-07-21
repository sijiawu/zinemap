"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

function validateEmail(email: string) {
  return /.+@.+\..+/.test(email)
}

export default function AuthForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setError('')
    if (!email || !validateEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }
    setLoading(true)
    if (mode === 'signup') {
      // Check if email is already registered
      const { data: emailExists } = await supabase.from('profiles').select('email').eq('email', email).single()
      if (emailExists) {
        setError('That email is already registered. Please log in instead.')
        setLoading(false)
        return
      }
    }
    // Send magic link for both login and signup (if not blocked above)
    const { error: supabaseError } = await supabase.auth.signInWithOtp({ email })
    if (supabaseError) {
      setError(supabaseError.message)
    } else {
      setMessage('Check your email for the magic link!')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md w-full mx-auto bg-white p-8 rounded-lg shadow-md">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-stone-800 mb-2">{mode === 'signup' ? 'Sign Up' : 'Log In'}</h2>
        <p className="text-stone-600 text-sm">
        Sign up / log in to contribute, explore, and support indie stores and small press creators.<br />
          <span className="text-rose-600 font-semibold">Zine tracking is coming soon!</span>
        </p>
      </div>
      <div className="flex justify-center mb-6">
        <button
          className={`px-4 py-2 rounded-l border border-stone-300 text-sm font-medium ${mode === 'login' ? 'bg-rose-500 text-white' : 'bg-stone-100 text-stone-700'}`}
          onClick={() => setMode('login')}
          type="button"
        >
          Log In
        </button>
        <button
          className={`px-4 py-2 rounded-r border border-stone-300 text-sm font-medium ${mode === 'signup' ? 'bg-rose-500 text-white' : 'bg-stone-100 text-stone-700'}`}
          onClick={() => setMode('signup')}
          type="button"
        >
          Sign Up
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
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
          {loading ? (mode === 'signup' ? 'Signing up...' : 'Logging in...') : (mode === 'signup' ? 'Sign Up with Magic Link' : 'Log In with Magic Link')}
        </button>
        {error && <div className="text-center text-sm text-red-600 mt-2">{error}</div>}
        {message && <div className="text-center text-sm mt-2">{message}</div>}
      </form>
    </div>
  )
} 