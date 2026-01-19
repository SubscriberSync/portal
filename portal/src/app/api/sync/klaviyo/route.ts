import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  syncAllSubscribersToKlaviyo,
  syncSubscriberByEmail,
} from '@/lib/klaviyo-sync'

// POST /api/sync/klaviyo
// Sync subscribers to Klaviyo profiles
// Body: { email?: string, total_boxes?: number } - if email provided, sync single subscriber; otherwise sync all
export async function POST(request: NextRequest) {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const email = body.email as string | undefined
    const totalBoxes = body.total_boxes as number | undefined

    if (email) {
      // Sync single subscriber
      const result = await syncSubscriberByEmail(orgId, email, totalBoxes)
      return NextResponse.json(result)
    } else {
      // Sync all subscribers
      const result = await syncAllSubscribersToKlaviyo(orgId, totalBoxes)
      return NextResponse.json(result)
    }
  } catch (error) {
    console.error('[Klaviyo Sync API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
