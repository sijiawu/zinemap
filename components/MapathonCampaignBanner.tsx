"use client";

import Link from "next/link";
import { Special_Elite } from "next/font/google";
import { X } from "lucide-react";

const specialElite = Special_Elite({ weight: "400", subsets: ["latin"] });

const brushStrokePath =
  "M 8 22 C 52 12, 96 30, 140 20 S 228 10, 272 24 S 360 14, 404 26 S 468 12, 512 20";

export default function MapathonCampaignBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className={`${specialElite.className} fixed left-0 right-0 top-[68px] z-40 w-full overflow-hidden border-b border-stone-200/80 bg-[#f6f1e7]`}>
      <Link
        href="/mapathon"
        className="relative z-10 block px-10 py-2 text-center text-xs leading-relaxed text-stone-900 transition-colors hover:bg-white/40 md:text-sm"
      >
        <span className="relative mx-auto block w-fit max-w-[calc(100%-2.5rem)] px-1">
          <svg
            viewBox="0 0 520 40"
            aria-hidden
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-0 top-1/2 z-0 h-8 w-full -translate-y-1/2 md:hidden"
          >
            <path
              d={brushStrokePath}
              fill="none"
              stroke="#fecdd3"
              strokeWidth="34"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.55"
            />
          </svg>
          <svg
            viewBox="0 0 520 40"
            aria-hidden
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-0 top-1/2 z-0 hidden h-6 w-full -translate-y-1/2 md:block"
          >
            <path
              d={brushStrokePath}
              fill="none"
              stroke="#fecdd3"
              strokeWidth="22"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.55"
            />
          </svg>
          <span className="relative z-10">
            Celebrate IZM 2026 and ZineMap&apos;s first birthday with{" "}
            <span className="italic">ZineMap-a-thon!</span>
          </span>
        </span>
      </Link>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss ZineMap-a-thon banner"
        className="absolute right-3 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-stone-600 transition-colors hover:text-stone-900"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
