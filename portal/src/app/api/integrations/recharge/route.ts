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
  'customer/activated',
  'customer/deactivated',
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
    console.log(`[Recharge] Registering webhooks for ${WEBHOOK_TOPICS.length} topics to: ${webhookUrl}`)
    const webhookResults = await Promise.all(
      WEBHOOK_TOPICS.map(async (topic) => {
        try {
          console.log(`[Recharge] Registering webhook for topic: ${topic}`)
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
            console.log(`[Recharge] ✓ Successfully registered webhook for ${topic}`)
            return { topic, success: true }
          } else {
            // Webhook might already exist
            const error = await response.text()
            console.log(`[Recharge] Webhook registration failed for ${topic}: ${response.status} - ${error}`)
            if (error.includes('already exists')) {
              console.log(`[Recharge] ✓ Webhook for ${topic} already exists`)
              return { topic, success: true, existed: true }
            }
            return { topic, success: false, error }
          }
        } catch (err) {
          console.error(`[Recharge] Exception registering webhook for ${topic}:`, err)
          return { topic, success: false, error: String(err) }
        }
      })
    )

    const successCount = webhookResults.filter((r) => r.success).length
    console.log(`[Recharge] Registered ${successCount}/${WEBHOOK_TOPICS.length} webhooks`)
    console.log(`[Recharge] Failed webhooks:`, webhookResults.filter(r => !r.success).map(r => ({ topic: r.topic, error: r.error })))

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
    // Fetch ALL customers with pagination
    // Note: Recharge's /customers endpoint doesn't support status filtering - it returns all customers by default
    let nextCursor: string | null = null
    let pageCount = 0
    const startTime = Date.now()

    console.log(`[Recharge] Starting customer sync for org ${orgId}`)

    do {
      pageCount++
      const url = new URL(`${RECHARGE_API_BASE}/customers`)
      url.searchParams.set('limit', '250')
      if (nextCursor) url.searchParams.set('cursor', nextCursor)

      console.log(`[Recharge] Fetching page ${pageCount} with URL: ${url.toString().replace(apiKey, '[REDACTED]')}`)

      const response = await fetch(url.toString(), {
        headers: {
          'X-Recharge-Access-Token': apiKey,
          'X-Recharge-Version': '2021-11',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[Recharge] Failed to fetch customers page ${pageCount}:`, response.status, errorText)
        break
      }

      const data = await response.json()
      const customers = data.customers || []

      console.log(`[Recharge] Page ${pageCount}: Fetched ${customers.length} customers (cursor: ${nextCursor || 'initial'})`)
      console.log(`[Recharge] Response has next_cursor: ${!!data.next_cursor}, previous_cursor: ${!!data.previous_cursor}`)

      if (customers.length === 0) {
        console.log(`[Recharge] No customers returned on page ${pageCount}, stopping pagination`)
        break
      }

      // Log first customer as sample
      if (customers.length > 0) {
        console.log(`[Recharge] Sample customer: ID ${customers[0].id}, Email: ${customers[0].email}, Status: ${customers[0].status || 'no status field'}`)
      }

      // Upsert customers to subscribers table
      // Note: We set all imported customers as 'Active' initially.
      // Webhooks will update status based on actual Recharge customer lifecycle events.
      let pageUpserts = 0
      for (const customer of customers) {
        try {
          const { error } = await supabase.from('subscribers').upsert(
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
              status: 'Active', // Set as Active initially - webhooks handle status changes
              migration_status: 'pending',
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'organization_id,email',
            }
          )

          if (error) {
            console.error(`[Recharge] Failed to upsert customer ${customer.id}:`, error)
          } else {
            pageUpserts++
          }
        } catch (err) {
          console.error(`[Recharge] Exception upserting customer ${customer.id}:`, err)
        }
      }

      console.log(`[Recharge] Page ${pageCount}: Successfully upserted ${pageUpserts}/${customers.length} customers`)
      customerCount += pageUpserts

      // Check for next page
      nextCursor = data.next_cursor || null

      // Safety check - don't fetch more than 100 pages (25,000 customers)
      if (pageCount >= 100) {
        console.warn(`[Recharge] Hit safety limit of 100 pages, stopping pagination`)
        break
      }

      // Small delay between pages to be respectful to the API
      if (nextCursor) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }

    } while (nextCursor)

    const duration = Date.now() - startTime
    console.log(`[Recharge] Customer sync completed: ${customerCount} customers across ${pageCount} pages in ${duration}ms`)

    // Fetch ALL subscriptions (not just ACTIVE) to include cancelled/expired with remaining shipments
    // We need to fetch each status separately since Recharge doesn't support multiple statuses
    const statuses = ['ACTIVE', 'CANCELLED', 'EXPIRED']
    console.log(`[Recharge] Starting subscription sync for statuses: ${statuses.join(', ')}`)

    for (const status of statuses) {
      console.log(`[Recharge] Fetching ${status} subscriptions`)
      let subCursor: string | null = null
      let subPageCount = 0

      do {
        subPageCount++
        const url = new URL(`${RECHARGE_API_BASE}/subscriptions`)
        url.searchParams.set('limit', '250')
        url.searchParams.set('status', status)
        if (subCursor) url.searchParams.set('cursor', subCursor)

        const response = await fetch(url.toString(), {
          headers: {
            'X-Recharge-Access-Token': apiKey,
            'X-Recharge-Version': '2021-11',
          },
        })

        if (!response.ok) {
          console.error(`[Recharge] Failed to fetch ${status} subscriptions page ${subPageCount}:`, response.status)
          break
        }

        const data = await response.json()
        const subscriptions = data.subscriptions || []

        console.log(`[Recharge] ${status} subscriptions page ${subPageCount}: ${subscriptions.length} subscriptions`)

        if (subscriptions.length === 0) {
          console.log(`[Recharge] No more ${status} subscriptions, moving to next status`)
          break
        }

        // Update subscriber records with subscription data
        let subUpdates = 0
        for (const sub of subscriptions) {
          try {
            const frequency = mapFrequency(sub.order_interval_unit, sub.order_interval_frequency)

            // Determine if this is a prepaid subscription and calculate remaining shipments
            const isPrepaid = detectPrepaidSubscription(sub)
            const prepaidTotal = isPrepaid ? calculatePrepaidTotal(sub) : null

            // Estimate orders delivered based on subscription creation date and order interval
            // This avoids making individual API calls per subscription (which is slow)
            // The charge/success webhook will update counts accurately going forward
            const ordersDelivered = isPrepaid ? estimateOrdersDelivered(sub) : null
            const ordersRemaining = prepaidTotal && ordersDelivered !== null
              ? Math.max(0, prepaidTotal - ordersDelivered)
              : null

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

            const { error } = await supabase
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

            if (error) {
              console.error(`[Recharge] Failed to update subscription ${sub.id}:`, error)
            } else {
              subUpdates++
            }

            subscriptionCount++
          } catch (err) {
            console.error(`[Recharge] Exception processing subscription ${sub.id}:`, err)
          }
        }

        console.log(`[Recharge] ${status} page ${subPageCount}: Updated ${subUpdates}/${subscriptions.length} subscribers`)

        subCursor = data.next_cursor || null

        // Safety check for subscriptions too
        if (subPageCount >= 100) {
          console.warn(`[Recharge] Hit safety limit for ${status} subscriptions, stopping`)
          break
        }

        // Small delay between pages
        if (subCursor) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

      } while (subCursor)

      console.log(`[Recharge] Completed ${status} subscriptions: ${subPageCount} pages`)
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

// Estimate how many orders have been delivered based on subscription creation date
// This is used for initial sync to avoid slow per-subscription API calls
// The charge/success webhook updates this accurately going forward
function estimateOrdersDelivered(sub: {
  created_at: string
  order_interval_unit: string
  order_interval_frequency: number
  status: string
  cancelled_at?: string | null
}): number {
  const createdAt = new Date(sub.created_at)
  const now = new Date()

  // If cancelled, count up to cancellation date instead of now
  const endDate = sub.cancelled_at ? new Date(sub.cancelled_at) : now

  // Calculate months elapsed
  const msElapsed = endDate.getTime() - createdAt.getTime()
  const daysElapsed = msElapsed / (1000 * 60 * 60 * 24)

  let intervalsElapsed = 0

  if (sub.order_interval_unit === 'month') {
    // For monthly intervals, calculate based on months
    const monthsElapsed = (endDate.getFullYear() - createdAt.getFullYear()) * 12
      + (endDate.getMonth() - createdAt.getMonth())
    intervalsElapsed = Math.floor(monthsElapsed / sub.order_interval_frequency)
  } else if (sub.order_interval_unit === 'week') {
    const weeksElapsed = Math.floor(daysElapsed / 7)
    intervalsElapsed = Math.floor(weeksElapsed / sub.order_interval_frequency)
  } else if (sub.order_interval_unit === 'day') {
    intervalsElapsed = Math.floor(daysElapsed / sub.order_interval_frequency)
  }

  // Add 1 for the initial order (subscription starts with first delivery)
  return Math.max(1, intervalsElapsed + 1)
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
// Check connection status and diagnostic info
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

  // Get some diagnostic counts
  const { count: subscriberCount } = await supabase
    .from('subscribers')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)

  const { count: withRechargeIdCount } = await supabase
    .from('subscribers')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .not('recharge_customer_id', 'is', null)

  return NextResponse.json({
    connected: data.connected,
    lastSync: data.last_sync_at,
    tokenName: (data.credentials_encrypted as { token_name?: string })?.token_name,
    diagnostics: {
      totalSubscribers: subscriberCount || 0,
      withRechargeId: withRechargeIdCount || 0,
    },
  })
}

// POST /api/integrations/recharge/test
// Test endpoint to check Recharge API directly
export async function PATCH(request: NextRequest) {
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
    // Test customer API
    console.log('[Recharge Test] Testing customer API...')
    const customerUrl = `${RECHARGE_API_BASE}/customers?limit=5`
    const customerResponse = await fetch(customerUrl, {
      headers: {
        'X-Recharge-Access-Token': apiKey,
        'X-Recharge-Version': '2021-11',
      },
    })

    if (!customerResponse.ok) {
      return NextResponse.json({
        error: `Customer API failed: ${customerResponse.status}`,
        response: await customerResponse.text()
      }, { status: 400 })
    }

    const customerData = await customerResponse.json()
    const customers = customerData.customers || []

    // Test subscription API
    console.log('[Recharge Test] Testing subscription API...')
    const subUrl = `${RECHARGE_API_BASE}/subscriptions?limit=5`
    const subResponse = await fetch(subUrl, {
      headers: {
        'X-Recharge-Access-Token': apiKey,
        'X-Recharge-Version': '2021-11',
      },
    })

    if (!subResponse.ok) {
      return NextResponse.json({
        error: `Subscription API failed: ${subResponse.status}`,
        response: await subResponse.text()
      }, { status: 400 })
    }

    const subData = await subResponse.json()
    const subscriptions = subData.subscriptions || []

    return NextResponse.json({
      success: true,
      testResults: {
        customers: {
          count: customers.length,
          hasNextCursor: !!customerData.next_cursor,
          sample: customers.slice(0, 2).map((c: any) => ({
            id: c.id,
            email: c.email,
            status: c.status || 'no status field',
            created_at: c.created_at
          }))
        },
        subscriptions: {
          count: subscriptions.length,
          hasNextCursor: !!subData.next_cursor,
          sample: subscriptions.slice(0, 2).map((s: any) => ({
            id: s.id,
            customer_id: s.customer_id,
            status: s.status,
            created_at: s.created_at
          }))
        }
      }
    })
  } catch (error) {
    return handleApiError(error, 'Recharge Test', 'Test failed')
  }
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
    diagnostics: {
      totalSubscribersAfterSync: await supabase
        .from('subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .then(({ count }) => count || 0),
      withRechargeIdAfterSync: await supabase
        .from('subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .not('recharge_customer_id', 'is', null)
        .then(({ count }) => count || 0),
    },
  })
} catch (error) {
    return handleApiError(error, 'Recharge Resync', 'Resync failed')
  }
}
