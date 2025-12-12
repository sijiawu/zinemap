import { ReactNode } from 'react'
import Link from 'next/link'

interface ArticleLayoutProps {
  children: ReactNode
  title: string
  date?: string
  tags?: string[]
  author?: string
  authorPermalink?: string
}

export function ArticleLayout({ children, title, date, tags, author, authorPermalink }: ArticleLayoutProps) {
  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <header className="mb-8 sm:mb-12">
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-stone-900 mb-4 leading-tight">
          {title}
        </h1>
        
        <div className="flex flex-wrap items-center gap-4 text-stone-600 text-sm sm:text-base">
          {date && (
            <time dateTime={date} className="font-serif">
              {new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
          )}
          {author && (
            <span className="font-serif">
              By{' '}
              {authorPermalink ? (
                <Link 
                  href={`/profile/${authorPermalink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-rose-600 hover:text-rose-800 no-underline transition-colors duration-200"
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
                className="px-3 py-1 bg-stone-100 text-stone-700 rounded-full text-sm font-serif hover:bg-stone-200 hover:text-stone-900 transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Content */}
      <div className="prose prose-stone prose-lg max-w-none">
        {children}
      </div>
    </article>
  )
}

