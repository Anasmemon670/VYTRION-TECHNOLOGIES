import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, addCorsHeaders } from '@/lib/utils'
import { z } from 'zod'

const replyContactMessageSchema = z.object({
  subject: z.string().min(1),
  message: z.string().min(1),
})

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

// POST /api/contact/[id]/reply - Reply to contact message (Admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const messageId = resolvedParams.id

    const adminCheck = await requireAdmin(request)
    if (adminCheck.error) return adminCheck.error

    const body = await request.json()
    const data = replyContactMessageSchema.parse(body)

    // Get the contact message
    const contactMessage = await prisma.contactMessage.findUnique({
      where: { id: messageId },
    })

    if (!contactMessage) {
      return NextResponse.json(
        { error: 'Contact message not found' },
        { status: 404 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: contactMessage.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found with this email. The user must be registered to receive messages.' },
        { status: 404 }
      )
    }

    // Create UserMessage for the user
    const userMessage = await prisma.userMessage.create({
      data: {
        userId: user.id,
        sender: 'Admin',
        subject: data.subject,
        message: data.message,
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

    // Mark contact message as read
    await prisma.contactMessage.update({
      where: { id: messageId },
      data: { isRead: true },
    })

    const response = NextResponse.json(
      {
        message: 'Reply sent successfully',
        userMessage,
      },
      { status: 201 }
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
        { error: 'Contact message not found' },
        { status: 404 }
      )
    }

    console.error('Reply to contact message error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
