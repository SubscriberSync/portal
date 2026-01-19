import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  getOrganizationBySlug,
  upsertIntakeSubmission,
  updateOrganization,
  getIntakeSubmissions,
} from '@/lib/supabase/data'
import { IntakeItemType } from '@/lib/intake-types'
import { shouldAutoApprove, validateIntakeItem } from '@/lib/admin'
import { handleApiError } from '@/lib/api-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

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
    const { item, value } = body as { item: IntakeItemType; value: string }

    if (!item || !value) {
      return NextResponse.json({ success: false, error: 'Missing item or value' }, { status: 400 })
    }

    // Validate item type
    const validItems: IntakeItemType[] = [
      'Shopify API Key',
      'Shopify API Secret',
      'Recharge API Key',
      'Klaviyo API Key',
      'Installment Name',
    ]

    if (!validItems.includes(item)) {
      return NextResponse.json({ success: false, error: 'Invalid item type' }, { status: 400 })
    }

    // Get organization
    const organization = await getOrganizationBySlug(slug)
    if (!organization) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 })
    }

    // Validate the submitted value
    const validation = validateIntakeItem(item, value)

    // Determine if we should auto-approve
    const autoApprove = shouldAutoApprove(item, value)

    // Upsert the submission with appropriate status
    const submission = await upsertIntakeSubmission(
      organization.id,
      item,
      value,
      autoApprove ? 'Approved' : 'Submitted'
    )

    if (!submission) {
      return NextResponse.json({ success: false, error: 'Failed to save submission' }, { status: 500 })
    }

    // Check if all required items are approved to mark step1 complete
    const allSubmissions = await getIntakeSubmissions(organization.id)
    const requiredItems = ['Recharge API Key', 'Klaviyo API Key', 'Installment Name']

    // Only count approved items for step completion
    const approvedItems = allSubmissions
      .filter(s => s.status === 'Approved')
      .map(s => s.item_type)

    const allRequiredApproved = requiredItems.every(item =>
      approvedItems.includes(item as typeof allSubmissions[0]['item_type'])
    )

    if (allRequiredApproved && !organization.step1_complete) {
      await updateOrganization(organization.id, { step1_complete: true })
    }

    return NextResponse.json({
      success: true,
      autoApproved: autoApprove,
      validationError: validation.valid ? undefined : validation.error,
    })
  } catch (error) {
    return handleApiError(error, 'Intake Submit')
  }
}
