import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'

interface RouteParams {
  params: Promise<{ storyId: string }>
}

/**
 * POST /api/migration/stories/[storyId]/tiers
 *
 * Add a tier to a story
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { orgId } = await auth()
  const { storyId } = await params

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    // Verify story belongs to org
    const { data: story } = await supabase
      .from('stories')
      .select('id')
      .eq('id', storyId)
      .eq('organization_id', orgId)
      .single()

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, description, isDefault } = body as {
      name: string
      description?: string
      isDefault?: boolean
    }

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    // Get current max sort order
    const { data: existingTiers } = await supabase
      .from('story_tiers')
      .select('sort_order')
      .eq('story_id', storyId)
      .order('sort_order', { ascending: false })
      .limit(1)

    const nextSortOrder = existingTiers && existingTiers.length > 0
      ? (existingTiers[0].sort_order || 0) + 1
      : 0

    // If this is set as default, unset other defaults
    if (isDefault) {
      await supabase
        .from('story_tiers')
        .update({ is_default: false })
        .eq('story_id', storyId)
    }

    // Create the tier
    const { data: tier, error } = await supabase
      .from('story_tiers')
      .insert({
        story_id: storyId,
        name,
        description,
        is_default: isDefault || false,
        sort_order: nextSortOrder,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create tier: ${error.message}`)
    }

    return NextResponse.json({ tier })
  } catch (error) {
    console.error('Error creating tier:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/migration/stories/[storyId]/tiers
 *
 * Delete a tier from a story
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { orgId } = await auth()
  const { storyId } = await params

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    const { searchParams } = new URL(request.url)
    const tierId = searchParams.get('tierId')

    if (!tierId) {
      return NextResponse.json({ error: 'tierId is required' }, { status: 400 })
    }

    // Verify story belongs to org
    const { data: story } = await supabase
      .from('stories')
      .select('id')
      .eq('id', storyId)
      .eq('organization_id', orgId)
      .single()

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 })
    }

    // Delete the tier
    const { error } = await supabase
      .from('story_tiers')
      .delete()
      .eq('id', tierId)
      .eq('story_id', storyId)

    if (error) {
      throw new Error(`Failed to delete tier: ${error.message}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tier:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
