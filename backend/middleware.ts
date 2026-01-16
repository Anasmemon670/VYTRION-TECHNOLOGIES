import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { rateLimit, getClientIdentifier } from './lib/rateLimit'

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'https://vytrion-commerce.vercel.app',
  'https://vytrion-technologies.vercel.app',
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

  // Skip rate limit for health and webhook endpoints
  if (pathname === '/api/health' || pathname === '/api/webhooks/stripe') {
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
  // ✅ CORS - Allow all origins in development, specific origins in production
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  if (isDevelopment) {
    // In development, allow all origins
    response.headers.set('Access-Control-Allow-Origin', origin || '*')
  } else {
    // In production, check if origin is in allowed list
    const normalizedOrigin = origin.replace(/\/$/, '') // Remove trailing slash
    const isAllowedOrigin = ALLOWED_ORIGINS.some(allowed => {
      const normalizedAllowed = allowed.replace(/\/$/, '')
      return normalizedOrigin === normalizedAllowed || normalizedOrigin.includes(normalizedAllowed)
    })
    
    if (isAllowedOrigin && origin) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    } else if (!origin) {
      // If no origin header, allow it (for same-origin requests)
      response.headers.set('Access-Control-Allow-Origin', '*')
    }
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
