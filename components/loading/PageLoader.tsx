import { cn } from "@/lib/utils"
import { SITE_LOADING_TIPS } from "@/components/loading/loadingTips"
import { ZinemapLogoLoader } from "@/components/loading/ZinemapLogoLoader"
import { LoadingTipRotator } from "@/components/loading/LoadingTipRotator"

interface PageLoaderProps {
  title?: string
  subtitle?: string
  tips?: string[]
  compact?: boolean
  showTips?: boolean
  className?: string
}

export function PageLoader({
  title: _title,
  subtitle: _subtitle,
  tips = SITE_LOADING_TIPS,
  compact = false,
  showTips: _showTips,
  className,
}: PageLoaderProps) {
  return (
    <div
      className={cn(
        "bg-stone-50",
        compact ? "h-full min-h-[16rem] w-full rounded-lg" : "min-h-screen",
        className
      )}
    >
      <div className={cn("mx-auto flex w-full max-w-3xl flex-col items-center px-4", compact ? "justify-center py-8" : "justify-center py-14 md:py-20")}>
        <div className="flex flex-col items-center text-center">
          <ZinemapLogoLoader compact={compact} />
          <LoadingTipRotator tips={tips} className="mt-5 text-lg md:text-xl" />
          <p className="mt-4 text-base text-stone-700 animate-pulse motion-reduce:animate-none">Loading...</p>
        </div>
      </div>
    </div>
  )
}
