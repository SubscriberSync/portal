import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrders, getShipments, ShipStationCredentials } from '@/lib/shipstation'

// ShipStation webhook payload contains a resource_url that we need to fetch
interface ShipStationWebhookPayload {
  resource_url: string
  resource_type: 'ORDER' | 'SHIP'
}

// POST /api/webhooks/shipstation
// Receives webhooks from ShipStation for order and shipping events
export async function POST(request: NextRequest) {
  const orgId = request.nextUrl.searchParams.get('org_id')

  if (!orgId) {
    console.error('[ShipStation Webhook] Missing org_id')
    return NextResponse.json({ error: 'Missing org_id' }, { status: 400 })
  }

  // Note: ShipStation includes X-SS-Signature header for verification
  // For production, you should verify this signature using RSA-SHA256
  // For now, we trust the org_id param

  let payload: ShipStationWebhookPayload

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  console.log(`[ShipStation Webhook] Received ${payload.resource_type} for org ${orgId}`)

  const supabase = createServiceClient()

  try {
    // Get ShipStation credentials for this org
    const { data: integration } = await supabase
      .from('integrations')
      .select('credentials_encrypted')
      .eq('organization_id', orgId)
      .eq('type', 'shipstation')
      .eq('connected', true)
      .single()

    if (!integration?.credentials_encrypted) {
      console.error('[ShipStation Webhook] No credentials found for org:', orgId)
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    const credentials: ShipStationCredentials = {
      apiKey: integration.credentials_encrypted.apiKey,
      apiSecret: integration.credentials_encrypted.apiSecret,
    }

    // ShipStation webhooks only send a resource_url - we need to fetch the actual data
    // The resource_url contains query params with the actual resource IDs
    const resourceUrl = new URL(payload.resource_url)

    if (payload.resource_type === 'SHIP') {
      await handleShipNotification(supabase, orgId, credentials, resourceUrl)
    } else if (payload.resource_type === 'ORDER') {
      await handleOrderNotification(supabase, orgId, credentials, resourceUrl)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ShipStation Webhook] Error:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

async function handleShipNotification(
  supabase: ReturnType<typeof createServiceClient>,
  orgId: string,
  credentials: ShipStationCredentials,
  resourceUrl: URL
) {
  // Resource URL for SHIP_NOTIFY contains shipments
  // Format: /shipments?batchId=xxx or /shipments?shipmentId=xxx
  const batchId = resourceUrl.searchParams.get('batchId')
  const shipmentId = resourceUrl.searchParams.get('shipmentId')

  // Fetch shipments from ShipStation
  const params: Record<string, string | number | boolean> = { includeShipmentItems: true }
  if (batchId) params.batchId = batchId
  // Note: ShipStation API doesn't have a shipmentId filter, but tracking number works

  const { shipments } = await getShipments(credentials, params)

  console.log(`[ShipStation Webhook] Processing ${shipments.length} shipments`)

  for (const shipment of shipments) {
    // Try to match shipment to our shipments table by order number
    // ShipStation orderNumber should match Shopify order number
    const { data: ourShipment } = await supabase
      .from('shipments')
      .select('id, status, subscriber_id')
      .eq('organization_id', orgId)
      .eq('order_number', shipment.orderNumber)
      .single()

    if (ourShipment) {
      // Update shipment with tracking info
      await supabase
        .from('shipments')
        .update({
          status: 'Shipped',
          tracking_number: shipment.trackingNumber,
          carrier: shipment.carrierCode,
          shipped_at: shipment.shipDate || new Date().toISOString(),
          shipstation_shipment_id: shipment.shipmentId.toString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', ourShipment.id)

      console.log(`[ShipStation Webhook] Updated shipment ${ourShipment.id} with tracking ${shipment.trackingNumber}`)

      // Log activity
      await supabase.from('activity_log').insert({
        organization_id: orgId,
        subscriber_id: ourShipment.subscriber_id,
        event_type: 'shipment.shipped',
        description: `Shipped via ${shipment.carrierCode} - ${shipment.trackingNumber}`,
      })
    } else {
      console.log(`[ShipStation Webhook] No matching shipment for order ${shipment.orderNumber}`)
    }
  }
}

async function handleOrderNotification(
  supabase: ReturnType<typeof createServiceClient>,
  orgId: string,
  credentials: ShipStationCredentials,
  resourceUrl: URL
) {
  // Resource URL for ORDER_NOTIFY contains order IDs
  // Format: /orders?importBatch=xxx
  const importBatch = resourceUrl.searchParams.get('importBatch')

  if (!importBatch) {
    console.log('[ShipStation Webhook] No importBatch in ORDER_NOTIFY')
    return
  }

  // Fetch new orders from ShipStation
  // Note: Orders imported into ShipStation typically come from Shopify
  // We already handle Shopify orders directly, so this is mostly for reference
  const { orders } = await getOrders(credentials, {
    orderStatus: 'awaiting_shipment',
    pageSize: 100,
  })

  console.log(`[ShipStation Webhook] Found ${orders.length} orders awaiting shipment`)

  // We don't need to create shipments here since they come from Shopify
  // But we can update our records if ShipStation has additional info
  for (const order of orders) {
    const { data: existingShipment } = await supabase
      .from('shipments')
      .select('id')
      .eq('organization_id', orgId)
      .eq('order_number', order.orderNumber)
      .single()

    if (existingShipment) {
      // Update with ShipStation order ID for reference
      await supabase
        .from('shipments')
        .update({
          shipstation_order_id: order.orderId.toString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingShipment.id)
    }
  }
}
