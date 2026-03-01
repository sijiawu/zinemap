import { Metadata } from 'next'

const BASE_URL = 'https://zinemap.com'

export const metadata: Metadata = {
  title: 'Libraries - ZineMap',
  description: 'Explore libraries with zine collections worldwide. Find archives, reference collections, and libraries where you can browse or check out zines.',
  openGraph: {
    title: 'Libraries - ZineMap',
    description: 'Explore libraries with zine collections worldwide. Find archives, reference collections, and libraries where you can browse or check out zines.',
    type: 'website',
    url: `${BASE_URL}/libraries`,
    siteName: 'ZineMap',
    images: [
      {
        url: '/preview-image.png',
        width: 1200,
        height: 630,
        alt: 'Libraries - ZineMap',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Libraries - ZineMap',
    description: 'Explore libraries with zine collections worldwide.',
  },
}

export default function LibrariesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
