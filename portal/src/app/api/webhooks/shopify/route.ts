import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import crypto from 'crypto'

// Shopify webhook topics we handle
type ShopifyWebhookTopic =
  | 'orders/create'
  | 'orders/updated'
  | 'orders/fulfilled'
  | 'orders/cancelled'
  | 'customers/create'
  | 'customers/update'

interface ShopifyOrder {
  id: number
  name: string // Order number like #1001
  email: string
  customer: {
    id: number
    email: string
    first_name: string
    last_name: string
    phone?: string
    default_address?: ShopifyAddress
  }
  line_items: ShopifyLineItem[]
  shipping_address?: ShopifyAddress
  billing_address?: ShopifyAddress
  fulfillment_status: string | null
  financial_status: string
  total_price: string
  created_at: string
  updated_at: string
  cancelled_at: string | null
  note?: string
  tags?: string
  source_name?: string
}

interface ShopifyLineItem {
  id: number
  product_id: number
  variant_id: number
  title: string
  name: string
  sku: string
  quantity: number
  price: string
  properties?: { name: string; value: string }[]
}

interface ShopifyAddress {
  first_name: string
  last_name: string
  address1: string
  address2?: string
  city: string
  province: string
  zip: string
  country: string
  phone?: string
}

interface ShopifyCustomer {
  id: number
  email: string
  first_name: string
  last_name: string
  phone?: string
  default_address?: ShopifyAddress
  created_at: string
  updated_at: string
  tags?: string
}

// Verify Shopify webhook signature
function verifyShopifyWebhook(body: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(body, 'utf8')
  const hash = hmac.digest('base64')
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))
}

// Determine shipment type from order
function getShipmentType(order: ShopifyOrder): 'Subscription' | 'One-Off' {
  // Check if order came from Recharge (subscription)
  if (order.source_name === 'subscription_contract' ||
      order.tags?.toLowerCase().includes('subscription') ||
      order.tags?.toLowerCase().includes('recharge')) {
    return 'Subscription'
  }

  // Check line item properties for subscription indicators
  for (const item of order.line_items) {
    if (item.properties?.some(p =>
      p.name.toLowerCase().includes('subscription') ||
      p.name.toLowerCase().includes('recharge')
    )) {
      return 'Subscription'
    }
  }

  return 'One-Off'
}

// Map fulfillment status
function mapFulfillmentStatus(status: string | null): 'Unfulfilled' | 'Packed' | 'Shipped' | 'Delivered' {
  switch (status) {
    case 'fulfilled':
      return 'Shipped'
    case 'partial':
      return 'Packed'
    default:
      return 'Unfulfilled'
  }
}

// Detect external fulfillment source from Shopify fulfillment data
function detectExternalFulfillmentSource(order: ShopifyOrder): string | null {
  // If we have tracking info but didn't generate it ourselves, it's external
  // Common patterns:
  // - Shopify Shipping: location_id present, tracking via Shopify
  // - ShipStation Direct: originated_from ShipStation
  // - Pirateship: tracking numbers with specific patterns

  // For now, if the order is fulfilled and we're receiving this from Shopify,
  // it's likely external unless we can prove otherwise
  if (order.fulfillment_status === 'fulfilled') {
    return 'external' // Will be refined when we have more context
  }
  return null
}

// POST /api/webhooks/shopify
export async function POST(request: NextRequest) {
  // Get organization from query param
  const orgId = request.nextUrl.searchParams.get('org_id')

  if (!orgId) {
    console.error('[Shopify Webhook] Missing org_id')
    return NextResponse.json({ error: 'Missing org_id' }, { status: 400 })
  }

  const body = await request.text()
  const topic = request.headers.get('X-Shopify-Topic') as ShopifyWebhookTopic
  const hmacHeader = request.headers.get('X-Shopify-Hmac-Sha256')

  // Get webhook secret for this org (stored with Shopify credentials)
  const supabase = createServiceClient()
  const { data: integration } = await supabase
    .from('integrations')
    .select('credentials_encrypted')
    .eq('organization_id', orgId)
    .eq('type', 'shopify')
    .single()

  // Verify webhook signature if we have a secret
  const webhookSecret = (integration?.credentials_encrypted as { webhook_secret?: string })?.webhook_secret
  if (webhookSecret && hmacHeader) {
    const isValid = verifyShopifyWebhook(body, hmacHeader, webhookSecret)
    if (!isValid) {
      console.error('[Shopify Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload: ShopifyOrder | ShopifyCustomer
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  console.log(`[Shopify Webhook] ${topic} for org ${orgId}`)

  try {
    if (topic.startsWith('orders/')) {
      await handleOrderEvent(supabase, orgId, topic, payload as ShopifyOrder)
    } else if (topic.startsWith('customers/')) {
      await handleCustomerEvent(supabase, orgId, payload as ShopifyCustomer)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Shopify Webhook] Error:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

async function handleOrderEvent(
  supabase: ReturnType<typeof createServiceClient>,
  orgId: string,
  topic: ShopifyWebhookTopic,
  order: ShopifyOrder
) {
  // Find or create subscriber
  const email = order.email?.toLowerCase() || order.customer?.email?.toLowerCase()
  if (!email) {
    console.log('[Shopify Webhook] No email on order, skipping')
    return
  }

  // Get or create subscriber
  let { data: subscriber } = await supabase
    .from('subscribers')
    .select('id, next_charge_date')
    .eq('organization_id', orgId)
    .eq('email', email)
    .single()

  if (!subscriber && order.customer) {
    // Create new subscriber from order
    const address = order.shipping_address || order.customer.default_address
    const { data: newSub } = await supabase
      .from('subscribers')
      .insert({
        organization_id: orgId,
        email: email,
        first_name: order.customer.first_name,
        last_name: order.customer.last_name,
        phone: order.customer.phone || address?.phone,
        address1: address?.address1,
        address2: address?.address2,
        city: address?.city,
        state: address?.province,
        zip: address?.zip,
        country: address?.country || 'US',
        shopify_customer_id: order.customer.id.toString(),
        status: 'Active',
        box_number: 1,
      })
      .select('id, next_charge_date')
      .single()

    subscriber = newSub
  }

  if (!subscriber) {
    console.log('[Shopify Webhook] Could not find/create subscriber')
    return
  }

  const shipmentType = getShipmentType(order)
  const status = topic === 'orders/cancelled' ? 'Flagged' : mapFulfillmentStatus(order.fulfillment_status)

    // Get organization settings for predictive merging
    interface OrgSettings {
      smart_hold_days: number
      auto_merge_enabled: boolean
      ghost_order_handling: boolean
    }
    
    const { data: settings } = await supabase
      .rpc('get_organization_settings', { org_id: orgId })
      .single()

    const smartHoldDays = (settings as OrgSettings | null)?.smart_hold_days ?? 7

  // Predictive Merging: Check if one-off should be held for upcoming renewal
  let shouldHold = false
  let heldUntil: string | null = null

  if (
    shipmentType === 'One-Off' &&
    subscriber.next_charge_date &&
    topic === 'orders/create'
  ) {
    const nextChargeDate = new Date(subscriber.next_charge_date)
    const now = new Date()
    const daysUntilRenewal = Math.ceil(
      (nextChargeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysUntilRenewal > 0 && daysUntilRenewal <= smartHoldDays) {
      shouldHold = true
      heldUntil = subscriber.next_charge_date
      console.log(
        `[Shopify Webhook] Holding one-off order for ${email} - renewal in ${daysUntilRenewal} days`
      )
    }
  }

  // Create/update shipment for each line item
  for (const item of order.line_items) {
    const shipmentData: Record<string, unknown> = {
      organization_id: orgId,
      subscriber_id: subscriber.id,
      type: shipmentType,
      status: status,
      product_name: item.name,
      variant_name: item.name !== item.title ? item.title : null,
      gift_note: order.note || null,
      order_number: order.name,
      shopify_order_id: order.id.toString(),
      shopify_line_item_id: item.id.toString(),
      flag_reason: topic === 'orders/cancelled' ? 'Order cancelled' : null,
      shipped_at: order.fulfillment_status === 'fulfilled' ? new Date().toISOString() : null,
      financial_status: order.financial_status || null,
    }

    // Apply predictive hold if applicable
    if (shouldHold && heldUntil) {
      shipmentData.held_until = heldUntil
      shipmentData.hold_reason = 'predictive_merge'
    }

    // Check if shipment already exists for this order line item
    const { data: existing } = await supabase
      .from('shipments')
      .select('id, status')
      .eq('organization_id', orgId)
      .eq('shopify_order_id', order.id.toString())
      .eq('shopify_line_item_id', item.id.toString())
      .single()

    if (existing) {
      // GHOST ORDER HANDLING:
      // If Shopify says fulfilled but our status is NOT Packed/Shipped,
      // this is a "ghost order" - label was bought externally
      if (
        order.fulfillment_status === 'fulfilled' &&
        existing.status !== 'Packed' &&
        existing.status !== 'Shipped' &&
        existing.status !== 'Delivered'
      ) {
        // Mark as external fulfillment but keep in pack queue (Ready to Pack)
        // so the packer sees it and can verify the physical label exists
        shipmentData.status = 'Ready to Pack'
        shipmentData.external_fulfillment_source = 'external'
        
        console.log(
          `[Shopify Webhook] Ghost order detected for ${order.name} - external fulfillment`
        )

        // Log this as an activity
        await supabase.from('activity_log').insert({
          organization_id: orgId,
          subscriber_id: subscriber.id,
          event_type: 'shipment.ghost_order',
          description: `Order ${order.name} was fulfilled externally (outside SubscriberSync)`,
          metadata: { 
            order_number: order.name, 
            shopify_order_id: order.id.toString(),
            original_status: existing.status,
          },
        })
      }

      // Update existing shipment
      await supabase
        .from('shipments')
        .update(shipmentData)
        .eq('id', existing.id)
    } else {
      // Create new shipment
      // If already fulfilled on create, mark as external
      if (order.fulfillment_status === 'fulfilled') {
        shipmentData.external_fulfillment_source = 'external'
        shipmentData.status = 'Ready to Pack' // Show in pack queue
      }

      await supabase
        .from('shipments')
        .insert(shipmentData)
    }
  }

  // Log activity if order was held
  if (shouldHold) {
    await supabase.from('activity_log').insert({
      organization_id: orgId,
      subscriber_id: subscriber.id,
      event_type: 'shipment.auto_held',
      description: `One-off order automatically held for upcoming renewal on ${new Date(heldUntil!).toLocaleDateString()}`,
      metadata: { order_number: order.name, held_until: heldUntil },
    })
  }

  // Update integration last sync
  await supabase
    .from('integrations')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('organization_id', orgId)
    .eq('type', 'shopify')
}

async function handleCustomerEvent(
  supabase: ReturnType<typeof createServiceClient>,
  orgId: string,
  customer: ShopifyCustomer
) {
  const email = customer.email?.toLowerCase()
  if (!email) return

  const address = customer.default_address

  // Upsert subscriber
  await supabase
    .from('subscribers')
    .upsert(
      {
        organization_id: orgId,
        email: email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone: customer.phone || address?.phone,
        address1: address?.address1,
        address2: address?.address2,
        city: address?.city,
        state: address?.province,
        zip: address?.zip,
        country: address?.country || 'US',
        shopify_customer_id: customer.id.toString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'organization_id,email',
      }
    )
}
