import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSubscriberWithShipments, Shipment } from '@/lib/supabase/data'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/subscribers/[id]
 * Get subscriber details with shipment history
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

    // Transform subscriber to expected format
    const transformed = {
      id: subscriber.id,
      firstName: subscriber.first_name || '',
      lastName: subscriber.last_name || '',
      email: subscriber.email,
      discordUsername: subscriber.discord_username,
      status: subscriber.status,
      boxNumber: subscriber.box_number,
      shirtSize: subscriber.shirt_size || '',
      tags: subscriber.tags || [],
      atRisk: subscriber.at_risk || false,
      subscribedAt: subscriber.created_at,
      address: {
        address1: subscriber.address1 || '',
        address2: subscriber.address2 || '',
        city: subscriber.city || '',
        state: subscriber.state || '',
        zip: subscriber.zip || '',
        country: subscriber.country || 'US',
        phone: subscriber.phone || '',
      },
      shipments: transformedShipments,
      rechargeCustomerId: subscriber.recharge_customer_id,
      shopifyCustomerId: subscriber.shopify_customer_id,
    }

    return NextResponse.json(transformed)
  } catch (error) {
    console.error('[Subscriber Detail] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
