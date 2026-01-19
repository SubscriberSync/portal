// ShipStation API client
// Supports both V1 API (Basic Auth) and V2 API (API Key header)

interface ShipStationCredentials {
  apiKey: string
  apiSecret: string
}

// =============================================
// V2 API Types (for rates and labels)
// =============================================

interface V2Address {
  name: string
  company_name?: string
  phone?: string
  address_line1: string
  address_line2?: string
  address_line3?: string
  city_locality: string
  state_province: string
  postal_code: string
  country_code: string
  address_residential_indicator?: 'yes' | 'no' | 'unknown'
}

interface V2Weight {
  value: number
  unit: 'ounce' | 'pound' | 'gram' | 'kilogram'
}

interface V2Dimensions {
  length: number
  width: number
  height: number
  unit: 'inch' | 'centimeter'
}

interface V2Package {
  weight: V2Weight
  dimensions?: V2Dimensions
}

interface V2RateRequest {
  shipment: {
    ship_from: V2Address
    ship_to: V2Address
    packages: V2Package[]
  }
  rate_options?: {
    carrier_ids?: string[]
    service_codes?: string[]
  }
}

export interface V2Rate {
  rate_id: string
  rate_type: string
  carrier_id: string
  carrier_code: string
  carrier_nickname: string
  carrier_friendly_name: string
  service_type: string
  service_code: string
  package_type: string
  ship_date: string
  guaranteed_service: boolean
  estimated_delivery_date?: string
  delivery_days?: number
  carrier_delivery_days?: string
  trackable: boolean
  negotiated_rate: boolean
  shipping_amount: { currency: string; amount: number }
  insurance_amount: { currency: string; amount: number }
  confirmation_amount: { currency: string; amount: number }
  other_amount: { currency: string; amount: number }
  tax_amount?: { currency: string; amount: number }
  zone?: number
  validation_status: string
  warning_messages?: string[]
  error_messages?: string[]
}

interface V2RatesResponse {
  rates: V2Rate[]
  invalid_rates?: V2Rate[]
  rate_request_id: string
  shipment_id: string
  created_at: string
  status: string
  errors?: { message: string }[]
}

interface V2LabelRequest {
  shipment: {
    carrier_id: string
    service_code: string
    ship_date?: string
    ship_from: V2Address
    ship_to: V2Address
    packages: V2Package[]
    confirmation?: 'none' | 'delivery' | 'signature' | 'adult_signature' | 'direct_signature'
    external_shipment_id?: string
  }
  label_format?: 'pdf' | 'png' | 'zpl'
  label_layout?: '4x6' | 'letter'
  test_label?: boolean
}

export interface V2Label {
  label_id: string
  status: string
  shipment_id: string
  ship_date: string
  created_at: string
  shipment_cost: { currency: string; amount: number }
  insurance_cost: { currency: string; amount: number }
  tracking_number: string
  is_return_label: boolean
  carrier_id: string
  service_code: string
  package_code: string
  voided: boolean
  label_format: string
  label_layout: string
  trackable: boolean
  carrier_code: string
  tracking_status: string
  label_download: {
    pdf?: string
    png?: string
    zpl?: string
    href: string
  }
}

interface V2LabelFromRateRequest {
  label_format?: 'pdf' | 'png' | 'zpl'
  label_layout?: '4x6' | 'letter'
  test_label?: boolean
}

export interface V2Carrier {
  carrier_id: string
  carrier_code: string
  account_number: string
  requires_funded_amount: boolean
  balance: number
  nickname: string
  friendly_name: string
  primary: boolean
  has_multi_package_supporting_services: boolean
  supports_label_messages: boolean
  services: V2CarrierService[]
  packages: V2CarrierPackage[]
  options: V2CarrierOption[]
}

export interface V2CarrierService {
  carrier_id: string
  carrier_code: string
  service_code: string
  name: string
  domestic: boolean
  international: boolean
  is_multi_package_supported: boolean
}

interface V2CarrierPackage {
  package_id?: string
  package_code: string
  name: string
  description?: string
}

interface V2CarrierOption {
  name: string
  default_value: string
  description: string
}

export interface V2Warehouse {
  warehouse_id: string
  name: string
  created_at: string
  origin_address: V2Address
  return_address?: V2Address
  is_default: boolean
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
const SHIPSTATION_V2_API_URL = 'https://api.shipstation.com'

// Create authorization header from credentials (V1 - Basic Auth)
function createAuthHeader(credentials: ShipStationCredentials): string {
  const encoded = Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString('base64')
  return `Basic ${encoded}`
}

// Generic V1 API request helper
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

// Generic V2 API request helper (uses API-Key header)
async function shipStationV2Request<T>(
  apiKey: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${SHIPSTATION_V2_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'API-Key': apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `ShipStation V2 API error: ${response.status}`
    try {
      const errorJson = JSON.parse(errorText)
      if (errorJson.errors?.length > 0) {
        errorMessage = errorJson.errors.map((e: { message: string }) => e.message).join(', ')
      } else if (errorJson.message) {
        errorMessage = errorJson.message
      }
    } catch {
      errorMessage += ` - ${errorText}`
    }
    throw new Error(errorMessage)
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
      friendly_name: friendlyName || `SubscriberSync ${event}`,
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

// Get carriers (V1)
export async function getCarriers(
  credentials: ShipStationCredentials
): Promise<{ name: string; code: string; accountNumber: string; requiresFundedAccount: boolean; balance: number }[]> {
  return shipStationRequest(credentials, '/carriers')
}

// =============================================
// V2 API Functions (for rates and labels)
// =============================================

// Get carriers with services (V2)
export async function getCarriersV2(apiKey: string): Promise<V2Carrier[]> {
  return shipStationV2Request(apiKey, '/v2/carriers')
}

// Get single carrier details (V2)
export async function getCarrierV2(apiKey: string, carrierId: string): Promise<V2Carrier> {
  return shipStationV2Request(apiKey, `/v2/carriers/${carrierId}`)
}

// Get carrier services (V2)
export async function getCarrierServicesV2(apiKey: string, carrierId: string): Promise<V2CarrierService[]> {
  return shipStationV2Request(apiKey, `/v2/carriers/${carrierId}/services`)
}

// Get carrier packages (V2)
export async function getCarrierPackagesV2(apiKey: string, carrierId: string): Promise<V2CarrierPackage[]> {
  return shipStationV2Request(apiKey, `/v2/carriers/${carrierId}/packages`)
}

// Get warehouses (V2)
export async function getWarehousesV2(apiKey: string): Promise<V2Warehouse[]> {
  return shipStationV2Request(apiKey, '/v2/warehouses')
}

// Get rates for a shipment (V2)
export async function getRatesV2(
  apiKey: string,
  request: V2RateRequest
): Promise<V2RatesResponse> {
  return shipStationV2Request(apiKey, '/v2/rates', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

// Estimate rates (simpler rate estimation) (V2)
export async function estimateRatesV2(
  apiKey: string,
  request: {
    from_country_code: string
    from_postal_code: string
    to_country_code: string
    to_postal_code: string
    weight: V2Weight
    dimensions?: V2Dimensions
    confirmation?: 'none' | 'delivery' | 'signature' | 'adult_signature' | 'direct_signature'
    address_residential_indicator?: 'yes' | 'no' | 'unknown'
  }
): Promise<V2Rate[]> {
  return shipStationV2Request(apiKey, '/v2/rates/estimate', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

// Create a label directly (V2)
export async function createLabelV2(
  apiKey: string,
  request: V2LabelRequest
): Promise<V2Label> {
  return shipStationV2Request(apiKey, '/v2/labels', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

// Create a label from a rate ID (V2)
export async function createLabelFromRateV2(
  apiKey: string,
  rateId: string,
  options?: V2LabelFromRateRequest
): Promise<V2Label> {
  return shipStationV2Request(apiKey, `/v2/labels/rates/${rateId}`, {
    method: 'POST',
    body: JSON.stringify(options || {}),
  })
}

// Get label details (V2)
export async function getLabelV2(apiKey: string, labelId: string): Promise<V2Label> {
  return shipStationV2Request(apiKey, `/v2/labels/${labelId}`)
}

// Void a label (V2)
export async function voidLabelV2(
  apiKey: string,
  labelId: string
): Promise<{ approved: boolean; message: string }> {
  return shipStationV2Request(apiKey, `/v2/labels/${labelId}/void`, {
    method: 'PUT',
  })
}

// Get tracking info for a label (V2)
export async function getLabelTrackingV2(
  apiKey: string,
  labelId: string
): Promise<{
  tracking_number: string
  status_code: string
  status_description: string
  carrier_status_code: string
  carrier_status_description: string
  estimated_delivery_date?: string
  actual_delivery_date?: string
  events: {
    occurred_at: string
    description: string
    city_locality?: string
    state_province?: string
    postal_code?: string
    country_code?: string
  }[]
}> {
  return shipStationV2Request(apiKey, `/v2/labels/${labelId}/track`)
}

// Helper to convert our address format to V2 format
export function toV2Address(
  name: string,
  address: {
    company?: string | null
    address1: string
    address2?: string | null
    city: string
    state: string
    zip: string
    country?: string
    phone?: string | null
  }
): V2Address {
  return {
    name,
    company_name: address.company || undefined,
    phone: address.phone || undefined,
    address_line1: address.address1,
    address_line2: address.address2 || undefined,
    city_locality: address.city,
    state_province: address.state,
    postal_code: address.zip,
    country_code: address.country || 'US',
    address_residential_indicator: 'unknown',
  }
}

// Export types for use in other files
export type {
  ShipStationCredentials,
  ShipStationOrder,
  ShipStationOrderItem,
  ShipStationShipment,
  ShipStationAddress,
  ShipStationWebhook,
  V2Address,
  V2Weight,
  V2Dimensions,
  V2Package,
  V2RateRequest,
  V2LabelRequest,
}
