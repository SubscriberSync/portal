'use client'

import { useState } from 'react'
import { ExternalLink, Check, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'

interface RechargeSettingsProps {
  connected: boolean
  lastSyncAt?: string | null
}

export default function RechargeSettings({
  connected: initialConnected,
  lastSyncAt,
}: RechargeSettingsProps) {
  const [connected, setConnected] = useState(initialConnected)
  const [showForm, setShowForm] = useState(!initialConnected)
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [syncResult, setSyncResult] = useState<{ customers: number; subscriptions: number } | null>(null)

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setLoadingMessage('Verifying API key...')
    setError(null)
    setSuccess(false)
    setSyncResult(null)

    try {
      // Show progress messages while waiting
      const progressMessages = [
        'Verifying API key...',
        'Setting up webhooks...',
        'Importing customers...',
        'Syncing subscriptions...',
        'Calculating prepaid orders...',
        'Almost done...',
      ]
      let messageIndex = 0
      const progressInterval = setInterval(() => {
        messageIndex = Math.min(messageIndex + 1, progressMessages.length - 1)
        setLoadingMessage(progressMessages[messageIndex])
      }, 15000) // Update message every 15 seconds

      const res = await fetch('/api/integrations/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })

      clearInterval(progressInterval)

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to connect')
      }

      setSuccess(true)
      setConnected(true)
      setShowForm(false)
      setApiKey('')
      if (data.initialSync) {
        setSyncResult(data.initialSync)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }

  return (
    <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#5C6BC0]/10 flex items-center justify-center">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#5C6BC0">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-white">Recharge</h3>
            <p className="text-sm text-[#71717a]">
              {connected
                ? `Connected${lastSyncAt ? ` - Last sync: ${new Date(lastSyncAt).toLocaleDateString()}` : ''}`
                : 'Not connected'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connected && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="text-xs text-[#5C6BC0] hover:text-[#7986CB] transition-colors"
            >
              Reconnect
            </button>
          )}
          <span className={`px-2 py-1 rounded-md text-xs font-medium ${
            connected
              ? 'bg-[#5CB87A]/10 text-[#5CB87A]'
              : 'bg-[#71717a]/10 text-[#71717a]'
          }`}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Connection Form */}
      {showForm && (
        <div className="border-t border-[rgba(255,255,255,0.06)] p-4 space-y-4">
          {/* Instructions */}
          <div className="bg-[rgba(255,255,255,0.02)] rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-medium text-white">How to get your API token:</h4>
            <ol className="text-sm text-[#a1a1aa] space-y-2 list-decimal list-inside">
              <li>Open the <span className="text-white">Recharge app</span> from your Shopify admin</li>
              <li>In the left sidebar, click <span className="text-white">Tools & apps</span></li>
              <li>Click <span className="text-white">API tokens</span></li>
              <li>Under <span className="text-white font-medium">Admin tokens</span>, click <span className="text-white">Create new</span></li>
              <li>Name it <span className="text-white">"SubscriberSync"</span> and use your email as the contact</li>
              <li>
                Check these permissions:{' '}
                <span className="text-white">read_customers</span>,{' '}
                <span className="text-white">read_gift_products</span>,{' '}
                <span className="text-white">read_gift_purchases</span>,{' '}
                <span className="text-white">read_orders</span>,{' '}
                <span className="text-white">read_plans</span>,{' '}
                <span className="text-white">read_subscriptions</span>
              </li>
              <li>Click <span className="text-white">Save</span>, then copy the API key</li>
            </ol>
            <p className="text-xs text-[#71717a] mt-2 pt-2 border-t border-[rgba(255,255,255,0.06)]">
              <span className="text-amber-500">Note:</span> You only need the API key (no client secret). Use an Admin token, not a Storefront token.
            </p>
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
              <div>
                Successfully connected to Recharge!
                {syncResult && (
                  <span className="text-[#5CB87A]/70 ml-1">
                    ({syncResult.customers} customers, {syncResult.subscriptions} subscriptions imported)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="rounded-lg bg-[#5C6BC0]/10 border border-[#5C6BC0]/20 p-4">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="w-5 h-5 text-[#5C6BC0] animate-spin" />
                <div>
                  <p className="text-sm font-medium text-white">Connecting to Recharge...</p>
                  <p className="text-xs text-[#a1a1aa]">{loadingMessage}</p>
                </div>
              </div>
              <div className="text-xs text-[#71717a] bg-[rgba(0,0,0,0.2)] rounded p-2">
                This may take 1-2 minutes depending on your subscriber count. Please don't close this page.
              </div>
            </div>
          )}

          {/* Form */}
          {!loading && (
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label htmlFor="rechargeApiKey" className="block text-sm font-medium text-[#a1a1aa] mb-1.5">
                  API Token
                </label>
                <div className="relative">
                  <input
                    id="rechargeApiKey"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Paste your Recharge API token"
                    className="w-full px-3 py-2 pr-10 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#5C6BC0] transition-colors font-mono text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#71717a] hover:text-white transition-colors"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={!apiKey}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#5C6BC0] hover:bg-[#7986CB] text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  {connected ? 'Reconnect Recharge' : 'Connect Recharge'}
                </button>
                {connected && (
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2.5 rounded-lg border border-[rgba(255,255,255,0.1)] text-[#a1a1aa] hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}

          <div className="flex items-center justify-between text-xs text-[#52525b]">
            <span>Your credentials are encrypted and stored securely.</span>
            <a
              href="https://support.rechargepayments.com/hc/en-us/articles/360008683274-Creating-an-API-Token"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#5C6BC0] hover:underline flex items-center gap-1"
            >
              Need help? <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
