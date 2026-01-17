import { NextResponse } from 'next/server'
import { getPackingData } from '@/lib/airtable-shipping'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const batches = await getPackingData()

    return NextResponse.json({ batches })
  } catch (error) {
    console.error('[Packing API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch packing data' }, { status: 500 })
  }
}
