import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin, addCorsHeaders } from '@/lib/utils'
import { z } from 'zod'

const updateUserMessageSchema = z.object({
  isRead: z.boolean().optional(),
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
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // Users can only see their own messages unless they're admin
    if (!authCheck.user!.isAdmin && message.userId !== authCheck.user!.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const response = NextResponse.json(
      { message },
      { status: 200 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    console.error('Get message error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
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
    const body = await request.json()
    const data = updateUserMessageSchema.parse(body)

    // Check if message exists and belongs to user (or user is admin)
    const existingMessage = await prisma.userMessage.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!existingMessage) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    if (!authCheck.user!.isAdmin && existingMessage.userId !== authCheck.user!.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const message = await prisma.userMessage.update({
      where: { id: resolvedParams.id },
      data: {
        ...(data.isRead !== undefined && { isRead: data.isRead }),
      },
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
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    console.error('Update message error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/messages/[id] - Delete message (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const adminCheck = await requireAdmin(request)
    if (adminCheck.error) return adminCheck.error

    const resolvedParams = params instanceof Promise ? await params : params
    await prisma.userMessage.delete({
      where: { id: resolvedParams.id },
    })

    const response = NextResponse.json(
      { message: 'Message deleted successfully' },
      { status: 200 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    console.error('Delete message error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
