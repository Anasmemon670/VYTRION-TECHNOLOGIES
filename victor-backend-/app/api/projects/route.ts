import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, addCorsHeaders } from '@/lib/utils'
import { z } from 'zod'

const projectSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  client: z.string().optional(),
  year: z.string().optional(),
  status: z.enum(['Completed', 'In Progress']).default('Completed'),
  images: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
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

// GET /api/projects - List projects (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit
    const status = searchParams.get('status')

    const where: any = {}
    if (status) where.status = status

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.project.count({ where }),
    ])

    const response = NextResponse.json(
      {
        projects: projects.map((p) => ({
          ...p,
          images: p.images || [],
          features: p.features || [],
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
    console.error('Get projects error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create project (Admin only)
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if (adminCheck.error) return adminCheck.error

    const body = await request.json()
    const data = projectSchema.parse(body)

    const project = await prisma.project.create({
      data: {
        title: data.title,
        description: data.description || null,
        client: data.client || null,
        year: data.year || null,
        status: data.status,
        images: data.images || null,
        features: data.features || null,
      },
    })

    const response = NextResponse.json(
      {
        message: 'Project created successfully',
        project: {
          ...project,
          images: project.images || [],
          features: project.features || [],
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

    console.error('Create project error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
