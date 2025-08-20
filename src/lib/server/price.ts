import { Auction } from './donutClient'

export type CheapestSummary = {
  cheapestStackPrice: number | null
  cheapestListings: Auction[]
  liquidityNote: 'low' | 'ok' | 'high' | 'none'
}

export function normalizeToStackPrice(listings: Auction[], targetStack = 64): CheapestSummary {
  if (!listings.length) return { cheapestStackPrice: null, cheapestListings: [], liquidityNote: 'none' }

  const sorted = [...listings].sort((a, b) => (a.price / a.quantity) - (b.price / b.quantity))

  const nearBest = sorted.filter(x => (x.price / x.quantity) <= (sorted[0].price / sorted[0].quantity) * 1.1).slice(0, 10)
  const liquidityNote = nearBest.length >= 5 ? 'high' : nearBest.length >= 3 ? 'ok' : 'low'

  const exactStack = sorted.find(x => x.quantity === targetStack)
  if (exactStack) {
    return { cheapestStackPrice: exactStack.price, cheapestListings: nearBest, liquidityNote }
  }

  const unitPrice = sorted[0].price / sorted[0].quantity
  return { cheapestStackPrice: Math.floor(unitPrice * targetStack), cheapestListings: nearBest, liquidityNote }
}

