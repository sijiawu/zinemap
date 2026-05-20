"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface StoryItem {
  slug: string;
  title: string;
  excerpt: string;
  thumbnail?: string;
  tags?: string[];
}

interface AboutStoriesCarouselProps {
  stories: StoryItem[];
}

export default function AboutStoriesCarousel({ stories }: AboutStoriesCarouselProps) {
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
      <Carousel setApi={setApi} opts={{ align: "start", loop: true }} className="relative">
        <CarouselContent className="-ml-3">
          {stories.map((story) => (
            <CarouselItem key={story.slug} className="basis-[88%] pl-3 sm:basis-[60%] lg:basis-[46%]">
              <Link
                href={`/stories/${story.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block h-64 overflow-hidden rounded-xl border border-stone-200 bg-stone-900 shadow-sm transition-shadow hover:shadow-md"
              >
                {story.thumbnail ? (
                  <img
                    src={story.thumbnail}
                    alt={story.title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
                <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/65 via-50% to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/85">
                    {story.tags?.some((tag) => tag.toLowerCase() === "newsletter") ? "Newsletter" : "Interview"}
                  </p>
                  <h3 className="mt-1 line-clamp-2 text-lg font-semibold leading-snug text-white">
                    {story.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-snug text-white/95">{story.excerpt}</p>
                </div>
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
            key={`stories-dot-${index}`}
            type="button"
            aria-label={`Go to story slide ${index + 1}`}
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
