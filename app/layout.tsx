import './globals.css'
import Script from 'next/script'
import ClientRoot from '@/components/ClientRoot'
import { TooltipProvider } from '@/components/ui/tooltip'
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
        <style dangerouslySetInnerHTML={{ __html: `.zinemap-app{display:none}.zinemap-css-fallback,.zinemap-nojs-fallback{display:none;min-height:100vh;align-items:center;justify-content:center;font-family:Georgia,serif;text-align:center;padding:2rem;background:#fafaf9;color:#292524}.zinemap-css-fallback{display:flex}` }} />
        <link
          rel="preload"
          href="/fonts/GloriaHallelujah-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <Script
          defer
          data-domain="zinemap.com"
          src="https://plausible.io/js/script.js"
          strategy="lazyOnload"
        />
        <Script
          id="hotjar"
          strategy="lazyOnload"
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
        <Script
          id="mouseflow"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              window._mfq = window._mfq || [];
              (function() {
                var mf = document.createElement("script");
                mf.type = "text/javascript"; mf.defer = true;
                mf.src = "//cdn.mouseflow.com/projects/77b216ba-4cd5-46e6-a109-e8811cdf10d9.js";
                document.getElementsByTagName("head")[0].appendChild(mf);
              })();
            `,
          }}
        />
      </head>
      <body>
        <noscript>
          <style dangerouslySetInnerHTML={{ __html: '.zinemap-app{display:none!important}.zinemap-css-fallback{display:none!important}.zinemap-nojs-fallback{display:flex!important}' }} />
        </noscript>
        <div className="zinemap-css-fallback">
          <div>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 1.5rem' }}>
              <path d="M12 2L2 7L12 12L22 7L12 2Z" />
              <path d="M2 17L12 22L22 17" />
              <path d="M2 12L12 17L22 12" />
            </svg>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              This page didn&apos;t load correctly
            </h1>
            <p style={{ color: '#78716c', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Some resources failed to load. This usually fixes itself.<br />
              If the issue persists, message us on{' '}
              <a href="https://instagram.com/zine.map" style={{ color: '#292524', textDecoration: 'underline' }}>
                Instagram @zine.map
              </a>
            </p>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href=""
              style={{
                display: 'inline-block', padding: '0.5rem 1.5rem',
                background: '#292524', color: 'white', borderRadius: '0.375rem',
                textDecoration: 'none', fontWeight: 500,
              }}
            >
              Refresh page
            </a>
          </div>
        </div>
        <div className="zinemap-nojs-fallback">
          <div>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 1.5rem' }}>
              <path d="M12 2L2 7L12 12L22 7L12 2Z" />
              <path d="M2 17L12 22L22 17" />
              <path d="M2 12L12 17L22 12" />
            </svg>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              ZineMap needs JavaScript
            </h1>
            <p style={{ color: '#78716c', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              The interactive map, search, and filters require JavaScript to work.<br />
              Try refreshing, enabling JavaScript in your browser settings,<br />
              or disabling script-blocking extensions (e.g. NoScript).
            </p>
            <p style={{ color: '#78716c', lineHeight: 1.6 }}>
              If the issue persists, message us on{' '}
              <a href="https://instagram.com/zine.map" style={{ color: '#292524', textDecoration: 'underline' }}>
                Instagram @zine.map
              </a>
            </p>
          </div>
        </div>
        <div className="zinemap-app flex-col min-h-screen">
          <TooltipProvider>
            <ClientRoot>{children}</ClientRoot>
          </TooltipProvider>
          <FilloutButton />
        </div>
      </body>
    </html>
  )
}
