import { Metadata } from 'next'

const BASE_URL = 'https://zinemap.com'

export const metadata: Metadata = {
  title: 'Zinesters - ZineMap',
  description: "Join the map! ZineMap's mapping the global zine scene, and it wouldn't be complete without you!",
  openGraph: {
    title: 'Zinesters - ZineMap',
    description: "Join the map! ZineMap's mapping the global zine scene, and it wouldn't be complete without you!",
    type: 'website',
    url: `${BASE_URL}/zinesters`,
    siteName: 'ZineMap',
    images: [
      {
        url: '/preview-zinesters.png',
        width: 1200,
        height: 630,
        alt: 'Zinesters - ZineMap',
      },
    ],
  },
}

export default function ZinestersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

