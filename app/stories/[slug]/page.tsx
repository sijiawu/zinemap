import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { ArticleLayout } from '@/components/ArticleLayout'
import { getStoryBySlug, getAllStorySlugs } from '@/lib/getStories'

export async function generateStaticParams() {
  const slugs = getAllStorySlugs()
  return slugs.map((slug) => ({
    slug,
  }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const story = getStoryBySlug(slug)
  
  if (!story) {
    return {
      title: 'Story Not Found - ZineMap',
    }
  }

  return {
    title: `${story.metadata.title} - ZineMap Stories`,
    description: story.metadata.excerpt,
    openGraph: {
      title: `${story.metadata.title} - ZineMap Stories`,
      description: story.metadata.excerpt,
      type: 'article',
      publishedTime: story.metadata.date,
      tags: story.metadata.tags,
    },
  }
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const story = getStoryBySlug(slug)

  if (!story) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white">
      <ArticleLayout
        title={story.metadata.title}
        date={story.metadata.date}
        tags={story.metadata.tags}
        author={story.metadata.author}
        authorPermalink={story.metadata.author_permalink}
      >
        {story.content}
      </ArticleLayout>
    </div>
  )
}

