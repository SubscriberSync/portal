import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  getOrganizationBySlug,
  getIntakeSubmissions,
  getDiscordConfig,
} from '@/lib/supabase/data'
import { handleApiError } from '@/lib/api-utils'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (!slug) {
    return NextResponse.json({ error: 'Missing client slug' }, { status: 400 })
  }

  // Verify auth
  const { orgSlug } = await auth()
  if (orgSlug !== slug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const organization = await getOrganizationBySlug(slug)

    if (!organization) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const [submissions, discordConfig] = await Promise.all([
      getIntakeSubmissions(organization.id),
      getDiscordConfig(organization.id),
    ])

    // Transform submissions to expected format
    const transformedSubmissions = submissions.map(s => ({
      item: s.item_type,
      value: s.value_encrypted || '',
      status: s.status,
      rejectionNote: s.rejection_note || undefined,
      submittedAt: s.submitted_at || undefined,
      reviewedAt: s.reviewed_at || undefined,
    }))

    // Build onboarding data
    const onboardingData = {
      step1Complete: organization.step1_complete,
      discordDecision: discordConfig?.decision || 'Not Decided',
      discordSetup: discordConfig ? {
        newOrExisting: discordConfig.new_or_existing,
        serverName: discordConfig.server_name,
        serverId: discordConfig.server_id,
        channels: discordConfig.channels.map(name => ({ name, enabled: true })),
        episodeGated: discordConfig.episode_gated,
        moderatorName: discordConfig.moderator_name,
        moderatorEmail: discordConfig.moderator_email,
        vibe: discordConfig.vibe,
      } : undefined,
      step2Complete: organization.step2_complete,
    }

    return NextResponse.json({
      submissions: transformedSubmissions,
      onboardingData,
    })
  } catch (error) {
    return handleApiError(error, 'Intake Fetch')
  }
}
