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

    // Verify the API key works by fetching shop info
    const verifyResponse = await fetch(`${RECHARGE_API_BASE}/shop`, {
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

    const shopData = await verifyResponse.json()
    console.log('[Recharge] Connected to shop:', shopData.shop?.name)

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
          shop_name: shopData.shop?.name,
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
      shop: shopData.shop?.name,
      webhooks: successCount,
      initialSync: syncResult,
    })
  } catch (error) {
    return handleApiError(error, 'Recharge', 'Connection failed')
  }
}

// Initial sync - pull all existing subscriptions
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

    // Fetch subscriptions
    nextCursor = null
    do {
      const url = new URL(`${RECHARGE_API_BASE}/subscriptions`)
      url.searchParams.set('limit', '250')
      url.searchParams.set('status', 'ACTIVE')
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

        await supabase
          .from('subscribers')
          .update({
            status: 'Active',
            sku: sub.sku || sub.product_title,
            frequency: frequency,
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', orgId)
          .eq('recharge_customer_id', sub.customer_id.toString())

        subscriptionCount++
      }

      nextCursor = data.next_cursor || null
    } while (nextCursor)

    console.log(`[Recharge] Initial sync: ${customerCount} customers, ${subscriptionCount} subscriptions`)
  } catch (error) {
    console.error('[Recharge] Initial sync error:', error instanceof Error ? error.message : error)
  }

  return { customers: customerCount, subscriptions: subscriptionCount }
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
    shopName: (data.credentials_encrypted as { shop_name?: string })?.shop_name,
  })
}
