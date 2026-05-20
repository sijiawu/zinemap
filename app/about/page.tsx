import Link from "next/link";
import { readFile } from "fs/promises";
import { join } from "path";
import { ZineMapAboutHero } from "@/components/ZineMapAboutHero";
import AboutZinesShelf from "@/components/AboutZinesShelf";
import AboutBlurbsCarousel from "@/components/AboutBlurbsCarousel";
import AboutFinalCta from "@/components/AboutFinalCta";
import AboutStoriesCarousel from "@/components/AboutStoriesCarousel";
import AboutPeopleCarousel from "@/components/AboutPeopleCarousel";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import type { HeroBusyPin, HeroFeaturedPin } from "@/components/ZineMapHeroVisual";
import { getAllStories } from "@/lib/getStories";

export const metadata = {
  title: "About - ZineMap",
  description:
    "Find your way into the zine scene with a community-maintained map of shops, libraries, fairs, zines, makers, and stories.",
};

export const revalidate = 120;

type ZineItem = {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  permalink: string;
  created_at: string;
  user_id: string | null;
  profiles: {
    id: string;
    display_name: string | null;
    profile_image: string | null;
    permalink: string | null;
  } | null;
};

type ZinesterItem = {
  id: string;
  user_email: string;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  user: {
    display_name: string | null;
    permalink: string | null;
    profile_image: string | null;
    roles: string[] | null;
    open_to: string[] | null;
    bio: string | null;
  } | null;
};

type CoordItem = {
  id: string;
  latitude: number | null;
  longitude: number | null;
};

type FeaturedStoreLibrary = {
  id: string;
  name: string;
  permalink: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  notes: string | null;
  submitted_by: string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
};

type FeaturedEvent = {
  id: string;
  name: string;
  permalink: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  notes: string | null;
  category: string | null;
  poster_image: string | null;
  submitted_by: string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
};

type BlurbItem = {
  quote: string;
  byline: string;
};

const FALLBACK_BLURBS: BlurbItem[] = [
  {
    quote:
      "How beautiful to look at a map and see all the ways that these spaces persist and flourish.",
    byline: "Lee Lai - Cartoonist, author of Cannon and Stone Fruit",
  },
  {
    quote:
      "Anyone in the world can find zines close to them on any given day and can go and be inspired.",
    byline: "Luke Sinclair - Coordinator, Sticky Institute",
  },
  {
    quote: "ZineMap is a priceless asset for zine makers and its community.",
    byline: "Luke Tribe - Zinester, motion graphic designer and illustrator",
  },
  {
    quote:
      "ZineMap has become an incredibly useful tool to help direct people to my distro.",
    byline: "Andromeda Zines - UK distro",
  },
];

function parseBlurbsMarkdown(content: string): BlurbItem[] {
  const entries: BlurbItem[] = [];
  const quoteLines: string[] = [];
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^[-—]\s+/.test(line)) {
      const byline = line.replace(/^[-—]\s+/, "").trim();
      const quote = quoteLines.join(" ").replace(/\s+/g, " ").trim();
      if (quote && byline) {
        entries.push({ quote, byline });
      }
      quoteLines.length = 0;
      continue;
    }

    quoteLines.push(line);
  }

  return entries;
}

async function loadBlurbs(): Promise<BlurbItem[]> {
  try {
    const filePath = join(process.cwd(), "blurbs.md");
    const markdown = await readFile(filePath, "utf8");
    const parsed = parseBlurbsMarkdown(markdown);
    return parsed.length ? parsed : FALLBACK_BLURBS;
  } catch {
    return FALLBACK_BLURBS;
  }
}

function AboutSectionHeader({
  title,
  subtitle,
  href,
  ctaLabel,
  openInNewTab = true,
}: {
  title: string;
  subtitle: string;
  href: string;
  ctaLabel: string;
  openInNewTab?: boolean;
}) {
  const linkProps = openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {};
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="font-gloria text-2xl text-stone-900">
          <Link href={href} {...linkProps} className="transition-colors hover:text-rose-600">
            {title}
          </Link>
        </h2>
        <p className="mt-1.5 max-w-2xl font-serif text-sm leading-relaxed text-stone-600 md:text-base">
          {subtitle}
        </p>
      </div>
      <Button asChild variant="outline" className="h-9 border-stone-300 bg-[#fffdf8] px-3.5 text-sm font-medium text-stone-700 shadow-none hover:border-stone-400 hover:bg-stone-100 hover:text-stone-800">
        <Link href={href} {...linkProps}>
          {ctaLabel}
        </Link>
      </Button>
    </div>
  );
}

async function fetchAboutData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [
    zinesRes,
    zinestersRes,
    latestStoresRes,
    latestLibrariesRes,
    latestEventsRes,
    latestZinesRes,
    latestZinestersRes,
    allStoreCoordsRes,
    allLibraryCoordsRes,
    allEventCoordsRes,
    contributorsCountRes,
    featuredStoresRes,
    featuredLibrariesRes,
    featuredEventsRes,
  ] = await Promise.all([
    supabase
      .from("zines")
      .select("id,title,description,cover_image,permalink,created_at,user_id")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("home_pins")
      .select(
        "id,user_email,city,state,country,latitude,longitude,created_at,user:profiles!home_pins_user_email_fkey(display_name,permalink,profile_image,roles,open_to,bio)"
      )
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("stores")
      .select("updated_at,created_at")
      .eq("approved", true)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(1),
    supabase
      .from("libraries")
      .select("updated_at,created_at")
      .eq("approved", true)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(1),
    supabase
      .from("events")
      .select("updated_at,created_at")
      .eq("approved", true)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(1),
    supabase
      .from("zines")
      .select("created_at")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("home_pins")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.from("stores").select("id,latitude,longitude").eq("approved", true),
    supabase.from("libraries").select("id,latitude,longitude").eq("approved", true),
    supabase.from("events").select("id,latitude,longitude").eq("approved", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("stores")
      .select("id,name,permalink,city,state,country,notes,submitted_by,created_at,latitude,longitude")
      .eq("approved", true)
      .not("notes", "is", null)
      .neq("notes", "")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("libraries")
      .select("id,name,permalink,city,state,country,notes,submitted_by,created_at,latitude,longitude")
      .eq("approved", true)
      .not("notes", "is", null)
      .neq("notes", "")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("events")
      .select("id,name,permalink,city,state,country,notes,category,poster_image,submitted_by,created_at,latitude,longitude")
      .eq("approved", true)
      .not("notes", "is", null)
      .neq("notes", "")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const updatedCandidates = [
    latestStoresRes.data?.[0]?.updated_at || latestStoresRes.data?.[0]?.created_at,
    latestLibrariesRes.data?.[0]?.updated_at || latestLibrariesRes.data?.[0]?.created_at,
    latestEventsRes.data?.[0]?.updated_at || latestEventsRes.data?.[0]?.created_at,
    latestZinesRes.data?.[0]?.created_at,
    latestZinestersRes.data?.[0]?.created_at,
  ]
    .filter(Boolean)
    .map((value) => new Date(value as string).getTime());

  const featuredStoreRows = (featuredStoresRes.data || []) as FeaturedStoreLibrary[];
  const featuredLibraryRows = (featuredLibrariesRes.data || []) as FeaturedStoreLibrary[];
  const featuredEventRows = (featuredEventsRes.data || []) as FeaturedEvent[];
  const zineAuthorIds = Array.from(
    new Set(
      ((zinesRes.data || []) as Array<{ user_id: string | null }>)
        .map((zine) => zine.user_id)
        .filter((value): value is string => Boolean(value))
    )
  );
  const zineProfilesRes = zineAuthorIds.length
    ? await supabase
        .from("profiles")
        .select("id,display_name,profile_image,permalink")
        .in("id", zineAuthorIds)
    : { data: [] as Array<{ id: string; display_name: string | null; profile_image: string | null; permalink: string | null }> };

  const profileRows =
    (zineProfilesRes.data || []) as Array<{
      id: string;
      display_name: string | null;
      profile_image: string | null;
      permalink: string | null;
    }>;
  const zineProfilesMap = new Map(profileRows.map((row) => [row.id, row]));
  const recentZinesterRows = ((zinestersRes.data || []) as Array<
    Omit<ZinesterItem, "user"> & { user: ZinesterItem["user"] | ZinesterItem["user"][] }
  >).map((row) => ({
    ...row,
    user: Array.isArray(row.user) ? row.user[0] || null : row.user,
  }));
  const zinesterByEmail = new Map<string, ZinesterItem>();

  for (const row of recentZinesterRows) {
    if (zinesterByEmail.has(row.user_email)) continue;
    const hasAnyTag = (row.user?.roles?.length || 0) > 0 || (row.user?.open_to?.length || 0) > 0;
    const hasBio = Boolean(row.user?.bio?.trim());
    if (!hasAnyTag) continue;
    if (!hasBio) continue;

    zinesterByEmail.set(row.user_email, row);

    if (zinesterByEmail.size >= 9) break;
  }

  const featuredStoreIds = featuredStoreRows.map((row) => row.id);
  const featuredLibraryIds = featuredLibraryRows.map((row) => row.id);
  const featuredSubmitterIds = Array.from(
    new Set(
      [...featuredStoreRows, ...featuredLibraryRows, ...featuredEventRows]
        .map((row) => row.submitted_by)
        .filter(Boolean)
    )
  );

  const [storeTagsRes, libraryTagsRes, featuredProfilesRes] = await Promise.all([
    featuredStoreIds.length
      ? supabase
          .from("store_tags")
          .select("store_id,tags!inner(label)")
          .in("store_id", featuredStoreIds)
      : Promise.resolve({ data: [] as Array<{ store_id: string; tags: { label: string } }> }),
    featuredLibraryIds.length
      ? supabase
          .from("library_tags")
          .select("library_id,tags!inner(label)")
          .in("library_id", featuredLibraryIds)
      : Promise.resolve({ data: [] as Array<{ library_id: string; tags: { label: string } }> }),
    featuredSubmitterIds.length
      ? supabase
          .from("profiles")
          .select("id,display_name,permalink")
          .in("id", featuredSubmitterIds)
      : Promise.resolve({
          data: [] as Array<{ id: string; display_name: string | null; permalink: string | null }>,
        }),
  ]);

  const storeTagMap = new Map<string, string[]>();
  for (const row of storeTagsRes.data || []) {
    const existing = storeTagMap.get(row.store_id) || [];
    const tagRows = Array.isArray(row.tags) ? row.tags : [row.tags];
    for (const tag of tagRows) {
      if (tag?.label && !existing.includes(tag.label)) existing.push(tag.label);
    }
    storeTagMap.set(row.store_id, existing);
  }

  const libraryTagMap = new Map<string, string[]>();
  for (const row of libraryTagsRes.data || []) {
    const existing = libraryTagMap.get(row.library_id) || [];
    const tagRows = Array.isArray(row.tags) ? row.tags : [row.tags];
    for (const tag of tagRows) {
      if (tag?.label && !existing.includes(tag.label)) existing.push(tag.label);
    }
    libraryTagMap.set(row.library_id, existing);
  }

  const profileMap = new Map<string, { name: string; permalink: string | null }>();
  for (const row of featuredProfilesRes.data || []) {
    if (row.display_name) {
      profileMap.set(row.id, { name: row.display_name, permalink: row.permalink ?? null });
    }
  }

  const busyPins: HeroBusyPin[] = [
    ...((allStoreCoordsRes.data || []) as CoordItem[])
      .filter((row) => row.latitude != null && row.longitude != null)
      .map((row) => ({
        id: `store-${row.id}`,
        type: "store" as const,
        latitude: row.latitude as number,
        longitude: row.longitude as number,
      })),
    ...((allLibraryCoordsRes.data || []) as CoordItem[])
      .filter((row) => row.latitude != null && row.longitude != null)
      .map((row) => ({
        id: `library-${row.id}`,
        type: "library" as const,
        latitude: row.latitude as number,
        longitude: row.longitude as number,
      })),
    ...((allEventCoordsRes.data || []) as CoordItem[])
      .filter((row) => row.latitude != null && row.longitude != null)
      .map((row) => ({
        id: `event-${row.id}`,
        type: "event" as const,
        latitude: row.latitude as number,
        longitude: row.longitude as number,
      })),
  ];

  const featuredPins: HeroFeaturedPin[] = [
    ...featuredStoreRows.map((row) => ({
      id: `store-${row.id}`,
      type: "store" as const,
      title: row.name,
      permalink: row.permalink,
      city: row.city,
      state: row.state,
      country: row.country,
      notes: row.notes,
      tags: storeTagMap.get(row.id) || ["shop"],
      addedBy: profileMap.get(row.submitted_by)?.name || null,
      addedByPermalink: profileMap.get(row.submitted_by)?.permalink || null,
      posterImage: null,
      createdAt: row.created_at,
      latitude: row.latitude as number,
      longitude: row.longitude as number,
    })),
    ...featuredLibraryRows.map((row) => ({
      id: `library-${row.id}`,
      type: "library" as const,
      title: row.name,
      permalink: row.permalink,
      city: row.city,
      state: row.state,
      country: row.country,
      notes: row.notes,
      tags: libraryTagMap.get(row.id) || ["library"],
      addedBy: profileMap.get(row.submitted_by)?.name || null,
      addedByPermalink: profileMap.get(row.submitted_by)?.permalink || null,
      posterImage: null,
      createdAt: row.created_at,
      latitude: row.latitude as number,
      longitude: row.longitude as number,
    })),
    ...featuredEventRows.map((row) => ({
      id: `event-${row.id}`,
      type: "event" as const,
      title: row.name,
      permalink: row.permalink,
      city: row.city,
      state: row.state,
      country: row.country,
      notes: row.notes,
      tags: row.category ? [row.category] : ["event"],
      addedBy: profileMap.get(row.submitted_by)?.name || null,
      addedByPermalink: profileMap.get(row.submitted_by)?.permalink || null,
      posterImage: row.poster_image,
      createdAt: row.created_at,
      latitude: row.latitude as number,
      longitude: row.longitude as number,
    })),
  ]
    .filter((item) => item.latitude != null && item.longitude != null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return {
    initialContributorCount: contributorsCountRes.count ?? null,
    lastUpdatedAt:
      updatedCandidates.length > 0
        ? new Date(Math.max(...updatedCandidates)).toISOString()
        : null,
    zines: ((zinesRes.data || []) as Array<Omit<ZineItem, "profiles">>).map((zine) => ({
      ...zine,
      profiles: zine.user_id ? zineProfilesMap.get(zine.user_id) || null : null,
    })),
    zinesters: Array.from(zinesterByEmail.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
    busyPins,
    featuredPins,
  };
}

export default async function AboutPage() {
  const data = await fetchAboutData();
  const blurbs = await loadBlurbs();
  const stories = getAllStories()
    .filter((story) => !story.password || story.password === "")
    .slice(0, 10);
  return (
    <div className="min-h-screen bg-stone-50 pb-14">
      <ZineMapAboutHero
        busyPins={data.busyPins}
        featuredPins={data.featuredPins}
        lastUpdatedAt={data.lastUpdatedAt}
      />

      <main className="mx-auto mt-6 max-w-6xl space-y-10 px-4">
        <section>
          <AboutZinesShelf items={data.zines} />
        </section>

        <section className="py-0">
          <div className="mx-auto max-w-5xl">
            <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-[0.22em] text-rose-600/80 md:mb-2.5">
              Notes from the community
            </p>
            <AboutBlurbsCarousel items={blurbs} />
          </div>
        </section>

        <section>
          <AboutSectionHeader
            title="Stories"
            subtitle="Interviews, field notes, and updates from the people and places behind the map."
            href="/stories"
            ctaLabel="View all stories"
          />
          <AboutStoriesCarousel stories={stories} />
        </section>

        <section>
          <AboutSectionHeader
            title="People"
            subtitle="Find makers, readers, organizers, researchers, and collectors across the ZineMap community"
            href="/zinesters"
            ctaLabel="Browse the directory"
          />
          <AboutPeopleCarousel zinesters={data.zinesters} />
        </section>

        <AboutFinalCta initialContributorCount={data.initialContributorCount} />

      </main>
    </div>
  );
}
