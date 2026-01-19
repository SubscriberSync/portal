import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'

export const dynamic = 'force-dynamic'

interface ShipmentGroup {
  key: string
  type: 'subscription' | 'one-off'
  sequenceId: number | null
  name: string
  count: number
}

interface ComboShipment {
  id: string
  type: 'Subscription' | 'One-Off'
  sequenceId: number | null
  name: string
}

interface Combo {
  email: string
  customerName: string
  shipments: ComboShipment[]
}

/**
 * GET /api/pack/overview
 * Returns groups of shipments and combos (customers with multiple shipments)
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

    // Get all unfulfilled shipments with subscriber info
    const { data: shipments, error } = await supabase
      .from('shipments')
      .select(`
        id,
        type,
        sequence_id,
        product_name,
        subscriber:subscribers(id, email, first_name, last_name)
      `)
      .eq('organization_id', organization.id)
      .in('status', ['Unfulfilled', 'Ready to Pack'])

    if (error) {
      console.error('[Pack Overview] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch shipments' }, { status: 500 })
    }

    // Group shipments by type and sequence
    const groupMap = new Map<string, ShipmentGroup>()
    
    shipments?.forEach(shipment => {
      const isSubscription = shipment.type === 'Subscription'
      const key = isSubscription 
        ? `episode-${shipment.sequence_id || 0}`
        : 'one-off'
      
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          key,
          type: isSubscription ? 'subscription' : 'one-off',
          sequenceId: isSubscription ? (shipment.sequence_id || null) : null,
          name: isSubscription 
            ? `Episode ${shipment.sequence_id || 'Unknown'}`
            : 'One-Off Orders',
          count: 0,
        })
      }
      
      const group = groupMap.get(key)!
      group.count++
    })

    // Find combos (subscribers with multiple shipments)
    const subscriberShipments = new Map<string, {
      email: string
      customerName: string
      shipments: ComboShipment[]
    }>()

    shipments?.forEach(shipment => {
      // Subscriber can be null, an object, or an array (from Supabase join)
      const subData = shipment.subscriber
      const sub = Array.isArray(subData) ? subData[0] : subData
      if (!sub?.email) return

      if (!subscriberShipments.has(sub.email)) {
        subscriberShipments.set(sub.email, {
          email: sub.email,
          customerName: `${sub.first_name || ''} ${sub.last_name || ''}`.trim() || sub.email,
          shipments: [],
        })
      }

      subscriberShipments.get(sub.email)!.shipments.push({
        id: shipment.id,
        type: shipment.type as 'Subscription' | 'One-Off',
        sequenceId: shipment.sequence_id,
        name: shipment.product_name || (shipment.type === 'Subscription' 
          ? `Episode ${shipment.sequence_id || 'Unknown'}`
          : 'One-Off Order'),
      })
    })

    // Filter to only combos (2+ shipments per subscriber)
    const combos: Combo[] = Array.from(subscriberShipments.values())
      .filter(sub => sub.shipments.length >= 2)

    // Sort groups by sequence ID
    const groups = Array.from(groupMap.values())
      .sort((a, b) => {
        if (a.type === 'one-off') return 1
        if (b.type === 'one-off') return -1
        return (a.sequenceId || 0) - (b.sequenceId || 0)
      })

    return NextResponse.json({
      groups,
      combos,
      totalShipments: shipments?.length || 0,
      comboCount: combos.length,
    })
  } catch (error) {
    console.error('[Pack Overview] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch overview' }, { status: 500 })
  }
}
