import Image from 'next/image'

interface ImageWithCaptionProps {
  src: string
  alt: string
  caption: string
  width?: number
  height?: number
  priority?: boolean
}

export function ImageWithCaption({
  src,
  alt,
  caption,
  width = 1200,
  height = 800,
  priority = false,
}: ImageWithCaptionProps) {
  // Check if it's an external URL
  const isExternal = src.startsWith('http://') || src.startsWith('https://')
  // Check if it's an SVG
  const isSvg = src.endsWith('.svg')
  
  return (
    <figure className="my-8 sm:my-12">
      <div className="relative w-full max-w-2xl mx-auto rounded-lg overflow-hidden bg-stone-100">
        {isExternal ? (
          // For external images, use regular img tag since Next.js Image requires domain configuration
          <img
            src={src}
            alt={alt}
            className="w-full h-auto object-cover"
            loading={priority ? 'eager' : 'lazy'}
          />
        ) : isSvg ? (
          // For SVG files, use regular img tag for better control
          <img
            src={src}
            alt={alt}
            className="w-full h-auto"
            loading={priority ? 'eager' : 'lazy'}
          />
        ) : (
          // For local images, use Next.js Image
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            className="w-full h-auto object-cover"
            priority={priority}
          />
        )}
      </div>
      <figcaption className="mt-3 text-center text-sm text-stone-600 font-serif italic">
        {caption}
      </figcaption>
    </figure>
  )
}

