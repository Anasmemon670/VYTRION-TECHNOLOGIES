import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, addCorsHeaders, generateSlug } from '@/lib/utils'
import { z } from 'zod'

const blogSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  excerpt: z.string().max(500).optional(),
  content: z.string().min(1),
  featuredImage: z.string().url().optional().nullable(),
  published: z.boolean().default(false),
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

// GET /api/blog - List blog posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit
    const published = searchParams.get('published')
    const search = searchParams.get('search')

    const where: any = {}
    
    // If published param is not provided or is true, only show published posts
    // Admin can see all by passing published=false
    if (published !== 'false') {
      where.published = true
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [posts, total] = await Promise.all([
      prisma.blog.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.blog.count({ where }),
    ])

    const response = NextResponse.json(
      {
        posts,
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
    console.error('Get blog posts error:', error)
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
      },
      { status: 500 }
    ))
  }
}

// POST /api/blog - Create blog post (Admin only)
export async function POST(request: NextRequest) {
  try {
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
    
    const data = blogSchema.parse(body)

    // Generate slug if not provided
    let slug = data.slug || generateSlug(data.title)
    
    // Ensure slug is unique
    let slugExists = await prisma.blog.findUnique({ where: { slug } })
    let counter = 1
    while (slugExists) {
      slug = `${generateSlug(data.title)}-${counter}`
      slugExists = await prisma.blog.findUnique({ where: { slug } })
      counter++
    }

    const post = await prisma.blog.create({
      data: {
        title: data.title,
        slug,
        excerpt: data.excerpt || null,
        content: data.content,
        featuredImage: data.featuredImage || null,
        published: data.published,
        authorId: adminCheck.user!.id,
      },
    })

    const response = NextResponse.json(
      {
        message: 'Blog post created successfully',
        post,
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

    if (error.code === 'P2002') {
      return addCorsHeaders(NextResponse.json(
        { error: 'Blog post with this slug already exists' },
        { status: 409 }
      ))
    }

    console.error('Create blog post error:', error)
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while creating the blog post'
      },
      { status: 500 }
    ))
  }
}
