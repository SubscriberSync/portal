import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import type { PackShipment, ShipmentSubscriber } from '@/lib/pack-types'

export const dynamic = 'force-dynamic'

// GET /api/pack/queue
// Returns the pack queue ordered by print_batch_id (newest first) and print_sequence
// Only shows shipments with status = 'Ready to Pack'
export async function GET(request: NextRequest) {
  const { orgSlug, orgId } = await auth()

  if (!orgSlug || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  try {
    const supabase = createServiceClient()

    // Get batch filter from query params
    const batchId = request.nextUrl.searchParams.get('batch')

    // Build query for Ready to Pack shipments
    let query = supabase
      .from('shipments')
      .select(`
        id, type, status, sequence_id, product_name, variant_name,
        gift_note, order_number, shopify_order_id, tracking_number,
        carrier, weight_oz, print_batch_id, print_sequence,
        merged_into_id, merged_shipment_ids, flag_reason,
        external_fulfillment_source,
        subscriber:subscribers(
          id, email, first_name, last_name, shirt_size,
          address1, address2, city, state, zip, country, phone
        )
      `)
      .eq('organization_id', organization.id)
      .eq('status', 'Ready to Pack')

    // Filter by specific batch if provided
    if (batchId) {
      query = query.eq('print_batch_id', batchId)
    }

    // Order by batch (newest first) then by print_sequence (matches physical label stack)
    const { data: rawShipments, error } = await query
      .order('label_purchased_at', { ascending: false })
      .order('print_sequence', { ascending: true })

    if (error) {
      console.error('[Pack Queue] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 })
    }

    // Transform and fetch merged items for each shipment
    const shipments: PackShipment[] = []
    
    for (const raw of rawShipments || []) {
      // Handle subscriber being array or object from Supabase join
      const subData = raw.subscriber
      const subscriber = Array.isArray(subData) ? subData[0] : subData

      const shipment: PackShipment = {
        id: raw.id,
        type: raw.type,
        status: raw.status,
        sequence_id: raw.sequence_id,
        product_name: raw.product_name,
        variant_name: raw.variant_name,
        gift_note: raw.gift_note,
        order_number: raw.order_number,
        shopify_order_id: raw.shopify_order_id,
        tracking_number: raw.tracking_number,
        carrier: raw.carrier,
        weight_oz: raw.weight_oz,
        print_batch_id: raw.print_batch_id,
        print_sequence: raw.print_sequence,
        merged_into_id: raw.merged_into_id,
        merged_shipment_ids: raw.merged_shipment_ids,
        flag_reason: raw.flag_reason,
        subscriber: subscriber as ShipmentSubscriber | null,
        external_fulfillment_source: raw.external_fulfillment_source,
      }

      // Fetch merged items if this shipment has any
      if (raw.merged_shipment_ids && raw.merged_shipment_ids.length > 0) {
        const { data: mergedItems } = await supabase
          .from('shipments')
          .select('id, type, product_name, variant_name, gift_note, order_number')
          .in('id', raw.merged_shipment_ids)

        shipment.merged_items = (mergedItems || []).map(item => ({
          id: item.id,
          type: item.type,
          status: 'Merged' as const,
          sequence_id: null,
          product_name: item.product_name,
          variant_name: item.variant_name,
          gift_note: item.gift_note,
          order_number: item.order_number,
          shopify_order_id: null,
          tracking_number: null,
          carrier: null,
          weight_oz: null,
          print_batch_id: null,
          print_sequence: null,
          merged_into_id: raw.id,
          merged_shipment_ids: null,
          flag_reason: null,
          subscriber: null,
          external_fulfillment_source: null,
        }))
      }

      shipments.push(shipment)
    }

    // Get stats
    const { count: packedTodayCount } = await supabase
      .from('shipments')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .eq('status', 'Packed')
      .gte('packed_at', new Date().toISOString().split('T')[0])

    // Get unfulfilled count for stats
    const { count: unfulfilledCount } = await supabase
      .from('shipments')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .in('status', ['Unfulfilled', 'Ready to Pack'])

    // Get available batches for batch selector
    const { data: batches } = await supabase
      .from('print_batches')
      .select('id, batch_number, total_labels, successful_labels, created_at')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Count shipments still ready to pack per batch
    const batchCounts = new Map<string, number>()
    shipments.forEach(s => {
      if (s.print_batch_id) {
        batchCounts.set(s.print_batch_id, (batchCounts.get(s.print_batch_id) || 0) + 1)
      }
    })

    return NextResponse.json({
      queue: shipments,
      stats: {
        total: shipments.length,
        unfulfilled: unfulfilledCount || 0,
        packedToday: packedTodayCount || 0,
        avgPackTimeSeconds: null, // TODO: Calculate from packed_at timestamps
        estFinishTime: null, // TODO: Calculate based on avg time and remaining
      },
      batches: batches?.map(b => ({
        ...b,
        remaining: batchCounts.get(b.id) || 0,
      })) || [],
    })
  } catch (error) {
    console.error('[Pack Queue] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 })
  }
}
