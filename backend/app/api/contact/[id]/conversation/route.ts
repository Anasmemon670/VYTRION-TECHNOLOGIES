import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, addCorsHeaders } from '@/lib/utils'

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// GET /api/contact/[id]/conversation - Get conversation history for a contact message (Admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const messageId = resolvedParams.id

    const adminCheck = await requireAdmin(request)
    if (adminCheck.error) return adminCheck.error

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

    // Find user by email to get all their messages
    const user = await prisma.user.findUnique({
      where: { email: contactMessage.email },
    })

    // Get all messages in this conversation thread
    // This includes:
    // 1. Admin replies (UserMessage where sender = 'Admin')
    // 2. User replies (UserMessage where sender != 'Admin' OR new ContactMessages)
    let allMessages: any[] = []

    if (user) {
      // Get all UserMessages for this user (both admin and user messages)
      // Strategy: Get ALL messages created after the contact message
      // This includes:
      // 1. Admin replies (with contactMessageId set)
      // 2. User replies (without contactMessageId set, but created after contact message)
      try {
        // Get all user messages created after the contact message
        // This will include both admin replies and user replies
        const allUserMessages = await prisma.userMessage.findMany({
          where: {
            userId: user.id,
            deletedForEveryone: false, // Exclude deleted messages
            createdAt: {
              gte: contactMessage.createdAt, // Only messages after the contact message
            },
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
          orderBy: {
            createdAt: 'asc',
          },
        })
        
        allMessages = allUserMessages
      } catch (error: any) {
        // Fallback: If there's any error, try without deletedForEveryone filter
        console.error('Error fetching user messages, using fallback:', error)
        try {
          const allUserMessages = await prisma.userMessage.findMany({
            where: {
              userId: user.id,
              createdAt: {
                gte: contactMessage.createdAt,
              },
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
            orderBy: {
              createdAt: 'asc',
            },
          })
          allMessages = allUserMessages
        } catch (fallbackError: any) {
          console.error('Fallback also failed:', fallbackError)
          allMessages = []
        }
      }

      // Also get any additional ContactMessages from the same user/email
      // that were created after the original message (user's follow-up messages)
      const additionalContactMessages = await prisma.contactMessage.findMany({
        where: {
          email: contactMessage.email,
          id: {
            not: messageId, // Exclude the original message
          },
          createdAt: {
            gte: contactMessage.createdAt, // Only messages after the original
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      })

      // Convert additional ContactMessages to conversation format
      const additionalUserMessages = additionalContactMessages.map(cm => ({
        id: cm.id,
        type: 'user' as const,
        name: cm.name,
        email: cm.email,
        subject: cm.subject,
        message: cm.message,
        createdAt: cm.createdAt,
        status: null as string | null,
        seenAt: null as string | null,
        isContactMessage: true,
      }))

      // Combine all messages and sort by createdAt
      const combinedMessages = [
        ...allMessages.map(msg => ({
          ...msg,
          type: msg.sender === 'Admin' ? 'admin' : 'user',
          isContactMessage: false,
        })),
        ...additionalUserMessages,
      ].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateA - dateB
      })

      allMessages = combinedMessages
    }

    // Combine contact message and all other messages into a conversation array
    const conversation = [
      {
        id: contactMessage.id,
        type: 'user' as const,
        name: contactMessage.name,
        email: contactMessage.email,
        subject: contactMessage.subject,
        message: contactMessage.message,
        createdAt: contactMessage.createdAt,
        status: null as string | null,
        seenAt: null as string | null,
      },
      ...allMessages.map(msg => {
        if (msg.isContactMessage) {
          // This is an additional ContactMessage from the user
          return {
            id: msg.id,
            type: 'user' as const,
            name: msg.name,
            email: msg.email,
            subject: msg.subject,
            message: msg.message,
            createdAt: msg.createdAt,
            status: null as string | null,
            seenAt: null as string | null,
          }
        } else {
          // This is a UserMessage (either from admin or user)
          return {
            id: msg.id,
            type: msg.type,
            name: msg.sender,
            email: msg.user?.email || contactMessage.email,
            subject: msg.subject,
            message: msg.message,
            createdAt: msg.createdAt,
            status: msg.status || null,
            seenAt: msg.seenAt || null,
          }
        }
      }),
    ]

    const response = NextResponse.json(
      {
        conversation,
        contactMessage,
      },
      { status: 200 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    console.error('Get conversation history error:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    
    // Handle database connection errors
    if (error.code === 'P1001' || error.code === 'P1017') {
      return addCorsHeaders(NextResponse.json(
        { 
          error: 'Database connection error. Please try again.',
          details: process.env.NODE_ENV === 'development' ? error.message : 'Unable to connect to database'
        },
        { status: 503 } // Service Unavailable
      ))
    }
    
    // Handle Prisma schema errors
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      return addCorsHeaders(NextResponse.json(
        { 
          error: 'Database schema error',
          details: process.env.NODE_ENV === 'development' ? error.message : 'Database configuration issue'
        },
        { status: 500 }
      ))
    }
    
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while fetching conversation history'
      },
      { status: 500 }
    ))
  }
}

