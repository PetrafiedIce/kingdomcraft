"use client"
import { useEffect, useState } from 'react'

type Flip = {
  id: string
  computedAt: string
  recipe: { id: string; name: string; inputItem: string; outputItem: string }
  inputStackPrice: number
  outputStackPrice: number
  stacksOutPerStackIn: number
  grossPerInputStack: number
  profitPerStack: number
  roiPercent: number
  liquidityNote: string | null
  score: number
  sampleListings: any
}

export default function FlipsTable({ initialFlips }: { initialFlips: Flip[] }) {
  const [flips, setFlips] = useState<Flip[]>(initialFlips)
  const [sort, setSort] = useState<'roi' | 'profit' | 'score'>('score')
  const [q, setQ] = useState('')
  const [minRoi, setMinRoi] = useState(0)

  useEffect(() => {
    const params = new URLSearchParams()
    if (sort) params.set('sort', sort)
    if (q) params.set('q', q)
    if (minRoi) params.set('minRoi', String(minRoi))
    fetch(`/api/flips?${params.toString()}`).then(r => r.json()).then(d => setFlips(d.data))
  }, [sort, q, minRoi])

  return (
    <div className="rounded-md border border-neutral-800 overflow-hidden">
      <div className="flex gap-3 p-3 border-b border-neutral-800 items-center">
        <label className="text-sm">Sort</label>
        <select className="bg-transparent border border-neutral-700 rounded px-2 py-1 text-sm" value={sort} onChange={e => setSort(e.target.value as any)}>
          <option value="score">Score</option>
          <option value="roi">ROI%</option>
          <option value="profit">Profit/stack</option>
        </select>
        <input placeholder="Search..." className="ml-auto bg-transparent border border-neutral-700 rounded px-2 py-1 text-sm" value={q} onChange={e => setQ(e.target.value)} />
        <div className="flex items-center gap-1 text-sm">
          <span>Min ROI%</span>
          <input type="number" className="w-20 bg-transparent border border-neutral-700 rounded px-2 py-1 text-sm" value={minRoi} onChange={e => setMinRoi(Number(e.target.value || 0))} />
        </div>
      </div>
      <table className="min-w-full text-sm">
        <thead className="bg-neutral-950">
          <tr className="text-left">
            <th className="px-3 py-2">Recipe</th>
            <th className="px-3 py-2">Input Stack</th>
            <th className="px-3 py-2">Output Stack</th>
            <th className="px-3 py-2">Stacks Out/In</th>
            <th className="px-3 py-2">Profit/Stack</th>
            <th className="px-3 py-2">ROI%</th>
            <th className="px-3 py-2">Liquidity</th>
            <th className="px-3 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {flips.map(f => (
            <tr key={f.id} className="border-t border-neutral-800 hover:bg-neutral-900/50">
              <td className="px-3 py-2 font-medium">{f.recipe.name}</td>
              <td className="px-3 py-2">{f.inputStackPrice.toLocaleString()}</td>
              <td className="px-3 py-2">{f.outputStackPrice.toLocaleString()}</td>
              <td className="px-3 py-2">{f.stacksOutPerStackIn.toFixed(2)}</td>
              <td className="px-3 py-2">{f.profitPerStack.toLocaleString()}</td>
              <td className="px-3 py-2">{f.roiPercent.toFixed(1)}%</td>
              <td className="px-3 py-2 capitalize">{f.liquidityNote ?? 'n/a'}</td>
              <td className="px-3 py-2">
                <details>
                  <summary className="cursor-pointer underline">View Listings</summary>
                  <div className="grid grid-cols-2 gap-3 p-2">
                    <div>
                      <div className="text-xs opacity-70 mb-1">Input Listings</div>
                      <ul className="text-xs space-y-1">
                        {(f.sampleListings?.input ?? []).slice(0, 10).map((l: any, i: number) => (
                          <li key={i} className="flex justify-between">
                            <span>{l.seller ?? 'seller'}</span>
                            <span>{l.quantity} @ {l.price.toLocaleString()}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs opacity-70 mb-1">Output Listings</div>
                      <ul className="text-xs space-y-1">
                        {(f.sampleListings?.output ?? []).slice(0, 10).map((l: any, i: number) => (
                          <li key={i} className="flex justify-between">
                            <span>{l.seller ?? 'seller'}</span>
                            <span>{l.quantity} @ {l.price.toLocaleString()}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

