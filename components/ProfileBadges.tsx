import Link from "next/link"
import { MAPATHON_2026_PARTICIPANT_IDS } from "@/lib/mapathonParticipants2026"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const MAPATHON_BADGE_LABEL = "ZineMap-A-Thon Contributor 2026"

interface ProfileBadgesProps {
  userId: string
  titleClassName?: string
}

export function ProfileBadges({ userId, titleClassName }: ProfileBadgesProps) {
  if (!MAPATHON_2026_PARTICIPANT_IDS.has(userId)) return null

  return (
    <Card className="mt-4 border-stone-200 bg-white shadow-sm sm:mt-6">
      <CardHeader>
        <CardTitle className={titleClassName ?? "text-lg font-semibold text-stone-800"}>
          Badges
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/mapathon"
            target="_blank"
            rel="noopener noreferrer"
            title={MAPATHON_BADGE_LABEL}
            aria-label={`${MAPATHON_BADGE_LABEL} — open ZineMap-a-thon page`}
            className="group relative inline-flex rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
          >
            <img
              src="/brand/mapathon-contributor-2026.png"
              alt={MAPATHON_BADGE_LABEL}
              width={218}
              height={216}
              className="h-24 w-24 transition-transform duration-200 group-hover:scale-105"
            />
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-stone-900 px-2.5 py-1.5 text-xs text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              {MAPATHON_BADGE_LABEL}
            </span>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
