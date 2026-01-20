import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOrganizationBySlug, updateOrganization } from '@/lib/supabase/data'
import { handleApiError } from '@/lib/api-utils'

/**
 * POST /api/migration/complete
 * Mark the migration as complete for the organization
 */
export async function POST() {
  const { orgSlug } = await auth()

  if (!orgSlug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const organization = await getOrganizationBySlug(orgSlug)
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    if (organization.migration_complete) {
      return NextResponse.json({
        success: true,
        alreadyComplete: true,
        message: 'Migration was already marked as complete',
      })
    }

    // Update organization to mark migration as complete
    await updateOrganization(organization.id, { migration_complete: true })

    return NextResponse.json({
      success: true,
      message: 'Migration marked as complete',
    })
  } catch (error) {
    return handleApiError(error, 'Complete Migration')
  }
}

/**
 * GET /api/migration/complete
 * Check if migration is complete
 */
export async function GET() {
  const { orgSlug } = await auth()

  if (!orgSlug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const organization = await getOrganizationBySlug(orgSlug)
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    return NextResponse.json({
      complete: organization.migration_complete,
    })
  } catch (error) {
    return handleApiError(error, 'Check Migration Status')
  }
}
