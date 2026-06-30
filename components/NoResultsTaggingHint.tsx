"use client"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface NoResultsTaggingHintProps {
  entityType?: "shop" | "library"
}

export function NoResultsTaggingHint({ entityType = "shop" }: NoResultsTaggingHintProps) {
  const categoryLabel = entityType === "library" ? "Library Type" : "Shop Type"
  const nounLabel = entityType === "library" ? "libraries" : "shops"

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-xs text-stone-400 underline underline-offset-2 decoration-stone-300 hover:text-stone-500 transition-colors"
          aria-label="Why no results?"
        >
          No results?
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-64 rounded-md border-stone-200 bg-white p-3 text-xs leading-relaxed text-stone-600 shadow-sm"
      >
        {categoryLabel} is a new field, and many places are not yet tagged. Scroll down to filter by other tags, or help improve the map by tagging the {nounLabel} you know! (Use "Suggest an edit" at the bottom of the listing")
      </PopoverContent>
    </Popover>
  )
}
