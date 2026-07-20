import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { ArticleLayout } from '@/components/ArticleLayout'
import { PasswordProtectedStory } from '@/components/PasswordProtectedStory'
import { getStoryBySlug, getAllStorySlugs } from '@/lib/getStories'

const BASE_URL = 'https://zinemap.com'

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

  // Use story thumbnail if available (may be Supabase URL or same-origin path)
  const imageUrl = story.metadata.thumbnail
    ? (story.metadata.thumbnail.startsWith('http') ? story.metadata.thumbnail : `${BASE_URL}${story.metadata.thumbnail}`)
    : `${BASE_URL}/preview-image.png`

  return {
    title: `${story.metadata.title} - ZineMap Stories`,
    description: story.metadata.excerpt,
    openGraph: {
      title: `${story.metadata.title} - ZineMap Stories`,
      description: story.metadata.excerpt,
      type: 'article',
      publishedTime: story.metadata.date,
      tags: story.metadata.tags,
      url: `${BASE_URL}/stories/${slug}`,
      siteName: 'ZineMap',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: story.metadata.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${story.metadata.title} - ZineMap Stories`,
      description: story.metadata.excerpt,
      images: [imageUrl],
    },
  }
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const story = getStoryBySlug(slug)

  if (!story) {
    notFound()
  }

  const content = (
    <div className="min-h-screen bg-white">
      <ArticleLayout
        title={story.metadata.title}
        date={story.metadata.date}
        tags={story.metadata.tags}
        thumbnail={story.metadata.thumbnail}
        author={story.metadata.author}
        authorPermalink={story.metadata.author_permalink}
        contentTranslation={story.contentTranslation}
        translationLang={story.translationLang}
        primaryLang={story.primaryLang}
        titleHeading={story.metadata.title_heading}
        bodyFont={story.metadata.body_font}
      >
        {story.content}
      </ArticleLayout>
    </div>
  )

  // If story has a password, wrap it in password protection
  if (story.metadata.password && story.metadata.password.trim() !== '') {
    return (
      <PasswordProtectedStory
        slug={slug}
        correctPassword={story.metadata.password}
        title={story.metadata.title}
      >
        {content}
      </PasswordProtectedStory>
    )
  }

  return content
}

