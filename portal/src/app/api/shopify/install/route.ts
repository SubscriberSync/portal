import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { generateState, buildShopifyAuthUrl, getShopifyAppSecret } from '@/lib/oauth'

/**
 * Shopify Install Handler
 * 
 * This endpoint handles both:
 * 1. App Store installs (with HMAC validation)
 * 2. Direct OAuth initiation (manual install URL)
 * 
 * Flow:
 * 1. Validate shop domain format
 * 2. If HMAC present, validate it (App Store flow)
 * 3. Check if shop already has an organization (re-install case)
 * 4. Store install context in cookie
 * 5. Redirect to Shopify OAuth authorization
 */

// Validate HMAC signature from Shopify
function validateShopifyHmac(searchParams: URLSearchParams, secret: string): boolean {
  const hmac = searchParams.get('hmac')
  if (!hmac) return false

  // Create a copy and remove hmac for validation
  const params = new URLSearchParams(searchParams)
  params.delete('hmac')

  // Sort parameters alphabetically and join
  const sortedParams = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')

  // Calculate HMAC
  const calculated = crypto
    .createHmac('sha256', secret)
    .update(sortedParams)
    .digest('hex')

  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculated, 'hex'),
      Buffer.from(hmac, 'hex')
    )
  } catch {
    return false
  }
}

// Validate shop domain format
function isValidShopDomain(shop: string): boolean {
  // Shop should be in format: store-name.myshopify.com
  const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/
  return shopRegex.test(shop)
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const shop = searchParams.get('shop')
  const timestamp = searchParams.get('timestamp')

  console.log('[Shopify Install] Received install request for shop:', shop)

  // Validate required parameters
  if (!shop) {
    console.error('[Shopify Install] Missing shop parameter')
    return NextResponse.redirect(
      new URL('/error?message=Missing+shop+parameter', request.url)
    )
  }

  // Validate shop domain format
  if (!isValidShopDomain(shop)) {
    console.error('[Shopify Install] Invalid shop domain:', shop)
    return NextResponse.redirect(
      new URL('/error?message=Invalid+shop+domain', request.url)
    )
  }

  // Validate timestamp (request should be recent - within 5 minutes)
  if (timestamp) {
    const requestTime = parseInt(timestamp, 10)
    const currentTime = Math.floor(Date.now() / 1000)
    if (Math.abs(currentTime - requestTime) > 300) {
      console.error('[Shopify Install] Request timestamp too old')
      return NextResponse.redirect(
        new URL('/error?message=Request+expired', request.url)
      )
    }
  }

  // Validate HMAC signature if present (App Store installs include HMAC)
  // For direct OAuth initiation (manual URL), HMAC is not required
  const hmac = searchParams.get('hmac')
  if (hmac) {
    let shopifySecret = ''
    try {
      shopifySecret = getShopifyAppSecret()
    } catch (error) {
      console.error('[Shopify Install] Missing Shopify app secret', error)
      return NextResponse.redirect(
        new URL('/error?message=Server+configuration+error', request.url)
      )
    }

    if (!validateShopifyHmac(searchParams, shopifySecret)) {
      console.error('[Shopify Install] Invalid HMAC signature')
      return NextResponse.redirect(
        new URL('/error?message=Invalid+request+signature', request.url)
      )
    }
    console.log('[Shopify Install] HMAC validated (App Store install)')
  } else {
    console.log('[Shopify Install] Direct OAuth initiation (no HMAC)')
  }

  // Check if this shop already has an organization (re-install case)
  const supabase = createServiceClient()
  const { data: existingOrg } = await supabase
    .from('organizations')
    .select('id, slug')
    .eq('shopify_shop_domain', shop)
    .single()

  // Generate state for CSRF protection
  const state = generateState()

  // Store install context in cookie
  const cookieStore = await cookies()
  cookieStore.set('shopify_install_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  })

  cookieStore.set('shopify_install_context', JSON.stringify({
    shop,
    isReinstall: !!existingOrg,
    existingOrgId: existingOrg?.id,
    existingOrgSlug: existingOrg?.slug,
    existingClerkOrgId: existingOrg?.id, // id IS the Clerk org ID in this schema
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  })

  // Build the redirect URL - use the new callback endpoint for App Store installs
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`
  const redirectUri = `${baseUrl}/api/shopify/callback`

  let authUrl = ''
  try {
    authUrl = buildShopifyAuthUrl(shop, state, redirectUri)
  } catch (error) {
    console.error('[Shopify Install] Missing Shopify app credentials', error)
    return NextResponse.redirect(
      new URL('/error?message=Server+configuration+error', request.url)
    )
  }

  console.log('[Shopify Install] Redirecting to Shopify OAuth for shop:', shop)

  return NextResponse.redirect(authUrl)
}
