import { Metadata } from 'next'

const BASE_URL = 'https://zinemap.com'

export const metadata: Metadata = {
  title: 'Shops - ZineMap',
  description: 'Find indie shops and bookstores that stock zines worldwide. Browse stocking terms, payout methods, and discover where to drop your zines.',
  openGraph: {
    title: 'Shops - ZineMap',
    description: 'Find indie shops and bookstores that stock zines worldwide. Browse stocking terms, payout methods, and discover where to drop your zines.',
    type: 'website',
    url: `${BASE_URL}/stores`,
    siteName: 'ZineMap',
    images: [
      {
        url: '/preview-shops.png',
        width: 1200,
        height: 630,
        alt: 'Shops - ZineMap',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shops - ZineMap',
    description: 'Find indie shops and bookstores that stock zines worldwide.',
    images: ['/preview-shops.png'],
  },
}

export default function StoresLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
