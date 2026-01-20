/**
 * Shopify API Helpers
 * 
 * Functions for interacting with Shopify's Admin API
 */

export interface ShopifyShop {
  id: number
  name: string
  email: string
  domain: string
  myshopify_domain: string
  shop_owner: string
  phone: string | null
  address1: string | null
  address2: string | null
  city: string | null
  province: string | null
  zip: string | null
  country: string
  country_code: string
  country_name: string
  currency: string
  timezone: string
  plan_name: string
  plan_display_name: string
  created_at: string
  updated_at: string
}

export interface ShopifyShopResponse {
  shop: ShopifyShop
}

/**
 * Fetch shop information from Shopify Admin API
 */
export async function getShopInfo(
  shop: string,
  accessToken: string
): Promise<ShopifyShop | null> {
  try {
    const response = await fetch(`https://${shop}/admin/api/2025-01/shop.json`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('[Shopify API] Failed to fetch shop info:', await response.text())
      return null
    }

    const data: ShopifyShopResponse = await response.json()
    return data.shop
  } catch (error) {
    console.error('[Shopify API] Error fetching shop info:', error)
    return null
  }
}

/**
 * Register a webhook with Shopify
 */
export async function registerShopifyWebhook(
  shop: string,
  accessToken: string,
  topic: string,
  address: string
): Promise<boolean> {
  try {
    const response = await fetch(`https://${shop}/admin/api/2025-01/webhooks.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webhook: {
          topic,
          address,
          format: 'json',
        },
      }),
    })

    if (response.ok) {
      return true
    }

    const errorText = await response.text()
    // Webhook might already exist, that's fine
    if (errorText.includes('already exists') || errorText.includes('already taken')) {
      return true
    }

    console.error(`[Shopify API] Failed to register webhook ${topic}:`, errorText)
    return false
  } catch (error) {
    console.error(`[Shopify API] Error registering webhook ${topic}:`, error)
    return false
  }
}

/**
 * List all webhooks for a shop
 */
export async function listShopifyWebhooks(
  shop: string,
  accessToken: string
): Promise<{ id: number; topic: string; address: string }[]> {
  try {
    const response = await fetch(`https://${shop}/admin/api/2025-01/webhooks.json`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('[Shopify API] Failed to list webhooks:', await response.text())
      return []
    }

    const data = await response.json()
    return data.webhooks || []
  } catch (error) {
    console.error('[Shopify API] Error listing webhooks:', error)
    return []
  }
}

/**
 * Delete a webhook
 */
export async function deleteShopifyWebhook(
  shop: string,
  accessToken: string,
  webhookId: number
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://${shop}/admin/api/2025-01/webhooks/${webhookId}.json`,
      {
        method: 'DELETE',
        headers: {
          'X-Shopify-Access-Token': accessToken,
        },
      }
    )

    return response.ok
  } catch (error) {
    console.error('[Shopify API] Error deleting webhook:', error)
    return false
  }
}

/**
 * Verify Shopify webhook HMAC signature
 */
export function verifyShopifyWebhookHmac(
  body: string,
  hmacHeader: string,
  secret: string
): boolean {
  const crypto = require('crypto')
  const calculated = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculated),
      Buffer.from(hmacHeader)
    )
  } catch {
    return false
  }
}

/**
 * Generate a slug from shop name
 */
export function generateSlugFromShop(shopName: string): string {
  return shopName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
}

/**
 * Standard webhook topics to register for order/customer sync
 */
export const SHOPIFY_WEBHOOK_TOPICS = [
  'orders/create',
  'orders/updated',
  'orders/fulfilled',
  'orders/cancelled',
  'customers/create',
  'customers/update',
]

/**
 * App lifecycle webhook topics
 */
export const SHOPIFY_APP_WEBHOOK_TOPICS = [
  'app/uninstalled',
]

/**
 * GDPR compliance webhook topics (mandatory for Shopify apps)
 */
export const SHOPIFY_GDPR_WEBHOOK_TOPICS = [
  'customers/data_request',
  'customers/redact',
  'shop/redact',
]
