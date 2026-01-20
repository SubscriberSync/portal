import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * GET /api/migration/customers
 *
 * Get all customers with their story progress
 */
export async function GET(request: NextRequest) {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)

  const storyId = searchParams.get('storyId')
  const needsReview = searchParams.get('needsReview')
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    let query = supabase
      .from('customer_story_progress')
      .select(`
        *,
        story:stories(id, name, slug, total_episodes, installment_name),
        tier:story_tiers(id, name)
      `, { count: 'exact' })
      .eq('organization_id', orgId)
      .order('updated_at', { ascending: false })

    if (storyId) {
      query = query.eq('story_id', storyId)
    }

    if (needsReview === 'true') {
      query = query.eq('needs_review', true)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`customer_email.ilike.%${search}%,customer_name.ilike.%${search}%`)
    }

    query = query.range(offset, offset + limit - 1)

    const { data: customers, count, error } = await query

    if (error) {
      throw new Error(`Failed to fetch customers: ${error.message}`)
    }

    // Get stats
    const { data: allCustomers } = await supabase
      .from('customer_story_progress')
      .select('id, needs_review, status')
      .eq('organization_id', orgId)

    const stats = {
      total: allCustomers?.length || 0,
      needsReview: allCustomers?.filter(c => c.needs_review).length || 0,
      active: allCustomers?.filter(c => c.status === 'active').length || 0,
      completed: allCustomers?.filter(c => c.status === 'completed').length || 0,
      churned: allCustomers?.filter(c => c.status === 'churned').length || 0,
      paused: allCustomers?.filter(c => c.status === 'paused').length || 0,
    }

    return NextResponse.json({
      customers: customers || [],
      total: count || 0,
      stats,
    })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/migration/customers
 *
 * Update customer progress (manual adjustment)
 */
export async function PATCH(request: NextRequest) {
  const { orgId, userId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    const body = await request.json()
    const {
      customerId,
      currentEpisode,
      status,
      tierId,
      clearReview,
      note,
    } = body as {
      customerId: string
      currentEpisode?: number
      status?: 'active' | 'paused' | 'completed' | 'churned'
      tierId?: string
      clearReview?: boolean
      note?: string
    }

    if (!customerId) {
      return NextResponse.json({ error: 'customerId required' }, { status: 400 })
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (currentEpisode !== undefined) {
      updateData.current_episode = currentEpisode
      updateData.manually_adjusted = true
      updateData.adjusted_by = userId
      updateData.adjusted_at = new Date().toISOString()
      if (note) {
        updateData.adjustment_note = note
      }
    }

    if (status) {
      updateData.status = status
    }

    if (tierId !== undefined) {
      updateData.current_tier_id = tierId
    }

    if (clearReview) {
      updateData.needs_review = false
      updateData.review_reasons = []
    }

    const { error } = await supabase
      .from('customer_story_progress')
      .update(updateData)
      .eq('id', customerId)
      .eq('organization_id', orgId)

    if (error) {
      throw new Error(`Failed to update customer: ${error.message}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
