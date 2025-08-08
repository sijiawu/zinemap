import type { Metadata } from 'next'
import './globals.css'
import ClientRoot from '@/components/ClientRoot'

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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Plausible Analytics */}
        <script defer data-domain="zinemap.com" src="https://plausible.io/js/script.outbound-links.js"></script>        {/* Umami Analytics */}
        {/* {process.env.NEXT_PUBLIC_UMAMI_URL && process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <script
            defer
            src={`${process.env.NEXT_PUBLIC_UMAMI_URL}/script.js`}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
          ></script>
        )} */}
      </head>
      <body>
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  )
}
