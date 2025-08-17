import './globals.css'
import ClientRoot from '@/components/ClientRoot'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "ZineMap - Drop Your Zines, Find Your People",
  description: "Explore a global map of zine-friendly stores, track your zines, and discover new places to share your work.",
  openGraph: {
    title: "ZineMap - Drop Your Zines, Find Your People",
    description: "Explore a global map of zine-friendly stores, track your zines, and discover new places to share your work.",
    url: "https://zinemap.com",
    siteName: "ZineMap",
    images: [
      {
        url: "/preview-image.png", // Update this path to your actual image
        width: 1200,
        height: 630,
        alt: "ZineMap - Drop Your Zines, Find Your People",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZineMap - Drop Your Zines, Find Your People",
    description: "Explore a global map of zine-friendly stores, track your zines, and discover new places to share your work.",
    images: ["/preview-image.png"], // Update this path to your actual image
  },
  generator: 'v0.dev',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script defer data-domain="zinemap.com" src="https://plausible.io/js/script.js"></script>
        <script async defer src="https://analytics.umami.is/script.js" data-website-id="a0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c0c0"></script>
      </head>
      <body>
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  )
}
