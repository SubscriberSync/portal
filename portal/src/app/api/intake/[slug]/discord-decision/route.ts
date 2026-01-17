import { NextRequest, NextResponse } from 'next/server'
import { updateDiscordDecision } from '@/lib/airtable-intake'

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
    const { decision } = body as { decision: 'Yes Setup' | 'Maybe Later' | 'No Thanks' }
    
    if (!decision) {
      return NextResponse.json({ success: false, error: 'Missing decision' }, { status: 400 })
    }
    
    // Validate decision
    const validDecisions = ['Yes Setup', 'Maybe Later', 'No Thanks']
    if (!validDecisions.includes(decision)) {
      return NextResponse.json({ success: false, error: 'Invalid decision' }, { status: 400 })
    }
    
    const success = await updateDiscordDecision(slug, decision)
    
    return NextResponse.json({ success })
  } catch (error) {
    console.error('Error updating discord decision:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
