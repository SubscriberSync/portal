// Shipping data from Airtable
import { config } from './config'

export interface ShippingRecord {
  id: string
  firstName: string
  lastName: string
  address: string
  address2?: string
  city: string
  state: string
  zip: string
  country: string
  email?: string
  phone?: string
  // Pack mode fields
  batch?: string
  box?: string
  shirtSize?: string
  packed?: boolean
}

// Fetch all shipping records from Airtable
export async function getShippingRecords(): Promise<ShippingRecord[]> {
  if (!config.airtable.token) {
    console.error('[Shipping] Missing AIRTABLE_TOKEN')
    return []
  }

  const { baseId, tables } = config.airtable.shipping
  const f = config.fields.subscriber

  try {
    const allRecords: ShippingRecord[] = []
    let offset: string | undefined

    // Paginate through all records
    do {
      const url = new URL(`https://api.airtable.com/v0/${baseId}/${tables.subscribers}`)
      if (offset) {
        url.searchParams.set('offset', offset)
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${config.airtable.token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        console.error('[Shipping] Airtable API error:', response.status)
        return []
      }

      const data = await response.json()

      const records = data.records.map((record: any) => ({
        id: record.id,
        firstName: record.fields[f.firstName] || '',
        lastName: record.fields[f.lastName] || '',
        address: record.fields[f.address] || '',
        address2: record.fields[f.address2] || '',
        city: record.fields[f.city] || '',
        state: record.fields[f.state] || '',
        zip: record.fields[f.zip] || '',
        country: record.fields[f.country] || 'US',
        email: record.fields[f.email] || '',
        phone: record.fields[f.phone] || '',
        // Pack mode fields
        batch: record.fields[f.batch] || '',
        box: record.fields[f.box] || '',
        shirtSize: record.fields[f.shirtSize] || '',
        packed: record.fields[f.packed] || false,
      }))

      allRecords.push(...records)
      offset = data.offset
    } while (offset)

    console.log(`[Shipping] Fetched ${allRecords.length} shipping records`)
    return allRecords
  } catch (error) {
    console.error('[Shipping] Error fetching records:', error)
    return []
  }
}

// Get records grouped by batch for Pack Mode
export interface PackBatch {
  batch: string
  box: string
  total: number
  packed: number
  sizeBreakdown: Record<string, number>
  records: ShippingRecord[]
}

export async function getPackingData(): Promise<PackBatch[]> {
  const records = await getShippingRecords()

  // Group by batch + box
  const batches = new Map<string, PackBatch>()

  for (const record of records) {
    const key = `${record.batch || 'Unknown'}|${record.box || 'Unknown'}`

    if (!batches.has(key)) {
      batches.set(key, {
        batch: record.batch || 'Unknown',
        box: record.box || 'Unknown',
        total: 0,
        packed: 0,
        sizeBreakdown: {},
        records: [],
      })
    }

    const batch = batches.get(key)!
    batch.total++
    if (record.packed) batch.packed++
    batch.records.push(record)

    // Track size breakdown
    const size = record.shirtSize || 'N/A'
    batch.sizeBreakdown[size] = (batch.sizeBreakdown[size] || 0) + 1
  }

  // Sort by batch name
  return Array.from(batches.values()).sort((a, b) => a.batch.localeCompare(b.batch))
}

// Convert records to ShipStation CSV format
export function convertToShipStationCSV(records: ShippingRecord[]): string {
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

  const rows = records.map((record, index) => {
    const name = `${record.firstName} ${record.lastName}`.trim()
    return [
      `ORD-${String(index + 1).padStart(5, '0')}`, // Generate order number
      escapeCSV(name),
      escapeCSV(record.address),
      escapeCSV(record.address2 || ''),
      escapeCSV(record.city),
      escapeCSV(record.state),
      escapeCSV(record.zip),
      escapeCSV(record.country),
      escapeCSV(record.email || ''),
      escapeCSV(record.phone || ''),
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}

// Escape CSV values (handle commas, quotes, newlines)
function escapeCSV(value: string): string {
  if (!value) return ''
  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
