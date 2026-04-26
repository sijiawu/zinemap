import { ReactNode } from 'react'
import Link from 'next/link'
import { TranslationToggle } from '@/components/TranslationToggle'
import type { StoryBodyFont, StoryTitleHeading } from '@/lib/storyParser'

type TranslationLang = 'pl' | 'en' | 'fr'

const TITLE_HEADING_STYLES: Record<
  StoryTitleHeading,
  { default: string; lucida: string }
> = {
  h1: {
    default: 'text-4xl sm:text-5xl font-serif font-bold text-stone-900 mb-4 leading-tight',
    lucida: 'text-4xl sm:text-5xl font-bold text-stone-900 mb-4 leading-tight',
  },
  h2: {
    default: 'text-3xl sm:text-4xl font-serif font-bold text-stone-900 mb-4 leading-tight',
    lucida: 'text-3xl sm:text-4xl font-bold text-stone-900 mb-4 leading-tight',
  },
  h3: {
    default: 'text-2xl sm:text-3xl font-serif font-bold text-stone-900 mb-3 leading-snug',
    lucida: 'text-2xl sm:text-3xl font-bold text-stone-900 mb-3 leading-snug',
  },
}

interface ArticleLayoutProps {
  children: ReactNode
  title: string
  date?: string
  tags?: string[]
  thumbnail?: string
  author?: string
  authorPermalink?: string
  contentTranslation?: ReactNode
  translationLang?: TranslationLang
  primaryLang?: TranslationLang
  titleHeading?: StoryTitleHeading
  bodyFont?: StoryBodyFont
}

function TitleHeading({
  as,
  className,
  children,
}: {
  as: StoryTitleHeading
  className: string
  children: ReactNode
}) {
  const Tag = as
  return <Tag className={className}>{children}</Tag>
}

export function ArticleLayout({
  children,
  title,
  date,
  tags,
  thumbnail,
  author,
  authorPermalink,
  contentTranslation,
  translationLang,
  primaryLang = 'en',
  titleHeading = 'h1',
  bodyFont = 'default',
}: ArticleLayoutProps) {
  const fontKey = bodyFont === 'lucida' ? 'lucida' : 'default'
  const titleClass = TITLE_HEADING_STYLES[titleHeading][fontKey]
  const articleFontClass =
    bodyFont === 'lucida'
      ? "font-['Lucida_Sans_Unicode',_'Lucida_Grande',_sans-serif]"
      : undefined
  const hasHeaderBackground = Boolean(thumbnail)

  return (
    <article
      className={[
        'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12',
        articleFontClass,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Header */}
      <header
        className={[
          'mb-8 sm:mb-12',
          hasHeaderBackground ? 'relative overflow-hidden rounded-xl border border-stone-200' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {hasHeaderBackground && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url("${thumbnail}")` }}
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 bg-white/80"
              aria-hidden="true"
            />
          </>
        )}

        <div className={hasHeaderBackground ? 'relative z-10 px-5 py-6 sm:px-8 sm:py-8' : ''}>
          <TitleHeading as={titleHeading} className={titleClass}>
            {title}
          </TitleHeading>

          <div className="flex flex-wrap items-center gap-4 text-stone-600 text-sm sm:text-base">
            {date && (
              <time dateTime={date} className={bodyFont === 'lucida' ? 'font-inherit' : 'font-serif'}>
                {new Date(date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </time>
            )}
            {author && (
              <span className={bodyFont === 'lucida' ? 'font-inherit' : 'font-serif'}>
                By{' '}
                {authorPermalink ? (
                  <Link
                    href={`/profile/${authorPermalink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-stone-900 hover:text-rose-600 no-underline transition-colors duration-200"
                  >
                    {author}
                  </Link>
                ) : (
                  author
                )}
              </span>
            )}
          </div>

          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/stories?tag=${encodeURIComponent(tag)}`}
                  className={`inline-flex items-center rounded-full border border-stone-300 bg-white px-3 py-1 text-sm text-stone-800 shadow-sm transition-colors hover:border-stone-400 hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 ${
                    bodyFont === 'lucida' ? 'font-inherit' : 'font-serif'
                  }`}
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
        </div>

      </header>

      {/* Content */}
      <div
        className={
          bodyFont === 'lucida'
            ? 'prose prose-stone prose-lucida max-w-none [&_p]:leading-[1.5] [&_li]:leading-[1.5]'
            : 'prose prose-stone max-w-none'
        }
      >
        {contentTranslation && translationLang ? (
          <TranslationToggle
            primaryLang={primaryLang}
            translationLang={translationLang}
            contentPrimary={children}
            contentTranslation={contentTranslation}
          />
        ) : (
          children
        )}
      </div>
    </article>
  )
}

