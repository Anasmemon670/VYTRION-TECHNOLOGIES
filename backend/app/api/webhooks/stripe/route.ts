import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyWebhookSignature } from '@/lib/stripe'
import Stripe from 'stripe'

// Route segment config: Disable body parsing to get raw body for webhook signature verification
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Stripe webhooks should not have CORS - Stripe does not send CORS headers
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200 })
}

/**
 * Helper function to find order by PaymentIntent ID or orderId from metadata
 */
async function findOrderByStripeEvent(
  orderId?: string,
  paymentIntentId?: string
): Promise<{ id: string; status: string; orderNumber: string; stripePaymentIntentId: string | null } | null> {
  // Try by paymentIntentId first (most direct for PaymentIntents)
  if (paymentIntentId) {
    const order = await prisma.order.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
      select: { id: true, status: true, orderNumber: true, stripePaymentIntentId: true },
    })
    if (order) {
      console.log(`[Webhook] Found order ${order.id} by stripePaymentIntentId: ${paymentIntentId}`)
      return order
    }
  }

  // Try by orderId from metadata
  if (orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, orderNumber: true, stripePaymentIntentId: true },
    })
    if (order) {
      console.log(`[Webhook] Found order ${order.id} by orderId: ${orderId}`)
      return order
    }
  }

  return null
}

/**
 * Helper function to update order status to PROCESSED (idempotent)
 */
async function updateOrderToProcessed(
  orderId: string,
  paymentIntentId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Get current order state
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, orderNumber: true, stripePaymentIntentId: true },
    })

    if (!order) {
      return { success: false, message: `Order ${orderId} not found` }
    }

    // Idempotency check: Only update if status is PENDING
    if (order.status !== 'PENDING') {
      console.log(
        `[Webhook] Order ${order.id} (${order.orderNumber}) already processed. Current status: ${order.status}`
      )
      return {
        success: true,
        message: `Order already processed with status: ${order.status}`,
      }
    }

    // Prepare update data - ALWAYS update status to PROCESSED
    const updateData: {
      status: 'PROCESSED'
      stripePaymentIntentId?: string
    } = {
      status: 'PROCESSED',
    }

    // Always set paymentIntentId if provided (ensures correct link)
    // This handles cases where webhook arrives before payment-intent endpoint updates the order
    if (paymentIntentId) {
      updateData.stripePaymentIntentId = paymentIntentId
    }

    // Perform the update - this will ALWAYS update status to PROCESSED if order is PENDING
    console.log(`[Webhook] Updating order ${orderId} with data:`, JSON.stringify(updateData))
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
    })
    
    // Verify the update actually happened
    if (updatedOrder.status !== 'PROCESSED') {
      console.error(`[Webhook] ❌ CRITICAL: Order status update failed! Expected PROCESSED, got: ${updatedOrder.status}`)
      return { success: false, message: `Order status update failed. Status is: ${updatedOrder.status}` }
    }

    console.log(
      `[Webhook] ✅ Successfully updated order ${order.id} (${order.orderNumber}) from PENDING to PROCESSED`
    )
    if (paymentIntentId) console.log(`[Webhook]   - Payment Intent ID: ${paymentIntentId}`)

    return { success: true, message: `Order ${order.orderNumber} updated to PROCESSED` }
  } catch (error: any) {
    console.error(`[Webhook] ❌ Error updating order ${orderId}:`, error)
    return { success: false, message: error.message || 'Unknown error' }
  }
}

/**
 * POST /api/webhooks/stripe - Handle Stripe webhook events
 * 
 * This endpoint handles Stripe PaymentIntent events for Stripe Elements integration.
 * 
 * STRIPE CLI SETUP:
 * For local development, run:
 *   stripe listen --forward-to localhost:5000/api/webhooks/stripe
 * 
 * Make sure STRIPE_WEBHOOK_SECRET is set in your .env file (get it from Stripe CLI output).
 * 
 * EVENTS HANDLED:
 * - payment_intent.succeeded: Updates order status from PENDING to PROCESSED
 * - payment_intent.payment_failed: Logs failure, keeps order as PENDING for retry
 * 
 * IMPORTANT:
 * - This endpoint uses raw body (arrayBuffer) for signature verification
 * - Webhook signature is verified using STRIPE_WEBHOOK_SECRET
 * - Order status updates are idempotent (safe to retry)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let eventType = 'unknown'
  let eventId = 'unknown'

  try {
    // CRITICAL: Log immediately when webhook is received
    console.log('\n=== [Webhook] Stripe webhook hit ===')
    console.log(`[Webhook] Timestamp: ${new Date().toISOString()}`)
    console.log(`[Webhook] Endpoint: /api/webhooks/stripe`)
    console.log(`[Webhook] Method: POST`)
    console.log(`[Webhook] URL: ${request.url}`)
    console.log(`[Webhook] Environment:`, {
      hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    })
    console.log(`[Webhook] Headers:`, {
      'content-type': request.headers.get('content-type'),
      'stripe-signature': request.headers.get('stripe-signature') ? 'present' : 'missing',
      'user-agent': request.headers.get('user-agent')?.substring(0, 50) || 'none',
    })

    // Read raw body as ArrayBuffer (required for Stripe signature verification)
    const arrayBuffer = await request.arrayBuffer()
    const body = Buffer.from(arrayBuffer)
    console.log(`[Webhook] Body size: ${body.length} bytes`)
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('[Webhook] ❌ Missing stripe-signature header')
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = await verifyWebhookSignature(body, signature)
      eventType = event.type
      eventId = event.id
      console.log(`[Webhook] ✅ Signature verified successfully`)
      console.log(`[Webhook] Event type: ${eventType}`)
      console.log(`[Webhook] Event ID: ${eventId}`)
    } catch (error: any) {
      console.error('[Webhook] ❌ Webhook signature verification failed:', error.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Handle different event types
    // NOTE: We only handle PaymentIntent events (Stripe Elements), NOT Checkout sessions
    switch (event.type) {
      case 'payment_intent.succeeded': {
        console.log(`[Webhook] 🔵 Handling payment_intent.succeeded event`)
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        try {
          console.log(`[Webhook] Payment Intent ID: ${paymentIntent.id}`)
          console.log(`[Webhook]   - Amount: ${paymentIntent.amount} ${paymentIntent.currency}`)
          console.log(`[Webhook]   - Status: ${paymentIntent.status}`)
          console.log(`[Webhook]   - Metadata:`, JSON.stringify(paymentIntent.metadata || {}, null, 2))

          // Extract orderId from metadata
          const orderId = paymentIntent.metadata?.orderId || null

          if (!orderId) {
            const errorMsg = `No orderId found in payment_intent ${paymentIntent.id} metadata. Cannot process order update.`
            console.error(`[Webhook] ❌ ${errorMsg}`)
            console.error(`[Webhook] Available metadata keys:`, Object.keys(paymentIntent.metadata || {}))
            // Don't break - return error so Stripe knows to retry
            throw new Error(errorMsg)
          }

          console.log(`[Webhook] Looking up order with orderId: ${orderId}`)

          // Find order by paymentIntentId first (most direct), then by orderId
          let order = await findOrderByStripeEvent(
            orderId,
            paymentIntent.id
          )

          // If not found, try direct lookup by orderId (this handles race conditions)
          if (!order) {
            console.log(`[Webhook] Order not found by stripePaymentIntentId, trying direct orderId lookup: ${orderId}`)
            order = await prisma.order.findUnique({
              where: { id: orderId },
              select: { id: true, status: true, orderNumber: true, stripePaymentIntentId: true },
            })
            if (order) {
              console.log(`[Webhook] ✅ Found order ${order.id} (${order.orderNumber}) by direct orderId lookup`)
              console.log(`[Webhook]   - Current status: ${order.status}`)
              console.log(`[Webhook]   - Current stripePaymentIntentId: ${order.stripePaymentIntentId || 'null'}`)
            }
          }

          if (!order) {
            const errorMsg = `Order not found for payment_intent ${paymentIntent.id}. Tried orderId: ${orderId}, paymentIntentId: ${paymentIntent.id}`
            console.error(`[Webhook] ❌ ${errorMsg}`)
            // Don't break - return error so Stripe knows to retry (order might be created later)
            throw new Error(errorMsg)
          }

          console.log(`[Webhook] Found order ${order.id} (${order.orderNumber}) with current status: ${order.status}`)
          console.log(`[Webhook] Updating order status from PENDING to PROCESSED...`)

          // Update order status from PENDING to PROCESSED
          console.log(`[Webhook] Calling updateOrderToProcessed for order ${order.id}...`)
          console.log(`[Webhook] Current order status before update: ${order.status}`)
          
          const result = await updateOrderToProcessed(order.id, paymentIntent.id)

          if (!result.success) {
            const errorMsg = `Failed to update order ${order.orderNumber}: ${result.message}`
            console.error(`[Webhook] ❌ ${errorMsg}`)
            console.error(`[Webhook] Order ${order.orderNumber} remains in status: ${order.status}`)
            
            // Verify order status after failed update
            const verifyOrder = await prisma.order.findUnique({
              where: { id: order.id },
              select: { status: true },
            })
            console.error(`[Webhook] Verified order status after failed update: ${verifyOrder?.status}`)
            // Throw error so Stripe retries
            throw new Error(errorMsg)
          } else {
            console.log(`[Webhook] ✅ Order updated successfully: ${result.message}`)
            console.log(`[Webhook] ✅ Order ${order.orderNumber} status changed: PENDING → PROCESSED`)
            
            // Verify order status was actually updated in database
            const verifyOrder = await prisma.order.findUnique({
              where: { id: order.id },
              select: { status: true },
            })
            console.log(`[Webhook] ✅ Verified order status in database: ${verifyOrder?.status}`)
            console.log(`[Webhook] ✅ Database order status update confirmed`)
          }
        } catch (error: any) {
          console.error(`[Webhook] ❌ Error processing payment_intent.succeeded:`, error)
          console.error(`[Webhook]   Error name: ${error.name}`)
          console.error(`[Webhook]   Error message: ${error.message}`)
          console.error(`[Webhook]   Error stack:`, error.stack)
          // Re-throw to return 500 so Stripe retries
          throw error
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        try {
          console.log(`[Webhook] ⚠️ Payment failed for payment_intent ${paymentIntent.id}`)
          console.log(`[Webhook]   - Status: ${paymentIntent.status}`)
          console.log(`[Webhook]   - Metadata:`, JSON.stringify(paymentIntent.metadata || {}, null, 2))

          const orderId = paymentIntent.metadata?.orderId || null
          const order = await findOrderByStripeEvent(
            orderId || undefined,
            paymentIntent.id
          )

          if (order) {
            console.log(
              `[Webhook] Payment failed for order ${order.id} (${order.orderNumber}). Keeping status as PENDING for retry.`
            )
            // Keep order as PENDING so user can retry payment
            // Optionally send notification to user
          } else {
            console.log(`[Webhook] No order found for failed payment_intent ${paymentIntent.id}`)
          }
        } catch (error: any) {
          console.error(`[Webhook] ❌ Error processing payment_intent.payment_failed:`, error)
          console.error(`[Webhook]   Error stack:`, error.stack)
        }
        break
      }

      default:
        console.log(`[Webhook] ℹ️ Unhandled event type: ${event.type}`)
    }

    const processingTime = Date.now() - startTime
    console.log(`[Webhook] ✅ Webhook processed successfully in ${processingTime}ms`)
    console.log(`=== [Webhook] End ===\n`)

    const response = NextResponse.json({ received: true }, { status: 200 })
    // No CORS headers for webhook endpoint
    return response
  } catch (error: any) {
    const processingTime = Date.now() - startTime
    console.error(`[Webhook] ❌ Webhook handler failed after ${processingTime}ms`)
    console.error(`[Webhook] Event type: ${eventType}, Event ID: ${eventId}`)
    console.error(`[Webhook] Error:`, error)
    console.error(`[Webhook] Error stack:`, error.stack)
    console.log(`=== [Webhook] End (ERROR) ===\n`)

    return NextResponse.json(
      { error: 'Webhook handler failed', details: error.message },
      { status: 500 }
    )
  }
}
