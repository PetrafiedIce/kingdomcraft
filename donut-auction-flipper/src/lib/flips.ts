import { AuctionListing, Flip } from './types'

export function computeSimpleCraftingFlips(listings: AuctionListing[]): Flip[] {
  const normalized = listings.map(l => ({ ...l, key: keyOf(l.itemName) }))
  const byItem: Record<string, AuctionListing[]> = {}
  for (const l of normalized) {
    if (!byItem[l.key]) byItem[l.key] = []
    byItem[l.key].push(l)
  }
  for (const key in byItem) {
    byItem[key].sort((a, b) => a.price - b.price)
  }

  const flips: Flip[] = []

  // Example recipe: bones -> bonemeal (1 bone -> 3 bonemeal in Minecraft)
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

  // Additional example: iron ingot -> iron block (9 ingots -> 1 block)
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

