import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { handleApiError } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/subscribers/[id]/impact
 * Get the impact of deleting a subscriber (for confirmation modal)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { orgId } = await auth()
  const { id } = await params

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    // Verify subscriber exists and belongs to org
    const { data: subscriber, error: subError } = await supabase
      .from('subscribers')
      .select('id, organization_id, email, first_name, last_name')
      .eq('id', id)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .single()

    if (subError || !subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }

    // Call the get_subscriber_deletion_impact function
    const { data, error } = await supabase.rpc('get_subscriber_deletion_impact', {
      p_subscriber_id: id,
      p_org_id: orgId,
    })

    if (error) {
      throw new Error(`Failed to get deletion impact: ${error.message}`)
    }

    return NextResponse.json({
      subscriberId: id,
      email: subscriber.email,
      name: `${subscriber.first_name || ''} ${subscriber.last_name || ''}`.trim(),
      ...data,
    })
  } catch (error) {
    return handleApiError(error, 'Deletion Impact')
  }
}
