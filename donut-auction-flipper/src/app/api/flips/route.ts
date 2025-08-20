import { NextRequest } from 'next/server'
import { z } from 'zod'
import { AuctionListing, FlipsResponse } from '@/lib/types'
import { computeSimpleCraftingFlips } from '@/lib/flips'

const Query = z.object({
  limit: z.coerce.number().min(1).max(200).default(100),
})

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const { limit } = Query.parse(Object.fromEntries(searchParams))

  const apiKey = req.headers.get('x-donut-api-key') || process.env.DONUT_API_KEY || ''
  const useMock = !apiKey

  const listings: AuctionListing[] = useMock
    ? mockListings(limit)
    : await fetchDonutListings(apiKey, limit)

  const flips = computeSimpleCraftingFlips(listings).slice(0, limit)
  const body: FlipsResponse = {
    flips,
    updatedAt: Date.now(),
    source: useMock ? 'mock' : 'donut'
  }
  return Response.json(body, { headers: { 'Cache-Control': 'no-store' } })
}

async function fetchDonutListings(apiKey: string, limit: number): Promise<AuctionListing[]> {
  // TODO: Replace this with the real DonutSMP auction API when available.
  // This function is shaped to be easily swapped out.
  const endpoint = process.env.DONUT_AH_ENDPOINT || ''
  if (!endpoint) return mockListings(limit)

  const res = await fetch(`${endpoint}?limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json'
    },
    cache: 'no-store',
    next: { revalidate: 0 }
  })
  if (!res.ok) {
    return mockListings(limit)
  }
  const data = await res.json()
  return mapIncomingListings(data)
}

function mapIncomingListings(data: any): AuctionListing[] {
  if (!Array.isArray(data)) return mockListings(50)
  return data.map((row: any, i: number) => ({
    id: String(row.id ?? i),
    itemName: String(row.itemName ?? row.item ?? 'Unknown'),
    quantity: Number(row.quantity ?? 1),
    price: Number(row.price ?? row.buyout ?? 0),
    seller: row.seller ?? row.owner,
    createdAt: Number(row.createdAt ?? Date.now())
  }))
}

function mockListings(limit: number): AuctionListing[] {
  const out: AuctionListing[] = []
  const push = (name: string, price: number, qty = 1) => out.push({ id: `${name}-${price}-${out.length}`, itemName: name, price, quantity: qty })

  // Bones and Bonemeal
  for (let i = 0; i < 50; i++) push('Bone', 120 + i)
  for (let i = 0; i < 50; i++) push('Bonemeal', 60 + (i % 5))

  // Iron
  for (let i = 0; i < 40; i++) push('Iron Ingot', 900 + (i % 50))
  for (let i = 0; i < 20; i++) push('Iron Block', 9000 + (i % 100))

  // Filler items
  for (let i = 0; i < 20; i++) push('Oak Log', 200 + (i % 40))

  return out.slice(0, Math.max(limit, 50))
}

