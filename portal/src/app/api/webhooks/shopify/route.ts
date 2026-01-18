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
    .select('id')
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
      .select('id')
      .single()

    subscriber = newSub
  }

  if (!subscriber) {
    console.log('[Shopify Webhook] Could not find/create subscriber')
    return
  }

  const shipmentType = getShipmentType(order)
  const status = topic === 'orders/cancelled' ? 'Flagged' : mapFulfillmentStatus(order.fulfillment_status)

  // Create/update shipment for each line item
  for (const item of order.line_items) {
    const shipmentData = {
      organization_id: orgId,
      subscriber_id: subscriber.id,
      type: shipmentType,
      status: status,
      product_name: item.name,
      gift_note: order.note || null,
      flag_reason: topic === 'orders/cancelled' ? 'Order cancelled' : null,
      shipped_at: order.fulfillment_status === 'fulfilled' ? new Date().toISOString() : null,
    }

    // Check if shipment already exists for this order line item
    const shopifyOrderItemId = `${order.id}-${item.id}`
    const { data: existing } = await supabase
      .from('shipments')
      .select('id')
      .eq('organization_id', orgId)
      .eq('subscriber_id', subscriber.id)
      .eq('product_name', item.name)
      .gte('created_at', new Date(order.created_at).toISOString())
      .single()

    if (existing) {
      // Update existing shipment
      await supabase
        .from('shipments')
        .update(shipmentData)
        .eq('id', existing.id)
    } else {
      // Create new shipment
      await supabase
        .from('shipments')
        .insert(shipmentData)
    }
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
