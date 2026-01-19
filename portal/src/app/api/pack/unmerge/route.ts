import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { handleApiError } from '@/lib/api-utils'

/**
 * POST /api/pack/unmerge
 * Unmerge a shipment that was previously merged
 * Body: { shipmentId: string }
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
    const { shipmentId } = await request.json()

    if (!shipmentId) {
      return NextResponse.json({ error: 'Shipment ID required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Find the shipment that was merged (status = Merged)
    const { data: mergedShipment, error: fetchError } = await supabase
      .from('shipments')
      .select('id, status, merged_into_id, subscriber_id, product_name')
      .eq('id', shipmentId)
      .eq('organization_id', organization.id)
      .single()

    if (fetchError || !mergedShipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    if (mergedShipment.status !== 'Merged' || !mergedShipment.merged_into_id) {
      return NextResponse.json({ error: 'Shipment is not merged' }, { status: 400 })
    }

    const primaryId = mergedShipment.merged_into_id

    // Get the primary shipment to update its merged list
    const { data: primaryShipment, error: primaryError } = await supabase
      .from('shipments')
      .select('id, merged_shipment_ids')
      .eq('id', primaryId)
      .single()

    if (primaryError || !primaryShipment) {
      return NextResponse.json({ error: 'Primary shipment not found' }, { status: 404 })
    }

    // Remove this shipment from the primary's merged list
    const updatedMergedIds = (primaryShipment.merged_shipment_ids || [])
      .filter((id: string) => id !== shipmentId)

    const { error: updatePrimaryError } = await supabase
      .from('shipments')
      .update({
        merged_shipment_ids: updatedMergedIds.length > 0 ? updatedMergedIds : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', primaryId)

    if (updatePrimaryError) {
      console.error('[Pack Unmerge] Update primary error:', updatePrimaryError)
      return NextResponse.json({ error: 'Failed to unmerge shipment' }, { status: 500 })
    }

    // Restore the merged shipment to its previous status (Unfulfilled)
    const { error: updateMergedError } = await supabase
      .from('shipments')
      .update({
        status: 'Unfulfilled',
        merged_into_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shipmentId)

    if (updateMergedError) {
      console.error('[Pack Unmerge] Update merged error:', updateMergedError)
      return NextResponse.json({ error: 'Failed to unmerge shipment' }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_log').insert({
      organization_id: organization.id,
      subscriber_id: mergedShipment.subscriber_id,
      event_type: 'shipment.unmerged',
      description: `Unmerged shipment ${mergedShipment.product_name || shipmentId}`,
    })

    // Get updated shipment
    const { data: unmergedShipment } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', shipmentId)
      .single()

    return NextResponse.json({
      success: true,
      unmerged: unmergedShipment,
    })
  } catch (error) {
    return handleApiError(error, 'Pack Unmerge', 'Failed to unmerge shipment')
  }
}
