"use client"

import { formatDateReadable, formatRelativeDate } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface RelativeDateWithTooltipProps {
  dateString: string
  /** Optional prefix before the relative date, e.g. " · " for inline, "Added " for zines */
  prefix?: string
  className?: string
}

/**
 * Displays a relative date (e.g. "2 days ago") with a tooltip showing the full date on hover.
 * Tooltip appears close to the element. No cursor-help.
 */
export function RelativeDateWithTooltip({ dateString, prefix = "", className }: RelativeDateWithTooltipProps) {
  if (!dateString) return null

  const fullDate = formatDateReadable(dateString)
  const relative = formatRelativeDate(dateString)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("text-stone-400", className)}>
          {prefix}{relative}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={2} className="text-xs">
        {fullDate}
      </TooltipContent>
    </Tooltip>
  )
}
