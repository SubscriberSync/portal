import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  getOrganizationBySlug,
  upsertIntakeSubmission,
  updateOrganization,
  getIntakeSubmissions,
} from '@/lib/supabase/data'
import { IntakeItemType } from '@/lib/intake-types'

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
    const { item, value } = body as { item: IntakeItemType; value: string }

    if (!item || !value) {
      return NextResponse.json({ success: false, error: 'Missing item or value' }, { status: 400 })
    }

    // Validate item type
    const validItems: IntakeItemType[] = [
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

    // Map frontend item types to database item types
    const itemTypeMap: Record<string, 'Shopify API Key' | 'Shopify API Secret' | 'Recharge API Key' | 'Klaviyo API Key' | 'Installment Name'> = {
      'Recharge API Key': 'Recharge API Key',
      'Klaviyo API Key': 'Klaviyo API Key',
      'Installment Name': 'Installment Name',
    }

    const dbItemType = itemTypeMap[item]
    if (!dbItemType) {
      return NextResponse.json({ success: false, error: 'Invalid item type' }, { status: 400 })
    }

    // Upsert the submission
    const submission = await upsertIntakeSubmission(organization.id, dbItemType, value)

    if (!submission) {
      return NextResponse.json({ success: false, error: 'Failed to save submission' }, { status: 500 })
    }

    // Check if all required items are submitted to mark step1 complete
    const allSubmissions = await getIntakeSubmissions(organization.id)
    const requiredItems = ['Recharge API Key', 'Klaviyo API Key', 'Installment Name']
    const submittedItems = allSubmissions
      .filter(s => s.status === 'Submitted' || s.status === 'Approved')
      .map(s => s.item_type)

    const allRequiredSubmitted = requiredItems.every(item => submittedItems.includes(item as typeof allSubmissions[0]['item_type']))

    if (allRequiredSubmitted && !organization.step1_complete) {
      await updateOrganization(organization.id, { step1_complete: true })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error submitting intake item:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
