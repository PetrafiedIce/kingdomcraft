import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Donut Auction Flipper',
  description: 'Find the best flips on DonutSMP auction house',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <header className="mb-8 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Donut Auction Flipper</h1>
            <nav className="flex gap-2">
              <a href="/" className="btn btn-ghost">Dashboard</a>
              <a href="/settings" className="btn btn-ghost">Settings</a>
            </nav>
          </header>
          {children}
          <footer className="mt-12 text-center text-sm text-muted">
            Not affiliated with DonutSMP. Use responsibly.
          </footer>
        </div>
      </body>
    </html>
  )
}

