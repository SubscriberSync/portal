'use client'

import { useState } from 'react'
import { ExternalLink, Check, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'

interface ShipStationSettingsProps {
  connected: boolean
  lastSyncAt?: string | null
  organizationId: string
}

export default function ShipStationSettings({
  connected: initialConnected,
  lastSyncAt,
  organizationId,
}: ShipStationSettingsProps) {
  const [connected, setConnected] = useState(initialConnected)
  const [showForm, setShowForm] = useState(!initialConnected)
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/integrations/shipstation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, apiSecret }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to connect')
      }

      setSuccess(true)
      setConnected(true)
      setShowForm(false)
      setApiKey('')
      setApiSecret('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect ShipStation?')) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/integrations/shipstation', {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to disconnect')
      }

      setConnected(false)
      setShowForm(true)
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
          <div className="w-10 h-10 rounded-lg bg-[#84C225]/10 flex items-center justify-center">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#84C225">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-white">ShipStation</h3>
            <p className="text-sm text-[#71717a]">
              {connected
                ? `Connected${lastSyncAt ? ` - Last sync: ${new Date(lastSyncAt).toLocaleDateString()}` : ''}`
                : 'Generate shipping labels and track packages'}
            </p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
          connected
            ? 'bg-[#5CB87A]/10 text-[#5CB87A]'
            : 'bg-[#71717a]/10 text-[#71717a]'
        }`}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Connection Form or Connected State */}
      {connected && !showForm ? (
        <div className="px-4 pb-4">
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="text-sm text-[#ef4444] hover:text-[#f87171] transition-colors disabled:opacity-50"
          >
            {loading ? 'Disconnecting...' : 'Disconnect ShipStation'}
          </button>
        </div>
      ) : (
        <div className="border-t border-[rgba(255,255,255,0.06)] p-4 space-y-4">
          {/* Step-by-step instructions */}
          <div className="bg-[rgba(255,255,255,0.02)] rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-medium text-white">How to get your API keys:</h4>
            <ol className="text-sm text-[#a1a1aa] space-y-2 list-decimal list-inside">
              <li>
                Log in to{' '}
                <a
                  href="https://ship.shipstation.com/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#84C225] hover:underline inline-flex items-center gap-1"
                >
                  ShipStation Settings
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Navigate to <span className="text-white">Settings</span> → <span className="text-white">Account</span> → <span className="text-white">API Settings</span></li>
              <li>Click <span className="text-white">"Generate API Keys"</span> if you don't have any</li>
              <li>Copy your <span className="text-white">API Key</span> and <span className="text-white">API Secret</span> below</li>
            </ol>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-[#ef4444] bg-[#ef4444]/10 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 text-sm text-[#5CB87A] bg-[#5CB87A]/10 rounded-lg p-3">
              <Check className="w-4 h-4 flex-shrink-0" />
              Successfully connected to ShipStation!
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-[#a1a1aa] mb-1.5">
                API Key
              </label>
              <input
                id="apiKey"
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#84C225] transition-colors font-mono text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="apiSecret" className="block text-sm font-medium text-[#a1a1aa] mb-1.5">
                API Secret
              </label>
              <div className="relative">
                <input
                  id="apiSecret"
                  type={showSecret ? 'text' : 'password'}
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 pr-10 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#84C225] transition-colors font-mono text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#71717a] hover:text-white transition-colors"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !apiKey || !apiSecret}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#84C225] hover:bg-[#9AD82E] text-black font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Connect ShipStation
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-[#52525b] text-center">
            Your credentials are encrypted and stored securely.
          </p>
        </div>
      )}
    </div>
  )
}
