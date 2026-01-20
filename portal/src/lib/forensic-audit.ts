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

// Recharge API credentials
export interface RechargeCredentials {
  apiKey: string
}

// Recharge charge from API
export interface RechargeChargeRecord {
  id: number
  customer_id: number
  subscription_id: number
  status: 'SUCCESS' | 'QUEUED' | 'ERROR' | 'REFUNDED' | 'SKIPPED' | 'PARTIALLY_REFUNDED'
  scheduled_at: string
  processed_at: string | null
  created_at: string
  total_price: string
  line_items: Array<{
    subscription_id: number
    title: string
    sku: string | null
    quantity: number
    purchase_item_id: number
  }>
}

// Audit mode - how to determine episode/box number
export type AuditMode =
  | 'sku_mapping'      // Use SKU → sequence mapping (different SKU per episode)
  | 'charge_count'     // Count Recharge charges (same SKU, recurring)
  | 'order_count'      // Count Shopify orders (each matching order = 1 episode)
  | 'hybrid'           // Try SKU first, fall back to order count

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
  const maxPages = 100 // Increased to support larger stores with 3 years of data

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
 * Fetch all charges for a customer from Recharge
 * Returns charges sorted by processed_at date (oldest first)
 */
export async function fetchCustomerCharges(
  credentials: RechargeCredentials,
  rechargeCustomerId: string,
  subscriptionSku?: string // Optional: filter to specific SKU
): Promise<RechargeChargeRecord[]> {
  const allCharges: RechargeChargeRecord[] = []

  const params = new URLSearchParams({
    customer_id: rechargeCustomerId,
    limit: '250',
    sort_by: 'scheduled_at-asc',
  })

  let nextCursor: string | null = null

  do {
    const url = new URL('https://api.rechargeapps.com/charges')
    url.search = params.toString()
    if (nextCursor) {
      url.searchParams.set('cursor', nextCursor)
    }

    const response = await fetch(url.toString(), {
      headers: {
        'X-Recharge-Access-Token': credentials.apiKey,
        'X-Recharge-Version': '2021-11',
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Recharge API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    allCharges.push(...(data.charges || []))

    nextCursor = data.next_cursor || null

    // Respect rate limits
    await new Promise(resolve => setTimeout(resolve, 200))
  } while (nextCursor)

  // Filter to successful charges and optionally by SKU
  let filteredCharges = allCharges.filter(c => c.status === 'SUCCESS')

  if (subscriptionSku) {
    filteredCharges = filteredCharges.filter(c =>
      c.line_items.some(item =>
        item.sku?.toLowerCase() === subscriptionSku.toLowerCase()
      )
    )
  }

  // Sort by processed date (oldest first)
  return filteredCharges.sort((a, b) => {
    const dateA = a.processed_at || a.scheduled_at
    const dateB = b.processed_at || b.scheduled_at
    return new Date(dateA).getTime() - new Date(dateB).getTime()
  })
}

/**
 * Analyze charge history to determine box sequence
 * For same-SKU subscriptions where Recharge charge count = episode number
 */
export function analyzeChargeHistory(
  charges: RechargeChargeRecord[],
  subscriptionSku?: string,
  customerEmail?: string,
  rechargeCustomerId?: string
): AuditResult {
  const sequenceEvents: SequenceEvent[] = []
  const flagReasons: string[] = []

  if (charges.length === 0) {
    return {
      status: 'flagged',
      flagReasons: ['no_history'],
      detectedSequences: [],
      sequenceEvents: [],
      proposedNextBox: 1,
      rawOrders: [],
      unmappedItems: [],
      confidenceScore: 0,
    }
  }

  // Each successful charge = one episode/box in sequence
  charges.forEach((charge, index) => {
    const sequence = index + 1 // First charge = Episode 1
    const lineItem = charge.line_items[0] // Primary subscription item

    sequenceEvents.push({
      sequence,
      date: charge.processed_at || charge.scheduled_at,
      orderId: charge.id.toString(),
      orderNumber: charge.id,
      sku: lineItem?.sku || subscriptionSku || '',
      productName: lineItem?.title || 'Subscription Box',
    })
  })

  // Extract sequences
  const detectedSequences = sequenceEvents.map(e => e.sequence)
  const maxSeq = Math.max(...detectedSequences)
  const proposedNextBox = maxSeq + 1

  // For charge-based tracking, we don't expect gaps (each charge = sequential box)
  // But check for duplicate charges on same day (could indicate issue)
  const dateSet = new Set<string>()
  for (const event of sequenceEvents) {
    const dateKey = event.date.split('T')[0] // Just the date part
    if (dateSet.has(dateKey)) {
      // Multiple charges same day - could be valid (multiple subs) or an issue
      // Don't flag, but note for confidence
    }
    dateSet.add(dateKey)
  }

  return {
    status: 'clean', // Charge-based is usually clean (sequential by definition)
    flagReasons,
    detectedSequences,
    sequenceEvents,
    proposedNextBox,
    rawOrders: [], // No Shopify orders in charge-based mode
    unmappedItems: [],
    confidenceScore: 1.0, // High confidence - charges are definitive
  }
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
 * Analyze order history by counting orders (for same-SKU subscriptions)
 * Each matching order = 1 episode, counted chronologically
 *
 * This is useful when:
 * - All subscription items have the same SKU (e.g., "Echoes of the Crucible")
 * - Customer ordered the same product 5 times = Episode 5
 */
export function analyzeOrderHistoryByCount(
  orders: ShopifyOrder[],
  matchingSKUs: Set<string>, // SKUs that represent subscription items
  customerEmail?: string,
  shopifyCustomerId?: string | null
): AuditResult {
  const sequenceEvents: SequenceEvent[] = []
  const flagReasons: string[] = []
  const unmappedItems: UnmappedLineItem[] = []

  // Step 1: Extract all subscription items from orders (by matching SKU)
  // Sort orders by date first
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  let episodeCounter = 0

  for (const order of sortedOrders) {
    for (const item of order.line_items) {
      const skuLower = item.sku?.toLowerCase() || ''
      const nameLower = item.name?.toLowerCase() || ''

      // Check if this item matches any subscription SKU or product name
      const isMatch = matchingSKUs.size === 0 || // If no SKUs specified, match all items
        matchingSKUs.has(skuLower) ||
        Array.from(matchingSKUs).some(sku => nameLower.includes(sku))

      if (isMatch && !isLikelyNonSubscriptionItem(item.name)) {
        // Each quantity unit counts as a separate episode
        for (let q = 0; q < item.quantity; q++) {
          episodeCounter++
          sequenceEvents.push({
            sequence: episodeCounter,
            date: order.created_at,
            orderId: order.id.toString(),
            orderNumber: order.order_number,
            sku: item.sku || '',
            productName: item.name,
          })
        }
      } else if (!isLikelyNonSubscriptionItem(item.name)) {
        // Track as unmapped
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

  // Step 2: Handle no history case
  if (sequenceEvents.length === 0) {
    return {
      status: 'flagged',
      flagReasons: ['no_history'],
      detectedSequences: [],
      sequenceEvents: [],
      proposedNextBox: 1,
      rawOrders: orders,
      unmappedItems,
      confidenceScore: 0,
    }
  }

  // For order-count mode, sequences are always clean (1, 2, 3, 4...)
  // No gaps or duplicates possible by definition
  const detectedSequences = sequenceEvents.map(e => e.sequence)
  const maxSeq = Math.max(...detectedSequences)
  const proposedNextBox = maxSeq + 1

  return {
    status: 'clean',
    flagReasons,
    detectedSequences,
    sequenceEvents,
    proposedNextBox,
    rawOrders: orders,
    unmappedItems,
    confidenceScore: 1.0, // High confidence - order count is definitive
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
 * Supports multiple audit modes:
 * - sku_mapping: Use SKU → sequence mapping (different SKU per episode)
 * - charge_count: Count Recharge charges (same SKU, recurring)
 * - order_count: Count Shopify orders (each matching order = 1 episode)
 * - hybrid: Try SKU mapping first, fall back to order count
 */
export async function auditSubscriber(
  organizationId: string,
  credentials: ShopifyCredentials,
  skuMap: Map<string, number>,
  patterns: ProductPattern[],
  subscriberId: string,
  shopifyCustomerId?: string,
  email?: string,
  options?: {
    auditMode?: AuditMode
    rechargeCredentials?: RechargeCredentials
    rechargeCustomerId?: string
    subscriptionSku?: string // The recurring SKU to track charges for
    matchingSKUs?: Set<string> // SKUs to match for order_count mode
  }
): Promise<AuditResult & { subscriberId: string }> {
  const auditMode = options?.auditMode || 'sku_mapping'

  // Charge count mode - use Recharge charge history
  if (auditMode === 'charge_count' && options?.rechargeCredentials && options?.rechargeCustomerId) {
    const charges = await fetchCustomerCharges(
      options.rechargeCredentials,
      options.rechargeCustomerId,
      options.subscriptionSku
    )
    const result = analyzeChargeHistory(charges, options.subscriptionSku, email, options.rechargeCustomerId)
    return { ...result, subscriberId }
  }

  // Order count mode - count each Shopify order as an episode
  if (auditMode === 'order_count') {
    const orders = await fetchCustomerOrders(credentials, shopifyCustomerId, email)
    const matchingSKUs = options?.matchingSKUs || new Set(Array.from(skuMap.keys()))
    const result = analyzeOrderHistoryByCount(orders, matchingSKUs, email, shopifyCustomerId)
    return { ...result, subscriberId }
  }

  // Hybrid mode - try SKU mapping first, fall back to order count
  if (auditMode === 'hybrid') {
    // First try SKU mapping via Shopify orders
    const orders = await fetchCustomerOrders(credentials, shopifyCustomerId, email)
    const skuResult = analyzeOrderHistory(orders, skuMap, patterns, email, shopifyCustomerId)

    // If we got clean results with SKU mapping and multiple sequences, use them
    // (If only 1 sequence detected, likely same-SKU scenario - fall back to order count)
    const uniqueSequences = new Set(skuResult.detectedSequences)
    if (skuResult.status === 'clean' && uniqueSequences.size > 1) {
      return { ...skuResult, subscriberId }
    }

    // Fall back to order count for same-SKU subscriptions
    if (skuResult.detectedSequences.length > 0 && uniqueSequences.size === 1) {
      // All orders map to same sequence - use order count instead
      const matchingSKUs = options?.matchingSKUs || new Set(Array.from(skuMap.keys()))
      const countResult = analyzeOrderHistoryByCount(orders, matchingSKUs, email, shopifyCustomerId)
      return { ...countResult, subscriberId }
    }

    // Fall back to charge count if no SKU mapping results and we have Recharge creds
    if (options?.rechargeCredentials && options?.rechargeCustomerId) {
      const charges = await fetchCustomerCharges(
        options.rechargeCredentials,
        options.rechargeCustomerId,
        options.subscriptionSku
      )
      if (charges.length > 0) {
        const chargeResult = analyzeChargeHistory(charges, options.subscriptionSku, email, options.rechargeCustomerId)
        return { ...chargeResult, subscriberId }
      }
    }

    // Return SKU result even if flagged
    return { ...skuResult, subscriberId }
  }

  // Default: SKU mapping mode via Shopify orders
  const orders = await fetchCustomerOrders(credentials, shopifyCustomerId, email)
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
        box_number: result.proposedNextBox - 1, // Current = last received
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
        box_number: resolvedNextBox - 1,
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
