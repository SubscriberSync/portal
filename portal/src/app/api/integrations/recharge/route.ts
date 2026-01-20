import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { handleApiError } from '@/lib/api-utils'

const RECHARGE_API_BASE = 'https://api.rechargeapps.com'

// Webhook topics we want to receive
const WEBHOOK_TOPICS = [
  'subscription/created',
  'subscription/updated',
  'subscription/activated',
  'subscription/cancelled',
  'subscription/skipped',
  'customer/created',
  'customer/updated',
  'charge/success',
]

// POST /api/integrations/recharge
// Connect Recharge by providing API key, sets up webhooks automatically
export async function POST(request: NextRequest) {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { apiKey } = await request.json()

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 400 })
    }

    // Verify the API key works by fetching token info
    const verifyResponse = await fetch(`${RECHARGE_API_BASE}/token_information`, {
      headers: {
        'X-Recharge-Access-Token': apiKey,
        'X-Recharge-Version': '2021-11',
      },
    })

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text()
      console.error('[Recharge] API verification failed:', verifyResponse.status, errorText)
      
      // Provide more specific error messages
      if (verifyResponse.status === 401) {
        return NextResponse.json({ 
          error: 'Invalid API key. Make sure you copied the full key and are using an Admin token.' 
        }, { status: 400 })
      }
      if (verifyResponse.status === 403) {
        return NextResponse.json({ 
          error: 'API key missing required permissions. Please enable read_customers and read_subscriptions.' 
        }, { status: 400 })
      }
      return NextResponse.json({ 
        error: `Recharge API error: ${verifyResponse.status}` 
      }, { status: 400 })
    }

    const tokenData = await verifyResponse.json()
    const tokenInfo = tokenData.token_information
    console.log('[Recharge] Connected with token:', tokenInfo?.name, 'Scopes:', tokenInfo?.scopes)

    // Build webhook URL with org_id
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.subscribersync.com'
    const webhookUrl = `${appUrl}/api/webhooks/recharge?org_id=${orgId}`

    // Register webhooks for each topic
    const webhookResults = await Promise.all(
      WEBHOOK_TOPICS.map(async (topic) => {
        try {
          const response = await fetch(`${RECHARGE_API_BASE}/webhooks`, {
            method: 'POST',
            headers: {
              'X-Recharge-Access-Token': apiKey,
              'X-Recharge-Version': '2021-11',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              address: webhookUrl,
              topic: topic,
            }),
          })

          if (response.ok) {
            return { topic, success: true }
          } else {
            // Webhook might already exist
            const error = await response.text()
            if (error.includes('already exists')) {
              return { topic, success: true, existed: true }
            }
            return { topic, success: false, error }
          }
        } catch (err) {
          return { topic, success: false, error: String(err) }
        }
      })
    )

    const successCount = webhookResults.filter((r) => r.success).length
    console.log(`[Recharge] Registered ${successCount}/${WEBHOOK_TOPICS.length} webhooks`)

    // Store integration in Supabase
    const supabase = createServiceClient()

    await supabase.from('integrations').upsert(
      {
        organization_id: orgId,
        type: 'recharge',
        credentials_encrypted: {
          api_key: apiKey,
          token_name: tokenInfo?.name,
        },
        connected: true,
        last_sync_at: new Date().toISOString(),
      },
      {
        onConflict: 'organization_id,type',
      }
    )

    // Do initial sync - fetch all customers and subscriptions
    const syncResult = await initialSync(orgId, apiKey)

    return NextResponse.json({
      success: true,
      tokenName: tokenInfo?.name,
      webhooks: successCount,
      initialSync: syncResult,
    })
  } catch (error) {
    return handleApiError(error, 'Recharge', 'Connection failed')
  }
}

// Initial sync - pull all existing subscriptions (including cancelled/expired with remaining shipments)
async function initialSync(
  orgId: string,
  apiKey: string
): Promise<{ customers: number; subscriptions: number }> {
  const supabase = createServiceClient()
  let customerCount = 0
  let subscriptionCount = 0

  try {
    // Fetch customers with pagination
    let nextCursor: string | null = null
    do {
      const url = new URL(`${RECHARGE_API_BASE}/customers`)
      url.searchParams.set('limit', '250')
      if (nextCursor) url.searchParams.set('cursor', nextCursor)

      const response = await fetch(url.toString(), {
        headers: {
          'X-Recharge-Access-Token': apiKey,
          'X-Recharge-Version': '2021-11',
        },
      })

      if (!response.ok) break

      const data = await response.json()
      const customers = data.customers || []

      // Upsert customers to subscribers table
      for (const customer of customers) {
        await supabase.from('subscribers').upsert(
          {
            organization_id: orgId,
            email: customer.email.toLowerCase(),
            first_name: customer.first_name,
            last_name: customer.last_name,
            phone: customer.phone || null,
            address1: customer.billing_address1 || null,
            address2: customer.billing_address2 || null,
            city: customer.billing_city || null,
            state: customer.billing_province || null,
            zip: customer.billing_zip || null,
            country: customer.billing_country || 'US',
            recharge_customer_id: customer.id.toString(),
            shopify_customer_id: customer.shopify_customer_id?.toString() || null,
            subscribed_at: customer.created_at,
            migration_status: 'pending',
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'organization_id,email',
          }
        )
        customerCount++
      }

      // Check for next page
      nextCursor = data.next_cursor || null
    } while (nextCursor)

    // Fetch ALL subscriptions (not just ACTIVE) to include cancelled/expired with remaining shipments
    // We need to fetch each status separately since Recharge doesn't support multiple statuses
    const statuses = ['ACTIVE', 'CANCELLED', 'EXPIRED']

    for (const status of statuses) {
      nextCursor = null
      do {
        const url = new URL(`${RECHARGE_API_BASE}/subscriptions`)
        url.searchParams.set('limit', '250')
        url.searchParams.set('status', status)
        if (nextCursor) url.searchParams.set('cursor', nextCursor)

        const response = await fetch(url.toString(), {
          headers: {
            'X-Recharge-Access-Token': apiKey,
            'X-Recharge-Version': '2021-11',
          },
        })

        if (!response.ok) break

        const data = await response.json()
        const subscriptions = data.subscriptions || []

        // Update subscriber records with subscription data
        for (const sub of subscriptions) {
          const frequency = mapFrequency(sub.order_interval_unit, sub.order_interval_frequency)

          // Determine if this is a prepaid subscription and calculate remaining shipments
          const isPrepaid = detectPrepaidSubscription(sub)
          const prepaidTotal = isPrepaid ? calculatePrepaidTotal(sub) : null

          // Get charge count to calculate orders remaining
          const chargeCount = await fetchChargeCount(apiKey, sub.customer_id, sub.id)
          const ordersRemaining = prepaidTotal ? Math.max(0, prepaidTotal - chargeCount) : null

          // Determine effective status:
          // - ACTIVE subscriptions are always Active
          // - CANCELLED subscriptions are Cancelled (user chose to cancel)
          // - EXPIRED subscriptions with orders remaining are Active (prepaid still delivering)
          // - EXPIRED subscriptions with no orders remaining are Expired
          let effectiveStatus: 'Active' | 'Paused' | 'Cancelled' | 'Expired' = 'Active'
          if (sub.status === 'CANCELLED') {
            // True cancellation - user cancelled
            effectiveStatus = 'Cancelled'
          } else if (sub.status === 'EXPIRED') {
            // Expired could mean prepaid finished OR prepaid still has remaining
            effectiveStatus = (ordersRemaining && ordersRemaining > 0) ? 'Active' : 'Expired'
          }

          await supabase
            .from('subscribers')
            .update({
              status: effectiveStatus,
              sku: sub.sku || sub.product_title,
              frequency: frequency,
              is_prepaid: isPrepaid,
              prepaid_total: prepaidTotal,
              orders_remaining: ordersRemaining,
              recharge_subscription_id: sub.id.toString(),
              cancelled_at: sub.cancelled_at ? new Date(sub.cancelled_at).toISOString() : null,
              cancel_reason: sub.cancellation_reason || null,
              next_charge_date: sub.next_charge_scheduled_at || null,
              updated_at: new Date().toISOString(),
            })
            .eq('organization_id', orgId)
            .eq('recharge_customer_id', sub.customer_id.toString())

          subscriptionCount++
        }

        nextCursor = data.next_cursor || null
      } while (nextCursor)
    }

    console.log(`[Recharge] Initial sync: ${customerCount} customers, ${subscriptionCount} subscriptions`)
  } catch (error) {
    console.error('[Recharge] Initial sync error:', error instanceof Error ? error.message : error)
  }

  return { customers: customerCount, subscriptions: subscriptionCount }
}

// Detect if a subscription is prepaid based on properties or charge interval
function detectPrepaidSubscription(sub: {
  charge_interval_frequency?: number
  order_interval_frequency?: number
  order_interval_unit?: string
  properties?: Array<{ name: string; value: string }>
}): boolean {
  // Check for prepaid property
  const prepaidProp = sub.properties?.find(
    p => p.name.toLowerCase().includes('prepaid') || p.name.toLowerCase().includes('subscription_type')
  )
  if (prepaidProp?.value?.toLowerCase().includes('prepaid')) {
    return true
  }

  // Check if charge interval differs from order interval (prepaid pays once, ships multiple)
  // e.g., charge every 12 months, ship every 1 month = 12 shipments prepaid
  if (sub.charge_interval_frequency && sub.order_interval_frequency) {
    if (sub.charge_interval_frequency > sub.order_interval_frequency) {
      return true
    }
  }

  return false
}

// Calculate total shipments for prepaid subscription
function calculatePrepaidTotal(sub: {
  charge_interval_frequency?: number
  order_interval_frequency?: number
  order_interval_unit?: string
  properties?: Array<{ name: string; value: string }>
}): number {
  // Check for explicit total in properties
  const totalProp = sub.properties?.find(
    p => p.name.toLowerCase().includes('total') ||
         p.name.toLowerCase().includes('episodes') ||
         p.name.toLowerCase().includes('shipments')
  )
  if (totalProp) {
    const num = parseInt(totalProp.value, 10)
    if (!isNaN(num) && num > 0) return num
  }

  // Calculate from charge/order interval ratio
  if (sub.charge_interval_frequency && sub.order_interval_frequency) {
    return Math.floor(sub.charge_interval_frequency / sub.order_interval_frequency)
  }

  // Default for common prepaid scenarios
  return 12 // Assume yearly prepaid with monthly shipments
}

// Fetch count of successful charges for a subscription
async function fetchChargeCount(
  apiKey: string,
  customerId: number,
  subscriptionId: number
): Promise<number> {
  try {
    const url = new URL(`${RECHARGE_API_BASE}/charges`)
    url.searchParams.set('customer_id', customerId.toString())
    url.searchParams.set('subscription_id', subscriptionId.toString())
    url.searchParams.set('status', 'SUCCESS')
    url.searchParams.set('limit', '250')

    const response = await fetch(url.toString(), {
      headers: {
        'X-Recharge-Access-Token': apiKey,
        'X-Recharge-Version': '2021-11',
      },
    })

    if (!response.ok) return 0

    const data = await response.json()
    return (data.charges || []).length
  } catch {
    return 0
  }
}

function mapFrequency(unit: string, frequency: number): 'Monthly' | 'Quarterly' | 'Yearly' | null {
  if (unit === 'month') {
    if (frequency === 1) return 'Monthly'
    if (frequency === 3) return 'Quarterly'
    if (frequency === 12) return 'Yearly'
  }
  return null
}

// GET /api/integrations/recharge
// Check connection status
export async function GET() {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { data } = await supabase
    .from('integrations')
    .select('connected, last_sync_at, credentials_encrypted')
    .eq('organization_id', orgId)
    .eq('type', 'recharge')
    .single()

  if (!data) {
    return NextResponse.json({ connected: false })
  }

  return NextResponse.json({
    connected: data.connected,
    lastSync: data.last_sync_at,
    tokenName: (data.credentials_encrypted as { token_name?: string })?.token_name,
  })
}

// PUT /api/integrations/recharge
// Trigger a resync without disconnecting
export async function PUT() {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Get existing credentials
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

  const apiKey = integration.credentials_encrypted.api_key as string

  try {
    // Run the sync
    const syncResult = await initialSync(orgId, apiKey)

    // Update last sync time
    await supabase
      .from('integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('organization_id', orgId)
      .eq('type', 'recharge')

    return NextResponse.json({
      success: true,
      ...syncResult,
    })
  } catch (error) {
    return handleApiError(error, 'Recharge Resync', 'Resync failed')
  }
}
