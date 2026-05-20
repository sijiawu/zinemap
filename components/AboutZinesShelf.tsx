"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, ChevronLeft, ChevronRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { autoLinkText } from "@/lib/utils";
import { RelativeDateWithTooltip } from "@/components/RelativeDateWithTooltip";

type ZineShelfItem = {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  permalink: string;
  created_at: string;
  profiles: {
    id: string;
    display_name: string | null;
    profile_image: string | null;
    permalink: string | null;
  } | null;
};

interface AboutZinesShelfProps {
  items: ZineShelfItem[];
}

export default function AboutZinesShelf({ items }: AboutZinesShelfProps) {
  const [desktopApi, setDesktopApi] = useState<CarouselApi>();
  const [mobileApi, setMobileApi] = useState<CarouselApi>();
  const [selectedBatch, setSelectedBatch] = useState(0);
  const [selectedZine, setSelectedZine] = useState<ZineShelfItem | null>(null);
  const batchSize = 5;
  const batchCount = Math.max(1, Math.ceil(items.length / batchSize));
  const batches = Array.from({ length: batchCount }, (_, index) =>
    items.slice(index * batchSize, index * batchSize + batchSize)
  );
  const profileHref = (zine: ZineShelfItem) =>
    zine.profiles?.id ? `/profile/${zine.profiles.permalink || zine.profiles.id}` : null;

  useEffect(() => {
    if (!desktopApi) return;
    const onSelect = () => {
      setSelectedBatch(desktopApi.selectedScrollSnap());
    };
    onSelect();
    desktopApi.on("select", onSelect);
    return () => desktopApi.off("select", onSelect);
  }, [desktopApi]);

  const renderZineCard = (zine: ZineShelfItem) => (
    <article
      key={zine.id}
      className="block h-full bg-white shadow-sm transition-shadow hover:shadow-md"
      role="button"
      tabIndex={0}
      onClick={() => setSelectedZine(zine)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setSelectedZine(zine);
        }
      }}
    >
      <div className="aspect-[4/5] w-full overflow-hidden bg-stone-100 sm:aspect-[3/4]">
        {zine.cover_image ? (
          <img
            src={zine.cover_image}
            alt={`${zine.title} cover`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-stone-500">
            No cover
          </div>
        )}
      </div>
      <div className="space-y-1.5 p-2.5 font-serif sm:space-y-2 sm:p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-stone-900 sm:text-base">{zine.title}</h3>

        <div className="flex items-center gap-2">
          {profileHref(zine) ? (
            <>
              <Link
                href={profileHref(zine)!}
                target="_blank"
                rel="noopener noreferrer"
                className="h-5 w-5 flex-shrink-0 overflow-hidden rounded-full bg-stone-200 transition-all hover:ring-2 hover:ring-purple-200 sm:h-6 sm:w-6"
                onClick={(event) => event.stopPropagation()}
              >
                {zine.profiles?.profile_image ? (
                  <img
                    src={zine.profiles.profile_image}
                    alt={zine.profiles.display_name || "Author"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-2.5 w-2.5 text-stone-500 sm:h-3 sm:w-3" />
                  </div>
                )}
              </Link>
              <Link
                href={profileHref(zine)!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-stone-600 transition-colors hover:text-purple-600 sm:text-sm"
                onClick={(event) => event.stopPropagation()}
              >
                {zine.profiles?.display_name || "Unknown Author"}
              </Link>
            </>
          ) : (
            <>
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-stone-200 sm:h-6 sm:w-6">
                <User className="h-2.5 w-2.5 text-stone-500 sm:h-3 sm:w-3" />
              </span>
              <span className="text-xs font-medium text-stone-600 sm:text-sm">Unknown Author</span>
            </>
          )}
        </div>

        {zine.description ? (
          <p className="line-clamp-2 text-xs text-stone-600 sm:line-clamp-3 sm:text-sm">{autoLinkText(zine.description)}</p>
        ) : null}

        <div className="flex items-center justify-end font-sans text-xs text-stone-500">
          <span>
            <RelativeDateWithTooltip dateString={zine.created_at} prefix="Added " />
          </span>
        </div>
      </div>
    </article>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-gloria text-2xl text-stone-900">Recently added zines</h3>
        <Button
          asChild
          variant="outline"
          className="h-9 border-stone-300 bg-[#fffdf8] px-3.5 text-sm font-medium text-stone-700 shadow-none hover:border-stone-400 hover:bg-stone-100 hover:text-stone-800"
        >
          <Link href="/zines" target="_blank" rel="noopener noreferrer">View all zines</Link>
        </Button>
      </div>

      <div className="relative bg-transparent px-1 py-1 sm:hidden">
        <Carousel setApi={setMobileApi} opts={{ align: "start", slidesToScroll: 1 }} className="w-full">
          <CarouselContent className="-ml-2">
            {items.map((zine) => (
              <CarouselItem key={`mobile-${zine.id}`} className="pl-2 basis-[84%]">
                {renderZineCard(zine)}
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      <div className="relative hidden bg-transparent px-1 py-1 sm:block">
        <Carousel setApi={setDesktopApi} opts={{ align: "start", slidesToScroll: 1 }} className="w-full">
          <CarouselContent className="-ml-2">
            {batches.map((batch, batchIndex) => (
              <CarouselItem key={`batch-${batchIndex}`} className="pl-2 basis-[96%]">
                <div className="grid grid-cols-5 gap-2.5">
                  {batch.map((zine) => renderZineCard(zine))}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <Button
          type="button"
          size="icon"
          variant="outline"
          className="absolute -left-10 top-1/2 h-8 w-8 -translate-y-1/2 bg-white md:-left-12"
          onClick={() => desktopApi?.scrollPrev()}
          aria-label="Previous zines"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="absolute -right-10 top-1/2 h-8 w-8 -translate-y-1/2 bg-white md:-right-12"
          onClick={() => desktopApi?.scrollNext()}
          aria-label="Next zines"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="hidden justify-center gap-1.5 sm:flex">
        {Array.from({ length: batchCount }, (_, index) => (
          <button
            key={`batch-${index}`}
            type="button"
            onClick={() => desktopApi?.scrollTo(index)}
            aria-label={`Go to zine batch ${index + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              selectedBatch === index ? "w-4 bg-stone-700" : "w-1.5 bg-stone-300 hover:bg-stone-400"
            }`}
          />
        ))}
      </div>

      {selectedZine && typeof document !== "undefined"
        ? createPortal(
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedZine(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-6 relative">
              <button
                onClick={() => setSelectedZine(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold"
                aria-label="Close zine modal"
              >
                x
              </button>

              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  {selectedZine.cover_image ? (
                    <img
                      src={selectedZine.cover_image}
                      alt={`${selectedZine.title} cover`}
                      className="w-full md:w-64 h-auto max-h-96 object-cover rounded border border-stone-200"
                    />
                  ) : (
                    <div className="w-full md:w-64 h-80 rounded border border-stone-200 bg-stone-100 flex items-center justify-center">
                      <BookOpen className="h-16 w-16 text-stone-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 font-serif">
                  <h2 className="text-2xl font-bold text-stone-800 mb-4">{selectedZine.title}</h2>

                  <div className="flex items-center gap-2 mb-4">
                    {profileHref(selectedZine) ? (
                      <>
                        <Link
                          href={profileHref(selectedZine)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full bg-stone-200 overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-purple-200 transition-all"
                        >
                          {selectedZine.profiles?.profile_image ? (
                            <img
                              src={selectedZine.profiles.profile_image}
                              alt={selectedZine.profiles.display_name || "Author"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="h-4 w-4 text-stone-500" />
                            </div>
                          )}
                        </Link>
                        <Link
                          href={profileHref(selectedZine)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-stone-600 hover:text-purple-600 transition-colors font-medium"
                        >
                          {selectedZine.profiles?.display_name || "Unknown Author"}
                        </Link>
                      </>
                    ) : (
                      <>
                        <span className="w-8 h-8 rounded-full bg-stone-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          <User className="h-4 w-4 text-stone-500" />
                        </span>
                        <span className="text-stone-600 font-medium">Unknown Author</span>
                      </>
                    )}
                  </div>

                  {selectedZine.description ? (
                    <p className="text-stone-600 whitespace-pre-wrap mb-4">
                      {autoLinkText(selectedZine.description)}
                    </p>
                  ) : null}

                  <div className="flex items-center gap-1 text-sm text-stone-500 font-sans">
                    <RelativeDateWithTooltip dateString={selectedZine.created_at} prefix="Added " />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        , document.body)
        : null}
    </div>
  );
}
