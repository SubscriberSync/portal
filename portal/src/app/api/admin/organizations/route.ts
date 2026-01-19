import { NextRequest, NextResponse } from 'next/server'
import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/admin'
import { createOrganization, deleteOrganization, getAllOrganizations, updateOrganization } from '@/lib/supabase/data'

export async function GET() {
  const user = await currentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = user.emailAddresses[0]?.emailAddress
  if (!isAdmin(email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const organizations = await getAllOrganizations()
    return NextResponse.json({ organizations })
  } catch (error) {
    console.error('Error fetching organizations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await currentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = user.emailAddresses[0]?.emailAddress
  if (!isAdmin(email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { name, slug, status, isTestPortal, inviteEmail } = await request.json()

    if (!name || !slug) {
      return NextResponse.json({ error: 'Missing name or slug' }, { status: 400 })
    }

    // For test portals, require an invite email
    if (isTestPortal && !inviteEmail) {
      return NextResponse.json({ error: 'Test portals require an invite email' }, { status: 400 })
    }

    // 1. Create organization in Supabase first
    let organization
    try {
      organization = await createOrganization({
        name,
        slug,
        status,
        is_test_portal: isTestPortal || false,
      })
    } catch (dbError) {
      const errorMessage = dbError instanceof Error ? dbError.message : 'Failed to create organization'
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    if (!organization) {
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
    }

    // 2. For test portals, also create Clerk organization and send invite
    console.log('[Admin] isTestPortal:', isTestPortal, 'inviteEmail:', inviteEmail)
    if (isTestPortal && inviteEmail) {
      try {
        console.log('[Admin] Creating Clerk organization with name:', name, 'slug:', slug)
        const clerk = await clerkClient()

        // Create the organization in Clerk
        const clerkOrg = await clerk.organizations.createOrganization({
          name,
          slug,
        })

        console.log('[Admin] Created Clerk organization for test portal:', clerkOrg.id)

        // Update Supabase org with Clerk org ID
        await updateOrganization(organization.id, { id: clerkOrg.id } as any)

        // Create invitation for the test user
        const invitation = await clerk.organizations.createOrganizationInvitation({
          organizationId: clerkOrg.id,
          emailAddress: inviteEmail,
          role: 'org:admin',
          redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/portal/${slug}`,
        })

        console.log('[Admin] Sent test portal invitation to:', inviteEmail, 'ID:', invitation.id)

        return NextResponse.json({
          organization,
          clerkOrgId: clerkOrg.id,
          invitationSent: true,
          inviteEmail
        })
      } catch (clerkError: any) {
        console.error('[Admin] Error creating Clerk org/invitation:', clerkError)
        // Extract more specific error message from Clerk
        let clerkErrorMessage = 'Failed to create Clerk organization or send invite'
        if (clerkError?.errors?.[0]?.message) {
          clerkErrorMessage = clerkError.errors[0].message
        } else if (clerkError?.message) {
          clerkErrorMessage = clerkError.message
        }
        // Still return success for Supabase org, but note Clerk failed
        return NextResponse.json({
          organization,
          clerkError: clerkErrorMessage,
          warning: `Organization created in database but Clerk setup failed: ${clerkErrorMessage}`
        }, { status: 207 }) // 207 Multi-Status
      }
    }

    return NextResponse.json({ organization })
  } catch (error) {
    console.error('Error creating organization:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const user = await currentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = user.emailAddresses[0]?.emailAddress
  if (!isAdmin(email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id, slug } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    // 1. Try to delete from Clerk first (if slug provided)
    if (slug) {
      try {
        const clerk = await clerkClient()
        // Find the Clerk organization by slug
        const clerkOrgs = await clerk.organizations.getOrganizationList({ query: slug })
        const clerkOrg = clerkOrgs.data.find(org => org.slug === slug)

        if (clerkOrg) {
          await clerk.organizations.deleteOrganization(clerkOrg.id)
          console.log('[Admin] Deleted Clerk organization:', clerkOrg.id)
        }
      } catch (clerkError) {
        console.error('[Admin] Error deleting Clerk organization:', clerkError)
        // Continue with Supabase deletion even if Clerk fails
      }
    }

    // 2. Delete from Supabase
    const success = await deleteOrganization(id)

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete organization from database' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting organization:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
