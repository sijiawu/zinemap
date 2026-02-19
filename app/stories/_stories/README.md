# Story Files

Each story is a markdown file with frontmatter metadata and markdown content.

## Required Frontmatter Fields

```yaml
---
title: "Your Story Title"        # Required: The story title (use quotes if it contains colons or special chars)
date: YYYY-MM-DD                 # Required: Publication date (ISO format)
tags:                            # Required: Array of tags
  - Tag 1
  - Tag 2
author: Author Name              # Required: Author name
author_permalink: username       # Optional: ZineMap profile permalink - makes author name a link to their profile
slug: story-slug                 # Required: URL slug (must match filename without .md)
excerpt: "Short description"     # Required: Used in story listing page (use quotes if needed)
thumbnail: "/path/to/image.jpg"  # Optional: Thumbnail image for listing page (if not provided, first image in content is used)
password: "secret123"            # Optional: Password to protect the story. If set, story won't appear in listing and requires password to view
---
```

**Note:** Always quote string values that contain colons (`:`) or other special YAML characters to avoid parsing errors.

## Content

Write your story content in markdown below the frontmatter.

### Supported Markdown

- Headings: `## H2`, `### H3`, `#### H4`
- Paragraphs: Regular text
- Lists: `-` for unordered, `1.` for ordered
- **Bold** and *italic* text
- Links: `[text](url)`

### Custom Components

You can use these custom components in your markdown:

#### Image with Caption

```html
<ImageWithCaption
  src="/path/to/image.svg"
  alt="Description of image"
  caption="Caption text that appears below the image"
/>
```

- `src`: Path to image (relative to `/public` folder, e.g., `/story-world-map.svg`)
- `alt`: Alt text for accessibility
- `caption`: Caption displayed below the image

#### Callout (Info Box)

```html
<Callout>
Your content here. Can include **bold** and other markdown.
</Callout>
```

#### Callout (Highlight/Pull Quote)

```html
<Callout variant="highlight">
"Your important quote or highlight text here."
</Callout>
```

## File Naming

- Filename must match the `slug` in frontmatter
- Example: `slug: building-zinemap` → filename: `building-zinemap.md`
- Place all story files in this `_stories` directory

## Inline Translations

To add a translation that appears as an in-page toggle:

1. Add the translated content after your main content, wrapped in HTML comments. Use `TRANSLATION_PL`, `TRANSLATION_EN`, or `TRANSLATION_FR`:
```
<!-- TRANSLATION_PL -->
Your Polish content here
<!-- /TRANSLATION_PL -->
```

2. Optional: Add `primary_lang: "fr"` to frontmatter when the main content is not English (e.g. French-original with English translation).

## Password Protection

If you set a `password` field in the frontmatter:
- The story will **not appear** in the stories listing page
- Visitors to the story URL will see a password form
- Once unlocked, the password is stored in browser localStorage (so users don't need to re-enter)
- Leave the field empty or omit it to make the story public

## Example Structure

```markdown
---
title: My Story Title
date: 2024-01-15
tags:
  - Behind the Zine Scenes
  - Community
author: ZineMap Team
author_permalink: zinemap-team  # Optional: Links author name to their ZineMap profile
slug: my-story
excerpt: A brief description of the story.
password: "secret123"           # Optional: Password-protect this story
---

Your story content starts here. Use markdown for formatting.

<ImageWithCaption
  src="/my-image.svg"
  alt="Description"
  caption="Image caption"
/>

<Callout variant="highlight">
"An important quote."
</Callout>
```

