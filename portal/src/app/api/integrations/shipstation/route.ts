import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOrganizationBySlug, upsertIntegration } from '@/lib/supabase/data'
import {
  verifyShipStationCredentials,
  subscribeWebhook,
  listWebhooks,
  getStores,
  getCarriers,
} from '@/lib/shipstation'

// POST /api/integrations/shipstation
// Connect ShipStation using API Key + API Secret
export async function POST(request: NextRequest) {
  const { orgSlug, orgId } = await auth()

  if (!orgSlug || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  try {
    const { apiKey, apiSecret } = await request.json()

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'API Key and API Secret are required' }, { status: 400 })
    }

    const credentials = { apiKey, apiSecret }

    // Verify credentials work
    const isValid = await verifyShipStationCredentials(credentials)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid ShipStation credentials' }, { status: 400 })
    }

    // Get stores and carriers for reference
    const [stores, carriers] = await Promise.all([
      getStores(credentials),
      getCarriers(credentials),
    ])

    console.log(`[ShipStation] Found ${stores.length} stores and ${carriers.length} carriers`)

    // Register webhooks for shipping notifications
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.subscribersync.com'
    const webhookUrl = `${appUrl}/api/webhooks/shipstation?org_id=${orgId}`

    // Check existing webhooks
    const existingWebhooks = await listWebhooks(credentials)
    const existingUrls = existingWebhooks.webhooks?.map(w => w.TargetUrl) || []

    // Only register webhooks if not already registered
    const webhooksToRegister: Array<{ event: 'ORDER_NOTIFY' | 'SHIP_NOTIFY'; name: string }> = [
      { event: 'SHIP_NOTIFY', name: 'SubscriberSync Ship Notification' },
      { event: 'ORDER_NOTIFY', name: 'SubscriberSync Order Notification' },
    ]

    let webhooksRegistered = 0
    for (const webhook of webhooksToRegister) {
      // Check if already registered
      if (existingUrls.includes(webhookUrl)) {
        webhooksRegistered++
        continue
      }

      try {
        await subscribeWebhook(credentials, webhookUrl, webhook.event, webhook.name)
        webhooksRegistered++
        console.log(`[ShipStation] Registered ${webhook.event} webhook`)
      } catch (error) {
        console.error(`[ShipStation] Failed to register ${webhook.event} webhook:`, error)
      }
    }

    console.log(`[ShipStation] Registered ${webhooksRegistered}/${webhooksToRegister.length} webhooks`)

    // Store the integration
    const integration = await upsertIntegration(orgId, 'shipstation', {
      credentials_encrypted: {
        apiKey,
        apiSecret,
        stores: stores.map(s => ({ id: s.storeId, name: s.name, marketplace: s.marketplaceName })),
        carriers: carriers.map(c => ({ code: c.code, name: c.name })),
      },
      connected: true,
      last_sync_at: new Date().toISOString(),
    })

    if (!integration) {
      return NextResponse.json({ error: 'Failed to save integration' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      stores: stores.length,
      carriers: carriers.length,
      webhooksRegistered,
    })
  } catch (error) {
    console.error('[ShipStation Integration] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to connect ShipStation' },
      { status: 500 }
    )
  }
}

// DELETE /api/integrations/shipstation
// Disconnect ShipStation
export async function DELETE() {
  const { orgSlug, orgId } = await auth()

  if (!orgSlug || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Mark integration as disconnected (don't delete credentials in case they want to reconnect)
    await upsertIntegration(orgId, 'shipstation', {
      connected: false,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ShipStation Integration] Disconnect error:', error)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }
}
