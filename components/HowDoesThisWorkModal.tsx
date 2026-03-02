"use client"

import { useState } from "react"
import { HelpCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface HowDoesThisWorkModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CONTENT = `ZineMap is a community-maintained map of spaces and events connected to zines and independent publishing.

Its goal is to help people discover and connect with independent publishing communities around the world. Anyone can contribute to making that possible.

If you know of a shop that carries zines, a library or archive with a zine collection, or an event that celebrates zines or small-press work, you can add it to the map. This includes spaces or events you run, places you’ve visited, or those identified through reliable public sources.

All listings can be updated, corrected, or removed upon request. Information on ZineMap is improved over time through community contributions, ongoing updates, and shared responsibility for accuracy.
`

export function HowDoesThisWorkModal({ open, onOpenChange }: HowDoesThisWorkModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl font-sans">
        <DialogHeader>
          <DialogTitle className="font-semibold text-lg tracking-tight text-stone-800">How does this work?</DialogTitle>
        </DialogHeader>
        <div className="text-stone-700 text-[15px] leading-[1.75] space-y-5 max-h-[70vh] overflow-y-auto pr-1 text-justify">
          {CONTENT.split("\n\n").filter(Boolean).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Link + modal combo to place under "Drop a pin" / add buttons */
export function HowDoesThisWorkLink({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-sm font-medium text-stone-700 hover:text-stone-900 px-3 py-1.5 rounded-md hover:bg-stone-100 transition-colors border border-transparent hover:border-stone-200 ${className ?? ""}`}
      >
        <HelpCircle className="h-4 w-4 text-stone-500" />
        How does this work?
      </button>
      <HowDoesThisWorkModal open={open} onOpenChange={setOpen} />
    </>
  )
}
