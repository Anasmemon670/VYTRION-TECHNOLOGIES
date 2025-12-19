import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin, addCorsHeaders } from '@/lib/utils'
import { z } from 'zod'

const userMessageSchema = z.object({
  userId: z.string(),
  sender: z.string().min(1),
  subject: z.string().min(1),
  message: z.string().min(1),
})

const updateUserMessageSchema = z.object({
  isRead: z.boolean().optional(),
})

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// GET /api/messages - Get user messages (authenticated) or all messages (admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit
    const isRead = searchParams.get('isRead')

    const authCheck = await requireAuth(request)
    if (authCheck.error) return authCheck.error

    const where: any = {}
    
    // If user is admin, they can see all messages
    // Otherwise, only their own messages
    if (!authCheck.user!.isAdmin) {
      where.userId = authCheck.user!.id
    }

    if (isRead === 'true') {
      where.isRead = true
    } else if (isRead === 'false') {
      where.isRead = false
    }

    const [messages, total] = await Promise.all([
      prisma.userMessage.findMany({
        where,
        skip,
        take: limit,
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
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.userMessage.count({ where }),
    ])

    const response = NextResponse.json(
      {
        messages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    console.error('Get messages error:', error)
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
      },
      { status: 500 }
    ))
  }
}

// POST /api/messages - Create user message (Admin can send to users, Users can send to admins)
export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireAuth(request)
    if (authCheck.error) return authCheck.error

    const user = authCheck.user!
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
    
    // If admin, use the full schema (can specify userId)
    // If regular user, they can only send messages to admins (no userId needed)
    if (user.isAdmin) {
      const data = userMessageSchema.parse(body)

      // Verify user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: data.userId },
      })

      if (!targetUser) {
        return addCorsHeaders(NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        ))
      }

      const message = await prisma.userMessage.create({
        data: {
          userId: data.userId,
          sender: data.sender,
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

      const response = NextResponse.json(
        {
          message: 'User message created successfully',
          userMessage: message,
        },
        { status: 201 }
      )

      return addCorsHeaders(response)
    } else {
      // Regular user sending message to admins
      const { subject, message: messageText } = body

      if (!subject || !subject.trim()) {
        return addCorsHeaders(NextResponse.json(
          { error: 'Subject is required' },
          { status: 400 }
        ))
      }

      if (!messageText || !messageText.trim()) {
        return addCorsHeaders(NextResponse.json(
          { error: 'Message is required' },
          { status: 400 }
        ))
      }

      // Create message with user's name as sender
      const senderName = `${user.firstName} ${user.lastName}`.trim() || user.email || 'User'
      
      const message = await prisma.userMessage.create({
        data: {
          userId: user.id,
          sender: senderName,
          subject: subject.trim(),
          message: messageText.trim(),
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
          message: 'Message sent successfully',
          userMessage: message,
        },
        { status: 201 }
      )

      return addCorsHeaders(response)
    }

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      ))
    }

    console.error('Create user message error:', error)
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while sending the message'
      },
      { status: 500 }
    ))
  }
}
