// OAuth configuration for Shopify and Klaviyo

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
    const response = await fetch(OAUTH_CONFIG.klaviyo.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
        client_id: OAUTH_CONFIG.klaviyo.clientId,
        client_secret: OAUTH_CONFIG.klaviyo.clientSecret,
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
    const response = await fetch(OAUTH_CONFIG.klaviyo.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: OAUTH_CONFIG.klaviyo.clientId,
        client_secret: OAUTH_CONFIG.klaviyo.clientSecret,
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
