import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * GET /api/migration/status
 *
 * Get the overall migration status for the organization
 */
export async function GET() {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    // Get product variation stats
    const { data: variations } = await supabase
      .from('product_variations')
      .select('id, story_id, variation_type')
      .eq('organization_id', orgId)

    const variationStats = {
      total: variations?.length || 0,
      unassigned: variations?.filter(v => !v.story_id && v.variation_type === 'subscription').length || 0,
      assigned: variations?.filter(v => v.story_id).length || 0,
      ignored: variations?.filter(v => v.variation_type === 'ignored').length || 0,
      addons: variations?.filter(v => v.variation_type === 'addon').length || 0,
    }

    // Get stories
    const { data: stories } = await supabase
      .from('stories')
      .select('id, name')
      .eq('organization_id', orgId)

    // Get customer progress stats
    const { data: customers } = await supabase
      .from('customer_story_progress')
      .select('id, needs_review, status')
      .eq('organization_id', orgId)

    const customerStats = {
      total: customers?.length || 0,
      needsReview: customers?.filter(c => c.needs_review).length || 0,
      active: customers?.filter(c => c.status === 'active').length || 0,
      completed: customers?.filter(c => c.status === 'completed').length || 0,
      churned: customers?.filter(c => c.status === 'churned').length || 0,
    }

    // Get organization migration status
    const { data: org } = await supabase
      .from('organizations')
      .select('migration_complete')
      .eq('id', orgId)
      .single()

    // Determine step completion
    const steps = {
      scanComplete: variationStats.total > 0,
      storiesCreated: (stories?.length || 0) > 0,
      productsAssigned: variationStats.unassigned === 0 && variationStats.assigned > 0,
      customersImported: customerStats.total > 0,
      reviewComplete: customerStats.needsReview === 0,
      migrationComplete: org?.migration_complete || false,
    }

    return NextResponse.json({
      steps,
      variationStats,
      customerStats,
      storiesCount: stories?.length || 0,
    })
  } catch (error) {
    console.error('Error fetching migration status:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
