import { cn } from "@/lib/utils"

interface MapLoadingOverlayProps {
  title?: string
  subtitle?: string
  absolute?: boolean
  className?: string
}

export function MapLoadingOverlay({
  title = "Loading map...",
  subtitle,
  absolute = true,
  className,
}: MapLoadingOverlayProps) {
  return (
    <div
      className={cn(
        "z-10",
        absolute ? "absolute inset-0 bg-stone-100/85" : "h-full w-full bg-stone-100",
        className
      )}
    >
      <div className="flex h-full min-h-[18rem] w-full items-center justify-center px-4 text-center">
        <div>
          <p className="text-base text-stone-700 animate-pulse motion-reduce:animate-none">{title}</p>
          {subtitle ? <p className="mt-1 text-sm text-stone-500">{subtitle}</p> : null}
        </div>
      </div>
    </div>
  )
}
