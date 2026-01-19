import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSubscribers } from '@/lib/supabase/data'

/**
 * GET /api/subscribers/search?q=query
 * Search subscribers by name or email
 */
export async function GET(request: NextRequest) {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    if (query.length < 2) {
      return NextResponse.json({ subscribers: [], count: 0 })
    }

    const subscribers = await getSubscribers(orgId, {
      search: query,
      limit,
    })

    // Transform to match expected format
    const transformed = subscribers.map(sub => ({
      id: sub.id,
      firstName: sub.first_name || '',
      lastName: sub.last_name || '',
      email: sub.email,
      status: sub.status,
      boxNumber: sub.box_number,
      shirtSize: sub.shirt_size || '',
      tags: sub.tags || [],
      atRisk: sub.at_risk || false,
    }))

    return NextResponse.json({
      subscribers: transformed,
      count: transformed.length,
    })
  } catch (error) {
    console.error('[Subscribers Search] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
