// Klaviyo Sync - Push subscriber data to Klaviyo profiles
// Uses OAuth access tokens stored in integrations table

import { createServiceClient } from './supabase/service'

const KLAVIYO_API_BASE = 'https://a.klaviyo.com/api'

// Subscriber type matching Supabase schema
export interface Subscriber {
  id: string
  organization_id: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  address1?: string
  address2?: string
  city?: string
  state?: string
  zip?: string
  country?: string
  status: 'Active' | 'Paused' | 'Cancelled' | 'Expired'
  box_number: number
  shirt_size?: string
  frequency?: 'Monthly' | 'Quarterly' | 'Yearly'
  sku?: string
  acquisition_source?: string
  cancel_reason?: string
  tags?: string[]
  discord_user_id?: string
  subscribed_at?: string
  is_vip?: boolean
  is_influencer?: boolean
  is_problem?: boolean
  is_gift?: boolean
  is_at_risk?: boolean
  skip_count?: number
  delay_count?: number
  recharge_customer_id?: string
  shopify_customer_id?: string
}

// Computed fields for Klaviyo
function computeJourneyStage(boxNumber: number, totalBoxes: number = 12): string {
  const progress = boxNumber / totalBoxes
  if (progress <= 0.25) return 'early'
  if (progress <= 0.5) return 'middle'
  if (progress < 1) return 'late'
  return 'complete'
}

function computeContentUnlock(sku: string | undefined, boxNumber: number): string {
  // Generate content unlock key based on SKU and episode
  const baseKey = sku?.replace(/[^a-zA-Z0-9]/g, '') || 'default'
  return `${baseKey}_ep${boxNumber}`
}

// Build Klaviyo profile properties from subscriber
export function buildKlaviyoProperties(subscriber: Subscriber, totalBoxes: number = 12) {
  const boxNumber = subscriber.box_number || 1
  const journeyStage = computeJourneyStage(boxNumber, totalBoxes)
  const boxesRemaining = Math.max(0, totalBoxes - boxNumber)
  const nextBox = Math.min(boxNumber + 1, totalBoxes)
  const isDigital = subscriber.sku?.toLowerCase().includes('digital') || false

  return {
    // Subscription status
    subscription_status: subscriber.status,
    is_at_risk: subscriber.is_at_risk || false,

    // Episode progress
    box_number: boxNumber,
    next_box: nextBox,
    total_boxes: totalBoxes,
    boxes_remaining: boxesRemaining,
    journey_stage: journeyStage,
    content_unlock: computeContentUnlock(subscriber.sku, boxNumber),

    // Product & SKU
    sku: subscriber.sku || null,
    is_digital: isDigital,

    // Billing & Frequency
    frequency: subscriber.frequency || null,
    is_yearly: subscriber.frequency === 'Yearly',
    is_quarterly: subscriber.frequency === 'Quarterly',

    // Engagement metrics
    skip_count: subscriber.skip_count || 0,
    delay_count: subscriber.delay_count || 0,
    has_discord: !!subscriber.discord_user_id,
    discord_user_id: subscriber.discord_user_id || null,

    // Customer tags as booleans
    is_vip: subscriber.is_vip || false,
    is_influencer: subscriber.is_influencer || false,
    is_problem: subscriber.is_problem || false,
    is_gift: subscriber.is_gift || false,

    // Demographics
    state: subscriber.state || null,
    country: subscriber.country || 'US',
    shirt_size: subscriber.shirt_size || null,
    acquisition_source: subscriber.acquisition_source || null,

    // Cancellation
    cancel_reason: subscriber.cancel_reason || null,

    // Identifiers for cross-referencing
    recharge_customer_id: subscriber.recharge_customer_id || null,
    shopify_customer_id: subscriber.shopify_customer_id || null,
  }
}

// Get Klaviyo access token for an organization
async function getKlaviyoToken(organizationId: string): Promise<string | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('integrations')
    .select('credentials_encrypted')
    .eq('organization_id', organizationId)
    .eq('type', 'klaviyo')
    .eq('connected', true)
    .single()

  if (error || !data?.credentials_encrypted) {
    console.error('[Klaviyo Sync] No Klaviyo integration found:', error)
    return null
  }

  // credentials_encrypted is stored as JSONB with access_token, refresh_token, expires_at
  const credentials = data.credentials_encrypted as {
    access_token: string
    refresh_token: string
    expires_at: string
  }

  // Check if token is expired (with 5 min buffer)
  const expiresAt = new Date(credentials.expires_at)
  const now = new Date()
  const bufferMs = 5 * 60 * 1000

  if (expiresAt.getTime() - bufferMs < now.getTime()) {
    // Token expired or expiring soon, refresh it
    const refreshed = await refreshKlaviyoToken(organizationId, credentials.refresh_token)
    return refreshed
  }

  return credentials.access_token
}

// Refresh Klaviyo token and update in database
async function refreshKlaviyoToken(organizationId: string, refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://a.klaviyo.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.KLAVIYO_CLIENT_ID!,
        client_secret: process.env.KLAVIYO_CLIENT_SECRET!,
      }).toString(),
    })

    if (!response.ok) {
      console.error('[Klaviyo Sync] Token refresh failed:', await response.text())
      return null
    }

    const tokens = await response.json()
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Update token in database
    const supabase = createServiceClient()
    await supabase
      .from('integrations')
      .update({
        credentials_encrypted: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
        },
        last_sync_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('type', 'klaviyo')

    return tokens.access_token
  } catch (error) {
    console.error('[Klaviyo Sync] Refresh error:', error)
    return null
  }
}

// Create or update a profile in Klaviyo
export async function syncSubscriberToKlaviyo(
  subscriber: Subscriber,
  totalBoxes: number = 12
): Promise<{ success: boolean; profileId?: string; error?: string }> {
  const accessToken = await getKlaviyoToken(subscriber.organization_id)

  if (!accessToken) {
    return { success: false, error: 'No Klaviyo access token' }
  }

  const properties = buildKlaviyoProperties(subscriber, totalBoxes)

  // Klaviyo API v2024-02-15 format
  const payload = {
    data: {
      type: 'profile',
      attributes: {
        email: subscriber.email,
        first_name: subscriber.first_name || undefined,
        last_name: subscriber.last_name || undefined,
        phone_number: subscriber.phone || undefined,
        location: {
          address1: subscriber.address1 || undefined,
          address2: subscriber.address2 || undefined,
          city: subscriber.city || undefined,
          region: subscriber.state || undefined,
          zip: subscriber.zip || undefined,
          country: subscriber.country || 'US',
        },
        properties: properties,
      },
    },
  }

  try {
    // Use upsert endpoint - creates if not exists, updates if exists
    const response = await fetch(`${KLAVIYO_API_BASE}/profile-import/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'revision': '2024-02-15',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Klaviyo Sync] Profile sync failed:', errorText)
      return { success: false, error: errorText }
    }

    const result = await response.json()
    return { success: true, profileId: result.data?.id }
  } catch (error) {
    console.error('[Klaviyo Sync] Error:', error)
    return { success: false, error: String(error) }
  }
}

// Bulk sync all subscribers for an organization
export async function syncAllSubscribersToKlaviyo(
  organizationId: string,
  totalBoxes: number = 12
): Promise<{ synced: number; failed: number; errors: string[] }> {
  const supabase = createServiceClient()

  // Get all active/paused subscribers
  const { data: subscribers, error } = await supabase
    .from('subscribers')
    .select('*')
    .eq('organization_id', organizationId)
    .in('status', ['Active', 'Paused'])

  if (error || !subscribers) {
    return { synced: 0, failed: 0, errors: [error?.message || 'Failed to fetch subscribers'] }
  }

  let synced = 0
  let failed = 0
  const errors: string[] = []

  // Process in batches of 10 to avoid rate limits
  const batchSize = 10
  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize)

    const results = await Promise.all(
      batch.map(sub => syncSubscriberToKlaviyo(sub as Subscriber, totalBoxes))
    )

    results.forEach((result, idx) => {
      if (result.success) {
        synced++
      } else {
        failed++
        errors.push(`${batch[idx].email}: ${result.error}`)
      }
    })

    // Small delay between batches
    if (i + batchSize < subscribers.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  // Update last sync timestamp
  await supabase
    .from('integrations')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('organization_id', organizationId)
    .eq('type', 'klaviyo')

  return { synced, failed, errors }
}

// Sync a single subscriber by email (useful for webhooks/triggers)
export async function syncSubscriberByEmail(
  organizationId: string,
  email: string,
  totalBoxes: number = 12
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient()

  const { data: subscriber, error } = await supabase
    .from('subscribers')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('email', email)
    .single()

  if (error || !subscriber) {
    return { success: false, error: error?.message || 'Subscriber not found' }
  }

  return syncSubscriberToKlaviyo(subscriber as Subscriber, totalBoxes)
}
