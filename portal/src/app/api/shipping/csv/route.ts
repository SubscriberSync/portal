import { NextResponse } from 'next/server'
import { getShippingRecords, convertToShipStationCSV } from '@/lib/airtable-shipping'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const records = await getShippingRecords()

    if (records.length === 0) {
      return NextResponse.json({ error: 'No shipping records found' }, { status: 404 })
    }

    const csv = convertToShipStationCSV(records)
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
