import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'

interface ShopifyOrder {
  id: number
  order_number: number
  created_at: string
  customer: {
    id: number
    email: string
    first_name: string
    last_name: string
  } | null
  line_items: Array<{
    id: number
    sku: string
    name: string
    variant_title: string
    quantity: number
    product_id: number
  }>
}

interface ProductVariation {
  id: string
  product_name: string
  variant_title: string | null
  sku: string | null
  story_id: string
  tier_id: string | null
}

interface CustomerData {
  email: string
  name: string | null
  shopifyCustomerIds: Set<number>
  orders: Array<{
    orderId: number
    orderNumber: number
    date: string
    productVariationId: string
    tierName: string | null
    productName: string
  }>
}

/**
 * POST /api/migration/import-customers
 *
 * Imports customers from Shopify order history based on assigned product variations.
 * Groups orders by customer email and calculates episode progression.
 */
export async function POST(request: NextRequest) {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    // Get the story ID from request (or use default)
    const body = await request.json().catch(() => ({}))
    let storyId = body.storyId as string | undefined

    // If no story specified, use the default or first story
    if (!storyId) {
      const { data: org } = await supabase
        .from('organizations')
        .select('default_story_id')
        .eq('id', orgId)
        .single()

      if (org?.default_story_id) {
        storyId = org.default_story_id
      } else {
        const { data: stories } = await supabase
          .from('stories')
          .select('id')
          .eq('organization_id', orgId)
          .limit(1)
          .single()

        if (!stories) {
          return NextResponse.json({ error: 'No stories found. Create a story first.' }, { status: 400 })
        }
        storyId = stories.id
      }
    }

    // Get all product variations assigned to this story
    const { data: variations } = await supabase
      .from('product_variations')
      .select(`
        id,
        product_name,
        variant_title,
        sku,
        story_id,
        tier_id,
        tier:story_tiers(name)
      `)
      .eq('organization_id', orgId)
      .eq('story_id', storyId)

    if (!variations || variations.length === 0) {
      return NextResponse.json(
        { error: 'No product variations assigned to this story. Map products first.' },
        { status: 400 }
      )
    }

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

    // Build a map for quick variation lookup
    const variationMap = new Map<string, ProductVariation & { tierName: string | null }>()
    for (const v of variations) {
      // Key by product name + variant + sku
      const key = `${v.product_name}|||${v.variant_title || ''}|||${v.sku || ''}`
      // Supabase returns relations as arrays, so we need to extract the first item
      const tierArray = v.tier as Array<{ name: string }> | null
      const tierName = Array.isArray(tierArray) && tierArray.length > 0 ? tierArray[0].name : null
      variationMap.set(key, {
        ...v,
        tierName,
      })
    }

    // Fetch orders from Shopify (last 2 years)
    const customerMap = new Map<string, CustomerData>()

    const params = new URLSearchParams({
      status: 'any',
      limit: '250',
      created_at_min: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    })

    let currentUrl: string | null = `https://${shop}/admin/api/2024-01/orders.json?${params.toString()}`
    let pageCount = 0
    const maxPages = 50

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

      for (const order of (data.orders || []) as ShopifyOrder[]) {
        if (!order.customer?.email) continue

        const email = order.customer.email.toLowerCase()

        for (const item of order.line_items) {
          // Check if this item matches any assigned variation
          const key = `${item.name}|||${item.variant_title || ''}|||${item.sku || ''}`
          const variation = variationMap.get(key)

          if (variation) {
            // Found a matching subscription item
            let customer = customerMap.get(email)
            if (!customer) {
              customer = {
                email,
                name: order.customer.first_name && order.customer.last_name
                  ? `${order.customer.first_name} ${order.customer.last_name}`
                  : order.customer.first_name || order.customer.last_name || null,
                shopifyCustomerIds: new Set(),
                orders: [],
              }
              customerMap.set(email, customer)
            }

            customer.shopifyCustomerIds.add(order.customer.id)

            // Add order for each quantity (prepaid bundles count as multiple)
            for (let i = 0; i < item.quantity; i++) {
              customer.orders.push({
                orderId: order.id,
                orderNumber: order.order_number,
                date: order.created_at,
                productVariationId: variation.id,
                tierName: variation.tierName,
                productName: item.name,
              })
            }
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

    // Get story info
    const { data: story } = await supabase
      .from('stories')
      .select('id, total_episodes, story_type')
      .eq('id', storyId)
      .single()

    // Now create/update customer_story_progress records
    let importedCount = 0
    let updatedCount = 0
    let flaggedCount = 0

    for (const [email, customer] of customerMap) {
      // Sort orders by date
      customer.orders.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      // Calculate current episode (number of deliveries)
      const currentEpisode = customer.orders.length

      // Build episode history
      const episodeHistory = customer.orders.map((order, index) => ({
        episode: index + 1,
        date: order.date,
        order_id: order.orderId.toString(),
        order_number: order.orderNumber,
        tier_name: order.tierName,
        product_name: order.productName,
      }))

      // Detect if customer needs review
      const reviewReasons: string[] = []

      // Check for tier changes
      const uniqueTiers = new Set(customer.orders.map(o => o.tierName).filter(Boolean))
      if (uniqueTiers.size > 1) {
        reviewReasons.push('tier_change')
      }

      // Check if completed (for sequential stories)
      const status = story?.story_type === 'sequential' && story.total_episodes && currentEpisode >= story.total_episodes
        ? 'completed'
        : 'active'

      // Get the most recent tier
      const lastTier = customer.orders[customer.orders.length - 1]?.tierName
      let currentTierId = null
      if (lastTier) {
        const { data: tier } = await supabase
          .from('story_tiers')
          .select('id')
          .eq('story_id', storyId)
          .eq('name', lastTier)
          .single()
        currentTierId = tier?.id
      }

      // Check if record exists
      const { data: existing } = await supabase
        .from('customer_story_progress')
        .select('id, manually_adjusted')
        .eq('organization_id', orgId)
        .eq('customer_email', email)
        .eq('story_id', storyId)
        .single()

      if (existing) {
        // Don't overwrite manually adjusted records
        if (!existing.manually_adjusted) {
          await supabase
            .from('customer_story_progress')
            .update({
              customer_name: customer.name,
              shopify_customer_ids: Array.from(customer.shopifyCustomerIds).map(String),
              current_episode: currentEpisode,
              current_tier_id: currentTierId,
              status,
              episode_history: episodeHistory,
              needs_review: reviewReasons.length > 0,
              review_reasons: reviewReasons,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
          updatedCount++
        }
      } else {
        // Insert new
        await supabase.from('customer_story_progress').insert({
          organization_id: orgId,
          customer_email: email,
          customer_name: customer.name,
          shopify_customer_ids: Array.from(customer.shopifyCustomerIds).map(String),
          story_id: storyId,
          current_episode: currentEpisode,
          current_tier_id: currentTierId,
          status,
          episode_history: episodeHistory,
          needs_review: reviewReasons.length > 0,
          review_reasons: reviewReasons,
        })
        importedCount++
      }

      if (reviewReasons.length > 0) {
        flaggedCount++
      }
    }

    return NextResponse.json({
      success: true,
      storyId,
      customersFound: customerMap.size,
      imported: importedCount,
      updated: updatedCount,
      flagged: flaggedCount,
      pagesScanned: pageCount,
    })
  } catch (error) {
    console.error('Error importing customers:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
