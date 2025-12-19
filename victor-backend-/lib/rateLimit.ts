// Simple in-memory rate limiter
// For production, use Redis or a dedicated service

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

export interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
}

export function rateLimit(
  identifier: string,
  options: RateLimitOptions = { windowMs: 60000, maxRequests: 100 }
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = identifier
  const { windowMs, maxRequests } = options

  // Clean up old entries (simple cleanup, not perfect but works)
  if (Object.keys(store).length > 10000) {
    Object.keys(store).forEach((k) => {
      if (store[k].resetTime < now) {
        delete store[k]
      }
    })
  }

  // Get or create entry
  let entry = store[key]

  if (!entry || entry.resetTime < now) {
    // Create new window
    entry = {
      count: 1,
      resetTime: now + windowMs,
    }
    store[key] = entry
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: entry.resetTime,
    }
  }

  // Increment count
  entry.count++

  if (entry.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

export function getClientIdentifier(request: Request): string {
  // Try to get IP from various headers (for production behind proxy)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'unknown'

  // Include user agent for better identification
  const userAgent = request.headers.get('user-agent') || 'unknown'

  return `${ip}:${userAgent.slice(0, 50)}`
}
