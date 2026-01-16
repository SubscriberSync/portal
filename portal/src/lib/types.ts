export interface ClientData {
  id: string
  company: string
  slug: string
  contact: string
  email: string
  status: 'Paid' | 'Access' | 'Building' | 'Testing' | 'Live'
  currentBox: number
  totalSubscribers: number
  activeSubscribers: number
  pausedSubscribers: number
  cancelledSubscribers: number
  goLiveDate: string | null
  hostingRenewal: string | null
  loomUrl: string | null
  airtableUrl: string | null
  logoUrl: string | null
}

export const statusStages = [
  { id: 'Paid', label: 'Paid', icon: '💳', description: 'Payment received, starting your build' },
  { id: 'Access', label: 'Access', icon: '🔑', description: 'Collecting API keys and platform access' },
  { id: 'Building', label: 'Building', icon: '⚙️', description: 'Deploying your automation system' },
  { id: 'Testing', label: 'Testing', icon: '🧪', description: 'Verifying data sync across all platforms' },
  { id: 'Live', label: 'Live', icon: '🚀', description: 'System active and monitoring' },
] as const

export function getStatusIndex(status: ClientData['status']): number {
  return statusStages.findIndex(s => s.id === status)
}
