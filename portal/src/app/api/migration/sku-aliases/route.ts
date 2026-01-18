import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'

// GET /api/migration/sku-aliases
// Get all SKU mappings for the organization
export async function GET() {
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

    const { data: aliases, error } = await supabase
      .from('sku_aliases')
      .select('*')
      .eq('organization_id', organization.id)
      .order('product_sequence_id', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ aliases: aliases || [] })
  } catch (error) {
    console.error('[SKU Aliases] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch aliases' },
      { status: 500 }
    )
  }
}

// POST /api/migration/sku-aliases
// Create or update SKU mappings (batch)
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
    const { mappings } = await request.json()

    if (!Array.isArray(mappings)) {
      return NextResponse.json({ error: 'Mappings must be an array' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Validate mappings
    for (const mapping of mappings) {
      if (!mapping.sku || typeof mapping.sequence !== 'number') {
        return NextResponse.json(
          { error: 'Each mapping must have sku (string) and sequence (number)' },
          { status: 400 }
        )
      }
    }

    // Upsert all mappings
    const upsertData = mappings.map(m => ({
      organization_id: organization.id,
      shopify_sku: m.sku,
      product_sequence_id: m.sequence,
      product_name: m.name || null,
    }))

    const { data, error } = await supabase
      .from('sku_aliases')
      .upsert(upsertData, {
        onConflict: 'organization_id,shopify_sku',
        ignoreDuplicates: false,
      })
      .select()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
    })
  } catch (error) {
    console.error('[SKU Aliases] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save aliases' },
      { status: 500 }
    )
  }
}

// DELETE /api/migration/sku-aliases
// Delete a SKU mapping
export async function DELETE(request: NextRequest) {
  const { orgSlug, orgId } = await auth()

  if (!orgSlug || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  try {
    const { sku } = await request.json()

    if (!sku) {
      return NextResponse.json({ error: 'SKU is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { error } = await supabase
      .from('sku_aliases')
      .delete()
      .eq('organization_id', organization.id)
      .eq('shopify_sku', sku)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[SKU Aliases] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete alias' },
      { status: 500 }
    )
  }
}
