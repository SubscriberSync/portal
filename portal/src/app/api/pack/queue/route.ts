import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'

export const dynamic = 'force-dynamic'

// GET /api/pack/queue
// Returns the pack queue ordered by print_batch_id (newest first) and print_sequence
// Only shows shipments with status = 'Ready to Pack'
export async function GET(request: NextRequest) {
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

    // Get batch filter from query params
    const batchId = request.nextUrl.searchParams.get('batch')

    // Build query for Ready to Pack shipments
    let query = supabase
      .from('shipments')
      .select(`
        *,
        subscriber:subscribers(
          id, email, first_name, last_name,
          address1, address2, city, state, zip, country, phone
        ),
        print_batch:print_batches(batch_number)
      `)
      .eq('organization_id', organization.id)
      .eq('status', 'Ready to Pack')

    // Filter by specific batch if provided
    if (batchId) {
      query = query.eq('print_batch_id', batchId)
    }

    // Order by batch (newest first) then by print_sequence (matches physical label stack)
    const { data: shipments, error } = await query
      .order('label_purchased_at', { ascending: false })
      .order('print_sequence', { ascending: true })

    if (error) {
      console.error('[Pack Queue] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 })
    }

    // Get stats
    const { count: packedTodayCount } = await supabase
      .from('shipments')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .eq('status', 'Packed')
      .gte('packed_at', new Date().toISOString().split('T')[0])

    // Get available batches for batch selector
    const { data: batches } = await supabase
      .from('print_batches')
      .select('id, batch_number, total_labels, successful_labels, created_at')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Count shipments still ready to pack per batch
    const batchCounts = new Map<string, number>()
    shipments?.forEach(s => {
      if (s.print_batch_id) {
        batchCounts.set(s.print_batch_id, (batchCounts.get(s.print_batch_id) || 0) + 1)
      }
    })

    return NextResponse.json({
      queue: shipments || [],
      stats: {
        total: shipments?.length || 0,
        packedToday: packedTodayCount || 0,
      },
      batches: batches?.map(b => ({
        ...b,
        remaining: batchCounts.get(b.id) || 0,
      })) || [],
    })
  } catch (error) {
    console.error('[Pack Queue] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 })
  }
}
