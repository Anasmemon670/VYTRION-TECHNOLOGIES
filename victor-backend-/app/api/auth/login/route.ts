import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken, generateRefreshToken } from '@/lib/auth'

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
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

    // Find user by email or phone
    const user = await prisma.user.findUnique({
      where: email ? { email } : { phone },
    })

    if (!user) {
      console.error('Login failed: User not found', { email, phone })
      const response = NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
      response.headers.set('Access-Control-Allow-Origin', '*')
      return response
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash)

    if (!isPasswordValid) {
      console.error('Login failed: Invalid password', { userId: user.id, email: user.email })
      const response = NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
      response.headers.set('Access-Control-Allow-Origin', '*')
      return response
    }

    // Generate tokens
    const token = generateToken(user.id)
    const refreshToken = generateRefreshToken(user.id)

    // Save refresh token to database
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    })

    // Return user data (without password)
    const userData = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      profilePicture: (user as any).profilePicture || null,
      isAdmin: user.isAdmin,
      marketingOptIn: user.marketingOptIn,
      walletBalance: user.walletBalance,
      createdAt: user.createdAt,
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
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response
  } catch (error: any) {
    console.error('Login error:', error)
    const response = NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred during login'
      },
      { status: 500 }
    )
    response.headers.set('Access-Control-Allow-Origin', '*')
    return response
  }
}

