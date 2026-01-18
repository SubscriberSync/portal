import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { exchangeShopifyCode } from '@/lib/oauth'
import { upsertIntegration, updateOrganization, getOrganizationById } from '@/lib/supabase/data'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const shop = searchParams.get('shop')

  // Get stored state and org info from cookies
  const cookieStore = await cookies()
  const storedState = cookieStore.get('shopify_oauth_state')?.value
  const orgDataCookie = cookieStore.get('shopify_oauth_org')?.value

  // Clear cookies immediately
  cookieStore.delete('shopify_oauth_state')
  cookieStore.delete('shopify_oauth_org')

  // Verify state to prevent CSRF attacks
  if (!state || !storedState || state !== storedState) {
    console.error('[Shopify Callback] State mismatch')
    return NextResponse.redirect(new URL('/error?message=Invalid+state', request.url))
  }

  if (!code || !shop) {
    console.error('[Shopify Callback] Missing code or shop')
    return NextResponse.redirect(new URL('/error?message=Missing+parameters', request.url))
  }

  if (!orgDataCookie) {
    console.error('[Shopify Callback] Missing org data')
    return NextResponse.redirect(new URL('/error?message=Session+expired', request.url))
  }

  try {
    const orgData = JSON.parse(orgDataCookie)
    const { orgId, orgSlug } = orgData

    // Exchange code for access token
    const tokenData = await exchangeShopifyCode(shop, code)

    if (!tokenData) {
      console.error('[Shopify Callback] Token exchange failed')
      return NextResponse.redirect(new URL(`/portal/${orgSlug}?error=shopify_auth_failed`, request.url))
    }

    // Store the integration in Supabase
    const integration = await upsertIntegration(orgId, 'shopify', {
      credentials_encrypted: {
        access_token: tokenData.access_token,
        shop: shop,
        scope: tokenData.scope,
      },
      connected: true,
      last_sync_at: new Date().toISOString(),
    })

    if (!integration) {
      console.error('[Shopify Callback] Failed to save integration')
      return NextResponse.redirect(new URL(`/portal/${orgSlug}?error=save_failed`, request.url))
    }

    // Check if this completes step 1 (all integrations connected)
    // For now, just mark Shopify as connected
    console.log('[Shopify Callback] Successfully connected Shopify for org:', orgId)

    // Redirect back to portal with success
    return NextResponse.redirect(new URL(`/portal/${orgSlug}?success=shopify_connected`, request.url))
  } catch (error) {
    console.error('[Shopify Callback] Error:', error)
    return NextResponse.redirect(new URL('/error?message=Internal+error', request.url))
  }
}
