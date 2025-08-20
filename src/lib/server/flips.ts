import { prisma } from '@/lib/prisma'
import { normalizeToStackPrice } from './price'
import { getAuctions } from './donutClient'

export type GetFlipsOptions = {
  sort?: 'roi' | 'profit' | 'score'
  minRoi?: number
  minProfit?: number
  liquidity?: 'low' | 'ok' | 'high'
  limit?: number
  q?: string
}

export async function getFlips(opts: GetFlipsOptions) {
  const rows = await prisma.flipOpportunity.findMany({
    orderBy: [
      opts.sort === 'profit' ? { profitPerStack: 'desc' } : opts.sort === 'score' ? { score: 'desc' } : { roiPercent: 'desc' }
    ],
    where: {
      roiPercent: opts.minRoi ? { gte: opts.minRoi } : undefined,
      profitPerStack: opts.minProfit ? { gte: opts.minProfit } : undefined,
      recipe: opts.q ? { OR: [ { inputItem: { contains: opts.q, mode: 'insensitive' } }, { outputItem: { contains: opts.q, mode: 'insensitive' } } ] } : undefined
    },
    include: { recipe: true },
    take: opts.limit ?? 100
  })
  return rows.map(r => ({
    ...r,
    sampleListings: r.sampleListings ? safeParseJson(r.sampleListings) : null
  }))
}

export function computeStacksOutPerStackIn(inputStackSize: number, inputPerCraft: number, outputPerCraft: number, outputStackSize: number) {
  return (inputStackSize / inputPerCraft) * (outputPerCraft / outputStackSize)
}

export async function recomputeFlips() {
  const recipes = await prisma.flipRecipe.findMany({ where: { active: true } })
  const now = new Date()
  const opportunities = [] as any[]
  for (const r of recipes) {
    const inputListings = await getAuctions({ q: r.inputItem, pageSize: 100 })
    const outputListings = await getAuctions({ q: r.outputItem, pageSize: 100 })

    const input = normalizeToStackPrice(inputListings.data)
    const output = normalizeToStackPrice(outputListings.data)
    if (input.cheapestStackPrice == null || output.cheapestStackPrice == null) continue

    const stacksOutPerStackIn = computeStacksOutPerStackIn(r.inputStackSize, r.inputPerCraft, r.outputPerCraft, r.outputStackSize)
    const grossPerInputStack = Math.floor(stacksOutPerStackIn * output.cheapestStackPrice)
    const profitPerStack = grossPerInputStack - input.cheapestStackPrice
    const roiPercent = profitPerStack / input.cheapestStackPrice * 100
    const liquidityNote = input.liquidityNote === 'low' || output.liquidityNote === 'low' ? 'low' : (input.liquidityNote === 'high' && output.liquidityNote === 'high') ? 'high' : 'ok'
    const liquidityFactor = liquidityNote === 'high' ? 1 : liquidityNote === 'ok' ? 0.8 : 0.5
    const score = roiPercent * liquidityFactor

    opportunities.push({
      computedAt: now,
      recipeId: r.id,
      inputStackPrice: input.cheapestStackPrice,
      outputStackPrice: output.cheapestStackPrice,
      stacksOutPerStackIn,
      grossPerInputStack,
      profitPerStack,
      roiPercent,
      liquidityNote,
      sampleListings: JSON.stringify({ input: input.cheapestListings, output: output.cheapestListings }),
      score
    })
  }

  await prisma.$transaction([
    prisma.flipOpportunity.deleteMany({ where: { } }),
    prisma.flipOpportunity.createMany({ data: opportunities })
  ])

  return { computed: opportunities.length }
}

function safeParseJson(input: string) {
  try { return JSON.parse(input) } catch { return null }
}

