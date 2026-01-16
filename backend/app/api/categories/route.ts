import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, addCorsHeaders } from '@/lib/utils'
import { z } from 'zod'

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Category name must be less than 100 characters'),
})

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// GET /api/categories - List all categories
export async function GET(request: NextRequest) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })

    const response = NextResponse.json(
      {
        categories,
      },
      { status: 200 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    console.error('Get categories error:', error)
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      },
      { status: 500 }
    ))
  }
}

// POST /api/categories - Create category (Admin only)
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if (adminCheck.error) return adminCheck.error

    const body = await request.json()
    
    // Validate and parse data
    let data
    try {
      data = categorySchema.parse(body)
    } catch (validationError: any) {
      console.error('Validation error:', validationError)
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Validation error', 
            details: validationError.errors.map(e => ({
              path: e.path,
              message: e.message
            }))
          },
          { status: 400 }
        )
      }
      throw validationError
    }

    // Check if category with same name already exists
    const existingCategory = await prisma.category.findUnique({
      where: { name: data.name.trim() },
    })

    if (existingCategory) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Category with this name already exists' },
        { status: 409 }
      ))
    }

    // Create category
    const category = await prisma.category.create({
      data: {
        name: data.name.trim(),
      },
    })

    const response = NextResponse.json(
      {
        message: 'Category created successfully',
        category,
      },
      { status: 201 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    console.error('Create category error:', error)
    
    if (error instanceof z.ZodError) {
      return addCorsHeaders(NextResponse.json(
        { 
          error: 'Validation error', 
          details: error.errors.map(e => ({
            path: e.path,
            message: e.message
          }))
        },
        { status: 400 }
      ))
    }

    // Prisma unique constraint error
    if (error.code === 'P2002') {
      return addCorsHeaders(NextResponse.json(
        { 
          error: 'Category with this name already exists',
          details: error.meta
        },
        { status: 409 }
      ))
    }

    // Generic error response
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while creating the category',
        ...(process.env.NODE_ENV === 'development' && { 
          code: error.code,
          stack: error.stack,
          meta: error.meta,
          type: error.constructor.name
        })
      },
      { status: 500 }
    ))
  }
}

