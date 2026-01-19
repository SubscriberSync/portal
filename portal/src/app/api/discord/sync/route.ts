import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { 
  syncSubscriberRoles, 
  decryptToken, 
  refreshAccessToken, 
  encryptToken,
  addMemberToGuild,
  handleCancellation,
  getGuildMember
} from '@/lib/discord'
import { handleApiError, getErrorMessage } from '@/lib/api-utils'

/**
 * POST /api/discord/sync
 * Manually trigger Discord role sync for all connected subscribers
 */
export async function POST(request: NextRequest) {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    // Get Discord guild connection
    const { data: guild, error: guildError } = await supabase
      .from('discord_guilds')
      .select('*')
      .eq('organization_id', orgId)
      .single()

    if (guildError || !guild) {
      return NextResponse.json({ error: 'Discord not connected' }, { status: 404 })
    }

    // Get all role mappings
    const { data: mappings } = await supabase
      .from('discord_role_mappings')
      .select('*')
      .eq('organization_id', orgId)

    const allMappedRoleIds = mappings?.map(m => m.discord_role_id) || []

    // Get all connected subscribers with their subscription status
    const { data: connections } = await supabase
      .from('customer_discord_connections')
      .select(`
        *,
        subscribers (
          id,
          email,
          status,
          sku
        )
      `)
      .eq('organization_id', orgId)

    if (!connections || connections.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No connected subscribers to sync',
        synced: 0 
      })
    }

    const results = {
      total: connections.length,
      synced: 0,
      errors: 0,
      details: [] as Array<{ email: string; status: string; error?: string }>,
    }

    for (const connection of connections) {
      const subscriber = connection.subscribers
      if (!subscriber) continue

      try {
        // Determine which roles they should have based on status
        let targetRoleIds: string[] = []
        
        if (subscriber.status === 'Active') {
          // Get role for their tier/SKU
          const mapping = mappings?.find(m => 
            m.subscription_tier === subscriber.sku || 
            m.subscription_tier === 'default' ||
            m.subscription_tier === 'active'
          )
          if (mapping) {
            targetRoleIds = [mapping.discord_role_id]
          }
        }

        // Sync roles
        const syncResult = await syncSubscriberRoles(
          guild.guild_id,
          connection.discord_user_id,
          targetRoleIds,
          allMappedRoleIds
        )

        if (syncResult.success) {
          results.synced++
          results.details.push({ 
            email: subscriber.email, 
            status: 'synced' 
          })

          // Update last sync time
          await supabase
            .from('customer_discord_connections')
            .update({ 
              last_role_sync_at: new Date().toISOString(),
              current_roles: targetRoleIds,
            })
            .eq('id', connection.id)
        } else {
          results.errors++
          results.details.push({ 
            email: subscriber.email, 
            status: 'error',
            error: 'Sync failed'
          })
        }
      } catch (error) {
        results.errors++
        results.details.push({ 
          email: subscriber.email, 
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Log activity
    await supabase
      .from('discord_activity_log')
      .insert({
        organization_id: orgId,
        action: 'roles_synced',
        details: {
          total: results.total,
          synced: results.synced,
          errors: results.errors,
          trigger: 'manual',
        },
      })

    return NextResponse.json({ 
      success: true, 
      results 
    })
  } catch (error) {
    return handleApiError(error, 'Discord Sync')
  }
}

/**
 * Sync a single subscriber's Discord roles
 * This is called internally from webhooks
 */
export async function syncSingleSubscriber(
  orgId: string,
  subscriberId: string,
  newStatus: 'Active' | 'Cancelled' | 'Paused' | 'Expired',
  sku?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient()

  try {
    // Get Discord guild connection
    const { data: guild } = await supabase
      .from('discord_guilds')
      .select('*')
      .eq('organization_id', orgId)
      .single()

    if (!guild) {
      return { success: true } // Not an error, just no Discord configured
    }

    // Get customer's Discord connection
    const { data: connection } = await supabase
      .from('customer_discord_connections')
      .select('*')
      .eq('organization_id', orgId)
      .eq('subscriber_id', subscriberId)
      .single()

    if (!connection) {
      return { success: true } // Not an error, subscriber not connected to Discord
    }

    // Get all role mappings
    const { data: mappings } = await supabase
      .from('discord_role_mappings')
      .select('*')
      .eq('organization_id', orgId)

    const allMappedRoleIds = mappings?.map(m => m.discord_role_id) || []

    // Handle based on status
    if (newStatus === 'Cancelled') {
      // Handle cancellation based on org settings
      const success = await handleCancellation(
        guild.guild_id,
        connection.discord_user_id,
        guild.on_cancel_behavior,
        allMappedRoleIds
      )

      // Log activity
      await supabase
        .from('discord_activity_log')
        .insert({
          organization_id: orgId,
          subscriber_id: subscriberId,
          discord_user_id: connection.discord_user_id,
          action: guild.on_cancel_behavior === 'kick' ? 'member_kicked' : 'role_removed',
          details: {
            reason: 'subscription_cancelled',
            roles_removed: allMappedRoleIds,
          },
        })

      // Update connection status
      await supabase
        .from('customer_discord_connections')
        .update({
          is_in_guild: guild.on_cancel_behavior !== 'kick',
          current_roles: [],
          last_role_sync_at: new Date().toISOString(),
        })
        .eq('id', connection.id)

      return { success }
    }

    // For active subscriptions, determine which roles they should have
    let targetRoleIds: string[] = []
    
    if (newStatus === 'Active') {
      // Find role mapping for their tier
      const mapping = mappings?.find(m => 
        m.subscription_tier === sku || 
        m.subscription_tier === 'default' ||
        m.subscription_tier === 'active'
      )
      if (mapping) {
        targetRoleIds = [mapping.discord_role_id]
      }
    }

    // Check if member is still in guild
    const member = await getGuildMember(guild.guild_id, connection.discord_user_id)
    
    if (!member && newStatus === 'Active') {
      // Try to re-add them to the guild
      const decryptedToken = decryptToken(connection.access_token_encrypted)
      
      // Check if token is expired
      const isExpired = connection.token_expires_at && new Date(connection.token_expires_at) < new Date()
      
      if (isExpired && connection.refresh_token_encrypted) {
        // Refresh the token
        const refreshed = await refreshAccessToken(decryptToken(connection.refresh_token_encrypted))
        if (refreshed) {
          await supabase
            .from('customer_discord_connections')
            .update({
              access_token_encrypted: encryptToken(refreshed.access_token),
              refresh_token_encrypted: refreshed.refresh_token ? encryptToken(refreshed.refresh_token) : null,
              token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
            })
            .eq('id', connection.id)

          await addMemberToGuild(
            guild.guild_id,
            connection.discord_user_id,
            refreshed.access_token,
            { roles: targetRoleIds }
          )
        }
      } else {
        await addMemberToGuild(
          guild.guild_id,
          connection.discord_user_id,
          decryptedToken,
          { roles: targetRoleIds }
        )
      }
    } else if (member) {
      // Sync roles
      await syncSubscriberRoles(
        guild.guild_id,
        connection.discord_user_id,
        targetRoleIds,
        allMappedRoleIds
      )
    }

    // Update connection
    await supabase
      .from('customer_discord_connections')
      .update({
        is_in_guild: true,
        current_roles: targetRoleIds,
        last_role_sync_at: new Date().toISOString(),
      })
      .eq('id', connection.id)

    // Log activity
    await supabase
      .from('discord_activity_log')
      .insert({
        organization_id: orgId,
        subscriber_id: subscriberId,
        discord_user_id: connection.discord_user_id,
        action: 'roles_synced',
        details: {
          new_status: newStatus,
          roles: targetRoleIds,
          trigger: 'webhook',
        },
      })

    return { success: true }
  } catch (error) {
    console.error('[Discord Sync] Error syncing subscriber:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
