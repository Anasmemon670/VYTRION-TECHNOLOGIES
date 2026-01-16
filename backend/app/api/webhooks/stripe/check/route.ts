import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, addCorsHeaders } from '@/lib/utils'
import { stripe } from '@/lib/stripe'

// GET /api/webhooks/stripe/check - Diagnostic endpoint to check webhook configuration
export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireAuth(request)
    if (authCheck.error) return authCheck.error

    const user = authCheck.user!
    
    // Only allow admins for security
    if (!user.isAdmin) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Access denied. Admin only.' },
        { status: 403 }
      ))
    }

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      stripe: {
        secretKeyConfigured: !!process.env.STRIPE_SECRET_KEY,
        webhookSecretConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
        stripeInitialized: !!stripe,
      },
      webhook: {
        endpoint: '/api/webhooks/stripe',
        expectedUrl: process.env.NEXT_PUBLIC_APP_URL 
          ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/stripe`
          : 'Not set (check NEXT_PUBLIC_APP_URL)',
      },
      recentOrders: [],
    }

    // Get recent PENDING orders with PaymentIntent
    const recentPendingOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        stripePaymentIntentId: { not: null },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        stripePaymentIntentId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    diagnostics.recentOrders = recentPendingOrders.map(order => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentIntentId: order.stripePaymentIntentId,
      createdAt: order.createdAt,
      // Check PaymentIntent status from Stripe if configured
      paymentIntentStatus: null as string | null,
    }))

    // If Stripe is configured, check PaymentIntent status for each order
    if (stripe && process.env.STRIPE_SECRET_KEY) {
      for (const order of diagnostics.recentOrders) {
        if (order.paymentIntentId) {
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(order.paymentIntentId as string)
            order.paymentIntentStatus = paymentIntent.status
            order.paymentIntentMetadata = paymentIntent.metadata
          } catch (err: any) {
            order.paymentIntentStatus = `Error: ${err.message}`
          }
        }
      }
    }

    return addCorsHeaders(NextResponse.json(diagnostics, { status: 200 }))
  } catch (error: any) {
    console.error('[Webhook Check] Error:', error)
    return addCorsHeaders(NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred',
      },
      { status: 500 }
    ))
  }
}
