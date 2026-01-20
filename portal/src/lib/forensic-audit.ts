/**
 * Forensic Audit Engine
 *
 * Scans Shopify order history to determine which box number a subscriber
 * should receive next. Uses evidence-based approach instead of trusting
 * subscription metadata.
 * 
 * Multi-layer matching:
 * 1. SKU exact match
 * 2. Product name pattern match
 * 3. Track unmapped items for review
 */

import { createServiceClient } from '@/lib/supabase/service'
import { extractSequenceFromName } from '@/lib/ai-assist'

// Types
export interface SkuAlias {
  id: string
  organization_id: string
  shopify_sku: string
  product_sequence_id: number
  product_name: string | null
  match_type?: 'sku' | 'product_name' | 'regex'
}

export interface ProductPattern {
  id: string
  organization_id: string
  pattern: string
  pattern_type: 'contains' | 'regex' | 'starts_with' | 'ends_with'
  product_sequence_id: number
  description?: string
}

export interface UnmappedLineItem {
  orderId: string
  orderNumber: number
  orderDate: string
  sku: string | null
  productName: string
  customerEmail: string
  shopifyCustomerId: string | null
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
  unmappedItems: UnmappedLineItem[]
  confidenceScore: number // 0-1 based on match quality
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
 * Load product patterns from database
 */
export async function getProductPatterns(organizationId: string): Promise<ProductPattern[]> {
  const supabase = createServiceClient()

  const { data: patterns, error } = await supabase
    .from('product_patterns')
    .select('*')
    .eq('organization_id', organizationId)

  if (error) {
    console.error('Failed to load product patterns:', error)
    return []
  }

  return patterns || []
}

/**
 * Match a product name against patterns
 * Returns the sequence number if matched, null otherwise
 */
export function matchProductNameToPattern(
  productName: string,
  patterns: ProductPattern[]
): { sequence: number; pattern: ProductPattern } | null {
  for (const pattern of patterns) {
    // If pattern has a specific sequence, check if name matches
    if (pattern.product_sequence_id > 0) {
      const matches = checkPatternMatch(productName, pattern)
      if (matches) {
        return { sequence: pattern.product_sequence_id, pattern }
      }
    } else {
      // Pattern uses {N} placeholder - extract sequence
      const sequence = extractSequenceFromName(
        productName,
        pattern.pattern,
        pattern.pattern_type
      )
      if (sequence !== null) {
        return { sequence, pattern }
      }
    }
  }
  return null
}

/**
 * Check if a product name matches a pattern
 */
function checkPatternMatch(productName: string, pattern: ProductPattern): boolean {
  const nameLower = productName.toLowerCase()
  const patternLower = pattern.pattern.toLowerCase()

  switch (pattern.pattern_type) {
    case 'contains':
      return nameLower.includes(patternLower)
    case 'starts_with':
      return nameLower.startsWith(patternLower)
    case 'ends_with':
      return nameLower.endsWith(patternLower)
    case 'regex':
      try {
        const regex = new RegExp(pattern.pattern, 'i')
        return regex.test(productName)
      } catch {
        return false
      }
    default:
      return false
  }
}

/**
 * The Core Audit Logic (Enhanced with multi-layer matching)
 * Analyzes orders and determines subscriber's box history and next box
 * 
 * Matching layers:
 * 1. Exact SKU match (highest confidence)
 * 2. Product name pattern match (medium confidence)
 * 3. Track unmapped items (for manual review)
 */
export function analyzeOrderHistory(
  orders: ShopifyOrder[],
  skuMap: Map<string, number>,
  patterns: ProductPattern[] = [],
  customerEmail?: string,
  shopifyCustomerId?: string | null
): AuditResult {
  const sequenceEvents: SequenceEvent[] = []
  const flagReasons: string[] = []
  const unmappedItems: UnmappedLineItem[] = []
  let matchedBySku = 0
  let matchedByPattern = 0

  // Step 1: Extract all subscription items from orders using multi-layer matching
  for (const order of orders) {
    for (const item of order.line_items) {
      let sequence: number | undefined
      let matchSource: 'sku' | 'pattern' | 'none' = 'none'

      // Layer 1: Exact SKU match (highest priority)
      if (item.sku) {
        const skuSequence = skuMap.get(item.sku.toLowerCase())
        if (skuSequence !== undefined) {
          sequence = skuSequence
          matchSource = 'sku'
          matchedBySku++
        }
      }

      // Layer 2: Product name pattern match (if no SKU match)
      if (sequence === undefined && patterns.length > 0) {
        const patternMatch = matchProductNameToPattern(item.name, patterns)
        if (patternMatch) {
          sequence = patternMatch.sequence
          matchSource = 'pattern'
          matchedByPattern++
        }
      }

      // If matched, add to sequence events
      if (sequence !== undefined) {
        sequenceEvents.push({
          sequence,
          date: order.created_at,
          orderId: order.id.toString(),
          orderNumber: order.order_number,
          sku: item.sku || '',
          productName: item.name,
        })
      } else {
        // Layer 3: Track unmapped items for review
        // Only track items that look like they could be subscription items
        // (skip obvious non-subscription items like shipping charges)
        const looksLikeSubscription = !isLikelyNonSubscriptionItem(item.name)
        if (looksLikeSubscription) {
          unmappedItems.push({
            orderId: order.id.toString(),
            orderNumber: order.order_number,
            orderDate: order.created_at,
            sku: item.sku || null,
            productName: item.name,
            customerEmail: customerEmail || order.customer?.email || '',
            shopifyCustomerId: shopifyCustomerId || order.customer?.id?.toString() || null,
          })
        }
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
      unmappedItems,
      confidenceScore: 0,
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

  // Step 8: Calculate confidence score
  // Higher confidence if more matches came from SKU (exact) vs pattern (fuzzy)
  const totalMatches = matchedBySku + matchedByPattern
  const confidenceScore = totalMatches > 0
    ? (matchedBySku * 1.0 + matchedByPattern * 0.8) / totalMatches
    : 0

  return {
    status,
    flagReasons: Array.from(new Set(flagReasons)), // Dedupe
    detectedSequences,
    sequenceEvents,
    proposedNextBox,
    rawOrders: orders,
    unmappedItems,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
  }
}

/**
 * Heuristic to filter out items that are clearly not subscription boxes
 */
function isLikelyNonSubscriptionItem(productName: string): boolean {
  const nonSubscriptionPatterns = [
    /shipping/i,
    /tax/i,
    /tip/i,
    /gratuity/i,
    /gift\s*card/i,
    /store\s*credit/i,
    /discount/i,
    /coupon/i,
    /handling/i,
    /insurance/i,
    /rush/i,
    /expedited/i,
    /upgrade/i,
  ]

  return nonSubscriptionPatterns.some(pattern => pattern.test(productName))
}

/**
 * Run a full audit for a single subscriber (enhanced with patterns)
 */
export async function auditSubscriber(
  organizationId: string,
  credentials: ShopifyCredentials,
  skuMap: Map<string, number>,
  patterns: ProductPattern[],
  subscriberId: string,
  shopifyCustomerId?: string,
  email?: string
): Promise<AuditResult & { subscriberId: string }> {
  // Fetch orders from Shopify
  const orders = await fetchCustomerOrders(credentials, shopifyCustomerId, email)

  // Analyze the history with multi-layer matching
  const result = analyzeOrderHistory(orders, skuMap, patterns, email, shopifyCustomerId)

  return {
    ...result,
    subscriberId,
  }
}

/**
 * Save audit result to database (enhanced with unmapped items)
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
      confidence_score: result.confidenceScore,
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

  // Save unmapped items for review
  if (result.unmappedItems.length > 0) {
    await saveUnmappedItems(organizationId, migrationRunId, result.unmappedItems)
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
 * Save unmapped line items for manual review
 */
export async function saveUnmappedItems(
  organizationId: string,
  migrationRunId: string,
  items: UnmappedLineItem[]
): Promise<void> {
  if (items.length === 0) return

  const supabase = createServiceClient()

  // Dedupe by order ID + product name to avoid duplicates
  const seen = new Set<string>()
  const uniqueItems = items.filter(item => {
    const key = `${item.orderId}-${item.productName}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Insert in batches
  const batchSize = 100
  for (let i = 0; i < uniqueItems.length; i += batchSize) {
    const batch = uniqueItems.slice(i, i + batchSize)
    
    const { error } = await supabase
      .from('unmapped_items')
      .upsert(
        batch.map(item => ({
          organization_id: organizationId,
          migration_run_id: migrationRunId,
          shopify_order_id: item.orderId,
          order_number: item.orderNumber,
          sku: item.sku,
          product_name: item.productName,
          order_date: item.orderDate,
          customer_email: item.customerEmail,
          shopify_customer_id: item.shopifyCustomerId,
        })),
        { onConflict: 'organization_id,shopify_order_id,product_name' }
      )

    if (error) {
      console.error('Failed to save unmapped items batch:', error)
    }
  }

  // Update migration run unmapped count
  await supabase
    .from('migration_runs')
    .update({
      unmapped_count: uniqueItems.length,
    })
    .eq('id', migrationRunId)
}

/**
 * Get unmapped items for an organization
 */
export async function getUnmappedItems(
  organizationId: string,
  options?: {
    resolved?: boolean
    limit?: number
    offset?: number
    search?: string
  }
): Promise<{ items: UnmappedLineItem[]; total: number }> {
  const supabase = createServiceClient()

  let query = supabase
    .from('unmapped_items')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)

  if (options?.resolved !== undefined) {
    query = query.eq('resolved', options.resolved)
  }

  if (options?.search) {
    query = query.or(`product_name.ilike.%${options.search}%,sku.ilike.%${options.search}%,customer_email.ilike.%${options.search}%`)
  }

  query = query.order('order_date', { ascending: false })

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
  }

  const { data, count, error } = await query

  if (error) {
    console.error('Failed to get unmapped items:', error)
    return { items: [], total: 0 }
  }

  return {
    items: (data || []).map(item => ({
      orderId: item.shopify_order_id,
      orderNumber: item.order_number,
      orderDate: item.order_date,
      sku: item.sku,
      productName: item.product_name,
      customerEmail: item.customer_email,
      shopifyCustomerId: item.shopify_customer_id,
    })),
    total: count || 0,
  }
}

/**
 * Resolve unmapped items by assigning them to a sequence
 */
export async function resolveUnmappedItems(
  organizationId: string,
  itemIds: string[],
  sequence: number,
  resolvedBy: string,
  method: 'manual' | 'pattern' | 'ai_suggest' | 'bulk' = 'manual'
): Promise<void> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('unmapped_items')
    .update({
      resolved: true,
      resolved_sequence: sequence,
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedBy,
      resolution_method: method,
    })
    .eq('organization_id', organizationId)
    .in('id', itemIds)

  if (error) {
    throw new Error(`Failed to resolve unmapped items: ${error.message}`)
  }
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
