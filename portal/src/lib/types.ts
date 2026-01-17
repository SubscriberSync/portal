export interface IntegrationStatus {
  connected: boolean
  lastSync?: string // ISO date string of last sync
}

export interface ClientIntegrations {
  shopify: IntegrationStatus
  recharge: IntegrationStatus
  klaviyo: IntegrationStatus
  airtable: IntegrationStatus
  discord?: IntegrationStatus // Only present if Discord is configured
}

export interface ClientData {
  company: string
  slug: string
  status: 'Discovery' | 'Scoping' | 'Building' | 'Testing' | 'Training' | 'Live'
  logoUrl?: string
  airtableUrl?: string
  loomUrl?: string
  totalSubscribers: number
  activeSubscribers: number
  pausedSubscribers: number
  cancelledSubscribers: number
  hostingRenewal: string | null
  // Integration fields
  discordServerId?: string
  // Integration status (based on credentials in Airtable)
  integrations?: ClientIntegrations
}

export const statusStages = [
  {
    id: 'discovery',
    label: 'Discovery',
    icon: '🔍',
    description: 'Understanding your business and subscriber journey requirements.',
  },
  {
    id: 'scoping',
    label: 'Scoping',
    icon: '📐',
    description: 'Defining the automation scope and integration points.',
  },
  {
    id: 'building',
    label: 'Building',
    icon: '🔧',
    description: 'Building your custom subscriber automation system.',
  },
  {
    id: 'testing',
    label: 'Testing',
    icon: '🧪',
    description: 'Testing all automations and data flows.',
  },
  {
    id: 'training',
    label: 'Training',
    icon: '📚',
    description: 'Training your team on the new system.',
  },
  {
    id: 'live',
    label: 'Live',
    icon: '🚀',
    description: 'Your subscriber journey system is live and processing data!',
  },
] as const

export type StatusStage = (typeof statusStages)[number]

export function getStatusIndex(status: ClientData['status']): number {
  const statusMap: Record<ClientData['status'], number> = {
    Discovery: 0,
    Scoping: 1,
    Building: 2,
    Testing: 3,
    Training: 4,
    Live: 5,
  }
  return statusMap[status] ?? 0
}

export function getStatusStage(status: ClientData['status']): StatusStage {
  const index = getStatusIndex(status)
  return statusStages[index]
}
