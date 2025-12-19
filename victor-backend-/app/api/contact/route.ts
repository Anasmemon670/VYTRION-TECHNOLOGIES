import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, addCorsHeaders } from '@/lib/utils'
import { z } from 'zod'
import { rateLimit, getClientIdentifier } from '@/lib/rateLimit'

const contactMessageSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  subject: z.string().optional(),
  message: z.string().min(1),
})

const updateContactMessageSchema = z.object({
  isRead: z.boolean().optional(),
  archived: z.boolean().optional(),
})

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// POST /api/contact - Create contact message (public, rate limited)
export async function POST(request: NextRequest) {
  try {
    // Rate limit contact form submissions
    const identifier = getClientIdentifier(request)
    const rateLimitResult = rateLimit(identifier, {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 requests per window
    })

    if (!rateLimitResult.allowed) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      ))
    }

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
    
    const data = contactMessageSchema.parse(body)

    const message = await prisma.contactMessage.create({
      data: {
        name: data.name,
        email: data.email,
        subject: data.subject || null,
        message: data.message,
      },
    })

    const response = NextResponse.json(
      {
        message: 'Contact message submitted successfully',
        contactMessage: message,
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

    console.error('Create contact message error:', error)
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while submitting the contact message'
      },
      { status: 500 }
    ))
  }
}

// GET /api/contact - List contact messages (Admin only)
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if (adminCheck.error) return adminCheck.error

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit
    const archived = searchParams.get('archived')
    const isRead = searchParams.get('isRead')

    const where: any = {}
    if (archived === 'true') {
      where.archived = true
    } else if (archived === 'false') {
      where.archived = false
    }
    if (isRead === 'true') {
      where.isRead = true
    } else if (isRead === 'false') {
      where.isRead = false
    }

    const [messages, total] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.contactMessage.count({ where }),
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
    console.error('Get contact messages error:', error)
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
      },
      { status: 500 }
    ))
  }
}
