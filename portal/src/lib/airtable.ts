import Airtable from 'airtable'
import { ClientData } from './types'

// Initialize Airtable
const base = process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID
  ? new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)
  : null

export async function getClientBySlug(slug: string): Promise<ClientData | null> {
  if (!base) return null

  try {
    const records = await base('Clients')
      .select({
        filterByFormula: `{Slug} = '${slug}'`,
        maxRecords: 1,
      })
      .firstPage()

    if (records.length === 0) return null

    const record = records[0]
    const fields = record.fields

    return {
      company: (fields['Company'] as string) || '',
      slug: (fields['Slug'] as string) || slug,
      status: (fields['Status'] as ClientData['status']) || 'Building',
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
    console.error('Error fetching client from Airtable:', error)
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
