'use client'

import { useState } from 'react'
import { AlertTriangle, X, CreditCard, Loader2 } from 'lucide-react'

interface SubscriptionWarningBannerProps {
  message: string
}

export default function SubscriptionWarningBanner({ message }: SubscriptionWarningBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleManageBilling = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Failed to open billing portal:', err)
    }
    setLoading(false)
  }

  if (dismissed) {
    return null
  }

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <p className="text-sm text-yellow-200">{message}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleManageBilling}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-yellow-400 hover:text-yellow-300 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )}
            Update Payment
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-yellow-400/60 hover:text-yellow-400 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
