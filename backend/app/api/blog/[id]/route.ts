import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, requireAuth, addCorsHeaders, generateSlug } from '@/lib/utils'
import { z } from 'zod'

const updateBlogSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().optional(),
  excerpt: z.string().max(500).optional().nullable(),
  content: z.string().min(1).optional(),
  featuredImage: z.string().url().optional().nullable(),
  published: z.boolean().optional(),
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

// GET /api/blog/[id] - Get blog post by ID or slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const postId = resolvedParams.id

    const post = await prisma.blog.findFirst({
      where: {
        OR: [
          { id: postId },
          { slug: postId },
        ],
      },
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      )
    }

    // Only show published posts to non-admins
    if (!post.published) {
      const authCheck = await requireAuth(request)
      if (authCheck.error) {
        return NextResponse.json(
          { error: 'Blog post not found' },
          { status: 404 }
        )
      }
      // Verify user is admin
      if (!authCheck.user?.isAdmin) {
        return NextResponse.json(
          { error: 'Blog post not found' },
          { status: 404 }
        )
      }
    }

    const response = NextResponse.json(
      {
        post,
      },
      { status: 200 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    console.error('Get blog post error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/blog/[id] - Update blog post (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const postId = resolvedParams.id

    const adminCheck = await requireAdmin(request)
    if (adminCheck.error) return adminCheck.error

    const post = await prisma.blog.findUnique({
      where: { id: postId },
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    // Preprocess: convert empty strings to null for nullable fields
    if (body.featuredImage === '') {
      body.featuredImage = null
    }
    if (body.excerpt === '') {
      body.excerpt = null
    }
    const data = updateBlogSchema.parse(body)

    // Handle slug generation if title is updated
    let updateData: any = { ...data }
    if (data.title && !data.slug) {
      let slug = generateSlug(data.title)
      let slugExists = await prisma.blog.findFirst({
        where: { slug, id: { not: postId } },
      })
      let counter = 1
      while (slugExists) {
        slug = `${generateSlug(data.title)}-${counter}`
        slugExists = await prisma.blog.findFirst({
          where: { slug, id: { not: postId } },
        })
        counter++
      }
      updateData.slug = slug
    }

    const updatedPost = await prisma.blog.update({
      where: { id: postId },
      data: updateData,
    })

    const response = NextResponse.json(
      {
        message: 'Blog post updated successfully',
        post: updatedPost,
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

    console.error('Update blog post error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/blog/[id] - Delete blog post (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const postId = resolvedParams.id

    const adminCheck = await requireAdmin(request)
    if (adminCheck.error) return adminCheck.error

    const post = await prisma.blog.findUnique({
      where: { id: postId },
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      )
    }

    await prisma.blog.delete({
      where: { id: postId },
    })

    const response = NextResponse.json(
      {
        message: 'Blog post deleted successfully',
      },
      { status: 200 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    console.error('Delete blog post error:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
