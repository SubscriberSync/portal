import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSubscribers } from '@/lib/supabase/data'

export const dynamic = 'force-dynamic'

// Escape CSV values (handle commas, quotes, newlines)
function escapeCSV(value: string): string {
  if (!value) return ''
  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export async function GET(request: NextRequest) {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all active subscribers for shipping
    const subscribers = await getSubscribers(orgId, { status: 'Active' })

    if (subscribers.length === 0) {
      return NextResponse.json({ error: 'No shipping records found' }, { status: 404 })
    }

    // ShipStation CSV headers
    const headers = [
      'Order Number',
      'Ship To - Name',
      'Ship To - Address 1',
      'Ship To - Address 2',
      'Ship To - City',
      'Ship To - State',
      'Ship To - Postal Code',
      'Ship To - Country',
      'Ship To - Email',
      'Ship To - Phone',
    ]

    const rows = subscribers.map((sub, index) => {
      const name = `${sub.first_name || ''} ${sub.last_name || ''}`.trim()
      return [
        `ORD-${String(index + 1).padStart(5, '0')}`, // Generate order number
        escapeCSV(name),
        escapeCSV(sub.address1 || ''),
        escapeCSV(sub.address2 || ''),
        escapeCSV(sub.city || ''),
        escapeCSV(sub.state || ''),
        escapeCSV(sub.zip || ''),
        escapeCSV(sub.country || 'US'),
        escapeCSV(sub.email || ''),
        escapeCSV(sub.phone || ''),
      ].join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')
    const filename = `shipping-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[Shipping CSV] Error:', error)
    return NextResponse.json({ error: 'Failed to generate CSV' }, { status: 500 })
  }
}
