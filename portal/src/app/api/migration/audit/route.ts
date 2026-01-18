import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import {
  getSkuMap,
  fetchCustomerOrders,
  analyzeOrderHistory,
  saveAuditResult,
  ShopifyCredentials,
} from '@/lib/forensic-audit'

// POST /api/migration/audit
// Audit a single subscriber or batch of subscribers
export async function POST(request: NextRequest) {
  const { orgSlug, orgId, userId } = await auth()

  if (!orgSlug || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  try {
    const body = await request.json()
    const { subscriberIds, migrationRunId } = body

    if (!Array.isArray(subscriberIds) || subscriberIds.length === 0) {
      return NextResponse.json({ error: 'subscriberIds array required' }, { status: 400 })
    }

    if (!migrationRunId) {
      return NextResponse.json({ error: 'migrationRunId required' }, { status: 400 })
    }

    // Limit batch size to prevent timeouts
    if (subscriberIds.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 subscribers per batch' }, { status: 400 })
    }

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

    const credentials: ShopifyCredentials = {
      shop: shopifyIntegration.credentials_encrypted.shop as string,
      access_token: shopifyIntegration.credentials_encrypted.access_token as string,
    }

    // Load SKU map
    const skuMap = await getSkuMap(organization.id)
    if (skuMap.size === 0) {
      return NextResponse.json(
        { error: 'No SKU mappings found. Please map SKUs first.' },
        { status: 400 }
      )
    }

    // Fetch subscribers
    const { data: subscribers, error: subError } = await supabase
      .from('subscribers')
      .select('id, email, shopify_customer_id, first_name, last_name')
      .eq('organization_id', organization.id)
      .in('id', subscriberIds)

    if (subError || !subscribers) {
      return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 })
    }

    // Process each subscriber
    const results: Array<{
      subscriberId: string
      email: string
      status: 'clean' | 'flagged' | 'skipped' | 'error'
      flagReasons?: string[]
      proposedNextBox?: number
      error?: string
    }> = []

    for (const subscriber of subscribers) {
      try {
        // Fetch orders from Shopify
        const orders = await fetchCustomerOrders(
          credentials,
          subscriber.shopify_customer_id || undefined,
          subscriber.email
        )

        // Analyze the history
        const auditResult = analyzeOrderHistory(orders, skuMap)

        // Save to database
        await saveAuditResult(
          organization.id,
          migrationRunId,
          subscriber.id,
          subscriber.shopify_customer_id,
          subscriber.email,
          auditResult
        )

        results.push({
          subscriberId: subscriber.id,
          email: subscriber.email,
          status: auditResult.status,
          flagReasons: auditResult.flagReasons,
          proposedNextBox: auditResult.proposedNextBox,
        })
      } catch (error) {
        console.error(`[Audit] Error for ${subscriber.email}:`, error)
        results.push({
          subscriberId: subscriber.id,
          email: subscriber.email,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }

      // Small delay between subscribers to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    // Update migration run progress
    const cleanCount = results.filter(r => r.status === 'clean').length
    const flaggedCount = results.filter(r => r.status === 'flagged').length

    await supabase.rpc('increment_migration_progress', {
      run_id: migrationRunId,
      processed_count: results.length,
      clean_count: cleanCount,
      flagged_count: flaggedCount,
    })

    return NextResponse.json({
      processed: results.length,
      results,
    })
  } catch (error) {
    console.error('[Audit] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Audit failed' },
      { status: 500 }
    )
  }
}
