import { NextRequest, NextResponse } from 'next/server'

// GET /api/webhooks/stripe/test - Test if webhook endpoint is accessible
export async function GET(request: NextRequest) {
  const diagnostics = {
    message: 'Webhook endpoint is accessible',
    endpoint: '/api/webhooks/stripe',
    timestamp: new Date().toISOString(),
    configuration: {
      stripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
      webhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      backendUrl: process.env.NEXT_PUBLIC_APP_URL || 'Not set',
    },
    instructions: [
      '1. Make sure Stripe CLI is running: stripe listen --forward-to localhost:5000/api/webhooks/stripe',
      '2. Check that STRIPE_WEBHOOK_SECRET is set in .env',
      '3. Verify backend is running on port 5000',
      '4. Check backend console logs when payment is made',
      '5. Look for logs starting with: === [Webhook] Stripe webhook hit ===',
      '6. If no logs appear, check Stripe CLI terminal - it should show forwarded events',
    ],
  }
  
  return NextResponse.json(diagnostics, { status: 200 })
}
