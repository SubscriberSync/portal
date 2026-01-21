import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { handleApiError } from '@/lib/api-utils'

// GET /api/migration/runs
// Get all migration runs for the organization
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

    const { data: runs, error } = await supabase
      .from('migration_runs')
      .select('*')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ runs: runs || [] })
  } catch (error) {
    return handleApiError(error, 'Migration Runs', 'Failed to fetch runs')
  }
}

// POST /api/migration/runs
// Start a new migration run
export async function POST(request: NextRequest) {
  const { orgSlug, orgId, userId } = await auth()

  if (!orgSlug || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  try {
    const supabase = createServiceClient()

    // Check for existing SKU mappings
    const { count: aliasCount } = await supabase
      .from('sku_aliases')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id)

    if (!aliasCount || aliasCount === 0) {
      return NextResponse.json(
        { error: 'Please map at least one SKU before starting the audit' },
        { status: 400 }
      )
    }

    // Count subscribers to audit (pending migration status OR null status)
    const { count: subscriberCount, error: countError } = await supabase
      .from('subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .or('migration_status.is.null,migration_status.eq.pending')

    if (countError) {
      throw new Error(countError.message)
    }

    if (!subscriberCount || subscriberCount === 0) {
      return NextResponse.json(
        { error: 'No subscribers pending migration' },
        { status: 400 }
      )
    }

    // Create new migration run
    const { data: run, error } = await supabase
      .from('migration_runs')
      .insert({
        organization_id: organization.id,
        status: 'running',
        total_subscribers: subscriberCount,
        processed_subscribers: 0,
        clean_count: 0,
        flagged_count: 0,
        started_at: new Date().toISOString(),
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    // Get subscriber IDs for the first batch
    const { data: subscribers } = await supabase
      .from('subscribers')
      .select('id')
      .eq('organization_id', organization.id)
      .or('migration_status.is.null,migration_status.eq.pending')
      .order('created_at', { ascending: true })

    return NextResponse.json({
      run,
      subscriberIds: (subscribers || []).map(s => s.id),
      totalSubscribers: subscriberCount,
    })
  } catch (error) {
    return handleApiError(error, 'Migration Runs', 'Failed to start migration')
  }
}

// PATCH /api/migration/runs
// Update migration run status (complete/fail)
export async function PATCH(request: NextRequest) {
  const { orgSlug, orgId } = await auth()

  if (!orgSlug || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  try {
    const { runId, status } = await request.json()

    if (!runId || !status) {
      return NextResponse.json({ error: 'runId and status required' }, { status: 400 })
    }

    if (!['completed', 'failed'].includes(status)) {
      return NextResponse.json({ error: 'Status must be completed or failed' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: run, error } = await supabase
      .from('migration_runs')
      .update({
        status,
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId)
      .eq('organization_id', organization.id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ run })
  } catch (error) {
    return handleApiError(error, 'Migration Runs', 'Failed to update run')
  }
}
