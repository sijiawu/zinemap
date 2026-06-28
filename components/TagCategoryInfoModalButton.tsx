"use client"

import { useState } from "react"
import { HelpCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LIBRARY_TYPE_TAG_DETAILS, SHOP_TYPE_TAG_DETAILS } from "@/lib/utils"

interface TagCategoryInfoModalButtonProps {
  category: "shop_type" | "library_type"
}

export function TagCategoryInfoModalButton({ category }: TagCategoryInfoModalButtonProps) {
  const [open, setOpen] = useState(false)
  const items = category === "shop_type" ? SHOP_TYPE_TAG_DETAILS : LIBRARY_TYPE_TAG_DETAILS
  const title = category === "shop_type" ? "Shop Type Guide" : "Library Type Guide"

  return (
    <>
      <button
        type="button"
        aria-label={`Open ${title}`}
        onClick={() => setOpen(true)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-stone-300 text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-colors"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto space-y-4 pr-1">
            {items.map((item) => (
              <div key={item.id}>
                <h4 className="text-sm font-semibold text-stone-800">{item.label}</h4>
                <p className="text-sm text-stone-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
