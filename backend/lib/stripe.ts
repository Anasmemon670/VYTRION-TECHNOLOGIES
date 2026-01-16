import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('⚠️ STRIPE_SECRET_KEY is not set in environment variables')
  // Don't throw immediately - let it fail when Stripe is actually used
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    })
  : null as any // Will throw error when used if not configured

/**
 * Verify Stripe webhook signature
 * @param payload - Raw request body as string or Buffer (must be raw, not parsed)
 * @param signature - Stripe signature from 'stripe-signature' header
 * @returns Verified Stripe event
 */
export async function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  if (!process.env.STRIPE_SECRET_KEY || !stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.')
  }
  
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  }

  // Ensure payload is Buffer for signature verification
  const buffer = typeof payload === 'string' ? Buffer.from(payload) : payload
  
  return await stripe.webhooks.constructEvent(buffer, signature, webhookSecret)
}
