import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { generateState } from '@/lib/oauth'
import { buildBotAuthUrl } from '@/lib/discord'
import { handleApiError } from '@/lib/api-utils'

/**
 * POST /api/auth/discord
 * Initiates the Discord bot OAuth flow for client setup
 * This allows clients to add the MemberLink bot to their Discord server
 */
export async function POST(request: NextRequest) {
  // Verify user is authenticated and has an organization
  const { orgId, orgSlug, userId } = await auth()

  if (!orgId || !orgSlug) {
    return NextResponse.json({ error: 'Unauthorized - no organization' }, { status: 401 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized - not signed in' }, { status: 401 })
  }

  try {
    // Generate state for CSRF protection
    const state = generateState()

    // Store state and org info in cookie for callback verification
    const cookieStore = await cookies()
    
    cookieStore.set('discord_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    })
    
    cookieStore.set('discord_oauth_org', JSON.stringify({ 
      orgId, 
      orgSlug,
      userId,
      type: 'bot' // Distinguish from customer flow
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    })

    // Build the Discord OAuth URL
    const authUrl = buildBotAuthUrl(state)

    return NextResponse.json({ url: authUrl })
  } catch (error) {
    return handleApiError(error, 'Discord Auth')
  }
}
