"use client"

import { useMemo } from "react"
import { format, parseISO } from "date-fns"
import { X } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import {
  MAX_RECURRENCE_OCCURRENCES,
  formatDateWithWeekday,
  normalizeOccurrenceDates,
} from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

export type OccurrenceDatePickerProps = {
  selectedDates: string[]
  onChange: (dates: string[]) => void
  maxSelectable?: number
  /** Disable selecting dates before this (YYYY-MM-DD). Defaults to today. Pass null for no minimum. */
  minDate?: string | null
  className?: string
}

function toDateStrings(dates: Date[] | undefined): string[] {
  if (!dates?.length) return []
  return dates.map((d) => format(d, "yyyy-MM-dd"))
}

export function OccurrenceDatePicker({
  selectedDates,
  onChange,
  maxSelectable = MAX_RECURRENCE_OCCURRENCES,
  minDate,
  className,
}: OccurrenceDatePickerProps) {
  const { toast } = useToast()
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], [])
  const min = minDate === null ? null : (minDate ?? todayStr)

  const selectedAsDates = useMemo(
    () => selectedDates.map((d) => parseISO(d)).filter((d) => !isNaN(d.getTime())),
    [selectedDates]
  )

  const sortedDates = useMemo(() => normalizeOccurrenceDates(selectedDates), [selectedDates])

  const handleSelect = (dates: Date[] | undefined) => {
    const next = toDateStrings(dates)
    if (next.length > maxSelectable) {
      toast({
        title: "Maximum dates reached",
        description: `A series can include at most ${maxSelectable} dates.`,
        variant: "destructive",
      })
      onChange(normalizeOccurrenceDates(selectedDates))
      return
    }
    onChange(next)
  }

  const removeDate = (dateStr: string) => {
    onChange(selectedDates.filter((d) => d !== dateStr))
  }

  return (
    <div className={className}>
      <p className="text-stone-600 font-serif text-sm mb-2">
        Review and adjust dates for this series. Click a day to add or remove it ({sortedDates.length}/
        {maxSelectable} selected).
      </p>
      <div className="rounded-md border border-stone-200 bg-stone-50 inline-block">
        <Calendar
          mode="multiple"
          selected={selectedAsDates}
          onSelect={handleSelect}
          disabled={min ? (date) => format(date, "yyyy-MM-dd") < min : undefined}
          classNames={{
            day_selected:
              "bg-[#009035] text-white hover:bg-[#007a2a] hover:text-white focus:bg-[#009035] focus:text-white",
          }}
        />
      </div>
      {sortedDates.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          <li className="text-stone-500 text-xs font-serif">Selected dates:</li>
          {sortedDates.map((dateStr) => (
            <li
              key={dateStr}
              className="flex items-center justify-between gap-2 text-stone-700 font-serif text-sm py-1 px-2 rounded bg-stone-100/80"
            >
              <span>{formatDateWithWeekday(dateStr)}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-stone-500 hover:text-red-700"
                onClick={() => removeDate(dateStr)}
                aria-label={`Remove ${dateStr}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
