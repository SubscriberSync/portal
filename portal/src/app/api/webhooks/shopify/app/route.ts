import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { handleApiError } from '@/lib/api-utils'
import crypto from 'crypto'

/**
 * Shopify App Lifecycle & GDPR Compliance Webhooks
 * 
 * Handles:
 * - app/uninstalled: When merchant uninstalls the app
 * - customers/data_request: GDPR - merchant requests customer data
 * - customers/redact: GDPR - delete customer data
 * - shop/redact: GDPR - delete all shop data (48h after uninstall)
 */

type WebhookTopic =
  | 'app/uninstalled'
  | 'customers/data_request'
  | 'customers/redact'
  | 'shop/redact'

interface AppUninstalledPayload {
  id: number
  name: string
  email: string
  domain: string
  myshopify_domain: string
}

interface CustomerDataRequestPayload {
  shop_id: number
  shop_domain: string
  orders_requested: number[]
  customer: {
    id: number
    email: string
    phone: string
  }
  data_request: {
    id: number
  }
}

interface CustomerRedactPayload {
  shop_id: number
  shop_domain: string
  customer: {
    id: number
    email: string
    phone: string
  }
  orders_to_redact: number[]
}

interface ShopRedactPayload {
  shop_id: number
  shop_domain: string
}

/**
 * Verify Shopify webhook HMAC signature
 */
function verifyWebhookHmac(body: string, hmacHeader: string, secret: string): boolean {
  const calculated = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculated),
      Buffer.from(hmacHeader)
    )
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const orgId = request.nextUrl.searchParams.get('org_id')
  const topic = request.headers.get('X-Shopify-Topic') as WebhookTopic
  const hmacHeader = request.headers.get('X-Shopify-Hmac-Sha256')
  const shopDomain = request.headers.get('X-Shopify-Shop-Domain')

  console.log(`[Shopify App Webhook] Received ${topic} for org ${orgId || 'unknown'}`)

  // Get raw body for HMAC verification
  const body = await request.text()

  // Get webhook secret for verification
  const supabase = createServiceClient()
  
  // Try to verify with org-specific secret first
  let verified = false
  if (orgId) {
    const { data: integration } = await supabase
      .from('integrations')
      .select('credentials_encrypted')
      .eq('organization_id', orgId)
      .eq('type', 'shopify')
      .single()

    const webhookSecret = (integration?.credentials_encrypted as { webhook_secret?: string })?.webhook_secret
    if (webhookSecret && hmacHeader) {
      verified = verifyWebhookHmac(body, hmacHeader, webhookSecret)
    }
  }

  // Fall back to app-level secret
  if (!verified && hmacHeader) {
    const appSecret = process.env.SHOPIFY_CLIENT_SECRET
    if (appSecret) {
      verified = verifyWebhookHmac(body, hmacHeader, appSecret)
    }
  }

  if (!verified && hmacHeader) {
    console.error('[Shopify App Webhook] Invalid HMAC signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Parse payload
  let payload: AppUninstalledPayload | CustomerDataRequestPayload | CustomerRedactPayload | ShopRedactPayload
  try {
    payload = JSON.parse(body)
  } catch {
    console.error('[Shopify App Webhook] Invalid payload')
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  try {
    switch (topic) {
      case 'app/uninstalled':
        await handleAppUninstalled(supabase, orgId, shopDomain, payload as AppUninstalledPayload)
        break

      case 'customers/data_request':
        await handleCustomerDataRequest(supabase, orgId, payload as CustomerDataRequestPayload)
        break

      case 'customers/redact':
        await handleCustomerRedact(supabase, orgId, payload as CustomerRedactPayload)
        break

      case 'shop/redact':
        await handleShopRedact(supabase, payload as ShopRedactPayload)
        break

      default:
        console.log(`[Shopify App Webhook] Unhandled topic: ${topic}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'Shopify App Webhook')
  }
}

/**
 * Handle app uninstall
 * Mark integration as disconnected, log event
 */
async function handleAppUninstalled(
  supabase: ReturnType<typeof createServiceClient>,
  orgId: string | null,
  shopDomain: string | null,
  payload: AppUninstalledPayload
) {
  console.log('[Shopify App Webhook] App uninstalled for shop:', payload.myshopify_domain || shopDomain)

  // Find org by shop domain if orgId not provided
  let organizationId = orgId
  if (!organizationId && (payload.myshopify_domain || shopDomain)) {
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('shopify_shop_domain', payload.myshopify_domain || shopDomain)
      .single()
    
    organizationId = org?.id
  }

  if (!organizationId) {
    console.error('[Shopify App Webhook] Could not find organization for uninstall')
    return
  }

  // Mark integration as disconnected and clear sensitive credentials
  // Per Shopify requirements, access tokens should be deleted on uninstall
  await supabase
    .from('integrations')
    .update({
      connected: false,
      credentials_encrypted: {
        // Keep non-sensitive metadata for re-install detection
        shop: (payload.myshopify_domain || shopDomain),
        uninstalled_at: new Date().toISOString(),
        // Access token is removed - will need re-auth on reinstall
      },
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', organizationId)
    .eq('type', 'shopify')

  // Log the uninstall event
  await supabase
    .from('activity_log')
    .insert({
      organization_id: organizationId,
      event_type: 'integration.uninstalled',
      description: `Shopify app uninstalled from ${payload.myshopify_domain || shopDomain}`,
      metadata: {
        shop_domain: payload.myshopify_domain || shopDomain,
        shop_id: payload.id,
        shop_name: payload.name,
      },
    })

  console.log('[Shopify App Webhook] Marked integration as disconnected for org:', organizationId)
}

/**
 * Handle GDPR customer data request
 * Return customer data associated with the shop
 */
async function handleCustomerDataRequest(
  supabase: ReturnType<typeof createServiceClient>,
  orgId: string | null,
  payload: CustomerDataRequestPayload
) {
  console.log('[Shopify App Webhook] Customer data request for:', payload.customer.email)

  // Find org by shop domain if needed
  let organizationId = orgId
  if (!organizationId) {
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('shopify_shop_domain', payload.shop_domain)
      .single()
    
    organizationId = org?.id
  }

  if (!organizationId) {
    console.log('[Shopify App Webhook] No organization found for data request')
    return
  }

  // Log the request - actual data export would be handled separately
  // In a production app, you might email the data to the merchant
  await supabase
    .from('activity_log')
    .insert({
      organization_id: organizationId,
      event_type: 'gdpr.data_request',
      description: `GDPR data request received for customer ${payload.customer.email}`,
      metadata: {
        customer_id: payload.customer.id,
        customer_email: payload.customer.email,
        data_request_id: payload.data_request.id,
        orders_requested: payload.orders_requested,
      },
    })

  // In production, you would:
  // 1. Query all data for this customer
  // 2. Format it appropriately
  // 3. Send to merchant or provide via secure link
  console.log('[Shopify App Webhook] Customer data request logged, awaiting manual processing')
}

/**
 * Handle GDPR customer data redaction
 * Delete/anonymize customer data
 */
async function handleCustomerRedact(
  supabase: ReturnType<typeof createServiceClient>,
  orgId: string | null,
  payload: CustomerRedactPayload
) {
  console.log('[Shopify App Webhook] Customer redact request for:', payload.customer.email)

  // Find org by shop domain if needed
  let organizationId = orgId
  if (!organizationId) {
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('shopify_shop_domain', payload.shop_domain)
      .single()
    
    organizationId = org?.id
  }

  if (!organizationId) {
    console.log('[Shopify App Webhook] No organization found for redact request')
    return
  }

  // Anonymize subscriber data
  const { error } = await supabase
    .from('subscribers')
    .update({
      email: `redacted_${payload.customer.id}@redacted.local`,
      first_name: 'REDACTED',
      last_name: 'REDACTED',
      phone: null,
      address1: null,
      address2: null,
      city: null,
      state: null,
      zip: null,
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', organizationId)
    .eq('shopify_customer_id', payload.customer.id.toString())

  if (error) {
    console.error('[Shopify App Webhook] Failed to redact customer:', error)
  }

  // Log the redaction
  await supabase
    .from('activity_log')
    .insert({
      organization_id: organizationId,
      event_type: 'gdpr.customer_redact',
      description: `Customer data redacted for Shopify customer ID ${payload.customer.id}`,
      metadata: {
        customer_id: payload.customer.id,
        orders_redacted: payload.orders_to_redact,
      },
    })

  console.log('[Shopify App Webhook] Customer data redacted')
}

/**
 * Handle GDPR shop data redaction (48 hours after uninstall)
 * Delete all shop/organization data
 */
async function handleShopRedact(
  supabase: ReturnType<typeof createServiceClient>,
  payload: ShopRedactPayload
) {
  console.log('[Shopify App Webhook] Shop redact request for:', payload.shop_domain)

  // Find organization by shop domain
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('shopify_shop_domain', payload.shop_domain)
    .single()

  if (!org) {
    console.log('[Shopify App Webhook] No organization found for shop redact')
    return
  }

  const organizationId = org.id

  // Delete all related data in order (respecting foreign keys)
  // 1. Activity logs
  await supabase
    .from('activity_log')
    .delete()
    .eq('organization_id', organizationId)

  // 2. Shipments
  await supabase
    .from('shipments')
    .delete()
    .eq('organization_id', organizationId)

  // 3. Subscribers
  await supabase
    .from('subscribers')
    .delete()
    .eq('organization_id', organizationId)

  // 4. Integrations
  await supabase
    .from('integrations')
    .delete()
    .eq('organization_id', organizationId)

  // 5. Role mappings (Discord)
  await supabase
    .from('discord_role_mappings')
    .delete()
    .eq('organization_id', organizationId)

  // 6. Discord guild connections
  await supabase
    .from('discord_guilds')
    .delete()
    .eq('organization_id', organizationId)

  // 7. Organization onboarding data
  await supabase
    .from('intake_submissions')
    .delete()
    .eq('organization_id', organizationId)

  // 8. Finally, the organization itself
  await supabase
    .from('organizations')
    .delete()
    .eq('id', organizationId)

  console.log('[Shopify App Webhook] All shop data deleted for org:', organizationId)
}
