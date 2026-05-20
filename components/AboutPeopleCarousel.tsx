"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface ZinesterItem {
  id: string;
  city: string | null;
  state: string | null;
  country: string | null;
  user: {
    display_name: string | null;
    permalink: string | null;
    profile_image: string | null;
    roles: string[] | null;
    open_to: string[] | null;
    bio: string | null;
  } | null;
}

interface AboutPeopleCarouselProps {
  zinesters: ZinesterItem[];
}

function formatLocation(city?: string | null, state?: string | null, country?: string | null) {
  return [city, state, country].filter(Boolean).join(", ");
}

export default function AboutPeopleCarousel({ zinesters }: AboutPeopleCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [snapCount, setSnapCount] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      setSelectedIndex(api.selectedScrollSnap());
      setSnapCount(api.scrollSnapList().length);
    };
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  return (
    <div>
      <Carousel setApi={setApi} opts={{ align: "start", loop: true }} className="relative px-1">
        <CarouselContent className="-ml-2">
          {zinesters.map((zinester) => (
            <CarouselItem key={zinester.id} className="basis-[88%] pl-2 sm:basis-[48%] lg:basis-[31%]">
              <Link
                href={zinester.user?.permalink ? `/profile/${zinester.user.permalink}` : "/zinesters"}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-stone-200 bg-[#fffdf8] p-3 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-2">
                  <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-stone-200 bg-stone-100">
                    {zinester.user?.profile_image ? (
                      <img
                        src={zinester.user.profile_image}
                        alt={zinester.user.display_name || "Zinester"}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </span>
                  <div className="min-w-0 space-y-0.5">
                    <h3 className="truncate font-serif text-base font-semibold leading-tight text-stone-900">
                      {zinester.user?.display_name || "Anonymous Zinester"}
                    </h3>
                    {formatLocation(zinester.city, zinester.state, zinester.country) ? (
                      <p className="flex items-center gap-1 text-xs text-stone-600">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-600" />
                        <span className="truncate">
                          {formatLocation(zinester.city, zinester.state, zinester.country)}
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-1.5 flex flex-wrap gap-1">
                  {(zinester.user?.roles || []).map((role) => (
                    <span
                      key={`${zinester.id}-role-${role}`}
                      className="rounded-full border border-stone-300 bg-stone-100 px-2 py-0.5 text-[11px] text-stone-700"
                    >
                      {role}
                    </span>
                  ))}
                </div>

                {zinester.user?.bio ? (
                  <p className="mt-1.5 line-clamp-3 font-serif text-sm leading-relaxed text-stone-700">
                    {zinester.user.bio}
                  </p>
                ) : null}

                {zinester.user?.open_to?.length ? (
                  <p className="mt-1.5 text-xs font-normal leading-snug text-stone-700">
                    Reach out for: {zinester.user.open_to.join(" · ")}
                  </p>
                ) : null}
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute top-1/2 hidden h-8 w-8 -translate-y-1/2 bg-white md:-left-12 md:flex" />
        <CarouselNext className="absolute top-1/2 hidden h-8 w-8 -translate-y-1/2 bg-white md:-right-12 md:flex" />
      </Carousel>

      <div className="mt-3 flex justify-center gap-1.5">
        {Array.from({ length: snapCount }, (_, index) => (
          <button
            key={`people-dot-${index}`}
            type="button"
            aria-label={`Go to people slide ${index + 1}`}
            onClick={() => api?.scrollTo(index)}
            className={`h-1.5 rounded-full transition-all ${
              selectedIndex === index ? "w-4 bg-stone-700" : "w-1.5 bg-stone-300 hover:bg-stone-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
