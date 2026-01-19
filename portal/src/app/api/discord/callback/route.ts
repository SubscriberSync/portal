import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/service'
import { 
  exchangeCode, 
  getCurrentUser,
  addMemberToGuild,
  encryptToken,
  DISCORD_CONFIG 
} from '@/lib/discord'

interface ConnectData {
  orgId: string
  orgSlug: string
  orgName: string
  subscriberId: string
  email: string
  guildId: string
  guildName: string
}

/**
 * GET /api/discord/callback
 * Handles the OAuth callback for customer Discord connection
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Get cookies for verification
  const cookieStore = await cookies()
  const storedState = cookieStore.get('discord_connect_state')?.value
  const connectDataRaw = cookieStore.get('discord_connect_data')?.value

  // Clear OAuth cookies
  cookieStore.delete('discord_connect_state')
  cookieStore.delete('discord_connect_data')

  // Default error redirect
  const errorRedirect = (msg: string, slug?: string) => {
    const base = slug ? `/connect/${slug}/discord` : '/'
    return NextResponse.redirect(new URL(`${base}?error=${encodeURIComponent(msg)}`, request.url))
  }

  // Handle OAuth errors
  if (error) {
    console.error('[Discord Customer Callback] OAuth error:', error, errorDescription)
    const slug = connectDataRaw ? JSON.parse(connectDataRaw).orgSlug : undefined
    return errorRedirect(errorDescription || error, slug)
  }

  // Validate required parameters
  if (!code) {
    return errorRedirect('Missing authorization code')
  }

  // Verify state
  if (!storedState || state !== storedState) {
    console.error('[Discord Customer Callback] State mismatch')
    return errorRedirect('Invalid session state')
  }

  // Parse connect data
  if (!connectDataRaw) {
    return errorRedirect('Session expired')
  }

  let connectData: ConnectData
  try {
    connectData = JSON.parse(connectDataRaw)
  } catch {
    return errorRedirect('Invalid session data')
  }

  const { orgId, orgSlug, subscriberId, guildId, guildName } = connectData

  try {
    // Exchange code for access token
    const tokenResponse = await exchangeCode(code, DISCORD_CONFIG.customerRedirectUri)
    
    if (!tokenResponse) {
      return errorRedirect('Failed to authorize with Discord', orgSlug)
    }

    // Get user info
    const user = await getCurrentUser(tokenResponse.access_token)
    if (!user) {
      return errorRedirect('Failed to get Discord user info', orgSlug)
    }

    const supabase = createServiceClient()

    // Check if this Discord user is already connected to another subscriber in this org
    const { data: existingConnection } = await supabase
      .from('customer_discord_connections')
      .select('subscriber_id')
      .eq('organization_id', orgId)
      .eq('discord_user_id', user.id)
      .single()

    if (existingConnection && existingConnection.subscriber_id !== subscriberId) {
      return errorRedirect('This Discord account is already connected to another subscription', orgSlug)
    }

    // Get role mappings to determine which roles to assign
    const { data: subscriber } = await supabase
      .from('subscribers')
      .select('status, sku')
      .eq('id', subscriberId)
      .single()

    if (!subscriber || subscriber.status !== 'Active') {
      return errorRedirect('Subscription is not active', orgSlug)
    }

    // Get role mapping for subscriber's tier/SKU
    const { data: roleMappings } = await supabase
      .from('discord_role_mappings')
      .select('discord_role_id')
      .eq('organization_id', orgId)

    const roleIds = roleMappings?.map(m => m.discord_role_id) || []

    // Add user to guild with roles
    const result = await addMemberToGuild(
      guildId,
      user.id,
      tokenResponse.access_token,
      { roles: roleIds }
    )

    // Store the connection
    const tokenExpiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000)

    const { error: insertError } = await supabase
      .from('customer_discord_connections')
      .upsert({
        organization_id: orgId,
        subscriber_id: subscriberId,
        discord_user_id: user.id,
        discord_username: user.global_name || user.username,
        discord_discriminator: user.discriminator,
        discord_avatar: user.avatar,
        discord_email: user.email || null,
        access_token_encrypted: encryptToken(tokenResponse.access_token),
        refresh_token_encrypted: tokenResponse.refresh_token ? encryptToken(tokenResponse.refresh_token) : null,
        token_expires_at: tokenExpiresAt.toISOString(),
        is_in_guild: true,
        current_roles: roleIds,
        connected_at: new Date().toISOString(),
        last_role_sync_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,subscriber_id' })

    if (insertError) {
      console.error('[Discord Customer Callback] Insert error:', insertError)
      throw insertError
    }

    // Log the activity
    await supabase
      .from('discord_activity_log')
      .insert({
        organization_id: orgId,
        subscriber_id: subscriberId,
        discord_user_id: user.id,
        action: result.alreadyMember ? 'roles_synced' : 'member_added',
        details: {
          guild_id: guildId,
          guild_name: guildName,
          discord_username: user.global_name || user.username,
          roles_assigned: roleIds,
          was_already_member: result.alreadyMember,
        },
      })

    // Update Klaviyo profile if sync is enabled
    // This would trigger the Klaviyo integration to update the profile
    // with discord_connected = true

    console.log(`[Discord Customer Callback] Successfully connected ${user.username} to ${guildName}`)

    // Build Discord server invite URL
    // Redirect to Discord with the server
    const discordServerUrl = `https://discord.com/channels/${guildId}`
    
    // First redirect to success page, then to Discord
    return NextResponse.redirect(
      new URL(`/connect/${orgSlug}/discord?success=true&redirect=${encodeURIComponent(discordServerUrl)}`, request.url)
    )
  } catch (error) {
    console.error('[Discord Customer Callback] Error:', error)
    return errorRedirect('Failed to connect Discord', orgSlug)
  }
}
