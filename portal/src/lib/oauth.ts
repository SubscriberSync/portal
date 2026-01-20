// OAuth configuration for Shopify and Klaviyo
// Also includes Clerk Backend API helpers for organization management

import { ShopifyShop } from './shopify'

export const OAUTH_CONFIG = {
  shopify: {
    clientId: process.env.SHOPIFY_CLIENT_ID!,
    clientSecret: process.env.SHOPIFY_CLIENT_SECRET!,
    scopes: 'read_customers,write_customers,read_inventory,read_orders,write_orders,read_product_listings,read_products',
    callbackPath: '/api/auth/shopify/callback',
  },
  klaviyo: {
    clientId: process.env.KLAVIYO_CLIENT_ID!,
    clientSecret: process.env.KLAVIYO_CLIENT_SECRET!,
    // Scopes for Klaviyo OAuth - space separated
    scopes: 'accounts:read lists:read lists:write profiles:read profiles:write segments:read segments:write tags:read tags:write',
    authUrl: 'https://www.klaviyo.com/oauth/authorize',
    tokenUrl: 'https://a.klaviyo.com/oauth/token',
    callbackPath: '/api/auth/klaviyo/callback',
  },
}

// Generate a random state for CSRF protection
export function generateState(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// Generate PKCE code verifier (required for Klaviyo)
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

// Generate PKCE code challenge from verifier
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(hash))
}

function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode.apply(null, Array.from(buffer)))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Build Shopify OAuth URL
export function buildShopifyAuthUrl(shop: string, state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: OAUTH_CONFIG.shopify.clientId,
    scope: OAUTH_CONFIG.shopify.scopes,
    redirect_uri: redirectUri,
    state: state,
  })

  return `https://${shop}/admin/oauth/authorize?${params.toString()}`
}

// Build Klaviyo OAuth URL
export function buildKlaviyoAuthUrl(
  state: string,
  codeChallenge: string,
  redirectUri: string
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: OAUTH_CONFIG.klaviyo.clientId,
    redirect_uri: redirectUri,
    scope: OAUTH_CONFIG.klaviyo.scopes,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  return `${OAUTH_CONFIG.klaviyo.authUrl}?${params.toString()}`
}

// Exchange Shopify code for access token
export async function exchangeShopifyCode(
  shop: string,
  code: string
): Promise<{ access_token: string; scope: string } | null> {
  try {
    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: OAUTH_CONFIG.shopify.clientId,
        client_secret: OAUTH_CONFIG.shopify.clientSecret,
        code: code,
      }),
    })

    if (!response.ok) {
      console.error('[Shopify OAuth] Token exchange failed:', await response.text())
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('[Shopify OAuth] Error:', error)
    return null
  }
}

// Exchange Klaviyo code for access token
export async function exchangeKlaviyoCode(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  try {
    // Klaviyo requires Basic auth header with base64 encoded client_id:client_secret
    const credentials = Buffer.from(
      `${OAUTH_CONFIG.klaviyo.clientId}:${OAUTH_CONFIG.klaviyo.clientSecret}`
    ).toString('base64')

    const response = await fetch(OAUTH_CONFIG.klaviyo.tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      }).toString(),
    })

    if (!response.ok) {
      console.error('[Klaviyo OAuth] Token exchange failed:', await response.text())
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('[Klaviyo OAuth] Error:', error)
    return null
  }
}

// Refresh Klaviyo access token
export async function refreshKlaviyoToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  try {
    // Klaviyo requires Basic auth header with base64 encoded client_id:client_secret
    const credentials = Buffer.from(
      `${OAUTH_CONFIG.klaviyo.clientId}:${OAUTH_CONFIG.klaviyo.clientSecret}`
    ).toString('base64')

    const response = await fetch(OAUTH_CONFIG.klaviyo.tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    })

    if (!response.ok) {
      console.error('[Klaviyo OAuth] Token refresh failed:', await response.text())
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('[Klaviyo OAuth] Error:', error)
    return null
  }
}

// ============================================================================
// Clerk Backend API Helpers
// ============================================================================

const CLERK_API_URL = 'https://api.clerk.com/v1'

interface ClerkOrganization {
  id: string
  name: string
  slug: string
  created_at: number
  updated_at: number
  public_metadata: Record<string, unknown>
  private_metadata: Record<string, unknown>
}

interface ClerkInvitation {
  id: string
  email_address: string
  organization_id: string
  status: string
  created_at: number
  updated_at: number
}

interface ClerkUser {
  id: string
  email_addresses: { email_address: string; id: string }[]
  first_name: string | null
  last_name: string | null
}

/**
 * Create a Clerk organization from Shopify shop info
 */
export async function createClerkOrganization(
  shopInfo: ShopifyShop
): Promise<ClerkOrganization | null> {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY
  if (!clerkSecretKey) {
    console.error('[Clerk API] Missing CLERK_SECRET_KEY')
    return null
  }

  // Generate a unique slug from the shop name
  const baseSlug = shopInfo.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40)

  // Add random suffix to ensure uniqueness
  const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`

  try {
    const response = await fetch(`${CLERK_API_URL}/organizations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: shopInfo.name,
        slug: uniqueSlug,
        public_metadata: {
          shopify_shop_domain: shopInfo.myshopify_domain,
          shopify_shop_id: shopInfo.id,
        },
        private_metadata: {
          shop_email: shopInfo.email,
          shop_owner: shopInfo.shop_owner,
          created_from: 'shopify_app_store',
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[Clerk API] Failed to create organization:', error)
      return null
    }

    const org: ClerkOrganization = await response.json()
    console.log('[Clerk API] Created organization:', org.id, org.slug)
    return org
  } catch (error) {
    console.error('[Clerk API] Error creating organization:', error)
    return null
  }
}

/**
 * Find existing Clerk user by email
 */
export async function findClerkUserByEmail(
  email: string
): Promise<ClerkUser | null> {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY
  if (!clerkSecretKey) {
    console.error('[Clerk API] Missing CLERK_SECRET_KEY')
    return null
  }

  try {
    const params = new URLSearchParams({
      email_address: email,
    })

    const response = await fetch(`${CLERK_API_URL}/users?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
      },
    })

    if (!response.ok) {
      console.error('[Clerk API] Failed to find user:', await response.text())
      return null
    }

    const users: ClerkUser[] = await response.json()
    return users.length > 0 ? users[0] : null
  } catch (error) {
    console.error('[Clerk API] Error finding user:', error)
    return null
  }
}

/**
 * Add existing user to organization as admin
 */
export async function addUserToOrganization(
  organizationId: string,
  userId: string,
  role: 'admin' | 'member' = 'admin'
): Promise<boolean> {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY
  if (!clerkSecretKey) {
    console.error('[Clerk API] Missing CLERK_SECRET_KEY')
    return false
  }

  try {
    const response = await fetch(
      `${CLERK_API_URL}/organizations/${organizationId}/memberships`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clerkSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          role: `org:${role}`,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      // If user is already a member, that's okay
      if (error.includes('already a member')) {
        return true
      }
      console.error('[Clerk API] Failed to add user to org:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[Clerk API] Error adding user to org:', error)
    return false
  }
}

/**
 * Create an invitation to join an organization
 * Returns the invitation with a ticket that can be used for redirect
 */
export async function createClerkInvitation(
  organizationId: string,
  email: string,
  role: 'admin' | 'member' = 'admin'
): Promise<{ invitation: ClerkInvitation; ticket: string } | null> {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY
  if (!clerkSecretKey) {
    console.error('[Clerk API] Missing CLERK_SECRET_KEY')
    return null
  }

  try {
    const response = await fetch(
      `${CLERK_API_URL}/organizations/${organizationId}/invitations`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clerkSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_address: email,
          role: `org:${role}`,
          redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/sign-up`,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('[Clerk API] Failed to create invitation:', error)
      return null
    }

    const invitation: ClerkInvitation & { ticket?: string } = await response.json()
    
    // The ticket is used to auto-accept the invitation during signup
    // It may be in the response or we need to construct the signup URL
    const ticket = invitation.ticket || invitation.id

    console.log('[Clerk API] Created invitation for:', email)
    return { invitation, ticket }
  } catch (error) {
    console.error('[Clerk API] Error creating invitation:', error)
    return null
  }
}

/**
 * Get organization by ID
 */
export async function getClerkOrganization(
  organizationId: string
): Promise<ClerkOrganization | null> {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY
  if (!clerkSecretKey) {
    console.error('[Clerk API] Missing CLERK_SECRET_KEY')
    return null
  }

  try {
    const response = await fetch(
      `${CLERK_API_URL}/organizations/${organizationId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${clerkSecretKey}`,
        },
      }
    )

    if (!response.ok) {
      console.error('[Clerk API] Failed to get organization:', await response.text())
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('[Clerk API] Error getting organization:', error)
    return null
  }
}
