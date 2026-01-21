import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Debug endpoint to find episode counting discrepancies
 * GET /api/debug/episode-discrepancy
 */
export async function GET(request: NextRequest) {
  const supabase = createServiceClient()

  try {
    const results = {
      timestamp: new Date().toISOString(),
      discrepancies: [],
      summary: {}
    }

    // 1. Get subscribers with episode data
    const { data: subscribers, error: subError } = await supabase
      .from('subscribers')
      .select('id, email, box_number, current_product_sequence, migration_status, organization_id')
      .neq('box_number', null)
      .neq('box_number', 0)
      .limit(50)
      .order('box_number', { ascending: false })

    if (subError) {
      return NextResponse.json({ error: 'Failed to fetch subscribers', details: subError }, { status: 500 })
    }

    results.summary.totalSubscribers = subscribers.length

    // 2. Check for discrepancies between box_number and current_product_sequence
    const fieldDiscrepancies = subscribers.filter(sub =>
      sub.current_product_sequence !== null &&
      sub.current_product_sequence !== sub.box_number
    )

    results.summary.fieldDiscrepancies = fieldDiscrepancies.length
    if (fieldDiscrepancies.length > 0) {
      results.discrepancies.push({
        type: 'field_mismatch',
        description: 'box_number != current_product_sequence',
        count: fieldDiscrepancies.length,
        samples: fieldDiscrepancies.slice(0, 5).map(sub => ({
          email: sub.email,
          box_number: sub.box_number,
          current_product_sequence: sub.current_product_sequence,
          migration_status: sub.migration_status
        }))
      })
    }

    // 3. Check audit logs vs actual values
    const { data: auditLogs, error: auditError } = await supabase
      .from('audit_logs')
      .select(`
        id,
        email,
        status,
        proposed_next_box,
        resolved_next_box,
        flag_reasons,
        confidence_score,
        created_at,
        subscribers!inner(id, email, box_number, migration_status)
      `)
      .in('status', ['clean', 'resolved'])
      .order('created_at', { ascending: false })
      .limit(50)

    if (!auditError && auditLogs) {
      const auditDiscrepancies = []
      auditLogs.forEach(log => {
        const subscriber = Array.isArray(log.subscribers) ? log.subscribers[0] : log.subscribers
        if (!subscriber) return

        const auditedEpisode = (log.resolved_next_box || log.proposed_next_box) - 1

        if (subscriber.box_number !== auditedEpisode) {
          auditDiscrepancies.push({
            email: log.email,
            auditedEpisode,
            actualBoxNumber: subscriber.box_number,
            auditDate: log.created_at,
            auditStatus: log.status
          })
        }
      })

      results.summary.auditDiscrepancies = auditDiscrepancies.length
      if (auditDiscrepancies.length > 0) {
        results.discrepancies.push({
          type: 'audit_vs_actual',
          description: 'audit result != actual box_number',
          count: auditDiscrepancies.length,
          samples: auditDiscrepancies.slice(0, 5)
        })
      }
    }

    // 4. Check migration status distribution
    const statusCounts = {}
    subscribers.forEach(sub => {
      const status = sub.migration_status || 'null'
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })
    results.summary.migrationStatus = statusCounts

    // 5. Check for unusually high episode numbers
    const highEpisodeSubs = subscribers.filter(sub => sub.box_number > 20)
    results.summary.highEpisodeCount = highEpisodeSubs.length
    if (highEpisodeSubs.length > 0) {
      results.discrepancies.push({
        type: 'high_episodes',
        description: 'subscribers with box_number > 20',
        count: highEpisodeSubs.length,
        samples: highEpisodeSubs.slice(0, 3).map(sub => ({
          email: sub.email,
          box_number: sub.box_number,
          migration_status: sub.migration_status
        }))
      })
    }

    // 6. Check audit logs for recent subscribers
    const subscriberEmails = subscribers.map(s => s.email)
    if (subscriberEmails.length > 0) {
      const { data: auditLogs, error: auditError } = await supabase
        .from('audit_logs')
        .select('email, status, proposed_next_box, resolved_next_box, detected_sequences, created_at')
        .in('email', subscriberEmails)
        .order('email', { ascending: true })
        .order('created_at', { ascending: false })

      if (!auditError && auditLogs) {
        // Group by email to get latest audit per subscriber
        const latestAudits = {}
        auditLogs.forEach(log => {
          if (!latestAudits[log.email]) {
            latestAudits[log.email] = log
          }
        })

        results.auditLogs = latestAudits
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Episode discrepancy query error:', error)
    return NextResponse.json({
      error: 'Query failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}