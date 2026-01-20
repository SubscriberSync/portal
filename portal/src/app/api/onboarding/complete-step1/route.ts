import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOrganizationBySlug, updateOrganization, getIntegrations } from '@/lib/supabase/data'
import { handleApiError } from '@/lib/api-utils'

/**
 * POST /api/onboarding/complete-step1
 * Mark Step 1 of onboarding as complete when all required integrations are connected
 */
export async function POST() {
  const { orgSlug } = await auth()

  if (!orgSlug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const organization = await getOrganizationBySlug(orgSlug)
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Already complete
    if (organization.step1_complete) {
      return NextResponse.json({ success: true, alreadyComplete: true })
    }

    // Verify that required integrations are actually connected
    const integrations = await getIntegrations(organization.id)
    const shopifyConnected = integrations.some(i => i.type === 'shopify' && i.connected)
    const rechargeConnected = integrations.some(i => i.type === 'recharge' && i.connected)
    const hasInstallmentName = !!organization.installment_name

    if (!shopifyConnected || !rechargeConnected || !hasInstallmentName) {
      return NextResponse.json({
        error: 'Not all required steps are complete',
        missing: {
          shopify: !shopifyConnected,
          recharge: !rechargeConnected,
          installmentName: !hasInstallmentName,
        }
      }, { status: 400 })
    }

    // Mark step 1 as complete
    await updateOrganization(organization.id, { step1_complete: true })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'Complete Step 1')
  }
}
