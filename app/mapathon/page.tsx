import Link from "next/link";
import { Special_Elite } from "next/font/google";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { MapathonFaq } from "./MapathonFaq";

export const metadata = {
  title: "ZineMap-a-thon - ZineMap",
  description:
    "Join the ZineMap-a-thon and help improve the community-maintained zine map with small, meaningful contributions.",
};

export const dynamic = "force-dynamic";

const MAPATHON_START_DATE = "2026-07-01T00:00:00.000Z";
const MAPATHON_END_DATE = "2026-07-31T23:59:59.999Z";

const specialElite = Special_Elite({ weight: "400", subsets: ["latin"] });
const rosePillClass = "inline-block bg-rose-200 px-1.5 py-0.5 leading-none";

type LeaderboardEntry = {
  userId: string;
  displayName: string;
  permalink: string | null;
  profileImage: string | null;
  contributions: number;
};

type ApprovedListingRow = {
  id: string;
};

type TypeTagRow = {
  store_id?: string | null;
  library_id?: string | null;
};

async function fetchMapathonStats() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [
    storesAdded,
    librariesAdded,
    eventsAdded,
    communityNotesForLeaderboard,
    localeEditsApproved,
    approvedStoresForTypeTags,
    approvedLibrariesForTypeTags,
    storeTypeTagRows,
    libraryTypeTagRows,
  ] = await Promise.all([
    supabase
      .from("stores")
      .select("submitted_by")
      .eq("moderation_status", "approved")
      .gte("created_at", MAPATHON_START_DATE)
      .lte("created_at", MAPATHON_END_DATE),
    supabase
      .from("libraries")
      .select("submitted_by")
      .eq("moderation_status", "approved")
      .gte("created_at", MAPATHON_START_DATE)
      .lte("created_at", MAPATHON_END_DATE),
    supabase
      .from("events")
      .select("submitted_by")
      .eq("moderation_status", "approved")
      .gte("created_at", MAPATHON_START_DATE)
      .lte("created_at", MAPATHON_END_DATE),
    supabase
      .from("community_notes")
      .select("user_id,anonymous,store_id,library_id,event_id")
      .gte("submitted_at", MAPATHON_START_DATE)
      .lte("submitted_at", MAPATHON_END_DATE),
    supabase
      .from("locale_edits")
      .select("user_id,store_id,library_id,event_id")
      .eq("status", "approved")
      .gte("created_at", MAPATHON_START_DATE)
      .lte("created_at", MAPATHON_END_DATE),
    supabase
      .from("stores")
      .select("id")
      .eq("approved", true),
    supabase
      .from("libraries")
      .select("id")
      .eq("approved", true),
    supabase
      .from("store_tags")
      .select("store_id,tags!inner(category)")
      .eq("tags.category", "shop_type"),
    supabase
      .from("library_tags")
      .select("library_id,tags!inner(category)")
      .eq("tags.category", "library_type"),
  ]);

  const approvedStoreIdsForTypeTags = new Set(
    ((approvedStoresForTypeTags.data || []) as ApprovedListingRow[]).map((row) => row.id)
  );
  const approvedLibraryIdsForTypeTags = new Set(
    ((approvedLibrariesForTypeTags.data || []) as ApprovedListingRow[]).map((row) => row.id)
  );
  const storesWithTypeTags = new Set(
    ((storeTypeTagRows.data || []) as TypeTagRow[])
      .map((row) => row.store_id)
      .filter((id): id is string => typeof id === "string" && approvedStoreIdsForTypeTags.has(id))
  );
  const librariesWithTypeTags = new Set(
    ((libraryTypeTagRows.data || []) as TypeTagRow[])
      .map((row) => row.library_id)
      .filter((id): id is string => typeof id === "string" && approvedLibraryIdsForTypeTags.has(id))
  );
  const untaggedShopsCount = Math.max(0, approvedStoreIdsForTypeTags.size - storesWithTypeTags.size);
  const untaggedLibrariesCount = Math.max(0, approvedLibraryIdsForTypeTags.size - librariesWithTypeTags.size);

  const contributionMap = new Map<string, number>();
  const increment = (userId: string | null | undefined) => {
    if (!userId) return;
    contributionMap.set(userId, (contributionMap.get(userId) ?? 0) + 1);
  };

  const noteRows = (communityNotesForLeaderboard.data || []).filter(
    (row) => !row.anonymous
  );
  const noteStoreIds = [...new Set(noteRows.map((row) => row.store_id).filter(Boolean) as string[])];
  const noteLibraryIds = [...new Set(noteRows.map((row) => row.library_id).filter(Boolean) as string[])];
  const noteEventIds = [...new Set(noteRows.map((row) => row.event_id).filter(Boolean) as string[])];

  const editRows = localeEditsApproved.data || [];
  const editStoreIds = [...new Set(editRows.map((row) => row.store_id).filter(Boolean) as string[])];
  const editLibraryIds = [...new Set(editRows.map((row) => row.library_id).filter(Boolean) as string[])];
  const editEventIds = [...new Set(editRows.map((row) => row.event_id).filter(Boolean) as string[])];

  const storeIdsToVerify = [...new Set([...noteStoreIds, ...editStoreIds])];
  const libraryIdsToVerify = [...new Set([...noteLibraryIds, ...editLibraryIds])];
  const eventIdsToVerify = [...new Set([...noteEventIds, ...editEventIds])];

  const [approvedStoresRes, approvedLibrariesRes, approvedEventsRes] = await Promise.all([
    storeIdsToVerify.length
      ? supabase
          .from("stores")
          .select("id")
          .in("id", storeIdsToVerify)
          .eq("moderation_status", "approved")
      : Promise.resolve({ data: [] as Array<{ id: string }> }),
    libraryIdsToVerify.length
      ? supabase
          .from("libraries")
          .select("id")
          .in("id", libraryIdsToVerify)
          .eq("moderation_status", "approved")
      : Promise.resolve({ data: [] as Array<{ id: string }> }),
    eventIdsToVerify.length
      ? supabase
          .from("events")
          .select("id")
          .in("id", eventIdsToVerify)
          .eq("moderation_status", "approved")
      : Promise.resolve({ data: [] as Array<{ id: string }> }),
  ]);

  const approvedStoreIds = new Set((approvedStoresRes.data || []).map((row) => row.id));
  const approvedLibraryIds = new Set((approvedLibrariesRes.data || []).map((row) => row.id));
  const approvedEventIds = new Set((approvedEventsRes.data || []).map((row) => row.id));

  const isApprovedTarget = (row: {
    store_id: string | null;
    library_id: string | null;
    event_id: string | null;
  }) => {
    if (row.store_id) return approvedStoreIds.has(row.store_id);
    if (row.library_id) return approvedLibraryIds.has(row.library_id);
    if (row.event_id) return approvedEventIds.has(row.event_id);
    return false;
  };

  for (const row of storesAdded.data || []) increment(row.submitted_by);
  for (const row of librariesAdded.data || []) increment(row.submitted_by);
  for (const row of eventsAdded.data || []) increment(row.submitted_by);
  for (const row of noteRows) {
    if (isApprovedTarget(row)) increment(row.user_id);
  }
  for (const row of editRows) {
    if (isApprovedTarget(row)) increment(row.user_id);
  }

  const contributorIds = Array.from(contributionMap.keys());
  const profilesResult = contributorIds.length
    ? await supabase
        .from("profiles")
        .select("id,display_name,permalink,profile_image")
        .in("id", contributorIds)
    : { data: [] as Array<{ id: string; display_name: string | null; permalink: string | null; profile_image: string | null }> };

  const profileMap = new Map(
    (profilesResult.data || []).map((profile) => [profile.id, profile])
  );

  const leaderboard: LeaderboardEntry[] = contributorIds
    .map((userId) => {
      const profile = profileMap.get(userId);
      return {
        userId,
        displayName: profile?.display_name || "Community member",
        permalink: profile?.permalink ?? null,
        profileImage: profile?.profile_image ?? null,
        contributions: contributionMap.get(userId) ?? 0,
      };
    })
    .sort((a, b) => {
      if (b.contributions !== a.contributions) return b.contributions - a.contributions;
      const aHasImage = a.profileImage ? 1 : 0;
      const bHasImage = b.profileImage ? 1 : 0;
      if (bHasImage !== aHasImage) return bHasImage - aHasImage;
      return a.displayName.localeCompare(b.displayName);
    });

  return {
    leaderboard,
    untaggedShopsCount,
    untaggedLibrariesCount,
  };
}

export default async function MapathonPage() {
  const { leaderboard, untaggedShopsCount, untaggedLibrariesCount } = await fetchMapathonStats();
  let tieRank = 0;
  const rankedLeaderboard = leaderboard.map((entry, index) => {
    if (index === 0 || entry.contributions !== leaderboard[index - 1].contributions) {
      tieRank = index + 1;
    }
    return { ...entry, rank: tieRank };
  });

  return (
    <div className={`${specialElite.className} min-h-screen overflow-x-hidden bg-[#f6f1e7] pb-16 text-stone-900`}>
      <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-8 px-5 py-5 md:gap-10 md:py-8">
        <section className="py-1 md:py-2">
          <div className="relative mx-auto w-full max-w-2xl">
            <svg
              viewBox="0 0 520 220"
              aria-hidden
              className="pointer-events-none absolute inset-[2%] z-0 h-[96%] w-[98%] left-1/2 -translate-x-1/2"
            >
              <path
                d="M 28 46 Q 140 30, 260 44 T 492 40"
                fill="none"
                stroke="#ffe4e6"
                strokeWidth="44"
                strokeLinecap="round"
                opacity="0.58"
              />
              <path
                d="M 48 82 Q 168 66, 288 80 T 476 74"
                fill="none"
                stroke="#fff1f2"
                strokeWidth="42"
                strokeLinecap="round"
                opacity="0.76"
              />
              <path
                d="M 20 118 Q 150 102, 260 116 T 500 110"
                fill="none"
                stroke="#ffe4e6"
                strokeWidth="48"
                strokeLinecap="round"
                opacity="0.52"
              />
              <path
                d="M 36 154 Q 170 138, 290 152 T 484 146"
                fill="none"
                stroke="#fecdd3"
                strokeWidth="40"
                strokeLinecap="round"
                opacity="0.36"
              />
              <path
                d="M 64 188 Q 190 172, 310 186 T 456 180"
                fill="none"
                stroke="#fff1f2"
                strokeWidth="38"
                strokeLinecap="round"
                opacity="0.68"
              />
            </svg>
            <img
              src="/brand/mapathon-banner-processed.png"
              alt="Hand-drawn ZineMap-a-thon campaign banner"
              className="relative z-10 mx-auto h-auto w-full object-contain"
            />
          </div>
        </section>

        <section className="border-y border-stone-300 bg-[#fffdf7]/70 px-4 py-5 text-sm leading-[1.75] md:px-6 md:text-lg">
          <div className="space-y-3">
            <p>July 31, 2026 was the last day of ZineMap-a-thon.</p>
            <p>
              Together we’ve made <span className={rosePillClass}>389 updates</span> to ZineMap
              this July!
            </p>
            <p>
              Thank you to everyone who added a place/event, fixed a listing, left a note, or
              added shop/library tags. Every contribution helped make the map more useful!
            </p>
          </div>
        </section>

        <section className="text-sm leading-[1.85] md:text-lg">
          <div className="space-y-4">
            <p className="text-xl leading-normal tracking-normal md:text-2xl">ZineMap is turning one this month!</p>
            <p>
              ZineMap began in <span className={rosePillClass}>July 2025</span> with a practical
              question: where can zine makers find shops that might stock their work?
            </p>
            <p>
              Since then, it has grown into a community resource shaped by{" "}
              <span className={rosePillClass}>more than 700 contributors</span> across{" "}
              <span className={rosePillClass}>40 countries</span> and used by
              15,000+ zine makers and readers to discover
              zine spaces, share knowledge, and find community.
            </p>
            <p>
              ZineMap has been community-maintained since day one. So for its{" "}
              <span className={rosePillClass}>first birthday</span> (which is also{" "}
              <span className={rosePillClass}>International Zine Month 2026</span>!) we’re
              celebrating in the same spirit: by coming together to make the map more accurate, more
              up-to-date, and more useful.
            </p>
            <p><span className={rosePillClass}>Throughout July</span>, you’re invited to join…</p>
            <p className="mx-auto w-fit border-b-4 border-rose-300 px-4 pt-1 text-center text-xl leading-normal tracking-normal md:text-2xl">
              <b><i>ZineMap-a-thon!</i></b>
            </p>
            <div className="space-y-3 pt-4">
              <p>You can participate by:</p>
              <ul className="list-disc space-y-3 pl-5">
                <li>
                  <span>adding a <span className={rosePillClass}>zine shop, library or event</span> you know that isn’t on the map yet</span>
                  <div className="mx-auto mt-3 grid max-w-xl grid-cols-2 gap-2 md:grid-cols-4">
                    <Link
                      href="/map"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center border border-stone-400 bg-[#fffdf7] px-3 py-1.5 text-center text-xs leading-none text-stone-800 transition-colors hover:border-stone-900 hover:bg-stone-900 hover:text-[#fffdf7] md:text-sm"
                    >
                      <span className="translate-y-px">Browse the map</span>
                    </Link>
                    <Link
                      href="/add-store"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center border border-rose-500/50 bg-rose-500/10 px-3 py-1.5 text-center text-xs leading-none text-stone-900 transition-colors hover:bg-rose-600 hover:text-white md:text-sm"
                    >
                      <span className="translate-y-px">Add a shop</span>
                    </Link>
                    <Link
                      href="/add-library"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center border border-blue-500/50 bg-blue-500/10 px-3 py-1.5 text-center text-xs leading-none text-stone-900 transition-colors hover:bg-blue-600 hover:text-white md:text-sm"
                    >
                      <span className="translate-y-px">Add a library</span>
                    </Link>
                    <Link
                      href="/add-event"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center border border-[#009035]/60 bg-[#009035]/10 px-3 py-1.5 text-center text-xs leading-none text-stone-900 transition-colors hover:bg-[#009035] hover:text-white md:text-sm"
                    >
                      <span className="translate-y-px">Add an event</span>
                    </Link>
                  </div>
                </li>
                <li>
                  checking or updating an <span className={rosePillClass}>existing listing</span> (Is the link still valid? Did the
                  shop/library recently move?)
                </li>
                <li>
                  leaving a <span className={rosePillClass}>community note</span> if you’ve visited a place or attended an event and have
                  something helpful to share
                </li>
                <li>
                  <span>adding <span className={rosePillClass}>shop or library type tags</span> to listings that haven’t been tagged yet</span>
                  <p className="mt-3 border-l-4 border-rose-500/30 bg-[#fffdf7] p-3 text-xs leading-relaxed text-stone-700 md:text-sm">
                    Note: this is <span className={rosePillClass}>especially helpful</span> right now because these type tags (e.g. indie
                    bookstore, comic shop, record shop, art/design bookshop; public library,
                    academic library, community archive, resource center, etc.) are <span className={rosePillClass}>newly enabled</span>,
                    and the <span className={rosePillClass}>vast majority of listings</span> still don’t have them. <br />
                    If you’ve added something in the past, you can go back and tag it now; even if you
                    didn’t add the original listing,{" "}
                    <span className={rosePillClass}>you can still help tag places</span> where the
                    category is clear.
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2 pb-4">
                    <Link
                      href="/shops?untagged=type"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 border border-rose-500/50 bg-rose-500/10 px-3 py-1.5 text-xs leading-none text-stone-900 transition-colors hover:bg-rose-600 hover:text-white md:text-sm"
                    >
                      <span className="translate-y-px">See</span>
                      <span className="translate-y-px text-base leading-none md:text-lg">{untaggedShopsCount}</span>
                      <span className="translate-y-px">shops without type tags</span>
                    </Link>
                    <Link
                      href="/libraries?untagged=type"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 border border-blue-500/50 bg-blue-500/10 px-3 py-1.5 text-xs leading-none text-stone-900 transition-colors hover:bg-blue-600 hover:text-white md:text-sm"
                    >
                      <span className="translate-y-px">See</span>
                      <span className="translate-y-px text-base leading-none md:text-lg">{untaggedLibrariesCount}</span>
                      <span className="translate-y-px">libraries without type tags</span>
                    </Link>
                  </div>
                </li>
              </ul>
              <p>
                Everyone who gets involved will receive a little thank-you at the end of the month,
                including a <span className={rosePillClass}>digital badge on your profile</span> and perhaps a little something else. More
                details soon!
              </p>
              <p className="text-center italic">Thank you for one year of ZineMapping!</p>
            </div>
          </div>
        </section>

        <section className="grid gap-8 border-t border-stone-300 pt-5 md:grid-cols-2 md:items-start">
          <MapathonFaq />

          <div className="mx-auto w-full max-w-[17rem] sm:max-w-xs md:max-w-none">
            <div className="mb-3 text-center">
              <h2 className="text-lg leading-none md:text-xl">Top Contributors</h2>
              <p className="mt-1 text-xs text-stone-600">
                Last updated: July 31, 2026, 11:59 PM
              </p>
            </div>

            <Card className="mx-auto w-full overflow-hidden border-0 bg-transparent shadow-none">
              <CardContent className="max-h-[32rem] space-y-0 overflow-x-hidden overflow-y-auto p-0">
                {leaderboard.length === 0 ? (
                  <p className="border border-dashed border-stone-300 p-4 text-sm text-stone-700">
                    Updates will appear here as the campaign picks up.
                  </p>
                ) : (
                  rankedLeaderboard.map((entry) => {
                    const rowClass =
                      "flex w-full min-w-0 items-center gap-2 border-b border-stone-200 px-2 py-2 transition-colors last:border-b-0 hover:bg-[#fffdf7]/70";
                    const avatar = entry.profileImage ? (
                      <img
                        src={entry.profileImage}
                        alt={`${entry.displayName} avatar`}
                        className="h-7 w-7 rounded-full border border-stone-300 object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 bg-[#f6f1e7] text-xs text-stone-600">
                        {entry.displayName.slice(0, 1).toUpperCase()}
                      </div>
                    );
                    const rowContent = (
                      <>
                        <span className="w-6 shrink-0 text-sm text-stone-500">{String(entry.rank).padStart(2, "0")}</span>
                        <div className="shrink-0">{avatar}</div>
                        <div className="min-w-0 flex-1 self-center">
                          <p className="translate-y-px break-all text-sm leading-snug text-stone-900 group-hover:underline group-hover:underline-offset-4">
                            {entry.displayName}
                          </p>
                        </div>
                        <span className="shrink-0 pl-1 text-xs tabular-nums text-stone-700">{entry.contributions}</span>
                      </>
                    );

                    return entry.permalink ? (
                      <Link
                        key={entry.userId}
                        href={`/profile/${entry.permalink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${rowClass} group`}
                      >
                        {rowContent}
                      </Link>
                    ) : (
                      <div key={entry.userId} className={rowClass}>
                        {rowContent}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
