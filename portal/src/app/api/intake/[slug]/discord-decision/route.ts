import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  getOrganizationBySlug,
  upsertDiscordConfig,
  updateOrganization,
} from '@/lib/supabase/data'

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
    const { decision } = body as { decision: 'Yes Setup' | 'Maybe Later' | 'No Thanks' }

    if (!decision) {
      return NextResponse.json({ success: false, error: 'Missing decision' }, { status: 400 })
    }

    // Validate decision
    const validDecisions = ['Yes Setup', 'Maybe Later', 'No Thanks']
    if (!validDecisions.includes(decision)) {
      return NextResponse.json({ success: false, error: 'Invalid decision' }, { status: 400 })
    }

    // Get organization
    const organization = await getOrganizationBySlug(slug)
    if (!organization) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 })
    }

    // Update discord config
    const config = await upsertDiscordConfig(organization.id, { decision })

    if (!config) {
      return NextResponse.json({ success: false, error: 'Failed to update decision' }, { status: 500 })
    }

    // If decision is "No Thanks" or "Maybe Later", mark step2 as complete
    if (decision === 'No Thanks' || decision === 'Maybe Later') {
      await updateOrganization(organization.id, { step2_complete: true })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating discord decision:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
