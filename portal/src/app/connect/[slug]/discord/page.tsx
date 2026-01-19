'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { MessageSquare, Mail, ArrowRight, Check, AlertCircle, Loader2, ExternalLink } from 'lucide-react'

export default function CustomerDiscordConnectPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  
  const success = searchParams.get('success') === 'true'
  const redirectUrl = searchParams.get('redirect')
  const errorMessage = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(errorMessage)
  const [orgName, setOrgName] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<{
    found: boolean
    status?: string
    connected: boolean
    username?: string
  } | null>(null)

  // Check organization exists on load
  useEffect(() => {
    checkOrganization()
  }, [slug])

  // Auto-redirect to Discord after success
  useEffect(() => {
    if (success && redirectUrl) {
      const timer = setTimeout(() => {
        window.location.href = redirectUrl
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [success, redirectUrl])

  const checkOrganization = async () => {
    try {
      // This would ideally be a public API endpoint
      // For now, we'll just display the slug
      setOrgName(slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' '))
    } catch (err) {
      console.error('Failed to load organization:', err)
    }
  }

  const handleCheckEmail = async () => {
    if (!email) return
    
    setChecking(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/discord/connect?org=${slug}&email=${encodeURIComponent(email)}`)
      const data = await response.json()
      
      if (response.ok) {
        setConnectionStatus(data)
      } else {
        setError(data.error || 'Failed to check email')
      }
    } catch (err) {
      setError('Failed to check email')
    } finally {
      setChecking(false)
    }
  }

  const handleConnect = async () => {
    if (!email) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/discord/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_slug: slug,
          email: email.toLowerCase(),
        }),
      })
      
      const data = await response.json()
      
      if (data.url) {
        window.location.href = data.url
      } else if (data.already_connected) {
        setError('This email is already connected to Discord')
      } else {
        setError(data.error || 'Failed to start connection')
      }
    } catch (err) {
      setError('Failed to connect')
    } finally {
      setLoading(false)
    }
  }

  // Success state
  if (success) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#5CB87A]/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-[#5CB87A]" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Connected!</h1>
            <p className="text-[#71717a] mb-6">
              Your Discord account has been connected successfully. You now have access to the subscriber-only channels.
            </p>
            {redirectUrl && (
              <div className="space-y-3">
                <p className="text-sm text-[#71717a]">Redirecting to Discord...</p>
                <a
                  href={redirectUrl}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-lg transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                  Open Discord Now
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#5865F2]/10 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-[#5865F2]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Connect to Discord
          </h1>
          <p className="text-[#71717a]">
            {orgName ? (
              <>Connect your subscription to get access to the <span className="text-white">{orgName}</span> Discord community</>
            ) : (
              'Connect your subscription to get access to the Discord community'
            )}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Card */}
        <div className="rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-6">
          {/* Email Input */}
          <div className="mb-6">
            <label className="block text-sm text-[#71717a] mb-2">
              Subscription Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#71717a]" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setConnectionStatus(null)
                  setError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCheckEmail()
                  }
                }}
                placeholder="Enter the email you subscribed with"
                className="w-full pl-10 pr-4 py-3 bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-lg text-white placeholder-[#71717a] focus:outline-none focus:border-[#5865F2] transition-colors"
              />
            </div>
          </div>

          {/* Connection Status */}
          {connectionStatus && (
            <div className={`mb-6 p-4 rounded-xl ${
              connectionStatus.connected 
                ? 'bg-[#5CB87A]/10 border border-[#5CB87A]/20'
                : connectionStatus.found
                  ? 'bg-[#5865F2]/10 border border-[#5865F2]/20'
                  : 'bg-yellow-500/10 border border-yellow-500/20'
            }`}>
              {connectionStatus.connected ? (
                <div className="flex items-center gap-2 text-[#5CB87A]">
                  <Check className="w-5 h-5" />
                  <span>Already connected as <strong>{connectionStatus.username}</strong></span>
                </div>
              ) : connectionStatus.found ? (
                <div className="text-[#5865F2]">
                  <p className="font-medium">Subscription found!</p>
                  <p className="text-sm opacity-80">Status: {connectionStatus.status}</p>
                </div>
              ) : (
                <div className="text-yellow-500">
                  <p>No subscription found with this email.</p>
                  <p className="text-sm opacity-80">Please use the email you subscribed with.</p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {!connectionStatus ? (
            <button
              onClick={handleCheckEmail}
              disabled={!email || checking}
              className="w-full py-3 bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-[#5865F2]/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {checking ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  Check Subscription
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          ) : connectionStatus.found && !connectionStatus.connected ? (
            <button
              onClick={handleConnect}
              disabled={loading || connectionStatus.status !== 'Active'}
              className="w-full py-3 bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-[#5865F2]/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : connectionStatus.status !== 'Active' ? (
                'Subscription not active'
              ) : (
                <>
                  <MessageSquare className="w-5 h-5" />
                  Connect Discord
                </>
              )}
            </button>
          ) : connectionStatus.connected ? (
            <p className="text-center text-[#71717a] text-sm">
              Your Discord is already connected. You should have access to the community.
            </p>
          ) : (
            <button
              onClick={() => {
                setEmail('')
                setConnectionStatus(null)
              }}
              className="w-full py-3 border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.05)] text-white font-medium rounded-lg transition-colors"
            >
              Try Different Email
            </button>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[#71717a]">
            Having trouble? Contact support for help.
          </p>
        </div>
      </div>
    </main>
  )
}
