import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import {
  exchangeShopifyCode,
  getShopifyAppSecret,
  createClerkOrganization,
  createClerkInvitation,
  findClerkUserByEmail,
  addUserToOrganization,
  getClerkOrganization,
} from '@/lib/oauth'
import {
  getShopInfo,
  registerShopifyWebhook,
  SHOPIFY_WEBHOOK_TOPICS,
  SHOPIFY_APP_WEBHOOK_TOPICS,
  SHOPIFY_GDPR_WEBHOOK_TOPICS,
} from '@/lib/shopify'
import { getErrorMessage } from '@/lib/api-utils'

/**
 * Shopify App Store OAuth Callback Handler
 * 
 * This handles the OAuth callback after a merchant authorizes the app.
 * For new installs: Creates Clerk org, invites user, stores integration
 * For re-installs: Updates access token, redirects to portal
 */

interface InstallContext {
  shop: string
  isReinstall: boolean
  existingOrgId?: string
  existingOrgSlug?: string
  existingClerkOrgId?: string
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const shop = searchParams.get('shop')
  const hmac = searchParams.get('hmac')

  console.log('[Shopify Callback] Received callback for shop:', shop)

  // Get stored state and context from cookies
  const cookieStore = await cookies()
  const storedState = cookieStore.get('shopify_install_state')?.value
  const contextCookie = cookieStore.get('shopify_install_context')?.value

  // Clear cookies immediately
  cookieStore.delete('shopify_install_state')
  cookieStore.delete('shopify_install_context')

  // Validate state for CSRF protection
  if (!state || !storedState || state !== storedState) {
    console.error('[Shopify Callback] State mismatch')
    return NextResponse.redirect(
      new URL('/error?message=Invalid+state+parameter', request.url)
    )
  }

  // Validate required parameters
  if (!code || !shop) {
    console.error('[Shopify Callback] Missing code or shop')
    return NextResponse.redirect(
      new URL('/error?message=Missing+required+parameters', request.url)
    )
  }

  // Validate HMAC if present
  if (hmac) {
    let secret = ''
    try {
      secret = getShopifyAppSecret()
    } catch (error) {
      console.error('[Shopify Callback] Missing Shopify app secret', error)
    }
    if (secret && !validateCallbackHmac(searchParams, secret)) {
      console.error('[Shopify Callback] Invalid HMAC')
      return NextResponse.redirect(
        new URL('/error?message=Invalid+signature', request.url)
      )
    }
  }

  // Parse install context from cookie
  let context: InstallContext | null = null
  if (contextCookie) {
    try {
      context = JSON.parse(contextCookie)
    } catch {
      console.error('[Shopify Callback] Failed to parse context cookie')
    }
  }

  // IMPORTANT: Always check database for existing org as fallback
  // Cookies may not persist across cross-origin OAuth redirects
  // Also handles case where org was created manually before Shopify install
  const supabase = createServiceClient()
  if (!context?.isReinstall && shop) {
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id, slug')
      .eq('shopify_shop_domain', shop)
      .single()

    if (existingOrg) {
      console.log('[Shopify Callback] Found existing org via DB lookup:', existingOrg.id)
      context = {
        shop,
        isReinstall: true,
        existingOrgId: existingOrg.id,
        existingOrgSlug: existingOrg.slug,
        existingClerkOrgId: existingOrg.id, // id IS the Clerk org ID in this schema
      }
    }
  }

  try {
    // Exchange authorization code for access token
    const tokenData = await exchangeShopifyCode(shop, code)
    if (!tokenData) {
      console.error('[Shopify Callback] Token exchange failed')
      return NextResponse.redirect(
        new URL('/error?message=Failed+to+authorize+with+Shopify', request.url)
      )
    }

    // Fetch shop information
    const shopInfo = await getShopInfo(shop, tokenData.access_token)
    if (!shopInfo) {
      console.error('[Shopify Callback] Failed to fetch shop info')
      return NextResponse.redirect(
        new URL('/error?message=Failed+to+fetch+shop+information', request.url)
      )
    }

    console.log('[Shopify Callback] Shop info:', shopInfo.name, shopInfo.email)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://subscribersync.com'

    // Generate webhook secret
    const webhookSecret = crypto.randomBytes(32).toString('hex')

    // Handle re-install case
    if (context?.isReinstall && context.existingOrgId) {
      console.log('[Shopify Callback] Re-install detected for org:', context.existingOrgId)

      // Update the existing integration with new access token
      await supabase
        .from('integrations')
        .upsert({
          organization_id: context.existingOrgId,
          type: 'shopify',
          credentials_encrypted: {
            access_token: tokenData.access_token,
            shop: shop,
            scope: tokenData.scope,
            webhook_secret: webhookSecret,
          },
          connected: true,
          last_sync_at: new Date().toISOString(),
        }, {
          onConflict: 'organization_id,type',
        })

      // Re-register webhooks
      await registerAllWebhooks(shop, tokenData.access_token, appUrl, context.existingOrgId)

      // Redirect to portal
      return NextResponse.redirect(
        new URL(`/portal/${context.existingOrgSlug}?success=shopify_reconnected`, request.url)
      )
    }

    // New install - Check if user already exists in Clerk
    const existingUser = await findClerkUserByEmail(shopInfo.email)

    let clerkOrgId: string
    let orgSlug: string
    let redirectUrl: string

    if (existingUser) {
      // User exists - create org and add them directly
      console.log('[Shopify Callback] Existing Clerk user found:', existingUser.id)

      const clerkOrg = await createClerkOrganization(shopInfo)
      if (!clerkOrg) {
        return NextResponse.redirect(
          new URL('/error?message=Failed+to+create+organization', request.url)
        )
      }

      clerkOrgId = clerkOrg.id
      orgSlug = clerkOrg.slug

      // Add user to organization as admin
      await addUserToOrganization(clerkOrgId, existingUser.id, 'admin')

      // User can go directly to portal
      redirectUrl = `/portal/${orgSlug}?success=shopify_connected&new_install=true`
    } else {
      // New user - create org and invitation
      console.log('[Shopify Callback] Creating new org and invitation for:', shopInfo.email)

      const clerkOrg = await createClerkOrganization(shopInfo)
      if (!clerkOrg) {
        return NextResponse.redirect(
          new URL('/error?message=Failed+to+create+organization', request.url)
        )
      }

      clerkOrgId = clerkOrg.id
      orgSlug = clerkOrg.slug

      // Create invitation for the shop owner
      const invitation = await createClerkInvitation(clerkOrgId, shopInfo.email, 'admin')
      if (!invitation) {
        console.error('[Shopify Callback] Failed to create invitation')
        // Continue anyway - they can still sign up manually
      }

      // Redirect to sign-up with invitation ticket
      if (invitation?.ticket) {
        redirectUrl = `/sign-up?__clerk_ticket=${invitation.ticket}&__clerk_status=sign_up&redirect_url=/portal/${orgSlug}`
      } else {
        // Fallback - redirect to sign-up page with context
        redirectUrl = `/sign-up?org=${orgSlug}&email=${encodeURIComponent(shopInfo.email)}`
      }
    }

    // Create or update organization in Supabase
    // Note: The 'id' column IS the Clerk org ID (they're the same in this schema)
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .upsert({
        id: clerkOrgId,
        name: shopInfo.name,
        slug: orgSlug,
        shopify_shop_domain: shop,
        status: 'Building',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      })
      .select()
      .single()

    if (orgError) {
      console.error('[Shopify Callback] Failed to create organization in Supabase:', orgError)
      // Don't fail completely - the Clerk org exists
    }

    const orgId = clerkOrgId // id IS the Clerk org ID

    // Store Shopify integration
    await supabase
      .from('integrations')
      .upsert({
        organization_id: orgId,
        type: 'shopify',
        credentials_encrypted: {
          access_token: tokenData.access_token,
          shop: shop,
          scope: tokenData.scope,
          webhook_secret: webhookSecret,
          shop_id: shopInfo.id,
          shop_email: shopInfo.email,
        },
        connected: true,
        last_sync_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id,type',
      })

    // Register webhooks
    await registerAllWebhooks(shop, tokenData.access_token, appUrl, orgId)

    console.log('[Shopify Callback] Install complete, redirecting to:', redirectUrl)

    return NextResponse.redirect(new URL(redirectUrl, request.url))
  } catch (error) {
    console.error('[Shopify Callback] Error:', getErrorMessage(error))
    return NextResponse.redirect(
      new URL('/error?message=Installation+failed', request.url)
    )
  }
}

/**
 * Validate HMAC signature on callback
 */
function validateCallbackHmac(searchParams: URLSearchParams, secret: string): boolean {
  const hmac = searchParams.get('hmac')
  if (!hmac) return true // HMAC is optional on callback

  const params = new URLSearchParams(searchParams)
  params.delete('hmac')

  const sortedParams = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')

  const calculated = crypto
    .createHmac('sha256', secret)
    .update(sortedParams)
    .digest('hex')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculated, 'hex'),
      Buffer.from(hmac, 'hex')
    )
  } catch {
    return false
  }
}

/**
 * Register all necessary webhooks for the app
 */
async function registerAllWebhooks(
  shop: string,
  accessToken: string,
  appUrl: string,
  orgId: string
): Promise<void> {
  // Data sync webhooks
  const dataWebhookUrl = `${appUrl}/api/webhooks/shopify?org_id=${orgId}`
  for (const topic of SHOPIFY_WEBHOOK_TOPICS) {
    await registerShopifyWebhook(shop, accessToken, topic, dataWebhookUrl)
  }

  // App lifecycle webhooks
  const appWebhookUrl = `${appUrl}/api/webhooks/shopify/app?org_id=${orgId}`
  for (const topic of SHOPIFY_APP_WEBHOOK_TOPICS) {
    await registerShopifyWebhook(shop, accessToken, topic, appWebhookUrl)
  }

  // GDPR compliance webhooks
  for (const topic of SHOPIFY_GDPR_WEBHOOK_TOPICS) {
    await registerShopifyWebhook(shop, accessToken, topic, appWebhookUrl)
  }

  console.log('[Shopify Callback] Registered webhooks for shop:', shop)
}
