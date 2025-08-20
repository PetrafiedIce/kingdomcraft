import Link from 'next/link'
import FlipsTable from '@/components/FlipsTable'
import RefreshButton from '@/components/RefreshButton'
import Filters from '@/components/Filters'
import { getFlips } from '@/lib/server/flips'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const flips = await getFlips({})
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">DonutSMP Flip Finder</h1>
        <div className="flex items-center gap-3">
          <RefreshButton />
          <Link className="text-sm underline" href="/admin">Admin</Link>
        </div>
      </header>
      <Filters />
      <div className="mt-4">
        <FlipsTable initialFlips={flips as any} />
      </div>
    </main>
  )
}

