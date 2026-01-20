import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSubscriberMetrics } from '@/lib/supabase/data'
import { handleApiError } from '@/lib/api-utils'

/**
 * GET /api/subscribers/metrics
 * Get detailed subscriber metrics for the metrics hub
 * Optional query param: ?sku=PRODUCT-SKU to filter by product
 */
export async function GET(request: NextRequest) {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const sku = searchParams.get('sku') || undefined

    const metrics = await getSubscriberMetrics(orgId, sku)

    return NextResponse.json(metrics)
  } catch (error) {
    return handleApiError(error, 'Subscriber Metrics')
  }
}
