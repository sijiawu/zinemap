'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'

export type SavedEntityType = 'store' | 'library' | 'event'

export function useSavedLocation(
  userId: string | undefined,
  entityType: SavedEntityType,
  entityId: string | undefined,
  options?: { skipFetch?: boolean }
) {
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const skipFetch = options?.skipFetch ?? false

  // Check if already saved (skip when skipFetch - list pages)
  useEffect(() => {
    if (skipFetch || !userId || !entityId) {
      if (skipFetch) setIsSaved(false)
      return
    }

    const checkSaved = async () => {
      const { data } = await supabase
        .from('saved_locations')
        .select('id')
        .eq('user_id', userId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .maybeSingle()

      setIsSaved(!!data)
    }

    checkSaved()
  }, [skipFetch, userId, entityType, entityId])

  const toggleSave = useCallback(async () => {
    if (!userId || !entityId) return

    setIsLoading(true)
    try {
      if (isSaved) {
        const { error } = await supabase
          .from('saved_locations')
          .delete()
          .eq('user_id', userId)
          .eq('entity_type', entityType)
          .eq('entity_id', entityId)

        if (error) throw error
        setIsSaved(false)
      } else {
        const { error } = await supabase
          .from('saved_locations')
          .insert({
            user_id: userId,
            entity_type: entityType,
            entity_id: entityId,
          })

        if (error) throw error
        setIsSaved(true)
      }
    } catch (err) {
      console.error('Error toggling save:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [userId, entityType, entityId, isSaved])

  return { isSaved, isLoading, toggleSave }
}
