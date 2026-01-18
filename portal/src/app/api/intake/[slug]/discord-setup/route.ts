import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  getOrganizationBySlug,
  upsertDiscordConfig,
  updateOrganization,
} from '@/lib/supabase/data'
import { DiscordChannel, DiscordNewOrExisting, DiscordVibe } from '@/lib/intake-types'

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params

  if (!slug) {
    return NextResponse.json({ success: false, error: 'Missing client slug' }, { status: 400 })
  }

  // Verify auth
  const { orgSlug } = await auth()
  if (orgSlug !== slug) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const {
      newOrExisting,
      serverName,
      serverId,
      channels,
      episodeGated,
      moderatorName,
      moderatorEmail,
      vibe,
      markComplete,
    } = body as {
      newOrExisting?: DiscordNewOrExisting
      serverName?: string
      serverId?: string
      channels?: DiscordChannel[]
      episodeGated?: boolean
      moderatorName?: string
      moderatorEmail?: string
      vibe?: DiscordVibe
      markComplete?: boolean
    }

    // Validate newOrExisting if provided
    if (newOrExisting && !['Create New', 'Connect Existing'].includes(newOrExisting)) {
      return NextResponse.json({ success: false, error: 'Invalid newOrExisting value' }, { status: 400 })
    }

    // Validate vibe if provided
    if (vibe && !['Casual & Friendly', 'Professional', 'Playful & Fun'].includes(vibe)) {
      return NextResponse.json({ success: false, error: 'Invalid vibe value' }, { status: 400 })
    }

    // Validate channels if provided
    const validChannels: DiscordChannel[] = [
      '#general', '#introductions', '#episode-discussion',
      '#spoilers', '#customer-support', '#theories', '#off-topic'
    ]
    if (channels && channels.some(c => !validChannels.includes(c))) {
      return NextResponse.json({ success: false, error: 'Invalid channel value' }, { status: 400 })
    }

    // Get organization
    const organization = await getOrganizationBySlug(slug)
    if (!organization) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 })
    }

    // Build update object
    const updateData: Parameters<typeof upsertDiscordConfig>[1] = {}

    if (newOrExisting) updateData.new_or_existing = newOrExisting
    if (serverName !== undefined) updateData.server_name = serverName
    if (serverId !== undefined) updateData.server_id = serverId
    if (channels !== undefined) updateData.channels = channels
    if (episodeGated !== undefined) updateData.episode_gated = episodeGated
    if (moderatorName !== undefined) updateData.moderator_name = moderatorName
    if (moderatorEmail !== undefined) updateData.moderator_email = moderatorEmail
    if (vibe !== undefined) updateData.vibe = vibe

    // Update discord config
    const config = await upsertDiscordConfig(organization.id, updateData)

    if (!config) {
      return NextResponse.json({ success: false, error: 'Failed to update discord setup' }, { status: 500 })
    }

    // If markComplete is true, mark step2 as complete
    if (markComplete) {
      await updateOrganization(organization.id, { step2_complete: true })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating discord setup:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
