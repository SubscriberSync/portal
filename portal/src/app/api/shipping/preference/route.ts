import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { createServiceClient } from '@/lib/supabase/service'
import { handleApiError } from '@/lib/api-utils'

type ShippingProvider = 'shipstation' | 'pirateship' | 'shopify_shipping' | '3pl' | null

/**
 * POST /api/shipping/preference
 * Update the organization's shipping provider preference
 */
export async function POST(request: NextRequest) {
  const { orgSlug } = await auth()

  if (!orgSlug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const organization = await getOrganizationBySlug(orgSlug)
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

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
      .eq('id', organization.id)

    if (error) {
      console.error('[Shipping Preference] Update error:', error)
      throw error
    }

    return NextResponse.json({ success: true, provider })
  } catch (error) {
    return handleApiError(error, 'Shipping Preference')
  }
}

/**
 * GET /api/shipping/preference
 * Get the organization's current shipping provider preference
 */
export async function GET() {
  const { orgSlug } = await auth()

  if (!orgSlug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const organization = await getOrganizationBySlug(orgSlug)
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    return NextResponse.json({
      provider: organization.shipping_provider,
    })
  } catch (error) {
    return handleApiError(error, 'Shipping Preference Get')
  }
}
