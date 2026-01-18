import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'

// Fulfill order on Shopify
async function fulfillShopifyOrder(
  shopifyStore: string,
  accessToken: string,
  orderId: string,
  trackingNumber: string | null,
  carrier: string | null
) {
  try {
    // First get the fulfillment order ID
    const fulfillmentOrdersRes = await fetch(
      `https://${shopifyStore}/admin/api/2024-01/orders/${orderId}/fulfillment_orders.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!fulfillmentOrdersRes.ok) {
      console.error('[Shopify Fulfill] Failed to get fulfillment orders')
      return false
    }

    const { fulfillment_orders } = await fulfillmentOrdersRes.json()
    const openFulfillmentOrder = fulfillment_orders?.find(
      (fo: { status: string }) => fo.status === 'open' || fo.status === 'in_progress'
    )

    if (!openFulfillmentOrder) {
      console.log('[Shopify Fulfill] No open fulfillment order found')
      return true // Already fulfilled
    }

    // Create fulfillment
    const fulfillmentRes = await fetch(
      `https://${shopifyStore}/admin/api/2024-01/fulfillments.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fulfillment: {
            line_items_by_fulfillment_order: [
              {
                fulfillment_order_id: openFulfillmentOrder.id,
              },
            ],
            tracking_info: trackingNumber
              ? {
                  number: trackingNumber,
                  company: carrier || 'Other',
                }
              : undefined,
            notify_customer: true,
          },
        }),
      }
    )

    if (!fulfillmentRes.ok) {
      const error = await fulfillmentRes.text()
      console.error('[Shopify Fulfill] Failed to create fulfillment:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[Shopify Fulfill] Error:', error)
    return false
  }
}

// POST /api/pack/complete
// Mark a shipment as packed (from Ready to Pack -> Packed)
// Also fulfills the order on Shopify with tracking info
export async function POST(request: NextRequest) {
  const { orgSlug, orgId, userId } = await auth()

  if (!orgSlug || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  try {
    const { shipmentId } = await request.json()

    if (!shipmentId) {
      return NextResponse.json({ error: 'Shipment ID required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Verify shipment exists and is Ready to Pack
    const { data: shipment, error: fetchError } = await supabase
      .from('shipments')
      .select('id, status, print_batch_id, print_sequence, subscriber_id, shopify_order_id, tracking_number, carrier')
      .eq('id', shipmentId)
      .eq('organization_id', organization.id)
      .single()

    if (fetchError || !shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    if (shipment.status !== 'Ready to Pack') {
      return NextResponse.json({ error: 'Shipment is not ready to pack' }, { status: 400 })
    }

    // Mark as packed
    const { error: updateError } = await supabase
      .from('shipments')
      .update({
        status: 'Packed',
        packed_at: new Date().toISOString(),
        packed_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shipmentId)

    if (updateError) {
      console.error('[Pack Complete] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to mark as packed' }, { status: 500 })
    }

    // Fulfill on Shopify (if we have a Shopify order ID)
    let shopifyFulfilled = false
    if (shipment.shopify_order_id) {
      // Get Shopify credentials
      const { data: shopifyIntegration } = await supabase
        .from('integrations')
        .select('credentials_encrypted')
        .eq('organization_id', organization.id)
        .eq('type', 'shopify')
        .eq('connected', true)
        .single()

      if (shopifyIntegration?.credentials_encrypted) {
        const { access_token, shop } = shopifyIntegration.credentials_encrypted as {
          access_token: string
          shop: string
        }

        shopifyFulfilled = await fulfillShopifyOrder(
          shop,
          access_token,
          shipment.shopify_order_id,
          shipment.tracking_number,
          shipment.carrier
        )

        if (shopifyFulfilled) {
          // Update status to Shipped since Shopify is now fulfilled
          await supabase
            .from('shipments')
            .update({
              status: 'Shipped',
              shipped_at: new Date().toISOString(),
            })
            .eq('id', shipmentId)
        }
      }
    }

    // Log activity
    await supabase.from('activity_log').insert({
      organization_id: organization.id,
      subscriber_id: shipment.subscriber_id,
      event_type: shopifyFulfilled ? 'shipment.shipped' : 'shipment.packed',
      description: shopifyFulfilled
        ? `Packed and fulfilled on Shopify${shipment.tracking_number ? ` - ${shipment.tracking_number}` : ''}`
        : 'Shipment marked as packed',
    })

    // Check if there are more shipments to pack
    const { count: remainingCount } = await supabase
      .from('shipments')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .eq('status', 'Ready to Pack')

    // Get next shipment in the same batch
    let nextShipment = null
    if (shipment.print_batch_id) {
      const { data: next } = await supabase
        .from('shipments')
        .select('id, product_name')
        .eq('organization_id', organization.id)
        .eq('print_batch_id', shipment.print_batch_id)
        .eq('status', 'Ready to Pack')
        .gt('print_sequence', shipment.print_sequence || 0)
        .order('print_sequence', { ascending: true })
        .limit(1)
        .single()

      nextShipment = next
    }

    return NextResponse.json({
      success: true,
      remaining: remainingCount || 0,
      next: nextShipment,
      hasMore: (remainingCount || 0) > 0,
    })
  } catch (error) {
    console.error('[Pack Complete] Error:', error)
    return NextResponse.json({ error: 'Failed to complete packing' }, { status: 500 })
  }
}
