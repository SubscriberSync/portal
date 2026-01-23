import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { handleApiError } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/subscribers/[id]/orders
 * Get all shipments/orders for a subscriber
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { orgId } = await auth()
  const { id } = await params

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    // Verify subscriber exists and belongs to org
    const { data: subscriber, error: subError } = await supabase
      .from('subscribers')
      .select('id, organization_id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .single()

    if (subError || !subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }

    // Get all shipments for this subscriber
    const { data: shipments, error: shipmentsError } = await supabase
      .from('shipments')
      .select('*')
      .eq('subscriber_id', id)
      .order('created_at', { ascending: false })

    if (shipmentsError) {
      throw new Error(`Failed to fetch shipments: ${shipmentsError.message}`)
    }

    // Transform to expected format
    const orders = (shipments || []).map((s) => ({
      id: s.id,
      orderNumber: s.order_number,
      shopifyOrderId: s.shopify_order_id,
      type: s.type,
      sequenceId: s.sequence_id,
      status: s.status,
      productName: s.product_name,
      variantName: s.variant_name,
      giftNote: s.gift_note,
      trackingNumber: s.tracking_number,
      carrier: s.carrier,
      shippingCost: s.shipping_cost,
      labelUrl: s.label_url,
      packedAt: s.packed_at,
      packedBy: s.packed_by,
      shippedAt: s.shipped_at,
      createdAt: s.created_at,
      flagReason: s.flag_reason,
      financialStatus: s.financial_status,
      isBackfilled: s.is_backfilled,
      externalFulfillmentSource: s.external_fulfillment_source,
    }))

    return NextResponse.json({ orders, total: orders.length })
  } catch (error) {
    return handleApiError(error, 'Subscriber Orders')
  }
}

/**
 * POST /api/subscribers/[id]/orders
 * Create a manual shipment/order for a subscriber
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { orgId, userId } = await auth()
  const { id } = await params

  if (!orgId || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    const body = await request.json()

    // Verify subscriber exists and belongs to org
    const { data: subscriber, error: subError } = await supabase
      .from('subscribers')
      .select('id, organization_id, email, first_name, last_name, box_number')
      .eq('id', id)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .single()

    if (subError || !subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }

    // Build shipment record
    const shipmentData: Record<string, unknown> = {
      organization_id: orgId,
      subscriber_id: id,
      type: body.type || 'One-Off',
      status: body.status || 'Unfulfilled',
      product_name: body.productName,
      variant_name: body.variantName,
      sequence_id: body.sequenceId || subscriber.box_number,
      order_number: body.orderNumber,
      shopify_order_id: body.shopifyOrderId,
      gift_note: body.giftNote,
      financial_status: body.financialStatus || 'paid',
      is_backfilled: body.isBackfilled || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Insert the shipment
    const { data: newShipment, error: insertError } = await supabase
      .from('shipments')
      .insert(shipmentData)
      .select()
      .single()

    if (insertError) {
      throw new Error(`Failed to create shipment: ${insertError.message}`)
    }

    // Log to admin audit
    await supabase.from('admin_audit_log').insert({
      organization_id: orgId,
      action: 'create_order',
      entity_type: 'shipment',
      entity_id: newShipment.id,
      performed_by: userId,
      details: {
        subscriber_id: id,
        subscriber_email: subscriber.email,
        product_name: body.productName,
        type: body.type || 'One-Off',
      },
    })

    return NextResponse.json({ success: true, shipment: newShipment })
  } catch (error) {
    return handleApiError(error, 'Create Order')
  }
}
