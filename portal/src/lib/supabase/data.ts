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
  // Subscription fields
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | null
  subscription_started_at: string | null
  subscription_current_period_end: string | null
  failed_payment_count: number | null
  last_payment_failed_at: string | null
  is_test_portal: boolean | null
  // Discord prompt state
  discord_prompt_dismissed: boolean | null
  discord_prompt_remind_at: string | null
  // Shipping provider preference
  shipping_provider: 'shipstation' | 'pirateship' | 'shopify_shipping' | null
  // Timestamps
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
  type: 'shopify' | 'recharge' | 'klaviyo' | 'discord' | 'shipstation'
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
  at_risk: boolean
  tags: string[]
  discord_username: string | null
  created_at: string
  updated_at: string
}

export interface SubscriberActivity {
  id: string
  organization_id: string
  subscriber_id: string
  action: 'subscribed' | 'paused' | 'cancelled' | 'reactivated' | 'skipped' | 'address_updated' | 'status_changed'
  previous_value: string | null
  new_value: string | null
  details: Record<string, unknown>
  created_at: string
}

export interface SubscriberStats {
  total: number
  active: number
  paused: number
  cancelled: number
  atRisk: number
  newThisMonth: number
  churnedThisMonth: number
}

export interface Shipment {
  id: string
  organization_id: string
  subscriber_id: string | null
  type: 'Subscription' | 'One-Off' | null
  sequence_id: number | null
  // Updated status flow: unfulfilled -> ready_to_pack -> packed -> shipped -> delivered
  status: 'Unfulfilled' | 'Ready to Pack' | 'Packed' | 'Flagged' | 'Merged' | 'Shipped' | 'Delivered'
  flag_reason: string | null
  product_name: string | null
  variant_name: string | null  // e.g., "Small", "Medium", "Large"
  gift_note: string | null
  tracking_number: string | null
  carrier: string | null
  order_number: string | null
  shopify_order_id: string | null
  shopify_line_item_id: string | null
  shipstation_order_id: string | null
  shipstation_shipment_id: string | null
  // Batch & Release fields
  print_batch_id: string | null  // Groups orders printed together
  print_sequence: number | null  // Order within batch (1, 2, 3...) matches physical label stack
  shipping_label_url: string | null  // PDF link from ShipStation
  // Financial tracking
  financial_status: 'pending' | 'paid' | 'partially_paid' | 'refunded' | 'voided' | null
  // Weight for shipping calculations
  weight_oz: number | null
  // Error tracking for failed label purchases
  error_log: string | null
  // Merge tracking
  merged_into_id: string | null  // If merged, points to the parent shipment
  merged_shipment_ids: string[] | null  // Parent shipment stores child IDs
  // Timestamps
  packed_at: string | null
  shipped_at: string | null
  label_purchased_at: string | null
  created_at: string
  updated_at: string
}

export interface PrintBatch {
  id: string
  organization_id: string
  batch_number: number
  total_labels: number
  successful_labels: number
  failed_labels: number
  label_pdf_url: string | null
  created_at: string
  created_by: string | null
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

// Type for the database function response
interface SubscriberStatsRow {
  total: number
  active: number
  paused: number
  cancelled: number
  at_risk_count: number
  new_this_month: number
  churned_this_month: number
}

export async function getSubscriberStats(organizationId: string): Promise<SubscriberStats> {
  const supabase = createServiceClient()

  // Use the database function for efficient stats
  const { data, error } = await supabase
    .rpc('get_subscriber_stats', { org_id: organizationId })
    .single()

  if (error || !data) {
    console.error('[getSubscriberStats] Error:', error)
    // Return zeros if function fails - fallback to manual count
    const { count: total } = await supabase
      .from('subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    const { count: active } = await supabase
      .from('subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'Active')

    const { count: paused } = await supabase
      .from('subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'Paused')

    const { count: cancelled } = await supabase
      .from('subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'Cancelled')

    return {
      total: total || 0,
      active: active || 0,
      paused: paused || 0,
      cancelled: cancelled || 0,
      atRisk: 0,
      newThisMonth: 0,
      churnedThisMonth: 0,
    }
  }

  const statsRow = data as SubscriberStatsRow

  return {
    total: statsRow.total || 0,
    active: statsRow.active || 0,
    paused: statsRow.paused || 0,
    cancelled: statsRow.cancelled || 0,
    atRisk: statsRow.at_risk_count || 0,
    newThisMonth: statsRow.new_this_month || 0,
    churnedThisMonth: statsRow.churned_this_month || 0,
  }
}

export async function getSubscriberWithShipments(subscriberId: string): Promise<{
  subscriber: Subscriber
  shipments: Shipment[]
} | null> {
  const supabase = createServiceClient()

  // Get subscriber
  const { data: subscriber, error: subError } = await supabase
    .from('subscribers')
    .select('*')
    .eq('id', subscriberId)
    .single()

  if (subError || !subscriber) {
    console.error('[getSubscriberWithShipments] Subscriber not found:', subError)
    return null
  }

  // Get shipments for this subscriber
  const { data: shipments, error: shipError } = await supabase
    .from('shipments')
    .select('*')
    .eq('subscriber_id', subscriberId)
    .order('created_at', { ascending: false })

  if (shipError) {
    console.error('[getSubscriberWithShipments] Shipments error:', shipError)
  }

  return {
    subscriber: subscriber as Subscriber,
    shipments: (shipments || []) as Shipment[],
  }
}

export async function updateSubscriber(
  subscriberId: string,
  updates: Partial<Subscriber>
): Promise<Subscriber | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('subscribers')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriberId)
    .select()
    .single()

  if (error) {
    console.error('[updateSubscriber] Error:', error)
    return null
  }

  return data as Subscriber
}

export async function getSubscriberActivity(
  organizationId: string,
  options?: { limit?: number; subscriberId?: string }
): Promise<(SubscriberActivity & { subscriber_name?: string; subscriber_email?: string })[]> {
  const supabase = createServiceClient()

  let query = supabase
    .from('subscriber_activity')
    .select(`
      *,
      subscribers (first_name, last_name, email)
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (options?.subscriberId) {
    query = query.eq('subscriber_id', options.subscriberId)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getSubscriberActivity] Error:', error)
    return []
  }

  return (data || []).map((item: any) => ({
    ...item,
    subscriber_name: item.subscribers 
      ? `${item.subscribers.first_name || ''} ${item.subscribers.last_name || ''}`.trim()
      : undefined,
    subscriber_email: item.subscribers?.email,
  }))
}

export async function logSubscriberActivity(
  organizationId: string,
  subscriberId: string,
  action: SubscriberActivity['action'],
  options?: { previousValue?: string; newValue?: string; details?: Record<string, unknown> }
): Promise<boolean> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('subscriber_activity')
    .insert({
      organization_id: organizationId,
      subscriber_id: subscriberId,
      action,
      previous_value: options?.previousValue || null,
      new_value: options?.newValue || null,
      details: options?.details || {},
    })

  if (error) {
    console.error('[logSubscriberActivity] Error:', error)
    return false
  }

  return true
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
  is_test_portal?: boolean
  stripe_customer_id?: string
  stripe_subscription_id?: string
  subscription_status?: Organization['subscription_status']
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
      is_test_portal: data.is_test_portal || false,
      stripe_customer_id: data.stripe_customer_id || null,
      stripe_subscription_id: data.stripe_subscription_id || null,
      subscription_status: data.is_test_portal ? 'active' : (data.subscription_status || 'none'),
    })
    .select()
    .single()

  if (error) {
    console.error('[createOrganization] Error:', error)
    // Throw error with message so caller can surface it
    if (error.code === '23505') {
      throw new Error('An organization with this slug already exists')
    }
    throw new Error(error.message || 'Failed to create organization')
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

// ===================
// Pending Checkout Functions
// ===================

export interface PendingCheckout {
  id: string
  stripe_checkout_session_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  customer_email: string
  customer_name: string | null
  company_name: string
  organization_slug: string
  status: 'pending' | 'completed' | 'expired' | 'failed'
  clerk_organization_id: string | null
  clerk_invitation_id: string | null
  invitation_sent_at: string | null
  invitation_accepted_at: string | null
  organization_id: string | null
  created_at: string
  expires_at: string
  completed_at: string | null
}

export async function createPendingCheckout(data: {
  stripe_checkout_session_id: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  customer_email: string
  customer_name?: string
  company_name: string
  organization_slug: string
}): Promise<PendingCheckout | null> {
  const supabase = createServiceClient()

  const { data: checkout, error } = await supabase
    .from('pending_checkouts')
    .insert({
      stripe_checkout_session_id: data.stripe_checkout_session_id,
      stripe_customer_id: data.stripe_customer_id || null,
      stripe_subscription_id: data.stripe_subscription_id || null,
      customer_email: data.customer_email,
      customer_name: data.customer_name || null,
      company_name: data.company_name,
      organization_slug: data.organization_slug,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('[createPendingCheckout] Error:', error)
    return null
  }

  return checkout as PendingCheckout
}

export async function getPendingCheckoutBySessionId(sessionId: string): Promise<PendingCheckout | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('pending_checkouts')
    .select('*')
    .eq('stripe_checkout_session_id', sessionId)
    .single()

  if (error || !data) {
    return null
  }

  return data as PendingCheckout
}

export async function updatePendingCheckout(
  sessionId: string,
  updates: Partial<Omit<PendingCheckout, 'id' | 'stripe_checkout_session_id' | 'created_at'>>
): Promise<boolean> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('pending_checkouts')
    .update(updates)
    .eq('stripe_checkout_session_id', sessionId)

  if (error) {
    console.error('[updatePendingCheckout] Error:', error)
    return false
  }

  return true
}

export async function getOrganizationByStripeCustomerId(customerId: string): Promise<Organization | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .single()

  if (error || !data) {
    return null
  }

  return data as Organization
}

export async function getOrganizationByStripeSubscriptionId(subscriptionId: string): Promise<Organization | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (error || !data) {
    return null
  }

  return data as Organization
}

// ===================
// Subscription Event Logging
// ===================

export async function logSubscriptionEvent(data: {
  organization_id?: string
  stripe_event_id: string
  event_type: string
  event_data: Record<string, unknown>
}): Promise<boolean> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('subscription_events')
    .insert({
      organization_id: data.organization_id || null,
      stripe_event_id: data.stripe_event_id,
      event_type: data.event_type,
      event_data: data.event_data,
    })

  if (error) {
    // Duplicate event is OK (idempotency)
    if (error.code === '23505') {
      console.log('[logSubscriptionEvent] Duplicate event, skipping:', data.stripe_event_id)
      return true
    }
    console.error('[logSubscriptionEvent] Error:', error)
    return false
  }

  return true
}

export async function isEventProcessed(stripeEventId: string): Promise<boolean> {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('subscription_events')
    .select('id')
    .eq('stripe_event_id', stripeEventId)
    .single()

  return !!data
}
