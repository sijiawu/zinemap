import Link from 'next/link'
import Image from 'next/image'
import { Metadata } from 'next'
import { getAllStories } from '@/lib/getStories'

export const metadata: Metadata = {
  title: 'Stories - ZineMap',
  description: 'Behind the scenes stories, zine culture insights, and community highlights from ZineMap.',
}

export default async function StoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>
}) {
  const params = await searchParams
  const selectedTag = params.tag
  const allStories = getAllStories()
  
  // Get all unique tags
  const allTags = Array.from(
    new Set(allStories.flatMap((story) => story.tags || []))
  ).sort()
  
  // Filter stories by tag if one is selected
  const stories = selectedTag
    ? allStories.filter((story) => story.tags?.includes(selectedTag))
    : allStories

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <header className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-serif font-bold text-stone-900 mb-4">
            Stories
          </h1>
          <p className="text-lg sm:text-xl text-stone-600 font-serif mb-6">
            Behind the scenes stories, zine culture insights, and community highlights.
          </p>
          
          {/* Tags Filter */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              <Link
                href="/stories"
                className={`px-3 py-1.5 rounded-full text-sm font-serif transition-colors ${
                  !selectedTag
                    ? 'bg-rose-600 text-white'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                All
              </Link>
              {allTags.map((tag) => (
                <Link
                  key={tag}
                  href={`/stories?tag=${encodeURIComponent(tag)}`}
                  className={`px-3 py-1.5 rounded-full text-sm font-serif transition-colors ${
                    selectedTag === tag
                      ? 'bg-rose-600 text-white'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
          
          {selectedTag && (
            <div className="mb-6">
              <p className="text-stone-600 font-serif">
                Showing stories tagged: <span className="font-semibold text-stone-900">{selectedTag}</span>
              </p>
            </div>
          )}
        </header>

        <div className="space-y-8">
          {stories.map((story) => (
              <article
                key={story.slug}
                className="border-b border-stone-200 pb-8 last:border-b-0"
              >
                <div className="flex flex-col sm:flex-row gap-6">
                  {story.thumbnail && (
                    <Link
                      href={`/stories/${story.slug}`}
                      className="flex-shrink-0 w-full sm:w-48 h-48 relative rounded-lg overflow-hidden bg-stone-100 group hover:opacity-80 transition-opacity"
                    >
                      {story.thumbnail.endsWith('.svg') ? (
                        <img
                          src={story.thumbnail}
                          alt={story.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Image
                          src={story.thumbnail}
                          alt={story.title}
                          fill
                          className="object-cover"
                        />
                      )}
                    </Link>
                  )}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/stories/${story.slug}`}
                      className="block group"
                    >
                      <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mb-3 group-hover:text-rose-600 transition-colors">
                        {story.title}
                      </h2>
                    </Link>
                    <p className="text-stone-600 mb-4 font-serif leading-relaxed">
                      {story.excerpt}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-stone-500">
                      <time dateTime={story.date} className="font-serif">
                        {new Date(story.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </time>
                      {story.author && (
                        <span className="font-serif">
                          By {story.author_permalink ? (
                            <Link
                              href={`/profile/${story.author_permalink}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-rose-600 hover:text-rose-800 no-underline transition-colors duration-200"
                            >
                              {story.author}
                            </Link>
                          ) : (
                            story.author
                          )}
                        </span>
                      )}
                      {story.tags && story.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {story.tags.map((tag) => (
                            <Link
                              key={tag}
                              href={`/stories?tag=${encodeURIComponent(tag)}`}
                              className="px-2 py-1 bg-stone-100 text-stone-600 rounded text-xs font-serif hover:bg-stone-200 hover:text-stone-800 transition-colors"
                            >
                              {tag}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
  )
}

