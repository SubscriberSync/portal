import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/service'
import { 
  exchangeCode, 
  getGuildRoles, 
  getGuild,
  DISCORD_CONFIG 
} from '@/lib/discord'
import { getErrorMessage } from '@/lib/api-utils'

interface OAuthOrgData {
  orgId: string
  orgSlug: string
  userId: string
  type: 'bot'
}

/**
 * GET /api/auth/discord/callback
 * Handles the OAuth callback after client authorizes the bot
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const guildId = searchParams.get('guild_id')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Get cookies for verification
  const cookieStore = await cookies()
  const storedState = cookieStore.get('discord_oauth_state')?.value
  const orgDataRaw = cookieStore.get('discord_oauth_org')?.value

  // Clear OAuth cookies
  cookieStore.delete('discord_oauth_state')
  cookieStore.delete('discord_oauth_org')

  // Handle OAuth errors (user denied, etc.)
  if (error) {
    console.error('[Discord Callback] OAuth error:', error, errorDescription)
    const redirectUrl = orgDataRaw 
      ? `/portal/${JSON.parse(orgDataRaw).orgSlug}/settings?discord_error=${encodeURIComponent(errorDescription || error)}`
      : '/?discord_error=auth_failed'
    return NextResponse.redirect(new URL(redirectUrl, request.url))
  }

  // Validate required parameters
  if (!code || !guildId) {
    console.error('[Discord Callback] Missing code or guild_id')
    return NextResponse.redirect(new URL('/?discord_error=missing_params', request.url))
  }

  // Verify state for CSRF protection
  if (!storedState || state !== storedState) {
    console.error('[Discord Callback] State mismatch')
    return NextResponse.redirect(new URL('/?discord_error=invalid_state', request.url))
  }

  // Parse org data
  if (!orgDataRaw) {
    console.error('[Discord Callback] No org data in cookie')
    return NextResponse.redirect(new URL('/?discord_error=session_expired', request.url))
  }

  let orgData: OAuthOrgData
  try {
    orgData = JSON.parse(orgDataRaw)
  } catch {
    console.error('[Discord Callback] Invalid org data')
    return NextResponse.redirect(new URL('/?discord_error=invalid_session', request.url))
  }

  const { orgId, orgSlug, userId } = orgData

  try {
    // Exchange code for access token
    // Note: For bot auth, we don't actually need to store the token
    // The bot uses its own token for API calls
    const tokenResponse = await exchangeCode(code, DISCORD_CONFIG.botRedirectUri)
    
    if (!tokenResponse) {
      console.error('[Discord Callback] Token exchange failed')
      return NextResponse.redirect(
        new URL(`/portal/${orgSlug}/settings?discord_error=token_exchange_failed`, request.url)
      )
    }

    // Get guild info using bot token
    const guild = await getGuild(guildId)
    if (!guild) {
      console.error('[Discord Callback] Could not fetch guild info')
      return NextResponse.redirect(
        new URL(`/portal/${orgSlug}/settings?discord_error=guild_fetch_failed`, request.url)
      )
    }

    // Get existing roles from the guild
    const roles = await getGuildRoles(guildId)

    // Store the Discord connection in Supabase
    const supabase = createServiceClient()

    // Check if org already has a Discord connection
    const { data: existingGuild } = await supabase
      .from('discord_guilds')
      .select('id')
      .eq('organization_id', orgId)
      .single()

    if (existingGuild) {
      // Update existing connection
      const { error: updateError } = await supabase
        .from('discord_guilds')
        .update({
          guild_id: guildId,
          guild_name: guild.name,
          guild_icon: guild.icon,
          connected_at: new Date().toISOString(),
          connected_by: userId,
        })
        .eq('organization_id', orgId)

      if (updateError) {
        console.error('[Discord Callback] Update error:', updateError)
        throw updateError
      }
    } else {
      // Create new connection
      const { error: insertError } = await supabase
        .from('discord_guilds')
        .insert({
          organization_id: orgId,
          guild_id: guildId,
          guild_name: guild.name,
          guild_icon: guild.icon,
          connected_by: userId,
        })

      if (insertError) {
        console.error('[Discord Callback] Insert error:', insertError)
        throw insertError
      }
    }

    // Also update the integrations table
    await supabase
      .from('integrations')
      .upsert({
        organization_id: orgId,
        type: 'discord',
        connected: true,
        last_sync_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,type' })

    // Log the activity
    await supabase
      .from('discord_activity_log')
      .insert({
        organization_id: orgId,
        action: 'connection_created',
        details: {
          guild_id: guildId,
          guild_name: guild.name,
          roles_available: roles.length,
          connected_by: userId,
        },
      })

    console.log(`[Discord Callback] Successfully connected guild ${guild.name} for org ${orgSlug}`)

    // Redirect to Discord settings page
    return NextResponse.redirect(
      new URL(`/portal/${orgSlug}/discord?connected=true`, request.url)
    )
  } catch (error) {
    console.error('[Discord Callback] Error:', getErrorMessage(error))
    return NextResponse.redirect(
      new URL(`/portal/${orgSlug}/settings?discord_error=connection_failed`, request.url)
    )
  }
}
