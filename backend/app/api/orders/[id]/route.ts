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
    console.log('[Order API] GET /api/orders/[id] - Request received')
    
    // Authenticate user
    const authCheck = await requireAuth(request)
    if (authCheck.error) {
      console.log('[Order API] ❌ Authentication failed')
      return authCheck.error
    }

    const user = authCheck.user!
    console.log('[Order API] User authenticated:', user.id, user.isAdmin ? '(admin)' : '(user)')
    
    // Resolve params (handle both Promise and direct params)
    let orderId: string
    try {
      const resolvedParams = params instanceof Promise ? await params : params
      orderId = resolvedParams.id
      console.log('[Order API] Order ID:', orderId)
    } catch (paramError: any) {
      console.error('[Order API] ❌ Error resolving params:', paramError)
      return addCorsHeaders(NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      ))
    }

    // Fetch order from database
    let order
    try {
      console.log('[Order API] Fetching order from database...')
      order = await prisma.order.findUnique({
        where: { id: orderId },
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
      console.log('[Order API] Order found:', order ? 'yes' : 'no')
    } catch (dbError: any) {
      console.error('[Order API] ❌ Database query error:', dbError)
      console.error('[Order API] Error details:', {
        code: dbError.code,
        message: dbError.message,
        meta: dbError.meta,
      })
      return addCorsHeaders(NextResponse.json(
        { 
          error: 'Database error', 
          details: process.env.NODE_ENV === 'development' ? dbError.message : 'Failed to fetch order'
        },
        { status: 500 }
      ))
    }

    if (!order) {
      console.log('[Order API] ❌ Order not found:', orderId)
      return addCorsHeaders(NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      ))
    }

    // Check access permissions
    if (!user.isAdmin && order.userId !== user.id) {
      console.log('[Order API] ❌ Access denied. Order userId:', order.userId, 'Request userId:', user.id)
      return addCorsHeaders(NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      ))
    }

    console.log('[Order API] ✅ Access granted. Processing order data...')

    // Safely format order data with null checks
    try {
      const formattedOrder = {
        ...order,
        totalAmount: order.totalAmount?.toString() || '0.00',
        subOrders: (order.subOrders || []).map((so) => ({
          ...so,
          items: (so.items || []).map((item) => {
            // Handle case where product might be null (deleted product)
            const product = item.product || {
              id: 'deleted',
              title: 'Product no longer available',
              price: '0.00',
              images: null,
              slug: '',
            }
            
            return {
              ...item,
              unitPrice: item.unitPrice?.toString() || '0.00',
              product: {
                ...product,
                price: product.price?.toString() || '0.00',
                images: product.images || null,
              },
            }
          }),
        })),
        returnRequests: order.returnRequests || [],
      }

      console.log('[Order API] ✅ Order formatted successfully')
      console.log('[Order API] Sub-orders count:', formattedOrder.subOrders.length)

      const response = NextResponse.json(
        {
          order: formattedOrder,
        },
        { status: 200 }
      )

      return addCorsHeaders(response)
    } catch (formatError: any) {
      console.error('[Order API] ❌ Error formatting order data:', formatError)
      console.error('[Order API] Format error stack:', formatError.stack)
      return addCorsHeaders(NextResponse.json(
        { 
          error: 'Error processing order data', 
          details: process.env.NODE_ENV === 'development' ? formatError.message : 'Failed to format order'
        },
        { status: 500 }
      ))
    }
  } catch (error: any) {
    console.error('[Order API] ❌ Fatal error in GET /api/orders/[id]:')
    console.error('[Order API] Error type:', error?.constructor?.name || 'Unknown')
    console.error('[Order API] Error message:', error?.message || 'Unknown error')
    console.error('[Order API] Error stack:', error?.stack)
    console.error('[Order API] Error details:', {
      code: error?.code,
      meta: error?.meta,
      cause: error?.cause,
    })
    
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
      },
      { status: 500 }
    ))
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
    
    const data = updateOrderSchema.parse(body)

    const order = await prisma.order.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!order) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      ))
    }

    // Only admin can update status, or user can cancel their own pending order
    if (!user.isAdmin) {
      if (order.userId !== user.id) {
        return addCorsHeaders(NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        ))
      }
      if (data.status && data.status !== 'CANCELLED') {
        return addCorsHeaders(NextResponse.json(
          { error: 'Only admins can update order status' },
          { status: 403 }
        ))
      }
      if (order.status !== 'PENDING') {
        return addCorsHeaders(NextResponse.json(
          { error: 'Can only cancel pending orders' },
          { status: 400 }
        ))
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
        await prisma.$transaction(
          async (tx) => {
            console.log('[Order API] Starting transaction to cancel order:', resolvedParams.id)
            
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
              // Collect all stock updates to do in parallel
              const stockUpdates: Array<{ productId: string; quantity: number }> = []
              
              for (const subOrder of orderWithItems.subOrders) {
                if (subOrder.items && subOrder.items.length > 0) {
                  for (const item of subOrder.items) {
                    stockUpdates.push({
                      productId: item.productId,
                      quantity: item.quantity,
                    })
                  }
                }
              }

              // Restore stock in PARALLEL (much faster than sequential)
              if (stockUpdates.length > 0) {
                console.log(`[Order API] Restoring stock for ${stockUpdates.length} items in parallel`)
                await Promise.all(
                  stockUpdates.map((update) =>
                    tx.product.update({
                      where: { id: update.productId },
                      data: {
                        stock: {
                          increment: update.quantity,
                        },
                      },
                    }).catch((productError: any) => {
                      console.error(`[Order API] Error restoring stock for product ${update.productId}:`, productError)
                      // Continue with other products even if one fails
                      return null
                    })
                  )
                )
              }
            }

            // Update order status
            await tx.order.update({
              where: { id: resolvedParams.id },
              data: { status: data.status },
            })
            
            console.log('[Order API] Order cancellation transaction completed')
          },
          {
            maxWait: 20000, // Maximum time to wait for a transaction slot (20 seconds)
            timeout: 30000, // Maximum time the transaction can run (30 seconds)
          }
        )
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
      return addCorsHeaders(NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      ))
    }

    console.error('Update order error:', error)
    console.error('Error stack:', error?.stack)
    console.error('Error code:', error?.code)
    console.error('Error message:', error?.message)
    
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error?.message : 'Failed to update order',
        code: error?.code,
      },
      { status: 500 }
    ))
  }
}
