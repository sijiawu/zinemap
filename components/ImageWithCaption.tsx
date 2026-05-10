import Image from 'next/image'
import { STORY_IMAGE_BLUR_DATA_URL } from '@/lib/imagePlaceholders'
import { getStoryImageUrl } from '@/lib/storyImages'

interface ImageWithCaptionProps {
  src: string
  alt?: string
  caption?: string
  width?: number
  height?: number
  priority?: boolean
}

/** Parse caption string with markdown links [text](url) into React nodes with clickable links */
function parseCaptionWithLinks(caption: string): React.ReactNode {
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match
  let key = 0

  while ((match = linkRegex.exec(caption)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${key++}`}>{caption.slice(lastIndex, match.index)}</span>
      )
    }
    const linkText = match[1].replace(/\*\*/g, '')
    const href = match[2].startsWith('http') ? match[2] : `https://${match[2]}`
    parts.push(
      <a
        key={`link-${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-stone-800"
      >
        {linkText}
      </a>
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < caption.length) {
    parts.push(
      <span key={`text-${key++}`}>{caption.slice(lastIndex)}</span>
    )
  }

  return parts.length > 0 ? parts : caption
}

export function ImageWithCaption({
  src,
  alt = '',
  caption,
  width = 1200,
  height = 800,
  priority = false,
}: ImageWithCaptionProps) {
  const resolvedSrc = getStoryImageUrl(src)
  const isSvg = /\.svg(\?|$)/i.test(resolvedSrc)

  return (
    <figure className="my-8 sm:my-12">
      <div className="relative w-full max-w-xl mx-auto rounded-lg overflow-hidden bg-stone-200/40">
        {isSvg ? (
          <img
            src={resolvedSrc}
            alt={alt}
            className="w-full h-auto"
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
          />
        ) : (
          <Image
            src={resolvedSrc}
            alt={alt}
            width={width}
            height={height}
            sizes="(max-width: 576px) 100vw, 576px"
            className="w-full h-auto object-cover"
            priority={priority}
            placeholder="blur"
            blurDataURL={STORY_IMAGE_BLUR_DATA_URL}
          />
        )}
      </div>
      {caption != null && caption !== '' && (
        <figcaption className="mt-3 mx-auto max-w-prose px-2 text-center text-sm text-stone-600 font-serif italic">
          {parseCaptionWithLinks(caption)}
        </figcaption>
      )}
    </figure>
  )
}

