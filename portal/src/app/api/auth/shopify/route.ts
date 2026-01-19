import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { generateState, buildShopifyAuthUrl } from '@/lib/oauth'
import { handleApiError } from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  // Verify user is authenticated
  const { orgId, orgSlug } = await auth()

  if (!orgId || !orgSlug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { shop } = await request.json()

    if (!shop) {
      return NextResponse.json({ error: 'Shop domain is required' }, { status: 400 })
    }

    // Clean up shop domain
    let shopDomain = shop.trim().toLowerCase()
    if (!shopDomain.includes('.myshopify.com')) {
      shopDomain = `${shopDomain}.myshopify.com`
    }
    shopDomain = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')

    // Generate state for CSRF protection
    const state = generateState()

    // Store state and org info in cookie for callback verification
    const cookieStore = await cookies()
    cookieStore.set('shopify_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    })
    cookieStore.set('shopify_oauth_org', JSON.stringify({ orgId, orgSlug, shop: shopDomain }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    })

    // Build the redirect URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`
    const redirectUri = `${baseUrl}/api/auth/shopify/callback`

    const authUrl = buildShopifyAuthUrl(shopDomain, state, redirectUri)

    return NextResponse.json({ url: authUrl })
  } catch (error) {
    return handleApiError(error, 'Shopify Auth')
  }
}
