import { NextResponse } from 'next/server'
import { recomputeFlips } from '@/src/lib/server/flips'
import '@/src/lib/server/buildCheck'

export async function POST() {
  const result = await recomputeFlips()
  return NextResponse.json(result)
}

