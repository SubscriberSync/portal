import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getGuildRoles, createGuildRole, DiscordRole } from '@/lib/discord'

/**
 * GET /api/discord/roles
 * Get role mappings and available Discord roles for the organization
 */
export async function GET() {
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
      return NextResponse.json({ 
        error: 'Discord not connected',
        connected: false 
      }, { status: 404 })
    }

    // Get existing role mappings
    const { data: mappings, error: mappingsError } = await supabase
      .from('discord_role_mappings')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true })

    if (mappingsError) {
      throw mappingsError
    }

    // Fetch current Discord roles from the guild
    let discordRoles: DiscordRole[] = []
    try {
      discordRoles = await getGuildRoles(guild.guild_id)
      // Filter out @everyone and managed (bot) roles
      discordRoles = discordRoles.filter(role => 
        role.name !== '@everyone' && !role.managed
      )
    } catch (error) {
      console.error('[Discord Roles] Failed to fetch Discord roles:', error)
      // Continue without Discord roles - they might have removed the bot
    }

    return NextResponse.json({
      connected: true,
      guild: {
        id: guild.guild_id,
        name: guild.guild_name,
        icon: guild.guild_icon,
        on_cancel_behavior: guild.on_cancel_behavior,
      },
      mappings: mappings || [],
      discordRoles: discordRoles.map(role => ({
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
      })),
    })
  } catch (error) {
    console.error('[Discord Roles] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/discord/roles
 * Create a new role mapping
 */
export async function POST(request: NextRequest) {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    const body = await request.json()
    const { subscription_tier, discord_role_id, discord_role_name, create_new_role } = body

    if (!subscription_tier) {
      return NextResponse.json({ error: 'subscription_tier is required' }, { status: 400 })
    }

    // Get Discord guild connection
    const { data: guild, error: guildError } = await supabase
      .from('discord_guilds')
      .select('*')
      .eq('organization_id', orgId)
      .single()

    if (guildError || !guild) {
      return NextResponse.json({ error: 'Discord not connected' }, { status: 404 })
    }

    let roleId = discord_role_id
    let roleName = discord_role_name

    // Create a new role in Discord if requested
    if (create_new_role && !discord_role_id) {
      if (!discord_role_name) {
        return NextResponse.json({ error: 'discord_role_name required for new role' }, { status: 400 })
      }

      const newRole = await createGuildRole(guild.guild_id, discord_role_name)
      if (!newRole) {
        return NextResponse.json({ error: 'Failed to create Discord role' }, { status: 500 })
      }
      roleId = newRole.id
      roleName = newRole.name
    }

    if (!roleId) {
      return NextResponse.json({ error: 'discord_role_id is required' }, { status: 400 })
    }

    // Create the mapping
    const { data: mapping, error: insertError } = await supabase
      .from('discord_role_mappings')
      .upsert({
        organization_id: orgId,
        discord_guild_id: guild.id,
        subscription_tier,
        discord_role_id: roleId,
        discord_role_name: roleName,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,subscription_tier' })
      .select()
      .single()

    if (insertError) {
      console.error('[Discord Roles] Insert error:', insertError)
      throw insertError
    }

    return NextResponse.json({ success: true, mapping })
  } catch (error) {
    console.error('[Discord Roles] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/discord/roles
 * Delete a role mapping
 */
export async function DELETE(request: NextRequest) {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    const { searchParams } = new URL(request.url)
    const mappingId = searchParams.get('id')
    const tier = searchParams.get('tier')

    if (!mappingId && !tier) {
      return NextResponse.json({ error: 'id or tier parameter required' }, { status: 400 })
    }

    let query = supabase
      .from('discord_role_mappings')
      .delete()
      .eq('organization_id', orgId)

    if (mappingId) {
      query = query.eq('id', mappingId)
    } else if (tier) {
      query = query.eq('subscription_tier', tier)
    }

    const { error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Discord Roles] Delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/discord/roles
 * Update Discord settings (like on_cancel_behavior)
 */
export async function PATCH(request: NextRequest) {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    const body = await request.json()
    const { on_cancel_behavior } = body

    if (on_cancel_behavior && !['remove_roles', 'kick'].includes(on_cancel_behavior)) {
      return NextResponse.json({ error: 'Invalid on_cancel_behavior' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (on_cancel_behavior) {
      updates.on_cancel_behavior = on_cancel_behavior
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { error } = await supabase
      .from('discord_guilds')
      .update(updates)
      .eq('organization_id', orgId)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Discord Roles] Patch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
