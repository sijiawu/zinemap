import Image from "next/image";
import Link from "next/link";
import { supporters } from "@/content/supporters";

export default function AboutSupportersSection() {
  return (
    <section id="supporters" className="scroll-mt-20 px-2 py-4 sm:px-4">
      <h2 className="font-gloria text-3xl text-stone-900">Thank you to ZineMap supporters</h2>
      <p className="mt-3 max-w-3xl font-serif text-sm leading-relaxed text-stone-700 md:text-lg">
        ZineMap is free to use, but keeping the site running and growing comes with ongoing costs.
      </p>
      <p className="mt-3 max-w-6xl font-serif text-sm leading-relaxed text-stone-700 md:text-lg">
        Thank you to the supporters below for helping ZineMap through donations and in-kind support!
      </p>
      <div className="mt-3 grid max-w-6xl grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 md:grid-cols-6 md:gap-x-4 md:gap-y-5">
        {supporters.map((supporter) => (
          <Link
            key={supporter.name}
            href={supporter.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visit ${supporter.name}`}
            className="group flex items-center justify-center p-1"
          >
            <Image
              src={supporter.logoSrc}
              alt={`${supporter.name} logo`}
              width={supporter.width}
              height={supporter.height}
              className="h-20 w-auto max-w-full object-contain opacity-90 transition duration-200 group-hover:opacity-100 sm:h-[6.25rem]"
            />
          </Link>
        ))}
      </div>

      <p className="mt-3 max-w-6xl font-serif text-sm leading-relaxed text-stone-700 md:text-lg">
        Thank you also to ZineMap&apos;s monthly and one-time{" "}
        <Link
          href="https://ko-fi.com/cjwu"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-rose-700 underline decoration-rose-300 underline-offset-2 transition hover:text-rose-800 hover:decoration-rose-500"
        >
          Ko-fi supporters
        </Link>{" "}
        for helping with the ongoing operating costs.
      </p>
      <p className="mt-4 max-w-4xl font-serif text-sm leading-relaxed text-stone-700 md:text-lg">
        If you&apos;d like to support ZineMap too, this page shares a few meaningful ways to help:{" "}
        <Link
          href="/support-zinemap"
          className="font-medium text-rose-700 underline decoration-rose-300 underline-offset-2 transition hover:text-rose-800 hover:decoration-rose-500"
        >
          Support ZineMap
        </Link>
      </p>
    </section>
  );
}
