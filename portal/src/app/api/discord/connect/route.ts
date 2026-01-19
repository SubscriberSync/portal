import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { generateState } from '@/lib/oauth'
import { buildCustomerAuthUrl } from '@/lib/discord'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * POST /api/discord/connect
 * Initiates the customer Discord connection flow
 * Called from the customer-facing connect page
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { org_slug, email } = body

    if (!org_slug) {
      return NextResponse.json({ error: 'org_slug is required' }, { status: 400 })
    }

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get organization by slug
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', org_slug)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Check if organization has Discord connected
    const { data: guild, error: guildError } = await supabase
      .from('discord_guilds')
      .select('guild_id, guild_name')
      .eq('organization_id', org.id)
      .single()

    if (guildError || !guild) {
      return NextResponse.json({ 
        error: 'Discord not configured for this organization' 
      }, { status: 400 })
    }

    // Find subscriber by email
    const { data: subscriber, error: subError } = await supabase
      .from('subscribers')
      .select('id, email, first_name, last_name, status')
      .eq('organization_id', org.id)
      .eq('email', email.toLowerCase())
      .single()

    if (subError || !subscriber) {
      return NextResponse.json({ 
        error: 'No subscription found with this email' 
      }, { status: 404 })
    }

    // Check if subscriber is active
    if (subscriber.status !== 'Active') {
      return NextResponse.json({ 
        error: 'Your subscription is not active' 
      }, { status: 400 })
    }

    // Check if already connected
    const { data: existing } = await supabase
      .from('customer_discord_connections')
      .select('id')
      .eq('organization_id', org.id)
      .eq('subscriber_id', subscriber.id)
      .single()

    if (existing) {
      return NextResponse.json({ 
        error: 'Discord already connected',
        already_connected: true
      }, { status: 400 })
    }

    // Generate state for CSRF protection
    const state = generateState()

    // Store connection data in cookie
    const cookieStore = await cookies()
    
    cookieStore.set('discord_connect_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    })
    
    cookieStore.set('discord_connect_data', JSON.stringify({ 
      orgId: org.id,
      orgSlug: org.slug,
      orgName: org.name,
      subscriberId: subscriber.id,
      email: subscriber.email,
      guildId: guild.guild_id,
      guildName: guild.guild_name,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    })

    // Build the Discord OAuth URL
    const authUrl = buildCustomerAuthUrl(state, guild.guild_id)

    return NextResponse.json({ url: authUrl })
  } catch (error) {
    console.error('[Discord Connect] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/discord/connect
 * Check if a subscriber is already connected to Discord
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orgSlug = searchParams.get('org')
    const email = searchParams.get('email')

    if (!orgSlug || !email) {
      return NextResponse.json({ error: 'org and email parameters required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get organization
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', orgSlug)
      .single()

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Find subscriber
    const { data: subscriber } = await supabase
      .from('subscribers')
      .select('id, status')
      .eq('organization_id', org.id)
      .eq('email', email.toLowerCase())
      .single()

    if (!subscriber) {
      return NextResponse.json({ 
        found: false,
        connected: false 
      })
    }

    // Check if connected to Discord
    const { data: connection } = await supabase
      .from('customer_discord_connections')
      .select('id, discord_username, connected_at')
      .eq('organization_id', org.id)
      .eq('subscriber_id', subscriber.id)
      .single()

    return NextResponse.json({
      found: true,
      status: subscriber.status,
      connected: !!connection,
      connection: connection ? {
        username: connection.discord_username,
        connectedAt: connection.connected_at,
      } : null,
    })
  } catch (error) {
    console.error('[Discord Connect] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
