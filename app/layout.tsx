import type { Metadata } from 'next'
import './globals.css'
import Link from "next/link"

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        {/* Navigation Bar */}
        <nav className="w-full bg-white border-b border-stone-200 shadow-sm font-serif">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-2xl font-bold text-stone-800 hover:text-rose-600 transition-colors">ZineMap</Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-stone-700 hover:text-rose-600 font-medium transition-colors">Dashboard</Link>
              {/* Placeholder for login/user menu */}
              <button className="ml-2 px-3 py-1 rounded bg-rose-500 text-white font-medium hover:bg-rose-600 transition-colors">Login</button>
            </div>
          </div>
        </nav>
        <div>{children}</div>
      </body>
    </html>
  )
}
