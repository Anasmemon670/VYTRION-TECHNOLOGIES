import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, addCorsHeaders } from '@/lib/utils'

// Handle CORS preflight
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

// POST /api/messages/[id]/seen - Mark message as seen (User only, not admin)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const authCheck = await requireAuth(request)
    if (authCheck.error) return authCheck.error

    const resolvedParams = params instanceof Promise ? await params : params
    const messageId = resolvedParams.id

    // Check if message exists and belongs to user
    const existingMessage = await prisma.userMessage.findUnique({
      where: { id: messageId },
    })

    if (!existingMessage) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      ))
    }

    // Only the user who owns the message can mark it as seen
    if (existingMessage.userId !== authCheck.user!.id) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      ))
    }

    // Update message status to SEEN
    const message = await prisma.userMessage.update({
      where: { id: messageId },
      data: {
        status: 'SEEN',
        seenAt: new Date(),
        isRead: true, // Also mark as read
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
        message: 'Message marked as seen',
        userMessage: message,
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

    console.error('Mark message as seen error:', error)
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
      },
      { status: 500 }
    ))
  }
}

