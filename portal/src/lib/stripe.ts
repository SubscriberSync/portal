import Stripe from 'stripe'

// Server-side Stripe client (lazily initialized)
let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  }
  return stripeInstance
}

// Helper to generate a URL-safe slug from company name
export function generateSlug(companyName: string): string {
  const base = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 30)

  // Add random suffix for uniqueness
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${base}-${suffix}`
}

// Create a Stripe Checkout Session for new subscription
export async function createCheckoutSession({
  email,
  companyName,
  successUrl,
  cancelUrl,
}: {
  email: string
  companyName: string
  successUrl: string
  cancelUrl: string
}) {
  const slug = generateSlug(companyName)
  const stripe = getStripe()

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID!,
        quantity: 1,
      },
    ],
    subscription_data: {
      metadata: {
        organization_slug: slug,
        customer_email: email,
        company_name: companyName,
      },
    },
    metadata: {
      organization_slug: slug,
      company_name: companyName,
      customer_email: email,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
  })

  return { session, slug }
}

// Create a Stripe Customer Portal session for billing management
export async function createBillingPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string
  returnUrl: string
}) {
  const stripe = getStripe()
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return session
}

// Verify Stripe webhook signature
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe()
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}
