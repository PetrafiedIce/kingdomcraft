export type AuctionListing = {
  id: string
  itemName: string
  quantity: number
  price: number
  seller?: string
  createdAt?: number
}

export type Flip = {
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

export type FlipsResponse = {
  flips: Flip[]
  updatedAt: number
  source: 'mock' | 'donut'
}

