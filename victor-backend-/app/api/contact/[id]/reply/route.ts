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
    
    const data = replyContactMessageSchema.parse(body)

    // Get the contact message
    const contactMessage = await prisma.contactMessage.findUnique({
      where: { id: messageId },
    })

    if (!contactMessage) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Contact message not found' },
        { status: 404 }
      ))
    }

    // Find user by email (optional - contact messages can come from non-registered users)
    const user = await prisma.user.findUnique({
      where: { email: contactMessage.email },
    })

    let userMessage = null

    if (user) {
      // If user exists, create UserMessage for them
      userMessage = await prisma.userMessage.create({
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
    }
    // Note: If user doesn't exist, we still mark the contact message as read
    // In a production system, you would send an email notification here

    // Mark contact message as read
    await prisma.contactMessage.update({
      where: { id: messageId },
      data: { isRead: true },
    })

    const response = NextResponse.json(
      {
        message: user 
          ? 'Reply sent successfully. The user will see it in their messages.'
          : 'Reply recorded. Note: User is not registered, so they will not see this in their account. Consider sending an email notification.',
        userMessage,
        userFound: !!user,
      },
      { status: 201 }
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
        { error: 'Contact message not found' },
        { status: 404 }
      ))
    }

    console.error('Reply to contact message error:', error)
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while sending the reply'
      },
      { status: 500 }
    ))
  }
}
