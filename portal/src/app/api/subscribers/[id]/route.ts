import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSubscriberWithShipments, Shipment } from '@/lib/supabase/data'
import { createServiceClient } from '@/lib/supabase/service'
import { handleApiError } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/subscribers/[id]
 * Get subscriber details with shipment history (includes all fields for admin editing)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { orgId } = await auth()
  const { id } = await params

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await getSubscriberWithShipments(id)

    if (!result) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }

    const { subscriber, shipments } = result

    // Verify subscriber belongs to this organization
    if (subscriber.organization_id !== orgId) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }

    // Transform shipments to expected format
    const transformedShipments = shipments.map((shipment: Shipment) => ({
      id: shipment.id,
      boxNumber: shipment.sequence_id || 0,
      boxName: shipment.product_name || 'Unknown',
      status: shipment.status,
      shippedAt: shipment.shipped_at,
      deliveredAt: null, // Add if you track this
      trackingNumber: shipment.tracking_number,
      trackingUrl: shipment.tracking_number && shipment.carrier
        ? getTrackingUrl(shipment.carrier, shipment.tracking_number)
        : undefined,
      carrier: shipment.carrier,
    }))

    // Transform subscriber to expected format with ALL fields for admin editing
    const transformed = {
      id: subscriber.id,
      // Personal info
      firstName: subscriber.first_name || '',
      lastName: subscriber.last_name || '',
      email: subscriber.email,
      phone: subscriber.phone || '',
      // Address
      address: {
        address1: subscriber.address1 || '',
        address2: subscriber.address2 || '',
        city: subscriber.city || '',
        state: subscriber.state || '',
        zip: subscriber.zip || '',
        country: subscriber.country || 'US',
        phone: subscriber.phone || '',
      },
      // Subscription details
      status: subscriber.status,
      boxNumber: subscriber.box_number,
      sku: subscriber.sku || '',
      frequency: subscriber.frequency || '',
      shirtSize: subscriber.shirt_size || '',
      // Flags
      isVip: subscriber.is_vip || false,
      isInfluencer: subscriber.is_influencer || false,
      isProblem: subscriber.is_problem || false,
      isGift: subscriber.is_gift || false,
      isAtRisk: subscriber.is_at_risk || false,
      atRisk: subscriber.at_risk || false,
      // Prepaid
      isPrepaid: subscriber.is_prepaid || false,
      prepaidTotal: subscriber.prepaid_total,
      ordersRemaining: subscriber.orders_remaining,
      // External IDs
      shopifyCustomerId: subscriber.shopify_customer_id,
      rechargeCustomerId: subscriber.recharge_customer_id,
      rechargeSubscriptionId: subscriber.recharge_subscription_id,
      // Discord
      discordUserId: subscriber.discord_user_id,
      discordUsername: subscriber.discord_username,
      // Dates
      subscribedAt: subscriber.subscribed_at || subscriber.created_at,
      nextChargeDate: subscriber.next_charge_date,
      cancelledAt: subscriber.cancelled_at,
      createdAt: subscriber.created_at,
      updatedAt: subscriber.updated_at,
      // Other
      tags: subscriber.tags || [],
      skipCount: subscriber.skip_count || 0,
      delayCount: subscriber.delay_count || 0,
      acquisitionSource: subscriber.acquisition_source,
      cancelReason: subscriber.cancel_reason,
      currentProductSequence: subscriber.current_product_sequence,
      migrationStatus: subscriber.migration_status,
      // Shipments
      shipments: transformedShipments,
    }

    return NextResponse.json(transformed)
  } catch (error) {
    return handleApiError(error, 'Subscriber Detail')
  }
}

/**
 * PATCH /api/subscribers/[id]
 * Update subscriber with full admin editing capabilities
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { orgId, userId } = await auth()
  const { id } = await params

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    const body = await request.json()

    // Verify subscriber exists and belongs to org
    const { data: existing, error: fetchError } = await supabase
      .from('subscribers')
      .select('id, organization_id, email')
      .eq('id', id)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }

    // Build update object from allowed fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // Personal info
    if (body.firstName !== undefined) updateData.first_name = body.firstName
    if (body.lastName !== undefined) updateData.last_name = body.lastName
    if (body.email !== undefined) updateData.email = body.email
    if (body.phone !== undefined) updateData.phone = body.phone

    // Address (can be sent as nested object or flat)
    if (body.address) {
      if (body.address.address1 !== undefined) updateData.address1 = body.address.address1
      if (body.address.address2 !== undefined) updateData.address2 = body.address.address2
      if (body.address.city !== undefined) updateData.city = body.address.city
      if (body.address.state !== undefined) updateData.state = body.address.state
      if (body.address.zip !== undefined) updateData.zip = body.address.zip
      if (body.address.country !== undefined) updateData.country = body.address.country
      if (body.address.phone !== undefined) updateData.phone = body.address.phone
    }
    if (body.address1 !== undefined) updateData.address1 = body.address1
    if (body.address2 !== undefined) updateData.address2 = body.address2
    if (body.city !== undefined) updateData.city = body.city
    if (body.state !== undefined) updateData.state = body.state
    if (body.zip !== undefined) updateData.zip = body.zip
    if (body.country !== undefined) updateData.country = body.country

    // Subscription details
    if (body.status !== undefined) updateData.status = body.status
    if (body.boxNumber !== undefined) updateData.box_number = body.boxNumber
    if (body.sku !== undefined) updateData.sku = body.sku
    if (body.frequency !== undefined) updateData.frequency = body.frequency
    if (body.shirtSize !== undefined) updateData.shirt_size = body.shirtSize

    // Flags
    if (body.isVip !== undefined) updateData.is_vip = body.isVip
    if (body.isInfluencer !== undefined) updateData.is_influencer = body.isInfluencer
    if (body.isProblem !== undefined) updateData.is_problem = body.isProblem
    if (body.isGift !== undefined) updateData.is_gift = body.isGift
    if (body.isAtRisk !== undefined) updateData.is_at_risk = body.isAtRisk
    if (body.atRisk !== undefined) updateData.at_risk = body.atRisk

    // Prepaid
    if (body.isPrepaid !== undefined) updateData.is_prepaid = body.isPrepaid
    if (body.prepaidTotal !== undefined) updateData.prepaid_total = body.prepaidTotal
    if (body.ordersRemaining !== undefined) updateData.orders_remaining = body.ordersRemaining

    // External IDs
    if (body.shopifyCustomerId !== undefined) updateData.shopify_customer_id = body.shopifyCustomerId
    if (body.rechargeCustomerId !== undefined) updateData.recharge_customer_id = body.rechargeCustomerId
    if (body.rechargeSubscriptionId !== undefined) updateData.recharge_subscription_id = body.rechargeSubscriptionId

    // Discord
    if (body.discordUserId !== undefined) updateData.discord_user_id = body.discordUserId
    if (body.discordUsername !== undefined) updateData.discord_username = body.discordUsername

    // Dates
    if (body.subscribedAt !== undefined) updateData.subscribed_at = body.subscribedAt
    if (body.nextChargeDate !== undefined) updateData.next_charge_date = body.nextChargeDate
    if (body.cancelledAt !== undefined) updateData.cancelled_at = body.cancelledAt

    // Other
    if (body.tags !== undefined) updateData.tags = body.tags
    if (body.skipCount !== undefined) updateData.skip_count = body.skipCount
    if (body.delayCount !== undefined) updateData.delay_count = body.delayCount
    if (body.acquisitionSource !== undefined) updateData.acquisition_source = body.acquisitionSource
    if (body.cancelReason !== undefined) updateData.cancel_reason = body.cancelReason
    if (body.currentProductSequence !== undefined) updateData.current_product_sequence = body.currentProductSequence

    // Perform update
    const { data: updated, error: updateError } = await supabase
      .from('subscribers')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Failed to update subscriber: ${updateError.message}`)
    }

    // Log the edit to admin audit log
    await supabase.from('admin_audit_log').insert({
      organization_id: orgId,
      action: 'edit',
      entity_type: 'subscriber',
      entity_id: id,
      performed_by: userId,
      details: {
        email: existing.email,
        fields_updated: Object.keys(updateData).filter(k => k !== 'updated_at'),
      },
    })

    return NextResponse.json({ success: true, subscriber: updated })
  } catch (error) {
    return handleApiError(error, 'Subscriber Update')
  }
}

/**
 * DELETE /api/subscribers/[id]
 * Soft delete a subscriber (uses database function for proper cascade)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { orgId, userId } = await auth()
  const { id } = await params

  if (!orgId || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    // Call the soft_delete_subscriber function
    const { data, error } = await supabase.rpc('soft_delete_subscriber', {
      p_subscriber_id: id,
      p_org_id: orgId,
      p_performed_by: userId,
    })

    if (error) {
      // Check if it's a "not found" error
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
      }
      throw new Error(`Failed to delete subscriber: ${error.message}`)
    }

    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, 'Subscriber Delete')
  }
}

// Helper function to generate tracking URLs
function getTrackingUrl(carrier: string, trackingNumber: string): string | undefined {
  const carrierLower = carrier.toLowerCase()
  
  if (carrierLower.includes('usps')) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`
  }
  if (carrierLower.includes('ups')) {
    return `https://www.ups.com/track?tracknum=${trackingNumber}`
  }
  if (carrierLower.includes('fedex')) {
    return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`
  }
  if (carrierLower.includes('dhl')) {
    return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${trackingNumber}`
  }
  
  return undefined
}
