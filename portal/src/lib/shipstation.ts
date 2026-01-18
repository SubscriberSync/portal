// ShipStation API client
// Uses V1 API with Basic Auth (API Key : API Secret)

interface ShipStationCredentials {
  apiKey: string
  apiSecret: string
}

interface ShipStationOrder {
  orderId: number
  orderNumber: string
  orderKey: string
  orderDate: string
  createDate: string
  modifyDate: string
  paymentDate: string
  shipByDate: string
  orderStatus: 'awaiting_payment' | 'awaiting_shipment' | 'shipped' | 'on_hold' | 'cancelled'
  customerId: number
  customerUsername: string
  customerEmail: string
  billTo: ShipStationAddress
  shipTo: ShipStationAddress
  items: ShipStationOrderItem[]
  orderTotal: number
  amountPaid: number
  taxAmount: number
  shippingAmount: number
  customerNotes: string
  internalNotes: string
  gift: boolean
  giftMessage: string
  requestedShippingService: string
  carrierCode: string
  serviceCode: string
  packageCode: string
  confirmation: string
  shipDate: string
  holdUntilDate: string
  weight: { value: number; units: string }
  dimensions: { length: number; width: number; height: number; units: string }
  advancedOptions: {
    warehouseId: number
    nonMachinable: boolean
    saturdayDelivery: boolean
    containsAlcohol: boolean
    storeId: number
    customField1: string
    customField2: string
    customField3: string
    source: string
  }
  tagIds: number[]
}

interface ShipStationAddress {
  name: string
  company: string
  street1: string
  street2: string
  street3: string
  city: string
  state: string
  postalCode: string
  country: string
  phone: string
  residential: boolean
}

interface ShipStationOrderItem {
  orderItemId: number
  lineItemKey: string
  sku: string
  name: string
  imageUrl: string
  weight: { value: number; units: string }
  quantity: number
  unitPrice: number
  taxAmount: number
  shippingAmount: number
  warehouseLocation: string
  options: { name: string; value: string }[]
  productId: number
  fulfillmentSku: string
  adjustment: boolean
  upc: string
}

interface ShipStationShipment {
  shipmentId: number
  orderId: number
  orderKey: string
  userId: string
  orderNumber: string
  createDate: string
  shipDate: string
  shipmentCost: number
  insuranceCost: number
  trackingNumber: string
  isReturnLabel: boolean
  batchNumber: string
  carrierCode: string
  serviceCode: string
  packageCode: string
  confirmation: string
  warehouseId: number
  voided: boolean
  voidDate: string
  marketplaceNotified: boolean
  notifyErrorMessage: string
  shipTo: ShipStationAddress
  weight: { value: number; units: string }
  dimensions: { length: number; width: number; height: number; units: string }
  insuranceOptions: { provider: string; insureShipment: boolean; insuredValue: number }
  advancedOptions: { billToParty: string; billToAccount: string; billToPostalCode: string; billToCountryCode: string }
  shipmentItems: ShipStationOrderItem[]
  labelData: string
  formData: string
}

interface ShipStationWebhook {
  WebHookID: number
  Active: boolean
  HookType: string
  MessageFormat: string
  TargetUrl: string
  StoreId: number | null
  Name: string
}

const SHIPSTATION_API_URL = 'https://ssapi.shipstation.com'

// Create authorization header from credentials
function createAuthHeader(credentials: ShipStationCredentials): string {
  const encoded = Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString('base64')
  return `Basic ${encoded}`
}

// Generic API request helper
async function shipStationRequest<T>(
  credentials: ShipStationCredentials,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${SHIPSTATION_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': createAuthHeader(credentials),
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ShipStation API error: ${response.status} - ${error}`)
  }

  return response.json()
}

// Verify API credentials work
export async function verifyShipStationCredentials(credentials: ShipStationCredentials): Promise<boolean> {
  try {
    // Try to list stores - this verifies the credentials work
    await shipStationRequest(credentials, '/stores')
    return true
  } catch {
    return false
  }
}

// List all webhooks
export async function listWebhooks(credentials: ShipStationCredentials): Promise<{ webhooks: ShipStationWebhook[] }> {
  return shipStationRequest(credentials, '/webhooks')
}

// Subscribe to a webhook
export async function subscribeWebhook(
  credentials: ShipStationCredentials,
  targetUrl: string,
  event: 'ORDER_NOTIFY' | 'ITEM_ORDER_NOTIFY' | 'SHIP_NOTIFY' | 'ITEM_SHIP_NOTIFY',
  friendlyName?: string,
  storeId?: number
): Promise<{ id: number }> {
  return shipStationRequest(credentials, '/webhooks/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      target_url: targetUrl,
      event: event,
      store_id: storeId || null,
      friendly_name: friendlyName || `Backstage ${event}`,
    }),
  })
}

// Unsubscribe from a webhook
export async function unsubscribeWebhook(
  credentials: ShipStationCredentials,
  webhookId: number
): Promise<void> {
  await shipStationRequest(credentials, `/webhooks/${webhookId}`, {
    method: 'DELETE',
  })
}

// Get orders with optional filters
export async function getOrders(
  credentials: ShipStationCredentials,
  params?: {
    orderStatus?: string
    orderNumber?: string
    orderDateStart?: string
    orderDateEnd?: string
    modifyDateStart?: string
    modifyDateEnd?: string
    storeId?: number
    page?: number
    pageSize?: number
  }
): Promise<{ orders: ShipStationOrder[]; total: number; page: number; pages: number }> {
  const searchParams = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, String(value))
      }
    })
  }
  const queryString = searchParams.toString()
  return shipStationRequest(credentials, `/orders${queryString ? `?${queryString}` : ''}`)
}

// Get a single order by ID
export async function getOrder(
  credentials: ShipStationCredentials,
  orderId: number
): Promise<ShipStationOrder> {
  return shipStationRequest(credentials, `/orders/${orderId}`)
}

// Get shipments with optional filters
export async function getShipments(
  credentials: ShipStationCredentials,
  params?: {
    recipientName?: string
    recipientCountryCode?: string
    orderNumber?: string
    orderId?: number
    carrierCode?: string
    serviceCode?: string
    trackingNumber?: string
    createDateStart?: string
    createDateEnd?: string
    shipDateStart?: string
    shipDateEnd?: string
    voidedYN?: string
    storeId?: number
    includeShipmentItems?: boolean
    page?: number
    pageSize?: number
  }
): Promise<{ shipments: ShipStationShipment[]; total: number; page: number; pages: number }> {
  const searchParams = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, String(value))
      }
    })
  }
  const queryString = searchParams.toString()
  return shipStationRequest(credentials, `/shipments${queryString ? `?${queryString}` : ''}`)
}

// Create or update an order
export async function createOrUpdateOrder(
  credentials: ShipStationCredentials,
  order: Partial<ShipStationOrder>
): Promise<ShipStationOrder> {
  return shipStationRequest(credentials, '/orders/createorder', {
    method: 'POST',
    body: JSON.stringify(order),
  })
}

// Mark an order as shipped
export async function markOrderShipped(
  credentials: ShipStationCredentials,
  params: {
    orderId: number
    carrierCode: string
    shipDate?: string
    trackingNumber?: string
    notifyCustomer?: boolean
    notifySalesChannel?: boolean
  }
): Promise<{ orderId: number; orderNumber: string }> {
  return shipStationRequest(credentials, '/orders/markasshipped', {
    method: 'POST',
    body: JSON.stringify({
      orderId: params.orderId,
      carrierCode: params.carrierCode,
      shipDate: params.shipDate || new Date().toISOString().split('T')[0],
      trackingNumber: params.trackingNumber,
      notifyCustomer: params.notifyCustomer ?? true,
      notifySalesChannel: params.notifySalesChannel ?? true,
    }),
  })
}

// Get stores (marketplaces/channels)
export async function getStores(
  credentials: ShipStationCredentials
): Promise<{ name: string; storeId: number; marketplaceName: string; active: boolean }[]> {
  return shipStationRequest(credentials, '/stores')
}

// Get carriers
export async function getCarriers(
  credentials: ShipStationCredentials
): Promise<{ name: string; code: string; accountNumber: string; requiresFundedAccount: boolean; balance: number }[]> {
  return shipStationRequest(credentials, '/carriers')
}

// Export types for use in other files
export type {
  ShipStationCredentials,
  ShipStationOrder,
  ShipStationOrderItem,
  ShipStationShipment,
  ShipStationAddress,
  ShipStationWebhook,
}
