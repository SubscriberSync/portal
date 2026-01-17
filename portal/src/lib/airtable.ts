import Airtable from 'airtable'
import { ClientData } from './types'

// Initialize Airtable
const base = process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID
  ? new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)
  : null

export async function getClientBySlug(slug: string): Promise<ClientData | null> {
  if (!base) {
    console.log('[Airtable] No base configured, returning null')
    return null
  }

  try {
    console.log(`[Airtable] Fetching client with slug: ${slug}`)

    const records = await base('Clients')
      .select({
        filterByFormula: `{Slug} = '${slug}'`,
        maxRecords: 1,
      })
      .firstPage()

    if (records.length === 0) {
      console.log(`[Airtable] No client found with slug: ${slug}`)
      return null
    }

    const record = records[0]
    const fields = record.fields

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
