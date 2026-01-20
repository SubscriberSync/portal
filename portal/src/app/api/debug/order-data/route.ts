import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Diagnostic endpoint to see actual Shopify order data structure
 *
 * GET /api/debug/order-data
 *
 * Returns:
 * - All unique product names/SKUs/variants from order history
 * - Sample orders to show data structure
 * - Recharge subscription data if connected
 */
export async function GET(request: NextRequest) {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    orgId,
  }

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
    const allLineItems: Array<{
      orderId: number
      orderNumber: number
      orderDate: string
      productId: number | null
      variantId: number | null
      sku: string | null
      name: string
      variantTitle: string | null
      quantity: number
      price: string
      properties: Array<{ name: string; value: string }> | null
    }> = []

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
        diagnostics.shopifyError = `${orderResponse.status}: ${await orderResponse.text()}`
        break
      }

      const data = await orderResponse.json()

      for (const order of data.orders || []) {
        for (const item of order.line_items || []) {
          allLineItems.push({
            orderId: order.id,
            orderNumber: order.order_number,
            orderDate: order.created_at,
            productId: item.product_id,
            variantId: item.variant_id,
            sku: item.sku || null,
            name: item.name,
            variantTitle: item.variant_title || null,
            quantity: item.quantity,
            price: item.price,
            properties: item.properties?.length > 0 ? item.properties : null,
          })
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

    diagnostics.totalLineItems = allLineItems.length
    diagnostics.pagesScanned = pageCount

    // Group by unique product identifiers
    const productMap = new Map<string, {
      name: string
      sku: string | null
      variantTitle: string | null
      productId: number | null
      variantId: number | null
      count: number
      firstSeen: string
      lastSeen: string
      sampleProperties: Array<{ name: string; value: string }> | null
      sampleOrderNumbers: number[]
    }>()

    for (const item of allLineItems) {
      // Use name + variant as the key since SKUs might be missing
      const key = `${item.name}|||${item.variantTitle || ''}|||${item.sku || ''}`

      const existing = productMap.get(key)
      if (existing) {
        existing.count += item.quantity
        if (item.orderDate < existing.firstSeen) existing.firstSeen = item.orderDate
        if (item.orderDate > existing.lastSeen) existing.lastSeen = item.orderDate
        if (existing.sampleOrderNumbers.length < 3) {
          existing.sampleOrderNumbers.push(item.orderNumber)
        }
        if (!existing.sampleProperties && item.properties) {
          existing.sampleProperties = item.properties
        }
      } else {
        productMap.set(key, {
          name: item.name,
          sku: item.sku,
          variantTitle: item.variantTitle,
          productId: item.productId,
          variantId: item.variantId,
          count: item.quantity,
          firstSeen: item.orderDate,
          lastSeen: item.orderDate,
          sampleProperties: item.properties,
          sampleOrderNumbers: [item.orderNumber],
        })
      }
    }

    // Convert to array and sort by count
    const uniqueProducts = Array.from(productMap.values())
      .sort((a, b) => b.count - a.count)

    diagnostics.uniqueProductVariations = uniqueProducts.length
    diagnostics.products = uniqueProducts

    // Get 5 sample raw orders to show full structure
    const sampleOrdersResponse = await fetch(
      `https://${shop}/admin/api/2024-01/orders.json?limit=5&status=any`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    )

    if (sampleOrdersResponse.ok) {
      const sampleData = await sampleOrdersResponse.json()
      // Redact customer PII but keep structure
      diagnostics.sampleOrders = (sampleData.orders || []).map((order: Record<string, unknown>) => ({
        id: order.id,
        order_number: order.order_number,
        created_at: order.created_at,
        financial_status: order.financial_status,
        fulfillment_status: order.fulfillment_status,
        tags: order.tags,
        note: order.note,
        line_items: (order.line_items as Array<Record<string, unknown>>)?.map(item => ({
          id: item.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          sku: item.sku,
          name: item.name,
          title: item.title,
          variant_title: item.variant_title,
          quantity: item.quantity,
          price: item.price,
          properties: item.properties,
          fulfillment_service: item.fulfillment_service,
          product_exists: item.product_exists,
        })),
        // Show if this order came from a subscription app
        source_name: order.source_name,
        source_identifier: order.source_identifier,
        referring_site: order.referring_site,
      }))
    }

    // Get Recharge data if connected
    const { data: rechargeIntegration } = await supabase
      .from('integrations')
      .select('credentials_encrypted')
      .eq('organization_id', orgId)
      .eq('type', 'recharge')
      .eq('connected', true)
      .single()

    if (rechargeIntegration?.credentials_encrypted) {
      const apiKey = (rechargeIntegration.credentials_encrypted as { api_key?: string }).api_key

      if (apiKey) {
        // Get sample subscriptions
        const subsResponse = await fetch(
          'https://api.rechargeapps.com/subscriptions?limit=10&status=ACTIVE',
          {
            headers: {
              'X-Recharge-Access-Token': apiKey,
              'X-Recharge-Version': '2021-11',
            },
          }
        )

        if (subsResponse.ok) {
          const subsData = await subsResponse.json()
          diagnostics.rechargeSubscriptions = (subsData.subscriptions || []).map((sub: Record<string, unknown>) => ({
            id: sub.id,
            customer_id: sub.customer_id,
            status: sub.status,
            product_title: sub.product_title,
            variant_title: sub.variant_title,
            sku: sub.sku,
            price: sub.price,
            quantity: sub.quantity,
            order_interval_unit: sub.order_interval_unit,
            order_interval_frequency: sub.order_interval_frequency,
            charge_interval_frequency: sub.charge_interval_frequency,
            created_at: sub.created_at,
            next_charge_scheduled_at: sub.next_charge_scheduled_at,
            properties: sub.properties,
          }))
        }

        // Get sample charges to see charge history structure
        const chargesResponse = await fetch(
          'https://api.rechargeapps.com/charges?limit=20&sort_by=created_at-desc',
          {
            headers: {
              'X-Recharge-Access-Token': apiKey,
              'X-Recharge-Version': '2021-11',
            },
          }
        )

        if (chargesResponse.ok) {
          const chargesData = await chargesResponse.json()
          diagnostics.rechargeCharges = (chargesData.charges || []).map((charge: Record<string, unknown>) => ({
            id: charge.id,
            customer_id: charge.customer_id,
            status: charge.status,
            scheduled_at: charge.scheduled_at,
            processed_at: charge.processed_at,
            type: charge.type,
            total_price: charge.total_price,
            line_items: charge.line_items,
            shopify_order_id: charge.shopify_order_id,
          }))
        }

        // Get charge count for a sample customer to show sequence
        if (diagnostics.rechargeCharges && Array.isArray(diagnostics.rechargeCharges) && diagnostics.rechargeCharges.length > 0) {
          const sampleCustomerId = (diagnostics.rechargeCharges[0] as { customer_id: number }).customer_id

          const customerChargesResponse = await fetch(
            `https://api.rechargeapps.com/charges?customer_id=${sampleCustomerId}&status=SUCCESS&sort_by=processed_at-asc`,
            {
              headers: {
                'X-Recharge-Access-Token': apiKey,
                'X-Recharge-Version': '2021-11',
              },
            }
          )

          if (customerChargesResponse.ok) {
            const customerChargesData = await customerChargesResponse.json()
            diagnostics.sampleCustomerChargeHistory = {
              customerId: sampleCustomerId,
              totalSuccessfulCharges: (customerChargesData.charges || []).length,
              charges: (customerChargesData.charges || []).map((charge: Record<string, unknown>, index: number) => ({
                chargeNumber: index + 1,
                id: charge.id,
                processed_at: charge.processed_at,
                line_items: charge.line_items,
              })),
            }
          }
        }
      }
    } else {
      diagnostics.rechargeConnected = false
    }

    return NextResponse.json(diagnostics, {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    diagnostics.error = error instanceof Error ? error.message : String(error)
    return NextResponse.json(diagnostics, { status: 500 })
  }
}
