import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin, addCorsHeaders, generateSlug } from '@/lib/utils'
import { z } from 'zod'

const productSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  price: z.number().positive('Price must be a positive number'),
  discount: z.number().int().min(0).max(100).optional().nullable(),
  hsCode: z.string().min(1, 'HS Code is required'),
  category: z.string().optional().nullable(),
  stock: z.number().int().min(0).default(0),
  images: z.array(z.string()).optional().nullable(),
  featured: z.boolean().default(false),
  slug: z.string().optional().nullable(),
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

// GET /api/products - List products with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const featuredParam = searchParams.get('featured')
    const featured = featuredParam === 'true'

    const where: any = {}
    if (category) where.category = category
    // Only add featured filter if the parameter is explicitly 'true'
    if (featuredParam === 'true') {
      where.featured = true
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.product.count({ where }),
    ])

    const response = NextResponse.json(
      {
        products: products.map((p) => ({
          ...p,
          price: p.price.toString(),
          images: p.images || [],
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
    console.error('Get products error:', error)
    console.error('Error stack:', error.stack)
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

// POST /api/products - Create product (Admin only)
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if (adminCheck.error) return adminCheck.error

    const body = await request.json()
    console.log('Received product data:', JSON.stringify(body, null, 2))
    
    // Validate and parse data
    let data
    try {
      data = productSchema.parse(body)
      console.log('Parsed product data:', JSON.stringify(data, null, 2))
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

    // Generate slug if not provided - ensure it's always a valid string
    let slug: string = data.slug || generateSlug(data.title)
    
    // Fallback if slug is empty or invalid
    if (!slug || slug.trim() === '') {
      slug = generateSlug(data.title) || `product-${Date.now()}`
    }
    
    // Ensure slug is always valid (no empty strings)
    slug = slug.trim() || `product-${Date.now()}`
    
    // Ensure slug is unique - use findFirst instead of findUnique for slug
    // (findUnique only works with @unique fields that Prisma client recognizes)
    let slugExists = await prisma.product.findFirst({ where: { slug } })
    let counter = 1
    while (slugExists) {
      const baseSlug = generateSlug(data.title) || `product-${Date.now()}`
      slug = `${baseSlug}-${counter}`
      slugExists = await prisma.product.findFirst({ where: { slug } })
      counter++
      // Safety check to prevent infinite loop
      if (counter > 1000) {
        slug = `${baseSlug}-${Date.now()}`
        break
      }
    }
    
    console.log('Generated slug:', slug)

    // Validate all required fields before Prisma call
    if (!data.title || data.title.trim() === '') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }
    if (!data.hsCode || data.hsCode.trim() === '') {
      return NextResponse.json(
        { error: 'HS Code is required' },
        { status: 400 }
      )
    }
    if (typeof data.price !== 'number' || data.price <= 0) {
      return NextResponse.json(
        { error: 'Price must be a positive number' },
        { status: 400 }
      )
    }

    // Prepare final data object for Prisma - ensure all fields are properly typed
    // Map form data to Prisma schema exactly as per form structure
    const prismaData: any = {
      title: String(data.title).trim(),
      description: data.description ? String(data.description).trim() : null,
      price: Number(data.price),
      discount: data.discount !== null && data.discount !== undefined ? Number(data.discount) : null,
      hsCode: String(data.hsCode).trim(),
      category: data.category ? String(data.category).trim() : null,
      stock: Number(data.stock) || 0,
      featured: Boolean(data.featured) || false,
      slug: slug, // Use the slug generated above
      images: data.images && Array.isArray(data.images) && data.images.length > 0 
        ? data.images.filter((img: any) => img && typeof img === 'string')
        : null,
    }
    
    // Final validation - ensure slug is never empty (should already be set above)
    if (!prismaData.slug || prismaData.slug.trim() === '') {
      prismaData.slug = `product-${Date.now()}`
    }
    
    // Log data without images for cleaner logs
    console.log('Creating product with data:', JSON.stringify({
      ...prismaData,
      images: prismaData.images ? `[${prismaData.images.length} images]` : null
    }, null, 2))
    console.log('Product data types:', {
      title: typeof prismaData.title,
      price: typeof prismaData.price,
      slug: typeof prismaData.slug,
      hsCode: typeof prismaData.hsCode,
      stock: typeof prismaData.stock,
      featured: typeof prismaData.featured,
    })
    console.log('Slug value:', prismaData.slug, 'Type:', typeof prismaData.slug, 'Length:', prismaData.slug.length)
    
    // Create product
    const product = await prisma.product.create({
      data: prismaData,
    })
    
    console.log('Product created successfully:', product.id)

    const response = NextResponse.json(
      {
        message: 'Product created successfully',
        product: {
          ...product,
          price: product.price.toString(),
          images: product.images || [],
        },
      },
      { status: 201 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    // Log the full error for debugging
    console.error('=== CREATE PRODUCT ERROR ===')
    console.error('Error type:', error.constructor.name)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    if (error.meta) {
      console.error('Error meta:', JSON.stringify(error.meta, null, 2))
    }
    if (error.cause) {
      console.error('Error cause:', error.cause)
    }
    console.error('==========================')
    
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
      const field = error.meta?.target?.[0] || 'field'
      return addCorsHeaders(NextResponse.json(
        { 
          error: `Product with this ${field} already exists`,
          details: error.meta
        },
        { status: 409 }
      ))
    }

    // Prisma foreign key constraint error
    if (error.code === 'P2003') {
      return addCorsHeaders(NextResponse.json(
        { 
          error: 'Invalid foreign key reference',
          details: error.meta
        },
        { status: 400 }
      ))
    }

    // Prisma validation error
    if (error.code === 'P2009' || error.message?.includes('Invalid')) {
      return addCorsHeaders(NextResponse.json(
        { 
          error: 'Invalid data format',
          details: process.env.NODE_ENV === 'development' ? error.message : 'Please check your input data',
          ...(process.env.NODE_ENV === 'development' && { 
            code: error.code,
            meta: error.meta
          })
        },
        { status: 400 }
      ))
    }

    // Generic error response
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while creating the product',
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
