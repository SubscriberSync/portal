import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { syncSubscriberToKlaviyo, Subscriber } from '@/lib/klaviyo-sync'
import { syncSingleSubscriber } from '@/app/api/discord/sync/route'
import { handleApiError } from '@/lib/api-utils'

// Recharge webhook topics we handle
type RechargeWebhookTopic =
  | 'subscription/created'
  | 'subscription/updated'
  | 'subscription/activated'
  | 'subscription/cancelled'
  | 'subscription/skipped'
  | 'subscription/unskipped'
  | 'customer/created'
  | 'customer/updated'
  | 'customer/activated'
  | 'customer/deactivated'
  | 'charge/created'
  | 'charge/success'
  | 'charge/failed'

interface RechargeWebhookPayload {
  subscription?: RechargeSubscription
  customer?: RechargeCustomer
  charge?: RechargeCharge
}

interface RechargeSubscription {
  id: number
  customer_id: number
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED'
  product_title: string
  variant_title?: string
  sku?: string
  quantity: number
  order_interval_unit: 'day' | 'week' | 'month'
  order_interval_frequency: number
  charge_interval_frequency: number
  next_charge_scheduled_at?: string
  cancelled_at?: string
  cancellation_reason?: string
  created_at: string
  updated_at: string
  properties?: { name: string; value: string }[]
}

interface RechargeCustomer {
  id: number
  email: string
  first_name: string
  last_name: string
  phone?: string
  shopify_customer_id?: string
  billing_address1?: string
  billing_address2?: string
  billing_city?: string
  billing_province?: string
  billing_zip?: string
  billing_country?: string
  created_at: string
  updated_at: string
}

interface RechargeCharge {
  id: number
  customer_id: number
  subscription_id: number
  status: 'SUCCESS' | 'QUEUED' | 'ERROR' | 'REFUNDED' | 'SKIPPED'
  total_price: string
  processed_at?: string
}

// Map Recharge status to our status
function mapStatus(rechargeStatus: string): 'Active' | 'Paused' | 'Cancelled' | 'Expired' {
  switch (rechargeStatus) {
    case 'ACTIVE':
      return 'Active'
    case 'CANCELLED':
      return 'Cancelled'
    case 'EXPIRED':
      return 'Expired'
    default:
      return 'Active'
  }
}

// Map interval to frequency
function mapFrequency(unit: string, frequency: number): 'Monthly' | 'Quarterly' | 'Yearly' | null {
  if (unit === 'month') {
    if (frequency === 1) return 'Monthly'
    if (frequency === 3) return 'Quarterly'
    if (frequency === 12) return 'Yearly'
  }
  if (unit === 'day' && frequency === 365) return 'Yearly'
  if (unit === 'week' && frequency === 52) return 'Yearly'
  return null
}

// Extract box number from subscription properties or product title
function extractBoxNumber(subscription: RechargeSubscription): number {
  // Check properties for box_number
  const boxProp = subscription.properties?.find(
    p => p.name.toLowerCase() === 'box_number' || p.name.toLowerCase() === 'episode'
  )
  if (boxProp) {
    const num = parseInt(boxProp.value, 10)
    if (!isNaN(num)) return num
  }
  return 1 // Default to box 1
}

// Extract shirt size from subscription properties
function extractShirtSize(subscription: RechargeSubscription): string | undefined {
  const sizeProp = subscription.properties?.find(
    p => p.name.toLowerCase().includes('shirt') || p.name.toLowerCase().includes('size')
  )
  return sizeProp?.value
}

// POST /api/webhooks/recharge
// Receives webhooks from Recharge and updates Supabase
export async function POST(request: NextRequest) {
  // Get organization from query param (set when registering webhook)
  const orgId = request.nextUrl.searchParams.get('org_id')

  if (!orgId) {
    console.error('[Recharge Webhook] Missing org_id')
    return NextResponse.json({ error: 'Missing org_id' }, { status: 400 })
  }

  // Verify webhook signature (Recharge uses HMAC-SHA256)
  // For now we'll trust the org_id param, but in production you should verify
  // the X-Recharge-Hmac-Sha256 header against a per-org webhook secret

  let topic: RechargeWebhookTopic
  let payload: RechargeWebhookPayload

  try {
    const body = await request.text()
    payload = JSON.parse(body)
    topic = request.headers.get('X-Recharge-Topic') as RechargeWebhookTopic
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  console.log(`[Recharge Webhook] ${topic} for org ${orgId}`)

  const supabase = createServiceClient()

  try {
    // Handle different webhook topics
    if (topic.startsWith('subscription/')) {
      await handleSubscriptionEvent(supabase, orgId, topic, payload.subscription!)
    } else if (topic.startsWith('customer/')) {
      await handleCustomerEvent(supabase, orgId, topic, payload.customer!)
    } else if (topic.startsWith('charge/')) {
      await handleChargeEvent(supabase, orgId, payload.charge!)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'Recharge Webhook', 'Processing failed')
  }
}

async function handleSubscriptionEvent(
  supabase: ReturnType<typeof createServiceClient>,
  orgId: string,
  topic: RechargeWebhookTopic,
  subscription: RechargeSubscription
) {
  // First, get the customer data to have email
  const { data: existingSub } = await supabase
    .from('subscribers')
    .select('*')
    .eq('organization_id', orgId)
    .eq('recharge_customer_id', subscription.customer_id.toString())
    .single()

  if (!existingSub && topic !== 'subscription/created') {
    console.log('[Recharge Webhook] Subscriber not found, skipping')
    return
  }

  const status = mapStatus(subscription.status)
  const frequency = mapFrequency(
    subscription.order_interval_unit,
    subscription.order_interval_frequency
  )
  const boxNumber = extractBoxNumber(subscription)
  const shirtSize = extractShirtSize(subscription)

  const updateData: Record<string, unknown> = {
    status,
    sku: subscription.sku || subscription.product_title,
    box_number: boxNumber,
    updated_at: new Date().toISOString(),
  }

  // IMPORTANT: Update next_charge_date for predictive merging
  if (subscription.next_charge_scheduled_at) {
    updateData.next_charge_date = subscription.next_charge_scheduled_at
  }

  if (frequency) updateData.frequency = frequency
  if (shirtSize) updateData.shirt_size = shirtSize
  if (subscription.cancellation_reason) {
    updateData.cancel_reason = subscription.cancellation_reason
  }

  // Track skips
  if (topic === 'subscription/skipped' && existingSub) {
    updateData.skip_count = (existingSub.skip_count || 0) + 1
  }

  if (existingSub) {
    // Update existing subscriber
    await supabase
      .from('subscribers')
      .update(updateData)
      .eq('id', existingSub.id)

    // Sync to Klaviyo
    const updatedSub = { ...existingSub, ...updateData } as Subscriber
    await syncSubscriberToKlaviyo(updatedSub)

    // Sync Discord roles based on subscription status change
    try {
      await syncSingleSubscriber(
        orgId,
        existingSub.id,
        status,
        subscription.sku || subscription.product_title
      )
    } catch (discordError) {
      // Log but don't fail the webhook if Discord sync fails
      console.error('[Recharge Webhook] Discord sync error:', discordError)
    }
  }
}

async function handleCustomerEvent(
  supabase: ReturnType<typeof createServiceClient>,
  orgId: string,
  topic: RechargeWebhookTopic,
  customer: RechargeCustomer
) {
  console.log(`[Recharge Webhook] Processing ${topic} for customer ${customer.id} (${customer.email})`)

  // Upsert customer data
  const subscriberData: Record<string, unknown> = {
    organization_id: orgId,
    email: customer.email.toLowerCase(),
    first_name: customer.first_name,
    last_name: customer.last_name,
    phone: customer.phone || null,
    address1: customer.billing_address1 || null,
    address2: customer.billing_address2 || null,
    city: customer.billing_city || null,
    state: customer.billing_province || null,
    zip: customer.billing_zip || null,
    country: customer.billing_country || 'US',
    recharge_customer_id: customer.id.toString(),
    shopify_customer_id: customer.shopify_customer_id?.toString() || null,
    updated_at: new Date().toISOString(),
  }

  // Handle customer status changes based on event type
  if (topic === 'customer/activated') {
    console.log(`[Recharge Webhook] Activating customer ${customer.id}`)
    subscriberData.status = 'Active'
  } else if (topic === 'customer/deactivated') {
    console.log(`[Recharge Webhook] Deactivating customer ${customer.id}`)
    // When a customer is deactivated, they likely have no active subscriptions
    // Check if they have prepaid remaining orders, otherwise mark as Cancelled
    const { data: existingSubscriber } = await supabase
      .from('subscribers')
      .select('is_prepaid, orders_remaining')
      .eq('organization_id', orgId)
      .eq('email', customer.email.toLowerCase())
      .single()

    if (existingSubscriber?.is_prepaid && existingSubscriber.orders_remaining && existingSubscriber.orders_remaining > 0) {
      subscriberData.status = 'Expired' // Prepaid still has remaining orders
      console.log(`[Recharge Webhook] Customer has prepaid remaining, setting to Expired`)
    } else {
      subscriberData.status = 'Cancelled' // No active subscriptions
      console.log(`[Recharge Webhook] No prepaid remaining, setting to Cancelled`)
    }
  }

  const { data: existing } = await supabase
    .from('subscribers')
    .select('id')
    .eq('organization_id', orgId)
    .eq('email', customer.email.toLowerCase())
    .single()

  if (existing) {
    await supabase
      .from('subscribers')
      .update(subscriberData)
      .eq('id', existing.id)
  } else {
    await supabase
      .from('subscribers')
      .insert({
        ...subscriberData,
        status: subscriberData.status || 'Active',
        box_number: 1,
        subscribed_at: customer.created_at,
      })
  }

  // Sync to Klaviyo
  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('*')
    .eq('organization_id', orgId)
    .eq('email', customer.email.toLowerCase())
    .single()

  if (subscriber) {
    await syncSubscriberToKlaviyo(subscriber as Subscriber)
  }
}

async function handleChargeEvent(
  supabase: ReturnType<typeof createServiceClient>,
  orgId: string,
  charge: RechargeCharge
) {
  // On successful charge, handle box number incrementing and decrement orders_remaining for prepaid
  if (charge.status === 'SUCCESS') {
    const { data: subscriber } = await supabase
      .from('subscribers')
      .select('*')
      .eq('organization_id', orgId)
      .eq('recharge_customer_id', charge.customer_id.toString())
      .single()

    if (subscriber) {
      // Get current charge SKU
      const currentChargeSku = charge.line_items[0]?.sku?.toLowerCase()

      // Check if this subscriber has been audited (migration_status indicates forensic audit was run)
      const hasBeenAudited = subscriber.migration_status === 'audited' || subscriber.migration_status === 'resolved'

      let newBoxNumber = subscriber.box_number || 1
      let shouldIncrement = false

      if (!hasBeenAudited) {
        // Not audited yet - use old logic (increment on each charge)
        shouldIncrement = true
      } else {
        // Subscriber has been audited - check if this is a different-SKU subscription
        // For same-SKU subscriptions, don't increment - let forensic audit handle it
        // For different-SKU subscriptions, increment normally
        // For now, assume all audited subscriptions are same-SKU until we detect different SKU
        shouldIncrement = false // Don't increment - forensic audit will handle
      }

      if (shouldIncrement) {
        newBoxNumber = (subscriber.box_number || 0) + 1
      }

      const updateData: Record<string, unknown> = {
        box_number: newBoxNumber,
        updated_at: new Date().toISOString(),
      }

      // For prepaid subscriptions, decrement orders_remaining
      if (subscriber.is_prepaid && subscriber.orders_remaining !== null && subscriber.orders_remaining > 0) {
        updateData.orders_remaining = subscriber.orders_remaining - 1

        // If this was the last prepaid order, mark as Expired
        if (subscriber.orders_remaining === 1) {
          updateData.status = 'Expired'
        }
      }

      await supabase
        .from('subscribers')
        .update(updateData)
        .eq('id', subscriber.id)

      // Sync to Klaviyo with new box number
      await syncSubscriberToKlaviyo({
        ...subscriber,
        box_number: newBoxNumber,
        orders_remaining: updateData.orders_remaining ?? subscriber.orders_remaining,
      } as Subscriber)

      // For audited subscribers, re-run forensic audit to update episode counting
      if (hasBeenAudited && subscriber.shopify_customer_id) {
        try {
          console.log(`[Recharge Webhook] Re-auditing subscriber ${subscriber.id} after charge ${charge.id}`)
          // Import the audit function dynamically to avoid circular dependencies
          const { auditSubscriber } = await import('@/lib/forensic-audit')

          // Get organization credentials
          const { data: shopifyIntegration } = await supabase
            .from('integrations')
            .select('credentials_encrypted')
            .eq('organization_id', orgId)
            .eq('type', 'shopify')
            .eq('connected', true)
            .single()

          if (shopifyIntegration?.credentials_encrypted) {
            const shopifyCredentials = {
              shop: shopifyIntegration.credentials_encrypted.shop as string,
              access_token: shopifyIntegration.credentials_encrypted.access_token as string,
            }

            // Re-run audit for this subscriber
            await auditSubscriber(
              orgId,
              shopifyCredentials,
              new Map(), // SKU map - will be loaded internally
              [], // patterns - will be loaded internally
              subscriber.id,
              subscriber.shopify_customer_id,
              subscriber.email
            )
          }
        } catch (error) {
          console.error(`[Recharge Webhook] Failed to re-audit subscriber ${subscriber.id}:`, error)
          // Don't fail the webhook, just log the error
        }
      }
    }
  }
}
