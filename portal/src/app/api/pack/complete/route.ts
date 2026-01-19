import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'

// POST /api/pack/complete
// Mark a shipment as packed (from Ready to Pack -> Packed)
// Note: We do NOT call Shopify here - Shopify auto-fulfills when labels are
// purchased via ShipStation integration. This is internal state tracking only.
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

    // Mark as packed (internal state only - Shopify auto-fulfills via ShipStation)
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

    // Log activity
    await supabase.from('activity_log').insert({
      organization_id: organization.id,
      subscriber_id: shipment.subscriber_id,
      event_type: 'shipment.packed',
      description: 'Shipment marked as packed',
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
