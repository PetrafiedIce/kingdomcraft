"use client"

import { useEffect, useMemo, useState } from 'react'

type AuctionListing = {
  id: string
  itemName: string
  quantity: number
  price: number
  seller?: string
  createdAt?: number
}

type Flip = {
  id: string
  itemName: string
  strategyLabel: string
  buyPrice: number
  sellPrice: number
  profit: number
  roi: number
  estimatedDailyVolume?: number
  avgTimeToSellSeconds?: number
  notes?: string
}

function keyOf(name: string) {
  return name.toLowerCase().replace(/\s|_|-/g, '')
}

function sumOfCheapest(list: AuctionListing[], count: number): number | null {
  if (list.length < count) return null
  const sorted = [...list].sort((a, b) => a.price - b.price)
  let total = 0
  for (let i = 0; i < count; i++) total += sorted[i].price
  return total
}

function estimateVolume(buys: number, sells: number) {
  return Math.min(buys, sells) * 2
}

function computeSimpleCraftingFlips(listings: AuctionListing[]): Flip[] {
  const normalized = listings.map(l => ({ ...l, key: keyOf(l.itemName) })) as (AuctionListing & { key: string })[]
  const byItem: Record<string, AuctionListing[]> = {}
  for (const l of normalized) {
    if (!byItem[l.key]) byItem[l.key] = []
    byItem[l.key].push(l)
  }
  for (const key in byItem) byItem[key].sort((a, b) => a.price - b.price)

  const flips: Flip[] = []

  // Example: bones -> bonemeal (1 bone -> 3 bonemeal)
  if (byItem['bone'] && byItem['bonemeal']) {
    const cheapestBone = byItem['bone'][0]
    const bestBonemeal = byItem['bonemeal'][byItem['bonemeal'].length - 1]
    if (cheapestBone && bestBonemeal) {
      const cost = cheapestBone.price
      const revenue = bestBonemeal.price * 3
      const profit = revenue - cost
      if (profit > 0) {
        flips.push({
          id: `bone->bonemeal-${cheapestBone.id}-${bestBonemeal.id}`,
          itemName: 'Bone → Bonemeal x3',
          strategyLabel: 'Crafting arbitrage',
          buyPrice: cost,
          sellPrice: revenue,
          profit,
          roi: profit / cost,
          estimatedDailyVolume: estimateVolume(byItem['bone'].length, byItem['bonemeal'].length),
          notes: 'Buy bones, craft into bonemeal, sell as stacks. Verify recipe and AH fees.'
        })
      }
    }
  }

  // Example: iron ingot -> iron block (9 ingots -> 1 block)
  if (byItem['ironingot'] && byItem['ironblock']) {
    const nineIngots = sumOfCheapest(byItem['ironingot'], 9)
    const bestBlock = byItem['ironblock'][byItem['ironblock'].length - 1]
    if (nineIngots != null && bestBlock) {
      const cost = nineIngots
      const revenue = bestBlock.price
      const profit = revenue - cost
      if (profit > 0) {
        flips.push({
          id: `iron->block-${bestBlock.id}`,
          itemName: 'Iron Ingot ×9 → Iron Block',
          strategyLabel: 'Compression arbitrage',
          buyPrice: cost,
          sellPrice: revenue,
          profit,
          roi: profit / cost,
          estimatedDailyVolume: estimateVolume(byItem['ironingot'].length, byItem['ironblock'].length),
          notes: 'Buy ingots, craft blocks, list blocks. Account for crafting time and fees.'
        })
      }
    }
  }

  return flips.sort((a, b) => b.profit - a.profit)
}

function mockListings(limit: number): AuctionListing[] {
  const out: AuctionListing[] = []
  const push = (name: string, price: number, qty = 1) => out.push({ id: `${name}-${price}-${out.length}` , itemName: name, price, quantity: qty })

  for (let i = 0; i < 50; i++) push('Bone', 120 + i)
  for (let i = 0; i < 50; i++) push('Bonemeal', 60 + (i % 5))

  for (let i = 0; i < 40; i++) push('Iron Ingot', 900 + (i % 50))
  for (let i = 0; i < 20; i++) push('Iron Block', 9000 + (i % 100))

  for (let i = 0; i < 20; i++) push('Oak Log', 200 + (i % 40))

  return out.slice(0, Math.max(limit, 50))
}

export default function Page() {
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<'roi' | 'profit' | 'volume' | 'time'>('profit')
  const [apiKey, setApiKey] = useState('')
  const [endpoint, setEndpoint] = useState('')
  const [useMock, setUseMock] = useState(true)
  const [listings, setListings] = useState<AuctionListing[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const k = localStorage.getItem('donut_api_key')
    const e = localStorage.getItem('donut_endpoint')
    const m = localStorage.getItem('donut_use_mock')
    if (k) setApiKey(k)
    if (e) setEndpoint(e)
    if (m) setUseMock(m === 'true')
  }, [])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 20000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, endpoint, useMock])

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      if (useMock || !endpoint) {
        setListings(mockListings(100))
      } else {
        const res = await fetch(`${endpoint}`, {
          headers: apiKey ? { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' } : { 'Accept': 'application/json' },
          cache: 'no-store'
        })
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
        const data = await res.json()
        const mapped = Array.isArray(data) ? data.map((row: any, i: number) => ({
          id: String(row.id ?? i),
          itemName: String(row.itemName ?? row.item ?? 'Unknown'),
          quantity: Number(row.quantity ?? 1),
          price: Number(row.price ?? row.buyout ?? 0),
          seller: row.seller ?? row.owner,
          createdAt: Number(row.createdAt ?? Date.now())
        })) : []
        setListings(mapped)
      }
    } catch (err: any) {
      setError(err?.message ?? 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  function saveSettings() {
    localStorage.setItem('donut_api_key', apiKey.trim())
    localStorage.setItem('donut_endpoint', endpoint.trim())
    localStorage.setItem('donut_use_mock', String(useMock))
    refresh()
  }

  const flips = useMemo(() => computeSimpleCraftingFlips(listings), [listings])
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filteredList = q ? flips.filter(f => f.itemName.toLowerCase().includes(q)) : flips
    const sorted = [...filteredList].sort((a, b) => {
      if (sortBy === 'profit') return b.profit - a.profit
      if (sortBy === 'roi') return b.roi - a.roi
      if (sortBy === 'volume') return (b.estimatedDailyVolume ?? 0) - (a.estimatedDailyVolume ?? 0)
      return (a.avgTimeToSellSeconds ?? 0) - (b.avgTimeToSellSeconds ?? 0)
    })
    return sorted
  }, [flips, query, sortBy])

  return (
    <main className="space-y-6">
      <section className="card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Best flips right now</h2>
            <p className="text-sm text-muted">Runs completely on this page. Paste your API key/endpoint or use mock data.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost" onClick={refresh} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="block text-sm text-muted mb-1">API Key (Authorization Bearer)</span>
            <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Your DonutSMP API key" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-primary-600" />
          </label>
          <label className="block">
            <span className="block text-sm text-muted mb-1">Auction Endpoint URL</span>
            <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://example/auctions" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-primary-600" />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={useMock} onChange={(e) => setUseMock(e.target.checked)} />
            <span className="text-sm">Use mock data</span>
          </label>
          <div>
            <button className="btn btn-primary" onClick={saveSettings}>Save settings</button>
          </div>
        </div>
      </section>

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
            {loading ? 'Loading...' : error ? `Error: ${error}` : `${visible.length} opportunities`}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((f) => (
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
    </main>
  )
}

