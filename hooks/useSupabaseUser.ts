"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'

export function useSupabaseUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setUser(data.user)
        setLoading(false)
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}

export function useLinkProfileId(user: User | null) {
  useEffect(() => {
    if (user && user.email && user.id) {
      // Link the profile row to the auth.users id if not already set
      supabase
        .from('profiles')
        .update({ id: user.id })
        .eq('email', user.email)
        .is('id', null)
    }
  }, [user])
} 