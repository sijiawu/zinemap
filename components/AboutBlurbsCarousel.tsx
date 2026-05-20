"use client";

import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

export type BlurbCarouselItem = {
  quote: string;
  byline: string;
};

interface AboutBlurbsCarouselProps {
  items: BlurbCarouselItem[];
}

export default function AboutBlurbsCarousel({ items }: AboutBlurbsCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelectedIndex(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  if (items.length === 0) return null;

  return (
    <Carousel setApi={setApi} opts={{ align: "start", loop: true }} className="relative">
      <CarouselContent>
        {items.map((blurb) => {
          const [name, ...roleParts] = blurb.byline.split(/,\s*/);
          const role = roleParts.join(" \u00b7 ");
          return (
            <CarouselItem key={blurb.byline} className="basis-full">
              <figure className="mx-auto max-w-4xl px-4 text-center md:px-8">
                <blockquote className="font-serif text-[21px] leading-[1.6] text-stone-800 md:text-[24px] md:leading-[1.55]">
                  {blurb.quote}
                </blockquote>
                <figcaption className="mt-4 flex flex-col items-center gap-0.5 md:mt-5">
                  <span aria-hidden className="h-px w-8 bg-stone-300" />
                  <span className="mt-1.5 font-serif text-base font-semibold text-stone-800 md:text-[17px]">
                    {name}
                  </span>
                  {role ? (
                    <span className="text-[13px] leading-snug text-stone-500">{role}</span>
                  ) : null}
                </figcaption>
              </figure>
            </CarouselItem>
          );
        })}
      </CarouselContent>

      <div className="mt-4 flex justify-center gap-1.5 md:mt-5">
        {items.map((blurb, index) => (
          <button
            key={blurb.byline}
            type="button"
            onClick={() => api?.scrollTo(index)}
            aria-label={`Show quote ${index + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              selectedIndex === index ? "w-4 bg-stone-700" : "w-1.5 bg-stone-300 hover:bg-stone-400"
            }`}
          />
        ))}
      </div>
    </Carousel>
  );
}
