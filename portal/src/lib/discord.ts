// Discord API integration for MemberLink
// Handles OAuth flows and Discord REST API calls

// =============================================
// Configuration
// =============================================

export const DISCORD_CONFIG = {
  clientId: process.env.DISCORD_CLIENT_ID!,
  clientSecret: process.env.DISCORD_CLIENT_SECRET!,
  botToken: process.env.DISCORD_BOT_TOKEN!,
  // Redirect URIs
  botRedirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/discord/callback`,
  customerRedirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/discord/callback`,
  // API endpoints
  apiBase: 'https://discord.com/api/v10',
  authUrl: 'https://discord.com/api/oauth2/authorize',
  tokenUrl: 'https://discord.com/api/oauth2/token',
}

// Bot permissions needed:
// - MANAGE_ROLES: Assign/remove roles from members
// - KICK_MEMBERS: Kick members (if client enables kick on cancel)
// - CREATE_INSTANT_INVITE: Required for adding members via OAuth
const BOT_PERMISSIONS = '268435458' // MANAGE_ROLES | KICK_MEMBERS | CREATE_INSTANT_INVITE

// =============================================
// Types
// =============================================

export interface DiscordTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
  guild?: DiscordGuild // Only present in bot auth flow
}

export interface DiscordGuild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string
}

export interface DiscordUser {
  id: string
  username: string
  discriminator: string
  global_name: string | null
  avatar: string | null
  email?: string
}

export interface DiscordRole {
  id: string
  name: string
  color: number
  position: number
  permissions: string
  managed: boolean // True for bot/integration roles
  mentionable: boolean
}

export interface DiscordMember {
  user?: DiscordUser
  nick: string | null
  avatar: string | null
  roles: string[]
  joined_at: string
  deaf: boolean
  mute: boolean
}

export interface DiscordError {
  code: number
  message: string
}

// =============================================
// OAuth URL Builders
// =============================================

/**
 * Build OAuth URL for bot authorization (client setup flow)
 * This adds the bot to the client's Discord server
 */
export function buildBotAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: DISCORD_CONFIG.clientId,
    redirect_uri: DISCORD_CONFIG.botRedirectUri,
    response_type: 'code',
    scope: 'bot guilds',
    permissions: BOT_PERMISSIONS,
    state,
  })
  return `${DISCORD_CONFIG.authUrl}?${params.toString()}`
}

/**
 * Build OAuth URL for customer connection flow
 * This allows us to add customers to the guild and manage their roles
 */
export function buildCustomerAuthUrl(state: string, guildId?: string): string {
  const params = new URLSearchParams({
    client_id: DISCORD_CONFIG.clientId,
    redirect_uri: DISCORD_CONFIG.customerRedirectUri,
    response_type: 'code',
    scope: 'identify guilds.join',
    state,
  })
  
  // If we know the guild, we can pre-select it (not always supported)
  if (guildId) {
    params.set('guild_id', guildId)
    params.set('disable_guild_select', 'true')
  }
  
  return `${DISCORD_CONFIG.authUrl}?${params.toString()}`
}

// =============================================
// Token Exchange
// =============================================

/**
 * Exchange authorization code for access token
 */
export async function exchangeCode(
  code: string,
  redirectUri: string
): Promise<DiscordTokenResponse | null> {
  try {
    const response = await fetch(DISCORD_CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: DISCORD_CONFIG.clientId,
        client_secret: DISCORD_CONFIG.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[Discord] Token exchange failed:', error)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('[Discord] Token exchange error:', error)
    return null
  }
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<DiscordTokenResponse | null> {
  try {
    const response = await fetch(DISCORD_CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: DISCORD_CONFIG.clientId,
        client_secret: DISCORD_CONFIG.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[Discord] Token refresh failed:', error)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('[Discord] Token refresh error:', error)
    return null
  }
}

// =============================================
// Discord REST API Helpers
// =============================================

/**
 * Make an authenticated request to Discord API using bot token
 */
async function botRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T | null> {
  try {
    const response = await fetch(`${DISCORD_CONFIG.apiBase}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bot ${DISCORD_CONFIG.botToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      console.warn(`[Discord] Rate limited. Retry after ${retryAfter}s`)
      // In production, you'd want to implement proper retry logic
      return null
    }

    // 204 No Content is success for some endpoints
    if (response.status === 204) {
      return null
    }

    if (!response.ok) {
      const error = await response.json() as DiscordError
      console.error(`[Discord] API error on ${endpoint}:`, error)
      throw new Error(error.message || 'Discord API error')
    }

    return await response.json()
  } catch (error) {
    console.error(`[Discord] Request error on ${endpoint}:`, error)
    throw error
  }
}

/**
 * Make an authenticated request using user's access token
 */
async function userRequest<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T | null> {
  try {
    const response = await fetch(`${DISCORD_CONFIG.apiBase}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json() as DiscordError
      console.error(`[Discord] User API error on ${endpoint}:`, error)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error(`[Discord] User request error:`, error)
    return null
  }
}

// =============================================
// User Operations
// =============================================

/**
 * Get the current user from their access token
 */
export async function getCurrentUser(accessToken: string): Promise<DiscordUser | null> {
  return userRequest<DiscordUser>('/users/@me', accessToken)
}

// =============================================
// Guild Operations (using bot token)
// =============================================

/**
 * Get information about a guild
 */
export async function getGuild(guildId: string): Promise<DiscordGuild | null> {
  return botRequest<DiscordGuild>(`/guilds/${guildId}`)
}

/**
 * Get all roles in a guild
 */
export async function getGuildRoles(guildId: string): Promise<DiscordRole[]> {
  const roles = await botRequest<DiscordRole[]>(`/guilds/${guildId}/roles`)
  return roles || []
}

/**
 * Create a new role in a guild
 */
export async function createGuildRole(
  guildId: string,
  name: string,
  color?: number
): Promise<DiscordRole | null> {
  return botRequest<DiscordRole>(`/guilds/${guildId}/roles`, {
    method: 'POST',
    body: JSON.stringify({
      name,
      color: color || 0,
      mentionable: false,
    }),
  })
}

/**
 * Delete a role from a guild
 */
export async function deleteGuildRole(
  guildId: string,
  roleId: string
): Promise<boolean> {
  try {
    await botRequest(`/guilds/${guildId}/roles/${roleId}`, {
      method: 'DELETE',
    })
    return true
  } catch {
    return false
  }
}

// =============================================
// Member Operations (using bot token)
// =============================================

/**
 * Add a user to a guild using their OAuth access token
 * This is the key function that adds subscribers to the Discord server
 */
export async function addMemberToGuild(
  guildId: string,
  userId: string,
  accessToken: string,
  options?: {
    roles?: string[]
    nick?: string
  }
): Promise<{ added: boolean; alreadyMember: boolean }> {
  try {
    const response = await fetch(
      `${DISCORD_CONFIG.apiBase}/guilds/${guildId}/members/${userId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${DISCORD_CONFIG.botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
          roles: options?.roles || [],
          nick: options?.nick,
        }),
      }
    )

    // 201 = user was added
    // 204 = user was already a member
    if (response.status === 201) {
      return { added: true, alreadyMember: false }
    }
    if (response.status === 204) {
      return { added: false, alreadyMember: true }
    }

    const error = await response.json()
    console.error('[Discord] Failed to add member:', error)
    throw new Error(error.message || 'Failed to add member to guild')
  } catch (error) {
    console.error('[Discord] Add member error:', error)
    throw error
  }
}

/**
 * Get a member from a guild
 */
export async function getGuildMember(
  guildId: string,
  userId: string
): Promise<DiscordMember | null> {
  try {
    return await botRequest<DiscordMember>(`/guilds/${guildId}/members/${userId}`)
  } catch {
    // Member not found returns 404
    return null
  }
}

/**
 * Add a role to a guild member
 */
export async function addRoleToMember(
  guildId: string,
  userId: string,
  roleId: string
): Promise<boolean> {
  try {
    await botRequest(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
      method: 'PUT',
    })
    return true
  } catch {
    return false
  }
}

/**
 * Remove a role from a guild member
 */
export async function removeRoleFromMember(
  guildId: string,
  userId: string,
  roleId: string
): Promise<boolean> {
  try {
    await botRequest(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
      method: 'DELETE',
    })
    return true
  } catch {
    return false
  }
}

/**
 * Update a member's roles (replace all roles)
 */
export async function updateMemberRoles(
  guildId: string,
  userId: string,
  roleIds: string[]
): Promise<boolean> {
  try {
    await botRequest(`/guilds/${guildId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ roles: roleIds }),
    })
    return true
  } catch {
    return false
  }
}

/**
 * Kick a member from a guild
 */
export async function kickMember(
  guildId: string,
  userId: string,
  reason?: string
): Promise<boolean> {
  try {
    await botRequest(`/guilds/${guildId}/members/${userId}`, {
      method: 'DELETE',
      headers: reason ? { 'X-Audit-Log-Reason': reason } : {},
    })
    return true
  } catch {
    return false
  }
}

// =============================================
// Token Encryption Helpers
// =============================================

/**
 * Simple encryption for storing tokens
 * In production, consider using a proper secrets manager
 */
export function encryptToken(token: string): string {
  const key = process.env.DISCORD_TOKEN_ENCRYPTION_KEY
  if (!key) {
    console.warn('[Discord] No encryption key set, storing token as-is')
    return token
  }
  
  // Simple XOR encryption with base64 encoding
  // For production, use proper AES encryption
  const encrypted = Buffer.from(token).map((byte, i) => 
    byte ^ key.charCodeAt(i % key.length)
  )
  return Buffer.from(encrypted).toString('base64')
}

/**
 * Decrypt a stored token
 */
export function decryptToken(encrypted: string): string {
  const key = process.env.DISCORD_TOKEN_ENCRYPTION_KEY
  if (!key) {
    return encrypted
  }
  
  const decoded = Buffer.from(encrypted, 'base64')
  const decrypted = decoded.map((byte, i) => 
    byte ^ key.charCodeAt(i % key.length)
  )
  return Buffer.from(decrypted).toString('utf-8')
}

// =============================================
// High-Level Operations
// =============================================

/**
 * Sync a subscriber's Discord roles based on their subscription tier
 */
export async function syncSubscriberRoles(
  guildId: string,
  userId: string,
  tierRoleIds: string[], // Roles they should have based on subscription
  allMappedRoleIds: string[] // All roles we manage (to remove old ones)
): Promise<{ success: boolean; rolesAdded: string[]; rolesRemoved: string[] }> {
  const result = {
    success: false,
    rolesAdded: [] as string[],
    rolesRemoved: [] as string[],
  }

  try {
    // Get current member roles
    const member = await getGuildMember(guildId, userId)
    if (!member) {
      console.log('[Discord] Member not in guild, cannot sync roles')
      return result
    }

    const currentRoles = new Set(member.roles)
    const targetRoles = new Set(tierRoleIds)
    const managedRoles = new Set(allMappedRoleIds)

    // Determine changes
    for (const roleId of managedRoles) {
      const hasRole = currentRoles.has(roleId)
      const shouldHaveRole = targetRoles.has(roleId)

      if (shouldHaveRole && !hasRole) {
        // Add role
        const added = await addRoleToMember(guildId, userId, roleId)
        if (added) {
          result.rolesAdded.push(roleId)
        }
      } else if (!shouldHaveRole && hasRole) {
        // Remove role
        const removed = await removeRoleFromMember(guildId, userId, roleId)
        if (removed) {
          result.rolesRemoved.push(roleId)
        }
      }
    }

    result.success = true
  } catch (error) {
    console.error('[Discord] Role sync error:', error)
  }

  return result
}

/**
 * Handle subscription cancellation
 */
export async function handleCancellation(
  guildId: string,
  userId: string,
  behavior: 'remove_roles' | 'kick',
  mappedRoleIds: string[]
): Promise<boolean> {
  try {
    if (behavior === 'kick') {
      return await kickMember(guildId, userId, 'Subscription cancelled')
    } else {
      // Remove all mapped roles
      for (const roleId of mappedRoleIds) {
        await removeRoleFromMember(guildId, userId, roleId)
      }
      return true
    }
  } catch (error) {
    console.error('[Discord] Cancellation handling error:', error)
    return false
  }
}
