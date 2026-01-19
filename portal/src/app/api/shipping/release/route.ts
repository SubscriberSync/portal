import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { handleApiError } from '@/lib/api-utils'

/**
 * POST /api/shipping/release
 * Release a held shipment back to the unfulfilled queue
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

    // Verify shipment exists and is on hold
    const { data: shipment, error: fetchError } = await supabase
      .from('shipments')
      .select('id, status, held_until, subscriber_id')
      .eq('id', shipmentId)
      .eq('organization_id', organization.id)
      .single()

    if (fetchError || !shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    if (!shipment.held_until) {
      return NextResponse.json({ error: 'Shipment is not on hold' }, { status: 400 })
    }

    // Release the hold
    const { error: updateError } = await supabase
      .from('shipments')
      .update({
        held_until: null,
        hold_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shipmentId)

    if (updateError) {
      console.error('[Release Shipment] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to release shipment' }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_log').insert({
      organization_id: organization.id,
      subscriber_id: shipment.subscriber_id,
      event_type: 'shipment.released',
      description: 'Order released from hold',
      metadata: { shipment_id: shipmentId },
    })

    return NextResponse.json({
      success: true,
      shipmentId,
    })
  } catch (error) {
    return handleApiError(error, 'Release Shipment', 'Failed to release shipment')
  }
}

/**
 * POST /api/shipping/release/batch
 * Release multiple held shipments at once
 * Body: { shipmentIds: string[] }
 */
export async function PUT(request: NextRequest) {
  const { orgSlug, orgId, userId } = await auth()

  if (!orgSlug || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  try {
    const { shipmentIds } = await request.json()

    if (!Array.isArray(shipmentIds) || shipmentIds.length === 0) {
      return NextResponse.json({ error: 'Shipment IDs array required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Release all specified shipments
    const { data: updated, error: updateError } = await supabase
      .from('shipments')
      .update({
        held_until: null,
        hold_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organization.id)
      .in('id', shipmentIds)
      .not('held_until', 'is', null)
      .select('id')

    if (updateError) {
      console.error('[Batch Release] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to release shipments' }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_log').insert({
      organization_id: organization.id,
      event_type: 'shipments.batch_released',
      description: `Released ${updated?.length || 0} orders from hold`,
      metadata: { shipment_ids: shipmentIds, released_count: updated?.length || 0 },
    })

    return NextResponse.json({
      success: true,
      releasedCount: updated?.length || 0,
      releasedIds: updated?.map(s => s.id) || [],
    })
  } catch (error) {
    return handleApiError(error, 'Batch Release', 'Failed to release shipments')
  }
}
