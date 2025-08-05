import type { Metadata } from 'next'
import './globals.css'
import ClientRoot from '@/components/ClientRoot'

export const metadata: Metadata = {
  title: 'ZineMap',
  description: 'Find and share zine stores around the world',
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
