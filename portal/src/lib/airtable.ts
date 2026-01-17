import { ClientData } from './types'

// Use same env vars as airtable-intake.ts for consistency
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY
const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appVyyEPy9cs8XBtB'
const CLIENTS_TABLE_ID = 'tblEsjEgVXfHhARrX'

export async function getClientBySlug(slug: string): Promise<ClientData | null> {
  if (!AIRTABLE_TOKEN) {
    console.log('[Airtable] No token configured, returning null')
    return null
  }

  try {
    console.log(`[Airtable] Fetching client with slug: ${slug} from base: ${BASE_ID}`)

    const formula = encodeURIComponent(`{Slug}="${slug}"`)
    const url = `https://api.airtable.com/v0/${BASE_ID}/${CLIENTS_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Never cache this request
    })

    if (!response.ok) {
      console.error(`[Airtable] API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()

    if (!data.records || data.records.length === 0) {
      console.log(`[Airtable] No client found with slug: ${slug}`)
      return null
    }

    const fields = data.records[0].fields

    // Log the Portal Status field for debugging
    console.log(`[Airtable] Found client: ${fields['Client']}, Portal Status: "${fields['Portal Status']}"`)

    const status = (fields['Portal Status'] as ClientData['status']) || 'Building'

    return {
      company: (fields['Client'] as string) || '',
      slug: (fields['Slug'] as string) || slug,
      status,
      logoUrl: fields['Logo URL'] as string | undefined,
      airtableUrl: fields['Airtable URL'] as string | undefined,
      loomUrl: fields['Loom URL'] as string | undefined,
      totalSubscribers: (fields['Total Subscribers'] as number) || 0,
      activeSubscribers: (fields['Active Subscribers'] as number) || 0,
      pausedSubscribers: (fields['Paused Subscribers'] as number) || 0,
      cancelledSubscribers: (fields['Cancelled Subscribers'] as number) || 0,
      hostingRenewal: (fields['Hosting Renewal'] as string) || null,
    }
  } catch (error) {
    console.error('[Airtable] Error fetching client:', error)
    return null
  }
}

export function getDemoClient(slug: string): ClientData {
  // Generate demo data based on slug for testing
  const isLive = slug.toLowerCase().includes('demo') || slug.toLowerCase().includes('live')

  return {
    company: formatCompanyName(slug),
    slug,
    status: isLive ? 'Live' : 'Building',
    logoUrl: undefined,
    airtableUrl: isLive ? 'https://airtable.com/demo' : undefined,
    loomUrl: isLive ? 'https://www.loom.com/share/demo' : undefined,
    totalSubscribers: isLive ? 2847 : 0,
    activeSubscribers: isLive ? 2156 : 0,
    pausedSubscribers: isLive ? 423 : 0,
    cancelledSubscribers: isLive ? 268 : 0,
    hostingRenewal: isLive ? '2025-06-15' : null,
  }
}

function formatCompanyName(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
