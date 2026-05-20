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
  pinCount: number
  zineCount: number
  zinesterCount: number
  countryCount: number
}

interface ZineMapAboutHeroProps {
  stats?: ZineMapAboutHeroStats
  busyPins: HeroBusyPin[]
  featuredPins: HeroFeaturedPin[]
  lastUpdatedAt?: string | null
}

export function ZineMapAboutHero({ busyPins, featuredPins, lastUpdatedAt }: ZineMapAboutHeroProps) {
  const lastUpdatedRelative = lastUpdatedAt ? formatRelativeDate(lastUpdatedAt) : null
  const lastUpdatedReadable = lastUpdatedAt ? formatDateReadable(lastUpdatedAt) : null

  return (
    <section className="border-b border-stone-200 bg-[#faf8f5]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-10">
        <div className="max-w-xl">
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
            of the global zine scene.
          </h1>
          <p className="mt-4 font-serif text-base leading-relaxed text-stone-700 md:text-lg">
          Discover spaces and events around the world that support zines and independent publishing, and help map the scene as it grows.
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
