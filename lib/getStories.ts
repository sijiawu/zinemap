import fs from 'fs'
import path from 'path'
import { parseStory, Story, StoryMetadata } from './storyParser'

const storiesDirectory = path.join(process.cwd(), 'app/stories/_stories')

export function getAllStorySlugs(): string[] {
  if (!fs.existsSync(storiesDirectory)) {
    return []
  }

  const fileNames = fs.readdirSync(storiesDirectory)
  return fileNames
    .filter((name) => name.endsWith('.md') && name !== 'README.md')
    .map((name) => name.replace(/\.md$/, ''))
}

export function getStoryBySlug(slug: string): Story | null {
  try {
    const fullPath = path.join(storiesDirectory, `${slug}.md`)
    if (!fs.existsSync(fullPath)) {
      return null
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8')
    return parseStory(fileContents, slug)
  } catch (error) {
    console.error(`Error reading story ${slug}:`, error)
    return null
  }
}

export function getAllStories(): StoryMetadata[] {
  const slugs = getAllStorySlugs()
  const stories: StoryMetadata[] = []

  for (const slug of slugs) {
    const story = getStoryBySlug(slug)
    if (story) {
      stories.push(story.metadata)
    }
  }

  // Sort by date, newest first
  return stories.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
}

