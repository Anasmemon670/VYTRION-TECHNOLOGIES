import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, addCorsHeaders } from '@/lib/utils'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

const serviceSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  iconName: z.string().optional(),
  features: z.array(z.string()).optional(),
  price: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  active: z.boolean().default(true),
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

// GET /api/services - List services (public - only active)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit
    const active = searchParams.get('active')

    const where: any = {}
    // By default, only show active services to public
    // Admin can see all by passing active=false
    if (active !== 'false') {
      where.active = true
    }

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.service.count({ where }),
    ])

    const response = NextResponse.json(
      {
        services: services.map((s) => ({
          ...s,
          features: s.features || [],
        })),
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
    console.error('Get services error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/services - Create service (Admin only)
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if (adminCheck.error) return adminCheck.error

    const body = await request.json()
    const data = serviceSchema.parse(body)

    const service = await prisma.service.create({
      data: {
        title: data.title,
        description: data.description,
        iconName: data.iconName || null,
        features: data.features || Prisma.JsonNull,
        price: data.price || null,
        duration: data.duration || null,
        active: data.active,
      },
    })

    const response = NextResponse.json(
      {
        message: 'Service created successfully',
        service: {
          ...service,
          features: service.features || [],
        },
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

    console.error('Create service error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
