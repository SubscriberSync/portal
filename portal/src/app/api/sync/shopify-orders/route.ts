import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { handleApiError } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for large order syncs

interface ShopifyOrder {
  id: number
  name: string // Order number like #1001
  email: string
  customer: {
    id: number
    email: string
    first_name: string
    last_name: string
    phone?: string
    default_address?: ShopifyAddress
  }
  line_items: ShopifyLineItem[]
  shipping_address?: ShopifyAddress
  billing_address?: ShopifyAddress
  fulfillment_status: string | null
  financial_status: string
  total_price: string
  created_at: string
  updated_at: string
  cancelled_at: string | null
  note?: string
  tags?: string
  source_name?: string
}

interface ShopifyLineItem {
  id: number
  product_id: number
  variant_id: number
  title: string
  name: string
  sku: string
  quantity: number
  price: string
  properties?: { name: string; value: string }[]
}

interface ShopifyAddress {
  first_name: string
  last_name: string
  address1: string
  address2?: string
  city: string
  province: string
  zip: string
  country: string
  phone?: string
}

// Determine shipment type from order
function getShipmentType(order: ShopifyOrder): 'Subscription' | 'One-Off' {
  if (order.source_name === 'subscription_contract' ||
      order.tags?.toLowerCase().includes('subscription') ||
      order.tags?.toLowerCase().includes('recharge')) {
    return 'Subscription'
  }

  for (const item of order.line_items) {
    if (item.properties?.some(p =>
      p.name.toLowerCase().includes('subscription') ||
      p.name.toLowerCase().includes('recharge')
    )) {
      return 'Subscription'
    }
  }

  return 'One-Off'
}

// Map fulfillment status
function mapFulfillmentStatus(status: string | null): 'Unfulfilled' | 'Packed' | 'Shipped' | 'Delivered' {
  switch (status) {
    case 'fulfilled':
      return 'Shipped'
    case 'partial':
      return 'Packed'
    default:
      return 'Unfulfilled'
  }
}

// POST /api/sync/shopify-orders
export async function POST(request: NextRequest) {
  const { orgSlug } = await auth()

  if (!orgSlug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  try {
    const supabase = createServiceClient()

    // Get Shopify integration
    const { data: integration } = await supabase
      .from('integrations')
      .select('credentials_encrypted, connected')
      .eq('organization_id', organization.id)
      .eq('type', 'shopify')
      .single()

    if (!integration || !integration.connected) {
      return NextResponse.json({ error: 'Shopify not connected' }, { status: 400 })
    }

    const credentials = integration.credentials_encrypted as { access_token: string; shop: string }
    const { access_token, shop } = credentials

    if (!access_token || !shop) {
      return NextResponse.json({ error: 'Invalid Shopify credentials' }, { status: 400 })
    }

    // Fetch orders from Shopify (only unfulfilled to avoid processing old orders)
    let allOrders: ShopifyOrder[] = []
    let nextPageUrl: string | null = `https://${shop}/admin/api/2025-01/orders.json?status=any&limit=250`
    
    console.log('[Shopify Sync] Starting order sync for org:', organization.id)

    // Paginate through all orders
    while (nextPageUrl) {
      const response: Response = await fetch(nextPageUrl, {
        headers: {
          'X-Shopify-Access-Token': access_token,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Shopify Sync] Failed to fetch orders:', errorText)
        return NextResponse.json({ 
          error: 'Failed to fetch orders from Shopify',
          details: errorText 
        }, { status: 500 })
      }

      const data = await response.json()
      allOrders = allOrders.concat(data.orders || [])

      // Check for next page in Link header
      const linkHeader = response.headers.get('Link')
      if (linkHeader) {
        const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
        nextPageUrl = nextMatch ? nextMatch[1] : null
      } else {
        nextPageUrl = null
      }

      console.log(`[Shopify Sync] Fetched ${allOrders.length} orders so far...`)
    }

    console.log(`[Shopify Sync] Total orders fetched: ${allOrders.length}`)

    let created = 0
    let updated = 0
    let skipped = 0
    const errors: { order: string; error: string }[] = []

    // Process each order
    for (const order of allOrders) {
      try {
        // Skip cancelled orders
        if (order.cancelled_at) {
          skipped++
          continue
        }

        const email = order.email?.toLowerCase() || order.customer?.email?.toLowerCase()
        if (!email) {
          skipped++
          continue
        }

        // Get or create subscriber
        let { data: subscriber } = await supabase
          .from('subscribers')
          .select('id, next_charge_date')
          .eq('organization_id', organization.id)
          .eq('email', email)
          .single()

        if (!subscriber && order.customer) {
          // Create new subscriber from order
          const address = order.shipping_address || order.customer.default_address
          const { data: newSub } = await supabase
            .from('subscribers')
            .insert({
              organization_id: organization.id,
              email: email,
              first_name: order.customer.first_name,
              last_name: order.customer.last_name,
              phone: order.customer.phone || address?.phone,
              address1: address?.address1,
              address2: address?.address2,
              city: address?.city,
              state: address?.province,
              zip: address?.zip,
              country: address?.country || 'US',
              shopify_customer_id: order.customer.id.toString(),
              status: 'Active',
              box_number: 1,
            })
            .select('id, next_charge_date')
            .single()

          subscriber = newSub
        }

        if (!subscriber) {
          errors.push({ order: order.name, error: 'Could not create subscriber' })
          continue
        }

        const shipmentType = getShipmentType(order)
        const status = mapFulfillmentStatus(order.fulfillment_status)

        // Create shipment for each line item
        for (const item of order.line_items) {
          const shipmentData: Record<string, unknown> = {
            organization_id: organization.id,
            subscriber_id: subscriber.id,
            type: shipmentType,
            status: status,
            product_name: item.name,
            variant_name: item.name !== item.title ? item.title : null,
            gift_note: order.note || null,
            order_number: order.name,
            shopify_order_id: order.id.toString(),
            shopify_line_item_id: item.id.toString(),
            shipped_at: order.fulfillment_status === 'fulfilled' ? order.updated_at : null,
            financial_status: order.financial_status || null,
            created_at: order.created_at,
          }

          // Check if shipment already exists
          const { data: existing } = await supabase
            .from('shipments')
            .select('id')
            .eq('organization_id', organization.id)
            .eq('shopify_order_id', order.id.toString())
            .eq('shopify_line_item_id', item.id.toString())
            .single()

          if (existing) {
            // Update existing shipment
            await supabase
              .from('shipments')
              .update(shipmentData)
              .eq('id', existing.id)
            updated++
          } else {
            // Create new shipment
            await supabase
              .from('shipments')
              .insert(shipmentData)
            created++
          }
        }
      } catch (error) {
        console.error(`[Shopify Sync] Error processing order ${order.name}:`, error)
        errors.push({ 
          order: order.name, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    // Update integration last sync time
    await supabase
      .from('integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('organization_id', organization.id)
      .eq('type', 'shopify')

    console.log(`[Shopify Sync] Complete - Created: ${created}, Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors.length}`)

    return NextResponse.json({
      success: true,
      stats: {
        totalOrders: allOrders.length,
        created,
        updated,
        skipped,
        errors: errors.length,
      },
      errors: errors.slice(0, 10), // Return first 10 errors only
    })
  } catch (error) {
    return handleApiError(error, 'Shopify Sync', 'Failed to sync orders')
  }
}
