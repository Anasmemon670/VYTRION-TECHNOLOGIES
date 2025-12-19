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
      return NextResponse.json(
        { 
          error: 'Database schema mismatch. Please run: pnpm prisma migrate dev && pnpm prisma generate',
          details: error.message 
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred',
        ...(process.env.NODE_ENV === 'development' && { 
          code: error.code,
          meta: error.meta 
        })
      },
      { status: 500 }
    )
  }
}

// POST /api/orders - Create order
export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireAuth(request)
    if (authCheck.error) return authCheck.error

    const currentUser = authCheck.user!
    const body = await request.json()
    const data = createOrderSchema.parse(body)

    // Determine target user: admin can create orders for other users
    let targetUserId = currentUser.id
    if (data.userId && currentUser.isAdmin) {
      // Verify target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: data.userId },
      })
      if (!targetUser) {
        return NextResponse.json(
          { error: 'Target user not found' },
          { status: 404 }
        )
      }
      targetUserId = data.userId
    } else if (data.userId && !currentUser.isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can create orders for other users' },
        { status: 403 }
      )
    }

    // Validate products and check stock
    const productIds = data.items.map((item) => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    })

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: 'One or more products not found' },
        { status: 404 }
      )
    }

    // Check stock availability
    for (const item of data.items) {
      const product = products.find((p) => p.id === item.productId)
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 404 }
        )
      }
      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for product: ${product.title}` },
          { status: 400 }
        )
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
    const order = await prisma.$transaction(
      async (tx) => {
        // Create main order
        const orderNumber = generateOrderNumber()
        const order = await tx.order.create({
          data: {
            orderNumber,
            userId: targetUserId,
            totalAmount,
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
          include: {
            subOrders: {
              include: {
                items: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
        })

        // Update stock
        for (const item of data.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          })
        }

        return order
      },
      {
        maxWait: 10000, // Maximum time to wait for a transaction slot (10 seconds)
        timeout: 15000, // Maximum time the transaction can run (15 seconds)
      }
    )

    const response = NextResponse.json(
      {
        message: 'Order created successfully',
        order: {
          ...order,
          totalAmount: order.totalAmount.toString(),
        },
      },
      { status: 201 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error('Order validation error:', error.errors)
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Create order error:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: error.message || 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
