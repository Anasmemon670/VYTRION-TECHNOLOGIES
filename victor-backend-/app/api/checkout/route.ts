import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, addCorsHeaders } from '@/lib/utils'
import { createCheckoutSession } from '@/lib/stripe'
import { z } from 'zod'

const checkoutSchema = z.object({
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

// POST /api/checkout - Create Stripe checkout session
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
    
    const data = checkoutSchema.parse(body)

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
    if (order.status !== 'PENDING' || order.stripeSessionId) {
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

    // Get app URL from environment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Validate currency
    const currency = (order.currency || 'USD').toLowerCase()
    if (!currency || currency.length !== 3) {
      console.error('Invalid currency:', order.currency)
      return addCorsHeaders(NextResponse.json(
        { error: 'Invalid currency' },
        { status: 400 }
      ))
    }

    // Check if Stripe is configured before attempting to create session
    if (!process.env.STRIPE_SECRET_KEY) {
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

    // Create Stripe checkout session
    const session = await createCheckoutSession({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: orderAmount,
      currency: currency,
      successUrl: `${appUrl}/orders/${order.id}?success=true`,
      cancelUrl: `${appUrl}/checkout?canceled=true`,
      metadata: {
        userId: user.id,
      },
    })

    // Update order with session ID
    await prisma.order.update({
      where: { id: order.id },
      data: {
        stripeSessionId: session.id,
      },
    })

    const response = NextResponse.json(
      {
        sessionId: session.id,
        url: session.url,
      },
      { status: 200 }
    )

    return addCorsHeaders(response)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error('Checkout validation error:', error.errors)
      return addCorsHeaders(NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      ))
    }

    console.error('Checkout error:', error)
    console.error('Error message:', error?.message)
    
    // Check if Stripe is not configured - check multiple ways
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
        details: process.env.NODE_ENV === 'development' ? error?.message : 'An error occurred during checkout',
        code: error?.code,
      },
      { status: 500 }
    )
    return addCorsHeaders(response)
  }
}
