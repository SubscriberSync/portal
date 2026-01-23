import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { handleApiError } from '@/lib/api-utils'

interface MergeRequest {
  sourceId: string
  targetId: string
  options?: {
    keepSourceAddress?: boolean
    mergeShipments?: boolean
    mergeEpisodeHistory?: boolean
  }
}

/**
 * POST /api/subscribers/merge
 * Merge two subscriber profiles into one
 * The targetId becomes the primary subscriber, sourceId is soft-deleted
 */
export async function POST(request: NextRequest) {
  const { orgId, userId } = await auth()

  if (!orgId || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    const body: MergeRequest = await request.json()
    const { sourceId, targetId, options = {} } = body

    if (!sourceId || !targetId) {
      return NextResponse.json(
        { error: 'Both sourceId and targetId are required' },
        { status: 400 }
      )
    }

    if (sourceId === targetId) {
      return NextResponse.json(
        { error: 'Cannot merge a subscriber with itself' },
        { status: 400 }
      )
    }

    // Call the merge_subscribers function
    const { data, error } = await supabase.rpc('merge_subscribers', {
      p_source_id: sourceId,
      p_target_id: targetId,
      p_org_id: orgId,
      p_performed_by: userId,
      p_keep_source_address: options.keepSourceAddress ?? false,
      p_merge_shipments: options.mergeShipments ?? true,
      p_merge_episode_history: options.mergeEpisodeHistory ?? true,
    })

    if (error) {
      // Handle specific error cases
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'One or both subscribers not found' },
          { status: 404 }
        )
      }
      throw new Error(`Failed to merge subscribers: ${error.message}`)
    }

    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, 'Subscriber Merge')
  }
}

/**
 * GET /api/subscribers/merge?sourceId=xxx&targetId=yyy
 * Preview what would happen in a merge (for UI confirmation)
 */
export async function GET(request: NextRequest) {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const sourceId = searchParams.get('sourceId')
  const targetId = searchParams.get('targetId')

  if (!sourceId || !targetId) {
    return NextResponse.json(
      { error: 'Both sourceId and targetId query params are required' },
      { status: 400 }
    )
  }

  try {
    // Fetch both subscribers with all their data for comparison
    const [sourceResult, targetResult] = await Promise.all([
      supabase
        .from('subscribers')
        .select('*')
        .eq('id', sourceId)
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .single(),
      supabase
        .from('subscribers')
        .select('*')
        .eq('id', targetId)
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .single(),
    ])

    if (sourceResult.error || !sourceResult.data) {
      return NextResponse.json({ error: 'Source subscriber not found' }, { status: 404 })
    }

    if (targetResult.error || !targetResult.data) {
      return NextResponse.json({ error: 'Target subscriber not found' }, { status: 404 })
    }

    // Get related record counts for both
    const [
      sourceShipments,
      targetShipments,
      sourceProgress,
      targetProgress,
      sourceActivity,
      targetActivity,
    ] = await Promise.all([
      supabase
        .from('shipments')
        .select('id', { count: 'exact', head: true })
        .eq('subscriber_id', sourceId),
      supabase
        .from('shipments')
        .select('id', { count: 'exact', head: true })
        .eq('subscriber_id', targetId),
      supabase
        .from('customer_story_progress')
        .select('id, current_episode, episode_history', { count: 'exact' })
        .eq('subscriber_id', sourceId)
        .is('deleted_at', null),
      supabase
        .from('customer_story_progress')
        .select('id, current_episode, episode_history', { count: 'exact' })
        .eq('subscriber_id', targetId)
        .is('deleted_at', null),
      supabase
        .from('subscriber_activity')
        .select('id', { count: 'exact', head: true })
        .eq('subscriber_id', sourceId),
      supabase
        .from('subscriber_activity')
        .select('id', { count: 'exact', head: true })
        .eq('subscriber_id', targetId),
    ])

    // Build preview response
    const preview = {
      source: {
        ...sourceResult.data,
        shipmentCount: sourceShipments.count || 0,
        progressRecords: sourceProgress.data || [],
        activityCount: sourceActivity.count || 0,
      },
      target: {
        ...targetResult.data,
        shipmentCount: targetShipments.count || 0,
        progressRecords: targetProgress.data || [],
        activityCount: targetActivity.count || 0,
      },
      mergePreview: {
        // What the merged subscriber would look like
        email: targetResult.data.email, // Target email is kept
        name: `${targetResult.data.first_name || sourceResult.data.first_name || ''} ${targetResult.data.last_name || sourceResult.data.last_name || ''}`.trim(),
        combinedTags: [
          ...new Set([
            ...(targetResult.data.tags || []),
            ...(sourceResult.data.tags || []),
          ]),
        ],
        totalShipments: (sourceShipments.count || 0) + (targetShipments.count || 0),
        willHaveVip: targetResult.data.is_vip || sourceResult.data.is_vip,
        willHaveInfluencer: targetResult.data.is_influencer || sourceResult.data.is_influencer,
        earliestSubscribedAt: [
          targetResult.data.subscribed_at,
          sourceResult.data.subscribed_at,
        ]
          .filter(Boolean)
          .sort()[0],
      },
    }

    return NextResponse.json(preview)
  } catch (error) {
    return handleApiError(error, 'Merge Preview')
  }
}
