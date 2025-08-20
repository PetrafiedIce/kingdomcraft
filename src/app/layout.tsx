import './globals.css'
import type { Metadata } from 'next'
import '@/lib/server/buildCheck'

export const metadata: Metadata = {
  title: 'DonutSMP Flip Finder',
  description: 'Find and rank Auction House flip opportunities on DonutSMP',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}

