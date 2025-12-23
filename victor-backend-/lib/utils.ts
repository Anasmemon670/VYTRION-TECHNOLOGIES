import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from './auth'

export function addCorsHeaders(response: NextResponse, methods: string = 'GET, POST, PUT, DELETE, OPTIONS') {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', methods)
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

export async function requireAuth(request: NextRequest) {
  try {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '') || null
  const user = await getCurrentUser(token)

  if (!user) {
    const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return {
      error: addCorsHeaders(response),
      user: null,
    }
  }

  return { error: null, user }
  } catch (error: any) {
    console.error('Auth error in requireAuth:', error?.message, error?.stack)
    const response = NextResponse.json(
      { error: 'Authentication failed', details: process.env.NODE_ENV === 'development' ? error?.message : 'An error occurred during authentication' },
      { status: 500 }
    )
    return {
      error: addCorsHeaders(response),
      user: null,
    }
  }
}

export async function requireAdmin(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult.error) return authResult

  if (!authResult.user?.isAdmin) {
    const response = NextResponse.json(
      { error: 'Access denied. Admin privileges required.' },
      { status: 403 }
    )
    return {
      error: addCorsHeaders(response),
      user: null,
    }
  }

  return authResult
}

export function generateOrderNumber(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 10000)
  return `ORD-${timestamp}-${random.toString().padStart(4, '0')}`
}

export function generateSlug(text: string): string {
  if (!text || typeof text !== 'string') {
    return `item-${Date.now()}`
  }
  
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  
  // Ensure slug is never empty
  return slug || `item-${Date.now()}`
}
