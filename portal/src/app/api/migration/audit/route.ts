import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import {
  getSkuMap,
  fetchCustomerOrders,
  analyzeOrderHistory,
  analyzeOrderHistoryByCount,
  saveAuditResult,
  ShopifyCredentials,
} from '@/lib/forensic-audit'
import { handleApiError, getErrorMessage } from '@/lib/api-utils'

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

    // Get matching SKUs for order count fallback
    const matchingSKUs = new Set(Array.from(skuMap.keys()))

    for (const subscriber of subscribers) {
      try {
        // Fetch orders from Shopify
        const orders = await fetchCustomerOrders(
          credentials,
          subscriber.shopify_customer_id || undefined,
          subscriber.email
        )

        // Analyze the history using hybrid mode:
        // 1. First try SKU mapping (for different SKU per episode)
        // 2. If all orders map to same sequence, use order count (for same-SKU subscriptions)
        let auditResult = analyzeOrderHistory(orders, skuMap)

        // Check if all detected sequences are the same (same-SKU scenario)
        const uniqueSequences = new Set(auditResult.detectedSequences)
        if (auditResult.detectedSequences.length > 0 && uniqueSequences.size === 1) {
          // All orders have same SKU/sequence - use order counting instead
          // Each order = 1 episode (e.g., ordered "Echoes of the Crucible" 5 times = Episode 5)
          auditResult = analyzeOrderHistoryByCount(orders, matchingSKUs, subscriber.email, subscriber.shopify_customer_id)
        }

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
        console.error(`[Audit] Error for ${subscriber.email}:`, getErrorMessage(error))
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
    return handleApiError(error, 'Audit', 'Audit failed')
  }
}
