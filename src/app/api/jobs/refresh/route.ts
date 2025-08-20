import { NextResponse } from 'next/server'
import { recomputeFlips } from '@/lib/server/flips'
import '@/lib/server/buildCheck'

export async function POST() {
  const result = await recomputeFlips()
  return NextResponse.json(result)
}

