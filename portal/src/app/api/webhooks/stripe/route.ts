import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { constructWebhookEvent } from '@/lib/stripe'
import { clerkClient } from '@clerk/nextjs/server'
import {
  createOrganization,
  createPendingCheckout,
  updatePendingCheckout,
  getPendingCheckoutBySessionId,
  getOrganizationByStripeSubscriptionId,
  updateOrganization,
  logSubscriptionEvent,
  isEventProcessed,
} from '@/lib/supabase/data'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = constructWebhookEvent(body, signature)
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Check for duplicate events (idempotency)
  const alreadyProcessed = await isEventProcessed(event.id)
  if (alreadyProcessed) {
    console.log('[Stripe Webhook] Duplicate event, skipping:', event.id)
    return NextResponse.json({ received: true, duplicate: true })
  }

  console.log('[Stripe Webhook] Processing event:', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      default:
        console.log('[Stripe Webhook] Unhandled event type:', event.type)
    }

    // Log the event
    await logSubscriptionEvent({
      stripe_event_id: event.id,
      event_type: event.type,
      event_data: event.data.object as unknown as Record<string, unknown>,
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Stripe Webhook] Error processing event:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  console.log('[Stripe Webhook] Checkout completed:', session.id)

  const email = session.customer_email || session.customer_details?.email
  const customerName = session.customer_details?.name
  const companyName = session.metadata?.company_name || customerName || email?.split('@')[0] || 'New Portal'
  const slug = session.metadata?.organization_slug

  if (!email || !slug) {
    console.error('[Stripe Webhook] Missing email or slug in checkout session')
    return
  }

  // 1. Create pending checkout record
  await createPendingCheckout({
    stripe_checkout_session_id: session.id,
    stripe_customer_id: session.customer as string,
    stripe_subscription_id: session.subscription as string,
    customer_email: email,
    customer_name: customerName || undefined,
    company_name: companyName,
    organization_slug: slug,
  })

  // 2. Create organization in Supabase
  const org = await createOrganization({
    name: companyName,
    slug: slug,
    status: 'Discovery',
    stripe_customer_id: session.customer as string,
    stripe_subscription_id: session.subscription as string,
    subscription_status: 'active',
  })

  if (!org) {
    console.error('[Stripe Webhook] Failed to create organization')
    return
  }

  // 3. Create Clerk organization and send invitation
  try {
    const clerk = await clerkClient()

    // Create the organization in Clerk
    const clerkOrg = await clerk.organizations.createOrganization({
      name: companyName,
      slug: slug,
    })

    console.log('[Stripe Webhook] Created Clerk organization:', clerkOrg.id)

    // Update Supabase org with Clerk org ID
    await updateOrganization(org.id, { id: clerkOrg.id } as any)

    // Create invitation for the customer
    const invitation = await clerk.organizations.createOrganizationInvitation({
      organizationId: clerkOrg.id,
      emailAddress: email,
      role: 'org:admin',
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/portal/${slug}`,
    })

    console.log('[Stripe Webhook] Sent invitation:', invitation.id)

    // Update pending checkout with invitation info
    await updatePendingCheckout(session.id, {
      status: 'completed',
      clerk_organization_id: clerkOrg.id,
      clerk_invitation_id: invitation.id,
      invitation_sent_at: new Date().toISOString(),
      organization_id: clerkOrg.id,
      completed_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Stripe Webhook] Error creating Clerk org/invitation:', error)
    // Mark checkout as failed
    await updatePendingCheckout(session.id, {
      status: 'failed',
      organization_id: org.id,
    })
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Access subscription from the invoice object
  const invoiceData = invoice as unknown as { subscription?: string | { id: string } }
  const subscriptionId = typeof invoiceData.subscription === 'string'
    ? invoiceData.subscription
    : invoiceData.subscription?.id
  if (!subscriptionId) return

  console.log('[Stripe Webhook] Payment succeeded for subscription:', subscriptionId)

  const org = await getOrganizationByStripeSubscriptionId(subscriptionId)
  if (!org) {
    console.log('[Stripe Webhook] No organization found for subscription:', subscriptionId)
    return
  }

  // Reset failed payment counter on successful payment
  await updateOrganization(org.id, {
    failed_payment_count: 0,
    subscription_status: 'active',
  })

  // Update event log with org reference
  await logSubscriptionEvent({
    organization_id: org.id,
    stripe_event_id: `invoice_success_${invoice.id}`,
    event_type: 'invoice.payment_succeeded',
    event_data: { invoice_id: invoice.id, subscription_id: subscriptionId },
  })
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Access subscription from the invoice object
  const invoiceData = invoice as unknown as { subscription?: string | { id: string } }
  const subscriptionId = typeof invoiceData.subscription === 'string'
    ? invoiceData.subscription
    : invoiceData.subscription?.id
  if (!subscriptionId) return

  console.log('[Stripe Webhook] Payment failed for subscription:', subscriptionId)

  const org = await getOrganizationByStripeSubscriptionId(subscriptionId)
  if (!org) {
    console.log('[Stripe Webhook] No organization found for subscription:', subscriptionId)
    return
  }

  const newCount = (org.failed_payment_count || 0) + 1
  const newStatus = newCount >= 3 ? 'unpaid' : 'past_due'

  await updateOrganization(org.id, {
    failed_payment_count: newCount,
    last_payment_failed_at: new Date().toISOString(),
    subscription_status: newStatus,
  })

  console.log(`[Stripe Webhook] Organization ${org.id} now has ${newCount} failed payments, status: ${newStatus}`)

  // Update event log with org reference
  await logSubscriptionEvent({
    organization_id: org.id,
    stripe_event_id: `invoice_failed_${invoice.id}`,
    event_type: 'invoice.payment_failed',
    event_data: {
      invoice_id: invoice.id,
      subscription_id: subscriptionId,
      failed_count: newCount,
    },
  })
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('[Stripe Webhook] Subscription updated:', subscription.id, subscription.status)

  const org = await getOrganizationByStripeSubscriptionId(subscription.id)
  if (!org) {
    console.log('[Stripe Webhook] No organization found for subscription:', subscription.id)
    return
  }

  // Access subscription data
  const subData = subscription as unknown as {
    status: string
    current_period_end?: number
  }

  // Map Stripe status to our status
  let subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing' = 'active'
  switch (subData.status) {
    case 'active':
      subscriptionStatus = 'active'
      break
    case 'past_due':
      subscriptionStatus = 'past_due'
      break
    case 'canceled':
      subscriptionStatus = 'canceled'
      break
    case 'unpaid':
      subscriptionStatus = 'unpaid'
      break
    case 'trialing':
      subscriptionStatus = 'trialing'
      break
    default:
      subscriptionStatus = 'active'
  }

  await updateOrganization(org.id, {
    subscription_status: subscriptionStatus,
    subscription_current_period_end: subData.current_period_end
      ? new Date(subData.current_period_end * 1000).toISOString()
      : null,
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('[Stripe Webhook] Subscription deleted:', subscription.id)

  const org = await getOrganizationByStripeSubscriptionId(subscription.id)
  if (!org) {
    console.log('[Stripe Webhook] No organization found for subscription:', subscription.id)
    return
  }

  await updateOrganization(org.id, {
    subscription_status: 'canceled',
  })
}
