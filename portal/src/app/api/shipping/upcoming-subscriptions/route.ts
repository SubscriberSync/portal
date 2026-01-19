import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { handleApiError } from '@/lib/api-utils'
import { getUpcomingCharges, RechargeCredentials } from '@/lib/recharge'

export const dynamic = 'force-dynamic'

// GET /api/shipping/upcoming-subscriptions
// Fetches upcoming subscription charges from Recharge and matches them to customers
// Used to warn when a one-off order customer has a subscription coming soon
export async function GET(request: NextRequest) {
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

    // Get days ahead from query (default 5)
    const daysAhead = parseInt(request.nextUrl.searchParams.get('days') || '5', 10)

    // Get Recharge credentials
    const { data: integration } = await supabase
      .from('integrations')
      .select('credentials_encrypted')
      .eq('organization_id', organization.id)
      .eq('type', 'recharge')
      .eq('connected', true)
      .single()

    if (!integration?.credentials_encrypted?.apiKey) {
      return NextResponse.json({
        error: 'Recharge not connected',
        upcomingByEmail: {}
      }, { status: 200 })
    }

    const credentials: RechargeCredentials = {
      apiKey: integration.credentials_encrypted.apiKey as string,
    }

    // Fetch upcoming charges from Recharge
    const upcomingCharges = await getUpcomingCharges(credentials, daysAhead)

    // Build a map of email -> upcoming charges
    // We need to match by Recharge customer ID to our subscribers
    const upcomingByCustomerId = new Map<string, {
      scheduledAt: string
      productTitle: string
      daysUntil: number
    }[]>()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const charge of upcomingCharges) {
      const scheduledDate = new Date(charge.scheduled_at)
      const daysUntil = Math.ceil((scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      const customerId = charge.customer_id.toString()
      const existing = upcomingByCustomerId.get(customerId) || []

      existing.push({
        scheduledAt: charge.scheduled_at,
        productTitle: charge.line_items?.[0]?.title || 'Subscription',
        daysUntil,
      })

      upcomingByCustomerId.set(customerId, existing)
    }

    // Get our subscribers with Recharge customer IDs
    const rechargeCustomerIds = Array.from(upcomingByCustomerId.keys())

    if (rechargeCustomerIds.length === 0) {
      return NextResponse.json({ upcomingByEmail: {} })
    }

    const { data: subscribers } = await supabase
      .from('subscribers')
      .select('id, email, recharge_customer_id')
      .eq('organization_id', organization.id)
      .in('recharge_customer_id', rechargeCustomerIds)

    // Build final map by subscriber ID (more reliable than email)
    const upcomingBySubscriberId: Record<string, {
      scheduledAt: string
      productTitle: string
      daysUntil: number
    }[]> = {}

    for (const subscriber of subscribers || []) {
      if (subscriber.recharge_customer_id) {
        const charges = upcomingByCustomerId.get(subscriber.recharge_customer_id)
        if (charges) {
          upcomingBySubscriberId[subscriber.id] = charges
        }
      }
    }

    return NextResponse.json({
      upcomingBySubscriberId,
      totalUpcoming: upcomingCharges.length,
      daysAhead,
    })

  } catch (error) {
    console.error('[Upcoming Subscriptions] Error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: 'Failed to fetch upcoming subscriptions', upcomingBySubscriberId: {} },
      { status: 200 } // Return 200 with empty data so UI doesn't break
    )
  }
}
