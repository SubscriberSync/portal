import { IntakeSubmission, IntakeItemType, IntakeStatus, ClientOnboardingData, DiscordChannel } from './intake-types'

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN
const BASE_ID = 'appVyyEPy9cs8XBtB'
const INTAKE_TABLE_ID = 'tbl9Kvgjt5q0BeIQv'
const CLIENTS_TABLE_ID = 'tblEsjEgVXfHhARrX'

// Get all intake submissions for a client
export async function getIntakeSubmissions(clientSlug: string): Promise<IntakeSubmission[]> {
  if (!AIRTABLE_TOKEN) {
    console.error('Missing AIRTABLE_TOKEN')
    return []
  }

  try {
    const formula = encodeURIComponent(`{Client}="${clientSlug}"`)
    const url = `https://api.airtable.com/v0/${BASE_ID}/${INTAKE_TABLE_ID}?filterByFormula=${formula}`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 10 } // Short cache for real-time updates
    })

    if (!response.ok) {
      console.error('Airtable API error:', response.status)
      return []
    }

    const data = await response.json()
    
    return data.records.map((record: any) => ({
      id: record.id,
      client: record.fields['Client'] || '',
      item: record.fields['Item'] as IntakeItemType,
      value: record.fields['Value'] || '',
      status: record.fields['Status'] as IntakeStatus || 'Pending',
      rejectionNote: record.fields['Rejection Note'],
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
  if (!AIRTABLE_TOKEN) {
    return { success: false, error: 'Missing configuration' }
  }

  try {
    // First check if there's an existing submission for this item
    const existing = await getIntakeSubmissions(data.clientSlug)
    const existingItem = existing.find(s => s.item === data.item)
    
    if (existingItem && existingItem.status === 'Approved') {
      return { success: false, error: 'This item has already been approved' }
    }
    
    // If rejected or pending, update existing record
    if (existingItem) {
      const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${INTAKE_TABLE_ID}/${existingItem.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            'Value': data.value,
            'Status': 'Submitted',
            'Rejection Note': '', // Clear rejection note
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
    
    // Create new submission
    const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${INTAKE_TABLE_ID}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [{
          fields: {
            'Client': data.clientSlug,
            'Item': data.item,
            'Value': data.value,
            'Status': 'Submitted',
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
  if (!AIRTABLE_TOKEN) {
    return null
  }

  try {
    const formula = encodeURIComponent(`{Slug}="${clientSlug}"`)
    const url = `https://api.airtable.com/v0/${BASE_ID}/${CLIENTS_TABLE_ID}?filterByFormula=${formula}`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 10 }
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
  if (!AIRTABLE_TOKEN) return false

  try {
    // First get the record ID
    const formula = encodeURIComponent(`{Slug}="${clientSlug}"`)
    const url = `https://api.airtable.com/v0/${BASE_ID}/${CLIENTS_TABLE_ID}?filterByFormula=${formula}`
    
    const findResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      },
    })

    if (!findResponse.ok) return false
    
    const data = await findResponse.json()
    if (!data.records || data.records.length === 0) return false
    
    const recordId = data.records[0].id
    
    // Update the record
    const updateFields: any = {
      'Discord Decision': decision,
    }
    
    // If skipping, mark step 2 complete
    if (decision === 'No Thanks') {
      updateFields['Step 2 Complete'] = true
    }
    
    const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${CLIENTS_TABLE_ID}/${recordId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
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
  if (!AIRTABLE_TOKEN) return false

  try {
    // First get the record ID
    const formula = encodeURIComponent(`{Slug}="${clientSlug}"`)
    const url = `https://api.airtable.com/v0/${BASE_ID}/${CLIENTS_TABLE_ID}?filterByFormula=${formula}`
    
    const findResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      },
    })

    if (!findResponse.ok) return false
    
    const data = await findResponse.json()
    if (!data.records || data.records.length === 0) return false
    
    const recordId = data.records[0].id
    
    // Build update fields
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
    
    const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${CLIENTS_TABLE_ID}/${recordId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
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
