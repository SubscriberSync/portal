import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * GET /api/migration/products
 *
 * Get all product variations for the organization with their assignment status
 */
export async function GET(request: NextRequest) {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    // Get all product variations with story/tier info
    const { data: variations, error } = await supabase
      .from('product_variations')
      .select(`
        *,
        story:stories(id, name, slug),
        tier:story_tiers(id, name)
      `)
      .eq('organization_id', orgId)
      .order('order_count', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch product variations: ${error.message}`)
    }

    // Get all stories for this org
    const { data: stories } = await supabase
      .from('stories')
      .select(`
        *,
        tiers:story_tiers(*)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true })

    // Calculate stats
    const stats = {
      total: variations?.length || 0,
      unassigned: variations?.filter(v => !v.story_id && v.variation_type === 'subscription').length || 0,
      assigned: variations?.filter(v => v.story_id).length || 0,
      ignored: variations?.filter(v => v.variation_type === 'ignored').length || 0,
      addons: variations?.filter(v => v.variation_type === 'addon').length || 0,
    }

    return NextResponse.json({
      variations: variations || [],
      stories: stories || [],
      stats,
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/migration/products
 *
 * Update product variation assignments (assign to story/tier, mark as ignored, etc.)
 * 
 * Note: When a product_variation is assigned to a story (story_id is set) and 
 * variation_type is 'subscription', a database trigger automatically syncs it to 
 * the products table. See migration 021_sync_products_from_variations.sql
 */
export async function PATCH(request: NextRequest) {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    const body = await request.json()
    const { variationIds, storyId, tierId, variationType } = body as {
      variationIds: string[]
      storyId?: string | null
      tierId?: string | null
      variationType?: 'subscription' | 'addon' | 'ignored'
    }

    if (!variationIds || !Array.isArray(variationIds) || variationIds.length === 0) {
      return NextResponse.json({ error: 'variationIds required' }, { status: 400 })
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (storyId !== undefined) {
      updateData.story_id = storyId
    }

    if (tierId !== undefined) {
      updateData.tier_id = tierId
    }

    if (variationType) {
      updateData.variation_type = variationType
      // If marking as ignored or addon, clear story/tier assignment
      if (variationType !== 'subscription') {
        updateData.story_id = null
        updateData.tier_id = null
      }
    }

    const { error } = await supabase
      .from('product_variations')
      .update(updateData)
      .eq('organization_id', orgId)
      .in('id', variationIds)

    if (error) {
      throw new Error(`Failed to update variations: ${error.message}`)
    }

    return NextResponse.json({ success: true, updated: variationIds.length })
  } catch (error) {
    console.error('Error updating products:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
