"use client";

import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

export function MapathonFaq() {
  const { user } = useSupabaseUser();

  return (
    <section className="text-sm leading-[1.85] md:text-base">
      <h2 className="mb-3 text-xl leading-tight md:text-2xl">FAQ</h2>
      <Accordion type="single" collapsible className="border-t border-stone-300">
        <AccordionItem value="account" className="border-stone-300">
          <AccordionTrigger className="text-left text-sm font-normal md:text-base">
            Do I need an account to take part?
          </AccordionTrigger>
          <AccordionContent className="text-xs leading-relaxed text-stone-700 md:text-sm">
            {user ? (
              <p>Yes, and I think you already have one :)</p>
            ) : (
              <p>
                Yes - you can create one{" "}
                <Link
                  href="/login?mode=signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  here
                </Link>
                .
              </p>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="edit-listing" className="border-stone-300">
          <AccordionTrigger className="text-left text-sm font-normal md:text-base">
            How do I edit an existing listing?
          </AccordionTrigger>
          <AccordionContent className="text-xs leading-relaxed text-stone-700 md:text-sm">
            There&apos;s a &quot;suggest an edit&quot; link at the bottom of the page that you can
            use, next to where it says &quot;Is any information outdated, incorrect, or
            missing?&quot;
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="unvisited-place" className="border-stone-300">
          <AccordionTrigger className="text-left text-sm font-normal md:text-base">
            Can I add a space I haven&apos;t been to?
          </AccordionTrigger>
          <AccordionContent className="text-xs leading-relaxed text-stone-700 md:text-sm">
            Absolutely! You don&apos;t need to have personally visited a place to add it to ZineMap.
            Just check that the details are current before submitting it.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="past-contributions" className="border-stone-300">
          <AccordionTrigger className="text-left text-sm font-normal md:text-base">
            Where can I see listings I&apos;ve added before?
          </AccordionTrigger>
          <AccordionContent className="text-xs leading-relaxed text-stone-700 md:text-sm">
            You can see your past contributions all in one place by going to your profile (top right corner)
            under the &quot;My Contributions&quot; tab, with an edit button next to each listing should anything needs to be updated.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
