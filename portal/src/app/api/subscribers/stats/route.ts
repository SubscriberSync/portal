import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSubscriberStats } from '@/lib/supabase/data'
import { handleApiError } from '@/lib/api-utils'

/**
 * GET /api/subscribers/stats
 * Get subscriber statistics for the organization
 */
export async function GET() {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stats = await getSubscriberStats(orgId)

    return NextResponse.json(stats)
  } catch (error) {
    return handleApiError(error, 'Subscribers Stats')
  }
}
