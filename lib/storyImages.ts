/**
 * Story images are stored in Supabase Storage in the story-images bucket.
 * Path format: story-images/<story-slug>/<filename>
 * e.g. story-images/la-fanzinotheque-genevoise/la-mouche.jpg
 */

const BUCKET = 'story-images'
const THUMBNAIL_PREFIX = 'story-thumbnails/thumbnails'

function getSupabaseStorageBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    console.warn('NEXT_PUBLIC_SUPABASE_URL not set; story images may not load')
    return ''
  }
  return `${url.replace(/\/$/, '')}/storage/v1/object/public`
}

function buildStoryImageUrl(objectPath: string): string {
  const base = getSupabaseStorageBaseUrl()
  return `${base}/${BUCKET}/${objectPath.split('/').map(encodeURIComponent).join('/')}`
}

function getStoryImageObjectPath(path: string): string | null {
  const trimmed = path.trim()
  const publicMarker = `/storage/v1/object/public/${BUCKET}/`

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed)
      const markerIndex = url.pathname.indexOf(publicMarker)
      if (markerIndex === -1) return null
      return decodeURIComponent(url.pathname.slice(markerIndex + publicMarker.length))
    } catch {
      return null
    }
  }

  if (trimmed.startsWith('/')) {
    return null
  }

  const cleanPath = trimmed.startsWith(`${BUCKET}/`) ? trimmed.slice(BUCKET.length + 1) : trimmed
  return cleanPath.split(/[?#]/)[0]
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
  const objectPath = getStoryImageObjectPath(trimmed)
  return objectPath ? buildStoryImageUrl(objectPath) : trimmed
}

/**
 * Resolves a story listing thumbnail to the generated WebP thumbnail path.
 * Full story content still uses the original image via getStoryImageUrl.
 */
export function getStoryThumbnailUrl(path: string): string {
  if (!path || typeof path !== 'string') return path

  const objectPath = getStoryImageObjectPath(path)
  if (!objectPath || /\.svg(\?|$)/i.test(objectPath)) {
    return getStoryImageUrl(path)
  }

  if (objectPath.startsWith(`${THUMBNAIL_PREFIX}/`)) {
    return buildStoryImageUrl(objectPath)
  }

  const thumbnailPath = objectPath.replace(/\.[^/.]+$/, '.webp')
  return buildStoryImageUrl(`${THUMBNAIL_PREFIX}/${thumbnailPath}`)
}
