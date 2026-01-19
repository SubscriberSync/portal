import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSubscriberActivity } from '@/lib/supabase/data'
import { handleApiError } from '@/lib/api-utils'

/**
 * GET /api/subscribers/activity
 * Get recent subscriber activity for the organization
 */
export async function GET(request: NextRequest) {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    const activity = await getSubscriberActivity(orgId, { limit })

    // Transform to match expected format
    const transformed = activity.map(item => ({
      id: item.id,
      subscriberId: item.subscriber_id,
      subscriberName: item.subscriber_name || 'Unknown',
      action: item.action,
      timestamp: item.created_at,
    }))

    return NextResponse.json({
      activities: transformed,
    })
  } catch (error) {
    return handleApiError(error, 'Subscribers Activity')
  }
}
