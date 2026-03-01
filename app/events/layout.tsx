import { Metadata } from 'next'

const BASE_URL = 'https://zinemap.com'

export const metadata: Metadata = {
  title: 'Events - ZineMap',
  description: 'Discover zine festivals, swaps, and workshops around the world. Find events to share your work, trade zines, and connect with the zine community.',
  openGraph: {
    title: 'Events - ZineMap',
    description: 'Discover zine festivals, swaps, and workshops around the world. Find events to share your work, trade zines, and connect with the zine community.',
    type: 'website',
    url: `${BASE_URL}/events`,
    siteName: 'ZineMap',
    images: [
      {
        url: '/preview-events.png',
        width: 1200,
        height: 630,
        alt: 'Events - ZineMap',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Events - ZineMap',
    description: 'Discover zine festivals, swaps, and workshops around the world.',
  },
}

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
