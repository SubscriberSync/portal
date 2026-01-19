import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { handleApiError } from '@/lib/api-utils'

// POST /api/pack/flag
// Flag a shipment with a reason (moves out of pack queue)
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
    const { shipmentId, reason } = await request.json()

    if (!shipmentId || !reason) {
      return NextResponse.json({ error: 'Shipment ID and reason required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Verify shipment exists
    const { data: shipment, error: fetchError } = await supabase
      .from('shipments')
      .select('id, status, subscriber_id, print_batch_id, print_sequence')
      .eq('id', shipmentId)
      .eq('organization_id', organization.id)
      .single()

    if (fetchError || !shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    // Flag the shipment
    const { error: updateError } = await supabase
      .from('shipments')
      .update({
        status: 'Flagged',
        flag_reason: reason,
        flagged_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shipmentId)

    if (updateError) {
      console.error('[Pack Flag] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to flag shipment' }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_log').insert({
      organization_id: organization.id,
      subscriber_id: shipment.subscriber_id,
      event_type: 'shipment.flagged',
      description: `Flagged: ${reason}`,
    })

    // Check if there are more shipments to pack
    const { count: remainingCount } = await supabase
      .from('shipments')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .eq('status', 'Ready to Pack')

    // Get next shipment
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
    return handleApiError(error, 'Pack Flag', 'Failed to flag shipment')
  }
}
