import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { rateLimit, getClientIdentifier } from './lib/rateLimit'

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://vytrion-commerce.vercel.app/', // 👈 yahan apna real frontend URL
]

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const origin = request.headers.get('origin') || ''

  // ✅ Handle CORS preflight
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 })
    setSecurityHeaders(response, origin)
    return response
  }

  // Skip rate limit for health
  if (pathname === '/api/health') {
    const response = NextResponse.next()
    setSecurityHeaders(response, origin)
    return response
  }

  // Rate limit
  const isAuthEndpoint = pathname.startsWith('/api/auth')
  const rateLimitOptions = isAuthEndpoint
    ? { windowMs: 60000, maxRequests: 10 }
    : { windowMs: 60000, maxRequests: 100 }

  const clientId = getClientIdentifier(request)
  const rateLimitResult = rateLimit(clientId, rateLimitOptions)

  if (!rateLimitResult.allowed) {
    const response = NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
      },
      { status: 429 }
    )
    setSecurityHeaders(response, origin)
    response.headers.set('X-RateLimit-Limit', rateLimitOptions.maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', '0')
    response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString())
    return response
  }

  const response = NextResponse.next()
  setSecurityHeaders(response, origin)

  response.headers.set('X-RateLimit-Limit', rateLimitOptions.maxRequests.toString())
  response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
  response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString())

  return response
}

function setSecurityHeaders(response: NextResponse, origin: string) {
  // ✅ CORS (SAFE)
  if (ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }

  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  )

  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  )

  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Max-Age', '86400')

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  response.headers.delete('X-Powered-By')
}

export const config = {
  matcher: '/api/:path*',
}
