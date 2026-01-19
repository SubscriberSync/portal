import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { handleApiError } from '@/lib/api-utils'

// POST /api/shipping/merge
// Merge multiple shipments for the same customer into one
export async function POST(request: NextRequest) {
  const { orgSlug, orgId } = await auth()

  if (!orgSlug || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  try {
    const { shipmentIds } = await request.json()

    if (!shipmentIds || shipmentIds.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 shipments to merge' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Fetch all shipments to merge
    const { data: shipments, error: fetchError } = await supabase
      .from('shipments')
      .select('*')
      .eq('organization_id', organization.id)
      .in('id', shipmentIds)
      .eq('status', 'Unfulfilled')

    if (fetchError || !shipments || shipments.length < 2) {
      return NextResponse.json({ error: 'Could not find shipments to merge' }, { status: 400 })
    }

    // Verify all belong to same subscriber
    const subscriberIds = new Set(shipments.map(s => s.subscriber_id).filter(Boolean))
    if (subscriberIds.size !== 1) {
      return NextResponse.json({ error: 'All shipments must belong to the same customer' }, { status: 400 })
    }

    // Calculate combined weight
    const totalWeight = shipments.reduce((sum, s) => sum + (s.weight_oz || 0), 0)

    // Combine product names
    const productNames = shipments.map(s => s.product_name).filter(Boolean).join(' + ')

    // Combine gift notes
    const giftNotes = shipments.map(s => s.gift_note).filter(Boolean).join('\n---\n')

    // Use the first shipment as the "parent" and merge others into it
    const [parentShipment, ...childShipments] = shipments

    // Update parent shipment with combined data
    const { error: updateParentError } = await supabase
      .from('shipments')
      .update({
        weight_oz: totalWeight,
        product_name: productNames,
        gift_note: giftNotes || null,
        merged_shipment_ids: childShipments.map(s => s.id),
        updated_at: new Date().toISOString(),
      })
      .eq('id', parentShipment.id)

    if (updateParentError) {
      console.error('[Merge] Failed to update parent:', updateParentError)
      return NextResponse.json({ error: 'Failed to update merged shipment' }, { status: 500 })
    }

    // Mark child shipments as merged
    const { error: updateChildrenError } = await supabase
      .from('shipments')
      .update({
        status: 'Merged',
        merged_into_id: parentShipment.id,
        updated_at: new Date().toISOString(),
      })
      .in('id', childShipments.map(s => s.id))

    if (updateChildrenError) {
      console.error('[Merge] Failed to update children:', updateChildrenError)
      return NextResponse.json({ error: 'Failed to mark shipments as merged' }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_log').insert({
      organization_id: organization.id,
      subscriber_id: parentShipment.subscriber_id,
      event_type: 'shipments.merged',
      description: `Merged ${shipments.length} shipments into one`,
    })

    return NextResponse.json({
      success: true,
      parentId: parentShipment.id,
      mergedCount: childShipments.length,
    })
  } catch (error) {
    return handleApiError(error, 'Merge Shipments', 'Failed to merge shipments')
  }
}
