import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { rateLimit, getClientIdentifier } from './lib/rateLimit'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 })
    setSecurityHeaders(response, request)
    return response
  }

  // Skip rate limiting for health check
  if (pathname === '/api/health') {
    const response = NextResponse.next()
    setSecurityHeaders(response, request)
    return response
  }

  // Apply rate limiting (stricter for auth endpoints)
  const isAuthEndpoint = pathname.startsWith('/api/auth')
  const rateLimitOptions = isAuthEndpoint
    ? { windowMs: 60000, maxRequests: 10 } // 10 requests per minute for auth
    : { windowMs: 60000, maxRequests: 100 } // 100 requests per minute for others

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
    setSecurityHeaders(response, request)
    response.headers.set('X-RateLimit-Limit', rateLimitOptions.maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', '0')
    response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString())
    return response
  }

  // Continue with request
  const response = NextResponse.next()
  setSecurityHeaders(response, request)
  
  // Add rate limit headers
  response.headers.set('X-RateLimit-Limit', rateLimitOptions.maxRequests.toString())
  response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
  response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString())

  return response
}

function setSecurityHeaders(response: NextResponse, request: NextRequest) {
  // CORS headers
  const origin = request.headers.get('origin')
  // In production, replace '*' with your frontend domain
  const allowedOrigin = process.env.NODE_ENV === 'production' 
    ? (origin || process.env.NEXT_PUBLIC_APP_URL || '*')
    : '*'
  
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Max-Age', '86400')

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Remove server information
  response.headers.delete('X-Powered-By')

  // Content Security Policy (adjust as needed)
  if (request.nextUrl.pathname.startsWith('/api')) {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'none'; object-src 'none';"
    )
  }
}

export const config = {
  matcher: '/api/:path*',
}
