import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { handleApiError } from '@/lib/api-utils'

const RECHARGE_API_BASE = 'https://api.rechargeapps.com'

// POST /api/integrations/recharge/recalculate
// Recalculate orders_remaining for prepaid subscriptions by fetching actual charge counts
// This is slower but more accurate than the time-based estimation
export async function POST(request: NextRequest) {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Get Recharge credentials
  const { data: integration } = await supabase
    .from('integrations')
    .select('credentials_encrypted')
    .eq('organization_id', orgId)
    .eq('type', 'recharge')
    .eq('connected', true)
    .single()

  if (!integration?.credentials_encrypted) {
    return NextResponse.json({ error: 'Recharge not connected' }, { status: 400 })
  }

  const apiKey = (integration.credentials_encrypted as { api_key: string }).api_key

  try {
    // Get all prepaid subscribers for this org
    const { data: prepaidSubscribers, error: subError } = await supabase
      .from('subscribers')
      .select('id, recharge_customer_id, recharge_subscription_id, prepaid_total, orders_remaining')
      .eq('organization_id', orgId)
      .eq('is_prepaid', true)
      .not('recharge_subscription_id', 'is', null)

    if (subError) throw subError

    if (!prepaidSubscribers || prepaidSubscribers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No prepaid subscribers to recalculate',
        updated: 0,
      })
    }

    console.log(`[Recharge Recalculate] Processing ${prepaidSubscribers.length} prepaid subscribers`)

    let updatedCount = 0
    const errors: string[] = []

    // Process in batches to avoid rate limiting
    for (const subscriber of prepaidSubscribers) {
      try {
        const customerId = subscriber.recharge_customer_id
        const subscriptionId = subscriber.recharge_subscription_id
        const prepaidTotal = subscriber.prepaid_total

        if (!customerId || !subscriptionId || !prepaidTotal) continue

        // Fetch actual charge count from Recharge API
        const chargeCount = await fetchChargeCountAccurate(apiKey, parseInt(customerId), parseInt(subscriptionId))

        // Calculate orders remaining
        const ordersRemaining = Math.max(0, prepaidTotal - chargeCount)

        // Determine if subscription should be marked as expired
        const newStatus = ordersRemaining === 0 ? 'Expired' : undefined

        // Update subscriber
        const updateData: Record<string, unknown> = {
          orders_remaining: ordersRemaining,
          updated_at: new Date().toISOString(),
        }
        if (newStatus) {
          updateData.status = newStatus
        }

        await supabase
          .from('subscribers')
          .update(updateData)
          .eq('id', subscriber.id)

        updatedCount++

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (err) {
        const errorMsg = `Subscriber ${subscriber.id}: ${err instanceof Error ? err.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error(`[Recharge Recalculate] ${errorMsg}`)
      }
    }

    console.log(`[Recharge Recalculate] Updated ${updatedCount} subscribers`)

    return NextResponse.json({
      success: true,
      total: prepaidSubscribers.length,
      updated: updatedCount,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    return handleApiError(error, 'Recharge Recalculate', 'Recalculation failed')
  }
}

// Fetch accurate charge count by paginating through all charges
async function fetchChargeCountAccurate(
  apiKey: string,
  customerId: number,
  subscriptionId: number
): Promise<number> {
  let totalCount = 0
  let nextCursor: string | null = null

  do {
    const url = new URL(`${RECHARGE_API_BASE}/charges`)
    url.searchParams.set('customer_id', customerId.toString())
    url.searchParams.set('subscription_id', subscriptionId.toString())
    url.searchParams.set('status', 'SUCCESS')
    url.searchParams.set('limit', '250')
    if (nextCursor) url.searchParams.set('cursor', nextCursor)

    const response = await fetch(url.toString(), {
      headers: {
        'X-Recharge-Access-Token': apiKey,
        'X-Recharge-Version': '2021-11',
      },
    })

    if (!response.ok) {
      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000
        await new Promise(resolve => setTimeout(resolve, delay))
        continue // Retry same request
      }
      throw new Error(`Recharge API error: ${response.status}`)
    }

    const data = await response.json()
    totalCount += (data.charges || []).length
    nextCursor = data.next_cursor || null
  } while (nextCursor)

  return totalCount
}
