import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { fetchUniqueSKUs } from '@/lib/forensic-audit'

// GET /api/migration/detect-skus
// Scans Shopify for all unique SKUs to help with mapping
export async function GET(request: NextRequest) {
  const { orgSlug, orgId } = await auth()

  if (!orgSlug || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  try {
    const supabase = createServiceClient()

    // Get Shopify credentials
    const { data: shopifyIntegration } = await supabase
      .from('integrations')
      .select('credentials_encrypted')
      .eq('organization_id', organization.id)
      .eq('type', 'shopify')
      .eq('connected', true)
      .single()

    if (!shopifyIntegration?.credentials_encrypted) {
      return NextResponse.json({ error: 'Shopify not connected' }, { status: 400 })
    }

    const credentials = {
      shop: shopifyIntegration.credentials_encrypted.shop as string,
      access_token: shopifyIntegration.credentials_encrypted.access_token as string,
    }

    // Get date filter from query params (default: last 2 years)
    const searchParams = request.nextUrl.searchParams
    const yearsBack = parseInt(searchParams.get('years') || '2', 10)
    const sinceDate = new Date()
    sinceDate.setFullYear(sinceDate.getFullYear() - yearsBack)

    // Fetch unique SKUs from Shopify
    const skuMap = await fetchUniqueSKUs(credentials, sinceDate.toISOString())

    // Get existing mappings
    const { data: existingMappings } = await supabase
      .from('sku_aliases')
      .select('shopify_sku, product_sequence_id, product_name')
      .eq('organization_id', organization.id)

    const mappedSkus = new Set(
      (existingMappings || []).map(m => m.shopify_sku.toLowerCase())
    )

    // Categorize SKUs
    const skus = Array.from(skuMap.entries()).map(([key, value]) => ({
      sku: value.sku,
      name: value.name,
      count: value.count,
      isMapped: mappedSkus.has(key),
      mappedTo: existingMappings?.find(
        m => m.shopify_sku.toLowerCase() === key
      )?.product_sequence_id,
    }))

    // Sort by count (most common first)
    skus.sort((a, b) => b.count - a.count)

    return NextResponse.json({
      skus,
      totalUnique: skus.length,
      unmappedCount: skus.filter(s => !s.isMapped).length,
      mappedCount: skus.filter(s => s.isMapped).length,
    })
  } catch (error) {
    console.error('[Detect SKUs] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to detect SKUs' },
      { status: 500 }
    )
  }
}
