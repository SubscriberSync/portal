import { ClientData, ClientIntegrations, IntegrationStatus } from './types'
import { config } from './config'

// Helper to format relative time (e.g., "2m ago", "1hr ago")
function formatRelativeTime(dateString: string | undefined): string | undefined {
  if (!dateString) return undefined

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return undefined

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}hr ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export async function getClientBySlug(slug: string): Promise<ClientData | null> {
  if (!config.airtable.token) {
    console.log('[Airtable] No token configured, returning null')
    return null
  }

  const { baseId, tables } = config.airtable.portal
  const f = config.fields.client

  try {
    console.log(`[Airtable] Fetching client with slug: ${slug} from base: ${baseId}`)

    // Case-insensitive slug lookup
    const formula = encodeURIComponent(`LOWER({${f.slug}})="${slug.toLowerCase()}"`)
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

    // Build integration status based on whether credentials exist
    const hasShopify = !!(fields[f.shopifyApiKey] as string)
    const hasRecharge = !!(fields[f.rechargeApiKey] as string)
    const hasKlaviyo = !!(fields[f.klaviyoApiKey] as string)
    const hasDiscord = !!(fields['Discord Server ID'] as string)
    // Airtable is always connected if we got this far
    const hasAirtable = true

    const integrations: ClientIntegrations = {
      shopify: {
        connected: hasShopify,
        lastSync: formatRelativeTime(fields[f.shopifyLastSync] as string),
      },
      recharge: {
        connected: hasRecharge,
        lastSync: formatRelativeTime(fields[f.rechargeLastSync] as string),
      },
      klaviyo: {
        connected: hasKlaviyo,
        lastSync: formatRelativeTime(fields[f.klaviyoLastSync] as string),
      },
      airtable: {
        connected: hasAirtable,
        lastSync: formatRelativeTime(fields[f.airtableLastSync] as string) || 'just now',
      },
    }

    // Only add Discord if configured
    if (hasDiscord) {
      integrations.discord = {
        connected: true,
        lastSync: formatRelativeTime(fields[f.discordLastSync] as string),
      }
    }

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
      integrations,
    }
  } catch (error) {
    console.error('[Airtable] Error fetching client:', error)
    return null
  }
}

export function getDemoClient(slug: string): ClientData {
  // Generate demo data based on slug for testing
  const isLive = slug.toLowerCase().includes('demo') || slug.toLowerCase().includes('live')

  // Demo integrations - all connected when live
  const demoIntegrations: ClientIntegrations = {
    shopify: { connected: isLive, lastSync: isLive ? '2m ago' : undefined },
    recharge: { connected: isLive, lastSync: isLive ? '2m ago' : undefined },
    klaviyo: { connected: isLive, lastSync: isLive ? '5m ago' : undefined },
    airtable: { connected: true, lastSync: 'just now' },
  }

  // Add Discord for demo
  if (isLive) {
    demoIntegrations.discord = { connected: true, lastSync: '1hr ago' }
  }

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
    integrations: demoIntegrations,
  }
}

function formatCompanyName(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
