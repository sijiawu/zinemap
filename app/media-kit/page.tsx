import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Download, ExternalLink, Mail } from 'lucide-react';

export const metadata = {
  title: 'Media kit - ZineMap',
  description:
    'Logos, live map stats, and contact details for press and anyone writing about ZineMap.',
};

/** Fresh DB counts on every request (not statically cached). */
export const dynamic = 'force-dynamic';

async function fetchLiveMapStats() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [
    storesRes,
    librariesRes,
    eventsRes,
    profilesRes,
    storesCountriesRes,
    librariesCountriesRes,
    eventsCountriesRes,
  ] = await Promise.all([
    supabase.from('stores').select('id', { count: 'exact', head: true }).eq('approved', true),
    supabase
      .from('libraries')
      .select('id', { count: 'exact', head: true })
      .eq('approved', true),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('approved', true),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('stores').select('country').eq('approved', true).neq('country', null),
    supabase.from('libraries').select('country').eq('approved', true).neq('country', null),
    supabase.from('events').select('country').eq('approved', true).neq('country', null),
  ]);

  const err =
    storesRes.error ||
    librariesRes.error ||
    eventsRes.error ||
    profilesRes.error ||
    storesCountriesRes.error ||
    librariesCountriesRes.error ||
    eventsCountriesRes.error ||
    null;

  const countries = new Set<string>();
  for (const row of storesCountriesRes.data || []) {
    if (row?.country && typeof row.country === 'string') countries.add(row.country);
  }
  for (const row of librariesCountriesRes.data || []) {
    if (row?.country && typeof row.country === 'string') countries.add(row.country);
  }
  for (const row of eventsCountriesRes.data || []) {
    if (row?.country && typeof row.country === 'string') countries.add(row.country);
  }

  return {
    shopCount: storesRes.count,
    libraryCount: librariesRes.count,
    eventCount: eventsRes.count,
    contributorCount: profilesRes.count,
    countriesCount: countries.size,
    error: err,
  };
}

const PROMO_LABELS: Record<string, string> = {
  'zinemap-flyer.jpg': 'ZineMap flyer (JPG)',
  'zinemap-card.png': 'ZineMap card (PNG)',
  'riso-card-qr.png': 'Riso print card with QR Code',
  'the-zinemap-zine-EN.pdf': 'The ZineMap zine (English)',
  'the-zinemap-zine-PL.pdf': 'The ZineMap zine (po polsku)',
};

const PROMO_DETAIL: Record<string, string> = {
  'zinemap-flyer.jpg': 'Dimensions: 210 x 297 mm (A4).',
  'the-zinemap-zine-EN.pdf': 'A Zine about a Map for Zines. English version. Dimensions: 210 × 297 mm (A4).',
  'the-zinemap-zine-PL.pdf': 'Zine o mapie zinów. Polska wersja. Dimensions: 210 × 297 mm (A4).',
  'zinemap-card.png': 'Dimensions: 65 x 100 mm.',
  'riso-card-qr.png': 'Card design by Pizzeria Press.',
};

const PROMO_FALLBACK = [
  'the-zinemap-zine-EN.pdf',
  'the-zinemap-zine-PL.pdf',
  'zinemap-card.png',
  'zinemap-flyer.jpg',
  'riso-card-qr.png',
] as const;

function promoLabelFallback(filename: string) {
  const base = filename.replace(/\.[^.]+$/, '').replace(/-/g, ' ');
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function extLabel(filename: string) {
  const m = filename.match(/\.([^.]+)$/i);
  return m ? m[1].toUpperCase() : 'FILE';
}

async function fetchPromoMaterials() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.storage.from('promo-materials').list('', {
    limit: 100,
    sortBy: { column: 'name', order: 'asc' },
  });

  let names: string[];
  if (error || !data?.length) {
    names = [...PROMO_FALLBACK];
  } else {
    const fileNames = data
      .filter((f) => f.name && !f.name.endsWith('/'))
      .filter((f) => typeof (f.metadata as { size?: number } | null)?.size === 'number')
      .map((f) => f.name);
    names = fileNames.length ? fileNames : [...PROMO_FALLBACK];
  }

  const items = names.map((name) => {
    const { data: urlData } = supabase.storage.from('promo-materials').getPublicUrl(name);
    return {
      name,
      label: PROMO_LABELS[name] ?? promoLabelFallback(name),
      href: urlData.publicUrl,
      detail: PROMO_DETAIL[name],
    };
  });

  return { items };
}

function formatCount(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US');
}

export default async function MediaKitPage() {
  const [stats, promo] = await Promise.all([fetchLiveMapStats(), fetchPromoMaterials()]);
  const generatedAt = new Date();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-6 font-gloria text-center">
            Media kit
          </h1>
          <p className="max-w-3xl mx-auto text-center text-muted-foreground leading-relaxed">
          Project background, assets, and key information for featuring ZineMap. If there’s something you need that isn’t here, feel free to {' '}
            <a
              href="mailto:cjmakescomics@gmail.com"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              get in touch
            </a>
            .
          </p>
        </div>

        <div className="space-y-8 mb-12">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-xl font-gloria">About ZineMap</CardTitle>
            </CardHeader>
            <CardContent className="text-foreground leading-relaxed">
              <div className="divide-y divide-stone-200">
                <section
                  className="space-y-3 pb-6"
                  aria-labelledby="about-overview-heading"
                >
                  <h3
                    id="about-overview-heading"
                    className="text-sm font-medium text-stone-600"
                  >
                    Overview
                  </h3>
                  <p className="text-justify">
                    ZineMap is a community-maintained map of the global zine scene, helping people
                    discover zine shops, libraries, events, and one another.
                  </p>
                </section>

                <section
                  className="space-y-3 py-6"
                  aria-labelledby="about-why-heading"
                >
                  <h3
                    id="about-why-heading"
                    className="text-sm font-medium text-stone-600"
                  >
                    Why ZineMap
                  </h3>
                  <p className="text-justify">
                    Information about zine shops, libraries, and events is often scattered,
                    outdated, or hard to find unless you already know the scene. ZineMap was
                    created to make that knowledge easier to discover and maintain, and to help
                    more people participate in small-press culture locally and globally.
                  </p>
                </section>

                <section
                  className="space-y-4 pt-6"
                  aria-labelledby="about-facts-heading"
                >
                  <h3
                    id="about-facts-heading"
                    className="text-sm font-medium text-stone-600"
                  >
                    Quick facts
                  </h3>
                  <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Tagline
                      </dt>
                      <dd className="mt-1.5 text-foreground">
                        A collaborative map of the global zine scene
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Website
                      </dt>
                      <dd className="mt-1.5">
                        <a
                          href="https://zinemap.com"
                          className="text-blue-600 hover:text-blue-800 underline font-medium"
                        >
                          zinemap.com
                        </a>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Launched
                      </dt>
                      <dd className="mt-1.5 text-foreground">
                        <a
                          href="https://www.reddit.com/r/zines/comments/1m5uah2/soft_launch_zinemap_is_live_come_add_your/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline font-medium"
                        >
                          July 21, 2025
                        </a>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Creator
                      </dt>
                      <dd className="mt-1.5 text-foreground">
                        <Link
                          href="/profile/cjmakescomics"
                          className="text-blue-600 hover:text-blue-800 underline font-medium"
                        >
                          CJ Wu
                        </Link>
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-xl font-gloria flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Map at a glance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                These numbers are <strong className="text-foreground font-medium">live</strong>:
                they are read from the database when you load this page.
              </p>
              {stats.error ? (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  Stats could not be loaded right now. Please refresh, or use the figures on the main
                  site listings for reference.
                </p>
              ) : (
                <>
                <dl className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 text-center">
                    <div className="rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-3">
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Contributors
                      </dt>
                      <dd className="text-2xl font-semibold text-foreground tabular-nums mt-1">
                        {formatCount(stats.contributorCount)}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-3">
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Shops
                      </dt>
                      <dd className="text-2xl font-semibold text-foreground tabular-nums mt-1">
                        {formatCount(stats.shopCount)}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-3">
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Libraries
                      </dt>
                      <dd className="text-2xl font-semibold text-foreground tabular-nums mt-1">
                        {formatCount(stats.libraryCount)}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-3">
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Events
                      </dt>
                      <dd className="text-2xl font-semibold text-foreground tabular-nums mt-1">
                        {formatCount(stats.eventCount)}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-3">
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Countries
                      </dt>
                      <dd className="text-2xl font-semibold text-foreground tabular-nums mt-1">
                        {formatCount(stats.countriesCount)}
                      </dd>
                    </div>
                  </dl>
                  <p className="text-xs text-muted-foreground text-center max-w-2xl mx-auto">
                    Live stats as of{' '}
                    {generatedAt.toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-xl font-gloria">Logos & assets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="space-y-0 divide-y divide-stone-200 border border-stone-200 rounded-lg overflow-hidden">
                <li className="flex flex-col gap-3 p-4 bg-background sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5 min-w-0 pr-2">
                    <p className="text-sm font-medium text-foreground">Homepage hero</p>
                    <p className="text-xs text-stone-500 font-mono tabular-nums">
                      Dimensions: 520 × 130 px (viewBox). Default export 1040 × 260 px.
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="shrink-0 gap-2 self-start">
                    <a href="/brand/zinemap-homepage-hero.svg" download="zinemap-homepage-hero.svg">
                      <Download className="h-4 w-4" />
                      SVG
                    </a>
                  </Button>
                </li>
                <li className="flex flex-col gap-3 p-4 bg-background sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5 min-w-0 pr-2">
                    <p className="text-sm font-medium text-foreground">Square (with tagline)</p>
                    <p className="text-xs text-stone-500 font-mono tabular-nums">
                      Dimensions: 400 × 400 px (viewBox).
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="shrink-0 gap-2 self-start">
                    <a href="/brand/zinemap-square-badge.svg" download="zinemap-square-badge.svg">
                      <Download className="h-4 w-4" />
                      SVG
                    </a>
                  </Button>
                </li>
                <li className="flex flex-col gap-3 p-4 bg-background sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5 min-w-0 pr-2">
                    <p className="text-sm font-medium text-foreground">Square (wordmark + mark only)</p>
                    <p className="text-xs text-stone-500 font-mono tabular-nums">
                      Dimensions: 400 × 400 px (viewBox). 
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="shrink-0 gap-2 self-start">
                    <a
                      href="/brand/zinemap-square-badge-no-tagline.svg"
                      download="zinemap-square-badge-no-tagline.svg"
                    >
                      <Download className="h-4 w-4" />
                      SVG
                    </a>
                  </Button>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-xl font-gloria">Promo materials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="space-y-0 divide-y divide-stone-200 border border-stone-200 rounded-lg overflow-hidden">
                {promo.items.map((item) => (
                  <li
                    key={item.name}
                    className="flex flex-col gap-3 p-4 bg-background sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="space-y-1.5 min-w-0 pr-2">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      {item.detail ? (
                        <p className="text-xs text-stone-500 font-mono tabular-nums">{item.detail}</p>
                      ) : null}
                    </div>
                    <Button asChild variant="outline" size="sm" className="shrink-0 gap-2 self-start">
                      <a href={item.href} download={item.name} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                        {extLabel(item.name)}
                      </a>
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-xl font-gloria">
                Social & contact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <a
                    href="https://www.instagram.com/zine.map"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    @zine.map
                  </a>
                  <p className="text-xs text-muted-foreground">
                    For project updates and quick attribution.
                  </p>
                </div>

                <div className="space-y-1">
                  <a
                    href="mailto:cjmakescomics@gmail.com"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    <Mail className="h-4 w-4" />
                    Email CJ
                  </a>
                  <p className="text-xs text-muted-foreground">
                    For any questions you may have.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Want to help keep the project going? See{' '}
          <Link href="/support-zinemap" className="text-blue-600 hover:text-blue-800 underline">
            Support ZineMap
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
