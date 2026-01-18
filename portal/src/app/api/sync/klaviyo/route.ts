import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  syncAllSubscribersToKlaviyo,
  syncSubscriberByEmail,
} from '@/lib/klaviyo-sync'

// POST /api/sync/klaviyo
// Sync subscribers to Klaviyo profiles
// Body: { email?: string } - if email provided, sync single subscriber; otherwise sync all
export async function POST(request: NextRequest) {
  // Check for n8n webhook secret OR Clerk auth
  const webhookSecret = request.headers.get('x-webhook-secret')
  const isN8nRequest = webhookSecret === process.env.N8N_WEBHOOK_SECRET

  let organizationId: string | null = null

  if (isN8nRequest) {
    // n8n request - get org from body
    const body = await request.json()
    organizationId = body.organization_id

    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organization_id' }, { status: 400 })
    }

    const email = body.email as string | undefined
    const totalBoxes = body.total_boxes as number | undefined

    if (email) {
      // Sync single subscriber
      const result = await syncSubscriberByEmail(organizationId, email, totalBoxes)
      return NextResponse.json(result)
    } else {
      // Sync all subscribers
      const result = await syncAllSubscribersToKlaviyo(organizationId, totalBoxes)
      return NextResponse.json(result)
    }
  }

  // Clerk authenticated request
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
