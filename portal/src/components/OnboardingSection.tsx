'use client'

import { useState, useEffect, useCallback } from 'react'
import { Rocket, RefreshCw, CheckCircle2 } from 'lucide-react'
import { IntakeSubmission, ClientOnboardingData, IntakeItemType, DiscordChannel } from '@/lib/intake-types'
import IntakeStep1 from './IntakeStep1'
import IntakeStep2 from './IntakeStep2'

interface OnboardingSectionProps {
  clientSlug: string
  initialSubmissions: IntakeSubmission[]
  initialOnboardingData: ClientOnboardingData
}

export default function OnboardingSection({
  clientSlug,
  initialSubmissions,
  initialOnboardingData,
}: OnboardingSectionProps) {
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const [onboardingData, setOnboardingData] = useState(initialOnboardingData)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Refresh data from server
  const refreshData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch(`/api/intake/${clientSlug}`)
      if (response.ok) {
        const data = await response.json()
        setSubmissions(data.submissions)
        setOnboardingData(data.onboardingData)
      }
    } catch (error) {
      console.error('Error refreshing data:', error)
    }
    setIsRefreshing(false)
  }, [clientSlug])
  
  // Submit intake item
  const handleSubmitItem = async (item: IntakeItemType, value: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/intake/${clientSlug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item, value }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        await refreshData()
      }
      
      return result
    } catch (error) {
      console.error('Error submitting item:', error)
      return { success: false, error: 'Network error' }
    }
  }
  
  // Handle Discord decision
  const handleDiscordDecision = async (decision: 'Yes Setup' | 'Maybe Later' | 'No Thanks'): Promise<boolean> => {
    try {
      const response = await fetch(`/api/intake/${clientSlug}/discord-decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      })
      
      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Error updating discord decision:', error)
      return false
    }
  }
  
  // Handle Discord setup update
  const handleDiscordSetup = async (data: {
    newOrExisting?: 'Create New' | 'Connect Existing'
    serverName?: string
    serverId?: string
    channels?: DiscordChannel[]
    episodeGated?: boolean
    moderatorName?: string
    moderatorEmail?: string
    vibe?: 'Casual & Friendly' | 'Professional' | 'Playful & Fun'
    markComplete?: boolean
  }): Promise<boolean> => {
    try {
      const response = await fetch(`/api/intake/${clientSlug}/discord-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Error updating discord setup:', error)
      return false
    }
  }
  
  // Check if all onboarding is complete
  const isAllComplete = onboardingData.step1Complete && onboardingData.step2Complete
  
  // If all complete and not showing, don't render
  if (isAllComplete) {
    return (
      <div className="bg-success/10 border border-success/20 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-success" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Setup Complete!</h3>
            <p className="text-sm text-foreground-secondary">
              Your SubscriberSync integration is configured and ready to go.
            </p>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Get Started</h2>
            <p className="text-sm text-foreground-secondary">Complete setup to activate your dashboard</p>
          </div>
        </div>

        <button
          onClick={refreshData}
          disabled={isRefreshing}
          className="p-2 rounded-lg hover:bg-background-elevated transition-colors text-foreground-tertiary hover:text-foreground disabled:opacity-50"
          title="Refresh status"
        >
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {/* Step 1: Technical Setup */}
      <IntakeStep1
        clientSlug={clientSlug}
        submissions={submissions}
        onboardingData={onboardingData}
        onSubmitItem={handleSubmitItem}
        onRefresh={refreshData}
      />
      
      {/* Step 2: Discord Community */}
      <IntakeStep2
        clientSlug={clientSlug}
        onboardingData={onboardingData}
        isUnlocked={onboardingData.step1Complete}
        onDecision={handleDiscordDecision}
        onUpdateSetup={handleDiscordSetup}
        onRefresh={refreshData}
      />
    </div>
  )
}
