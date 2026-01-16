import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin, addCorsHeaders, generateOrderNumber } from '@/lib/utils'
import { z } from 'zod'

const createOrderSchema = z.object({
  userId: z.string().optional(), // Admin can specify userId, otherwise uses authenticated user
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
    })
  ),
  shippingAddress: z.object({
    fullName: z.string(),
    address: z.string(),
    city: z.string(),
    zipCode: z.string(),
    country: z.string(),
    phone: z.string().optional(),
  }),
  billingAddress: z.object({
    fullName: z.string(),
    address: z.string(),
    city: z.string(),
    zipCode: z.string(),
    country: z.string(),
    phone: z.string().optional(),
  }),
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

// GET /api/orders - Get user orders or all orders (admin)
export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireAuth(request)
    if (authCheck.error) return authCheck.error

    const user = authCheck.user!
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Admin can see all orders, users see only their own
    const where = user.isAdmin ? {} : { userId: user.id }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          subOrders: {
            include: {
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      title: true,
                      images: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.order.count({ where }),
    ])

    const response = NextResponse.json(
      {
        orders: orders.map((order) => ({
          ...order,
          totalAmount: order.totalAmount.toString(),
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
    console.error('Get orders error:', error)
    console.error('Error code:', error.code)
    console.error('Error meta:', error.meta)
    console.error('Error stack:', error.stack)
    
    // Check for Prisma schema mismatch errors
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      return addCorsHeaders(NextResponse.json(
        { 
          error: 'Database schema mismatch. Please run: pnpm prisma migrate dev && pnpm prisma generate',
          details: error.message 
        },
        { status: 500 }
      ))
    }
    
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred',
        ...(process.env.NODE_ENV === 'development' && { 
          code: error.code,
          meta: error.meta 
        })
      },
      { status: 500 }
    ))
  }
}

// POST /api/orders - Create order
export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireAuth(request)
    if (authCheck.error) return authCheck.error

    const currentUser = authCheck.user!
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
    
    const data = createOrderSchema.parse(body)

    // Determine target user: admin can create orders for other users
    let targetUserId = currentUser.id
    if (data.userId && currentUser.isAdmin) {
      // Verify target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: data.userId },
      })
      if (!targetUser) {
        return addCorsHeaders(NextResponse.json(
          { error: 'Target user not found' },
          { status: 404 }
        ))
      }
      targetUserId = data.userId
    } else if (data.userId && !currentUser.isAdmin) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Only admins can create orders for other users' },
        { status: 403 }
      ))
    }

    // Validate products and check stock
    const productIds = data.items.map((item) => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    })

    if (products.length !== productIds.length) {
      return addCorsHeaders(NextResponse.json(
        { error: 'One or more products not found' },
        { status: 404 }
      ))
    }

    // Check stock availability
    for (const item of data.items) {
      const product = products.find((p) => p.id === item.productId)
      if (!product) {
        return addCorsHeaders(NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 404 }
        ))
      }
      if (product.stock < item.quantity) {
        return addCorsHeaders(NextResponse.json(
          { error: `Insufficient stock for product: ${product.title}` },
          { status: 400 }
        ))
      }
    }

    // Calculate totals
    const orderItems: any[] = []
    let totalAmount = 0

    for (const item of data.items) {
      const product = products.find((p) => p.id === item.productId)!
      const price = Number(product.price)
      const discount = product.discount || 0
      const unitPrice = price * (1 - discount / 100)

      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice,
        hsCode: product.hsCode,
      })

      totalAmount += unitPrice * item.quantity
    }

    // Create order with sub-orders in a transaction
    // Increased timeout and optimized stock updates to run in parallel
    const order = await prisma.$transaction(
      async (tx) => {
        console.log('[Order API] Starting transaction for order creation')
        const startTime = Date.now()
        
        // Create main order (without heavy includes to speed up)
        const orderNumber = generateOrderNumber()
        console.log('[Order API] Creating order:', orderNumber)
        
        const order = await tx.order.create({
          data: {
            orderNumber,
            userId: targetUserId,
            totalAmount,
            currency: 'USD',
            shippingAddress: data.shippingAddress,
            billingAddress: data.billingAddress,
            status: 'PENDING',
            subOrders: {
              create: [{
                status: 'PENDING',
                items: {
                  create: orderItems.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    hsCode: item.hsCode,
                  })),
                },
              }],
            },
          },
          // Remove heavy includes from transaction - fetch separately if needed
          include: {
            subOrders: {
              include: {
                items: true, // Only include items, not full product data
              },
            },
          },
        })

        const orderTime = Date.now() - startTime
        console.log(`[Order API] Order created in ${orderTime}ms`)

        // Update stock in PARALLEL instead of sequentially (much faster)
        console.log('[Order API] Updating stock for', data.items.length, 'products in parallel')
        const stockUpdateStart = Date.now()
        
        // Use Promise.all to update all products in parallel
        await Promise.all(
          data.items.map((item) =>
            tx.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  decrement: item.quantity,
                },
              },
            })
          )
        )

        const stockUpdateTime = Date.now() - stockUpdateStart
        console.log(`[Order API] Stock updated in ${stockUpdateTime}ms`)

        const totalTime = Date.now() - startTime
        console.log(`[Order API] Transaction completed in ${totalTime}ms`)

        // Fetch full order data after transaction completes (outside transaction)
        return order
      },
      {
        maxWait: 20000, // Maximum time to wait for a transaction slot (20 seconds)
        timeout: 30000, // Maximum time the transaction can run (30 seconds) - increased from 15s
      }
    )

    // Fetch full order with all relations AFTER transaction completes (faster)
    const fullOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        subOrders: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    title: true,
                    price: true,
                    images: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    // Use fullOrder if available, otherwise use order
    const orderToReturn = fullOrder || order

    const response = NextResponse.json(
      {
        message: 'Order created successfully',
        order: {
          ...orderToReturn,
          totalAmount: orderToReturn.totalAmount.toString(),
          subOrders: orderToReturn.subOrders?.map((so) => ({
            ...so,
            items: so.items?.map((item: any) => {
              const itemData: any = {
                ...item,
                unitPrice: item.unitPrice.toString(),
              }
              // Only include product if it exists (from fullOrder query)
              if (item.product) {
                itemData.product = {
                  ...item.product,
                  price: item.product.price.toString(),
                }
              }
              return itemData
            }),
          })),
        },
      },
      { status: 201 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error('Order validation error:', error.errors)
      if (typeof body !== 'undefined') {
        console.error('Received body:', JSON.stringify(body, null, 2))
      }
      
      // Create user-friendly error messages
      const errorMessages = error.errors.map((err) => {
        const path = err.path.join('.')
        return `${path}: ${err.message}`
      })
      
      return addCorsHeaders(NextResponse.json(
        { 
          error: 'Validation error', 
          message: errorMessages.join(', '),
          details: error.errors 
        },
        { status: 400 }
      ))
    }

    console.error('Create order error:', error)
    console.error('Error stack:', error.stack)
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while creating the order'
      },
      { status: 500 }
    ))
  }
}
