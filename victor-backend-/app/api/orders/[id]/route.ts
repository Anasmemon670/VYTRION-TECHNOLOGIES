import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin, addCorsHeaders } from '@/lib/utils'
import { z } from 'zod'

const updateOrderSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSED', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
  trackingNumber: z.string().optional(),
  subOrderId: z.string().optional(), // For updating sub-order tracking
})

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// GET /api/orders/[id] - Get order by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const authCheck = await requireAuth(request)
    if (authCheck.error) return authCheck.error

    const user = authCheck.user!
    const resolvedParams = params instanceof Promise ? await params : params

    const order = await prisma.order.findUnique({
      where: { id: resolvedParams.id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
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
                    price: true,
                    images: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
        returnRequests: true,
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Users can only see their own orders unless admin
    if (!user.isAdmin && order.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const response = NextResponse.json(
      {
        order: {
          ...order,
          totalAmount: order.totalAmount.toString(),
          subOrders: order.subOrders.map((so) => ({
            ...so,
            items: so.items.map((item) => ({
              ...item,
              unitPrice: item.unitPrice.toString(),
              product: {
                ...item.product,
                price: item.product.price.toString(),
              },
            })),
          })),
        },
      },
      { status: 200 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    console.error('Get order error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/orders/[id] - Update order status (Admin or order owner for cancellation)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const authCheck = await requireAuth(request)
    if (authCheck.error) return authCheck.error

    const user = authCheck.user!
    const resolvedParams = params instanceof Promise ? await params : params
    const body = await request.json()
    const data = updateOrderSchema.parse(body)

    const order = await prisma.order.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Only admin can update status, or user can cancel their own pending order
    if (!user.isAdmin) {
      if (order.userId !== user.id) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
      if (data.status && data.status !== 'CANCELLED') {
        return NextResponse.json(
          { error: 'Only admins can update order status' },
          { status: 403 }
        )
      }
      if (order.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'Can only cancel pending orders' },
          { status: 400 }
        )
      }
    }

    // Update order or sub-order
    if (data.subOrderId && data.trackingNumber) {
      // Update sub-order tracking
      await prisma.subOrder.update({
        where: { id: data.subOrderId },
        data: {
          trackingNumber: data.trackingNumber,
        },
      })
    } else if (data.status) {
      // Use transaction for atomicity when cancelling order
      if (data.status === 'CANCELLED' && order.status === 'PENDING') {
        await prisma.$transaction(async (tx) => {
          // Get order items to restore stock
          const orderWithItems = await tx.order.findUnique({
            where: { id: resolvedParams.id },
            include: {
              subOrders: {
                include: {
                  items: true,
                },
              },
            },
          })

          if (orderWithItems && orderWithItems.subOrders) {
            // Restore stock for each item
            for (const subOrder of orderWithItems.subOrders) {
              if (subOrder.items && subOrder.items.length > 0) {
                for (const item of subOrder.items) {
                  try {
                    await tx.product.update({
                      where: { id: item.productId },
                      data: {
                        stock: {
                          increment: item.quantity,
                        },
                      },
                    })
                  } catch (productError: any) {
                    console.error(`Error restoring stock for product ${item.productId}:`, productError)
                    // Continue with other products even if one fails
                  }
                }
              }
            }
          }

          // Update order status
          await tx.order.update({
            where: { id: resolvedParams.id },
            data: { status: data.status },
          })
        })
      } else {
        // Update order status (non-cancellation)
        await prisma.order.update({
          where: { id: resolvedParams.id },
          data: { status: data.status },
        })
      }
    }

    const updatedOrder = await prisma.order.findUnique({
      where: { id: resolvedParams.id },
      include: {
        subOrders: true,
      },
    })

    const response = NextResponse.json(
      {
        message: 'Order updated successfully',
        order: {
          ...updatedOrder!,
          totalAmount: updatedOrder!.totalAmount.toString(),
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

    console.error('Update order error:', error)
    console.error('Error stack:', error?.stack)
    console.error('Error code:', error?.code)
    console.error('Error message:', error?.message)
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error?.message : 'Failed to update order',
        code: error?.code,
      },
      { status: 500 }
    )
  }
}
