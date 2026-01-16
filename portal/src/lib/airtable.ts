import Airtable from 'airtable'
import { ClientData } from './types'

// Initialize Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID!
)

export async function getClientBySlug(slug: string): Promise<ClientData | null> {
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
      id: record.id,
      company: (fields['Company'] as string) || '',
      slug: (fields['Slug'] as string) || slug,
      contact: (fields['Contact'] as string) || '',
      email: (fields['Email'] as string) || '',
      status: (fields['Portal Status'] as ClientData['status']) || 'Paid',
      currentBox: (fields['Current Box'] as number) || 0,
      totalSubscribers: (fields['Total Subscribers'] as number) || 0,
      activeSubscribers: (fields['Active Subscribers'] as number) || 0,
      pausedSubscribers: (fields['Paused Subscribers'] as number) || 0,
      cancelledSubscribers: (fields['Cancelled Subscribers'] as number) || 0,
      goLiveDate: (fields['Go Live Date'] as string) || null,
      hostingRenewal: (fields['Hosting Renewal'] as string) || null,
      loomUrl: (fields['Loom URL'] as string) || null,
      airtableUrl: (fields['Airtable URL'] as string) || null,
      logoUrl: (fields['Logo URL'] as string) || null,
    }
  } catch (error) {
    console.error('Error fetching client:', error)
    return null
  }
}

// For demo/development without Airtable
export function getDemoClient(slug: string): ClientData {
  return {
    id: 'demo',
    company: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    slug,
    contact: 'Demo User',
    email: 'demo@example.com',
    status: 'Building',
    currentBox: 3,
    totalSubscribers: 2450,
    activeSubscribers: 2100,
    pausedSubscribers: 200,
    cancelledSubscribers: 150,
    goLiveDate: null,
    hostingRenewal: '2027-01-15',
    loomUrl: null,
    airtableUrl: null,
    logoUrl: null,
  }
}
