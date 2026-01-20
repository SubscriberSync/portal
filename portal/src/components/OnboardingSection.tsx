'use client'

import { useState, useCallback } from 'react'
import { Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react'
import { IntakeSubmission, ClientOnboardingData, IntakeItemType } from '@/lib/intake-types'
import IntakeStep1Connect from './IntakeStep1Connect'

interface Integration {
  type: 'shopify' | 'klaviyo' | 'recharge' | 'shipstation'
  connected: boolean
  lastSync?: string
}

type ShippingProvider = 'shipstation' | 'pirateship' | 'shopify_shipping' | '3pl' | null

interface OnboardingSectionProps {
  clientSlug: string
  initialSubmissions: IntakeSubmission[]
  initialOnboardingData: ClientOnboardingData
  initialIntegrations?: Integration[]
  shippingProvider?: ShippingProvider
}

export default function OnboardingSection({
  clientSlug,
  initialSubmissions,
  initialOnboardingData,
  initialIntegrations = [],
  shippingProvider,
}: OnboardingSectionProps) {
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const [onboardingData, setOnboardingData] = useState(initialOnboardingData)
  const [integrations, setIntegrations] = useState(initialIntegrations)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Refresh data from server
  const refreshData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch(`/api/intake/${clientSlug}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      if (response.ok) {
        const data = await response.json()
        console.log('[OnboardingSection] Refreshed data:', data.submissions, data.integrations)
        setSubmissions(data.submissions)
        setOnboardingData(data.onboardingData)
        if (data.integrations) {
          setIntegrations(data.integrations)
        }
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

  // Onboarding is complete when Step 1 is done (Discord is now optional via separate prompt)
  const isAllComplete = onboardingData.step1Complete

  // If all complete and not showing, don't render
  if (isAllComplete) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#5CB87A]/10 via-[#151515] to-[#151515] border border-[#5CB87A]/20 p-8">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#5CB87A]/40 to-transparent" />
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#5CB87A]/10 rounded-full blur-3xl" />

        <div className="relative flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-[#5CB87A]/20 border border-[#5CB87A]/30 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-[#5CB87A]" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-[#F5F0E8] mb-1">Setup Complete</h3>
            <p className="text-sm text-[#A8A39B]">
              Your SubscriberSync integration is configured and ready to go.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          {/* Premium icon treatment */}
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C9A962] to-[#8B7355] flex items-center justify-center shadow-lg shadow-[#C9A962]/20">
              <Sparkles className="w-6 h-6 text-[#0D0D0D]" />
            </div>
            {/* Shine overlay */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/25 to-transparent pointer-events-none" />
          </div>

          <div>
            <h2 className="text-headline text-[#F5F0E8] mb-1">Get Started</h2>
            <p className="text-sm text-[#6B6660]">Complete setup to unlock your full dashboard</p>
          </div>
        </div>

        <button
          onClick={refreshData}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#151515] border border-[rgba(245,240,232,0.08)] hover:border-[rgba(245,240,232,0.12)] hover:bg-[#1A1A1A] transition-all text-[#6B6660] hover:text-[#A8A39B] disabled:opacity-50"
          title="Refresh status"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">Refresh</span>
        </button>
      </div>

      {/* Step 1: Connect Your Apps */}
      <IntakeStep1Connect
        clientSlug={clientSlug}
        integrations={integrations}
        onboardingData={onboardingData}
        installmentName={submissions.find(s => s.item === 'Installment Name')?.value}
        shippingProvider={shippingProvider}
        onRefresh={refreshData}
      />
    </div>
  )
}
