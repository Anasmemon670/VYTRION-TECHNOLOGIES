import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin, addCorsHeaders, generateSlug } from '@/lib/utils'
import { z } from 'zod'

const updateProductSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  discount: z.number().int().min(0).max(100).optional(),
  hsCode: z.string().min(1).optional(),
  category: z.string().optional(),
  stock: z.number().int().min(0).optional(),
  images: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
  slug: z.string().optional(),
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

// GET /api/products/[id] - Get product by ID or slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const productId = resolvedParams.id

    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: productId },
          { slug: productId },
        ],
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const response = NextResponse.json(
      {
        product: {
          ...product,
          price: product.price.toString(),
          images: product.images || [],
        },
      },
      { status: 200 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    console.error('Get product error:', error)
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
      },
      { status: 500 }
    ))
  }
}

// PUT /api/products/[id] - Update product (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const productId = resolvedParams.id

    const adminCheck = await requireAdmin(request)
    if (adminCheck.error) return adminCheck.error

    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
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
    
    const data = updateProductSchema.parse(body)

    // Handle slug generation if title is updated
    let updateData: any = { ...data }
    if (data.title && !data.slug) {
      let slug = generateSlug(data.title)
      let slugExists = await prisma.product.findFirst({
        where: { slug, id: { not: productId } },
      })
      let counter = 1
      while (slugExists) {
        slug = `${generateSlug(data.title)}-${counter}`
        slugExists = await prisma.product.findFirst({
          where: { slug, id: { not: productId } },
        })
        counter++
      }
      updateData.slug = slug
    }

    if (updateData.images !== undefined) {
      updateData.images = updateData.images || null
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    })

    const response = NextResponse.json(
      {
        message: 'Product updated successfully',
        product: {
          ...updatedProduct,
          price: updatedProduct.price.toString(),
          images: updatedProduct.images || [],
        },
      },
      { status: 200 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      ))
    }

    console.error('Update product error:', error)
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
      },
      { status: 500 }
    ))
  }
}

// DELETE /api/products/[id] - Delete product (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle params - can be Promise in Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params
    
    // Validate params
    if (!resolvedParams || !resolvedParams.id) {
      console.error('Delete product: Missing params or id', { params: resolvedParams })
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    const productId = resolvedParams.id
    console.log('Delete product: Attempting to delete', { productId })

    const adminCheck = await requireAdmin(request)
    if (adminCheck.error) return adminCheck.error

    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      ))
    }

    await prisma.product.delete({
      where: { id: productId },
    })

    const response = NextResponse.json(
      {
        message: 'Product deleted successfully',
      },
      { status: 200 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    console.error('Delete product error:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    // Handle foreign key constraint error
    if (error.code === 'P2003') {
      return addCorsHeaders(NextResponse.json(
        { error: 'Cannot delete product. It is associated with existing orders. Please remove all order items first.' },
        { status: 400 }
      ))
    }
    
    // Handle record not found
    if (error.code === 'P2025') {
      return addCorsHeaders(NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      ))
    }
    
    // Return detailed error in development, generic in production
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while deleting the product',
        ...(process.env.NODE_ENV === 'development' && { 
          code: error.code,
          stack: error.stack 
        })
      },
      { status: 500 }
    ))
  }
}
