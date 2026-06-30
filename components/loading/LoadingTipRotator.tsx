"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface LoadingTipRotatorProps {
  tips: string[]
  className?: string
}

export function LoadingTipRotator({ tips, className }: LoadingTipRotatorProps) {
  if (!tips.length) return null
  const [randomTipIndex] = useState(() => Math.floor(Math.random() * tips.length))

  return (
    <div className={cn("w-full max-w-2xl", className)}>
      <p className="text-sm leading-relaxed text-stone-700 md:text-base">{tips[randomTipIndex]}</p>
    </div>
  )
}
