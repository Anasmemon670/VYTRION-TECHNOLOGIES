import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, addCorsHeaders } from '@/lib/utils'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

const updateProjectSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  client: z.string().optional().nullable(),
  year: z.string().optional().nullable(),
  status: z.enum(['Completed', 'In Progress']).optional(),
  images: z.array(z.string()).optional().nullable(),
  features: z.array(z.string()).optional().nullable(),
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

// GET /api/projects/[id] - Get project by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const projectId = resolvedParams.id

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const response = NextResponse.json(
      {
        project: {
          ...project,
          images: project.images || [],
          features: project.features || [],
        },
      },
      { status: 200 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    console.error('Get project error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/projects/[id] - Update project (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const projectId = resolvedParams.id

    const adminCheck = await requireAdmin(request)
    if (adminCheck.error) return adminCheck.error

    const body = await request.json()
    const data = updateProjectSchema.parse(body)

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.client !== undefined && { client: data.client }),
        ...(data.year !== undefined && { year: data.year }),
        ...(data.status && { status: data.status }),
        ...(data.images !== undefined && { 
          images: data.images === null ? Prisma.JsonNull : data.images 
        }),
        ...(data.features !== undefined && { 
          features: data.features === null ? Prisma.JsonNull : data.features 
        }),
      },
    })

    const response = NextResponse.json(
      {
        message: 'Project updated successfully',
        project: {
          ...project,
          images: project.images || [],
          features: project.features || [],
        },
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
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    console.error('Update project error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id] - Delete project (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const projectId = resolvedParams.id

    const adminCheck = await requireAdmin(request)
    if (adminCheck.error) return adminCheck.error

    await prisma.project.delete({
      where: { id: projectId },
    })

    const response = NextResponse.json(
      { message: 'Project deleted successfully' },
      { status: 200 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    console.error('Delete project error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
