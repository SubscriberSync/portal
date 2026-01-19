import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { handleApiError } from '@/lib/api-utils'

/**
 * POST /api/shipping/hold
 * Put a one-off order on hold for predictive merging
 * Body: { shipmentId: string, heldUntil?: string (ISO date) }
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
    const { shipmentId, heldUntil } = await request.json()

    if (!shipmentId) {
      return NextResponse.json({ error: 'Shipment ID required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Verify shipment exists and is unfulfilled
    const { data: shipment, error: fetchError } = await supabase
      .from('shipments')
      .select('id, status, type, subscriber_id')
      .eq('id', shipmentId)
      .eq('organization_id', organization.id)
      .single()

    if (fetchError || !shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    if (shipment.status !== 'Unfulfilled') {
      return NextResponse.json({ error: 'Can only hold unfulfilled shipments' }, { status: 400 })
    }

    // Get the subscriber's next charge date if heldUntil not provided
    let holdDate = heldUntil
    if (!holdDate && shipment.subscriber_id) {
      const { data: subscriber } = await supabase
        .from('subscribers')
        .select('next_charge_date')
        .eq('id', shipment.subscriber_id)
        .single()

      holdDate = subscriber?.next_charge_date
    }

    // Update shipment to on-hold status
    const { error: updateError } = await supabase
      .from('shipments')
      .update({
        held_until: holdDate || null,
        hold_reason: 'predictive_merge',
        updated_at: new Date().toISOString(),
      })
      .eq('id', shipmentId)

    if (updateError) {
      console.error('[Hold Shipment] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to hold shipment' }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_log').insert({
      organization_id: organization.id,
      subscriber_id: shipment.subscriber_id,
      event_type: 'shipment.held',
      description: `Order placed on hold${holdDate ? ` until ${new Date(holdDate).toLocaleDateString()}` : ''}`,
      metadata: { shipment_id: shipmentId, held_until: holdDate },
    })

    return NextResponse.json({
      success: true,
      shipmentId,
      heldUntil: holdDate,
    })
  } catch (error) {
    return handleApiError(error, 'Hold Shipment', 'Failed to hold shipment')
  }
}

/**
 * GET /api/shipping/hold
 * Get all held shipments
 */
export async function GET() {
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

    const { data: heldShipments, error } = await supabase
      .from('shipments')
      .select(`
        *,
        subscriber:subscribers(id, email, first_name, last_name, next_charge_date)
      `)
      .eq('organization_id', organization.id)
      .eq('status', 'Unfulfilled')
      .not('held_until', 'is', null)
      .order('held_until', { ascending: true })

    if (error) {
      console.error('[Get Held Shipments] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch held shipments' }, { status: 500 })
    }

    return NextResponse.json({
      shipments: heldShipments || [],
      count: heldShipments?.length || 0,
    })
  } catch (error) {
    return handleApiError(error, 'Get Held Shipments', 'Failed to fetch held shipments')
  }
}
