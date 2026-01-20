import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * GET /api/migration/stories
 *
 * Get all stories for the organization
 */
export async function GET() {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    const { data: stories, error } = await supabase
      .from('stories')
      .select(`
        *,
        tiers:story_tiers(*)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch stories: ${error.message}`)
    }

    return NextResponse.json({ stories: stories || [] })
  } catch (error) {
    console.error('Error fetching stories:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/migration/stories
 *
 * Create a new story
 */
export async function POST(request: NextRequest) {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    const body = await request.json()
    const { name, slug, storyType, totalEpisodes, installmentName, tiers } = body as {
      name: string
      slug?: string
      storyType: 'sequential' | 'recurring'
      totalEpisodes?: number
      installmentName?: string
      tiers?: Array<{ name: string; description?: string; isDefault?: boolean }>
    }

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    // Generate slug if not provided
    const storySlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    // Create the story
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .insert({
        organization_id: orgId,
        name,
        slug: storySlug,
        story_type: storyType || 'sequential',
        total_episodes: totalEpisodes,
        installment_name: installmentName || 'Episode',
      })
      .select()
      .single()

    if (storyError) {
      throw new Error(`Failed to create story: ${storyError.message}`)
    }

    // Create tiers if provided
    if (tiers && tiers.length > 0) {
      const tierInserts = tiers.map((tier, index) => ({
        story_id: story.id,
        name: tier.name,
        description: tier.description,
        is_default: tier.isDefault || index === 0,
        sort_order: index,
      }))

      const { error: tierError } = await supabase
        .from('story_tiers')
        .insert(tierInserts)

      if (tierError) {
        console.error('Failed to create tiers:', tierError)
      }
    }

    // Fetch the story with tiers
    const { data: fullStory } = await supabase
      .from('stories')
      .select(`
        *,
        tiers:story_tiers(*)
      `)
      .eq('id', story.id)
      .single()

    // Set as default story if this is the first one
    const { data: existingStories } = await supabase
      .from('stories')
      .select('id')
      .eq('organization_id', orgId)

    if (existingStories && existingStories.length === 1) {
      await supabase
        .from('organizations')
        .update({ default_story_id: story.id })
        .eq('id', orgId)
    }

    return NextResponse.json({ story: fullStory })
  } catch (error) {
    console.error('Error creating story:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
