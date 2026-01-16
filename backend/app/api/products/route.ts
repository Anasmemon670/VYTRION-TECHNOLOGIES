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
  categoryId: z.string().optional().nullable(),
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

/**
 * Safely parse integer from string with validation and default
 */
function safeParseInt(value: string | null, defaultValue: number, min: number = 1, max: number = 1000): number {
  if (!value) return defaultValue
  
  const parsed = parseInt(value, 10)
  
  // Check if parsing resulted in NaN
  if (isNaN(parsed)) {
    console.warn(`[Products API] Invalid integer value: "${value}", using default: ${defaultValue}`)
    return defaultValue
  }
  
  // Enforce min/max bounds
  if (parsed < min) {
    console.warn(`[Products API] Value ${parsed} below minimum ${min}, using minimum`)
    return min
  }
  
  if (parsed > max) {
    console.warn(`[Products API] Value ${parsed} above maximum ${max}, using maximum`)
    return max
  }
  
  return parsed
}

/**
 * Safely parse boolean from string
 */
function safeParseBoolean(value: string | null, defaultValue: boolean = false): boolean {
  if (!value) return defaultValue
  
  const lowerValue = value.toLowerCase().trim()
  return lowerValue === 'true' || lowerValue === '1'
}

// GET /api/products - List products with filters
export async function GET(request: NextRequest) {
  try {
    console.log('[Products API] GET request received')
    
    // Parse query parameters safely
    const { searchParams } = new URL(request.url)
    
    // Safely parse page (min: 1, default: 1)
    const page = safeParseInt(searchParams.get('page'), 1, 1, 1000)
    
    // Safely parse limit (min: 1, max: 100, default: 10)
    const limit = safeParseInt(searchParams.get('limit'), 10, 1, 100)
    
    // Calculate skip safely
    const skip = Math.max(0, (page - 1) * limit)
    
    // Parse optional filters
    const category = searchParams.get('category')?.trim() || null
    const search = searchParams.get('search')?.trim() || null
    const featuredParam = searchParams.get('featured')
    
    // Safely parse featured boolean (default: false)
    const featured = safeParseBoolean(featuredParam, false)
    
    console.log('[Products API] Query params:', {
      page,
      limit,
      skip,
      category: category || 'none',
      search: search || 'none',
      featured,
    })
    
    // Build where clause safely
    const where: any = {}
    
    // Add category filter if provided
    if (category && category.length > 0) {
      where.category = category
    }
    
    // Add featured filter if requested
    if (featured) {
      where.featured = true
    }
    
    // Add search filter if provided
    if (search && search.length > 0) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }
    
    console.log('[Products API] Prisma where clause:', JSON.stringify(where, null, 2))
    
    // Execute database queries with error handling
    let products: any[] = []
    let total: number = 0
    
    try {
      [products, total] = await Promise.all([
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
      
      console.log(`[Products API] Found ${products.length} products (total: ${total})`)
    } catch (dbError: any) {
      console.error('[Products API] ❌ Database query error:', dbError)
      console.error('[Products API] Error details:', {
        code: dbError.code,
        message: dbError.message,
        meta: dbError.meta,
      })
      
      // Return empty results instead of crashing
      products = []
      total = 0
    }
    
    // Ensure products is always an array
    if (!Array.isArray(products)) {
      console.warn('[Products API] Products is not an array, converting to empty array')
      products = []
    }
    
    // Format products for response
    const formattedProducts = products.map((p) => ({
      ...p,
      price: p.price.toString(),
      images: p.images || [],
    }))
    
    // Calculate pagination safely (prevent division by zero)
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0
    
    const responseData = {
      success: true,
      products: formattedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    }
    
    console.log(`[Products API] ✅ Returning ${formattedProducts.length} products`)
    
    const response = NextResponse.json(responseData, { status: 200 })
    return addCorsHeaders(response)
  } catch (error: any) {
    // Comprehensive error logging
    console.error('[Products API] ❌ Fatal error in GET /api/products:')
    console.error('[Products API] Error type:', error?.constructor?.name || 'Unknown')
    console.error('[Products API] Error message:', error?.message || 'Unknown error')
    console.error('[Products API] Error stack:', error?.stack)
    console.error('[Products API] Error details:', {
      code: error?.code,
      meta: error?.meta,
      cause: error?.cause,
    })
    
    // Return safe error response with empty products array
    const errorResponse = NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while fetching products',
        products: [], // Always return products array
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      },
      { status: 500 }
    )
    
    return addCorsHeaders(errorResponse)
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

    // Generate slug if not provided
    let slug: string = data.slug || generateSlug(data.title)
    
    // Fallback if slug is empty or invalid
    if (!slug || slug.trim() === '') {
      slug = generateSlug(data.title) || `product-${Date.now()}`
    }

    // Check if slug already exists - if so, append number
    // (findUnique only works with @unique fields that Prisma client recognizes)
    let slugExists = await prisma.product.findFirst({ where: { slug } })
    let finalSlug = slug
    if (slugExists) {
      let counter = 1
      while (slugExists) {
        finalSlug = `${slug}-${counter}`
        slugExists = await prisma.product.findFirst({ where: { slug: finalSlug } })
        counter++
      }
    }

    // Validate all required fields before Prisma call
    if (!data.title || !data.hsCode || !data.price) {
      return NextResponse.json(
        { error: 'Missing required fields: title, hsCode, and price are required' },
        { status: 400 }
      )
    }

    // Prepare final data object for Prisma - ensure all fields are properly typed
    const productData = {
      title: data.title,
      description: data.description || null,
      price: data.price,
      discount: data.discount || null,
      hsCode: data.hsCode,
      category: data.category || null,
      categoryId: data.categoryId || null,
      stock: data.stock || 0,
      images: data.images || [],
      featured: data.featured || false,
      slug: finalSlug,
    }

    const product = await prisma.product.create({
      data: productData,
    })

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
    if (error instanceof z.ZodError) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      ))
    }

    console.error('Create product error:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    
    // Handle Prisma unique constraint error
    if (error.code === 'P2002') {
      return addCorsHeaders(NextResponse.json(
        { 
          error: 'Product with this slug or identifier already exists',
          details: error.meta?.target 
        },
        { status: 409 }
      ))
    }
    
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while creating the product'
      },
      { status: 500 }
    ))
  }
}
