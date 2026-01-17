// Shipping data from a separate Airtable base
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY
const SHIPPING_BASE_ID = 'appmtPTf4hLxhx437'
const SHIPPING_TABLE_ID = 'tblt9Q0GjZBN4l6Xl'

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
}

// Fetch all shipping records from Airtable
export async function getShippingRecords(): Promise<ShippingRecord[]> {
  if (!AIRTABLE_TOKEN) {
    console.error('[Shipping] Missing AIRTABLE_TOKEN')
    return []
  }

  try {
    const allRecords: ShippingRecord[] = []
    let offset: string | undefined

    // Paginate through all records
    do {
      const url = new URL(`https://api.airtable.com/v0/${SHIPPING_BASE_ID}/${SHIPPING_TABLE_ID}`)
      if (offset) {
        url.searchParams.set('offset', offset)
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
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
        firstName: record.fields['First Name'] || '',
        lastName: record.fields['Last Name'] || '',
        address: record.fields['Address'] || '',
        address2: record.fields['Address 2'] || '',
        city: record.fields['City'] || '',
        state: record.fields['State'] || '',
        zip: record.fields['Zip'] || '',
        country: record.fields['Country'] || 'US',
        email: record.fields['Email'] || '',
        phone: record.fields['Phone'] || '',
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
