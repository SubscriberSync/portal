import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'

/**
 * POST /api/migration/link-shopify-customers
 * Link existing subscribers to their Shopify customer IDs by matching emails
 */
export async function POST(request: NextRequest) {
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

    const shopifyCreds = {
      shop: shopifyIntegration.credentials_encrypted.shop as string,
      access_token: shopifyIntegration.credentials_encrypted.access_token as string,
    }

    // Get subscribers without shopify_customer_id
    const { data: subscribers, error: subError } = await supabase
      .from('subscribers')
      .select('id, email')
      .eq('organization_id', organization.id)
      .is('shopify_customer_id', null)
      .not('email', 'is', null)

    if (subError) {
      return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 })
    }

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({ message: 'No subscribers need linking' })
    }

    console.log(`[Link Shopify Customers] Processing ${subscribers.length} subscribers`)

    let linked = 0
    let errors = 0

    // Process in batches to avoid rate limits
    const batchSize = 10
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize)

      for (const subscriber of batch) {
        try {
          // Search for Shopify customer by email
          const customerUrl = `https://${shopifyCreds.shop}/admin/api/2024-01/customers/search.json?query=email:${encodeURIComponent(subscriber.email)}`

          const customerResponse = await fetch(customerUrl, {
            headers: {
              'X-Shopify-Access-Token': shopifyCreds.access_token,
              'Content-Type': 'application/json',
            },
          })

          if (!customerResponse.ok) {
            console.error(`[Link Shopify] Failed to search customer for ${subscriber.email}: ${customerResponse.status}`)
            errors++
            continue
          }

          const customerData = await customerResponse.json()
          const customers = customerData.customers || []

          if (customers.length === 1) {
            // Found exactly one match - link it
            const customer = customers[0]

            const { error: updateError } = await supabase
              .from('subscribers')
              .update({
                shopify_customer_id: customer.id.toString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', subscriber.id)

            if (updateError) {
              console.error(`[Link Shopify] Failed to update subscriber ${subscriber.email}:`, updateError)
              errors++
            } else {
              console.log(`[Link Shopify] Linked ${subscriber.email} to Shopify customer ${customer.id}`)
              linked++
            }
          } else if (customers.length > 1) {
            console.warn(`[Link Shopify] Multiple customers found for ${subscriber.email} - skipping`)
            errors++
          } else {
            console.warn(`[Link Shopify] No Shopify customer found for ${subscriber.email}`)
            errors++
          }

        } catch (error) {
          console.error(`[Link Shopify] Error processing ${subscriber.email}:`, error)
          errors++
        }
      }

      // Rate limiting - wait 500ms between batches
      if (i + batchSize < subscribers.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    return NextResponse.json({
      message: `Processed ${subscribers.length} subscribers`,
      linked,
      errors,
      success: linked > 0
    })

  } catch (error) {
    console.error('[Link Shopify Customers] Error:', error)
    return NextResponse.json({
      error: 'Failed to link customers',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}