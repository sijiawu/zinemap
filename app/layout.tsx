import './globals.css'
import ClientRoot from '@/components/ClientRoot'
import FilloutButton from '@/components/FilloutButton'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://zinemap.com'),
  title: "ZineMap - Drop Your Zines, Find Your People",
  description: "Explore a global map of the zine universe, track your zines, and discover new places to share your work.",
  openGraph: {
    title: "ZineMap - Drop Your Zines, Find Your People",
    description: "Explore a global map of the zine universe, track your zines, and discover new places to share your work.",
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
    description: "Explore a global map of the zine universe, track your zines, and discover new places to share your work.",
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(h,o,t,j,a,r){
                h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                h._hjSettings={hjid:6547562,hjsv:6};
                a=o.getElementsByTagName('head')[0];
                r=o.createElement('script');r.async=1;
                r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                a.appendChild(r);
              })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
            `,
          }}
        />
      </head>
      <body className="flex flex-col min-h-screen">
        <ClientRoot>{children}</ClientRoot>
        <FilloutButton />
      </body>
    </html>
  )
}
