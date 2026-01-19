import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'

type ShippingProvider = 'shipstation' | 'pirateship' | 'shopify_shipping' | '3pl' | null

/**
 * POST /api/shipping/preference
 * Update the organization's shipping provider preference
 */
export async function POST(request: NextRequest) {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { provider } = body

    // Validate provider value
    const validProviders: ShippingProvider[] = ['shipstation', 'pirateship', 'shopify_shipping', '3pl', null]
    if (!validProviders.includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { error } = await supabase
      .from('organizations')
      .update({
        shipping_provider: provider,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orgId)

    if (error) {
      console.error('[Shipping Preference] Update error:', error)
      throw error
    }

    return NextResponse.json({ success: true, provider })
  } catch (error) {
    console.error('[Shipping Preference] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/shipping/preference
 * Get the organization's current shipping provider preference
 */
export async function GET() {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()

    const { data: org, error } = await supabase
      .from('organizations')
      .select('shipping_provider')
      .eq('id', orgId)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      provider: org.shipping_provider,
    })
  } catch (error) {
    console.error('[Shipping Preference] Get error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
