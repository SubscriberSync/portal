'use client'

import { useState } from 'react'
import { Ship, Check, AlertCircle, Loader2 } from 'lucide-react'

interface ShipStationConnectProps {
  clientSlug: string
  isConnected?: boolean
  onConnect?: () => void
}

export default function ShipStationConnect({ clientSlug, isConnected = false, onConnect }: ShipStationConnectProps) {
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleConnect = async () => {
    if (!apiKey || !apiSecret) {
      setError('Both API Key and API Secret are required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/integrations/shipstation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, apiSecret }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect ShipStation')
      }

      setSuccess(true)
      setApiKey('')
      setApiSecret('')
      onConnect?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect ShipStation')
    } finally {
      setIsLoading(false)
    }
  }

  if (isConnected || success) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-[#5CB87A]/10 border border-[#5CB87A]/20">
        <div className="w-10 h-10 rounded-lg bg-[#5CB87A]/20 flex items-center justify-center">
          <Check className="w-5 h-5 text-[#5CB87A]" />
        </div>
        <div>
          <h3 className="font-medium text-[#5CB87A]">ShipStation Connected</h3>
          <p className="text-sm text-[#71717a]">Shipping labels and tracking will sync automatically</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[#84C225]/10 flex items-center justify-center">
          <Ship className="w-5 h-5 text-[#84C225]" />
        </div>
        <div>
          <h3 className="font-medium text-white">Connect ShipStation</h3>
          <p className="text-sm text-[#71717a]">Sync shipping labels and tracking numbers</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-[#71717a] mb-1">API Key</label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your ShipStation API Key"
            className="w-full px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-[#52525b] focus:outline-none focus:border-[#84C225]/50"
          />
        </div>

        <div>
          <label className="block text-sm text-[#71717a] mb-1">API Secret</label>
          <input
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder="Enter your ShipStation API Secret"
            className="w-full px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-[#52525b] focus:outline-none focus:border-[#84C225]/50"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
          </div>
        )}

        <p className="text-xs text-[#52525b]">
          Find your API credentials in ShipStation under Settings → Account → API Settings
        </p>

        <button
          onClick={handleConnect}
          disabled={isLoading || !apiKey || !apiSecret}
          className="w-full py-2 px-4 rounded-lg bg-[#84C225] text-white font-medium hover:bg-[#84C225]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Connecting...
            </>
          ) : (
            'Connect ShipStation'
          )}
        </button>
      </div>
    </div>
  )
}
