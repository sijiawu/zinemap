'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabaseClient'

type SavedEntityType = 'store' | 'library' | 'event'

interface SaveButtonProps {
  entityType: SavedEntityType
  entityId: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  showLabel?: boolean
  /** When true, button shows "Saved" and click will unsave. Use on profile/saved list. */
  initialSaved?: boolean
  /** Called after successful unsave. Use to update parent state (e.g. remove from list). */
  onUnsave?: () => void
  /** Label when saved (e.g. "Unsave" instead of "Saved"). */
  unsaveLabel?: string
}

/**
 * SaveButton: Zero auth on render. Only calls getSession() when user clicks.
 * Always shows "Save" (or "Saved" if optimistically updated this session).
 */
export function SaveButton({
  entityType,
  entityId,
  variant = 'outline',
  size = 'sm',
  className = '',
  showLabel = true,
  initialSaved = false,
  onUnsave,
  unsaveLabel = 'Saved',
}: SaveButtonProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [optimisticSaved, setOptimisticSaved] = useState(initialSaved)

  // Reset when entity changes (e.g. map popup switches to different location)
  useEffect(() => {
    setOptimisticSaved(initialSaved)
  }, [entityId, entityType, initialSaved])
  const [isLoading, setIsLoading] = useState(false)
  const [showAlreadySavedModal, setShowAlreadySavedModal] = useState(false)
  const [showUnsaveConfirmModal, setShowUnsaveConfirmModal] = useState(false)

  const performUnsave = async () => {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const { error } = await supabase
        .from('saved_locations')
        .delete()
        .eq('user_id', session.user.id)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
      if (error) throw error
      setOptimisticSaved(false)
      onUnsave?.()
      setShowUnsaveConfirmModal(false)
      toast({
        title: 'Removed from saved',
        description: 'Removed from your saved pins.',
      })
    } catch (err) {
      console.error('Save error:', err)
      toast({
        title: 'Something went wrong',
        description: 'Could not update saved status. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        toast({
          title: 'Sign in to save',
          description: 'Create an account or sign in to save.',
          variant: 'destructive',
        })
        router.push('/login')
        return
      }

      const userId = session.user.id

      if (optimisticSaved) {
        setShowUnsaveConfirmModal(true)
        return
      } else {
        const { error } = await supabase.from('saved_locations').insert({
          user_id: userId,
          entity_type: entityType,
          entity_id: entityId,
        })
        if (error) {
          if (error.code === '23505') {
            // Already saved from a previous session - show modal
            setOptimisticSaved(true)
            setShowAlreadySavedModal(true)
          } else {
            throw error
          }
        } else {
          setOptimisticSaved(true)
          toast({
            title: 'Saved!',
            description: 'Added to your saved pins.',
          })
        }
      }
    } catch (err) {
      console.error('Save error:', err)
      toast({
        title: 'Something went wrong',
        description: 'Could not update saved status. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={isLoading}
    >
      {optimisticSaved ? (
        <>
          <BookmarkCheck className={`h-4 w-4 ${showLabel ? 'mr-1.5' : ''} fill-current`} />
          {showLabel && unsaveLabel}
        </>
      ) : (
        <>
          <Bookmark className={`h-4 w-4 ${showLabel ? 'mr-1.5' : ''}`} />
          {showLabel && 'Save'}
        </>
      )}
    </Button>

    <Dialog open={showAlreadySavedModal} onOpenChange={setShowAlreadySavedModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>This pin is already saved :)</DialogTitle>
        </DialogHeader>
        <p className="text-stone-600 text-sm">
          You can view your saved pins in "My Saved Pins" in your profile!
        </p>
      </DialogContent>
    </Dialog>

    <Dialog open={showUnsaveConfirmModal} onOpenChange={setShowUnsaveConfirmModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove from saved pins?</DialogTitle>
        </DialogHeader>
        <p className="text-stone-600 text-sm">
          This will remove this pin from your saved list. You can save it again anytime.
        </p>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setShowUnsaveConfirmModal(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={performUnsave} disabled={isLoading}>
            {isLoading ? 'Removing…' : 'Remove'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
