import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * POST /api/migration/scan-products
 *
 * Scans Shopify order history and populates the product_variations table
 * with all unique product name/SKU/variant combinations found.
 */
export async function POST(request: NextRequest) {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    // Get Shopify credentials
    const { data: shopifyIntegration } = await supabase
      .from('integrations')
      .select('credentials_encrypted')
      .eq('organization_id', orgId)
      .eq('type', 'shopify')
      .eq('connected', true)
      .single()

    if (!shopifyIntegration?.credentials_encrypted) {
      return NextResponse.json({ error: 'Shopify not connected' }, { status: 400 })
    }

    const shop = shopifyIntegration.credentials_encrypted.shop as string
    const accessToken = shopifyIntegration.credentials_encrypted.access_token as string

    // Fetch orders from Shopify (last 2 years, paginated)
    const variationMap = new Map<string, {
      productName: string
      variantTitle: string | null
      sku: string | null
      productId: number | null
      variantId: number | null
      count: number
      firstSeen: string
      lastSeen: string
      sampleOrderNumbers: number[]
      sampleProperties: Array<{ name: string; value: string }> | null
    }>()

    const params = new URLSearchParams({
      status: 'any',
      limit: '250',
      created_at_min: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    })

    let currentUrl: string | null = `https://${shop}/admin/api/2024-01/orders.json?${params.toString()}`
    let pageCount = 0
    const maxPages = 50 // Up to ~12,500 orders

    while (currentUrl && pageCount < maxPages) {
      const orderResponse: Response = await fetch(currentUrl, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      })

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text()
        return NextResponse.json(
          { error: `Shopify API error: ${orderResponse.status} - ${errorText}` },
          { status: 500 }
        )
      }

      const data = await orderResponse.json()

      for (const order of data.orders || []) {
        for (const item of order.line_items || []) {
          // Create unique key from name + variant + sku
          const key = `${item.name}|||${item.variant_title || ''}|||${item.sku || ''}`

          const existing = variationMap.get(key)
          if (existing) {
            existing.count += item.quantity
            if (order.created_at < existing.firstSeen) existing.firstSeen = order.created_at
            if (order.created_at > existing.lastSeen) existing.lastSeen = order.created_at
            if (existing.sampleOrderNumbers.length < 3) {
              existing.sampleOrderNumbers.push(order.order_number)
            }
            if (!existing.sampleProperties && item.properties?.length > 0) {
              existing.sampleProperties = item.properties
            }
          } else {
            variationMap.set(key, {
              productName: item.name,
              variantTitle: item.variant_title || null,
              sku: item.sku || null,
              productId: item.product_id || null,
              variantId: item.variant_id || null,
              count: item.quantity,
              firstSeen: order.created_at,
              lastSeen: order.created_at,
              sampleOrderNumbers: [order.order_number],
              sampleProperties: item.properties?.length > 0 ? item.properties : null,
            })
          }
        }
      }

      // Check for pagination
      const linkHeader = orderResponse.headers.get('Link')
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
        currentUrl = match ? match[1] : null
      } else {
        currentUrl = null
      }

      pageCount++
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Convert to array and upsert into database
    const variations = Array.from(variationMap.values())

    let insertedCount = 0
    let updatedCount = 0

    for (const variation of variations) {
      const { data: existing } = await supabase
        .from('product_variations')
        .select('id')
        .eq('organization_id', orgId)
        .eq('product_name', variation.productName)
        .eq('variant_title', variation.variantTitle || '')
        .eq('sku', variation.sku || '')
        .single()

      if (existing) {
        // Update existing
        await supabase
          .from('product_variations')
          .update({
            order_count: variation.count,
            first_seen: variation.firstSeen,
            last_seen: variation.lastSeen,
            sample_order_numbers: variation.sampleOrderNumbers,
            sample_properties: variation.sampleProperties,
            shopify_product_id: variation.productId,
            shopify_variant_id: variation.variantId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
        updatedCount++
      } else {
        // Insert new
        await supabase.from('product_variations').insert({
          organization_id: orgId,
          product_name: variation.productName,
          variant_title: variation.variantTitle,
          sku: variation.sku,
          shopify_product_id: variation.productId,
          shopify_variant_id: variation.variantId,
          order_count: variation.count,
          first_seen: variation.firstSeen,
          last_seen: variation.lastSeen,
          sample_order_numbers: variation.sampleOrderNumbers,
          sample_properties: variation.sampleProperties,
        })
        insertedCount++
      }
    }

    return NextResponse.json({
      success: true,
      totalVariations: variations.length,
      inserted: insertedCount,
      updated: updatedCount,
      pagesScanned: pageCount,
    })
  } catch (error) {
    console.error('Error scanning products:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
