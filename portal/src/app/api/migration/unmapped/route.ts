import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { createServiceClient } from '@/lib/supabase/service'
import { handleApiError } from '@/lib/api-utils'

/**
 * GET /api/migration/unmapped
 * Get unmapped items for the organization
 */
export async function GET(request: NextRequest) {
  const { orgSlug } = await auth()

  if (!orgSlug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const organization = await getOrganizationBySlug(orgSlug)
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const resolved = searchParams.get('resolved') === 'true'
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const supabase = createServiceClient()
    let query = supabase
      .from('unmapped_items')
      .select('*', { count: 'exact' })
      .eq('organization_id', organization.id)
      .eq('resolved', resolved)
      .order('order_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(
        `product_name.ilike.%${search}%,sku.ilike.%${search}%,customer_email.ilike.%${search}%`
      )
    }

    const { data: items, count, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      items: items || [],
      total: count || 0,
    })
  } catch (error) {
    return handleApiError(error, 'Get Unmapped Items')
  }
}

/**
 * POST /api/migration/unmapped
 * Resolve unmapped items by assigning them to a sequence
 */
export async function POST(request: NextRequest) {
  const { orgSlug, userId } = await auth()

  if (!orgSlug || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const organization = await getOrganizationBySlug(orgSlug)
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { itemIds, sequence, method = 'manual' } = await request.json()

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'itemIds array is required' }, { status: 400 })
    }

    if (typeof sequence !== 'number' || sequence < 1) {
      return NextResponse.json({ error: 'Valid sequence number is required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { error } = await supabase
      .from('unmapped_items')
      .update({
        resolved: true,
        resolved_sequence: sequence,
        resolved_at: new Date().toISOString(),
        resolved_by: userId,
        resolution_method: method,
      })
      .eq('organization_id', organization.id)
      .in('id', itemIds)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, resolved: itemIds.length })
  } catch (error) {
    return handleApiError(error, 'Resolve Unmapped Items')
  }
}

/**
 * DELETE /api/migration/unmapped
 * Skip/ignore unmapped items
 */
export async function DELETE(request: NextRequest) {
  const { orgSlug, userId } = await auth()

  if (!orgSlug || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const organization = await getOrganizationBySlug(orgSlug)
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { itemIds } = await request.json()

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'itemIds array is required' }, { status: 400 })
    }

    // Mark as resolved with null sequence (skipped)
    const supabase = createServiceClient()
    const { error } = await supabase
      .from('unmapped_items')
      .update({
        resolved: true,
        resolved_sequence: null,
        resolved_at: new Date().toISOString(),
        resolved_by: userId,
        resolution_method: 'manual',
      })
      .eq('organization_id', organization.id)
      .in('id', itemIds)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, skipped: itemIds.length })
  } catch (error) {
    return handleApiError(error, 'Skip Unmapped Items')
  }
}
