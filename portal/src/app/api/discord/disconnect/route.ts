import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * POST /api/discord/disconnect
 * Disconnect Discord integration for the organization
 */
export async function POST(request: NextRequest) {
  const { orgId, userId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    const body = await request.json().catch(() => ({}))
    const { remove_customer_connections } = body

    // Get existing guild connection
    const { data: guild } = await supabase
      .from('discord_guilds')
      .select('*')
      .eq('organization_id', orgId)
      .single()

    if (!guild) {
      return NextResponse.json({ error: 'Discord not connected' }, { status: 404 })
    }

    // Log the disconnection
    await supabase
      .from('discord_activity_log')
      .insert({
        organization_id: orgId,
        action: 'connection_revoked',
        details: {
          guild_id: guild.guild_id,
          guild_name: guild.guild_name,
          disconnected_by: userId,
          remove_customer_connections,
        },
      })

    // Optionally remove all customer connections
    if (remove_customer_connections) {
      await supabase
        .from('customer_discord_connections')
        .delete()
        .eq('organization_id', orgId)
    }

    // Delete role mappings
    await supabase
      .from('discord_role_mappings')
      .delete()
      .eq('organization_id', orgId)

    // Delete guild connection
    await supabase
      .from('discord_guilds')
      .delete()
      .eq('organization_id', orgId)

    // Update integrations table
    await supabase
      .from('integrations')
      .update({
        connected: false,
        last_sync_at: new Date().toISOString(),
      })
      .eq('organization_id', orgId)
      .eq('type', 'discord')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Discord Disconnect] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
