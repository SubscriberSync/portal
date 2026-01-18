'use client'

import { useState } from 'react'
import { AlertCircle, CreditCard, Loader2 } from 'lucide-react'
import { getBlockedMessage } from '@/lib/subscription'
import type { Organization } from '@/lib/supabase/data'

interface SubscriptionBlockedPageProps {
  reason: 'no_subscription' | 'payment_failed' | 'canceled' | 'locked_out'
  organization: Organization
  canManageBilling?: boolean
}

export default function SubscriptionBlockedPage({
  reason,
  organization,
  canManageBilling = false,
}: SubscriptionBlockedPageProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const message = getBlockedMessage(reason)

  const handleManageBilling = async () => {
    if (!canManageBilling || !organization.stripe_customer_id) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to open billing portal')
        setLoading(false)
        return
      }

      window.location.href = data.url
    } catch (err) {
      setError('Failed to open billing portal. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-[#1a1a1a] rounded-2xl border border-[#333] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#e07a42]/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-[#e07a42]" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            {message.title}
          </h1>

          <p className="text-[#a1a1aa] mb-8">
            {message.description}
          </p>

          {organization.failed_payment_count && organization.failed_payment_count > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-red-400">
                <span className="font-semibold">Payment attempts failed:</span>{' '}
                {organization.failed_payment_count} of 3
              </p>
              {organization.failed_payment_count < 3 && (
                <p className="text-xs text-red-400/70 mt-1">
                  Please update your payment method to avoid service interruption.
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 mb-4">{error}</p>
          )}

          {canManageBilling && organization.stripe_customer_id ? (
            <button
              onClick={handleManageBilling}
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#e07a42] text-white font-semibold rounded-xl hover:bg-[#c86a35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Opening billing portal...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  {message.actionText}
                </>
              )}
            </button>
          ) : (
            <a
              href="/#pricing"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#e07a42] text-white font-semibold rounded-xl hover:bg-[#c86a35] transition-colors"
            >
              {message.actionText}
            </a>
          )}

          <p className="text-xs text-[#666] mt-6">
            Need help?{' '}
            <a href="mailto:support@subscribersync.com" className="text-[#e07a42] hover:underline">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
