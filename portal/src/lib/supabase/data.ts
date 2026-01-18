import { createServiceClient } from './service'

// Types matching Supabase schema
export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  status: 'Discovery' | 'Scoping' | 'Building' | 'Testing' | 'Training' | 'Live'
  step1_complete: boolean
  step2_complete: boolean
  hosting_renewal: string | null
  airtable_url: string | null
  loom_url: string | null
  created_at: string
  updated_at: string
}

export interface IntakeSubmission {
  id: string
  organization_id: string
  item_type: 'Shopify API Key' | 'Shopify API Secret' | 'Recharge API Key' | 'Klaviyo API Key' | 'Installment Name'
  value_encrypted: string | null
  status: 'Pending' | 'Submitted' | 'Approved' | 'Rejected'
  rejection_note: string | null
  submitted_at: string | null
  reviewed_at: string | null
  created_at: string
}

export interface DiscordConfig {
  id: string
  organization_id: string
  decision: 'Not Decided' | 'Yes Setup' | 'Maybe Later' | 'No Thanks'
  new_or_existing: 'Create New' | 'Connect Existing' | null
  server_name: string | null
  server_id: string | null
  channels: string[]
  episode_gated: boolean
  moderator_name: string | null
  moderator_email: string | null
  vibe: 'Casual & Friendly' | 'Professional' | 'Playful & Fun' | null
  created_at: string
}

export interface Integration {
  id: string
  organization_id: string
  type: 'shopify' | 'recharge' | 'klaviyo' | 'discord'
  credentials_encrypted: Record<string, unknown> | null
  connected: boolean
  last_sync_at: string | null
  created_at: string
}

export interface Subscriber {
  id: string
  organization_id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  address1: string | null
  address2: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string
  status: 'Active' | 'Paused' | 'Cancelled' | 'Expired'
  box_number: number
  shirt_size: string | null
  recharge_customer_id: string | null
  shopify_customer_id: string | null
  created_at: string
  updated_at: string
}

export interface Shipment {
  id: string
  organization_id: string
  subscriber_id: string | null
  type: 'Subscription' | 'One-Off' | null
  sequence_id: number | null
  status: 'Unfulfilled' | 'Packed' | 'Flagged' | 'Merged' | 'Shipped' | 'Delivered'
  flag_reason: string | null
  product_name: string | null
  gift_note: string | null
  tracking_number: string | null
  packed_at: string | null
  shipped_at: string | null
  created_at: string
}

// ===================
// Organization Functions
// ===================

export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !data) {
    console.log('[getOrganizationBySlug] Not found:', slug)
    return null
  }

  return data as Organization
}

export async function getOrganizationById(id: string): Promise<Organization | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return data as Organization
}

export async function upsertOrganization(org: Partial<Organization> & { id: string; name: string; slug: string }): Promise<Organization | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('organizations')
    .upsert({
      ...org,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select()
    .single()

  if (error) {
    console.error('[upsertOrganization] Error:', error)
    return null
  }

  return data as Organization
}

export async function updateOrganization(id: string, updates: Partial<Organization>): Promise<boolean> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('organizations')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('[updateOrganization] Error:', error)
    return false
  }

  return true
}

// ===================
// Intake Submission Functions
// ===================

export async function getIntakeSubmissions(organizationId: string): Promise<IntakeSubmission[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('intake_submissions')
    .select('*')
    .eq('organization_id', organizationId)

  if (error) {
    console.error('[getIntakeSubmissions] Error:', error)
    return []
  }

  return (data || []) as IntakeSubmission[]
}

export async function upsertIntakeSubmission(
  organizationId: string,
  itemType: IntakeSubmission['item_type'],
  value: string,
  status: IntakeSubmission['status'] = 'Submitted'
): Promise<IntakeSubmission | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('intake_submissions')
    .upsert({
      organization_id: organizationId,
      item_type: itemType,
      value_encrypted: value,
      status,
      submitted_at: new Date().toISOString(),
      reviewed_at: status === 'Approved' ? new Date().toISOString() : null,
    }, { onConflict: 'organization_id,item_type' })
    .select()
    .single()

  if (error) {
    console.error('[upsertIntakeSubmission] Error:', error)
    return null
  }

  return data as IntakeSubmission
}

// ===================
// Discord Config Functions
// ===================

export async function getDiscordConfig(organizationId: string): Promise<DiscordConfig | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('discord_configs')
    .select('*')
    .eq('organization_id', organizationId)
    .single()

  if (error || !data) {
    return null
  }

  return data as DiscordConfig
}

export async function upsertDiscordConfig(
  organizationId: string,
  config: Partial<Omit<DiscordConfig, 'id' | 'organization_id' | 'created_at'>>
): Promise<DiscordConfig | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('discord_configs')
    .upsert({
      organization_id: organizationId,
      ...config,
    }, { onConflict: 'organization_id' })
    .select()
    .single()

  if (error) {
    console.error('[upsertDiscordConfig] Error:', error)
    return null
  }

  return data as DiscordConfig
}

// ===================
// Integration Functions
// ===================

export async function getIntegrations(organizationId: string): Promise<Integration[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('organization_id', organizationId)

  if (error) {
    console.error('[getIntegrations] Error:', error)
    return []
  }

  return (data || []) as Integration[]
}

export async function upsertIntegration(
  organizationId: string,
  type: Integration['type'],
  updates: Partial<Omit<Integration, 'id' | 'organization_id' | 'type' | 'created_at'>>
): Promise<Integration | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('integrations')
    .upsert({
      organization_id: organizationId,
      type,
      ...updates,
    }, { onConflict: 'organization_id,type' })
    .select()
    .single()

  if (error) {
    console.error('[upsertIntegration] Error:', error)
    return null
  }

  return data as Integration
}

// ===================
// Subscriber Functions
// ===================

export async function getSubscribers(organizationId: string, options?: {
  status?: Subscriber['status']
  search?: string
  limit?: number
  offset?: number
}): Promise<Subscriber[]> {
  const supabase = createServiceClient()

  let query = supabase
    .from('subscribers')
    .select('*')
    .eq('organization_id', organizationId)

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  if (options?.search) {
    query = query.or(`email.ilike.%${options.search}%,first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%`)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) {
    console.error('[getSubscribers] Error:', error)
    return []
  }

  return (data || []) as Subscriber[]
}

export async function getSubscriberById(id: string): Promise<Subscriber | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('subscribers')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return data as Subscriber
}

// ===================
// Shipment Functions
// ===================

export async function getShipments(organizationId: string, options?: {
  status?: Shipment['status']
  subscriberId?: string
  limit?: number
}): Promise<Shipment[]> {
  const supabase = createServiceClient()

  let query = supabase
    .from('shipments')
    .select('*')
    .eq('organization_id', organizationId)

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  if (options?.subscriberId) {
    query = query.eq('subscriber_id', options.subscriberId)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) {
    console.error('[getShipments] Error:', error)
    return []
  }

  return (data || []) as Shipment[]
}

export async function updateShipment(id: string, updates: Partial<Shipment>): Promise<boolean> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('shipments')
    .update(updates)
    .eq('id', id)

  if (error) {
    console.error('[updateShipment] Error:', error)
    return false
  }

  return true
}

// ===================
// Admin Functions (for admin dashboard)
// ===================

export async function getAllOrganizations(): Promise<Organization[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getAllOrganizations] Error:', error)
    return []
  }

  return (data || []) as Organization[]
}

export async function getAllIntakeSubmissions(): Promise<(IntakeSubmission & { organization_name?: string })[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('intake_submissions')
    .select(`
      *,
      organizations (name)
    `)
    .order('submitted_at', { ascending: false })

  if (error) {
    console.error('[getAllIntakeSubmissions] Error:', error)
    return []
  }

  return (data || []).map((item: any) => ({
    ...item,
    organization_name: item.organizations?.name,
  }))
}

export async function getOrganizationStats(): Promise<{
  totalOrgs: number
  liveOrgs: number
  pendingIntake: number
  totalSubscribers: number
}> {
  const supabase = createServiceClient()

  // Get org counts
  const { count: totalOrgs } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })

  const { count: liveOrgs } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Live')

  // Get pending intake count
  const { count: pendingIntake } = await supabase
    .from('intake_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Submitted')

  // Get total subscribers
  const { count: totalSubscribers } = await supabase
    .from('subscribers')
    .select('*', { count: 'exact', head: true })

  return {
    totalOrgs: totalOrgs || 0,
    liveOrgs: liveOrgs || 0,
    pendingIntake: pendingIntake || 0,
    totalSubscribers: totalSubscribers || 0,
  }
}

export async function updateIntakeSubmissionStatus(
  id: string,
  status: IntakeSubmission['status'],
  rejectionNote?: string
): Promise<boolean> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('intake_submissions')
    .update({
      status,
      rejection_note: rejectionNote || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('[updateIntakeSubmissionStatus] Error:', error)
    return false
  }

  return true
}

export async function createOrganization(data: {
  name: string
  slug: string
  status?: Organization['status']
}): Promise<Organization | null> {
  const supabase = createServiceClient()

  // Generate a unique ID for the organization
  const id = `org_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  const { data: org, error } = await supabase
    .from('organizations')
    .insert({
      id,
      name: data.name,
      slug: data.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      status: data.status || 'Discovery',
      step1_complete: false,
      step2_complete: false,
    })
    .select()
    .single()

  if (error) {
    console.error('[createOrganization] Error:', error)
    return null
  }

  return org as Organization
}

export async function deleteOrganization(id: string): Promise<boolean> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('organizations')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[deleteOrganization] Error:', error)
    return false
  }

  return true
}
