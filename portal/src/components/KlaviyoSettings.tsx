'use client'

import { useState } from 'react'
import { ExternalLink, Check, Loader2, AlertCircle } from 'lucide-react'

interface KlaviyoSettingsProps {
  connected: boolean
  lastSyncAt?: string | null
}

export default function KlaviyoSettings({
  connected: initialConnected,
  lastSyncAt,
}: KlaviyoSettingsProps) {
  const [connected, setConnected] = useState(initialConnected)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/klaviyo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()

      if (data.url) {
        // Redirect to Klaviyo OAuth
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Failed to start Klaviyo connection')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Klaviyo?')) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/integrations/credentials', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'klaviyo' }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to disconnect')
      }

      setConnected(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#2D2D2D] flex items-center justify-center">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#ffffff">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-white">Klaviyo</h3>
              {!connected && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-[#71717a]/20 text-[#a1a1aa] font-medium">
                  Optional
                </span>
              )}
            </div>
            <p className="text-sm text-[#71717a]">
              {connected
                ? `Connected${lastSyncAt ? ` - Last sync: ${new Date(lastSyncAt).toLocaleDateString()}` : ''}`
                : 'Sync subscriber data to Klaviyo for email automation'}
            </p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
          connected
            ? 'bg-[#5CB87A]/10 text-[#5CB87A]'
            : 'bg-[#71717a]/10 text-[#71717a]'
        }`}>
          {connected ? 'Connected' : 'Not Connected'}
        </span>
      </div>

      {/* Connection UI */}
      {connected ? (
        <div className="px-4 pb-4">
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="text-sm text-[#ef4444] hover:text-[#f87171] transition-colors disabled:opacity-50"
          >
            {loading ? 'Disconnecting...' : 'Disconnect Klaviyo'}
          </button>
        </div>
      ) : (
        <div className="border-t border-[rgba(255,255,255,0.06)] p-4 space-y-4">
          {/* Info box */}
          <div className="bg-[rgba(255,255,255,0.02)] rounded-lg p-4 space-y-2">
            <p className="text-sm text-[#a1a1aa]">
              Connect Klaviyo to automatically sync subscriber data for email campaigns and automation.
            </p>
            <p className="text-xs text-[#71717a]">
              This integration is optional. Your portal works fully without it.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-[#ef4444] bg-[#ef4444]/10 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Connect Button */}
          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0D0D0D] border border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.25)] text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                Connect Klaviyo
              </>
            )}
          </button>

          <p className="text-xs text-[#52525b] text-center">
            You'll be redirected to Klaviyo to authorize the connection.
          </p>
        </div>
      )}
    </div>
  )
}
