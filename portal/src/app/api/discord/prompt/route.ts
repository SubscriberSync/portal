import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/service'
import { handleApiError } from '@/lib/api-utils'

/**
 * POST /api/discord/prompt
 * Handle Discord prompt dismiss/remind-later actions
 */
export async function POST(request: NextRequest) {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action } = body

    if (!action || !['remind_later', 'dismiss'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const supabase = createServiceClient()

    if (action === 'dismiss') {
      // Permanently dismiss - move to settings
      const { error } = await supabase
        .from('organizations')
        .update({
          discord_prompt_dismissed: true,
          discord_prompt_remind_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orgId)

      if (error) {
        console.error('[Discord Prompt] Dismiss error:', error)
        throw error
      }
    } else if (action === 'remind_later') {
      // Set reminder for 2 days from now
      const remindAt = new Date()
      remindAt.setDate(remindAt.getDate() + 2)

      const { error } = await supabase
        .from('organizations')
        .update({
          discord_prompt_dismissed: false,
          discord_prompt_remind_at: remindAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orgId)

      if (error) {
        console.error('[Discord Prompt] Remind later error:', error)
        throw error
      }
    }

    return NextResponse.json({ success: true, action })
  } catch (error) {
    return handleApiError(error, 'Discord Prompt')
  }
}

/**
 * GET /api/discord/prompt
 * Get current Discord prompt state
 */
export async function GET() {
  const { orgId } = await auth()

  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()

    const { data: org, error } = await supabase
      .from('organizations')
      .select('discord_prompt_dismissed, discord_prompt_remind_at, step1_complete')
      .eq('id', orgId)
      .single()

    if (error) {
      throw error
    }

    // Determine if prompt should be shown
    const now = new Date()
    const remindAt = org.discord_prompt_remind_at ? new Date(org.discord_prompt_remind_at) : null
    
    const shouldShowPrompt = 
      org.step1_complete && 
      !org.discord_prompt_dismissed &&
      (!remindAt || remindAt <= now)

    return NextResponse.json({
      shouldShowPrompt,
      dismissed: org.discord_prompt_dismissed,
      remindAt: org.discord_prompt_remind_at,
      step1Complete: org.step1_complete,
    })
  } catch (error) {
    return handleApiError(error, 'Discord Prompt Get')
  }
}
