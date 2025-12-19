import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function PUT(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || null

    const currentUser = await getCurrentUser(token)

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { firstName, lastName, email, phone, marketingOptIn, profilePicture } = body

    // Build update data object
    const updateData: any = {}

    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (marketingOptIn !== undefined) updateData.marketingOptIn = marketingOptIn
    if (profilePicture !== undefined) updateData.profilePicture = profilePicture || null

    // Check email uniqueness if provided
    if (email !== undefined) {
      if (email === null || email === '') {
        updateData.email = null
      } else if (email !== currentUser.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email },
        })
        if (existingUser && existingUser.id !== currentUser.id) {
          return NextResponse.json(
            { error: 'Email already in use' },
            { status: 409 }
          )
        }
        updateData.email = email
      }
    }

    // Check phone uniqueness if provided
    if (phone !== undefined) {
      if (phone === null || phone === '') {
        updateData.phone = null
      } else if (phone !== currentUser.phone) {
        const existingUser = await prisma.user.findUnique({
          where: { phone },
        })
        if (existingUser && existingUser.id !== currentUser.id) {
          return NextResponse.json(
            { error: 'Phone already in use' },
            { status: 409 }
          )
        }
        updateData.phone = phone
      }
    }

    // Update user
    const dbUpdatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: updateData,
    })
    
    // Return user data (without password and sensitive fields)
    const updatedUser = {
      id: dbUpdatedUser.id,
      firstName: dbUpdatedUser.firstName,
      lastName: dbUpdatedUser.lastName,
      email: dbUpdatedUser.email,
      phone: dbUpdatedUser.phone,
      profilePicture: (dbUpdatedUser as any).profilePicture || null,
      isAdmin: dbUpdatedUser.isAdmin,
      marketingOptIn: dbUpdatedUser.marketingOptIn,
      walletBalance: dbUpdatedUser.walletBalance,
      createdAt: dbUpdatedUser.createdAt,
      updatedAt: dbUpdatedUser.updatedAt,
    }

    const response = NextResponse.json(
      {
        message: 'Profile updated successfully',
        user: updatedUser,
      },
      { status: 200 }
    )
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'PUT, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response
  } catch (error: any) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

