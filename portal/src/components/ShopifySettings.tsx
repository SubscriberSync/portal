'use client'

import { useState } from 'react'
import { ExternalLink, Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react'

interface ShopifySettingsProps {
  connected: boolean
  lastSyncAt?: string | null
}

export default function ShopifySettings({
  connected: initialConnected,
  lastSyncAt,
}: ShopifySettingsProps) {
  const [connected, setConnected] = useState(initialConnected)
  const [showForm, setShowForm] = useState(!initialConnected)
  const [shopifyStore, setShopifyStore] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<{
    success: boolean
    stats?: {
      totalOrders: number
      created: number
      updated: number
      skipped: number
      errors: number
    }
  } | null>(null)

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shopifyStore.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/shopify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop: shopifyStore.trim() }),
      })

      const data = await response.json()

      if (data.url) {
        // Redirect to Shopify OAuth
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Failed to get Shopify auth URL')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
      setLoading(false)
    }
  }

  const handleSyncOrders = async () => {
    setSyncing(true)
    setError(null)
    setSyncResult(null)

    try {
      const response = await fetch('/api/sync/shopify-orders', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync orders')
      }

      setSyncResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#95BF47]/10 flex items-center justify-center">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#95BF47">
              <path d="M15.337 3.415c-.193-.15-.476-.197-.753-.163-.277.03-.55.1-.8.183a7.478 7.478 0 00-.707.26c-.097-.603-.27-1.126-.524-1.546-.535-.893-1.308-1.364-2.236-1.36-1.02.004-1.948.539-2.762 1.6-.577.747-1.024 1.69-1.16 2.42-.84.26-1.427.44-1.44.446-.425.13-.438.145-.494.55-.04.31-1.04 8.01-1.04 8.01L12.29 15l4.71-1.15s-1.16-8.787-1.226-9.223c-.067-.436-.067-.5-.067-.5l-.37-.712z"/>
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-white">Shopify</h3>
            <p className="text-sm text-[#71717a]">
              {connected
                ? `Connected${lastSyncAt ? ` - Last sync: ${new Date(lastSyncAt).toLocaleDateString()}` : ''}`
                : 'Not connected'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connected && !showForm && (
            <>
              <button
                onClick={handleSyncOrders}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#95BF47]/10 text-[#95BF47] hover:bg-[#95BF47]/20 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {syncing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    Sync Orders
                  </>
                )}
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="text-xs text-[#95BF47] hover:text-[#7ea33d] transition-colors"
              >
                Reconnect
              </button>
            </>
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

      {/* Sync Result */}
      {syncResult && !showForm && (
        <div className="border-t border-[rgba(255,255,255,0.06)] p-4">
          <div className="flex items-start gap-3 text-sm bg-[#5CB87A]/10 rounded-lg p-3">
            <Check className="w-4 h-4 text-[#5CB87A] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[#5CB87A] font-medium mb-1">Orders synced successfully!</p>
              {syncResult.stats && (
                <div className="text-xs text-[#a1a1aa] space-y-0.5">
                  <p>Total orders: {syncResult.stats.totalOrders}</p>
                  <p>Created: {syncResult.stats.created}, Updated: {syncResult.stats.updated}, Skipped: {syncResult.stats.skipped}</p>
                  {syncResult.stats.errors > 0 && (
                    <p className="text-[#ef4444]">Errors: {syncResult.stats.errors}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Message (for both connection and sync) */}
      {error && !showForm && (
        <div className="border-t border-[rgba(255,255,255,0.06)] p-4">
          <div className="flex items-center gap-2 text-sm text-[#ef4444] bg-[#ef4444]/10 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        </div>
      )}

      {/* Connection Form */}
      {showForm && (
        <div className="border-t border-[rgba(255,255,255,0.06)] p-4 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-[#ef4444] bg-[#ef4444]/10 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label htmlFor="shopifyStore" className="block text-sm font-medium text-[#a1a1aa] mb-1.5">
                Shopify Store URL
              </label>
              <input
                id="shopifyStore"
                type="text"
                value={shopifyStore}
                onChange={(e) => setShopifyStore(e.target.value)}
                placeholder="your-store.myshopify.com"
                className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder:text-[#52525b] focus:outline-none focus:border-[#95BF47] transition-colors text-sm"
                required
              />
              <p className="text-xs text-[#52525b] mt-1.5">
                Enter your Shopify store URL (e.g., my-store.myshopify.com)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading || !shopifyStore.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#95BF47] hover:bg-[#7ea33d] text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    {connected ? 'Reconnect Shopify' : 'Connect Shopify'}
                  </>
                )}
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

          <p className="text-xs text-[#52525b] text-center">
            You'll be redirected to Shopify to authorize the connection.
          </p>
        </div>
      )}
    </div>
  )
}
