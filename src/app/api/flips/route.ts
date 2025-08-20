import { NextRequest, NextResponse } from 'next/server'
import { getFlips } from '@/src/lib/server/flips'
import '@/src/lib/server/buildCheck'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const sort = (url.searchParams.get('sort') as any) || 'score'
  const minRoi = url.searchParams.get('minRoi') ? Number(url.searchParams.get('minRoi')) : undefined
  const minProfit = url.searchParams.get('minProfit') ? Number(url.searchParams.get('minProfit')) : undefined
  const q = url.searchParams.get('q') || undefined
  const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined

  const flips = await getFlips({ sort, minRoi, minProfit, q, limit })
  return NextResponse.json({ data: flips })
}

