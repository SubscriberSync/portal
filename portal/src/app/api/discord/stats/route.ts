import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { handleApiError } from '@/lib/api-utils'

/**
 * GET /api/discord/stats
 * Get Discord connection statistics for the organization
 */
export async function GET() {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    // Get Discord guild connection
    const { data: guild } = await supabase
      .from('discord_guilds')
      .select('*')
      .eq('organization_id', orgId)
      .single()

    if (!guild) {
      return NextResponse.json({ 
        connected: false,
        stats: null 
      })
    }

    // Get stats using the helper function
    const { data: stats } = await supabase
      .rpc('get_discord_stats', { org_id: orgId })
      .single()

    // Get recent activity
    const { data: recentActivity } = await supabase
      .from('discord_activity_log')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get role mapping count
    const { count: mappingCount } = await supabase
      .from('discord_role_mappings')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)

    return NextResponse.json({
      connected: true,
      guild: {
        id: guild.guild_id,
        name: guild.guild_name,
        icon: guild.guild_icon,
        on_cancel_behavior: guild.on_cancel_behavior,
        connected_at: guild.connected_at,
      },
      stats: stats || {
        total_subscribers: 0,
        connected_subscribers: 0,
        in_guild_count: 0,
        connection_rate: 0,
      },
      role_mappings_count: mappingCount || 0,
      recent_activity: recentActivity || [],
    })
  } catch (error) {
    return handleApiError(error, 'Discord Stats')
  }
}
