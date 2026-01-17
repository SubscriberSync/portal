import { IntakeSubmission, IntakeItemType, IntakeStatus, ClientOnboardingData, DiscordChannel } from './intake-types'
import { config } from './config'

// Helper to get client record ID from slug
async function getClientRecordId(clientSlug: string): Promise<string | null> {
  if (!config.airtable.token) return null

  const { baseId, tables } = config.airtable.portal
  const slugField = config.fields.client.slug

  try {
    const formula = encodeURIComponent(`{${slugField}}="${clientSlug}"`)
    const url = `https://api.airtable.com/v0/${baseId}/${tables.clients}?filterByFormula=${formula}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.airtable.token}`,
      },
    })

    if (!response.ok) return null

    const data = await response.json()
    if (!data.records || data.records.length === 0) return null

    return data.records[0].id
  } catch (error) {
    console.error('Error fetching client record ID:', error)
    return null
  }
}

// Get all intake submissions for a client
export async function getIntakeSubmissions(clientSlug: string): Promise<IntakeSubmission[]> {
  if (!config.airtable.token) {
    console.error('Missing AIRTABLE_TOKEN')
    return []
  }

  const { baseId, tables } = config.airtable.portal
  const f = config.fields.intake

  try {
    // Get the client record ID first
    const clientRecordId = await getClientRecordId(clientSlug)
    console.log('[getIntakeSubmissions] clientSlug:', clientSlug, 'clientRecordId:', clientRecordId)

    // Fetch all intake records and filter client-side
    const url = `https://api.airtable.com/v0/${baseId}/${tables.intake}`
    console.log('[getIntakeSubmissions] Fetching all intake records')

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.airtable.token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error('Airtable API error:', response.status)
      return []
    }

    const data = await response.json()
    console.log('[getIntakeSubmissions] Total records fetched:', data.records?.length || 0)

    // Filter records that match our client (either by record ID or slug)
    const filteredRecords = data.records.filter((record: any) => {
      const clientField = record.fields[f.client]

      if (Array.isArray(clientField)) {
        const matches = clientRecordId && clientField.includes(clientRecordId)
        if (matches) {
          console.log('[getIntakeSubmissions] Found linked record match:', record.id, 'Item:', record.fields[f.item])
        }
        return matches
      }

      if (typeof clientField === 'string') {
        const matches = clientField === clientSlug
        if (matches) {
          console.log('[getIntakeSubmissions] Found slug match:', record.id, 'Item:', record.fields[f.item])
        }
        return matches
      }

      return false
    })

    console.log('[getIntakeSubmissions] Filtered records for client:', filteredRecords.length)

    return filteredRecords.map((record: any) => ({
      id: record.id,
      client: record.fields[f.client] || '',
      item: record.fields[f.item] as IntakeItemType,
      value: record.fields[f.value] || '',
      status: (record.fields[f.status] as IntakeStatus) || 'Pending',
      rejectionNote: record.fields[f.rejectionNote],
      submittedAt: record.fields['Submitted At'],
      reviewedAt: record.fields['Reviewed At'],
      helpVideoUrl: record.fields['Help Video URL'],
    }))
  } catch (error) {
    console.error('Error fetching intake submissions:', error)
    return []
  }
}

// Submit a new intake item
export async function submitIntakeItem(data: {
  clientSlug: string
  item: IntakeItemType
  value: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!config.airtable.token) {
    return { success: false, error: 'Missing configuration' }
  }

  const { baseId, tables } = config.airtable.portal
  const f = config.fields.intake

  try {
    // First check if there's an existing submission for this item
    const existing = await getIntakeSubmissions(data.clientSlug)
    console.log('[submitIntakeItem] Looking for item:', data.item)
    console.log('[submitIntakeItem] Existing submissions:', existing.map(s => ({ item: s.item, status: s.status, id: s.id })))
    const existingItem = existing.find(s => s.item === data.item)
    console.log('[submitIntakeItem] Found existing item:', existingItem ? { id: existingItem.id, item: existingItem.item, status: existingItem.status } : 'NONE')

    if (existingItem && existingItem.status === 'Approved') {
      return { success: false, error: 'This item has already been approved' }
    }

    // If rejected or pending, update existing record
    if (existingItem) {
      const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tables.intake}/${existingItem.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${config.airtable.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            [f.value]: data.value,
            [f.status]: 'Submitted',
            [f.rejectionNote]: '',
            'Submitted At': new Date().toISOString(),
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error?.message || 'Update failed' }
      }

      return { success: true, id: existingItem.id }
    }

    // Get client record ID for linked record
    const clientRecordId = await getClientRecordId(data.clientSlug)
    const clientFieldValue = clientRecordId ? [clientRecordId] : data.clientSlug

    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tables.intake}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.airtable.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [{
          fields: {
            [f.client]: clientFieldValue,
            [f.item]: data.item,
            [f.value]: data.value,
            [f.status]: 'Submitted',
            'Submitted At': new Date().toISOString(),
          }
        }]
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { success: false, error: errorData.error?.message || 'Submission failed' }
    }

    const result = await response.json()
    return { success: true, id: result.records[0].id }
  } catch (error) {
    console.error('Error submitting intake item:', error)
    return { success: false, error: 'Network error' }
  }
}

// Get client onboarding data
export async function getClientOnboardingData(clientSlug: string): Promise<ClientOnboardingData | null> {
  if (!config.airtable.token) {
    return null
  }

  const { baseId, tables } = config.airtable.portal
  const slugField = config.fields.client.slug

  try {
    const formula = encodeURIComponent(`{${slugField}}="${clientSlug}"`)
    const url = `https://api.airtable.com/v0/${baseId}/${tables.clients}?filterByFormula=${formula}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.airtable.token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (!data.records || data.records.length === 0) {
      return null
    }

    const f = data.records[0].fields

    return {
      step1Complete: f['Step 1 Complete'] || false,
      loomRecharge: f['Loom Recharge'],
      loomKlaviyo: f['Loom Klaviyo'],
      loomShopifyProducts: f['Loom Shopify Products'],
      discordDecision: f['Discord Decision'] || 'Not Decided',
      discordNewOrExisting: f['Discord New or Existing'],
      discordServerName: f['Discord Server Name'],
      discordServerId: f['Discord Server ID'],
      discordChannels: f['Discord Channels'] as DiscordChannel[],
      discordEpisodeGated: f['Discord Episode Gated'] || false,
      discordModeratorName: f['Discord Moderator Name'],
      discordModeratorEmail: f['Discord Moderator Email'],
      discordVibe: f['Discord Vibe'],
      step2Complete: f['Step 2 Complete'] || false,
    }
  } catch (error) {
    console.error('Error fetching client onboarding data:', error)
    return null
  }
}

// Update Discord decision
export async function updateDiscordDecision(
  clientSlug: string,
  decision: 'Yes Setup' | 'Maybe Later' | 'No Thanks'
): Promise<boolean> {
  if (!config.airtable.token) return false

  const { baseId, tables } = config.airtable.portal
  const slugField = config.fields.client.slug

  try {
    const formula = encodeURIComponent(`{${slugField}}="${clientSlug}"`)
    const url = `https://api.airtable.com/v0/${baseId}/${tables.clients}?filterByFormula=${formula}`

    const findResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.airtable.token}`,
      },
    })

    if (!findResponse.ok) return false

    const data = await findResponse.json()
    if (!data.records || data.records.length === 0) return false

    const recordId = data.records[0].id

    const updateFields: any = {
      'Discord Decision': decision,
    }

    if (decision === 'No Thanks') {
      updateFields['Step 2 Complete'] = true
    }

    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tables.clients}/${recordId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${config.airtable.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: updateFields })
    })

    return response.ok
  } catch (error) {
    console.error('Error updating Discord decision:', error)
    return false
  }
}

// Update Discord setup details
export async function updateDiscordSetup(
  clientSlug: string,
  setupData: {
    newOrExisting?: 'Create New' | 'Connect Existing'
    serverName?: string
    serverId?: string
    channels?: DiscordChannel[]
    episodeGated?: boolean
    moderatorName?: string
    moderatorEmail?: string
    vibe?: 'Casual & Friendly' | 'Professional' | 'Playful & Fun'
    markComplete?: boolean
  }
): Promise<boolean> {
  if (!config.airtable.token) return false

  const { baseId, tables } = config.airtable.portal
  const slugField = config.fields.client.slug

  try {
    const formula = encodeURIComponent(`{${slugField}}="${clientSlug}"`)
    const url = `https://api.airtable.com/v0/${baseId}/${tables.clients}?filterByFormula=${formula}`

    const findResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.airtable.token}`,
      },
    })

    if (!findResponse.ok) return false

    const data = await findResponse.json()
    if (!data.records || data.records.length === 0) return false

    const recordId = data.records[0].id

    const updateFields: any = {}

    if (setupData.newOrExisting) updateFields['Discord New or Existing'] = setupData.newOrExisting
    if (setupData.serverName) updateFields['Discord Server Name'] = setupData.serverName
    if (setupData.serverId) updateFields['Discord Server ID'] = setupData.serverId
    if (setupData.channels) updateFields['Discord Channels'] = setupData.channels
    if (setupData.episodeGated !== undefined) updateFields['Discord Episode Gated'] = setupData.episodeGated
    if (setupData.moderatorName) updateFields['Discord Moderator Name'] = setupData.moderatorName
    if (setupData.moderatorEmail) updateFields['Discord Moderator Email'] = setupData.moderatorEmail
    if (setupData.vibe) updateFields['Discord Vibe'] = setupData.vibe
    if (setupData.markComplete) updateFields['Step 2 Complete'] = true

    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tables.clients}/${recordId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${config.airtable.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: updateFields })
    })

    return response.ok
  } catch (error) {
    console.error('Error updating Discord setup:', error)
    return false
  }
}
