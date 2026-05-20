"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContributeListingMenuProps {
  variant?: "hero" | "default";
}

const LISTING_OPTIONS = [
  { href: "/add-store", label: "Add a shop", dotClassName: "bg-rose-500", hoverClassName: "hover:bg-rose-50" },
  { href: "/add-library", label: "Add a library", dotClassName: "bg-blue-500", hoverClassName: "hover:bg-blue-50" },
  { href: "/add-event", label: "Add an event", dotClassName: "bg-[#009035]", hoverClassName: "hover:bg-green-50" },
] as const;

export function ContributeListingMenu({ variant = "default" }: ContributeListingMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && !(event.target as Element).closest(".contribute-listing-menu")) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const buttonClassName =
    variant === "hero"
      ? "border-stone-400 bg-[#fffdf8] font-medium text-stone-800 hover:bg-stone-100"
      : "bg-stone-800 hover:bg-stone-900 text-white font-gloria px-8 py-4 text-lg rounded-lg shadow-md transition-colors";

  return (
    <div className="relative contribute-listing-menu">
      <Button
        type="button"
        variant={variant === "hero" ? "outline" : "default"}
        onClick={() => setIsOpen((open) => !open)}
        className={buttonClassName}
      >
        Contribute a listing
        <ChevronDown
          className={`ml-2 h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </Button>

      {isOpen ? (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-[220px] rounded-lg border border-stone-200 bg-white shadow-lg">
          <div className="space-y-1 p-2">
            {LISTING_OPTIONS.map((option) => (
              <Link
                key={option.href}
                href={option.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
              >
                <div
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-md px-4 py-3 transition-colors ${option.hoverClassName}`}
                >
                  <div className={`h-3 w-3 rounded-full ${option.dotClassName}`} />
                  <span className="font-gloria font-medium text-stone-800">{option.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
