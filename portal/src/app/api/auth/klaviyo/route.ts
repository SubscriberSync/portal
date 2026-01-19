import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { generateState, generateCodeVerifier, generateCodeChallenge, buildKlaviyoAuthUrl } from '@/lib/oauth'
import { handleApiError } from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  // Verify user is authenticated
  const { orgId, orgSlug } = await auth()

  if (!orgId || !orgSlug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Generate state for CSRF protection
    const state = generateState()

    // Generate PKCE code verifier and challenge (required by Klaviyo)
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)

    // Store state, verifier, and org info in cookies for callback verification
    const cookieStore = await cookies()
    cookieStore.set('klaviyo_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    })
    cookieStore.set('klaviyo_oauth_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    })
    cookieStore.set('klaviyo_oauth_org', JSON.stringify({ orgId, orgSlug }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    })

    // Build the redirect URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`
    const redirectUri = `${baseUrl}/api/auth/klaviyo/callback`

    const authUrl = buildKlaviyoAuthUrl(state, codeChallenge, redirectUri)

    return NextResponse.json({ url: authUrl })
  } catch (error) {
    return handleApiError(error, 'Klaviyo Auth')
  }
}
