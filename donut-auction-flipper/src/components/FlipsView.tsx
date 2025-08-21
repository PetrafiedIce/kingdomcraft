'use client'

import useSWR from 'swr'
import { useMemo, useState } from 'react'
import { Flip, FlipsResponse } from '@/lib/types'

const fetcher = async (url: string) => {
  const apiKey = typeof window !== 'undefined' ? localStorage.getItem('donut_api_key') || '' : ''
  const res = await fetch(url, {
    headers: apiKey ? { 'x-donut-api-key': apiKey } : undefined,
  })
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
  return res.json()
}

export default function FlipsView() {
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<'roi' | 'profit' | 'volume' | 'time'>('profit')
  const { data, error, isLoading } = useSWR<FlipsResponse>('/api/flips?limit=100', fetcher, { refreshInterval: 20_000 })

  const filtered = useMemo(() => {
    const list = data?.flips ?? []
    const q = query.trim().toLowerCase()
    const filteredList = q ? list.filter(f => f.itemName.toLowerCase().includes(q)) : list
    const sorted = [...filteredList].sort((a, b) => {
      if (sortBy === 'profit') return b.profit - a.profit
      if (sortBy === 'roi') return b.roi - a.roi
      if (sortBy === 'volume') return (b.estimatedDailyVolume ?? 0) - (a.estimatedDailyVolume ?? 0)
      return (a.avgTimeToSellSeconds ?? 0) - (b.avgTimeToSellSeconds ?? 0)
    })
    return sorted
  }, [data, query, sortBy])

  return (
    <section className="card">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <input
            placeholder="Search item..."
            className="w-64 rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-primary-600"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-primary-600"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="profit">Sort by Profit</option>
            <option value="roi">Sort by ROI</option>
            <option value="volume">Sort by Volume</option>
            <option value="time">Sort by Time to Sell</option>
          </select>
        </div>
        <div className="text-sm text-muted">
          {isLoading ? 'Loading...' : error ? 'Failed to load flips' : `${filtered.length} opportunities`}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((f) => (
          <article key={f.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold leading-tight">{f.itemName}</h3>
                <p className="text-xs text-muted">{f.strategyLabel}</p>
              </div>
              <span className="rounded bg-green-500/10 px-2 py-1 text-xs font-semibold text-green-400">{Math.round(f.roi * 100)}% ROI</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded bg-white/5 p-2">
                <div className="text-muted text-xs">Buy</div>
                <div>${(f.buyPrice / 1000).toFixed(2)}k</div>
              </div>
              <div className="rounded bg-white/5 p-2">
                <div className="text-muted text-xs">Sell</div>
                <div>${(f.sellPrice / 1000).toFixed(2)}k</div>
              </div>
              <div className="rounded bg-white/5 p-2">
                <div className="text-muted text-xs">Profit</div>
                <div>${(f.profit / 1000).toFixed(2)}k</div>
              </div>
              <div className="rounded bg-white/5 p-2">
                <div className="text-muted text-xs">Volume/day</div>
                <div>{f.estimatedDailyVolume ?? '—'}</div>
              </div>
            </div>
            {f.notes ? <p className="mt-3 text-xs text-muted">{f.notes}</p> : null}
          </article>
        ))}
      </div>
    </section>
  )
}

