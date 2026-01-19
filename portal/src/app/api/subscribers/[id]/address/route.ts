import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSubscriberById, updateSubscriber, logSubscriberActivity } from '@/lib/supabase/data'
import { handleApiError } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/subscribers/[id]/address
 * Update subscriber address
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { orgId } = await auth()
  const { id } = await params

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get existing subscriber to verify ownership
    const existing = await getSubscriberById(id)

    if (!existing) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }

    // Verify subscriber belongs to this organization
    if (existing.organization_id !== orgId) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }

    const body = await request.json()
    const { address1, address2, city, state, zip, country, phone } = body

    // Store old address for activity log
    const oldAddress = {
      address1: existing.address1,
      address2: existing.address2,
      city: existing.city,
      state: existing.state,
      zip: existing.zip,
      country: existing.country,
      phone: existing.phone,
    }

    // Update subscriber with new address
    const updated = await updateSubscriber(id, {
      address1: address1 || existing.address1,
      address2: address2 ?? existing.address2,
      city: city || existing.city,
      state: state || existing.state,
      zip: zip || existing.zip,
      country: country || existing.country,
      phone: phone ?? existing.phone,
    })

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update address' }, { status: 500 })
    }

    // Log activity
    await logSubscriberActivity(orgId, id, 'address_updated', {
      previousValue: JSON.stringify(oldAddress),
      newValue: JSON.stringify({
        address1: updated.address1,
        address2: updated.address2,
        city: updated.city,
        state: updated.state,
        zip: updated.zip,
        country: updated.country,
        phone: updated.phone,
      }),
    })

    return NextResponse.json({ 
      success: true,
      message: 'Address updated successfully',
    })
  } catch (error) {
    return handleApiError(error, 'Subscriber Address Update')
  }
}
