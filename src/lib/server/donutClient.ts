import { env } from './env'
import { z } from 'zod'

const AuctionSchema = z.object({
  id: z.string().optional(),
  itemName: z.string(),
  quantity: z.number(),
  price: z.number(),
  seller: z.string().optional(),
  endsAt: z.string().datetime().optional(),
  itemId: z.string().optional(),
  nbtHash: z.string().optional(),
})

export type Auction = z.infer<typeof AuctionSchema>

const AuctionsResponseSchema = z.object({
  data: z.array(AuctionSchema),
  total: z.number().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional()
})

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))

async function fetchWithRetries(input: string, init: RequestInit, attempts = 3): Promise<Response> {
  let delayMs = 500
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    try {
      const res = await fetch(input, { ...init, signal: controller.signal })
      clearTimeout(timeout)
      if (res.status === 429) {
        await sleep(delayMs)
        delayMs *= 2
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res
    } catch (err) {
      clearTimeout(timeout)
      if (attempt === attempts) throw err
      await sleep(delayMs)
      delayMs *= 2
    }
  }
  throw new Error('Unreachable')
}

export async function getAuctions(params: { q?: string; page?: number; pageSize?: number; sort?: string }) {
  const url = new URL('/auctions', env.DONUT_API_BASE)
  if (params.q) url.searchParams.set('q', params.q)
  if (params.page) url.searchParams.set('page', String(params.page))
  if (params.pageSize) url.searchParams.set('pageSize', String(params.pageSize))
  if (params.sort) url.searchParams.set('sort', params.sort)

  if (env.MOCK_DONUT_API) {
    const res = await fetch(`${env.MOCK_DONUT_API}${url.pathname}${url.search}`)
    const json = await res.json()
    if (params.q) json.data = json.data.filter((x: any) => String(x.itemName).toLowerCase().includes(params.q!.toLowerCase()))
    return AuctionsResponseSchema.parse(json)
  }

  const res = await fetchWithRetries(url.toString(), {
    headers: {
      'Authorization': `Bearer ${env.DONUT_API_KEY}`,
      'Accept': 'application/json'
    }
  })
  const json = await res.json()
  return AuctionsResponseSchema.parse(json)
}

