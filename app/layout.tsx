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
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  )
}
