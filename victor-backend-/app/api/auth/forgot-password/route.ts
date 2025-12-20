import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateResetToken } from '@/lib/auth'

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
  console.log('🔵 FORGOT PASSWORD: Request received')
  try {
    // Parse JSON body
    let body
    try {
      body = await request.json()
      console.log('🔵 FORGOT PASSWORD: Body parsed successfully')
    } catch (parseError: any) {
      console.error('❌ JSON parsing error:', parseError)
      const response = NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
      response.headers.set('Access-Control-Allow-Origin', '*')
      return response
    }
    
    const { email } = body
    console.log('🔵 FORGOT PASSWORD: Email received:', email ? 'yes' : 'no')

    // Validate email
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          }
        }
      )
    }

    // Trim and normalize email
    const trimmedEmail = email.trim().toLowerCase()
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          }
        }
      )
    }

    // Find user by email
    console.log('🔵 FORGOT PASSWORD: Searching for user with email:', trimmedEmail)
    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    })
    console.log('🔵 FORGOT PASSWORD: User found:', user ? 'yes' : 'no')

    // For security, don't reveal if user exists or not
    if (!user) {
      console.log('🔵 FORGOT PASSWORD: User not found, returning success message')
      const response = NextResponse.json(
        { message: 'If a user exists with this email, a password reset link has been sent.' },
        { status: 200 }
      )
      response.headers.set('Access-Control-Allow-Origin', '*')
      return response
    }

    // Generate reset token
    console.log('🔵 FORGOT PASSWORD: Generating reset token')
    const resetToken = generateResetToken()
    const resetTokenExpiry = new Date()
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1) // Token expires in 1 hour

    // Save reset token to database
    console.log('🔵 FORGOT PASSWORD: Saving reset token to database')
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    })
    console.log('🔵 FORGOT PASSWORD: Reset token saved successfully')

    // In production, send email with reset token
    // For now, we'll return it (remove this in production!)
    console.log('🔵 FORGOT PASSWORD: Reset token for', trimmedEmail, ':', resetToken)
    console.log('🔵 FORGOT PASSWORD: Request completed successfully')

    const response = NextResponse.json(
      {
        message: 'If a user exists with this email, a password reset link has been sent.',
        // Remove this in production - only for development
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
      },
      { status: 200 }
    )
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response
  } catch (error: any) {
    console.error('❌ FORGOT PASSWORD ERROR:', error)
    console.error('❌ Error message:', error?.message)
    console.error('❌ Error stack:', error?.stack)
    
    const response = NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error?.message : 'An error occurred'
      },
      { status: 500 }
    )
    response.headers.set('Access-Control-Allow-Origin', '*')
    return response
  }
}

