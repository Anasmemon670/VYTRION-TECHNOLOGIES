import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, addCorsHeaders } from '@/lib/utils'
import { stripe } from '@/lib/stripe'

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// POST /api/orders/[id]/update-status - Manually update order status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    console.log('[Order Status Update] Manual status update request received')
    
    const authCheck = await requireAuth(request)
    if (authCheck.error) return authCheck.error

    const user = authCheck.user!
    const resolvedParams = params instanceof Promise ? await params : params
    const orderId = resolvedParams.id

    console.log('[Order Status Update] Order ID:', orderId)
    console.log('[Order Status Update] User:', user.id, user.isAdmin ? '(admin)' : '(user)')

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        userId: true,
        stripePaymentIntentId: true,
      },
    })

    if (!order) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      ))
    }

    // Check access
    if (!user.isAdmin && order.userId !== user.id) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      ))
    }

    console.log('[Order Status Update] Current order status:', order.status)
    console.log('[Order Status Update] Stripe PaymentIntent ID:', order.stripePaymentIntentId || 'none')

    // If order is already processed, return success
    if (order.status !== 'PENDING') {
      return addCorsHeaders(NextResponse.json(
        {
          message: 'Order already processed',
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
          },
        },
        { status: 200 }
      ))
    }

    // Check if Stripe is configured and order has PaymentIntent
    if (!process.env.STRIPE_SECRET_KEY || !stripe) {
      return addCorsHeaders(NextResponse.json(
        {
          error: 'Payment service not configured',
          message: 'Stripe is not configured. Cannot check payment status.',
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
          },
        },
        { status: 503 }
      ))
    }

    if (!order.stripePaymentIntentId) {
      return addCorsHeaders(NextResponse.json(
        {
          error: 'No payment information',
          message: 'This order does not have a payment intent. Cannot check payment status.',
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
          },
        },
        { status: 400 }
      ))
    }

    // Check PaymentIntent status from Stripe
    try {
      console.log('[Order Status Update] Fetching PaymentIntent from Stripe:', order.stripePaymentIntentId)
      const paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId)
      
      console.log('[Order Status Update] PaymentIntent status:', paymentIntent.status)

      // If payment succeeded, update order status
      if (paymentIntent.status === 'succeeded') {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'PROCESSED' },
        })

        console.log('[Order Status Update] ✅ Order updated to PROCESSED')

        return addCorsHeaders(NextResponse.json(
          {
            message: 'Order status updated successfully',
            order: {
              id: order.id,
              orderNumber: order.orderNumber,
              status: 'PROCESSED',
              paymentStatus: 'succeeded',
            },
          },
          { status: 200 }
        ))
      } else {
        // Payment not succeeded yet
        return addCorsHeaders(NextResponse.json(
          {
            message: 'Payment not completed yet',
            order: {
              id: order.id,
              orderNumber: order.orderNumber,
              status: order.status,
              paymentStatus: paymentIntent.status,
            },
          },
          { status: 200 }
        ))
      }
    } catch (stripeError: any) {
      console.error('[Order Status Update] ❌ Error fetching PaymentIntent from Stripe:', stripeError)
      return addCorsHeaders(NextResponse.json(
        {
          error: 'Failed to check payment status',
          details: process.env.NODE_ENV === 'development' ? stripeError.message : 'Stripe API error',
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
          },
        },
        { status: 500 }
      ))
    }
  } catch (error: any) {
    console.error('[Order Status Update] ❌ Fatal error:', error)
    return addCorsHeaders(NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred',
      },
      { status: 500 }
    ))
  }
}
