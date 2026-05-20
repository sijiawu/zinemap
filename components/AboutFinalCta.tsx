"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { supabase } from "@/lib/supabaseClient";
import { ContributeListingMenu } from "@/components/ContributeListingMenu";

interface AboutFinalCtaProps {
  initialContributorCount?: number | null;
}

export default function AboutFinalCta({ initialContributorCount = null }: AboutFinalCtaProps) {
  const { user, loading } = useSupabaseUser();
  const [contributorCount, setContributorCount] = useState<number | null>(initialContributorCount);

  useEffect(() => {
    let mounted = true;

    const loadContributorCount = async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });

      if (!mounted || error || typeof count !== "number") return;
      setContributorCount(count);
    };

    loadContributorCount();

    return () => {
      mounted = false;
    };
  }, []);

  const contributorText = useMemo(() => {
    if (typeof contributorCount !== "number") return "...";
    return new Intl.NumberFormat("en-US").format(contributorCount);
  }, [contributorCount]);

  return (
    <section className="rounded-2xl border border-stone-200 bg-[#fffdf8] px-5 py-8 text-center shadow-sm sm:px-8">
      <h2 className="mt-2 font-gloria text-3xl text-stone-900">Join the map!</h2>
      <p className="mx-auto mt-3 max-w-2xl font-serif text-sm leading-relaxed text-stone-600 md:text-base">
        If you know a shop that stocks zines, a library with a zine collection, a zine fest, swap or workshop,
        add it to the map and help others discover it!
        <br />
        Join a growing community of{" "}
        <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 font-mono font-bold text-rose-700 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]">
          {contributorText}
        </span>{" "}
        contributors mapping the global zine scene together.
      </p>
      <div className="mt-5 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
        <Button asChild className="bg-[#e11d48] font-medium text-white hover:bg-[#be123c]">
          <Link href="/map" target="_blank" rel="noopener noreferrer">Explore the map</Link>
        </Button>
        <ContributeListingMenu variant="hero" />
        {!loading && !user ? (
          <Button
            asChild
            variant="outline"
            className="h-9 border-stone-300 bg-[#fffdf8] px-3.5 text-sm font-medium text-stone-700 shadow-none hover:border-stone-400 hover:bg-stone-100 hover:text-stone-800"
          >
            <Link href="/login?mode=signup" target="_blank" rel="noopener noreferrer">Join the community</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
