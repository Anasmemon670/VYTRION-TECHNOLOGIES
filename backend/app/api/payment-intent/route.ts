import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, addCorsHeaders } from '@/lib/utils'
import { stripe } from '@/lib/stripe'
import { z } from 'zod'

const paymentIntentSchema = z.object({
  orderId: z.string(),
})

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

// POST /api/payment-intent - Create Stripe Payment Intent
export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireAuth(request)
    if (authCheck.error) return authCheck.error

    const user = authCheck.user!
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
    
    const data = paymentIntentSchema.parse(body)

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
    })

    if (!order) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      ))
    }

    // Verify order belongs to user
    if (order.userId !== user.id) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      ))
    }

    // Check if order is already paid
    if (order.status !== 'PENDING') {
      return addCorsHeaders(NextResponse.json(
        { error: 'Order already processed' },
        { status: 400 }
      ))
    }

    // Validate order amount
    const orderAmount = Number(order.totalAmount)
    if (!orderAmount || orderAmount <= 0 || isNaN(orderAmount)) {
      console.error('Invalid order amount:', order.totalAmount)
      return addCorsHeaders(NextResponse.json(
        { error: 'Invalid order amount' },
        { status: 400 }
      ))
    }

    // Validate currency
    const currency = (order.currency || 'USD').toLowerCase()
    if (!currency || currency.length !== 3) {
      console.error('Invalid currency:', order.currency)
      return addCorsHeaders(NextResponse.json(
        { error: 'Invalid currency' },
        { status: 400 }
      ))
    }

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY || !stripe) {
      const response = NextResponse.json(
        { 
          error: 'Payment service not configured', 
          details: 'Stripe payment gateway is not configured. Please set STRIPE_SECRET_KEY in environment variables.',
          code: 'STRIPE_NOT_CONFIGURED'
        },
        { status: 503 }
      )
      return addCorsHeaders(response)
    }

    // Convert to cents
    const amountInCents = Math.round(orderAmount * 100)
    if (amountInCents < 50) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Amount too small. Minimum amount is $0.50.' },
        { status: 400 }
      ))
    }

    // If order already has a PaymentIntent, cancel it and create a new one
    if (order.stripePaymentIntentId) {
      try {
        const existingPaymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId)
        
        // Cancel existing PaymentIntent if it's not already succeeded or canceled
        if (existingPaymentIntent.status !== 'succeeded' && existingPaymentIntent.status !== 'canceled') {
          try {
            await stripe.paymentIntents.cancel(existingPaymentIntent.id)
            console.log(`[PaymentIntent] Canceled existing payment intent ${existingPaymentIntent.id} before creating new one`)
          } catch (cancelError: any) {
            // Ignore cancel errors - PaymentIntent might already be in a final state
            console.log(`[PaymentIntent] Could not cancel payment intent ${existingPaymentIntent.id}: ${cancelError.message}`)
          }
        }
      } catch (error: any) {
        // If payment intent doesn't exist or is invalid, just clear reference
        console.log(`[PaymentIntent] Existing payment intent ${order.stripePaymentIntentId} not found or invalid, clearing reference`)
      }
      
      // Clear the old PaymentIntent reference
      await prisma.order.update({
        where: { id: order.id },
        data: { stripePaymentIntentId: null },
      })
    }

    // Create Payment Intent with idempotency key
    // Use orderId as idempotency key to prevent duplicates
    const idempotencyKey = `order-${order.id}`
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: user.id,
      },
    }, {
      idempotencyKey: idempotencyKey,
    })
    
    console.log(`[PaymentIntent] Created payment intent ${paymentIntent.id} for order ${order.id}`)
    console.log(`[PaymentIntent] Payment intent status: ${paymentIntent.status}`)

    // Update order with payment intent ID
    await prisma.order.update({
      where: { id: order.id },
      data: {
        stripePaymentIntentId: paymentIntent.id,
      },
    })

    const response = NextResponse.json(
      {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      },
      { status: 200 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error('Payment Intent validation error:', error.errors)
      return addCorsHeaders(NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      ))
    }

    console.error('Payment Intent error:', error)
    console.error('Error message:', error?.message)
    
    // Check if Stripe is not configured
    const errorMessage = error?.message || ''
    const isStripeNotConfigured = 
      errorMessage.includes('Stripe is not configured') ||
      errorMessage.includes('STRIPE_SECRET_KEY') ||
      errorMessage.toLowerCase().includes('stripe') && errorMessage.toLowerCase().includes('not configured') ||
      errorMessage.toLowerCase().includes('api key') && errorMessage.toLowerCase().includes('stripe')
    
    if (isStripeNotConfigured) {
      const response = NextResponse.json(
        { 
          error: 'Payment service not configured', 
          details: 'Stripe payment gateway is not configured. Please set STRIPE_SECRET_KEY in environment variables.',
          code: 'STRIPE_NOT_CONFIGURED'
        },
        { status: 503 }
      )
      return addCorsHeaders(response)
    }
    
    // Check for Stripe-specific errors
    if (error?.type === 'StripeInvalidRequestError' || error?.name === 'StripeInvalidRequestError') {
      const response = NextResponse.json(
        { 
          error: 'Payment processing error', 
          details: error?.message || 'Invalid request to payment provider',
          code: 'STRIPE_ERROR'
        },
        { status: 500 }
      )
      return addCorsHeaders(response)
    }

    const response = NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error?.message : 'An error occurred during payment setup',
        code: error?.code,
      },
      { status: 500 }
    )
    return addCorsHeaders(response)
  }
}
