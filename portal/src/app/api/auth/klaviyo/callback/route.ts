import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { exchangeKlaviyoCode } from '@/lib/oauth'
import { upsertIntegration } from '@/lib/supabase/data'
import { getErrorMessage } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Check for OAuth errors
  if (error) {
    const errorDescription = searchParams.get('error_description') || 'Unknown error'
    console.error('[Klaviyo Callback] OAuth error:', error, errorDescription)
    return NextResponse.redirect(new URL(`/error?message=${encodeURIComponent(errorDescription)}`, request.url))
  }

  // Get stored state, verifier, and org info from cookies
  const cookieStore = await cookies()
  const storedState = cookieStore.get('klaviyo_oauth_state')?.value
  const codeVerifier = cookieStore.get('klaviyo_oauth_verifier')?.value
  const orgDataCookie = cookieStore.get('klaviyo_oauth_org')?.value

  // Clear cookies immediately
  cookieStore.delete('klaviyo_oauth_state')
  cookieStore.delete('klaviyo_oauth_verifier')
  cookieStore.delete('klaviyo_oauth_org')

  // Verify state to prevent CSRF attacks
  if (!state || !storedState || state !== storedState) {
    console.error('[Klaviyo Callback] State mismatch')
    return NextResponse.redirect(new URL('/error?message=Invalid+state', request.url))
  }

  if (!code) {
    console.error('[Klaviyo Callback] Missing code')
    return NextResponse.redirect(new URL('/error?message=Missing+authorization+code', request.url))
  }

  if (!codeVerifier) {
    console.error('[Klaviyo Callback] Missing code verifier')
    return NextResponse.redirect(new URL('/error?message=Session+expired', request.url))
  }

  if (!orgDataCookie) {
    console.error('[Klaviyo Callback] Missing org data')
    return NextResponse.redirect(new URL('/error?message=Session+expired', request.url))
  }

  try {
    const orgData = JSON.parse(orgDataCookie)
    const { orgId, orgSlug } = orgData

    // Build redirect URI (must match exactly what was used in auth request)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`
    const redirectUri = `${baseUrl}/api/auth/klaviyo/callback`

    // Exchange code for access token
    const tokenData = await exchangeKlaviyoCode(code, codeVerifier, redirectUri)

    if (!tokenData) {
      console.error('[Klaviyo Callback] Token exchange failed')
      return NextResponse.redirect(new URL(`/portal/${orgSlug}?error=klaviyo_auth_failed`, request.url))
    }

    // Calculate token expiration time
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

    // Store the integration in Supabase
    const integration = await upsertIntegration(orgId, 'klaviyo', {
      credentials_encrypted: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
      },
      connected: true,
      last_sync_at: new Date().toISOString(),
    })

    if (!integration) {
      console.error('[Klaviyo Callback] Failed to save integration')
      return NextResponse.redirect(new URL(`/portal/${orgSlug}?error=save_failed`, request.url))
    }

    console.log('[Klaviyo Callback] Successfully connected Klaviyo for org:', orgId)

    // Redirect back to portal with success
    return NextResponse.redirect(new URL(`/portal/${orgSlug}?success=klaviyo_connected`, request.url))
  } catch (error) {
    console.error('[Klaviyo Callback] Error:', getErrorMessage(error))
    return NextResponse.redirect(new URL('/error?message=Internal+error', request.url))
  }
}
