import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'

/**
 * POST /api/pack/merge
 * Merge two shipments into one (for combo orders)
 * Body: { primaryId: string, secondaryId: string }
 */
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
    const { primaryId, secondaryId } = await request.json()

    if (!primaryId || !secondaryId) {
      return NextResponse.json(
        { error: 'Primary and secondary shipment IDs required' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Verify both shipments exist and belong to this organization
    const { data: shipments, error: fetchError } = await supabase
      .from('shipments')
      .select('id, status, product_name, subscriber_id, merged_shipment_ids')
      .eq('organization_id', organization.id)
      .in('id', [primaryId, secondaryId])

    if (fetchError || !shipments || shipments.length !== 2) {
      return NextResponse.json({ error: 'Shipments not found' }, { status: 404 })
    }

    const primary = shipments.find(s => s.id === primaryId)
    const secondary = shipments.find(s => s.id === secondaryId)

    if (!primary || !secondary) {
      return NextResponse.json({ error: 'Shipments not found' }, { status: 404 })
    }

    // Update primary shipment to include merged items
    const existingMerged = primary.merged_shipment_ids || []
    const newMergedIds = [...existingMerged, secondaryId]

    const { error: updatePrimaryError } = await supabase
      .from('shipments')
      .update({
        merged_shipment_ids: newMergedIds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', primaryId)

    if (updatePrimaryError) {
      console.error('[Pack Merge] Update primary error:', updatePrimaryError)
      return NextResponse.json({ error: 'Failed to merge shipments' }, { status: 500 })
    }

    // Mark secondary shipment as merged
    const { error: updateSecondaryError } = await supabase
      .from('shipments')
      .update({
        status: 'Merged',
        merged_into_id: primaryId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', secondaryId)

    if (updateSecondaryError) {
      console.error('[Pack Merge] Update secondary error:', updateSecondaryError)
      return NextResponse.json({ error: 'Failed to merge shipments' }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_log').insert({
      organization_id: organization.id,
      subscriber_id: primary.subscriber_id,
      event_type: 'shipment.merged',
      description: `Merged shipment ${secondary.product_name || secondaryId} into ${primary.product_name || primaryId}`,
    })

    // Get updated primary shipment
    const { data: mergedShipment } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', primaryId)
      .single()

    return NextResponse.json({
      success: true,
      merged: mergedShipment,
    })
  } catch (error) {
    console.error('[Pack Merge] Error:', error)
    return NextResponse.json({ error: 'Failed to merge shipments' }, { status: 500 })
  }
}
