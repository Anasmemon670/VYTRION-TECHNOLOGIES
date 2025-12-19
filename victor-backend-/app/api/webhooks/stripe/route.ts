import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyWebhookSignature, retrieveCheckoutSession } from '@/lib/stripe'
import Stripe from 'stripe'

// Stripe webhooks should not have CORS - Stripe does not send CORS headers
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200 })
}

// POST /api/webhooks/stripe - Handle Stripe webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = await verifyWebhookSignature(body, signature)
    } catch (error: any) {
      console.error('Webhook signature verification failed:', error)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Retrieve full session to get metadata
        const fullSession = await retrieveCheckoutSession(session.id)

        if (fullSession.payment_status === 'paid' && fullSession.metadata?.orderId) {
          const orderId = fullSession.metadata.orderId

          // Update order status
          await prisma.order.update({
            where: { id: orderId },
            data: {
              status: 'PROCESSED',
              stripePaymentIntentId: fullSession.payment_intent as string,
            },
          })

          console.log(`Order ${orderId} payment confirmed`)
        }
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        // Find order by payment intent ID
        const order = await prisma.order.findFirst({
          where: {
            stripePaymentIntentId: paymentIntent.id,
          },
        })

        if (order && order.status === 'PENDING') {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: 'PROCESSED',
            },
          })

          console.log(`Order ${order.id} payment confirmed via payment_intent`)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        // Find order by payment intent ID
        const order = await prisma.order.findFirst({
          where: {
            stripePaymentIntentId: paymentIntent.id,
          },
        })

        if (order) {
          // Optionally update order status or log failure
          console.log(`Payment failed for order ${order.id}`)
          // You might want to update order status or send notification
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    const response = NextResponse.json({ received: true }, { status: 200 })
    // No CORS headers for webhook endpoint
    return response
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed', details: error.message },
      { status: 500 }
    )
  }
}
