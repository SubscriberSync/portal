import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { createServiceClient } from '@/lib/supabase/service'
import { handleApiError } from '@/lib/api-utils'

/**
 * GET /api/migration/patterns
 * Get all product patterns for the organization
 */
export async function GET() {
  const { orgSlug } = await auth()

  if (!orgSlug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const organization = await getOrganizationBySlug(orgSlug)
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const supabase = createServiceClient()
    const { data: patterns, error } = await supabase
      .from('product_patterns')
      .select('*')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ patterns: patterns || [] })
  } catch (error) {
    return handleApiError(error, 'Get Patterns')
  }
}

/**
 * POST /api/migration/patterns
 * Create a new product pattern
 */
export async function POST(request: NextRequest) {
  const { orgSlug } = await auth()

  if (!orgSlug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const organization = await getOrganizationBySlug(orgSlug)
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { pattern, pattern_type, product_sequence_id, description } = await request.json()

    if (!pattern) {
      return NextResponse.json({ error: 'Pattern is required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: newPattern, error } = await supabase
      .from('product_patterns')
      .insert({
        organization_id: organization.id,
        pattern,
        pattern_type: pattern_type || 'contains',
        product_sequence_id: product_sequence_id || 0,
        description,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Pattern already exists' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ pattern: newPattern })
  } catch (error) {
    return handleApiError(error, 'Create Pattern')
  }
}

/**
 * DELETE /api/migration/patterns
 * Delete a product pattern
 */
export async function DELETE(request: NextRequest) {
  const { orgSlug } = await auth()

  if (!orgSlug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const organization = await getOrganizationBySlug(orgSlug)
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { patternId } = await request.json()

    if (!patternId) {
      return NextResponse.json({ error: 'Pattern ID is required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { error } = await supabase
      .from('product_patterns')
      .delete()
      .eq('id', patternId)
      .eq('organization_id', organization.id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'Delete Pattern')
  }
}
