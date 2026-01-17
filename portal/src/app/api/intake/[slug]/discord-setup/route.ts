import { NextRequest, NextResponse } from 'next/server'
import { updateDiscordSetup } from '@/lib/airtable-intake'
import { DiscordChannel, DiscordNewOrExisting, DiscordVibe } from '@/lib/intake-types'

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params
  
  if (!slug) {
    return NextResponse.json({ success: false, error: 'Missing client slug' }, { status: 400 })
  }
  
  try {
    const body = await request.json()
    
    const {
      newOrExisting,
      serverName,
      serverId,
      channels,
      episodeGated,
      moderatorName,
      moderatorEmail,
      vibe,
      markComplete,
    } = body as {
      newOrExisting?: DiscordNewOrExisting
      serverName?: string
      serverId?: string
      channels?: DiscordChannel[]
      episodeGated?: boolean
      moderatorName?: string
      moderatorEmail?: string
      vibe?: DiscordVibe
      markComplete?: boolean
    }
    
    // Validate newOrExisting if provided
    if (newOrExisting && !['Create New', 'Connect Existing'].includes(newOrExisting)) {
      return NextResponse.json({ success: false, error: 'Invalid newOrExisting value' }, { status: 400 })
    }
    
    // Validate vibe if provided
    if (vibe && !['Casual & Friendly', 'Professional', 'Playful & Fun'].includes(vibe)) {
      return NextResponse.json({ success: false, error: 'Invalid vibe value' }, { status: 400 })
    }
    
    // Validate channels if provided
    const validChannels: DiscordChannel[] = [
      '#general', '#introductions', '#episode-discussion',
      '#spoilers', '#customer-support', '#theories', '#off-topic'
    ]
    if (channels && channels.some(c => !validChannels.includes(c))) {
      return NextResponse.json({ success: false, error: 'Invalid channel value' }, { status: 400 })
    }
    
    const success = await updateDiscordSetup(slug, {
      newOrExisting,
      serverName,
      serverId,
      channels,
      episodeGated,
      moderatorName,
      moderatorEmail,
      vibe,
      markComplete,
    })
    
    return NextResponse.json({ success })
  } catch (error) {
    console.error('Error updating discord setup:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
