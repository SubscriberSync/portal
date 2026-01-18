/**
 * Forensic Audit Engine
 *
 * Scans Shopify order history to determine which box number a subscriber
 * should receive next. Uses evidence-based approach instead of trusting
 * subscription metadata.
 */

import { createServiceClient } from '@/lib/supabase/service'

// Types
export interface SkuAlias {
  id: string
  organization_id: string
  shopify_sku: string
  product_sequence_id: number
  product_name: string | null
}

export interface ShopifyOrder {
  id: number
  order_number: number
  created_at: string
  customer: {
    id: number
    email: string
  } | null
  line_items: Array<{
    id: number
    sku: string
    name: string
    quantity: number
    product_id: number
  }>
}

export interface SequenceEvent {
  sequence: number
  date: string
  orderId: string
  orderNumber: number
  sku: string
  productName: string
}

export interface AuditResult {
  status: 'clean' | 'flagged' | 'skipped'
  flagReasons: string[]
  detectedSequences: number[]
  sequenceEvents: SequenceEvent[]
  proposedNextBox: number
  rawOrders: ShopifyOrder[]
}

export type FlagReason =
  | 'gap_detected'      // Missing box in sequence (1, 2, 4)
  | 'duplicate_box'     // Same box shipped twice
  | 'time_traveler'     // Box 5 shipped before Box 2
  | 'no_history'        // No subscription orders found
  | 'multiple_customers' // Multiple Shopify customer IDs for same email

// Shopify API helpers
export interface ShopifyCredentials {
  shop: string
  access_token: string
}

/**
 * Fetch all orders for a customer from Shopify
 * Uses customer ID if available, falls back to email
 */
export async function fetchCustomerOrders(
  credentials: ShopifyCredentials,
  customerId?: string,
  email?: string
): Promise<ShopifyOrder[]> {
  const { shop, access_token } = credentials
  const allOrders: ShopifyOrder[] = []

  // Build query params
  const params = new URLSearchParams({
    status: 'any',
    limit: '250',
    fields: 'id,order_number,created_at,customer,line_items',
  })

  // Prefer customer ID over email for accuracy
  if (customerId) {
    params.set('customer_id', customerId)
  } else if (email) {
    params.set('email', email)
  } else {
    throw new Error('Must provide either customerId or email')
  }

  let nextUrl: string | null = `https://${shop}/admin/api/2024-01/orders.json?${params.toString()}`

  // Paginate through all orders
  while (nextUrl) {
    const response: Response = await fetch(nextUrl, {
      headers: {
        'X-Shopify-Access-Token': access_token,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Shopify API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    allOrders.push(...data.orders)

    // Check for pagination link
    const linkHeader = response.headers.get('Link')
    if (linkHeader && linkHeader.includes('rel="next"')) {
      const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
      nextUrl = match ? match[1] : null
    } else {
      nextUrl = null
    }

    // Respect rate limits (2 calls per second for REST API)
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return allOrders
}

/**
 * Fetch all unique SKUs from recent Shopify orders
 * Used for initial SKU mapping setup
 */
export async function fetchUniqueSKUs(
  credentials: ShopifyCredentials,
  sinceDate?: string
): Promise<Map<string, { sku: string; name: string; count: number }>> {
  const { shop, access_token } = credentials
  const skuMap = new Map<string, { sku: string; name: string; count: number }>()

  const params = new URLSearchParams({
    status: 'any',
    limit: '250',
    fields: 'line_items',
  })

  if (sinceDate) {
    params.set('created_at_min', sinceDate)
  }

  let currentUrl: string | null = `https://${shop}/admin/api/2024-01/orders.json?${params.toString()}`
  let pageCount = 0
  const maxPages = 20 // Limit to prevent runaway requests

  while (currentUrl && pageCount < maxPages) {
    const response: Response = await fetch(currentUrl, {
      headers: {
        'X-Shopify-Access-Token': access_token,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`)
    }

    const data = await response.json()

    for (const order of data.orders) {
      for (const item of order.line_items) {
        if (item.sku) {
          const existing = skuMap.get(item.sku.toLowerCase())
          if (existing) {
            existing.count += item.quantity
          } else {
            skuMap.set(item.sku.toLowerCase(), {
              sku: item.sku,
              name: item.name,
              count: item.quantity,
            })
          }
        }
      }
    }

    // Check for pagination
    const linkHeader = response.headers.get('Link')
    if (linkHeader && linkHeader.includes('rel="next"')) {
      const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
      currentUrl = match ? match[1] : null
    } else {
      currentUrl = null
    }

    pageCount++
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return skuMap
}

/**
 * Build SKU lookup map from database
 */
export async function getSkuMap(organizationId: string): Promise<Map<string, number>> {
  const supabase = createServiceClient()

  const { data: aliases, error } = await supabase
    .from('sku_aliases')
    .select('shopify_sku, product_sequence_id')
    .eq('organization_id', organizationId)

  if (error) {
    throw new Error(`Failed to load SKU aliases: ${error.message}`)
  }

  const skuMap = new Map<string, number>()
  for (const alias of aliases || []) {
    skuMap.set(alias.shopify_sku.toLowerCase(), alias.product_sequence_id)
  }

  return skuMap
}

/**
 * The Core Audit Logic
 * Analyzes orders and determines subscriber's box history and next box
 */
export function analyzeOrderHistory(
  orders: ShopifyOrder[],
  skuMap: Map<string, number>
): AuditResult {
  const sequenceEvents: SequenceEvent[] = []
  const flagReasons: string[] = []

  // Step 1: Extract all subscription items from orders
  for (const order of orders) {
    for (const item of order.line_items) {
      if (!item.sku) continue

      const sequence = skuMap.get(item.sku.toLowerCase())
      if (sequence !== undefined) {
        sequenceEvents.push({
          sequence,
          date: order.created_at,
          orderId: order.id.toString(),
          orderNumber: order.order_number,
          sku: item.sku,
          productName: item.name,
        })
      }
    }
  }

  // Step 2: Handle no history case
  if (sequenceEvents.length === 0) {
    return {
      status: 'flagged',
      flagReasons: ['no_history'],
      detectedSequences: [],
      sequenceEvents: [],
      proposedNextBox: 1, // Default to Box 1 if no history
      rawOrders: orders,
    }
  }

  // Step 3: Sort by date (oldest first)
  sequenceEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Step 4: Extract unique sequences in chronological order
  const detectedSequences = sequenceEvents.map(e => e.sequence)
  const uniqueSequences = Array.from(new Set(detectedSequences)).sort((a, b) => a - b)

  // Step 5: Check for flags

  // Flag: Duplicates (same box shipped multiple times)
  const sequenceCounts: Record<number, number> = {}
  for (const seq of detectedSequences) {
    sequenceCounts[seq] = (sequenceCounts[seq] || 0) + 1
  }
  for (const seq of Object.keys(sequenceCounts)) {
    if (sequenceCounts[Number(seq)] > 1) {
      flagReasons.push('duplicate_box')
      break
    }
  }

  // Flag: Gaps in sequence
  const minSeq = Math.min(...uniqueSequences)
  const maxSeq = Math.max(...uniqueSequences)
  for (let i = minSeq; i <= maxSeq; i++) {
    if (!uniqueSequences.includes(i)) {
      flagReasons.push('gap_detected')
      break
    }
  }

  // Flag: Time Traveler (received higher box before lower box)
  for (let i = 1; i < sequenceEvents.length; i++) {
    const prev = sequenceEvents[i - 1]
    const curr = sequenceEvents[i]
    // If current sequence is LOWER than previous, that's weird
    // (but only flag if it's not a duplicate)
    if (curr.sequence < prev.sequence && curr.sequence !== prev.sequence) {
      // Check if this is just a gap being filled vs true time travel
      const prevDate = new Date(prev.date)
      const currDate = new Date(curr.date)
      if (currDate > prevDate) {
        // They received a lower box AFTER a higher one
        flagReasons.push('time_traveler')
        break
      }
    }
  }

  // Step 6: Calculate next box
  const proposedNextBox = maxSeq + 1

  // Step 7: Determine status
  const status = flagReasons.length > 0 ? 'flagged' : 'clean'

  return {
    status,
    flagReasons: Array.from(new Set(flagReasons)), // Dedupe
    detectedSequences,
    sequenceEvents,
    proposedNextBox,
    rawOrders: orders,
  }
}

/**
 * Run a full audit for a single subscriber
 */
export async function auditSubscriber(
  organizationId: string,
  credentials: ShopifyCredentials,
  skuMap: Map<string, number>,
  subscriberId: string,
  shopifyCustomerId?: string,
  email?: string
): Promise<AuditResult & { subscriberId: string }> {
  // Fetch orders from Shopify
  const orders = await fetchCustomerOrders(credentials, shopifyCustomerId, email)

  // Analyze the history
  const result = analyzeOrderHistory(orders, skuMap)

  return {
    ...result,
    subscriberId,
  }
}

/**
 * Save audit result to database
 */
export async function saveAuditResult(
  organizationId: string,
  migrationRunId: string,
  subscriberId: string | null,
  shopifyCustomerId: string | null,
  email: string,
  result: AuditResult
): Promise<string> {
  const supabase = createServiceClient()

  // Insert audit log
  const { data: auditLog, error: auditError } = await supabase
    .from('audit_logs')
    .insert({
      organization_id: organizationId,
      migration_run_id: migrationRunId,
      subscriber_id: subscriberId,
      shopify_customer_id: shopifyCustomerId,
      email,
      status: result.status,
      flag_reasons: result.flagReasons,
      detected_sequences: result.detectedSequences,
      sequence_dates: result.sequenceEvents,
      proposed_next_box: result.proposedNextBox,
      raw_orders: result.rawOrders.map(o => ({
        id: o.id,
        order_number: o.order_number,
        created_at: o.created_at,
      })),
    })
    .select('id')
    .single()

  if (auditError) {
    throw new Error(`Failed to save audit log: ${auditError.message}`)
  }

  // If clean, auto-update subscriber
  if (result.status === 'clean' && subscriberId) {
    await supabase
      .from('subscribers')
      .update({
        current_product_sequence: result.proposedNextBox - 1, // Current = last received
        migration_status: 'audited',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriberId)

    // Backfill shipment history
    await backfillShipmentHistory(organizationId, subscriberId, result.sequenceEvents)
  } else if (result.status === 'flagged' && subscriberId) {
    await supabase
      .from('subscribers')
      .update({
        migration_status: 'flagged',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriberId)
  }

  return auditLog.id
}

/**
 * Create archived shipment records for historical orders
 */
async function backfillShipmentHistory(
  organizationId: string,
  subscriberId: string,
  sequenceEvents: SequenceEvent[]
): Promise<void> {
  const supabase = createServiceClient()

  // Dedupe by order ID to avoid duplicate shipments
  const seenOrderIds = new Set<string>()
  const uniqueEvents = sequenceEvents.filter(e => {
    if (seenOrderIds.has(e.orderId)) return false
    seenOrderIds.add(e.orderId)
    return true
  })

  for (const event of uniqueEvents) {
    // Check if shipment already exists for this order
    const { data: existing } = await supabase
      .from('shipments')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('shopify_order_id', event.orderId)
      .single()

    if (existing) continue // Skip if already exists

    // Create archived shipment
    await supabase.from('shipments').insert({
      organization_id: organizationId,
      subscriber_id: subscriberId,
      status: 'Shipped', // Historical = already shipped
      product_name: event.productName,
      variant_name: `Box ${event.sequence}`,
      sequence_id: event.sequence,
      shopify_order_id: event.orderId,
      order_number: `#${event.orderNumber}`,
      is_backfilled: true,
      shipped_at: event.date,
      created_at: event.date,
    })
  }
}

/**
 * Resolve a flagged audit record manually
 */
export async function resolveAuditRecord(
  auditLogId: string,
  resolvedNextBox: number,
  resolvedBy: string,
  note?: string
): Promise<void> {
  const supabase = createServiceClient()

  // Get the audit log
  const { data: auditLog, error: fetchError } = await supabase
    .from('audit_logs')
    .select('subscriber_id, organization_id, sequence_dates')
    .eq('id', auditLogId)
    .single()

  if (fetchError || !auditLog) {
    throw new Error('Audit log not found')
  }

  // Update audit log as resolved
  const { error: updateError } = await supabase
    .from('audit_logs')
    .update({
      status: 'resolved',
      resolved_next_box: resolvedNextBox,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
      resolution_note: note,
    })
    .eq('id', auditLogId)

  if (updateError) {
    throw new Error(`Failed to update audit log: ${updateError.message}`)
  }

  // Update subscriber with resolved value
  if (auditLog.subscriber_id) {
    await supabase
      .from('subscribers')
      .update({
        current_product_sequence: resolvedNextBox - 1,
        migration_status: 'resolved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', auditLog.subscriber_id)

    // Backfill shipment history
    const sequenceEvents = auditLog.sequence_dates as SequenceEvent[]
    if (sequenceEvents?.length > 0) {
      await backfillShipmentHistory(
        auditLog.organization_id,
        auditLog.subscriber_id,
        sequenceEvents
      )
    }
  }
}

/**
 * Get migration run statistics
 */
export async function getMigrationStats(organizationId: string, runId?: string) {
  const supabase = createServiceClient()

  let query = supabase
    .from('audit_logs')
    .select('status', { count: 'exact' })
    .eq('organization_id', organizationId)

  if (runId) {
    query = query.eq('migration_run_id', runId)
  }

  const { count: total } = await query

  const { count: clean } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'clean')
    .match(runId ? { migration_run_id: runId } : {})

  const { count: flagged } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'flagged')
    .match(runId ? { migration_run_id: runId } : {})

  const { count: resolved } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'resolved')
    .match(runId ? { migration_run_id: runId } : {})

  return {
    total: total || 0,
    clean: clean || 0,
    flagged: flagged || 0,
    resolved: resolved || 0,
  }
}
