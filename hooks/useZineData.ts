"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'

export interface Zine {
  id: string
  user_id: string
  title: string
  description: string | null
  cover_image: string | null
  retail_price: number | null
  permalink: string
  created_at: string
  batches?: Batch[]
}

export interface Batch {
  id: string
  zine_id: string
  store_id: string | null
  store_name: string | null
  user_id: string
  date_placed: string
  copies_placed: number
  copies_sold: number | null
  price_per_copy: number | null
  split_percent: number | null
  paid: boolean | null
  status: string | null
  last_checkin: string | null
  checkin_notes: string | null
  notes: string | null
  created_at: string
  next_checkin: string | null
  paid_upfront: boolean | null
}

export interface DashboardStats {
  totalZines: number
  activeBatches: number
  totalCopiesOut: number
  totalCopiesSold: number
  totalEarnings: number
}

export interface UserProfile {
  id: string
  email: string
  display_name: string | null
}

export function useZineData(user: User | null, refreshKey: number = 0) {
  const [zines, setZines] = useState<Zine[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    totalZines: 0,
    activeBatches: 0,
    totalCopiesOut: 0,
    totalCopiesSold: 0,
    totalEarnings: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchZineData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile fetch error:', profileError)
          throw profileError // PGRST116 is "not found"
        }
        setProfile(profileData)

        // Fetch zines for the current user
        const { data: zinesData, error: zinesError } = await supabase
          .from('zines')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (zinesError) {
          console.error('Zines fetch error:', zinesError)
          throw zinesError
        }

        // Fetch batches for the current user with store information
        const { data: batchesData, error: batchesError } = await supabase
          .from('batches')
          .select('*')
          .eq('user_id', user.id)
          .order('date_placed', { ascending: false })

        if (batchesError) {
          console.error('Batches fetch error:', batchesError)
          throw batchesError
        }

        // Group batches by zine
        const zinesWithBatches = zinesData?.map(zine => ({
          ...zine,
          batches: batchesData?.filter(batch => batch.zine_id === zine.id) || []
        })) || []

        setZines(zinesWithBatches)
        setBatches(batchesData || [])

        // Calculate stats
        const activeBatches = batchesData?.filter(batch => batch.status === 'active') || []
        const totalCopiesOut = activeBatches.reduce((sum, batch) => sum + batch.copies_placed, 0)
        const totalCopiesSold = activeBatches.reduce((sum, batch) => sum + (batch.copies_sold || 0), 0)
        const totalEarnings = activeBatches.reduce((sum, batch) => {
          if (batch.copies_sold && batch.price_per_copy && batch.split_percent) {
            const earnings = (batch.split_percent / 100) * batch.copies_sold * batch.price_per_copy
            return sum + earnings
          }
          return sum
        }, 0)

        setStats({
          totalZines: zinesData?.length || 0,
          activeBatches: activeBatches.length,
          totalCopiesOut,
          totalCopiesSold,
          totalEarnings
        })

      } catch (err) {
        console.error('Error fetching zine data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch zine data')
      } finally {
        setLoading(false)
      }
    }

    fetchZineData()
  }, [user?.id, refreshKey]) // Include refreshKey in dependencies

  return { zines, batches, profile, stats, loading, error }
} 