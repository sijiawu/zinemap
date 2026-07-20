import matter from 'gray-matter'
import { getStoryImageUrl } from './storyImages'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeReact from 'rehype-react'
import rehypeRaw from 'rehype-raw'
import { visit } from 'unist-util-visit'
import { createElement, Fragment } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'
import { ImageWithCaption } from '@/components/ImageWithCaption'
import { Callout } from '@/components/Callout'

// Type definitions - using any to avoid dependency on @types/hast
type HastRoot = any
type HastElement = any
type HastText = any
type MdastRoot = any

export type TranslationLang = 'pl' | 'en' | 'fr'

export type StoryTitleHeading = 'h1' | 'h2' | 'h3'
export type StoryBodyFont = 'default' | 'lucida'
export type StoryHeaderStyle = 'default' | 'classic'

export interface StoryMetadata {
  title: string
  date: string
  tags: string[]
  author: string
  author_permalink?: string
  slug: string
  excerpt: string
  thumbnail?: string
  password?: string
  primary_lang?: TranslationLang  // Language of main content; defaults to 'en' if not set
  /** Page title element; default h1 */
  title_heading?: StoryTitleHeading
  /** Body font stack; `lucida` matches the newsletter email styles */
  body_font?: StoryBodyFont
  /** Header layout style for story detail pages */
  header_style?: StoryHeaderStyle
}

export interface Story {
  metadata: StoryMetadata
  content: React.ReactElement
  contentTranslation?: React.ReactElement
  translationLang?: TranslationLang
  primaryLang: TranslationLang
}

// Custom rehype plugin to add target="_blank" to all links
function rehypeExternalLinks() {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      if (node.tagName === 'a' && node.properties) {
        const props = node.properties as Record<string, any>
        // Add target="_blank" and rel="noopener noreferrer" to all links
        props.target = '_blank'
        props.rel = 'noopener noreferrer'
      }
    })
  }
}

// Custom rehype plugin to process markdown text inside Callout components
function rehypeProcessMarkdownInCallout() {
  return (tree: HastRoot) => {
    visit(tree, 'element', (node: HastElement) => {
      // Find Callout elements
      if (node.tagName.toLowerCase() === 'callout') {
        // Process text nodes inside the callout to convert markdown to HTML
        const processTextNode = (text: string): any[] => {
          // Simple markdown processing for bold (**text**)
          const parts: any[] = []
          let lastIndex = 0
          const boldRegex = /\*\*([^*]+)\*\*/g
          let match

          while ((match = boldRegex.exec(text)) !== null) {
            // Add text before the match
            if (match.index > lastIndex) {
              const beforeText = text.substring(lastIndex, match.index)
              if (beforeText) {
                parts.push({ type: 'text', value: beforeText })
              }
            }
            // Add the bold text as a strong element
            parts.push({
              type: 'element',
              tagName: 'strong',
              properties: {},
              children: [{ type: 'text', value: match[1] }],
            })
            lastIndex = match.index + match[0].length
          }
          // Add remaining text
          if (lastIndex < text.length) {
            parts.push({ type: 'text', value: text.substring(lastIndex) })
          }
          return parts.length > 0 ? parts : [{ type: 'text', value: text }]
        }

        // Process all children
        const processedChildren: any[] = []
        if (node.children) {
          for (const child of node.children) {
            if (child.type === 'text') {
              const processed = processTextNode(child.value)
              processedChildren.push(...processed)
            } else {
              processedChildren.push(child)
            }
          }
          node.children = processedChildren
        }
      }
    })
  }
}

// Custom rehype plugin to unwrap custom components from paragraphs
function rehypeUnwrapCustomComponents() {
  return (tree: HastRoot) => {
    // First pass: unwrap custom components from paragraphs
    visit(tree, 'element', (node: HastElement, index: number | undefined, parent: HastElement | undefined) => {
      if (node.tagName === 'p' && parent && typeof index === 'number') {
        const children = node.children || []
        
        // Check if paragraph contains only custom components (or whitespace + custom component)
        const hasOnlyCustomComponent = children.every((child: any) => {
          if (child.type === 'text') {
            // Allow whitespace-only text nodes
            return /^\s*$/.test(child.value)
          }
          if (child.type === 'element') {
            const childEl = child as Element
            const tagName = childEl.tagName.toLowerCase()
            // Check if it's a custom component tag
            if (tagName === 'imagewithcaption' || tagName === 'callout') {
              return true
            }
            // Check if it's a div with data-component attribute
            if (tagName === 'div' && (childEl as any).properties && ((childEl as any).properties as any)['data-component']) {
              return true
            }
          }
          return false
        })
        
        if (hasOnlyCustomComponent && children.length > 0) {
          // Find the actual custom component (skip text nodes)
          const customComponent = children.find((child: any) => child.type === 'element') as HastElement | undefined
          if (customComponent) {
            // Replace the paragraph with the custom component
            if (parent.children) {
              parent.children[index] = customComponent
            }
          }
        }
      }
    })
    
    // Second pass: ensure no nested block elements in paragraphs
    visit(tree, 'element', (node: HastElement, index: number | undefined, parent: HastElement | undefined) => {
      if (node.tagName === 'p' && parent && typeof index === 'number') {
        const children = node.children || []
        const blockElements = ['div', 'figure', 'figcaption', 'blockquote', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
        
        // Check if paragraph contains any block elements
        const hasBlockElement = children.some((child: any) => {
          if (child.type === 'element') {
            const childEl = child as Element
            const tagName = childEl.tagName.toLowerCase()
            // Check if it's a block element or custom component
            if (blockElements.includes(tagName)) {
              return true
            }
            // Check if it's a custom component div
            if (tagName === 'div' && (childEl as any).properties && ((childEl as any).properties as any)['data-component']) {
              return true
            }
            // Check for custom component tags
            if (tagName === 'imagewithcaption' || tagName === 'callout') {
              return true
            }
          }
          return false
        })
        
        if (hasBlockElement && parent.children) {
          // Split the paragraph: move block elements out, keep text nodes
          const newChildren: any[] = []
          let currentParagraph: any = null
          
          for (const child of children as any[]) {
            if (child.type === 'element') {
              const childEl = child as any
              const tagName = childEl.tagName.toLowerCase()
              const isBlock = blockElements.includes(tagName) ||
                tagName === 'div' && childEl.properties && (childEl.properties as any)['data-component'] ||
                tagName === 'imagewithcaption' || tagName === 'callout'
              
              if (isBlock) {
                // Close current paragraph if it exists
                if (currentParagraph && currentParagraph.children.length > 0) {
                  newChildren.push(currentParagraph)
                  currentParagraph = null
                }
                // Add block element directly
                newChildren.push(child)
              } else {
                // Add to current paragraph
                if (!currentParagraph) {
                  currentParagraph = { type: 'element', tagName: 'p', properties: {}, children: [] }
                }
                currentParagraph.children.push(child)
              }
            } else {
              // Text node - add to current paragraph
              if (!currentParagraph) {
                currentParagraph = { type: 'element', tagName: 'p', properties: {}, children: [] }
              }
              currentParagraph.children.push(child)
            }
          }
          
          // Add remaining paragraph if it exists
          if (currentParagraph && currentParagraph.children.length > 0) {
            newChildren.push(currentParagraph)
          }
          
          // Replace the paragraph with the new structure
          if (newChildren.length > 0) {
            parent.children.splice(index, 1, ...newChildren)
          }
        }
      }
    })
  }
}

// Custom rehype plugin to transform HTML-like tags to React components
function rehypeCustomComponents() {
  return (tree: HastRoot) => {
    visit(tree, 'element', (node: HastElement) => {
      // Transform ImageWithCaption tags (case-insensitive)
      if (node.tagName.toLowerCase() === 'imagewithcaption') {
        const props: any = {}
        
        // Extract attributes
        if (node.properties) {
          const props_obj = node.properties as Record<string, any>
          if (props_obj.src) props.src = String(props_obj.src)
          if (props_obj.alt) props.alt = String(props_obj.alt)
          if (props_obj.caption) props.caption = String(props_obj.caption)
          if (props_obj.width) props.width = Number(props_obj.width)
          if (props_obj.height) props.height = Number(props_obj.height)
          if (props_obj.priority !== undefined) {
            props.priority = props_obj.priority === 'true' || props_obj.priority === true
          }
        }
        
        // Store component info in data attributes
        node.tagName = 'div'
        node.properties = {
          'data-component': 'ImageWithCaption',
          'data-props': JSON.stringify(props),
        }
      }
      
      // Transform Callout tags (case-insensitive)
      if (node.tagName.toLowerCase() === 'callout') {
        const props: any = {}
        
        // Extract attributes
        if (node.properties) {
          const props_obj = node.properties as Record<string, any>
          if (props_obj.variant) props.variant = String(props_obj.variant)
        }
        
        // Store component info
        node.tagName = 'div'
        node.properties = {
          'data-component': 'Callout',
          'data-props': JSON.stringify(props),
        }
      }
    })
  }
}

// Custom component map for rehype-react
const components: any = {
  div: (props: any) => {
    const { 'data-component': component, 'data-props': propsStr, children, ...restProps } = props
    
    if (component === 'ImageWithCaption') {
      const componentProps = propsStr ? JSON.parse(propsStr) : {}
      return createElement(ImageWithCaption, componentProps)
    }
    
    if (component === 'Callout') {
      const componentProps = propsStr ? JSON.parse(propsStr) : {}
      return createElement(Callout, componentProps, children)
    }
    
    return createElement('div', restProps, children)
  },
}

// Process markdown content to React
function processMarkdown(content: string): React.ReactElement {
  const processor = remark()
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeProcessMarkdownInCallout)
    .use(rehypeUnwrapCustomComponents)
    .use(rehypeCustomComponents)
    .use(rehypeExternalLinks)
    .use(rehypeReact, {
      createElement,
      Fragment,
      components,
      jsx: jsx,
      jsxs: jsxs,
    })

  const result = processor.processSync(content)
  return result.result as React.ReactElement
}

// Extract first image from markdown content
function extractFirstImage(content: string): string | undefined {
  // Try to find ImageWithCaption component first
  const imageWithCaptionMatch = content.match(/<ImageWithCaption\s+[^>]*src=["']([^"']+)["']/i)
  if (imageWithCaptionMatch) {
    return imageWithCaptionMatch[1]
  }
  
  // Try to find markdown image syntax: ![alt](src)
  const markdownImageMatch = content.match(/!\[[^\]]*\]\(([^)]+)\)/)
  if (markdownImageMatch) {
    return markdownImageMatch[1]
  }
  
  // Try to find HTML img tag: <img src="...">
  const imgTagMatch = content.match(/<img\s+[^>]*src=["']([^"']+)["']/i)
  if (imgTagMatch) {
    return imgTagMatch[1]
  }
  
  return undefined
}

// Parse a story markdown file
export function parseStory(markdownContent: string, slug: string): Story {
  const { data, content } = matter(markdownContent)

  // Validate required fields with better error messages
  const missingFields: string[] = []
  if (!data.title) missingFields.push('title')
  if (!data.date) missingFields.push('date')
  if (!data.tags) missingFields.push('tags')
  if (!data.author) missingFields.push('author')
  if (!data.excerpt) missingFields.push('excerpt')

  if (missingFields.length > 0) {
    console.error(`Story ${slug} missing fields:`, missingFields)
    console.error('Parsed data:', data)
    throw new Error(`Story ${slug} is missing required frontmatter fields: ${missingFields.join(', ')}`)
  }

  // Handle date - if it's a Date object, convert to YYYY-MM-DD string
  let dateStr: string
  if (data.date instanceof Date) {
    dateStr = data.date.toISOString().split('T')[0]
  } else {
    dateStr = String(data.date)
  }

  // Extract thumbnail from content or use explicit thumbnail field
  const rawThumbnail = data.thumbnail ? String(data.thumbnail) : extractFirstImage(content)
  const thumbnail = rawThumbnail ? getStoryImageUrl(rawThumbnail) : undefined

  const titleHeadingRaw = data.title_heading ? String(data.title_heading).toLowerCase() : 'h1'
  const title_heading: StoryTitleHeading =
    titleHeadingRaw === 'h2' || titleHeadingRaw === 'h3' ? titleHeadingRaw : 'h1'

  const bodyFontRaw = data.body_font ? String(data.body_font).toLowerCase() : 'default'
  const body_font: StoryBodyFont = bodyFontRaw === 'lucida' ? 'lucida' : 'default'
  const headerStyleRaw = data.header_style ? String(data.header_style).toLowerCase() : 'default'
  const header_style: StoryHeaderStyle = headerStyleRaw === 'classic' ? 'classic' : 'default'

  const metadata: StoryMetadata = {
    title: String(data.title),
    date: dateStr,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [String(data.tags)],
    author: String(data.author),
    author_permalink: data.author_permalink ? String(data.author_permalink) : undefined,
    slug: data.slug ? String(data.slug) : slug,
    excerpt: String(data.excerpt),
    thumbnail: thumbnail,
    password: data.password ? String(data.password) : undefined,
    title_heading,
    body_font,
    header_style,
  }

  // Check for inline translation: <!-- TRANSLATION_XX --> ... <!-- /TRANSLATION_XX --> (XX = pl, en, fr)
  const translationMatch = content.match(/<!--\s*TRANSLATION_(PL|EN|FR)\s*-->([\s\S]*?)<!--\s*\/TRANSLATION_\1\s*-->/i)
  let mainContent = content
  let translationContent: string | undefined
  let translationLang: Story['translationLang']
  if (translationMatch) {
    mainContent = content.slice(0, translationMatch.index).trim()
    translationContent = translationMatch[2].trim()
    translationLang = translationMatch[1].toLowerCase() as Story['translationLang']
  }

  const primaryLang: TranslationLang = (data.primary_lang as TranslationLang) || 'en'

  const processedContent = processMarkdown(mainContent)
  const processedTranslation = translationContent ? processMarkdown(translationContent) : undefined

  return {
    metadata,
    content: processedContent,
    contentTranslation: processedTranslation,
    translationLang,
    primaryLang,
  }
}

