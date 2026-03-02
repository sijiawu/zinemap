/**
 * Story images are stored in Supabase Storage in the story-images bucket.
 * Path format: story-images/<story-slug>/<filename>
 * e.g. story-images/la-fanzinotheque-genevoise/la-mouche.jpg
 */

const BUCKET = 'story-images'

function getSupabaseStorageBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    console.warn('NEXT_PUBLIC_SUPABASE_URL not set; story images may not load')
    return ''
  }
  return `${url.replace(/\/$/, '')}/storage/v1/object/public`
}

/**
 * Resolves a story image path to a full Supabase URL.
 * - Full http(s) URLs: returned as-is
 * - Paths starting with /: treated as same-origin (e.g. /placeholder.svg)
 * - Otherwise: treated as story-images/{path} in Supabase
 */
export function getStoryImageUrl(path: string): string {
  if (!path || typeof path !== 'string') return path
  const trimmed = path.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  if (trimmed.startsWith('/')) {
    return trimmed
  }
  const base = getSupabaseStorageBaseUrl()
  const cleanPath = trimmed.startsWith(`${BUCKET}/`) ? trimmed : `${BUCKET}/${trimmed}`
  return `${base}/${cleanPath}`
}
