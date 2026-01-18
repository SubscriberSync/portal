// Recharge API client for fetching upcoming charges

interface RechargeCredentials {
  apiKey: string
}

interface RechargeCharge {
  id: number
  customer_id: number
  scheduled_at: string
  status: 'QUEUED' | 'SKIPPED' | 'ERROR' | 'REFUNDED' | 'SUCCESS'
  total_price: string
  line_items: {
    subscription_id: number
    title: string
    quantity: number
    variant_title?: string
  }[]
  shipping_address: {
    first_name: string
    last_name: string
    email?: string
  }
}

interface RechargeCustomer {
  id: number
  email: string
  first_name: string
  last_name: string
}

const RECHARGE_API_URL = 'https://api.rechargeapps.com'

async function rechargeRequest<T>(
  credentials: RechargeCredentials,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${RECHARGE_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'X-Recharge-Access-Token': credentials.apiKey,
      'X-Recharge-Version': '2021-11',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Recharge API error: ${response.status} - ${error}`)
  }

  return response.json()
}

// Get upcoming charges within the next N days
export async function getUpcomingCharges(
  credentials: RechargeCredentials,
  daysAhead: number = 7
): Promise<RechargeCharge[]> {
  const today = new Date()
  const futureDate = new Date(today)
  futureDate.setDate(futureDate.getDate() + daysAhead)

  const params = new URLSearchParams({
    status: 'QUEUED',
    scheduled_at_min: today.toISOString().split('T')[0],
    scheduled_at_max: futureDate.toISOString().split('T')[0],
    limit: '250',
  })

  const response = await rechargeRequest<{ charges: RechargeCharge[] }>(
    credentials,
    `/charges?${params}`
  )

  return response.charges || []
}

// Get upcoming charges for a specific customer
export async function getCustomerUpcomingCharges(
  credentials: RechargeCredentials,
  customerId: string,
  daysAhead: number = 7
): Promise<RechargeCharge[]> {
  const today = new Date()
  const futureDate = new Date(today)
  futureDate.setDate(futureDate.getDate() + daysAhead)

  const params = new URLSearchParams({
    customer_id: customerId,
    status: 'QUEUED',
    scheduled_at_min: today.toISOString().split('T')[0],
    scheduled_at_max: futureDate.toISOString().split('T')[0],
  })

  const response = await rechargeRequest<{ charges: RechargeCharge[] }>(
    credentials,
    `/charges?${params}`
  )

  return response.charges || []
}

// Get customer by email
export async function getCustomerByEmail(
  credentials: RechargeCredentials,
  email: string
): Promise<RechargeCustomer | null> {
  const params = new URLSearchParams({
    email: email,
  })

  const response = await rechargeRequest<{ customers: RechargeCustomer[] }>(
    credentials,
    `/customers?${params}`
  )

  return response.customers?.[0] || null
}

// Verify API key works
export async function verifyRechargeCredentials(credentials: RechargeCredentials): Promise<boolean> {
  try {
    await rechargeRequest(credentials, '/shop')
    return true
  } catch {
    return false
  }
}

export type { RechargeCredentials, RechargeCharge, RechargeCustomer }
