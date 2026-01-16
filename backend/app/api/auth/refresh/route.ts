import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyRefreshToken, generateToken, generateRefreshToken } from '@/lib/auth'

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
    
    const { refreshToken } = body

    if (!refreshToken) {
      const response = NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      )
      response.headers.set('Access-Control-Allow-Origin', '*')
      return response
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken)
    if (!decoded) {
      const response = NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      )
      response.headers.set('Access-Control-Allow-Origin', '*')
      return response
    }

    // Check if refresh token exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    })

    if (!user || user.refreshToken !== refreshToken) {
      const response = NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      )
      response.headers.set('Access-Control-Allow-Origin', '*')
      return response
    }

    // Generate new tokens
    const newAccessToken = generateToken(user.id)
    const newRefreshToken = generateRefreshToken(user.id)

    // Update refresh token in database
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    })

    const response = NextResponse.json(
      {
        message: 'Token refreshed successfully',
        token: newAccessToken,
        refreshToken: newRefreshToken,
      },
      { status: 200 }
    )
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response
  } catch (error: any) {
    console.error('Refresh token error:', error)
    const response = NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred during token refresh'
      },
      { status: 500 }
    )
    response.headers.set('Access-Control-Allow-Origin', '*')
    return response
  }
}

