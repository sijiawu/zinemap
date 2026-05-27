"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function RegenerateOccurrenceDatesDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent className="font-serif">
        <AlertDialogHeader>
          <AlertDialogTitle>Replace selected dates?</AlertDialogTitle>
          <AlertDialogDescription>
            Changing the repeat schedule will replace your manually selected dates with a new set
            generated from the updated schedule.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Keep my dates</AlertDialogCancel>
          <AlertDialogAction
            className="bg-[#009035] hover:bg-[#007a2a]"
            onClick={onConfirm}
          >
            Replace dates
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
