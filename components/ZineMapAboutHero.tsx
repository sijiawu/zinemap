import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ContributeListingMenu } from "@/components/ContributeListingMenu"
import {
  HeroBusyPin,
  HeroFeaturedPin,
  ZineMapHeroVisual,
} from "@/components/ZineMapHeroVisual"
import { formatDateReadable, formatRelativeDate } from "@/lib/utils"

export interface ZineMapAboutHeroStats {
  zinesterCount: number
  countryCount: number
}

interface ZineMapAboutHeroProps {
  stats?: ZineMapAboutHeroStats
  busyPins: HeroBusyPin[]
  featuredPins: HeroFeaturedPin[]
  lastUpdatedAt?: string | null
}

export function ZineMapAboutHero({
  stats,
  busyPins,
  featuredPins,
  lastUpdatedAt,
}: ZineMapAboutHeroProps) {
  const lastUpdatedRelative = lastUpdatedAt ? formatRelativeDate(lastUpdatedAt) : null
  const lastUpdatedReadable = lastUpdatedAt ? formatDateReadable(lastUpdatedAt) : null
  const peopleCount = stats?.zinesterCount ?? 700
  const countryCount = stats?.countryCount ?? 43

  return (
    <section className="relative overflow-hidden border-b border-stone-200 bg-[#faf8f5]">
      <div aria-hidden className="absolute inset-0 overflow-hidden opacity-55">
        <div className="zine-cover-track flex h-full w-max">
          {[0, 1].map((panel) => (
            <img
              key={panel}
              src="/brand/zine-cover-collage.webp"
              alt=""
              width={1650}
              height={700}
              className="h-full w-auto max-w-none shrink-0 object-cover saturate-[0.75] contrast-[0.9]"
            />
          ))}
        </div>
      </div>
      <div
        className="absolute inset-0 bg-gradient-to-r from-[#faf8f5]/95 via-[#faf8f5]/80 to-[#faf8f5]/55"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-8 md:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-10">
        <div className="max-w-xl py-3 md:py-5">
          <div className="flex items-center gap-2.5">
            <Image
              src="/brand/zinemap-mark.svg"
              alt=""
              width={44}
              height={44}
              className="h-9 w-9 md:h-10 md:w-10"
              priority
            />
            <span className="font-gloria text-2xl text-stone-900 md:text-[1.75rem]">
              ZineMap
            </span>
          </div>
          <h1 className="mt-4 font-serif text-[1.75rem] leading-[1.35] text-stone-800 md:text-[2rem] md:leading-[1.3]">
            A collaborative map
            <br />
            of the global zine scene, one year in!
          </h1>
          <p className="mt-4 font-serif text-base leading-relaxed text-stone-700 md:text-lg">
            Since July 2025,{" "}
            <span className="rounded-sm bg-[#fecdd3]/60 px-1 font-semibold text-stone-800">
              {peopleCount.toLocaleString("en-US")} people
            </span>{" "}
            across{" "}
            <span className="rounded-sm bg-[#fecdd3]/60 px-1 font-semibold text-stone-800">
              {countryCount.toLocaleString("en-US")} countries
            </span>{" "}
            have added places, events, notes, and knowledge to ZineMap.
            <span className="mt-2 block">
              <span className="rounded-sm bg-[#fecdd3]/60 px-1 font-semibold text-stone-800">
               Thank you for mapping the zine world together!
              </span>
            </span>
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              asChild
              className="bg-[#e11d48] font-medium text-white hover:bg-[#be123c]"
            >
              <Link href="/map" target="_blank" rel="noopener noreferrer">Explore the map</Link>
            </Button>
            <ContributeListingMenu variant="hero" />
          </div>
          {lastUpdatedRelative ? (
            <p className="mt-5 text-sm text-stone-500">
              The map was last updated{" "}
              <span
                className="text-stone-600"
                title={lastUpdatedReadable ?? undefined}
              >
                {lastUpdatedRelative}
              </span>
              .
            </p>
          ) : null}
        </div>

        <ZineMapHeroVisual busyPins={busyPins} featuredPins={featuredPins} />
      </div>
    </section>
  )
}
