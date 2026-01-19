import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * GET /api/pack/ready-count
 * Get count of shipments ready to pack (unfulfilled status)
 */
export async function GET() {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()

    // Count unfulfilled shipments by type
    const { data: shipments, error } = await supabase
      .from('shipments')
      .select('type')
      .eq('organization_id', orgId)
      .eq('status', 'Unfulfilled')

    if (error) {
      console.error('[Pack Ready Count] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }

    const subscriptions = shipments?.filter(s => s.type === 'Subscription').length || 0
    const directOrders = shipments?.filter(s => s.type === 'One-Off').length || 0
    const total = subscriptions + directOrders

    return NextResponse.json({
      total,
      subscriptions,
      directOrders,
    })
  } catch (error) {
    console.error('[Pack Ready Count] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
