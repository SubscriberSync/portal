import { ClientData } from './types'
import { config } from './config'

export async function getClientBySlug(slug: string): Promise<ClientData | null> {
  if (!config.airtable.token) {
    console.log('[Airtable] No token configured, returning null')
    return null
  }

  const { baseId, tables } = config.airtable.portal
  const f = config.fields.client

  try {
    console.log(`[Airtable] Fetching client with slug: ${slug} from base: ${baseId}`)

    const formula = encodeURIComponent(`{${f.slug}}="${slug}"`)
    const url = `https://api.airtable.com/v0/${baseId}/${tables.clients}?filterByFormula=${formula}&maxRecords=1`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.airtable.token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
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

    console.log(`[Airtable] Found client: ${fields[f.name]}, Portal Status: "${fields[f.status]}"`)

    const status = (fields[f.status] as ClientData['status']) || 'Building'

    return {
      company: (fields[f.name] as string) || '',
      slug: (fields[f.slug] as string) || slug,
      status,
      logoUrl: fields[f.logoUrl] as string | undefined,
      airtableUrl: fields[f.airtableUrl] as string | undefined,
      loomUrl: fields[f.loomUrl] as string | undefined,
      totalSubscribers: (fields['Total Subscribers'] as number) || 0,
      activeSubscribers: (fields['Active Subscribers'] as number) || 0,
      pausedSubscribers: (fields['Paused Subscribers'] as number) || 0,
      cancelledSubscribers: (fields['Cancelled Subscribers'] as number) || 0,
      hostingRenewal: (fields['Hosting Renewal'] as string) || null,
      discordServerId: (fields['Discord Server ID'] as string) || undefined,
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
