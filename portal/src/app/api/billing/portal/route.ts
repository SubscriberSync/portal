import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createBillingPortalSession } from '@/lib/stripe'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { handleApiError } from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  try {
    const { orgSlug } = await auth()

    if (!orgSlug) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const organization = await getOrganizationBySlug(orgSlug)

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    if (!organization.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found for this organization' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.subscribersync.com'

    const session = await createBillingPortalSession({
      customerId: organization.stripe_customer_id,
      returnUrl: `${baseUrl}/portal/${orgSlug}`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    return handleApiError(error, 'Billing Portal', 'Failed to create billing portal session')
  }
}
