import FlipsView from '@/components/FlipsView'

export default function Page() {
  return (
    <main className="space-y-6">
      <section className="card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Best flips right now</h2>
            <p className="text-sm text-muted">Updated in near real-time. Filter and sort to your strategy.</p>
          </div>
        </div>
      </section>
      <FlipsView />
    </main>
  )
}

