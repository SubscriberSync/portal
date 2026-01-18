import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { resolveAuditRecord } from '@/lib/forensic-audit'

// GET /api/migration/resolve
// Get flagged audit records that need resolution
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
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'flagged'

    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        subscriber:subscribers(id, first_name, last_name, email)
      `)
      .eq('organization_id', organization.id)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ logs: logs || [] })
  } catch (error) {
    console.error('[Resolve] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}

// POST /api/migration/resolve
// Resolve a flagged audit record
export async function POST(request: NextRequest) {
  const { orgSlug, orgId, userId } = await auth()

  if (!orgSlug || !orgId || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  try {
    const { auditLogId, nextBox, note } = await request.json()

    if (!auditLogId || typeof nextBox !== 'number') {
      return NextResponse.json(
        { error: 'auditLogId and nextBox (number) required' },
        { status: 400 }
      )
    }

    if (nextBox < 1 || nextBox > 100) {
      return NextResponse.json(
        { error: 'nextBox must be between 1 and 100' },
        { status: 400 }
      )
    }

    // Verify the audit log belongs to this org
    const supabase = createServiceClient()
    const { data: auditLog } = await supabase
      .from('audit_logs')
      .select('organization_id')
      .eq('id', auditLogId)
      .single()

    if (!auditLog || auditLog.organization_id !== organization.id) {
      return NextResponse.json({ error: 'Audit log not found' }, { status: 404 })
    }

    // Resolve the record
    await resolveAuditRecord(auditLogId, nextBox, userId, note)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Resolve] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resolve' },
      { status: 500 }
    )
  }
}

// POST /api/migration/resolve/skip
// Skip a subscriber (mark as skipped, don't import)
export async function DELETE(request: NextRequest) {
  const { orgSlug, orgId, userId } = await auth()

  if (!orgSlug || !orgId || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  try {
    const { auditLogId, reason } = await request.json()

    if (!auditLogId) {
      return NextResponse.json({ error: 'auditLogId required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Verify ownership
    const { data: auditLog } = await supabase
      .from('audit_logs')
      .select('organization_id, subscriber_id')
      .eq('id', auditLogId)
      .single()

    if (!auditLog || auditLog.organization_id !== organization.id) {
      return NextResponse.json({ error: 'Audit log not found' }, { status: 404 })
    }

    // Mark as skipped
    await supabase
      .from('audit_logs')
      .update({
        status: 'skipped',
        resolution_note: reason || 'Skipped by user',
        resolved_by: userId,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', auditLogId)

    // Update subscriber status
    if (auditLog.subscriber_id) {
      await supabase
        .from('subscribers')
        .update({
          migration_status: 'skipped',
          updated_at: new Date().toISOString(),
        })
        .eq('id', auditLog.subscriber_id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Resolve Skip] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to skip' },
      { status: 500 }
    )
  }
}
