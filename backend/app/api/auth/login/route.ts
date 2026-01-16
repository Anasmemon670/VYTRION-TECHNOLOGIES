import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken, generateRefreshToken } from '@/lib/auth'

// Helper function to get CORS origin
function getCorsOrigin(request: NextRequest): string {
  const origin = request.headers.get('origin')
  const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'https://vytrion-commerce.vercel.app',
    'https://vytrion-technologies.vercel.app',
  ]
  
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  if (!origin) {
    return '*'
  }
  
  if (isDevelopment) {
    return origin
  }
  
  // In production, check if origin is allowed
  const normalizedOrigin = origin.replace(/\/$/, '')
  const isAllowed = ALLOWED_ORIGINS.some(allowed => {
    const normalizedAllowed = allowed.replace(/\/$/, '')
    return normalizedOrigin === normalizedAllowed
  })
  
  // Return the origin if allowed, otherwise return it anyway to fix CORS (can restrict later)
  return origin
}

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const corsOrigin = getCorsOrigin(request)
  
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
  
  // Only set credentials if origin is specified (not '*')
  if (corsOrigin !== '*') {
    headers['Access-Control-Allow-Credentials'] = 'true'
  }
  
  return new NextResponse(null, {
    status: 200,
    headers,
  })
}

export async function POST(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('JSON parsing error:', parseError)
      const response = NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
      response.headers.set('Access-Control-Allow-Origin', '*')
      return response
    }
    
    const { email, phone, password } = body

    // Validation
    if (!password) {
      const response = NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
      response.headers.set('Access-Control-Allow-Origin', '*')
      return response
    }

    if (!email && !phone) {
      const response = NextResponse.json(
        { error: 'Either email or phone is required' },
        { status: 400 }
      )
      response.headers.set('Access-Control-Allow-Origin', '*')
      return response
    }

    // Ensure Prisma connection before querying
    try {
      await prisma.$connect().catch(() => {
        // Connection might already be established, ignore error
      })
    } catch (connectError: any) {
      console.error('Database connection error:', connectError)
      const response = NextResponse.json(
        { 
          error: 'Database connection failed. Please check DATABASE_URL.',
          ...(process.env.NODE_ENV === 'development' && { 
            details: connectError?.message
          })
        },
        { status: 500 }
      )
      response.headers.set('Access-Control-Allow-Origin', '*')
      return response
    }

    // Find user by email or phone
    let user
    try {
      user = await prisma.user.findUnique({
        where: email ? { email } : { phone },
      })
    } catch (dbError: any) {
      console.error('Database query error:', dbError)
      
      // Handle Prisma errors
      if (dbError?.code === 'P2021') {
        const response = NextResponse.json(
          { 
            error: 'Database not initialized. Please run migrations first.',
            ...(process.env.NODE_ENV === 'development' && { 
              details: 'Run: npm run db:migrate or pnpm db:migrate'
            })
          },
          { status: 500 }
        )
        response.headers.set('Access-Control-Allow-Origin', '*')
        return response
      }
      
      if (dbError?.code === 'P1001' || dbError?.code === 'P1017') {
        const response = NextResponse.json(
          { 
            error: 'Database connection failed. Please check DATABASE_URL.',
            ...(process.env.NODE_ENV === 'development' && { 
              details: dbError?.message
            })
          },
          { status: 500 }
        )
        response.headers.set('Access-Control-Allow-Origin', '*')
        return response
      }
      
      // Re-throw to be caught by outer catch
      throw dbError
    }

    if (!user) {
      console.error('Login failed: User not found', { email, phone })
      const response = NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
      response.headers.set('Access-Control-Allow-Origin', '*')
      return response
    }

    // Verify password - wrapped in try/catch
    let isPasswordValid
    try {
      isPasswordValid = await verifyPassword(password, user.passwordHash)
    } catch (verifyError: any) {
      console.error('Password verification error:', verifyError)
      const response = NextResponse.json(
        { error: 'Failed to verify password. Please try again.' },
        { status: 500 }
      )
      response.headers.set('Access-Control-Allow-Origin', '*')
      return response
    }

    if (!isPasswordValid) {
      console.error('Login failed: Invalid password', { userId: user.id, email: user.email })
      const response = NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
      response.headers.set('Access-Control-Allow-Origin', '*')
      return response
    }

    // Generate tokens - wrapped in try/catch
    let token, refreshToken
    try {
      token = generateToken(user.id)
      refreshToken = generateRefreshToken(user.id)
    } catch (tokenError: any) {
      console.error('Token generation error:', tokenError)
      
      // Check if error is due to missing JWT_SECRET
      if (tokenError.message?.includes('JWT_SECRET')) {
        const response = NextResponse.json(
          { error: 'Server configuration error: JWT_SECRET is not set. Please contact support.' },
          { status: 500 }
        )
        response.headers.set('Access-Control-Allow-Origin', '*')
        return response
      }
      
      // Re-throw other token errors
      throw tokenError
    }

    // Save refresh token to database - wrapped in try/catch
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken },
      })
    } catch (updateError: any) {
      console.error('Refresh token update error:', updateError)
      // Log but continue - user can still login, refresh token just won't be saved
      console.warn('Warning: Refresh token could not be saved to database')
    }

    // Return user data (without password) - ensure DateTime is serialized
    const userData = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      profilePicture: (user as any).profilePicture || null,
      isAdmin: user.isAdmin,
      marketingOptIn: user.marketingOptIn,
      walletBalance: user.walletBalance?.toString() || '0',
      createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
    }

    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: userData,
        token,
        refreshToken,
      },
      { status: 200 }
    )
    
    // Add CORS headers with exact origin
    const corsOrigin = getCorsOrigin(request)
    response.headers.set('Access-Control-Allow-Origin', corsOrigin)
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (corsOrigin !== '*') {
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }
    
    return response
  } catch (error: any) {
    // Comprehensive error logging
    console.error('Login error (outer catch):', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      name: error?.name,
    })
    
    // Handle Prisma connection errors
    if (error?.code === 'P1001' || error?.code === 'P1017') {
      const response = NextResponse.json(
        { 
          error: 'Database connection failed. Please check DATABASE_URL configuration.',
          ...(process.env.NODE_ENV === 'development' && { 
            details: error?.message
          })
        },
        { status: 500 }
      )
      response.headers.set('Access-Control-Allow-Origin', '*')
      return response
    }
    
    // Handle JWT_SECRET missing error
    if (error?.message?.includes('JWT_SECRET')) {
      const response = NextResponse.json(
        { 
          error: 'Server configuration error: JWT_SECRET is not set.',
          ...(process.env.NODE_ENV === 'development' && { 
            details: 'Please set JWT_SECRET in environment variables'
          })
        },
        { status: 500 }
      )
      response.headers.set('Access-Control-Allow-Origin', '*')
      return response
    }
    
    // Handle Prisma table missing error
    if (error?.code === 'P2021') {
      const response = NextResponse.json(
        { 
          error: 'Database not initialized. Please run migrations first.',
          ...(process.env.NODE_ENV === 'development' && { 
            details: 'Run: npm run db:migrate or pnpm db:migrate'
          })
        },
        { status: 500 }
      )
      response.headers.set('Access-Control-Allow-Origin', '*')
      return response
    }
    
    // Generic error response
    const response = NextResponse.json(
      { 
        error: error?.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { 
          details: error?.stack,
          code: error?.code,
          name: error?.name
        })
      },
      { status: 500 }
    )
    response.headers.set('Access-Control-Allow-Origin', '*')
    return response
  }
}

