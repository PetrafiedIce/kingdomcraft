import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Propagate client API key stored in localStorage via custom header if present in cookies
  // For now, we do nothing; header is passed from client fetch directly.
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}

