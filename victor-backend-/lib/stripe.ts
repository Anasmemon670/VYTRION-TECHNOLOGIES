import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('⚠️ STRIPE_SECRET_KEY is not set in environment variables')
  // Don't throw immediately - let it fail when Stripe is actually used
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
      typescript: true,
    })
  : null as any // Will throw error when used if not configured

export interface CreateCheckoutSessionParams {
  orderId: string
  orderNumber: string
  amount: number
  currency?: string
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
}

export async function createCheckoutSession(params: CreateCheckoutSessionParams) {
  if (!process.env.STRIPE_SECRET_KEY || !stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.')
  }

  const {
    orderId,
    orderNumber,
    amount,
    currency = 'usd',
    successUrl,
    cancelUrl,
    metadata = {},
  } = params

  // Validate amount
  if (!amount || amount <= 0 || isNaN(amount)) {
    throw new Error(`Invalid amount: ${amount}. Amount must be a positive number.`)
  }

  // Validate currency
  const validCurrency = currency.toLowerCase()
  if (!validCurrency || validCurrency.length !== 3) {
    throw new Error(`Invalid currency: ${currency}. Currency must be a 3-letter code (e.g., 'usd').`)
  }

  // Convert to cents and validate
  const unitAmount = Math.round(amount * 100)
  if (unitAmount < 50) { // Stripe minimum is $0.50
    throw new Error(`Amount too small: $${amount}. Minimum amount is $0.50.`)
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: validCurrency,
          product_data: {
            name: `Order ${orderNumber}`,
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      orderId,
      orderNumber,
      ...metadata,
    },
  })

  return session
}

export async function retrieveCheckoutSession(sessionId: string) {
  return await stripe.checkout.sessions.retrieve(sessionId)
}

export async function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
}
