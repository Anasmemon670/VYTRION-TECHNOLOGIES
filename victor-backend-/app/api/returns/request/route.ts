import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin, addCorsHeaders } from '@/lib/utils'
import { z } from 'zod'

const createReturnSchema = z.object({
  orderId: z.string(),
  reason: z.string().min(1),
  images: z.array(z.string()).optional(),
})

const updateReturnSchema = z.object({
  returnId: z.string(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
})

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// GET /api/returns/request - Get return requests (user's own or all for admin)
export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireAuth(request)
    if (authCheck.error) return authCheck.error

    const user = authCheck.user!
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit
    const status = searchParams.get('status')

    // Admin can see all returns, users see only their own
    const where: any = user.isAdmin ? {} : {}
    
    if (!user.isAdmin) {
      // Get user's order IDs
      const userOrders = await prisma.order.findMany({
        where: { userId: user.id },
        select: { id: true },
      })
      where.orderId = { in: userOrders.map((o) => o.id) }
    }

    if (status) {
      where.status = status
    }

    const [returns, total] = await Promise.all([
      prisma.returnRequest.findMany({
        where,
        skip,
        take: limit,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.returnRequest.count({ where }),
    ])

    const response = NextResponse.json(
      {
        returns: returns.map((r) => ({
          ...r,
          images: r.images || [],
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
    console.error('Get returns error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/returns/request - Create return request
export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireAuth(request)
    if (authCheck.error) return authCheck.error

    const user = authCheck.user!
    const body = await request.json()
    const data = createReturnSchema.parse(body)

    // Verify order exists and belongs to user
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    if (order.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if return already exists for this order
    const existingReturn = await prisma.returnRequest.findFirst({
      where: { orderId: data.orderId },
    })

    if (existingReturn) {
      return NextResponse.json(
        { error: 'Return request already exists for this order' },
        { status: 400 }
      )
    }

    // Create return request
    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId: data.orderId,
        reason: data.reason,
        images: data.images || null,
        status: 'PENDING',
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
          },
        },
      },
    })

    const response = NextResponse.json(
      {
        message: 'Return request created successfully',
        returnRequest: {
          ...returnRequest,
          images: returnRequest.images || [],
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

    console.error('Create return error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/returns/request - Update return status (Admin only)
export async function PUT(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if (adminCheck.error) return adminCheck.error

    const body = await request.json()
    const { returnId, ...data } = updateReturnSchema.parse(body)

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: returnId },
    })

    if (!returnRequest) {
      return NextResponse.json(
        { error: 'Return request not found' },
        { status: 404 }
      )
    }

    const updatedReturn = await prisma.returnRequest.update({
      where: { id: returnId },
      data: { status: data.status },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
          },
        },
      },
    })

    const response = NextResponse.json(
      {
        message: 'Return request updated successfully',
        returnRequest: {
          ...updatedReturn,
          images: updatedReturn.images || [],
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

    console.error('Update return error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
