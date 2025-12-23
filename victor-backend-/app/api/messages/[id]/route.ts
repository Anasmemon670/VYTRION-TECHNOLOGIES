import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin, addCorsHeaders } from '@/lib/utils'
import { z } from 'zod'

const updateUserMessageSchema = z.object({
  isRead: z.boolean().optional(),
  status: z.enum(['SENT', 'SEEN']).optional(),
})

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// GET /api/messages/[id] - Get message by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const authCheck = await requireAuth(request)
    if (authCheck.error) return authCheck.error

    const resolvedParams = params instanceof Promise ? await params : params
    const message = await prisma.userMessage.findUnique({
      where: { id: resolvedParams.id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    if (!message) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      ))
    }

    // Users can only see their own messages unless they're admin
    if (!authCheck.user!.isAdmin && message.userId !== authCheck.user!.id) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      ))
    }

    const response = NextResponse.json(
      { message },
      { status: 200 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    console.error('Get message error:', error)
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
      },
      { status: 500 }
    ))
  }
}

// PUT /api/messages/[id] - Update message (mark as read)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const authCheck = await requireAuth(request)
    if (authCheck.error) return authCheck.error

    const resolvedParams = params instanceof Promise ? await params : params
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('JSON parsing error:', parseError)
      return addCorsHeaders(NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      ))
    }
    
    const data = updateUserMessageSchema.parse(body)

    // Check if message exists and belongs to user (or user is admin)
    const existingMessage = await prisma.userMessage.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!existingMessage) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      ))
    }

    if (!authCheck.user!.isAdmin && existingMessage.userId !== authCheck.user!.id) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      ))
    }

    const updateData: any = {}
    if (data.isRead !== undefined) {
      updateData.isRead = data.isRead
    }
    if (data.status !== undefined) {
      updateData.status = data.status
      // If marking as SEEN, set seenAt timestamp
      if (data.status === 'SEEN') {
        updateData.seenAt = new Date()
      }
    }

    const message = await prisma.userMessage.update({
      where: { id: resolvedParams.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    const response = NextResponse.json(
      {
        message: 'Message updated successfully',
        userMessage: message,
      },
      { status: 200 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      ))
    }

    if (error.code === 'P2025') {
      return addCorsHeaders(NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      ))
    }

    console.error('Update message error:', error)
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
      },
      { status: 500 }
    ))
  }
}

// DELETE /api/messages/[id] - Delete message (Soft delete: for user or for everyone)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const authCheck = await requireAuth(request)
    if (authCheck.error) return authCheck.error

    const resolvedParams = params instanceof Promise ? await params : params
    const { searchParams } = new URL(request.url)
    const deleteForEveryone = searchParams.get('forEveryone') === 'true'
    
    // Check if message exists
    const existingMessage = await prisma.userMessage.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!existingMessage) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      ))
    }

    // Check if already deleted for everyone
    if (existingMessage.deletedForEveryone) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Message already deleted for everyone' },
        { status: 400 }
      ))
    }

    // Users can only delete their own messages, admins can delete any
    const isMessageOwner = existingMessage.userId === authCheck.user!.id
    const isAdmin = authCheck.user!.isAdmin
    
    if (!isAdmin && !isMessageOwner) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Access denied. You can only delete your own messages.' },
        { status: 403 }
      ))
    }

    // Update message with soft delete flags
    const updateData: any = {}
    
    if (deleteForEveryone) {
      // Delete for everyone - both user and admin won't see it
      updateData.deletedForEveryone = true
      updateData.deletedForUser = true
    } else {
      // Delete for user only - mark as deleted for this user
      if (isMessageOwner) {
        // User deleting their own message - hide from user only
        updateData.deletedForUser = true
      } else if (isAdmin) {
        // Admin deleting user's message - hide from user only
        updateData.deletedForUser = true
      }
    }

    await prisma.userMessage.update({
      where: { id: resolvedParams.id },
      data: updateData,
    })

    const response = NextResponse.json(
      { 
        message: deleteForEveryone 
          ? 'Message deleted for everyone' 
          : 'Message deleted for you',
        deletedForEveryone: updateData.deletedForEveryone || false,
        deletedForUser: updateData.deletedForUser || false,
      },
      { status: 200 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return addCorsHeaders(NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      ))
    }

    console.error('Delete message error:', error)
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
      },
      { status: 500 }
    ))
  }
}
